'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const DeckGLVisualization = dynamic(
  () => import('../components/DeckGLVisualization'),
  { ssr: false }
);

const WeatherVisualization = dynamic(
  () => import('../components/WeatherVisualization'),
  { ssr: false }
);

export default function Home() {
  const [activeView, setActiveView] = useState<'data' | 'weather'>('data');

  return (
    <main className="w-full h-screen relative">
      {/* View toggle button */}
      <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={() => setActiveView('data')}
          className={`px-4 py-2 rounded ${
            activeView === 'data' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          📊 데이터 시각화
        </button>
        <button
          onClick={() => setActiveView('weather')}
          className={`ml-2 px-4 py-2 rounded ${
            activeView === 'weather' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          🌦️ 날씨 시각화
        </button>
      </div>

      {/* Render selected visualization */}
      {activeView === 'data' ? <DeckGLVisualization /> : <WeatherVisualization />}
    </main>
  );
}
