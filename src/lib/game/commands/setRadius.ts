import { CommandHandler } from "./types";
import { createInitialState } from "@/lib/game/state/createInitialState";

export const setRadius: CommandHandler<'SET_RADIUS'> = (_state, action) => {
  return createInitialState(action.payload);
};
