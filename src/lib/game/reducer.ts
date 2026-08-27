import { GameState, GameAction } from "@/types/catan";
import { commandRegistry } from "./commands/registry";
import { evaluateWinCondition } from "./helpers/winCondition";

export function coreReducer(state: GameState, action: GameAction): GameState {
  const handler = commandRegistry[action.type] as (s: GameState, a: GameAction) => GameState;
  return handler(state, action);
}

export function catanReducer(state: GameState, action: GameAction): GameState {
  return evaluateWinCondition(coreReducer(state, action));
}
