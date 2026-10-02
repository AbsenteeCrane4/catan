'use client';

import { useState, type MouseEvent } from "react";
import { clsx } from "clsx";
import { ArrowDown, ArrowLeftRight, Handshake, Landmark, Lock } from "lucide-react";
import type { GameStateView, ResourceType, RevealedPlayerView, TradeOffer } from "@/types/catan";
import { RESOURCE_LABELS } from "@/lib/constants";
import { bankRatio } from "@/lib/game/helpers/bankRatio";
import { playerName } from "@/lib/game/helpers/playerName";
import { PanelHeader, ResourceChip, SectionLabel, tileArtStyle } from "./primitives";

/** Trade rows run in the order of the hand. */
const RES: ResourceType[] = ['wood', 'brick', 'wheat', 'sheep', 'ore'];

type Picks = Partial<Record<ResourceType, number>>;

const total = (p: Picks) => Object.values(p).reduce((a, b) => a + (b ?? 0), 0);
const full = (p: Picks): Record<ResourceType, number> =>
  Object.fromEntries(RES.map(r => [r, p[r] ?? 0])) as Record<ResourceType, number>;

interface TradePanelProps {
  state: GameStateView;
  /** The viewer's own seat, narrowed by `ownHand`. */
  me: RevealedPlayerView;
  onTradeWithBank: (offerResource: ResourceType, requestResource: ResourceType) => void;
  onProposeTrade: (offer: TradeOffer) => void;
  onAcceptTrade: () => void;
  onCancelTrade: () => void;
}

/**
 * Trading, as the active player's tool.
 *
 * On your turn it is a proposal builder: click a resource to add it to a side,
 * right-click to take one back. The bank slot stays locked until the give side is a single
 * resource at the player's own rate and exactly one card is wanted — the rate comes from
 * `bankRatio`, the function the reducer charges with, so the panel never offers a trade the
 * server would reject. Off-turn it collapses to a locked state, unless an offer is open.
 */
export function TradePanel({ state, me, onTradeWithBank, onProposeTrade, onAcceptTrade, onCancelTrade }: TradePanelProps) {
  const [give, setGive] = useState<Picks>({});
  const [want, setWant] = useState<Picks>({});

  const isMyTurn = state.currentPlayerIndex === me.id;
  const offer = state.currentTradeOffer;
  const canTrade = isMyTurn && state.phase === 'main';

  const pill = canTrade
    ? { label: 'Your turn', cls: 'text-hs-ok bg-[rgba(22,74,44,0.5)] border-[rgba(74,222,128,0.4)]' }
    : { label: 'Locked', cls: 'text-hs-mute bg-[rgba(20,40,68,0.6)] border-[rgba(110,160,220,0.2)]' };

  const reset = () => {
    setGive({});
    setWant({});
  };

  return (
    <aside data-cy="trade-panel" className="hs-panel shrink-0 overflow-hidden">
      <PanelHeader icon={<Handshake size={20} />} title="Trade">
        <span className={clsx("rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]", pill.cls)}>
          {pill.label}
        </span>
      </PanelHeader>

      {offer ? (
        <OpenOffer
          state={state}
          me={me}
          offer={offer}
          onAccept={onAcceptTrade}
          onCancel={() => {
            onCancelTrade();
            reset();
          }}
        />
      ) : !canTrade ? (
        <div className="flex flex-col items-center gap-[9px] px-[18px] py-[26px] text-center">
          <Lock size={26} className="text-hs-mute" />
          <span className="text-[14px] font-semibold text-hs-dim">
            {!isMyTurn
              ? `It's ${playerName(state.players[state.currentPlayerIndex], state.currentPlayerIndex)}'s turn`
              : 'Trading opens after setup'}
          </span>
          <span className="max-w-[240px] text-[12.5px] leading-normal text-hs-mute">
            {!isMyTurn
              ? "Only the active player can open a trade. You'll be able to accept what they offer."
              : 'Players and the bank open for business once every settlement is placed.'}
          </span>
        </div>
      ) : (
        <Builder
          state={state}
          me={me}
          give={give}
          want={want}
          setGive={setGive}
          setWant={setWant}
          onBank={(from, to) => {
            onTradeWithBank(from, to);
            reset();
          }}
          onPropose={() => onProposeTrade({ initiatorId: me.id, offer: full(give), request: full(want) })}
        />
      )}
    </aside>
  );
}

function Builder({
  state,
  me,
  give,
  want,
  setGive,
  setWant,
  onBank,
  onPropose,
}: {
  state: GameStateView;
  me: RevealedPlayerView;
  give: Picks;
  want: Picks;
  setGive: (fn: (p: Picks) => Picks) => void;
  setWant: (fn: (p: Picks) => Picks) => void;
  onBank: (from: ResourceType, to: ResourceType) => void;
  onPropose: () => void;
}) {
  const bump = (set: typeof setGive, res: ResourceType, delta: number, cap?: number) =>
    set(prev => {
      const next = { ...prev };
      const v = Math.max(0, Math.min(cap ?? 19, (next[res] ?? 0) + delta));
      if (v === 0) delete next[res];
      else next[res] = v;
      return next;
    });

  const giveTotal = total(give);
  const wantTotal = total(want);

  // The rates the reducer would charge, per resource.
  const ratios = Object.fromEntries(RES.map(r => [r, bankRatio(state, me.id, r)])) as Record<ResourceType, 2 | 3 | 4>;
  const best = Math.min(...RES.map(r => ratios[r]));
  const bestPort = RES.find(r => ratios[r] === 2);

  const bank = bankSlot(give, want, ratios, best, bestPort);
  const offerReady = giveTotal > 0 && wantTotal > 0;

  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
      <div className="flex flex-col gap-[7px]">
        <div className="flex items-baseline justify-between">
          <SectionLabel>You give</SectionLabel>
          <span className="text-[11.5px] text-hs-mute">{giveTotal} selected</span>
        </div>
        <div className="flex gap-[7px]">
          {RES.map(r => (
            <TradeCell
              key={r}
              side="give"
              resource={r}
              selected={give[r] ?? 0}
              owned={me.resources[r]}
              onAdd={() => bump(setGive, r, 1, me.resources[r])}
              onRemove={() => bump(setGive, r, -1, me.resources[r])}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5" aria-hidden>
        <span className="h-px flex-1 bg-[rgba(110,160,220,0.14)]" />
        <ArrowDown size={17} className="text-hs-accent" />
        <span className="h-px flex-1 bg-[rgba(110,160,220,0.14)]" />
      </div>

      <div className="flex flex-col gap-[7px]">
        <div className="flex items-baseline justify-between">
          <SectionLabel>You want</SectionLabel>
          <span className="text-[11.5px] text-hs-mute">{wantTotal} selected</span>
        </div>
        <div className="flex gap-[7px]">
          {RES.map(r => (
            <TradeCell
              key={r}
              side="want"
              resource={r}
              selected={want[r] ?? 0}
              onAdd={() => bump(setWant, r, 1)}
              onRemove={() => bump(setWant, r, -1)}
            />
          ))}
        </div>
      </div>

      <div
        data-cy="bank-trade-slot"
        data-ready={bank.ready}
        className={clsx(
          "flex items-center gap-[11px] rounded-[9px] border px-3 py-[11px]",
          bank.ready
            ? "border-[rgba(74,222,128,0.45)] bg-[rgba(22,74,44,0.5)]"
            : "border-[rgba(110,160,220,0.14)] bg-[rgba(12,26,45,0.6)]"
        )}
      >
        <Landmark size={20} className={bank.ready ? "text-hs-ok" : "text-hs-mute"} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={clsx("text-[13px] font-bold", bank.ready ? "text-hs-ok" : "text-hs-mute")}>{bank.title}</span>
          <span className={clsx("text-[11.5px] leading-snug", bank.ready ? "text-hs-dim" : "text-hs-mute")}>{bank.hint}</span>
        </div>
        {bank.ready && bank.trade && (
          <button
            type="button"
            data-cy="bank-trade-btn"
            onClick={() => onBank(bank.trade!.from, bank.trade!.to)}
            className="shrink-0 cursor-pointer rounded-[7px] bg-hs-ok px-[13px] py-2 text-[12.5px] font-bold text-[#06240f] hover:brightness-110"
          >
            Trade
          </button>
        )}
      </div>

      <button
        type="button"
        data-cy="propose-trade-btn"
        disabled={!offerReady}
        onClick={onPropose}
        className="hs-primary-btn flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[9px] py-3.5 text-[15px] font-semibold !shadow-[0_8px_20px_rgba(24,86,180,0.45)] disabled:!shadow-none"
      >
        <ArrowLeftRight size={18} />
        Offer to players
      </button>
    </div>
  );
}

interface BankSlot {
  ready: boolean;
  title: string;
  hint: string;
  trade?: { from: ResourceType; to: ResourceType };
}

/** The bank slot's state. Every intermediate state coaches the next step. */
function bankSlot(
  give: Picks,
  want: Picks,
  ratios: Record<ResourceType, 2 | 3 | 4>,
  best: number,
  bestPort: ResourceType | undefined
): BankSlot {
  // The rate for any resource without its own harbour: 3 with a generic port, else 4.
  const generic = Math.max(...Object.values(ratios).filter(r => r !== 2), best);
  const idle: BankSlot = {
    ready: false,
    title: 'Bank trade',
    hint:
      `Put up ${generic} of one resource` +
      (generic === 3 ? ' with your 3:1 port' : '') +
      (bestPort ? ` — or 2 ${RESOURCE_LABELS[bestPort]} with your 2:1 port —` : '') +
      ' for any 1 card.',
  };

  const kinds = Object.keys(give) as ResourceType[];
  if (kinds.length === 0) return idle;
  if (kinds.length > 1) return { ...idle, hint: 'The bank only takes one resource type at a time.' };

  const res = kinds[0];
  const n = give[res] ?? 0;
  const ratio = ratios[res];
  const wanted = Object.keys(want) as ResourceType[];

  if (n < ratio) {
    return { ...idle, hint: `Add ${ratio - n} more ${RESOURCE_LABELS[res]} to reach ${ratio}:1.` };
  }
  if (n > ratio) {
    return { ...idle, hint: `The bank takes exactly ${ratio} ${RESOURCE_LABELS[res]} for 1 card.` };
  }
  if (total(want) !== 1) {
    return { ...idle, hint: 'Pick the 1 card you want back.' };
  }
  if (wanted[0] === res) {
    return { ...idle, hint: 'Pick a different resource to take back.' };
  }

  const rate = ratio === 4 ? '4:1 bank rate' : ratio === 3 ? '3:1 port' : '2:1 port';
  return {
    ready: true,
    title: `${n} ${RESOURCE_LABELS[res]} → 1 ${RESOURCE_LABELS[wanted[0]]}`,
    hint: `Available at your ${rate}.`,
    trade: { from: res, to: wanted[0] },
  };
}

function TradeCell({
  side,
  resource,
  selected,
  owned,
  onAdd,
  onRemove,
}: {
  side: 'give' | 'want';
  resource: ResourceType;
  selected: number;
  /** Only the give side is capped by the hand. */
  owned?: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const empty = owned === 0;
  return (
    <button
      type="button"
      data-cy={`trade-${side}-cell`}
      data-resource={resource}
      data-selected={selected}
      disabled={empty}
      title={`${RESOURCE_LABELS[resource]} — click to add, right-click to remove`}
      aria-label={`${side === 'give' ? 'Give' : 'Want'} ${RESOURCE_LABELS[resource]}`}
      onClick={onAdd}
      onContextMenu={(e: MouseEvent) => {
        e.preventDefault();
        onRemove();
      }}
      className={clsx(
        "flex min-w-0 flex-1 flex-col items-stretch overflow-hidden rounded-lg border-[1.5px] p-0",
        selected ? "border-hs-accent bg-[rgba(45,86,140,0.85)]" : "border-[rgba(110,160,220,0.2)] bg-[rgba(20,40,68,0.55)]",
        empty ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:border-[rgba(77,163,255,0.7)]"
      )}
    >
      <span className="h-[38px]" style={tileArtStyle(resource)} />
      <span className="flex h-[22px] items-center justify-center gap-1 bg-[rgba(4,10,20,0.55)]">
        <span className={clsx("text-[12.5px] font-extrabold", selected ? "text-white" : "text-hs-mute")}>{selected}</span>
        {owned !== undefined && <span className="text-[10.5px] text-hs-mute">/{owned}</span>}
      </span>
    </button>
  );
}

/** An open offer: the initiator can withdraw it, anyone else can take it. */
function OpenOffer({
  state,
  me,
  offer,
  onAccept,
  onCancel,
}: {
  state: GameStateView;
  me: RevealedPlayerView;
  offer: TradeOffer;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const mine = offer.initiatorId === me.id;
  const from = playerName(state.players[offer.initiatorId], offer.initiatorId);
  const shortfall = RES.filter(r => (offer.request[r] ?? 0) > me.resources[r]);

  const row = (label: string, amounts: Record<ResourceType, number>) => (
    <div className="flex flex-col gap-[7px]">
      <SectionLabel>{label}</SectionLabel>
      <div className="flex flex-wrap items-center gap-[5px]">
        {RES.flatMap(r => Array.from({ length: amounts[r] ?? 0 }, (_, i) => <ResourceChip key={`${r}${i}`} resource={r} />))}
      </div>
    </div>
  );

  return (
    <div data-cy="open-trade-offer" className="flex flex-col gap-3 px-4 pt-3 pb-4">
      <span className="text-[13px] text-hs-dim">
        {mine ? 'Your offer is on the table.' : <><span className="font-bold text-hs-text">{from}</span> is offering a trade.</>}
      </span>
      {row(mine ? 'You give' : 'They give', offer.offer)}
      {row(mine ? 'You want' : 'They want', offer.request)}

      {mine ? (
        <button
          type="button"
          data-cy="cancel-trade-btn"
          onClick={onCancel}
          className="w-full cursor-pointer rounded-[9px] border border-[rgba(248,113,113,0.45)] bg-[rgba(127,29,29,0.3)] py-3 text-[14px] font-semibold text-[#fecaca] hover:bg-[rgba(127,29,29,0.45)]"
        >
          Withdraw offer
        </button>
      ) : (
        <>
          <button
            type="button"
            data-cy="accept-trade-btn"
            disabled={shortfall.length > 0}
            onClick={onAccept}
            className="w-full cursor-pointer rounded-[9px] bg-hs-ok py-3 text-[14px] font-bold text-[#06240f] hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[rgba(20,40,68,0.5)] disabled:text-hs-mute"
          >
            Accept trade
          </button>
          {shortfall.length > 0 && (
            <span className="text-center text-[12px] text-hs-mute">
              You don&apos;t have enough {shortfall.map(r => RESOURCE_LABELS[r]).join(', ')} to accept.
            </span>
          )}
        </>
      )}
    </div>
  );
}
