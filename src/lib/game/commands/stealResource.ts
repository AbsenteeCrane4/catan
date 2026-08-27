import { CommandHandler } from "./types";
import { executeSteal } from "@/lib/game/helpers/robber";

export const stealResource: CommandHandler<'STEAL_RESOURCE'> = (state, action) => {
  const { thiefId, victimId } = action.payload;
  return executeSteal(state, thiefId, victimId);
};
