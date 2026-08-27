/// <reference types="cypress" />

interface NodeInfo {
  id: string;
  x: number;
  y: number;
  owned: boolean;
}

/**
 * Creates a fresh game, claims the first seat, and yields the game id.
 *
 * The wait for the seat to appear in the DOM is load-bearing, not cosmetic: bots are
 * spawned from the Node task runner, which does not wait on the browser's socket
 * round-trip. Without confirming this seat first, a bot's `lobby:sit` can reach the
 * server before the browser's, making the *bot* the host — and the host is the only
 * client that renders a Start button.
 */
function createGameAsHost(name: string, color: string): Cypress.Chainable<string> {
  cy.visit('/');
  cy.get('[data-cy=create-game-btn]').click();
  cy.url().should('match', /\/game\/[A-Z0-9]{6}$/);

  cy.get('[data-cy=player-name-input]').clear().type(name);
  cy.get(`[data-cy=color-swatch-${color}]`).click();
  cy.get('[data-cy=submit-seat-btn]').click();

  // Seat 0 + host confirmed before any bot is allowed to race us for it.
  cy.get('[data-cy=seat-item][data-seat-index=0]').should('contain.text', name);

  return cy.url().then(url => url.split('/').pop() as string);
}

/** Seats a bot and waits for the browser to render the resulting seat. */
function addBot(id: string, gameId: string, name: string, color: string, expectedSeats: number) {
  cy.task('botSpawn', { id, gameId, name, color });
  cy.get('[data-cy=seat-item]').should('have.length', expectedSeats);
  cy.contains('[data-cy=seat-item]', name).should('exist');
}

function readNodes(): Cypress.Chainable<NodeInfo[]> {
  return cy.get('[data-cy=node]').then($nodes =>
    Cypress._.map($nodes.toArray(), el => ({
      id: el.getAttribute('data-node-id')!,
      x: Number(el.getAttribute('data-x')),
      y: Number(el.getAttribute('data-y')),
      owned: el.hasAttribute('data-owner-id'),
    }))
  );
}

/** Mirrors the distance-based adjacency rule in src/lib/game/helpers/board.ts. */
function pickLegalEmptyNode(nodes: NodeInfo[]): string {
  const owned = nodes.filter(n => n.owned);
  const candidate = nodes.find(n => {
    if (n.owned) return false;
    const nearest = nodes
      .filter(o => o.id !== n.id)
      .map(o => Math.hypot(o.x - n.x, o.y - n.y))
      .sort((a, b) => a - b)[0];
    const threshold = (nearest ?? 0) + 2;
    return !owned.some(o => Math.hypot(o.x - n.x, o.y - n.y) <= threshold);
  });
  if (!candidate) throw new Error('No legal empty settlement spot left in the DOM');
  return candidate.id;
}

/**
 * Places a settlement at a legal empty node then a road touching it, as the human
 * browser's seat. SVG elements need `force: true` — jQuery's visibility heuristics
 * do not understand SVG geometry and consider these `<g>` wrappers hidden.
 */
function placeSettlementAndRoad(playerId: number) {
  readNodes().then(nodes => {
    const nodeId = pickLegalEmptyNode(nodes);

    cy.get(`[data-cy=node][data-node-id="${nodeId}"]`).click({ force: true });
    cy.get(`[data-cy=node][data-node-id="${nodeId}"]`).should(
      'have.attr',
      'data-owner-id',
      String(playerId)
    );

    cy.get(`[data-cy=edge][data-node-1="${nodeId}"], [data-cy=edge][data-node-2="${nodeId}"]`)
      .not('[data-owner-id]')
      .first()
      .click({ force: true });
  });
}

Cypress.Commands.add('createGameAsHost', createGameAsHost);
Cypress.Commands.add('addBot', addBot);
Cypress.Commands.add('placeSettlementAndRoad', placeSettlementAndRoad);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      createGameAsHost(name: string, color: string): Chainable<string>;
      addBot(id: string, gameId: string, name: string, color: string, expectedSeats: number): void;
      placeSettlementAndRoad(playerId: number): void;
    }
  }
}

export {};
