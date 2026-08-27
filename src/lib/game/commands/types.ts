import { GameState, GameAction } from "@/types/catan";

export type CommandHandler<T extends GameAction['type']> = (
  state: GameState,
  action: Extract<GameAction, { type: T }>
) => GameState;

export type CommandRegistry = {
  [K in GameAction['type']]: CommandHandler<K>;
};
