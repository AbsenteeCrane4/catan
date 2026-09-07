'use client';

import { useMemo } from "react";
import { clsx } from "clsx";
import { Hammer } from "lucide-react";
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
import { ResourceIcon } from "@/components/ui/ResourceIcon";
import { PieceIcon } from "./PieceIcon";

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

/** What the player is told when an item is unavailable. Cost shortfalls are drawn as icons. */
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

/**
 * What the player can build, what it costs, and why not.
 *
 * Every judgement here comes from `buildLegality` — the same selectors the board
 * highlights with and the reducer validates with — so an item the panel offers is one the
 * reducer will accept, and there is no second copy of the rules to drift.
 */
export function BuildPanel({ state, activeKind, onSelect }: BuildPanelProps) {
  const seat = state.viewerSeatIndex;

  // A spectator holds no pieces and no hand, so there is nothing to offer them.
  const availability = useMemo(
    () => (seat === null ? null : buildAvailability(buildStateFromView(state), seat)),
    [state, seat]
  );

  if (seat === null || !availability) return null;

  const color = state.players[seat]?.color ?? 'white';

  return (
    <section
      data-cy="build-panel"
      className="shrink-0 rounded-xl border border-white/10 bg-slate-950/60 p-3"
    >
      <h2 className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        <Hammer size={12} /> Build
      </h2>

      <ul className="flex flex-col gap-1.5">
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

interface BuildOptionProps {
  availability: BuildAvailability;
  color: GameStateView['players'][number]['color'];
  active: boolean;
  onSelect: () => void;
}

function BuildOption({ availability, color, active, onSelect }: BuildOptionProps) {
  const { kind, allowed, blocker, cost, missing, piecesRemaining } = availability;
  const shortOfResources = blocker?.reason === 'insufficient-resources';

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
          "w-full rounded-lg border p-2 text-left transition-colors",
          allowed
            ? "cursor-pointer border-white/10 bg-slate-900/70 hover:border-amber-400/60 hover:bg-slate-800"
            : "cursor-not-allowed border-white/5 bg-slate-900/30 opacity-60",
          active && "border-amber-400 bg-slate-800 ring-1 ring-amber-400/40"
        )}
      >
        <div className="flex items-center gap-2">
          <PieceIcon kind={kind} color={color} className="h-6 w-6 shrink-0" />

          <span className="flex-1 truncate text-[11px] font-bold text-slate-100">
            {LABELS[kind]}
          </span>

          {/* Supply, per the printed game. Not a reducer rule — see canBuild. */}
          {isPlaceable(kind) && (
            <span
              data-cy="build-option-pieces"
              className={clsx(
                "shrink-0 rounded bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                piecesRemaining && piecesRemaining > 0 ? "text-slate-400" : "text-red-400"
              )}
              title="Pieces left in your supply"
            >
              {piecesRemaining} left
            </span>
          )}
        </div>

        {/* Cost on its own line, status beneath it: at panel width a reason like "Roll
            the dice first" cannot share a row with four cost icons without truncating. */}
        <div className="mt-1.5 flex flex-col gap-1 pl-8">
          <span className="flex items-center gap-1.5">
            {(Object.entries(cost) as [ResourceType, number][]).map(([resource, amount]) => (
              <ResourceIcon
                key={resource}
                resource={resource}
                count={amount}
                muted={!!missing[resource]}
                className="h-[18px] w-[18px]"
              />
            ))}
          </span>

          <span
            data-cy="build-option-status"
            className={clsx(
              "flex min-w-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wide",
              allowed ? "text-emerald-400" : shortOfResources ? "text-amber-400" : "text-slate-500"
            )}
          >
            {blocker === null ? 'Can build' : describeBlocker(blocker, kind)}
            {shortOfResources && (
              <span data-cy="build-option-missing" className="flex items-center gap-1">
                {(Object.entries(missing) as [ResourceType, number][]).map(([resource, amount]) => (
                  <ResourceIcon
                    key={resource}
                    resource={resource}
                    count={amount}
                    className="h-3.5 w-3.5"
                  />
                ))}
              </span>
            )}
          </span>
        </div>
      </button>
    </li>
  );
}
