import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';

import { catanReducer, createInitialState } from '@/lib/game-reducer';
import { GameState } from '@/types/catan';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const socketToPlayer = new Map<string, number>();

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();


const activeGames = new Map<string, GameState>();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

    io.on('connection', (socket) => {
    socket.on('join-room', ({ gameId, playerIndex }) => {
      socket.join(`game-${gameId}`);

      socketToPlayer.set(socket.id, playerIndex);

      if (!activeGames.has(gameId)) {
        activeGames.set(gameId, createInitialState(2));
      }
      socket.emit('game-update', { type: 'SYNC_STATE', payload: activeGames.get(gameId) });
    });

    socket.on('game-action', ({ gameId, action }) => {
      const state = activeGames.get(gameId);
      const actingPlayerIndex = socketToPlayer.get(socket.id);

      if (state && actingPlayerIndex !== undefined) {
        if (state.currentPlayerIndex !== actingPlayerIndex && action.type !== 'SET_RADIUS' && action.type !== 'ACCEPT_TRADE') {
          socket.emit('error', 'It is not your turn!');
          return;
        }

        const newState = catanReducer(state, action);
        activeGames.set(gameId, newState);
        io.to(`game-${gameId}`).emit('game-update', { type: 'SYNC_STATE', payload: newState });
      }
    });

    socket.on('disconnect', () => {
      // Future: Handle player leaving
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Authoritative Game Server ready on http://${hostname}:${port}`);
  });
});