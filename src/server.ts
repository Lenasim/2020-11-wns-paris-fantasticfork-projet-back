import http from 'http';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';

import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongooseConnect from './config/mongodb';

import typeDefs from './typeDefs';
import resolvers from './resolvers';

import refreshToken from './helpers/refreshToken';
import authenticateRequest from './middlewares/authenticateRequest';

// Start Server
mongooseConnect();

// Apollo server
const server = new ApolloServer({
  subscriptions: { path: '/subscribe' },
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  context: authenticateRequest,
});

// init app
const app = express();
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://stud-connect.netlify.app'],
    credentials: true,
  })
);
app.use(cookieParser());
app.get('/refresh_token', refreshToken);

server.applyMiddleware({ app, cors: false });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

// eslint-disable-next-line no-console
const port = process.env.PORT || 4000;
httpServer.listen(port, () => console.log(`Server started on ${port}`));
