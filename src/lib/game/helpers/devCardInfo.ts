import type { DevelopmentCardType } from "@/types/catan";

/**
 * The one place a development card's player-facing wording lives.
 *
 * Both the hand and the play modal name the same card, and they used to do it from two
 * private copies of the map that had already drifted ("Yr of Plenty" in one, nothing in
 * the other). The card type is the key the reducer already uses, so anything rendering a
 * card reads its label from here.
 */
export interface DevCardInfo {
  name: string;
  /** One line, short enough to sit on a card face. */
  description: string;
}

export const DEV_CARD_INFO: Record<DevelopmentCardType, DevCardInfo> = {
  knight: {
    name: 'Knight',
    description: 'Move the robber, then steal a card.',
  },
  victoryPoint: {
    name: 'Victory Point',
    description: 'Worth 1 point. Never played.',
  },
  roadBuilding: {
    name: 'Road Building',
    description: 'Build 2 roads for free.',
  },
  yearOfPlenty: {
    name: 'Year of Plenty',
    description: 'Take any 2 resources from the bank.',
  },
  monopoly: {
    name: 'Monopoly',
    description: 'Take every card of one resource.',
  },
};

export const devCardName = (type: DevelopmentCardType): string => DEV_CARD_INFO[type].name;

/**
 * A Victory Point card is held, not played: `PLAY_DEV_CARD` has no meaning for it, so no
 * play control should ever be offered for one.
 */
export const isPlayableCardType = (type: DevelopmentCardType): boolean => type !== 'victoryPoint';
