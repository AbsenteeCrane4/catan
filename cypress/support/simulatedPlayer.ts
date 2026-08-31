/**
 * Node-side "bot" players, driven directly over socket.io from the Cypress task
 * runner (not through a browser). This lets a spec drive a real second/third
 * player against the live dev server while the human-facing browser — the one
 * actually visible in `cypress open` — reacts to their moves over the wire,
 * exactly as it would to a real second tab.
 *
 * Deliberately dependency-free from `src/*`: Cypress bundles this file with its
 * own esbuild pass that doesn't know about the app's `@/` path alias, and a
 * loose local shape is all a bot needs.
 */
import { io, Socket } from 'socket.io-client';

interface GameNodeLike {
  id: string;
  pixelPos: { x: number; y: number };
  neighbors: string[];
  hexIds: string[];
}

interface GameHexLike {
  id: string;
  resource: string;
  numberToken: number | null;
}

interface GameStateLike {
  currentPlayerIndex: number;
  phase: string;
  setupActionRequired: string;
  nodes: GameNodeLike[];
  hexes: GameHexLike[];
  robberHexId: string;
  settlements: Record<string, { playerId: number }>;
  roads: Record<string, { playerId: number }>;
  players: { resources: Record<string, number> }[];
  diceRoll: number | null;
  pendingRobberAction: { status: string; validVictims?: number[] } | null;
  gameLog: string[];
}

interface Bot {
  socket: Socket;
  clientId: string;
  seatIndex: number | null;
  state: GameStateLike | null;
}

const bots = new Map<string, Bot>();
const SERVER_URL = 'http://localhost:3000';

function ackRequest<T = unknown>(socket: Socket, event: string, payload: unknown, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ack on "${event}"`)), timeoutMs);
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

function waitForBot(id: string, predicate: (bot: Bot) => boolean, timeoutMs = 5000): Promise<Bot> {
  const bot = bots.get(id);
  if (!bot) return Promise.reject(new Error(`No bot registered with id "${id}"`));

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const current = bots.get(id);
      if (!current) return reject(new Error(`Bot "${id}" was disposed while waiting`));
      if (predicate(current)) return resolve(current);
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting on bot "${id}"`));
      setTimeout(tick, 50);
    };
    tick();
  });
}

/** Distance-based "too close" check, mirroring src/lib/game/helpers/board.ts. */
function tooCloseToSettlement(nodeId: string, state: GameStateLike): boolean {
  const target = state.nodes.find(n => n.id === nodeId);
  if (!target) return true;

  const distances = state.nodes
    .filter(n => n.id !== nodeId)
    .map(n => ({ id: n.id, dist: Math.hypot(n.pixelPos.x - target.pixelPos.x, n.pixelPos.y - target.pixelPos.y) }))
    .sort((a, b) => a.dist - b.dist);

  if (!distances.length) return false;
  const threshold = distances[0].dist + 2;
  return distances.filter(d => d.dist <= threshold).some(d => state.settlements[d.id]);
}

function pickEmptyNode(state: GameStateLike): GameNodeLike {
  const candidate = state.nodes.find(n => !state.settlements[n.id] && !tooCloseToSettlement(n.id, state));
  if (!candidate) throw new Error('No legal empty settlement spot left on the board');
  return candidate;
}

function pickRoadFrom(nodeId: string, state: GameStateLike): [string, string] {
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) throw new Error(`Unknown node ${nodeId}`);

  const free = node.neighbors.find(neighborId => {
    const edgeId = [nodeId, neighborId].sort().join('-');
    return !state.roads[edgeId];
  });
  if (!free) throw new Error(`No free edge touching ${nodeId}`);
  return [nodeId, free];
}

export function registerBotTasks(on: Cypress.PluginEvents) {
  on('task', {
    async botSpawn({ id, gameId, name, color }: { id: string; gameId: string; name: string; color: string }) {
      if (bots.has(id)) throw new Error(`Bot "${id}" already spawned`);

      const clientId = `bot-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true });

      const bot: Bot = { socket, clientId, seatIndex: null, state: null };
      bots.set(id, bot);

      socket.on('game-update', (message: { type: string; payload: GameStateLike }) => {
        if (message.type === 'SYNC_STATE') bot.state = message.payload;
      });

      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', err => reject(err));
      });

      const enter = await ackRequest<{ ok: boolean; state: GameStateLike | null }>(socket, 'room:enter', {
        gameId,
        clientId,
      });
      if (!enter.ok) throw new Error(`Bot "${id}" failed to enter room ${gameId}`);
      if (enter.state) bot.state = enter.state;

      const sit = await ackRequest<{ ok: boolean; seatIndex?: number; error?: string; message?: string }>(
        socket,
        'lobby:sit',
        { name, color }
      );
      if (!sit.ok) throw new Error(`Bot "${id}" failed to sit: ${sit.error} ${sit.message ?? ''}`);
      bot.seatIndex = sit.seatIndex ?? null;

      return { seatIndex: bot.seatIndex };
    },

    async botStart({ id }: { id: string }) {
      const bot = bots.get(id);
      if (!bot) throw new Error(`No bot registered with id "${id}"`);
      const result = await ackRequest<{ ok: boolean; error?: string; message?: string }>(
        bot.socket,
        'lobby:start',
        {}
      );
      if (!result.ok) throw new Error(`Start failed: ${result.error} ${result.message ?? ''}`);
      return null;
    },

    /**
     * Plays exactly one setup-phase turn (settlement + road) for this bot, waiting
     * for the server to broadcast the game-action's effect before returning so the
     * caller can immediately assert on the next actor without a race.
     */
    async botPlaySetupTurn({ id }: { id: string }) {
      const started = await waitForBot(id, bot => bot.state !== null && bot.seatIndex === bot.state!.currentPlayerIndex);
      const seatIndex = started.seatIndex!;

      const beforeSettlement = started.state!;
      const node = pickEmptyNode(beforeSettlement);
      started.socket.emit('game-action', {
        action: { type: 'BUILD_SETTLEMENT', payload: { nodeId: node.id, playerId: seatIndex } },
      });
      await waitForBot(id, bot => !!bot.state?.settlements[node.id]);

      const afterSettlement = bots.get(id)!.state!;
      const [n1, n2] = pickRoadFrom(node.id, afterSettlement);
      const roadId = [n1, n2].sort().join('-');
      started.socket.emit('game-action', {
        action: { type: 'BUILD_ROAD', payload: { nodeId1: n1, nodeId2: n2, playerId: seatIndex } },
      });
      await waitForBot(id, bot => !!bot.state?.roads[roadId]);

      return { nodeId: node.id, roadId };
    },

    /** Returns this bot's last-known synced GameState, for tests to inspect and pick targets from. */
    async botGetState({ id }: { id: string }) {
      const bot = bots.get(id);
      if (!bot) throw new Error(`No bot registered with id "${id}"`);
      return bot.state;
    },

    /** Fires an arbitrary game-action for this bot and waits for its effect to land. */
    async botAction({ id, action }: { id: string; action: unknown }) {
      const bot = bots.get(id);
      if (!bot) throw new Error(`No bot registered with id "${id}"`);
      const prevLogLen = bot.state?.gameLog?.length ?? 0;
      bot.socket.emit('game-action', { action });
      const updated = await waitForBot(id, b => (b.state?.gameLog?.length ?? 0) > prevLogLen);
      return updated.state;
    },

    /**
     * Queues a forced dice total on the server (see src/lib/game/helpers/testDice.ts),
     * consumed by this bot's NEXT ROLL_DICE action instead of a real random roll.
     * Only registered server-side outside production builds.
     */
    async botQueueDice({ id, total }: { id: string; total: number }) {
      const bot = bots.get(id);
      if (!bot) throw new Error(`No bot registered with id "${id}"`);
      await ackRequest(bot.socket, 'test:queue-dice', { total });
      return null;
    },

    /** Queues which of the victim's held cards (by flattened index) the next steal takes. */
    async botQueueStealIndex({ id, index }: { id: string; index: number }) {
      const bot = bots.get(id);
      if (!bot) throw new Error(`No bot registered with id "${id}"`);
      await ackRequest(bot.socket, 'test:queue-steal-index', { index });
      return null;
    },

    async botResetDiceQueue({ id }: { id: string }) {
      const bot = bots.get(id);
      if (!bot) throw new Error(`No bot registered with id "${id}"`);
      await ackRequest(bot.socket, 'test:reset-dice', {});
      return null;
    },

    async botDisconnect({ id }: { id: string }) {
      const bot = bots.get(id);
      if (!bot) return null;
      bot.socket.close();
      bots.delete(id);
      return null;
    },

    disposeBots() {
      for (const bot of bots.values()) bot.socket.close();
      bots.clear();
      return null;
    },
  });
}
