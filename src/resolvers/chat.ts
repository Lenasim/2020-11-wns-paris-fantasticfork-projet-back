import MessageModel, {
  IMessage,
  IMessageInput,
  IMessageOutput,
} from '../models/Message';
import ChatRoomModel, { IChatRoom, IParticipant } from '../models/ChatRoom';
import { PubSub } from 'apollo-server-express';
const pubsub = new PubSub();

export const chatSubscription = {
  chatFeed: {
    subscribe: (): unknown => {
      return pubsub.asyncIterator(['NEW_MESSAGE']);
    },
  },
};

export const chatMutation = {
  newChatRoom: async (
    _: unknown,
    { participants }: { participants: ChatRoomInput[] }
  ): Promise<IChatRoom> => {
    const newChatRoom = await new ChatRoomModel({ participants }).save();

    return newChatRoom;
  },

  connectedToChatRoom: async(
    _: unknown,
    { chatRoomId, userId }: ChatRoomInput
  ): Promise<IChatRoom>

  newMessage: async (
    _: unknown,
    { text, userId, chatRoomId }: IMessageInput
  ): Promise<IMessageOutput> => {
    const message = await new MessageModel({ text, userId, chatRoomId }).save();
    pubsub.publish('NEW_MESSAGE', { chatFeed: message });
    return message;
  },
};

export const chatQuery = {
  messages: async (): Promise<IMessage[]> => {
    const messages = await MessageModel.find({});
    return messages;
  },
};

interface ChatRoomInput {
  chatRoomId: string;
  userId: string;
}
