/**
 * A source of randomness in [0, 1), matching Math.random's contract.
 *
 * Threaded through the board generators as a trailing optional argument so tests can
 * force layouts that are effectively unreachable under Math.random — the 6/8 repair
 * fallback in particular only runs after a thousand failed shuffles.
 */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Fisher-Yates, non-mutating. */
export function shuffle<T>(array: T[], rng: Rng = defaultRng): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
