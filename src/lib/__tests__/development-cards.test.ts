import { describe, it, expect, beforeEach } from 'vitest';
import { catanReducer, createInitialState } from '@/lib/game-reducer';
import { GameState } from '@/types/catan';
import { createDevCardDeck } from '@/lib/hex-utils';

describe('Development Cards', () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = createInitialState(2); // 3 player game
    initialState.phase = 'main'; // Set phase to main for dev card actions
    
    // Give Player 0 enough resources to buy a few Development Cards
    initialState.players[0].resources = { wood: 0, brick: 0, wheat: 3, sheep: 3, ore: 3 };
    
    // Ensure the player starts with empty dev card arrays so we can test cleanly
    initialState.players[0].devCards = {
      playable: [],
      boughtThisTurn: [],
      played: []
    };
    initialState.players[0].victoryPoints = 2; // Baseline VP
  });

  describe('Buying Development Cards', () => {
    it('should successfully buy a development card and deduct resources', () => {
      // Force the top card of the deck to be a knight
      initialState.devCardDeck = ['yearOfPlenty', 'knight']; 
      
      const newState = catanReducer(initialState, {
        type: 'BUY_DEV_CARD',
        payload: { playerId: 0 }
      });

      // Check resources (Cost: 1 Sheep, 1 Wheat, 1 Ore)
      expect(newState.players[0].resources.sheep).toBe(2);
      expect(newState.players[0].resources.wheat).toBe(2);
      expect(newState.players[0].resources.ore).toBe(2);

      // Check Deck
      expect(newState.devCardDeck).toHaveLength(1);
      expect(newState.devCardDeck).toEqual(['yearOfPlenty']);

      // Check Player Hand
      expect(newState.players[0].devCards.boughtThisTurn).toContain('knight');
      expect(newState.players[0].devCards.playable).toHaveLength(0); // Cards bought this turn aren't immediately playable
    });

    it('should immediately award a Victory Point if a VP card is drawn', () => {
      initialState.devCardDeck = ['victoryPoint']; 
      
      const newState = catanReducer(initialState, {
        type: 'BUY_DEV_CARD',
        payload: { playerId: 0 }
      });

      expect(newState.players[0].devCards.boughtThisTurn).toContain('victoryPoint');
      expect(newState.players[0].victoryPoints).toBe(3); // 2 + 1
    });

    it('should fail if the player does not have enough resources', () => {
      // Empty player resources
      initialState.players[0].resources = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };
      initialState.devCardDeck = ['knight'];

      const newState = catanReducer(initialState, {
        type: 'BUY_DEV_CARD',
        payload: { playerId: 0 }
      });

      expect(newState.players[0].devCards.boughtThisTurn).toHaveLength(0);
      expect(newState.gameLog[0]).toContain("Not enough resources");
    });

    it('should fail if it is not the player\'s turn', () => {
      initialState.devCardDeck = ['knight'];

      const newState = catanReducer(initialState, {
        type: 'BUY_DEV_CARD',
        payload: { playerId: 1 } // Player 2 tries to buy on Player 1's turn
      });

      expect(newState.players[1].devCards.boughtThisTurn).toHaveLength(0);
      expect(newState.gameLog[0]).toContain("It's not your turn!");
    });

    it('should fail if the deck is empty', () => {
      initialState.devCardDeck = [];

      const newState = catanReducer(initialState, {
        type: 'BUY_DEV_CARD',
        payload: { playerId: 0 }
      });

      expect(newState.players[0].resources.sheep).toBe(3); // Resources not deducted
      expect(newState.gameLog[0]).toContain("The Development Card deck is empty!");
    });
  });

  describe('Playing Development Cards', () => {
    beforeEach(() => {
      // Seed the player with some playable cards
      initialState.players[0].devCards.playable = ['knight', 'yearOfPlenty'];
      initialState.hasPlayedDevCardThisTurn = false;
    });

    it('should successfully play a card and move it to the played array', () => {
      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'knight' }
      });

      expect(newState.players[0].devCards.playable).not.toContain('knight');
      expect(newState.players[0].devCards.playable).toContain('yearOfPlenty');
      expect(newState.players[0].devCards.played).toContain('knight');
      expect(newState.hasPlayedDevCardThisTurn).toBe(true);
    });

    it('should update specific card stats (e.g., knightsPlayed) when played', () => {
      initialState.players[0].knightsPlayed = 0;

      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'knight' }
      });

      expect(newState.players[0].knightsPlayed).toBe(1);
    });

    it('should fail if the player tries to play a card they do not have in their playable hand', () => {
      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'monopoly' } // Player doesn't have this
      });

      expect(newState.players[0].devCards.played).not.toContain('monopoly');
      expect(newState.gameLog[0]).toContain("You don't have that card available");
    });

    it('should fail if the player tries to play a card they just bought this turn', () => {
      // Move 'knight' to boughtThisTurn instead of playable
      initialState.players[0].devCards.playable = [];
      initialState.players[0].devCards.boughtThisTurn = ['knight'];

      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'knight' }
      });

      expect(newState.players[0].devCards.played).toHaveLength(0);
      expect(newState.gameLog[0]).toContain("You don't have that card available"); // It's not in the playable array yet
    });

    it('should fail if the player tries to play more than one card per turn', () => {
      initialState.hasPlayedDevCardThisTurn = true;

      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'knight' }
      });

      expect(newState.players[0].devCards.played).toHaveLength(0);
      expect(newState.gameLog[0]).toContain("You can only play one Development Card per turn!");
    });

    it('should not mutate the resources object of the pre-action state when playing Year of Plenty', () => {
      const preActionResources = initialState.players[0].resources;
      const preActionResourcesSnapshot = { ...preActionResources };

      catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'yearOfPlenty', cardArgs: { resource1: 'wood', resource2: 'brick' } }
      });

      expect(initialState.players[0].resources).toEqual(preActionResourcesSnapshot);
      expect(preActionResources).toEqual(preActionResourcesSnapshot);
    });

    it('should award +2 of a resource when Year of Plenty is played with the same resource twice', () => {
      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'yearOfPlenty', cardArgs: { resource1: 'wood', resource2: 'wood' } }
      });

      expect(newState.players[0].resources.wood).toBe(initialState.players[0].resources.wood + 2);
    });

    it('should not mutate the card player\'s resources object of the pre-action state when playing Monopoly', () => {
      initialState.players[0].devCards.playable.push('monopoly');
      initialState.players[1].resources.wheat = 3;
      const preActionResources = initialState.players[0].resources;
      const preActionResourcesSnapshot = { ...preActionResources };

      const newState = catanReducer(initialState, {
        type: 'PLAY_DEV_CARD',
        payload: { playerId: 0, cardType: 'monopoly', cardArgs: { monopolyResource: 'wheat' } }
      });

      expect(initialState.players[0].resources).toEqual(preActionResourcesSnapshot);
      expect(preActionResources).toEqual(preActionResourcesSnapshot);
      expect(newState.players[0].resources.wheat).toBe(preActionResourcesSnapshot.wheat + 3);
    });
  });

  describe('Turn Transitions (END_TURN)', () => {
    it('should make cards bought this turn playable on the next turn and reset the play limit', () => {
      initialState.players[0].devCards.playable = ['yearOfPlenty'];
      initialState.players[0].devCards.boughtThisTurn = ['knight'];
      initialState.hasPlayedDevCardThisTurn = true;

      const newState = catanReducer(initialState, { type: 'END_TURN' });

      // Bought cards should migrate to playable
      expect(newState.players[0].devCards.boughtThisTurn).toHaveLength(0);
      expect(newState.players[0].devCards.playable).toHaveLength(2);
      expect(newState.players[0].devCards.playable).toContain('knight');
      expect(newState.players[0].devCards.playable).toContain('yearOfPlenty');

      // Card limit should reset
      expect(newState.hasPlayedDevCardThisTurn).toBe(false);
      
      // Turn should pass
      expect(newState.currentPlayerIndex).toBe(1);
    });
  });

describe('Development Card Deck Generation', () => {
  it('should always contain exactly 25 cards with the correct distribution', () => {
    const deck = createDevCardDeck();

    // Total count check
    expect(deck).toHaveLength(25);

    // Distribution check
    const counts = deck.reduce((acc, card) => {
      acc[card] = (acc[card] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(counts['knight']).toBe(14);
    expect(counts['victoryPoint']).toBe(5);
    expect(counts['roadBuilding']).toBe(2);
    expect(counts['yearOfPlenty']).toBe(2);
    expect(counts['monopoly']).toBe(2);
  });

  it('should produce different card orders across multiple shuffles', () => {
    const deckA = createDevCardDeck();
    const deckB = createDevCardDeck();
    const deckC = createDevCardDeck();

    // While it is mathematically possible for two shuffles to be identical,
    // with 25 cards the odds are 1 in 25! (septillion). 
    // Comparing strings is an easy way to check deep equality of order.
    const stringA = JSON.stringify(deckA);
    const stringB = JSON.stringify(deckB);
    const stringC = JSON.stringify(deckC);

    expect(stringA).not.toBe(stringB);
    expect(stringB).not.toBe(stringC);
    expect(stringA).not.toBe(stringC);
  });

  it('should not lose any cards after generating 100 test decks', () => {
    for (let i = 0; i < 100; i++) {
      const deck = createDevCardDeck();
      expect(deck.length).toBe(25);
      expect(deck.filter(c => c === 'knight').length).toBe(14);
    }
  });
});
});