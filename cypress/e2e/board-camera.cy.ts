/**
 * The tabletop camera (issue #55).
 *
 * Two things are being guarded here. The first is that the camera behaves like a
 * tabletop: dragging moves the board, the wheel zooms, right-drag turns it, everything is
 * bounded, and the board can always be recovered.
 *
 * The second matters more. Camera state is presentation state, and this asserts it stays
 * that way — moving the camera must not touch the game. The event log is the visible
 * proxy for "the server was told something": every action a player takes writes to it, so
 * a log that has not moved after a pan, a zoom and an orbit means no action was sent.
 */

interface Pose {
  tx: number;
  ty: number;
  scale: number;
  pitch: number;
  yaw: number;
}

const number = (source: string, pattern: RegExp) => {
  const match = source.match(pattern);
  return match ? Number(match[1]) : NaN;
};

/** The camera writes its transform straight onto the world element; read it back. */
const pose = (): Cypress.Chainable<Pose> =>
  cy.get('[data-cy=tabletop-scene] > div').then($world => {
    const t = $world.attr('style') ?? '';
    return {
      tx: number(t, /translate3d\((-?[\d.]+)px/),
      ty: number(t, /translate3d\([-\d.]+px,\s*(-?[\d.]+)px/),
      scale: number(t, /scale\((-?[\d.]+)\)/),
      pitch: number(t, /rotateX\((-?[\d.]+)deg\)/),
      yaw: number(t, /rotateZ\((-?[\d.]+)deg\)/),
    };
  });

const scene = () => cy.get('[data-cy=tabletop-scene]');

const drag = (
  from: [number, number],
  to: [number, number],
  options: { button?: number } = {}
) => {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const button = options.button ?? 0;

  scene()
    .trigger('pointerdown', { pointerId: 1, button, clientX: x1, clientY: y1 })
    // Two moves: the camera treats the first few pixels as slop before it decides a
    // drag has begun, exactly as a real pointer would deliver them.
    .trigger('pointermove', {
      pointerId: 1,
      clientX: x1 + (x2 - x1) / 2,
      clientY: y1 + (y2 - y1) / 2,
    })
    .trigger('pointermove', { pointerId: 1, clientX: x2, clientY: y2 })
    .trigger('pointerup', { pointerId: 1 });
};

/** The camera eases towards its target; give it time to arrive before reading it. */
const settled = () => cy.wait(500);

describe('Tabletop camera', () => {
  afterEach(() => cy.task('disposeBots'));

  beforeEach(() => {
    cy.createGameAsHost('Alice', 'blue').then(gameId => {
      cy.addBot('bob', gameId, 'Bob', 'red', 2);
      cy.get('[data-cy=start-game-btn]').should('be.enabled').click();
    });
    cy.get('[data-cy=game-board]').should('be.visible');
    settled();
  });

  it('starts at an elevated tabletop angle, not top-down or edge-on', () => {
    pose().then(start => {
      // 90 - pitch is the camera's elevation above the table.
      const elevation = 90 - start.pitch;
      expect(elevation, 'starting elevation').to.be.within(40, 55);
      expect(start.yaw, 'starts square to the player').to.equal(0);
      expect(start.scale, 'board is scaled to fit its region').to.be.greaterThan(0);
    });
  });

  it('pans with the pointer and recentres on demand', () => {
    pose().then(start => {
      drag([620, 300], [760, 380]);
      settled();

      pose().then(moved => {
        expect(moved.tx, 'board followed the pointer right').to.be.greaterThan(start.tx);
        expect(moved.ty, 'board followed the pointer down').to.be.greaterThan(start.ty);
      });

      cy.get('[data-cy=camera-reset-btn]').click();
      settled();

      pose().then(reset => {
        expect(reset.tx).to.be.closeTo(start.tx, 1);
        expect(reset.ty).to.be.closeTo(start.ty, 1);
      });
    });
  });

  it('recovers the whole pose, not just the pan', () => {
    pose().then(start => {
      drag([620, 300], [800, 400]);
      scene().trigger('wheel', { deltaY: -700, clientX: 620, clientY: 300 });
      drag([620, 300], [760, 360], { button: 2 });
      settled();

      pose().then(moved => {
        expect(moved.scale, 'zoom moved').to.not.be.closeTo(start.scale, 0.01);
        expect(moved.yaw, 'orbit moved').to.not.equal(start.yaw);
      });

      cy.get('[data-cy=camera-reset-btn]').click();
      settled();
      settled();

      pose().then(reset => {
        expect(reset.scale, 'zoom restored').to.be.closeTo(start.scale, 0.01);
        expect(reset.yaw, 'orbit restored').to.be.closeTo(start.yaw, 0.5);
        expect(reset.pitch, 'elevation restored').to.be.closeTo(start.pitch, 0.5);
        expect(reset.tx).to.be.closeTo(start.tx, 1);
        expect(reset.ty).to.be.closeTo(start.ty, 1);
      });
    });
  });

  it('keeps the board recoverable however far it is dragged', () => {
    // Ten hard drags in the same direction, well past any sane pan.
    for (let i = 0; i < 10; i++) drag([400, 200], [1200, 700]);
    settled();

    // Still on screen, and still overlapping the middle of its own region.
    cy.get('[data-cy=game-board]').then($svg => {
      const board = $svg[0].getBoundingClientRect();
      cy.get('[data-cy=tabletop-scene]').then($scene => {
        const region = $scene[0].getBoundingClientRect();
        expect(board.right, 'board is still on screen').to.be.greaterThan(region.left);
        expect(board.left).to.be.lessThan(region.right);
        expect(board.bottom).to.be.greaterThan(region.top);
        expect(board.top).to.be.lessThan(region.bottom);
      });
    });
  });

  it('zooms with the wheel, within limits', () => {
    pose().then(start => {
      scene().trigger('wheel', { deltaY: -600, clientX: 620, clientY: 300 });
      settled();
      pose().then(closer => {
        expect(closer.scale, 'wheel up zooms in').to.be.greaterThan(start.scale);
      });

      // Far past the stop in both directions; the scale has to stay bounded.
      for (let i = 0; i < 15; i++) {
        scene().trigger('wheel', { deltaY: -600, clientX: 620, clientY: 300 });
      }
      settled();
      pose().then(maxed => {
        expect(maxed.scale / start.scale, 'clamped at maximum zoom').to.be.lessThan(2.6);

        for (let i = 0; i < 40; i++) {
          scene().trigger('wheel', { deltaY: 600, clientX: 620, clientY: 300 });
        }
        settled();
        pose().then(minned => {
          expect(minned.scale / start.scale, 'clamped at minimum zoom').to.be.greaterThan(0.5);
        });
      });
    });
  });

  it('orbits on a right-drag and never reaches top-down or edge-on', () => {
    drag([620, 300], [760, 340], { button: 2 });
    settled();

    pose().then(turned => {
      expect(turned.yaw, 'board turned horizontally').to.not.equal(0);
    });

    // Push the orbit as hard as possible in both directions and check the stops hold.
    for (let i = 0; i < 8; i++) drag([400, 200], [1200, 700], { button: 2 });
    settled();
    pose().then(low => {
      expect(Math.abs(low.yaw), 'horizontal orbit is bounded').to.be.at.most(32);
      expect(90 - low.pitch, 'never edge-on').to.be.at.least(30);
    });

    for (let i = 0; i < 8; i++) drag([1200, 700], [400, 200], { button: 2 });
    settled();
    pose().then(high => {
      expect(Math.abs(high.yaw), 'horizontal orbit is bounded').to.be.at.most(32);
      expect(90 - high.pitch, 'never straight down').to.be.at.most(70);
    });
  });

  it('sends nothing to the server and places nothing while the camera moves', () => {
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');

    cy.get('[data-cy=game-board] [data-cy=node]').then($nodes => {
      const before = $nodes.filter('[data-owner-id]').length;

      cy.get('.custom-scrollbar > div').then($log => {
        const logBefore = $log.length;

        // A drag that starts on a legal settlement spot: the board is armed, so this is
        // the case where a pan could plausibly be mistaken for a placement.
        cy.get('[data-cy=node][data-legal-target=true]')
          .first()
          .then($node => {
            const box = $node[0].getBoundingClientRect();
            const x = box.left + box.width / 2;
            const y = box.top + box.height / 2;
            drag([x, y], [x + 160, y + 90]);
          });

        scene().trigger('wheel', { deltaY: -400, clientX: 620, clientY: 300 });
        drag([620, 300], [700, 330], { button: 2 });
        settled();

        cy.get('[data-cy=node][data-owner-id]').should('have.length', before);
        cy.get('.custom-scrollbar > div').should('have.length', logBefore);
      });
    });
  });

  it('still places a settlement on a plain click', () => {
    cy.get('[data-cy=turn-indicator]').should('contain.text', 'Your Turn');
    cy.get('[data-cy=node][data-legal-target=true]').first().click({ force: true });
    cy.get('[data-cy=node][data-owner-id="0"]').should('have.length', 1);
  });
});
