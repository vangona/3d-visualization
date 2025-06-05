# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D visualization project using deck.gl for data visualization. It's built with Next.js 15.3.3, React 19, TypeScript, and Tailwind CSS 4.

## Common Development Commands

- `npm run dev` - Start development server with Next.js Turbopack
- `npm run build` - Build the application for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Code Architecture

This is a Next.js App Router project with the following structure:

- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - React components, including the main DeckGLVisualization component
- `/docs/` - Documentation files including deck.gl usage guide
- TypeScript configuration uses strict mode with path alias `@/*` mapping to `./src/*`
- Tailwind CSS 4 for styling
- ESLint 9 for code quality

### Key Components

- `DeckGLVisualization.tsx` - Main visualization component with 5 different layer types (ScatterplotLayer, HexagonLayer, PathLayer, PointCloudLayer, ScenegraphLayer)
- Seoul-specific data integration with real estate prices, subway lines, and air quality monitoring
- Responsive UI with touch device support and collapsible control panels
- Dynamic layer switching with useCallback for performance

### Environment Configuration

- Requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env.local` for map tiles
- Uses Mapbox GL JS for base map rendering
- deck.gl layers rendered on top of Mapbox maps

### Technical Considerations

- Uses `'use client'` directive for client-side rendering (deck.gl requires WebGL)
- Dynamic imports with `ssr: false` to prevent SSR issues with deck.gl
- GPU-accelerated rendering with WebGL2
- Touch and mouse interaction controls configured for both desktop and mobile

### Data Architecture

- Seoul real estate data with district-specific pricing and population
- Seoul subway line simulations with realistic colors and routes
- Air quality monitoring stations with PM2.5 data visualization
- All coordinate data uses Seoul City Hall (126.9780, 37.5665) as the center point