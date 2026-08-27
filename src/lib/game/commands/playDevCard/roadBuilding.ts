import { DevCardHandler } from "./types";
import { isValidRoadPlacement } from "@/lib/game/helpers/board";
import { evaluateLongestRoad } from "@/lib/game/helpers/longestRoad";

export const applyRoadBuilding: DevCardHandler<'roadBuilding'> = (draftState, originalState, playerId, args) => {
  if (!args?.road1 || !args?.road2) return originalState;

  // Validate and place the FIRST road
  if (!isValidRoadPlacement(args.road1[0], args.road1[1], playerId, draftState)) {
    return { ...originalState, gameLog: ["Invalid first road placement for Road Building.", ...originalState.gameLog] };
  }
  const road1Id = [...args.road1].sort().join('-');
  // NOTE: pre-existing bug, intentionally preserved (out of scope for this refactor) — this mutates
  // draftState.roads in place, which is the same object reference as originalState.roads, instead of
  // cloning first. Same bug class as the resources aliasing fixed in yearOfPlenty/monopoly, but not
  // one of the approved fixes.
  draftState.roads[road1Id] = { id: road1Id, playerId, nodes: args.road1 };

  // Validate and place the SECOND road (against the draftState that now includes road 1)
  if (!isValidRoadPlacement(args.road2[0], args.road2[1], playerId, draftState)) {
    return { ...originalState, gameLog: ["Invalid second road placement for Road Building.", ...originalState.gameLog] };
  }
  const road2Id = [...args.road2].sort().join('-');
  draftState.roads[road2Id] = { id: road2Id, playerId, nodes: args.road2 };

  // Evaluate longest road after both are placed
  const evaluation = evaluateLongestRoad(draftState, [playerId]);
  draftState.players = evaluation.players;
  draftState.longestRoad = evaluation.longestRoad;

  draftState.gameLog = [
    `Player ${playerId + 1} played Road Building and placed 2 free roads.`,
    ...evaluation.logs,
    ...draftState.gameLog
  ];

  return draftState;
};
