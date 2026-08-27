import { DevCardHandler } from "./types";
import { isValidRoadPlacement } from "@/lib/game/helpers/board";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";
import { withLog } from "@/lib/game/helpers/guards";

export const applyRoadBuilding: DevCardHandler<'roadBuilding'> = (draftState, originalState, playerId, args) => {
  if (!args?.road1 || !args?.road2) {
    return withLog(originalState, "Road Building needs two road placements selected.");
  }

  // Validate and place the FIRST road
  if (!isValidRoadPlacement(args.road1[0], args.road1[1], playerId, draftState)) {
    return withLog(originalState, "Invalid first road placement for Road Building.");
  }
  const road1Id = [...args.road1].sort().join('-');
  const stateWithFirstRoad = {
    ...draftState,
    roads: { ...draftState.roads, [road1Id]: { id: road1Id, playerId, nodes: args.road1 } }
  };

  // Validate the SECOND road against the state that now includes road 1. Bailing out here must not
  // leave road 1 behind, so the placement above builds a new roads map rather than mutating the
  // shared one — otherwise an invalid second road still awarded a free first road.
  if (!isValidRoadPlacement(args.road2[0], args.road2[1], playerId, stateWithFirstRoad)) {
    return withLog(originalState, "Invalid second road placement for Road Building.");
  }
  const road2Id = [...args.road2].sort().join('-');
  const stateWithBothRoads = {
    ...stateWithFirstRoad,
    roads: { ...stateWithFirstRoad.roads, [road2Id]: { id: road2Id, playerId, nodes: args.road2 } }
  };

  // Evaluate longest road after both are placed
  const evaluation = evaluateLongestRoad(stateWithBothRoads, [playerId]);

  return {
    ...stateWithBothRoads,
    players: evaluation.players,
    longestRoad: evaluation.longestRoad,
    gameLog: [
      `Player ${playerId + 1} played Road Building and placed 2 free roads.`,
      ...evaluation.logs,
      ...stateWithBothRoads.gameLog
    ]
  };
};
