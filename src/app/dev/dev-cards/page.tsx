import { notFound } from 'next/navigation';
import { DevCardGallery } from './DevCardGallery';

/**
 * Every development card as the hand bar draws it, for eyeballing the card faces. Real
 * games deal cards at random, so there is no way to be sure of seeing all five there.
 * Development only: a production build answers 404.
 */
export default function DevCardsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DevCardGallery />;
}
