import { useState, useCallback } from 'react';
import { Player, Hex, GameNode, Settlement, Road } from '@/types/catan';
import { generateBoard, getNodesForBoard } from '@/lib/hex-utils';
import { PLAYER_COLORS } from '@/lib/constants';

export function useCatanGame() {
  const [boardRadius, setBoardRadius] = useState(2);
  const [playerCount, setPlayerCount] = useState(4);
  
  const [hexes, setHexes] = useState<Hex[]>(() => generateBoard(2));
  const [nodes, setNodes] = useState<GameNode[]>(() => getNodesForBoard(generateBoard(2)));
  const [settlements, setSettlements] = useState<Record<string, Settlement>>({});
  const [roads, setRoads] = useState<Record<string, Road>>({});
  
  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 4, brick: 4, sheep: 2, wheat: 2, ore: 0, desert: 0 },
      score: 0,
    }))
  );

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [gameLog, setGameLog] = useState<string[]>(['Game initialized.']);

  const resetGame = useCallback(() => {
    const newHexes = generateBoard(boardRadius);
    const newNodes = getNodesForBoard(newHexes);
    
    const newPlayers = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 4, brick: 4, sheep: 2, wheat: 2, ore: 0, desert: 0 },
      score: 0,
    }));
    
    setHexes(newHexes);
    setNodes(newNodes);
    setSettlements({});
    setRoads({});
    setPlayers(newPlayers);
    setGameLog(['Board reset. New game started!']);
    setCurrentPlayerIndex(0);
    setDiceRoll(null);
  }, [boardRadius, playerCount]);


  const addToLog = (msg: string) => setGameLog(p => [msg, ...p].slice(0, 10));

  const buildSettlement = (nodeId: string) => {
    const player = players[currentPlayerIndex];
    if (settlements[nodeId]) return;

    // Cost: 1 Brick, 1 Wood, 1 Sheep, 1 Wheat
    if (player.resources.wood < 1 || player.resources.brick < 1 || player.resources.sheep < 1 || player.resources.wheat < 1) {
      addToLog("Not enough resources for Settlement");
      return;
    }

    // Distance Rule
    const currentNode = nodes.find(n => n.id === nodeId);
    const isTooClose = nodes.some(other => {
      if (!settlements[other.id]) return false;
      const shared = other.hexCoords.filter(oh => currentNode?.hexCoords.some(ch => ch.q === oh.q && ch.r === oh.r));
      return shared.length >= 2; 
    });

    if (isTooClose) {
      addToLog("Too close to another settlement!");
      return;
    }


    setSettlements(prev => ({
      ...prev,
      [nodeId]: { nodeId, playerId: player.id, isCity: false }
    }));

    setPlayers(prev => prev.map((p, idx) => {
      if (idx !== currentPlayerIndex) return p;
      return {
        ...p,
        score: p.score + 1,
        resources: { ...p.resources, wood: p.resources.wood - 1, brick: p.resources.brick - 1, sheep: p.resources.sheep - 1, wheat: p.resources.wheat - 1 }
      };
    }));
    addToLog(`Player ${player.id + 1} built a Settlement`);
  };

  const buildRoad = (nodeId1: string, nodeId2: string) => {
    const player = players[currentPlayerIndex];
    const roadId = [nodeId1, nodeId2].sort().join('-');

    if (roads[roadId]) return;

    // Cost: 1 Wood, 1 Brick
    if (player.resources.wood < 1 || player.resources.brick < 1) {
      addToLog("Not enough resources for Road");
      return;
    }

    // Connectivity: Must connect to one of YOUR settlements OR one of YOUR roads
    const hasConnectedSettlement = 
      (settlements[nodeId1]?.playerId === player.id) || 
      (settlements[nodeId2]?.playerId === player.id);

    const hasConnectedRoad = Object.values(roads).some(r => 
      r.playerId === player.id && 
      (r.nodes.includes(nodeId1) || r.nodes.includes(nodeId2))
    );

    if (!hasConnectedSettlement && !hasConnectedRoad) {
      addToLog("Road must connect to your network!");
      return;
    }

    setRoads(prev => ({
      ...prev,
      [roadId]: { id: roadId, playerId: player.id, nodes: [nodeId1, nodeId2] }
    }));

    setPlayers(prev => prev.map((p, idx) => {
      if (idx !== currentPlayerIndex) return p;
      return {
        ...p,
        resources: { ...p.resources, wood: p.resources.wood - 1, brick: p.resources.brick - 1 }
      };
    }));
    addToLog(`Player ${player.id + 1} built a Road`);
  };

  const rollDice = () => {
    const total = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
    setDiceRoll(total);
    addToLog(`Rolled: ${total}`);
    
    const income: Record<number, Partial<Record<string, number>>> = {};
    Object.values(settlements).forEach(s => {
      const node = nodes.find(n => n.id === s.nodeId);
      node?.hexCoords.forEach(c => {
        const h = hexes.find(hex => hex.q === c.q && hex.r === c.r);
        if (h && h.numberToken === total && h.resource !== 'desert') {
          if (!income[s.playerId]) income[s.playerId] = {};
          income[s.playerId][h.resource] = (income[s.playerId][h.resource] || 0) + 1;
        }
      });
    });

    setPlayers(prev => prev.map(p => {
      if (!income[p.id]) return p;
      const newRes = { ...p.resources };
      Object.entries(income[p.id]).forEach(([r, amt]) => {
        newRes[r as keyof typeof newRes] += amt || 0;
      });
      return { ...p, resources: newRes };
    }));
  };

  const endTurn = () => {
    setCurrentPlayerIndex(prev => (prev + 1) % players.length);
    setDiceRoll(null);
  };

  return {
    state: { boardRadius, playerCount, hexes, nodes, settlements, roads, players, currentPlayerIndex, diceRoll, gameLog },
    actions: { setBoardRadius, setPlayerCount, rollDice, endTurn, buildSettlement, buildRoad, resetGame }
  };
}