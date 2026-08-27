import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';

import { registerSocketHandlers } from '@/lib/server/socketHandlers';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  // All room lifecycle, seat assignment and game-action authorisation lives in
  // src/lib/server/* so it can be unit-tested without a socket.
  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> Authoritative Game Server ready on http://${hostname}:${port}`);
  });
});
