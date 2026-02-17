// hooks/useCatanGame.ts
import { useState, useEffect, useCallback } from 'react';
import { Player, Hex, ResourceType } from '@/types/catan';
import { generateBoard } from '@/lib/hex-utils';
import { PLAYER_COLORS } from '@/lib/constants';

export function useCatanGame() {
  const [boardRadius, setBoardRadius] = useState(2);
  const [playerCount, setPlayerCount] = useState(4);
  
  // Game State
  const [hexes, setHexes] = useState<Hex[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);

  // Init
  useEffect(() => {
    resetGame();
  }, [boardRadius, playerCount]);

  const resetGame = useCallback(() => {
    setHexes(generateBoard(boardRadius));
    
    const newPlayers = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0, desert: 0 },
      score: 0,
    }));
    
    setPlayers(newPlayers);
    setGameLog(['Game initialized']);
    setCurrentPlayerIndex(0);
    setDiceRoll(null);
  }, [boardRadius, playerCount]);

  const rollDice = () => {
    const total = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
    setDiceRoll(total);
    addToLog(`Player ${currentPlayerIndex + 1} rolled ${total}`);

    if (total === 7) {
      addToLog("Robber activated!");
      return; 
    }
    distributeResources(total);
  };

  const distributeResources = (roll: number) => {
    const hitHexes = hexes.filter(h => h.numberToken === roll);
    if (hitHexes.length === 0) return;

    // NOTE: In a real game, we check settlements. 
    // Here we give resources to the active player for demo purposes.
    setPlayers(prev => prev.map((p, idx) => {
      if (idx !== currentPlayerIndex) return p;
      const newRes = { ...p.resources };
      
      hitHexes.forEach(h => {
        if (h.resource !== 'desert') newRes[h.resource]++;
      });
      return { ...p, resources: newRes };
    }));
  };

  const endTurn = () => {
    setCurrentPlayerIndex(prev => (prev + 1) % players.length);
    setDiceRoll(null);
  };

  const addToLog = (msg: string) => setGameLog(p => [msg, ...p].slice(0, 10));

  return {
    state: { boardRadius, playerCount, hexes, players, currentPlayerIndex, diceRoll, gameLog },
    actions: { setBoardRadius, setPlayerCount, rollDice, endTurn, resetGame }
  };
}