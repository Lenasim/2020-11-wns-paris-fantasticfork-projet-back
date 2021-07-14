import mongoose from 'mongoose';
import { PubSub, AuthenticationError } from 'apollo-server-express';
import { withFilter } from 'graphql-subscriptions';
import MessageModel, {
  IMessage,
  IMessageInput,
  IMessageOutput,
} from '../models/Message';
import ChatRoomModel, { IChatRoom, IParticipant } from '../models/ChatRoom';
import { AuthContext } from '../middlewares/authenticateRequest'

const pubsub = new PubSub();

export const chatSubscription = {
  chatFeed: {
    subscribe: withFilter(
      (_, __, context) => {
        if (context.userID) {
          return pubsub.asyncIterator(["NEW_MESSAGE"]);
        } else {
          throw new AuthenticationError('NOT AUTHORIZED');
        }
      },
      (payload, _, context) => {
        return !!(payload.participants.findIndex(p=> p.userID===context?.userId) === 0)
      }
    ),
  },
};

export const chatMutation = {
  newChatRoom: async (
    _: unknown,
    { participants }: { participants: ChatRoomInput[] },
    context:any
  ): Promise<IChatRoom | IChatRoom[]> => {

    // const params = {
    // "participants.userId": {$in: participants.map(m => m.userId)}
    // }

    const params = {
      "participants.userId": context.userID,
    }

    const participantsIdList = participants.map(p=>JSON.stringify(p.userId))

    const existRoom = (await ChatRoomModel.find(params)
      .populate('participants')
      .populate('messages')
      .populate('lastMessage')
      .exec())
      .filter(cr=>cr.participants.length === participants.length)
      .find(r =>{
        const idList = r.participants.map(p=>JSON.stringify(p.userId))
        return idList.every(p=>participantsIdList.includes(p)) 
        && participantsIdList.every(p=>idList.includes(p)) 
      })
    
    if(existRoom){
      return existRoom
    } else {
      return await new ChatRoomModel({ participants }).save();
    }
  },

  connectedToChatRoom: async (
    _: unknown,
    { chatRoomId, userId }: ChatRoomInput
  ): Promise<IChatRoom | null> => {
    const myChatRoom = await ChatRoomModel.findById(chatRoomId).exec();

    const participants = myChatRoom?.participants.map((p) => {
      if (p.userId == userId) {
        return { ...p, lastConnected: Date.now() };
      } else {
        return p;
      }
    });

    const updated = await ChatRoomModel.findByIdAndUpdate(chatRoomId, {
      participants: participants,
    });

    return updated;
  },

  newMessage: async (
    _: unknown,
    { text, userId, chatRoomId }: IMessageInput,
    context:AuthContext
  ): Promise<IMessageOutput> => {
    const message = await new MessageModel({ text, userId, chatRoomId }).save();
    const chatroom = await ChatRoomModel.findByIdAndUpdate(chatRoomId, {
      $push: { messages: message },
      $set: { lastMessage: message },
      $inc: { unreadMessages: 1 },
    }, {new: true});

    pubsub.publish('NEW_MESSAGE', { chatFeed: message, participants: chatroom?.participants });
    return message;
  },
};

export const chatQuery = {
  myChatRooms: async (
    _: unknown,
    { userId }: ChatRoomInput
  ): Promise<unknown | null> => {
    const myChatRooms = await ChatRoomModel.find({
      'participants.userId': userId,
    })
      .populate('messages')
      .populate('lastMessage')
      .exec();

    // const userLastConnected =
    //   data?.participants.filter((p: IParticipant) => p.userId === userId)
    //     .lastConnected || null;
    // console.log(data?.participants, userLastConnected);
    // const unReadMessages = data?.messages.filter(
    //   (m: IMessage) => m.createdAt > userLastConnected
    // );
    // data.unreadMessages = unReadMessages?.length;
    // console.log(userLastConnected, unReadMessages, data.unreadMessages);

    return myChatRooms;
  },

  messages: async (): Promise<IMessage[]> => {
    const messages = await MessageModel.find({});
    return messages;
  },
};

interface ChatRoomInput {
  chatRoomId: string;
  userId: string;
}
function $and($and: any, condition: void) {
  throw new Error('Function not implemented.');
}

