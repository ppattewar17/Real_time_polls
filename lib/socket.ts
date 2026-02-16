import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@/types';

let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

export function initializeSocket(server: NetServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinPoll', (pollId: string) => {
      console.log(`Socket ${socket.id} joining poll: ${pollId}`);
      socket.join(pollId);
      socket.data.pollId = pollId;
    });

    socket.on('leavePoll', (pollId: string) => {
      console.log(`Socket ${socket.id} leaving poll: ${pollId}`);
      socket.leave(pollId);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}