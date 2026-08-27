import { PlayerColor } from "@/types/catan";

const CLIENT_ID_KEY = 'catan.clientId';
const NAME_KEY = 'catan.playerName';
const COLOR_KEY = 'catan.playerColor';

function newId(): string {
  // crypto.randomUUID is only defined in a secure context (https / localhost).
  // This app can be served over plain HTTP, so the fallback is required, not decorative.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * A stable per-browser id used to bind a lobby seat to a person rather than to a
 * socket. socket.id changes on every reconnect, so without this a refresh loses
 * your seat and leaves you a silent observer.
 *
 * Must only be called from the browser (inside an effect), never during render.
 */
export function getClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = newId();
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    // Private browsing / storage disabled: fall back to a per-session id.
    return newId();
  }
}

/** Remembered seat preferences, used to prefill the lobby form. Best-effort only. */
export function getStoredIdentity(): { name: string | null; color: PlayerColor | null } {
  try {
    return {
      name: localStorage.getItem(NAME_KEY),
      color: localStorage.getItem(COLOR_KEY) as PlayerColor | null,
    };
  } catch {
    return { name: null, color: null };
  }
}

export function storeIdentity(name: string, color: PlayerColor): void {
  try {
    localStorage.setItem(NAME_KEY, name);
    localStorage.setItem(COLOR_KEY, color);
  } catch {
    // Ignore — prefill is a convenience, not a requirement.
  }
}
