import { CommandRegistry } from "./types";
import { syncState } from "./syncState";
import { setRadius } from "./setRadius";
import { upgradeSettlement } from "./upgradeSettlement";
import { rollDice } from "./rollDice";
import { moveRobber } from "./moveRobber";
import { stealResource } from "./stealResource";
import { endTurn } from "./endTurn";
import { buildSettlement } from "./buildSettlement";
import { buildRoad } from "./buildRoad";
import { tradeWithBank } from "./tradeWithBank";
import { proposeTrade } from "./proposeTrade";
import { acceptTrade } from "./acceptTrade";
import { cancelTrade } from "./cancelTrade";
import { buyDevCard } from "./buyDevCard";
import { playDevCard } from "./playDevCard";

export const commandRegistry: CommandRegistry = {
  SYNC_STATE: syncState,
  SET_RADIUS: setRadius,
  UPGRADE_SETTLEMENT: upgradeSettlement,
  ROLL_DICE: rollDice,
  MOVE_ROBBER: moveRobber,
  STEAL_RESOURCE: stealResource,
  END_TURN: endTurn,
  BUILD_SETTLEMENT: buildSettlement,
  BUILD_ROAD: buildRoad,
  TRADE_WITH_BANK: tradeWithBank,
  PROPOSE_TRADE: proposeTrade,
  ACCEPT_TRADE: acceptTrade,
  CANCEL_TRADE: cancelTrade,
  BUY_DEV_CARD: buyDevCard,
  PLAY_DEV_CARD: playDevCard,
};
