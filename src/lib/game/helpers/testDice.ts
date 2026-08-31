/**
 * Test-only seam for making dice rolls and robber steals deterministic in E2E tests,
 * mirroring the injectable `Rng` pattern already used for board generation
 * (src/lib/rng.ts) — same idea, but as a FIFO queue since rollDice/executeSteal are
 * invoked per action dispatch, not at board-creation time, so there's no call site to
 * thread an argument through.
 *
 * Queued values are consumed once, in the order queued; once empty, real randomness
 * takes over. Only reachable from a socket event gated to non-production builds (see
 * src/lib/server/socketHandlers.ts) — never wired into anything a real client can hit.
 */
let queuedTotals: number[] = [];
let queuedStealIndices: number[] = [];

export function queueDiceTotal(total: number): void {
  queuedTotals.push(total);
}

export function takeQueuedDiceTotal(): number | null {
  return queuedTotals.length > 0 ? queuedTotals.shift()! : null;
}

export function queueStealIndex(index: number): void {
  queuedStealIndices.push(index);
}

export function takeQueuedStealIndex(): number | null {
  return queuedStealIndices.length > 0 ? queuedStealIndices.shift()! : null;
}

export function resetTestDiceQueues(): void {
  queuedTotals = [];
  queuedStealIndices = [];
}
