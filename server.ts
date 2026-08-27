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

    const checkAndCleanupRoom = (roomId: string) => {
      const room = io.sockets.adapter.rooms.get(roomId);
      // If the room doesn't exist anymore, or has 0 connected sockets
      if (!room || room.size === 0) {
        const gameId = roomId.replace('game-', '');
        console.log(`Room ${gameId} is empty. Cleaning up game state.`);
        console.log(`getting room ${gameId}: ${activeGames.get(gameId)}`) // should show getting room ${gameId}: [object Object]
        activeGames.delete(gameId); 
        console.log(`getting room ${gameId}: ${activeGames.get(gameId)}`) // should show getting room ${gameId}: undefined
        }
    };

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

        const finalState = catanReducer(state, action);
        activeGames.set(gameId, finalState);
        io.to(`game-${gameId}`).emit('game-update', { type: 'SYNC_STATE', payload: finalState });
      }
    });

    socket.on('leave_room', (roomId: string) => {
      console.log("Leaving room on victory")
      socket.leave(roomId);
      checkAndCleanupRoom(roomId);
    });

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        // We delay the check slightly to let the disconnect fully process
        console.log("Leaving room on disconnect")
        setTimeout(() => {
          checkAndCleanupRoom(roomId);
        }, 1000);
      }
    }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Authoritative Game Server ready on http://${hostname}:${port}`);
  });
});