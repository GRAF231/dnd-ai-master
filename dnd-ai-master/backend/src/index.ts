// Инициализируем окружение ПЕРВЫМ делом
import './utils/env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { Server } from 'socket.io';
import { dmRoutes } from './routes/dm.js';
import { config } from './utils/config.js';

const fastify = Fastify({
  logger: {
    level: config.logLevel
    // Убираем transport для упрощения - будет использоваться стандартный логгер
  }
});

// Регистрация плагинов
await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
});

await fastify.register(websocket);

// Регистрация роутов
await fastify.register(dmRoutes, { prefix: '/api' });

// Socket.IO для real-time
const io = new Server(fastify.server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }
});

// Базовые роуты
fastify.get('/', async (request, reply) => {
  return { 
    message: 'AI D&D Master Backend',
    version: '1.0.0',
    status: 'running'
  };
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
});

// API роуты для комнат
fastify.post('/api/rooms', async (request, reply) => {
  const { title, password } = request.body as { title: string; password?: string };
  
  if (!title) {
    reply.code(400);
    return { error: 'Title is required' };
  }

  // TODO: Сохранить в БД
  const roomId = Math.random().toString(36).substring(2, 15);
  const token = Math.random().toString(36).substring(2, 15);

  fastify.log.info(`Created room: ${roomId} with title: ${title}`);

  return {
    id: roomId,
    title,
    token,
    created_at: new Date().toISOString()
  };
});

fastify.get('/api/rooms/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const token = request.query as { token?: string };

  if (!token.token) {
    reply.code(401);
    return { error: 'Token required' };
  }

  fastify.log.info(`Accessing room: ${id}`);

  // TODO: Проверить токен и загрузить из БД
  return {
    id,
    title: 'Test Campaign',
    players: [],
    status: 'waiting'
  };
});

// Socket.IO обработчики
io.on('connection', (socket) => {
  fastify.log.info(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { userId: socket.id });
    fastify.log.info(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('chat-message', (data: { roomId: string; message: string }) => {
    socket.to(data.roomId).emit('chat-message', {
      userId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
    fastify.log.info(`Message in room ${data.roomId}: ${data.message}`);
  });

  socket.on('disconnect', () => {
    fastify.log.info(`User disconnected: ${socket.id}`);
  });
});

// Запуск сервера
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`🚀 Server running on http://localhost:${config.port}`);
    fastify.log.info(`Environment: ${config.nodeEnv}`);
    fastify.log.info(`OpenRouter Base URL: ${config.openrouterBaseUrl}`);
    fastify.log.info(`DM Model: ${config.dmModel}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
