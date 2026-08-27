'use client';

import { use } from 'react';
import { GameRoom } from '@/components/game/GameRoom';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CatanPage({ params }: PageProps) {
  const { id } = use(params);
  return <GameRoom gameId={id} />;
}
