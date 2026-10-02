import { DevCardHandler } from "./types";
import { isValidRoadPlacement } from "@/lib/game/helpers/board";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";
import { hasPiecesFor } from "@/lib/game/helpers/buildLegality";
import { withLog } from "@/lib/game/helpers/guards";
import { nameOf } from "@/lib/game/helpers/playerName";

export const applyRoadBuilding: DevCardHandler<'roadBuilding'> = (draftState, originalState, playerId, args) => {
  if (!hasPiecesFor(draftState, playerId, 'road')) {
    return withLog(originalState, "You have no roads left for Road Building.");
  }
  // With a single road left the card places just that one, so the second is not required.
  const lastRoadOnly = !hasPiecesFor(draftState, playerId, 'road', 2);
  if (!args?.road1 || (!args.road2 && !lastRoadOnly)) {
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
  let stateWithBothRoads = stateWithFirstRoad;
  if (!lastRoadOnly) {
    const road2 = args.road2 as [string, string];
    if (!isValidRoadPlacement(road2[0], road2[1], playerId, stateWithFirstRoad)) {
      return withLog(originalState, "Invalid second road placement for Road Building.");
    }
    const road2Id = [...road2].sort().join('-');
    stateWithBothRoads = {
      ...stateWithFirstRoad,
      roads: { ...stateWithFirstRoad.roads, [road2Id]: { id: road2Id, playerId, nodes: road2 } }
    };
  }

  // Evaluate longest road after the roads are placed
  const evaluation = evaluateLongestRoad(stateWithBothRoads, [playerId]);

  return {
    ...stateWithBothRoads,
    players: evaluation.players,
    longestRoad: evaluation.longestRoad,
    gameLog: [
      `${nameOf(stateWithBothRoads, playerId)} played Road Building and placed ${lastRoadOnly ? '1 free road (their last)' : '2 free roads'}.`,
      ...evaluation.logs,
      ...stateWithBothRoads.gameLog
    ]
  };
};
