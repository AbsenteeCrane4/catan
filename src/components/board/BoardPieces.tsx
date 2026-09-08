'use client';

import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { GameNode, Hex, PlayerColor, Road, Settlement } from '@/types/catan';
import { BoardView } from '@/lib/board/geometry';
import { hexToPixel } from '@/lib/hex-utils';
import { Billboard, WorldLayer } from './Tabletop';
import { RoadBodies } from './RoadLayer';
import { SettlementIcon } from '@/components/ui/SettlementIcon';
import { CityIcon } from '@/components/ui/CityIcon';
import { RobberIcon } from '@/components/ui/Robber';

/**
 * The parts of the board that stand up out of it in the DOM.
 *
 * There are two, and they exist for different reasons.
 *
 * `NumberTokens` is permanent, and drawn flat on the board plane — same tilt as the
 * terrain, no billboarding back to the camera.
 *
 * `FallbackPieces` is insurance. The game pieces are three.js meshes on a canvas over the
 * board; these flat stand-ins are drawn instead when the browser cannot open a WebGL
 * context, so a machine without one still gets a playable board rather than an empty one.
 *
 * Neither takes pointer events. Click targets stay on the board plane in `SettlementNode`
 * and `HexTile`, so nothing here can intercept a click meant for the spot underneath.
 */

export function NumberTokens({ view, hexes }: { view: BoardView; hexes: Hex[] }) {
  return (
    <WorldLayer z={3}>
      {hexes.map(hex => {
        if (hex.resource === 'desert' || hex.numberToken === null) return null;
        const { x, y } = hexToPixel(hex.q, hex.r);
        return (
          <div
            key={hex.id}
            className="absolute h-0 w-0"
            style={{ left: x - view.minX, top: y - view.minY }}
            data-cy="number-token"
          >
            <NumberToken token={hex.numberToken} />
          </div>
        );
      })}
    </WorldLayer>
  );
}

interface FallbackPiecesProps {
  view: BoardView;
  hexes: Hex[];
  nodes: GameNode[];
  settlements: Record<string, Settlement>;
  roads: Record<string, Road>;
  playerColors: Record<number, PlayerColor>;
  robberHexId: string;
}

export function FallbackPieces({
  view,
  hexes,
  nodes,
  settlements,
  roads,
  playerColors,
  robberHexId,
}: FallbackPiecesProps) {
  const robberHex = hexes.find(h => h.id === robberHexId);
  const robberPos = robberHex ? hexToPixel(robberHex.q, robberHex.r) : null;
  const box = `${view.minX} ${view.minY} ${view.w} ${view.h}`;

  return (
    <>
      <WorldLayer z={1}>
        <svg viewBox={box} className="h-full w-full overflow-visible" aria-hidden>
          <RoadBodies nodes={nodes} roads={roads} playerColors={playerColors} shade="base" width={10} />
        </svg>
      </WorldLayer>

      {nodes.map(node => {
        const settlement = settlements[node.id];
        if (!settlement) return null;

        return (
          <Billboard
            key={node.id}
            view={view}
            x={node.pixelPos.x}
            y={node.pixelPos.y}
            z={4}
            data-cy="board-piece"
            data-piece={settlement.isCity ? 'city' : 'settlement'}
          >
            <PieceSprite
              kind={settlement.isCity ? 'city' : 'settlement'}
              color={playerColors[settlement.playerId] ?? 'white'}
              className="animate-piece-drop"
            />
          </Billboard>
        );
      })}

      {robberPos && (
        <Billboard view={view} x={robberPos.x} y={robberPos.y} z={5} data-cy="robber">
          <Sprite w={42} h={50} ox={21} oy={46}>
            <g transform="scale(1.4) translate(0, -12)">
              <RobberIcon />
            </g>
          </Sprite>
        </Billboard>
      )}
    </>
  );
}

/**
 * How large a piece is drawn relative to the icon's own coordinates.
 *
 * The build panel shows the same shapes at UI size; on the board they have to hold their
 * own against a 100-unit hex, so they are drawn well over the icon's natural size.
 */
const PIECE_ART = {
  settlement: { scale: 1.7, baseY: 7.5, w: 30, up: 22, down: 3 },
  city: { scale: 1.7, baseY: 8, w: 32, up: 24, down: 3 },
} as const;

function PieceSprite({
  kind,
  color,
  className,
}: {
  kind: 'settlement' | 'city';
  color: PlayerColor | string;
  className?: string;
}) {
  const art = PIECE_ART[kind];
  const w = art.w * art.scale;
  const up = art.up * art.scale;
  const down = art.down * art.scale;

  return (
    <Sprite w={w * 2} h={up + down} ox={w} oy={up} className={className}>
      {/* Scale first, then lift by the icon's own base line, so the piece's feet land
          exactly on the billboard anchor whatever the scale. */}
      <g transform={`scale(${art.scale}) translate(0, ${-art.baseY})`}>
        {kind === 'city' ? <CityIcon color={color} /> : <SettlementIcon color={color} />}
      </g>
    </Sprite>
  );
}

/**
 * An SVG whose local origin sits exactly on the billboard's anchor, so a piece drawn
 * with its base on y = 0 stands on the board rather than floating over it.
 */
function Sprite({
  w,
  h,
  ox,
  oy,
  className,
  children,
}: {
  w: number;
  h: number;
  ox: number;
  oy: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width={w}
      height={h}
      viewBox={`${-ox} ${-oy} ${w} ${h}`}
      className={clsx(
        'absolute overflow-visible drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)]',
        className
      )}
      style={{ left: -ox, top: -oy }}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/**
 * A number token: light disc, dark numeral, red for the two numbers that decide games.
 * The pip row repeats the probability so the emphasis is not carried by colour alone.
 */
function NumberToken({ token }: { token: number }) {
  const isRed = token === 6 || token === 8;
  const pips = 6 - Math.abs(7 - token);

  return (
    <Sprite w={38} h={38} ox={19} oy={19}>
      <circle r="16" fill="#f6ecd6" />
      <circle r="16" fill="none" stroke="#c3ab84" strokeWidth="2" />
      <circle r="13" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.65" />
      {isRed && <circle r="16" fill="none" stroke="#b91c1c" strokeWidth="2.4" opacity="0.55" />}

      <text
        y="-1"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={isRed ? 17 : 15}
        fontWeight="900"
        fill={isRed ? '#b3211b' : '#33291b'}
        className="select-none font-sans"
      >
        {token}
      </text>

      <g fill={isRed ? '#b3211b' : '#6b5a3f'}>
        {Array.from({ length: pips }, (_, i) => (
          <circle key={i} cx={(i - (pips - 1) / 2) * 3.2} cy="9" r="1.15" />
        ))}
      </g>
    </Sprite>
  );
}
