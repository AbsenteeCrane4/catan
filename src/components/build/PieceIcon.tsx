import type { PlayerColor } from "@/types/catan";
import type { BuildKind } from "@/lib/game/helpers/buildLegality";
import { SettlementIcon } from "@/components/ui/SettlementIcon";
import { CityIcon } from "@/components/ui/CityIcon";
import { CardBack } from "@/components/hand/CardBack";

interface PieceIconProps {
  kind: BuildKind;
  /** The owning player's colour, so a panel piece matches the piece it will place. */
  color: PlayerColor;
  className?: string;
}

/**
 * The piece a build action produces, drawn at panel size.
 *
 * Deliberately the same `SettlementIcon` / `CityIcon` the board draws rather than a
 * lookalike, so the shape in the panel is literally the shape that lands on the board.
 */
export function PieceIcon({ kind, color, className = "h-7 w-7" }: PieceIconProps) {
  if (kind === 'devCard') return <CardBack className={`${className} rounded`} />;

  if (kind === 'road') {
    return (
      <svg viewBox="-14 -14 28 28" className={className} aria-hidden>
        <line
          x1={-10}
          y1={7}
          x2={10}
          y2={-7}
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          className="drop-shadow-md"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="-14 -13 28 24" className={className} aria-hidden>
      {kind === 'city' ? <CityIcon color={color} /> : <SettlementIcon color={color} />}
    </svg>
  );
}
