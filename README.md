# Chatty - Self-Hosted Real-Time Chat Server

A scalable, containerized real-time chat server built with Node.js, Socket.io, Redis, and MongoDB. Designed to serve multiple applications with full multi-tenancy support.

## 🌟 Features

- **Multi-Tenancy**: Isolate conversations by project ID
- **General Chat Rooms**: Public chat channels per project
- **Direct Messaging**: 1:1 private conversations
- **Offline Messaging**: Messages are persisted and delivered when users come online
- **Horizontal Scaling**: Redis adapter enables multiple server instances
- **Load Balancing**: Nginx with sticky sessions for WebSocket connections
- **Message Persistence**: MongoDB stores complete chat history
- **Full Containerization**: Docker Compose orchestrates all services

## 🏗️ Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Nginx (Port 80) │  ← Load Balancer
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Server │ │ Server │  ← Chat Server Instances
│   1    │ │   2    │
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
    ┌────┴─────┐
    ▼          ▼
┌────────┐ ┌────────┐
│ Redis  │ │ MongoDB│  ← Data Layer
└────────┘ └────────┘
```

### Components

- **chatty-nginx**: Nginx reverse proxy/load balancer
- **chatty-server**: Node.js + Socket.io (2 replicas)
- **chatty-redis**: Pub/Sub for cross-server messaging
- **chatty-mongo**: Persistent message storage

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development/testing)

## 🚀 Quick Start

### 1. Start the Server

```bash
cd c:/desarrollo/gravity
docker-compose up -d --build
```

This starts all services:
- Nginx on port `80`
- 2 chat server instances
- Redis and MongoDB (internal only)

### 2. Verify Deployment

```bash
docker ps
```

You should see 5 containers running with `chatty_` prefix.

### 3. Test with CLI Client

```bash
docker run --rm --network chatty_chat-net \
  -e SOCKET_URL=http://chatty-nginx:80 \
  -v ${PWD}:/app -w /app node:18-alpine \
  sh -c "npm install socket.io-client ts-node typescript --quiet && npx ts-node test-client.ts"
```

### 4. Run React Native Web Client

```bash
cd r_chat
npm install
npm run web
```

Open your browser and connect with:
- **Project ID**: `my-app`
- **User ID**: `user-1`

## 📡 API Documentation

### Connection

Connect to the server with query parameters:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:80', {
  query: {
    projectId: 'my-app',
    userId: 'user-123'
  }
});
```

### Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_general` | - | Join the project's general chat room |
| `join_dm` | `{ targetUserId: string }` | Join a 1:1 DM room with another user |
| `send_message` | `{ room: string, message: string }` | Send a message to a room |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `connect` | - | Successfully connected to server |
| `history` | `{ room: string, messages: Message[] }` | Chat history when joining a room |
| `receive_message` | `{ projectId, room, userId, message, timestamp }` | New message received |
| `disconnect` | - | Disconnected from server |

### Room Naming Convention

- **General Chat**: `${projectId}:general`
- **Direct Message**: `${projectId}:dm:${user1}:${user2}` (sorted alphabetically)

### Example Usage

```javascript
// Join general chat
socket.emit('join_general');

// Send message to general
socket.emit('send_message', {
  room: 'my-app:general',
  message: 'Hello everyone!'
});

// Join DM with user-456
socket.emit('join_dm', { targetUserId: 'user-456' });

// Send DM
socket.emit('send_message', {
  room: 'my-app:dm:user-123:user-456',
  message: 'Hey there!'
});

// Listen for messages
socket.on('receive_message', (data) => {
  console.log(`${data.userId}: ${data.message}`);
});
```

## 🔒 Security Features

- **Project Isolation**: Users can only access rooms within their project
- **Room Validation**: Server validates room names match the user's project
- **Internal Services**: Redis and MongoDB are not exposed to the host
- **Connection Authentication**: projectId and userId required to connect

## 🛠️ Development

### Project Structure

```
gravity/
├── src/
│   └── server.ts          # Main server logic
├── r_chat/                # React Native client
│   ├── app/
│   │   ├── index.tsx      # Connection screen
│   │   ├── chat.tsx       # Chat screen
│   │   └── _layout.tsx    # Navigation
├── docker-compose.yml     # Container orchestration
├── Dockerfile             # Server container
├── nginx.conf             # Load balancer config
├── test-client.ts         # Test script
└── .env                   # Environment variables
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `tsconfig.json` (already exists)

3. Run tests:
```bash
npx ts-node test-client.ts
```

### Environment Variables

Create `.env` file:

```env
COMPOSE_PROJECT_NAME=chatty
```

## 📊 Monitoring & Logs

### View Server Logs

```bash
docker logs chatty_chatty-server_1
docker logs chatty_chatty-server_2
```

### View All Containers

```bash
docker ps
```

### Check MongoDB Data

```bash
docker exec -it chatty_chatty-mongo_1 mongosh
use chat-db
db.messages.find()
```

## 🔄 Scaling

To add more server instances, update `docker-compose.yml`:

```yaml
chat-server:
  deploy:
    replicas: 5  # Increase from 2
```

Then restart:
```bash
docker-compose up -d --scale chatty-server=5
```

## 🧪 Testing

The project includes comprehensive tests for:
- ✅ Multi-project isolation
- ✅ General chat functionality  
- ✅ Direct messaging
- ✅ Offline message delivery
- ✅ Cross-server communication (via Redis)

Run tests:
```bash
npm run test  # Run test-client.ts in container
```

## 🚢 Deployment

### Production Recommendations

1. **Use environment variables for configuration**:
   ```yaml
   environment:
     - MONGO_URI=${MONGO_URI}
     - REDIS_HOST=${REDIS_HOST}
   ```

2. **Enable SSL** in Nginx:
   ```nginx
   listen 443 ssl;
   ssl_certificate /path/to/cert.pem;
   ssl_certificate_key /path/to/key.pem;
   ```

3. **Use managed databases** (MongoDB Atlas, Redis Cloud)

4. **Add authentication** middleware for enhanced security

5. **Implement rate limiting** in Nginx

## 📝 Message Schema

MongoDB stores messages with the following structure:

```typescript
{
  projectId: string;    // Tenant identifier
  room: string;         // Room name
  userId: string;       // Sender ID
  message: string;      // Message content
  timestamp: Date;      // When sent
}
```

Indexes exist on `projectId` and `room` for fast queries.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC

## 🆘 Troubleshooting

### Port 80 already in use
```bash
docker-compose down
docker ps  # Check for conflicting containers
```

### Containers won't start
```bash
docker-compose logs chatty-server
docker-compose logs chatty-mongo
```

### Can't connect from client
- Ensure Docker containers are running
- Check `SOCKET_URL` points to correct host
- Verify firewall settings

### Messages not syncing across servers
- Check Redis connection in logs
- Verify Redis adapter is initialized

## 📞 Support

For issues or questions, please open an issue on the repository.

---

Built with ❤️ using Node.js, Socket.io, Redis, MongoDB, and Docker.
