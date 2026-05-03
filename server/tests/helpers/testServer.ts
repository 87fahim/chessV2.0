import http from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request, {
  type SuperAgentTest,
  type SuperTest,
  type Test,
} from 'supertest';
import { Server as SocketIOServer } from 'socket.io';
import { io as createSocketClient, type Socket } from 'socket.io-client';
import app from '../../src/app.js';
import { connectedUsers, initializeSocketIO, shutdownSocketIO } from '../../src/sockets/index.js';

export interface IntegrationTestServer {
  baseUrl: string;
  request: SuperTest<Test>;
  createAgent: () => SuperAgentTest;
  createSocket: (token: string) => Socket;
  resetDatabase: () => Promise<void>;
  stop: () => Promise<void>;
}

export async function createIntegrationTestServer(): Promise<IntegrationTestServer> {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  initializeSocketIO(io);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = httpServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    request: request(baseUrl),
    createAgent: () => request.agent(baseUrl),
    createSocket: (token: string) =>
      createSocketClient(baseUrl, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        reconnection: false,
      }),
    resetDatabase: async () => {
      connectedUsers.clear();
      await mongoose.connection.dropDatabase();
    },
    stop: async () => {
      connectedUsers.clear();
      shutdownSocketIO();
      io.close();

      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      await mongoose.disconnect();
      await mongoServer.stop();
    },
  };
}