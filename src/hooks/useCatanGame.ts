import { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Hex, GameNode, Settlement } from '@/types/catan';
import { generateBoard, getNodesForBoard } from '@/lib/hex-utils';
import { PLAYER_COLORS, RESOURCE_TYPES } from '@/lib/constants';

export function useCatanGame() {
  const [boardRadius, setBoardRadius] = useState(2);
  const [playerCount, setPlayerCount] = useState(4);
  
  // Game State
  const [hexes, setHexes] = useState<Hex[]>([]);
  const [nodes, setNodes] = useState<GameNode[]>([]);
  const [settlements, setSettlements] = useState<Record<string, Settlement>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);

  // Initialize Game
  const resetGame = useCallback(() => {
    const newHexes = generateBoard(boardRadius);
    const newNodes = getNodesForBoard(newHexes);
    
    const newPlayers = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 2, brick: 2, sheep: 2, wheat: 2, ore: 0, desert: 0 }, // Starting resources
      score: 0,
    }));
    
    setHexes(newHexes);
    setNodes(newNodes);
    setSettlements({});
    setPlayers(newPlayers);
    setGameLog(['Game started. Build your first settlements!']);
    setCurrentPlayerIndex(0);
    setDiceRoll(null);
  }, [boardRadius, playerCount]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const addToLog = (msg: string) => setGameLog(p => [msg, ...p].slice(0, 10));

  // --- Actions ---

  const buildSettlement = (nodeId: string) => {
    const player = players[currentPlayerIndex];
    
    // 1. Check if already occupied
    if (settlements[nodeId]) return;

    // 2. Resource Check
    const canAfford = player.resources.wood >= 1 && player.resources.brick >= 1 && 
                      player.resources.sheep >= 1 && player.resources.wheat >= 1;
    
    if (!canAfford) {
      addToLog(`Player ${player.id + 1} lacks resources for a settlement.`);
      return;
    }

    // 3. Distance Rule Check
    const currentNode = nodes.find(n => n.id === nodeId);
    const isTooClose = nodes.some(otherNode => {
      if (otherNode.id === nodeId || !settlements[otherNode.id]) return false;
      // Share 2 hexes = they are adjacent
      const shared = otherNode.hexCoords.filter(oh => 
        currentNode?.hexCoords.some(ch => ch.q === oh.q && ch.r === oh.r)
      );
      return shared.length >= 2;
    });

    if (isTooClose) {
      addToLog("Cannot build: Settlement too close to another.");
      return;
    }

    // 4. Execute Build
    setSettlements(prev => ({
      ...prev,
      [nodeId]: { nodeId, playerId: player.id, isCity: false }
    }));

    setPlayers(prev => prev.map((p, idx) => {
      if (idx !== currentPlayerIndex) return p;
      return {
        ...p,
        score: p.score + 1,
        resources: {
          ...p.resources,
          wood: p.resources.wood - 1,
          brick: p.resources.brick - 1,
          sheep: p.resources.sheep - 1,
          wheat: p.resources.wheat - 1,
        }
      };
    }));

    addToLog(`Player ${player.id + 1} built a settlement.`);
  };

  const rollDice = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;
    setDiceRoll(total);
    addToLog(`Dice rolled: ${total}`);

    if (total === 7) {
      addToLog("The Robber strikes!");
      return;
    }

    // Distribute resources based on settlements
    const income: Record<number, Partial<Record<string, number>>> = {};

    Object.values(settlements).forEach(settlement => {
      const node = nodes.find(n => n.id === settlement.nodeId);
      node?.hexCoords.forEach(coord => {
        const hex = hexes.find(h => h.q === coord.q && h.r === coord.r);
        if (hex?.numberToken === total && hex.resource !== 'desert') {
          if (!income[settlement.playerId]) income[settlement.playerId] = {};
          income[settlement.playerId][hex.resource] = (income[settlement.playerId][hex.resource] || 0) + 1;
        }
      });
    });

      // Update player resources
      setPlayers(prev => prev.map(p => {
        if (!income[p.id]) return p;
        const newRes = { ...p.resources };
        Object.entries(income[p.id]).forEach(([res, amt]) => {
          newRes[res as keyof typeof newRes] += amt || 0;
        });
        return { ...p, resources: newRes };
      }));
    };
  
    const endTurn = () => {
      setCurrentPlayerIndex(prev => (prev + 1) % players.length);
      setDiceRoll(null);
      addToLog(`Turn ended. Next player's turn.`);
    };
  
    return {
    state: { 
      boardRadius, 
      playerCount, 
      hexes, 
      nodes, 
      settlements, 
      players, 
      currentPlayerIndex, 
      diceRoll, 
      gameLog 
    },
    actions: { 
      setBoardRadius, 
      setPlayerCount, 
      rollDice, 
      endTurn, 
      buildSettlement, 
      resetGame 
    }
  };
}