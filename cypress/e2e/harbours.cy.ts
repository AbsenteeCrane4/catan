/**
 * Guards the harbour rendering fix: each port's piers must terminate at the two nodes
 * that port actually trades from. The original layer drew a single stub from the edge
 * midpoint, so there was no visual link to either tradeable corner.
 */

interface Pt {
  x: number;
  y: number;
}

const key = (p: Pt) => `${Math.round(p.x)},${Math.round(p.y)}`;

/** Every node position on the board, keyed for lookup. */
function nodePositions(): Cypress.Chainable<Set<string>> {
  return cy.get('[data-cy=node]').then($nodes =>
    new Set(
      Cypress._.map($nodes.toArray(), el =>
        key({ x: Number(el.getAttribute('data-x')), y: Number(el.getAttribute('data-y')) })
      )
    )
  );
}

function assertHarboursAnchoredToNodes(expectedHarbours: number) {
  cy.get('[data-cy=harbour]').should('have.length', expectedHarbours);

  nodePositions().then(nodes => {
    cy.get('[data-cy=harbour]').each($harbour => {
      const lines = Array.from($harbour[0].querySelectorAll('line'));
      expect(lines, 'harbour draws piers').to.have.length.greaterThan(0);

      // The shore end of every pier stroke. Each pier is drawn as several stacked
      // strokes, so dedupe before counting.
      const shoreEnds = new Set(
        lines.map(l => key({ x: Number(l.getAttribute('x1')), y: Number(l.getAttribute('y1')) }))
      );

      // Exactly two piers, one per tradeable node...
      expect(shoreEnds.size, 'distinct pier anchors').to.equal(2);
      // ...and both land on a real node, not on a hex centre or an edge midpoint.
      shoreEnds.forEach(end => {
        // .to.equal(true) rather than .to.be.true — the latter is a property access,
        // which trips @typescript-eslint/no-unused-expressions.
        expect(nodes.has(end), `pier anchor ${end} is a board node`).to.equal(true);
      });

      // Both piers converge on the emblem, so the far ends coincide.
      const seaEnds = new Set(
        lines.map(l => key({ x: Number(l.getAttribute('x2')), y: Number(l.getAttribute('y2')) }))
      );
      expect(seaEnds.size, 'piers meet at the emblem').to.equal(1);
    });
  });
}

describe('Harbour rendering', () => {
  afterEach(() => cy.task('disposeBots'));

  it('anchors every base-board port to its two tradeable nodes', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
      cy.get('[data-cy=game-board]').should('be.visible');

      assertHarboursAnchoredToNodes(9);
    });
  });

  it('anchors every expansion-board port to its two tradeable nodes', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      [
        { id: 'bob', name: 'Bob', color: 'red' },
        { id: 'carol', name: 'Carol', color: 'white' },
        { id: 'dave', name: 'Dave', color: 'orange' },
        { id: 'erin', name: 'Erin', color: 'green' },
        { id: 'frank', name: 'Frank', color: 'brown' },
      ].forEach((b, i) => cy.addBot(b.id, gameId, b.name, b.color, i + 2));
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
      cy.get('[data-cy=game-board]').should('be.visible');

      assertHarboursAnchoredToNodes(11);
    });
  });

  it('shows the trade ratio and the two 2:1 sheep ports on the expansion board', () => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      [
        { id: 'bob', name: 'Bob', color: 'red' },
        { id: 'carol', name: 'Carol', color: 'white' },
        { id: 'dave', name: 'Dave', color: 'orange' },
        { id: 'erin', name: 'Erin', color: 'green' },
        { id: 'frank', name: 'Frank', color: 'brown' },
      ].forEach((b, i) => cy.addBot(b.id, gameId, b.name, b.color, i + 2));
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();

      // 5 generic + 6 resource-specific, and the extension's second wool port is
      // the reason the specific count exceeds the five resource types.
      cy.get('[data-cy=harbour][data-harbour-type="3:1"]').should('have.length', 5);
      cy.get('[data-cy=harbour][data-harbour-type="sheep"]').should('have.length', 2);

      cy.get('[data-cy=harbour][data-harbour-type="3:1"]').first().should('contain.text', '3:1');
      cy.get('[data-cy=harbour][data-harbour-type="sheep"]').first().should('contain.text', '2:1');
    });
  });
});
