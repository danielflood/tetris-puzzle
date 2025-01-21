'use client';

import dynamic from 'next/dynamic';

const TetrisGame = dynamic(() => import('./TetrisGame'), {
  ssr: false,
});

export default function GameWrapper() {
  return <TetrisGame />;
} 