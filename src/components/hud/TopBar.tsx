'use client';

import { useEffect, useRef, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import type { GameStateView } from "@/types/catan";
import { playerName } from "@/lib/game/helpers/playerName";
import { PLAYER_TEXT_CSS } from "@/lib/constants";

const PHASE_LABEL: Record<GameStateView['phase'], string> = {
  setup1: 'Setup · round 1',
  setup2: 'Setup · round 2',
  main: 'Main game',
};

function Divider() {
  return <span className="h-[30px] w-px shrink-0 bg-[rgba(110,160,220,0.18)]" aria-hidden />;
}

/** Brand, whose turn it is, the phase, and the game menu. */
export function TopBar({ state, onLeave }: { state: GameStateView; onLeave: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const current = state.players[state.currentPlayerIndex];
  const isMyTurn = state.viewerSeatIndex !== null && state.currentPlayerIndex === state.viewerSeatIndex;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  return (
    <header className="hs-bar relative z-30 flex h-[58px] shrink-0 items-center border-b border-[rgba(110,160,220,0.16)] px-[18px] font-hud text-hs-text">
      <div className="flex items-center gap-[11px] pr-[22px]">
        <svg width="30" height="22" viewBox="0 0 30 22" fill="none" aria-hidden>
          <path d="M2 20 L10 4 L15 13 L19 7 L28 20 Z" fill="#4da3ff" />
          <path d="M10 4 L15 13 L12 20 L2 20 Z" fill="#2b7fff" />
        </svg>
        <span className="hidden text-[16px] font-bold tracking-[0.22em] sm:inline">HORIZON SETTLERS</span>
      </div>

      <Divider />

      <div data-cy="turn-indicator" className="flex min-w-0 items-center gap-[7px] px-[22px] text-[14px]">
        <span className="text-hs-mute">Turn:</span>
        <span className="truncate font-bold" style={{ color: current ? PLAYER_TEXT_CSS[current.color] : undefined }}>
          {playerName(current, state.currentPlayerIndex)}
        </span>
        {isMyTurn && (
          <span className="ml-1 rounded-full border border-[rgba(74,222,128,0.4)] bg-[rgba(22,74,44,0.5)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-hs-ok">
            Your Turn
          </span>
        )}
      </div>

      <Divider />

      <span className="hidden px-[22px] text-[14px] font-bold md:inline">{PHASE_LABEL[state.phase]}</span>

      <div className="flex-1" />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          data-cy="game-menu-btn"
          aria-label="Game menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
          className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg text-hs-text hover:bg-white/5"
        >
          <Menu size={22} />
        </button>
        {menuOpen && (
          <div className="hs-panel absolute right-0 top-[46px] w-48 overflow-hidden p-1.5">
            <button
              type="button"
              data-cy="leave-game-btn"
              onClick={() => {
                setMenuOpen(false);
                onLeave();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] text-hs-dim hover:bg-white/5 hover:text-hs-text"
            >
              <LogOut size={16} /> Leave game
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
