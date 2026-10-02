'use client';

import { Fragment, useMemo, useState } from "react";
import { clsx } from "clsx";
import { BookOpen, Check, ChevronUp, X } from "lucide-react";
import type { GameStateView, ResourceType } from "@/types/catan";
import {
  BUILD_KINDS,
  buildAvailability,
  buildStateFromView,
  isPlaceable,
  type BuildAvailability,
  type BuildBlocker,
  type BuildKind,
} from "@/lib/game/helpers/buildLegality";
import { pieceShades } from "@/lib/constants";
import { ResourceChip } from "@/components/hud/primitives";
import { IsoPiece } from "./IsoPiece";

interface BuildPanelProps {
  state: GameStateView;
  /** The build mode currently armed, so the panel can show which item is selected. */
  activeKind: BuildKind | null;
  onSelect: (kind: BuildKind) => void;
}

const LABELS: Record<BuildKind, string> = {
  road: 'Road',
  settlement: 'Settlement',
  city: 'City',
  devCard: 'Development Card',
};

/** What the player is told when an item is unavailable. Cost shortfalls are drawn as chips. */
const describeBlocker = (blocker: BuildBlocker, kind: BuildKind): string => {
  switch (blocker.reason) {
    case 'not-your-turn':
      return 'Not your turn';
    case 'dice-not-rolled':
      return 'Roll the dice first';
    case 'setup-requires':
      return blocker.action === 'road' ? 'Place your road first' : 'Place your settlement first';
    case 'wrong-phase':
      return 'Not during setup';
    case 'insufficient-resources':
      return 'Missing';
    case 'no-pieces-remaining':
      return 'None left in your supply';
    case 'no-legal-placement':
      return kind === 'road' ? 'No connected space' : 'Nowhere legal to place';
    case 'dev-deck-empty':
      return 'The deck is empty';
  }
};

/** One chip per unit, so "3 ore" reads as three cards rather than a badge. */
const units = (amounts: Partial<Record<ResourceType, number>>): ResourceType[] =>
  (Object.entries(amounts) as [ResourceType, number][]).flatMap(([r, n]) => Array<ResourceType>(n).fill(r));

/**
 * What the player can build, what it costs, and why not.
 *
 * Every judgement here comes from `buildLegality` — the same selectors the board
 * highlights with and the reducer validates with — so an item the panel offers is one the
 * reducer will accept, and there is no second copy of the rules to drift.
 */
export function BuildPanel({ state, activeKind, onSelect }: BuildPanelProps) {
  const seat = state.viewerSeatIndex;
  const [open, setOpen] = useState(true);

  const toggle = () => setOpen(o => !o);

  // A spectator holds no pieces and no hand, so there is nothing to offer them.
  const availability = useMemo(
    () => (seat === null ? null : buildAvailability(buildStateFromView(state), seat)),
    [state, seat]
  );

  if (seat === null || !availability) return null;

  const color = pieceShades(state.players[seat]?.color).base;

  return (
    <section data-cy="build-panel" className="hs-panel shrink-0 overflow-hidden">
      <button
        type="button"
        data-cy="build-panel-toggle"
        aria-expanded={open}
        onClick={toggle}
        className={clsx(
          "flex w-full cursor-pointer items-center gap-[11px] px-4 py-[14px] text-left",
          open && "border-b border-[rgba(110,160,220,0.16)]"
        )}
      >
        <BookOpen size={20} className="shrink-0 text-hs-accent" />
        <span className="flex-1 text-[14px] font-bold uppercase tracking-[0.13em] text-hs-text">Build &amp; Rules</span>
        <ChevronUp size={18} className={clsx("text-hs-mute transition-transform", !open && "rotate-180")} />
      </button>

      {/* Hidden rather than unmounted, so the build options stay in the DOM and keep their state. */}
      <ul hidden={!open} className="flex flex-col gap-2.5 p-3">
        {BUILD_KINDS.map(kind => (
          <BuildOption
            key={kind}
            availability={availability[kind]}
            color={color}
            active={activeKind === kind}
            onSelect={() => onSelect(kind)}
          />
        ))}
      </ul>
    </section>
  );
}

function DevCardIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
      <rect x={8} y={4} width={24} height={32} rx={3} fill="#122d4d" stroke="#4da3ff" strokeWidth={1.5} />
      <path d="M20 11 L22.4 17.6 L29 20 L22.4 22.4 L20 29 L17.6 22.4 L11 20 L17.6 17.6 Z" fill="#e3cfa2" />
    </svg>
  );
}

interface BuildOptionProps {
  availability: BuildAvailability;
  /** CSS colour of the viewer's pieces. */
  color: string;
  active: boolean;
  onSelect: () => void;
}

function BuildOption({ availability, color, active, onSelect }: BuildOptionProps) {
  const { kind, allowed, blocker, cost, missing, piecesRemaining } = availability;
  const shortOfResources = blocker?.reason === 'insufficient-resources';
  const costUnits = units(cost);

  return (
    <li>
      <button
        type="button"
        data-cy="build-option"
        data-kind={kind}
        data-allowed={allowed}
        data-active={active}
        data-blocker={blocker?.reason ?? ''}
        data-pieces-remaining={piecesRemaining ?? undefined}
        disabled={!allowed}
        onClick={onSelect}
        className={clsx(
          "flex w-full items-start gap-[13px] rounded-[10px] border p-[13px] text-left transition-colors",
          active
            ? "border-hs-accent bg-[rgba(45,86,140,0.55)] shadow-[0_0_0_1px_rgba(77,163,255,0.35),0_0_18px_rgba(77,163,255,0.25)]"
            : "border-[rgba(110,160,220,0.16)] bg-[rgba(20,40,68,0.5)]",
          allowed ? "cursor-pointer hover:border-[rgba(77,163,255,0.6)]" : "cursor-not-allowed"
        )}
      >
        <span
          className={clsx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[rgba(110,160,220,0.16)] bg-[rgba(8,18,34,0.7)]",
            !allowed && "opacity-60"
          )}
        >
          {kind === 'devCard' ? <DevCardIcon /> : <IsoPiece kind={kind} color={color} size={kind === 'city' ? 46 : 42} />}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
          <span className="flex items-baseline gap-2">
            <span className="flex-1 truncate text-[15px] font-semibold text-hs-text">{LABELS[kind]}</span>
            {/* Supply, per the printed game. Not a reducer rule — see canBuild. */}
            {isPlaceable(kind) && (
              <span
                data-cy="build-option-pieces"
                title="Pieces left in your supply"
                className={clsx(
                  "shrink-0 text-[11.5px] font-semibold tabular-nums",
                  piecesRemaining && piecesRemaining > 0 ? "text-hs-mute" : "text-hs-warn"
                )}
              >
                {piecesRemaining} left
              </span>
            )}
          </span>

          <span className="flex flex-wrap items-center gap-[5px]">
            {costUnits.map((resource, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="text-[12px] text-hs-mute">+</span>}
                <ResourceChip resource={resource} />
              </Fragment>
            ))}
          </span>

          <span
            data-cy="build-option-status"
            className={clsx(
              "flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-semibold",
              allowed ? "text-hs-ok" : shortOfResources ? "text-hs-warn" : "text-hs-mute"
            )}
          >
            {allowed ? <Check size={15} strokeWidth={2.5} /> : <X size={15} strokeWidth={2.5} />}
            {blocker === null ? (kind === 'devCard' ? 'Can buy' : 'Can build') : describeBlocker(blocker, kind)}
            {shortOfResources && (
              <span data-cy="build-option-missing" className="flex items-center gap-1.5">
                {(Object.entries(missing) as [ResourceType, number][]).map(([resource, n]) => (
                  <span key={resource} className="flex items-center gap-0.5">
                    <ResourceChip resource={resource} size={20} />
                    {n > 1 && <span className="text-[11px] font-bold">×{n}</span>}
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
