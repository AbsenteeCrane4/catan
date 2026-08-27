import { CommandHandler } from "./types";

export const syncState: CommandHandler<'SYNC_STATE'> = (_state, action) => {
  return action.payload;
};
