/** Excludes I, L, O, 0 and 1 so ids stay unambiguous when read aloud or typed from a screen. */
const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{4,24}$/;

/**
 * Generates a shareable game id.
 * Replaces `Math.random().toString(36).substring(7)`, which could return an empty
 * string when the random float's base-36 expansion was short.
 */
export function createGameId(length = 6): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return id;
}

export function isValidGameId(gameId: unknown): gameId is string {
  return typeof gameId === 'string' && GAME_ID_PATTERN.test(gameId.trim());
}
