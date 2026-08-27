import { GameState, CardArgsMap, DevelopmentCardType } from "@/types/catan";

export type PlayableDevCardType = Exclude<DevelopmentCardType, 'victoryPoint'>;

export type DevCardHandler<K extends PlayableDevCardType> = (
  draftState: GameState,      // state after card-removal-from-hand has already been applied
  originalState: GameState,   // pre-action state, returned on "fail safely" paths
  playerId: number,
  args: CardArgsMap[K] | undefined
) => GameState;

export type DevCardRegistry = {
  [K in PlayableDevCardType]: DevCardHandler<K>;
};
