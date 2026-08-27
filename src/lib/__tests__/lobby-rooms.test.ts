import { describe, it, expect, beforeEach } from 'vitest';
import { RoomStore } from '@/lib/server/rooms';
import { MAX_PLAYERS } from '@/types/lobby';
import { PlayerColor } from '@/types/catan';

const COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange', 'green', 'brown'];

describe('RoomStore', () => {
  let store: RoomStore;
  const GAME = 'ABCD12';

  beforeEach(() => {
    store = new RoomStore();
  });

  /** Seats n players named P1..Pn with distinct colours. */
  const seatMany = (count: number) => {
    for (let i = 0; i < count; i++) {
      const result = store.sit(GAME, `client-${i}`, `P${i + 1}`, COLORS[i]);
      expect(result.ok).toBe(true);
    }
  };

  describe('claiming seats', () => {
    it('assigns sequential seat indices and makes the first player host', () => {
      expect(store.sit(GAME, 'c0', 'Ada', 'red')).toMatchObject({ ok: true, seatIndex: 0 });
      expect(store.sit(GAME, 'c1', 'Grace', 'blue')).toMatchObject({ ok: true, seatIndex: 1 });

      const snapshot = store.toSnapshot(store.get(GAME)!);
      expect(snapshot.seats[0].isHost).toBe(true);
      expect(snapshot.seats[1].isHost).toBe(false);
    });

    it('rejects a duplicate name regardless of case', () => {
      store.sit(GAME, 'c0', 'Ada', 'red');
      expect(store.sit(GAME, 'c1', '  aDa ', 'blue')).toMatchObject({ ok: false, error: 'NAME_TAKEN' });
    });

    it('rejects a duplicate colour', () => {
      store.sit(GAME, 'c0', 'Ada', 'red');
      expect(store.sit(GAME, 'c1', 'Grace', 'red')).toMatchObject({ ok: false, error: 'COLOR_TAKEN' });
    });

    it('rejects an empty name and an unknown colour', () => {
      expect(store.sit(GAME, 'c0', '   ', 'red')).toMatchObject({ ok: false, error: 'INVALID_NAME' });
      expect(store.sit(GAME, 'c0', 'Ada', 'chartreuse' as PlayerColor))
        .toMatchObject({ ok: false, error: 'INVALID_COLOR' });
    });

    it('rejects a malformed game id', () => {
      expect(store.sit('!!', 'c0', 'Ada', 'red')).toMatchObject({ ok: false, error: 'INVALID_GAME_ID' });
    });

    it(`rejects the ${MAX_PLAYERS + 1}th player`, () => {
      seatMany(MAX_PLAYERS);
      expect(store.sit(GAME, 'overflow', 'Nope', 'purple'))
        .toMatchObject({ ok: false, error: 'ROOM_FULL' });
    });

    it('is idempotent for the same client — re-sitting keeps the same seat', () => {
      store.sit(GAME, 'c0', 'Ada', 'red');
      store.sit(GAME, 'c1', 'Grace', 'blue');

      const again = store.sit(GAME, 'c1', 'Grace', 'blue');

      expect(again).toMatchObject({ ok: true, seatIndex: 1 });
      expect(store.get(GAME)!.seats).toHaveLength(2);
    });

    it('treats game ids as case-insensitive', () => {
      store.sit('abcd12', 'c0', 'Ada', 'red');
      expect(store.get('ABCD12')!.seats).toHaveLength(1);
    });
  });

  describe('leaving', () => {
    it('compacts seat indices while still in the lobby', () => {
      seatMany(3);
      store.stand(GAME, 'client-0');

      const seats = store.get(GAME)!.seats;
      expect(seats.map(s => s.seatIndex)).toEqual([0, 1]);
      expect(seats.map(s => s.name)).toEqual(['P2', 'P3']);
    });

    it('promotes a new host when the host leaves', () => {
      seatMany(3);
      store.stand(GAME, 'client-0');

      const snapshot = store.toSnapshot(store.get(GAME)!);
      expect(snapshot.seats.find(s => s.isHost)?.name).toBe('P2');
    });

    it('keeps the seat and freezes indices once the game has started', () => {
      seatMany(3);
      store.start(GAME, 'client-0');
      store.stand(GAME, 'client-1');

      const seats = store.get(GAME)!.seats;
      // The seat is retained (its player still owns buildings) but marked disconnected.
      expect(seats).toHaveLength(3);
      expect(seats.find(s => s.clientId === 'client-1')!.connected).toBe(false);
      expect(seats.map(s => s.seatIndex)).toEqual([0, 1, 2]);
    });
  });

  describe('starting', () => {
    it('refuses with fewer than two players', () => {
      store.sit(GAME, 'c0', 'Ada', 'red');
      expect(store.start(GAME, 'c0')).toMatchObject({ ok: false, error: 'NOT_ENOUGH_PLAYERS' });
    });

    it('refuses a non-host', () => {
      seatMany(2);
      expect(store.start(GAME, 'client-1')).toMatchObject({ ok: false, error: 'NOT_HOST' });
    });

    it('refuses to start twice', () => {
      seatMany(2);
      store.start(GAME, 'client-0');
      expect(store.start(GAME, 'client-0')).toMatchObject({ ok: false, error: 'ALREADY_STARTED' });
    });

    it('refuses to seat new players once started', () => {
      seatMany(2);
      store.start(GAME, 'client-0');
      expect(store.sit(GAME, 'latecomer', 'Late', 'green'))
        .toMatchObject({ ok: false, error: 'GAME_IN_PROGRESS' });
    });

    it('carries seat names and colours into the game state, in seat order', () => {
      seatMany(3);
      const result = store.start(GAME, 'client-0');

      expect(result.ok).toBe(true);
      const game = store.get(GAME)!.game!;
      expect(game.players.map(p => p.name)).toEqual(['P1', 'P2', 'P3']);
      expect(game.players.map(p => p.color)).toEqual(['red', 'blue', 'white']);
    });

    it('preserves the players[i].id === i invariant the reducer depends on', () => {
      seatMany(5);
      store.start(GAME, 'client-0');

      const game = store.get(GAME)!.game!;
      expect(game.players.every((p, i) => p.id === i)).toBe(true);
    });

    it('selects the expansion board at five or more players', () => {
      seatMany(5);
      store.start(GAME, 'client-0');
      expect(store.get(GAME)!.game!.boardKind).toBe('expansion');
    });

    it('selects the base board below five players', () => {
      seatMany(4);
      store.start(GAME, 'client-0');
      expect(store.get(GAME)!.game!.boardKind).toBe('base');
    });
  });

  describe('snapshot', () => {
    it('never leaks clientId to clients', () => {
      seatMany(2);
      const snapshot = store.toSnapshot(store.get(GAME)!);

      expect(JSON.stringify(snapshot)).not.toContain('client-0');
      snapshot.seats.forEach(seat => {
        expect(seat).not.toHaveProperty('clientId');
      });
    });

    it('reports canStart only once enough players are seated', () => {
      store.sit(GAME, 'c0', 'Ada', 'red');
      expect(store.toSnapshot(store.get(GAME)!).canStart).toBe(false);

      store.sit(GAME, 'c1', 'Grace', 'blue');
      expect(store.toSnapshot(store.get(GAME)!).canStart).toBe(true);
    });
  });

  describe('sweep', () => {
    it('reclaims idle empty rooms but keeps rooms with sockets', () => {
      store.sit(GAME, 'c0', 'Ada', 'red');
      store.sit('OTHER1', 'c1', 'Grace', 'blue');
      store.get('OTHER1')!.socketIds.add('socket-1');

      const removed = store.sweep(1000, Date.now() + 5000);

      expect(removed).toEqual([GAME]);
      expect(store.get(GAME)).toBeUndefined();
      expect(store.get('OTHER1')).toBeDefined();
    });
  });
});
