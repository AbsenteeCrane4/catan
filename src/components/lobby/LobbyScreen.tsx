'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Crown, Check, Copy, Users } from 'lucide-react';
import { PlayerColor } from '@/types/catan';
import { LobbySnapshot, EXPANSION_MIN_PLAYERS, MAX_NAME_LENGTH, MIN_PLAYERS } from '@/types/lobby';
import { PLAYER_COLORS, PLAYER_COLOR_CLASSES, PLAYER_COLOR_LABELS } from '@/lib/constants';
import { getStoredIdentity, storeIdentity } from '@/lib/client-id';

interface LobbyScreenProps {
  lobby: LobbySnapshot;
  seatIndex: number | null;
  errorMessage?: string | null;
  onSit: (name: string, color: PlayerColor) => void;
  onStand: () => void;
  onStart: () => void;
}

export function LobbyScreen({
  lobby,
  seatIndex,
  errorMessage,
  onSit,
  onStand,
  onStart,
}: LobbyScreenProps) {
  const stored = getStoredIdentity();
  const mySeat = lobby.seats.find(s => s.seatIndex === seatIndex);

  const [name, setName] = useState(mySeat?.name ?? stored.name ?? '');
  const [color, setColor] = useState<PlayerColor | null>(mySeat?.color ?? stored.color ?? null);
  const [copied, setCopied] = useState(false);

  const takenColors = new Map(
    lobby.seats.filter(s => s.seatIndex !== seatIndex).map(s => [s.color, s.name])
  );
  const isSeated = mySeat !== undefined;
  const iAmHost = mySeat?.isHost ?? false;
  const canSubmit = name.trim().length > 0 && color !== null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !color) return;
    storeIdentity(name.trim(), color);
    onSit(name.trim(), color);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable outside a secure context; the code is on screen anyway.
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black text-blue-500 italic uppercase tracking-tighter">
            Game Lobby
          </h1>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 text-sm bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 hover:bg-slate-700 transition-colors"
          >
            <span className="font-mono font-bold tracking-widest text-amber-400">{lobby.gameId}</span>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
            <span className="text-slate-400 text-xs">{copied ? 'Copied' : 'Copy invite link'}</span>
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Seat roster */}
          <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Users size={14} /> Players {lobby.seats.length}/{lobby.maxSeats}
            </h2>

            {lobby.seats.length === 0 && (
              <p className="text-sm text-slate-500">Nobody has joined yet.</p>
            )}

            <ul className="space-y-2">
              {lobby.seats.map(seat => (
                <li
                  key={seat.seatIndex}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                    seat.seatIndex === seatIndex
                      ? 'border-amber-400 bg-slate-700'
                      : 'border-slate-700 bg-slate-900/50'
                  )}
                >
                  <span
                    className={clsx('w-4 h-4 rounded-full shrink-0', PLAYER_COLOR_CLASSES[seat.color])}
                    aria-hidden="true"
                  />
                  <span className="font-bold truncate flex-1">{seat.name}</span>
                  {seat.isHost && (
                    <span title="Host" className="text-amber-400">
                      <Crown size={16} />
                    </span>
                  )}
                  {!seat.connected && (
                    <span className="text-[10px] uppercase font-bold text-slate-500">Away</span>
                  )}
                </li>
              ))}
            </ul>

            {lobby.seats.length >= EXPANSION_MIN_PLAYERS && (
              <p className="text-xs text-slate-400 border-t border-slate-700 pt-3">
                5–6 player games currently use the standard board. The larger expansion board is
                coming next.
              </p>
            )}
          </section>

          {/* Seat form */}
          <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-5">
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="player-name" className="block text-xs font-black uppercase tracking-widest text-slate-500">
                  Your name
                </label>
                <input
                  id="player-name"
                  type="text"
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                  Your colour
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {PLAYER_COLORS.map(option => {
                    const takenBy = takenColors.get(option);
                    const selected = color === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={takenBy !== undefined}
                        title={takenBy ? `Taken by ${takenBy}` : PLAYER_COLOR_LABELS[option]}
                        aria-label={takenBy ? `${PLAYER_COLOR_LABELS[option]}, taken by ${takenBy}` : PLAYER_COLOR_LABELS[option]}
                        aria-pressed={selected}
                        onClick={() => setColor(option)}
                        className={clsx(
                          'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                          selected
                            ? 'border-amber-400 bg-slate-700'
                            : 'border-slate-700 bg-slate-900/50 hover:border-slate-500',
                          takenBy !== undefined && 'opacity-30 cursor-not-allowed hover:border-slate-700'
                        )}
                      >
                        <span className={clsx('w-6 h-6 rounded-full', PLAYER_COLOR_CLASSES[option])} />
                        <span className="text-[9px] uppercase font-bold text-slate-400">
                          {PLAYER_COLOR_LABELS[option]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                {isSeated ? 'Update' : 'Take a seat'}
              </button>
            </form>

            {errorMessage && (
              <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-xl px-4 py-2">
                {errorMessage}
              </p>
            )}

            {isSeated && (
              <button
                onClick={onStand}
                className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                Leave seat
              </button>
            )}

            <div className="border-t border-slate-700 pt-5">
              {iAmHost ? (
                <>
                  <button
                    onClick={onStart}
                    disabled={!lobby.canStart}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg transition-all active:scale-95"
                  >
                    Start Game
                  </button>
                  {!lobby.canStart && (
                    <p className="text-xs text-slate-500 text-center mt-2">
                      Need at least {MIN_PLAYERS} players to start.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center">
                  {isSeated ? 'Waiting for the host to start the game…' : 'Take a seat to join this game.'}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
