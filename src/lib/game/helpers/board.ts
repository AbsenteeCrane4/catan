import { GameState, GameNode, Road } from "@/types/catan";

export function getAdjacentNodeIds(targetNodeId: string, allNodes: GameNode[]): string[] {
  const targetNode = allNodes.find(n => n.id === targetNodeId);
  if (!targetNode || targetNode.pixelPos.x === undefined || targetNode.pixelPos.y === undefined) return [];

  const distances = allNodes
    .filter(n => n.id !== targetNodeId && n.pixelPos.x !== undefined && n.pixelPos.y !== undefined)
    .map(n => ({
      id: n.id,
      dist: Math.hypot(n.pixelPos.x - targetNode.pixelPos.x, n.pixelPos.y - targetNode.pixelPos.y)
    }))
    .sort((a, b) => a.dist - b.dist);

  if (distances.length === 0) return [];
  const threshold = distances[0].dist + 2;

  return distances.filter(d => d.dist <= threshold).map(d => d.id);
}

export function isNodeConnectedToPlayerRoad(nodeId: string, roads: Record<string, Road>, playerId: number): boolean {
  return Object.values(roads).some(road =>
    road.playerId === playerId && (road.nodes[0] === nodeId || road.nodes[1] === nodeId)
  );
}

export function isValidRoadPlacement(nodeId1: string, nodeId2: string, playerId: number, state: GameState): boolean {
  const roadId = [nodeId1, nodeId2].sort().join('-');

  if (state.roads[roadId]) return false;

  return (state.settlements[nodeId1]?.playerId === playerId) ||
         (state.settlements[nodeId2]?.playerId === playerId) ||
         isNodeConnectedToPlayerRoad(nodeId1, state.roads, playerId) ||
         isNodeConnectedToPlayerRoad(nodeId2, state.roads, playerId);
}
