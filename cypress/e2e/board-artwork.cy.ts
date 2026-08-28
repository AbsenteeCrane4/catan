/**
 * Guards the illustrated tile art / sea background added on top of the plain SVG board:
 * the images must actually be wired in, and a failed image load must fall back to the
 * original flat-colour rendering rather than leaving a broken image or blank tile.
 */

const RESOURCE_IMAGE: Record<string, string> = {
  wood: '/images/tiles/wood.png',
  brick: '/images/tiles/brick.png',
  sheep: '/images/tiles/sheep.png',
  wheat: '/images/tiles/wheat.png',
  ore: '/images/tiles/ore.png',
  desert: '/images/tiles/desert.png',
};

function startTwoPlayerGame() {
  return cy.createGameAsHost('Alice', 'blue').then(gameId => {
    cy.addBot('bob', gameId, 'Bob', 'red', 2);
    cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
    cy.get('[data-cy=game-board]').should('be.visible');
    return cy.wrap(gameId);
  });
}

describe('Board artwork', () => {
  afterEach(() => cy.task('disposeBots'));

  it('renders every hex with its matching tile image and shows the sea background', () => {
    startTwoPlayerGame();

    // Base board: 19 hexes, all resolving to real tile art.
    cy.get('[data-cy=hex]').should('have.length', 19);
    cy.get('[data-cy=hex]').each($hex => {
      const resource = $hex.attr('data-resource') as string;
      const image = $hex.find('[data-cy=hex-image]');
      expect(image, `${resource} hex renders an image`).to.have.length(1);
      expect(image.attr('data-image-src')).to.equal(RESOURCE_IMAGE[resource]);
      expect($hex.attr('data-image-failed'), 'no fallback flag by default').to.be.undefined;
    });
    cy.get('[data-cy=hex-fallback-fill]').should('not.exist');

    cy.get('[data-cy=board-background-image]')
      .should('be.visible')
      .and('have.attr', 'data-image-src', '/images/sea.png');
    cy.get('[data-cy=board-background-fallback]').should('exist');
  });

  it('falls back to flat resource colours when tile images fail to load', () => {
    cy.intercept('GET', '**/images/tiles/*.png', { forceNetworkError: true }).as('tileImage');

    startTwoPlayerGame();

    // Every hex flips its fallback flag once its (deliberately broken) image errors —
    // retried via `.should` rather than a fixed `cy.wait` count, since 19 requests fail
    // and re-render independently.
    cy.get('[data-cy=hex][data-image-failed]', { timeout: 15000 }).should('have.length', 19);
    cy.get('[data-cy=hex]').each($hex => {
      expect($hex.attr('data-image-failed'), 'fallback flag set').to.equal('true');
      const fallback = $hex.find('[data-cy=hex-fallback-fill]');
      expect(fallback, 'renders the flat-colour fallback polygon').to.have.length(1);
      expect(fallback.attr('fill'), 'fallback fill is a real colour, not empty').to.match(/^#/);
      expect($hex.find('[data-cy=hex-image]'), 'broken image element is removed').to.have.length(0);
    });
  });

  it('falls back to a colour backdrop when the sea background image fails to load', () => {
    cy.intercept('GET', '**/images/sea.png', { forceNetworkError: true }).as('seaImage');

    startTwoPlayerGame();
    cy.wait('@seaImage', { timeout: 15000 });

    cy.get('[data-cy=board-background-image]').should('not.exist');
    cy.get('[data-cy=board-background-fallback]').should('be.visible');
  });
});
