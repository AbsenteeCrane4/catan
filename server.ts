import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';

import { catanReducer, createInitialState } from './src/lib/game-reducer';
import { GameState, GameAction } from './src/types/catan';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();


const activeGames = new Map<string, GameState>();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    
    socket.on('join-room', (gameId: string) => {
      socket.join(`game-${gameId}`);
      
      if (!activeGames.has(gameId)) {
        activeGames.set(gameId, createInitialState(2));
      }

      socket.emit('game-update', { 
        type: 'SYNC_STATE', 
        payload: activeGames.get(gameId) 
      });
    });

    socket.on('game-action', ({ gameId, action }: { gameId: string, action: GameAction }) => {
      const currentState = activeGames.get(gameId);
      
      if (currentState) {

        const newState = catanReducer(currentState, action);
        
        activeGames.set(gameId, newState);
        
        io.to(`game-${gameId}`).emit('game-update', { 
          type: 'SYNC_STATE', 
          payload: newState 
        });
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