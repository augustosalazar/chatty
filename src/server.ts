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
  room: String,
  sender: String,
  message: String,
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
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', async (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room ${room}`);

      // Optional: Send last 50 messages history
      try {
        const history = await Message.find({ room }).sort({ timestamp: 1 }).limit(50);
        socket.emit('history', history);
      } catch (e) {
        console.error('Error fetching history:', e);
      }
    });

    socket.on('send_message', async (data) => {
      // data: { room, message, sender }

      // Save to MongoDB
      try {
        const newMessage = new Message({
          room: data.room,
          sender: data.sender,
          message: data.message
        });
        await newMessage.save();
      } catch (e) {
        console.error('Error saving message:', e);
      }

      io.to(data.room).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Redis connection error:', err);
});
