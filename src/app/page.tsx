'use client';

import dynamic from 'next/dynamic';

const DeckGLVisualization = dynamic(
  () => import('../components/DeckGLVisualization'),
  { ssr: false }
);

export default function Home() {
  return <DeckGLVisualization />;
}
