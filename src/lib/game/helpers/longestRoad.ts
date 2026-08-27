import { GameState, Road, Settlement } from "@/types/catan";

function getLongestRoadForPlayer(playerId: number, roads: Road[], settlements: Record<string, Settlement>) {
  const playerRoads = roads.filter(r => r.playerId === playerId);
  if (playerRoads.length === 0) return 0;

  // Build an adjacency list (Graph) of the player's road network
  const adj: Record<string, { to: string, roadId: string }[]> = {};
  playerRoads.forEach((r) => {
    const n1 = r.nodes[0];
    const n2 = r.nodes[1];

    if (!adj[n1]) adj[n1] = [];
    if (!adj[n2]) adj[n2] = [];

    adj[n1].push({ to: n2, roadId: r.id });
    adj[n2].push({ to: n1, roadId: r.id });
  });

  let maxPath = 0;

  // DFS to explore all valid paths
  function dfs(currentNode: string, visitedEdges: Set<string>, currentLength: number) {
    if (currentLength > maxPath) maxPath = currentLength;

    // RULE CHECK: If this node has an OPPONENT'S settlement/city, the road is broken!
    const building = settlements[currentNode];
    if (building && building.playerId !== playerId) {
      return; // Stop exploring further from this node
    }

    const edges = adj[currentNode] || [];
    for (const edge of edges) {
      if (!visitedEdges.has(edge.roadId)) {
        visitedEdges.add(edge.roadId);
        dfs(edge.to, visitedEdges, currentLength + 1);
        visitedEdges.delete(edge.roadId); // Backtrack
      }
    }
  }

  let startNodes = Object.keys(adj).filter(node => {
    const degree = adj[node].length;
    const hasOpponentBuilding = settlements[node] && settlements[node].playerId !== playerId;
    return degree !== 2 || hasOpponentBuilding;
  });

  // If all nodes have degree 2 and no opponent buildings, it means we have a perfect loop. In that case, every single node will have a degree of 2. If so, just pick the first node to start.
  if (startNodes.length === 0 && Object.keys(adj).length > 0) {
    startNodes = [Object.keys(adj)[0]];
  }

  // Run DFS only from our heavily reduced list of starting points
  for (const node of startNodes) {
    dfs(node, new Set(), 0);
  }

  return maxPath;
}

export function evaluateLongestRoad(state: GameState, affectedPlayerIds: number[]) {
  const { roads, settlements, players, longestRoad } = state;

  const currentHolderId = longestRoad.playerId;
  const currentRecordLength = longestRoad.length;

  const updatedPlayers = [...players];
  const logs: string[] = [];

  affectedPlayerIds.forEach(playerId => {
    const newLength = getLongestRoadForPlayer(playerId, Object.values(roads), settlements);
    updatedPlayers[playerId] = { ...updatedPlayers[playerId], longestRoadLength: newLength };
  });

  const maxLength = Math.max(...updatedPlayers.map(p => p.longestRoadLength), 0);
  const candidates = updatedPlayers.filter(p => p.longestRoadLength === maxLength);

  let newHolderId = currentHolderId;
  const newLength = maxLength < 5 ? 0 : maxLength;

  if (maxLength < 5) {
    newHolderId = null;
  } else {
    const holderCandidate = candidates.find(c => c.id === currentHolderId);

    if (holderCandidate) {
      newHolderId = currentHolderId;
    } else {
      if (candidates.length === 1) {
        newHolderId = candidates[0].id;
      } else {
        newHolderId = null;
      }
    }
  }

  if (newHolderId !== currentHolderId) {
    if (currentHolderId !== null) {
      updatedPlayers[currentHolderId].victoryPoints -= 2;
      logs.push(`Player ${currentHolderId + 1} lost the Longest Road.`);
    }
    if (newHolderId !== null) {
      updatedPlayers[newHolderId].victoryPoints += 2;
      logs.push(`Player ${newHolderId + 1} claimed the Longest Road with a length of ${maxLength}! (+2 VP)`);
    }
  } else if (newHolderId !== null && maxLength > currentRecordLength) {
    logs.push(`Player ${newHolderId + 1} extended the Longest Road to ${maxLength}!`);
  }

  return {
    players: updatedPlayers,
    longestRoad: { playerId: newHolderId, length: newLength },
    logs
  };
}
