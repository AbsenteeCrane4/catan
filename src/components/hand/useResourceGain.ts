'use client';

import { useEffect, useRef, useState } from "react";
import type { ResourceType } from "@/types/catan";
import { RESOURCE_TYPES } from "@/lib/constants";

/** Matches the `card-gain` keyframes in globals.css. */
const GAIN_ANIMATION_MS = 420;

/**
 * Which resources just went up, for the length of one short animation.
 *
 * Every `game-update` replaces the whole state, so a gain is only visible as a diff
 * against the previous payload — there is no "you gained wood" event to listen for. The
 * animation is decoration on top of state that has already rendered, so nothing here
 * gates or delays play.
 */
export function useResourceGain(resources: Record<ResourceType, number> | null): ResourceType[] {
  const previous = useRef<Record<ResourceType, number> | null>(null);
  const [gained, setGained] = useState<ResourceType[]>([]);

  useEffect(() => {
    const before = previous.current;
    previous.current = resources;

    // First render with a hand: nothing to compare against, so nothing animates.
    if (!resources || !before) return;

    const grown = RESOURCE_TYPES.filter(r => resources[r] > before[r]);
    if (grown.length === 0) return;

    setGained(grown);
    const timer = setTimeout(() => setGained([]), GAIN_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [resources]);

  return gained;
}
