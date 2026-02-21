import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Attach Socket.IO to the HTTP server
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // 1. Player joins a specific game lobby
    socket.on('join-room', (gameId) => {
      socket.join(`game-${gameId}`);
      console.log(`Socket ${socket.id} joined room game-${gameId}`);
    });

    // 2. Player makes a move -> Broadcast to everyone in that lobby
    socket.on('game-action', ({ gameId, action }) => {
      // io.to().emit sends to everyone in the room EXCEPT the sender? 
      // Actually, io.to().emit sends to everyone. 
      io.to(`game-${gameId}`).emit('game-update', action);
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});