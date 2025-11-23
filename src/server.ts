import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);

// Redis Setup
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const pubClient = createClient({ url: `redis://${redisHost}:${redisPort}` });
const subClient = pubClient.duplicate();

// MongoDB Setup
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/chat-db';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Message Schema
const messageSchema = new mongoose.Schema({
  projectId: { type: String, required: true, index: true },
  room: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  console.log('Connected to Redis');

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    adapter: createAdapter(pubClient, subClient)
  });

  io.on('connection', (socket) => {
    const projectId = socket.handshake.query.projectId as string;
    const userId = socket.handshake.query.userId as string;

    if (!projectId || !userId) {
      console.log(`Connection rejected: Missing projectId or userId. Socket: ${socket.id}`);
      socket.disconnect();
      return;
    }

    console.log(`User connected: ${userId} (Project: ${projectId})`);

    // Helper to get scoped room name
    const getGeneralRoom = () => `${projectId}:general`;
    const getDmRoom = (targetId: string) => {
      const participants = [userId, targetId].sort();
      return `${projectId}:dm:${participants.join(':')}`;
    };

    // Join General Chat
    socket.on('join_general', async () => {
      const room = getGeneralRoom();
      socket.join(room);
      console.log(`User ${userId} joined ${room}`);

      try {
        const history = await Message.find({ projectId, room }).sort({ timestamp: 1 }).limit(50);
        socket.emit('history', { room, messages: history });
      } catch (e) {
        console.error('Error fetching history:', e);
      }
    });

    // Join DM
    socket.on('join_dm', async (data: { targetUserId: string }) => {
      if (!data.targetUserId) return;
      const room = getDmRoom(data.targetUserId);
      socket.join(room);
      console.log(`User ${userId} joined DM ${room}`);

      try {
        const history = await Message.find({ projectId, room }).sort({ timestamp: 1 }).limit(50);
        socket.emit('history', { room, messages: history });
      } catch (e) {
        console.error('Error fetching DM history:', e);
      }
    });

    socket.on('send_message', async (data: { room: string, message: string }) => {
      // Security: Ensure room belongs to project
      if (!data.room.startsWith(`${projectId}:`)) {
        console.warn(`User ${userId} tried to send to unauthorized room ${data.room}`);
        return;
      }

      const messageData = {
        projectId,
        room: data.room,
        userId,
        message: data.message,
        timestamp: new Date()
      };

      // Save to MongoDB
      try {
        const newMessage = new Message(messageData);
        await newMessage.save();
      } catch (e) {
        console.error('Error saving message:', e);
      }

      io.to(data.room).emit('receive_message', messageData);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Redis connection error:', err);
});
