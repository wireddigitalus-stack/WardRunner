'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Compass, Minimize2, Maximize2, Radio, Crosshair, MapPin, Eye, Target } from 'lucide-react';
import { Sign, VolunteerAssignment, CanvassRecord } from '@/lib/types';

// Geographic Bounds enclosing Bristol TN municipal area and major corridors
export const MINIMAP_BOUNDS = {
  minLng: -82.242,
  maxLng: -82.138,
  minLat: 36.562,
  maxLat: 36.626,
};

// Official Bristol TN Municipal Outer Outline
const BRISTOL_BOUNDARY_COORDS: [number, number][] = [
  [-82.215, 36.615],
  [-82.165, 36.612],
  [-82.160, 36.578],
  [-82.185, 36.572],
  [-82.220, 36.585],
  [-82.215, 36.615],
];

// Major Arterials for geographic spatial orientation (Volunteer Pkwy, State St, Bluff City Hwy)
const KEY_ARTERIALS: { name: string; path: [number, number][] }[] = [
  // State St (E-W line separating TN and VA)
  {
    name: 'State St',
    path: [
      [-82.235, 36.5952],
      [-82.1887, 36.5951],
      [-82.155, 36.5950],
    ],
  },
  // Volunteer Pkwy (US-11W - North to South-West)
  {
    name: 'Volunteer Pkwy',
    path: [
      [-82.1887, 36.5951],
      [-82.1930, 36.5820],
      [-82.1980, 36.5680],
      [-82.2150, 36.5630],
    ],
  },
  // King College Rd (East residential)
  {
    name: 'King College Rd',
    path: [
      [-82.170, 36.595],
      [-82.155, 36.591],
      [-82.145, 36.582],
    ],
  },
];

interface TacticalMinimapProps {
  mapRef: React.MutableRefObject<any>;
  signs: Sign[];
  canvassRecords?: CanvassRecord[];
  assignments?: VolunteerAssignment[];
  isDark?: boolean;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export default function TacticalMinimap({
  mapRef,
  signs = [],
  canvassRecords = [],
  assignments = [],
  isDark = true,
  isOpen,
  onToggle,
}: TacticalMinimapProps) {
  // Dimensions of the square radar screen
  const width = 230;
  const height = 200;

  // Camera viewport polygon projected onto minimap pixels
  const [viewportPoly, setViewportPoly] = useState<[number, number][] | null>(null);
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(13.2);
  const [hoverCoord, setHoverCoord] = useState<{ lng: number; lat: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Coordinate Projection: [lng, lat] -> [pixelX, pixelY]
  const project = useCallback(
    (lng: number, lat: number): [number, number] => {
      const x = ((lng - MINIMAP_BOUNDS.minLng) / (MINIMAP_BOUNDS.maxLng - MINIMAP_BOUNDS.minLng)) * width;
      const y = height - ((lat - MINIMAP_BOUNDS.minLat) / (MINIMAP_BOUNDS.maxLat - MINIMAP_BOUNDS.minLat)) * height;
      return [x, y];
    },
    [width, height]
  );

  // Inverse Projection: [pixelX, pixelY] -> [lng, lat]
  const unproject = useCallback(
    (x: number, y: number): [number, number] => {
      const lng = MINIMAP_BOUNDS.minLng + (x / width) * (MINIMAP_BOUNDS.maxLng - MINIMAP_BOUNDS.minLng);
      const lat = MINIMAP_BOUNDS.minLat + ((height - y) / height) * (MINIMAP_BOUNDS.maxLat - MINIMAP_BOUNDS.minLat);
      return [lng, lat];
    },
    [width, height]
  );

  // Synchronize viewport camera bounding box with main MapLibre map
  const updateViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      const canvas = map.getCanvas();
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // 4 corners of visible main map canvas
      const pTL = map.unproject([0, 0]);
      const pTR = map.unproject([w, 0]);
      const pBR = map.unproject([w, h]);
      const pBL = map.unproject([0, h]);

      // Project corners into minimap pixel space
      const poly: [number, number][] = [
        project(pTL.lng, pTL.lat),
        project(pTR.lng, pTR.lat),
        project(pBR.lng, pBR.lat),
        project(pBL.lng, pBL.lat),
      ];

      setViewportPoly(poly);

      const center = map.getCenter();
      if (center) {
        setCameraCenter(project(center.lng, center.lat));
      }
      setCurrentZoom(Number(map.getZoom().toFixed(1)));
    } catch {
      // safe ignore during map initialization/destruction
    }
  }, [mapRef, project]);

  // Hook camera movement and zoom events
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    updateViewport();

    const onMove = () => updateViewport();
    map.on('move', onMove);
    map.on('zoom', onMove);
    map.on('rotate', onMove);
    map.on('pitch', onMove);

    return () => {
      map.off('move', onMove);
      map.off('zoom', onMove);
      map.off('rotate', onMove);
      map.off('pitch', onMove);
    };
  }, [mapRef, updateViewport]);

  // Handle click on minimap to teleport main camera to that exact location
  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !mapRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const [targetLng, targetLat] = unproject(clickX, clickY);

    mapRef.current.flyTo({
      center: [targetLng, targetLat],
      duration: 800,
      essential: true,
    });
  };

  // Handle mouse move for coordinates hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      const [lng, lat] = unproject(x, y);
      setHoverCoord({ lng, lat });

      if (isDragging && mapRef.current) {
        mapRef.current.setCenter([lng, lat]);
      }
    }
  };

  // Pre-project Bristol Boundary SVG path
  const boundaryPath = useMemo(() => {
    const pts = BRISTOL_BOUNDARY_COORDS.map((coord) => project(coord[0], coord[1]));
    return `M ${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ')} Z`;
  }, [project]);

  // Pre-project Arterials SVG paths
  const arterialPaths = useMemo(() => {
    return KEY_ARTERIALS.map((art) => {
      const pts = art.path.map((coord) => project(coord[0], coord[1]));
      return {
        name: art.name,
        d: `M ${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ')}`,
      };
    });
  }, [project]);

  // Pre-project asset dots (Yard Signs, 4x4s, Competitors)
  const signDots = useMemo(() => {
    return signs
      .map((s) => {
        const lng = Number(s.longitude);
        const lat = Number(s.latitude);
        if (isNaN(lng) || isNaN(lat)) return null;
        if (
          lng < MINIMAP_BOUNDS.minLng ||
          lng > MINIMAP_BOUNDS.maxLng ||
          lat < MINIMAP_BOUNDS.minLat ||
          lat > MINIMAP_BOUNDS.maxLat
        )
          return null;

        const [x, y] = project(lng, lat);
        let color = '#10b981'; // Yard Sign - Emerald
        let radius = 2.4;

        if (s.is_competitor) {
          color = '#f43f5e'; // Competitor - Crimson
          radius = 2.8;
        } else if (s.sign_type === 'large_sign' || s.sign_type === 'billboard') {
          color = '#3b82f6'; // Roadside 4x4 - Electric Blue
          radius = 3.2;
        }

        return { id: s.id, x, y, color, radius };
      })
      .filter(Boolean) as { id: string; x: number; y: number; color: string; radius: number }[];
  }, [signs, project]);

  // Pre-project active missions (Purple pulse targets)
  const missionDots = useMemo(() => {
    return assignments
      .filter((a) => a.status !== 'completed')
      .map((m) => {
        const lng = Number(m.lng);
        const lat = Number(m.lat);
        if (isNaN(lng) || isNaN(lat)) return null;
        const [x, y] = project(lng, lat);
        return { id: m.id, x, y, title: m.title };
      })
      .filter(Boolean) as { id: string; x: number; y: number; title: string }[];
  }, [assignments, project]);

  // Pre-project Canvass knocks (Teal micro-dots)
  const canvassDots = useMemo(() => {
    return canvassRecords
      .slice(0, 80) // Render up to 80 recent knocks for optimal canvas performance
      .map((c) => {
        const lng = Number(c.longitude);
        const lat = Number(c.latitude);
        if (isNaN(lng) || isNaN(lat)) return null;
        const [x, y] = project(lng, lat);
        return { id: c.id, x, y };
      })
      .filter(Boolean) as { id: string; x: number; y: number }[];
  }, [canvassRecords, project]);

  // Polygon string for the dynamic viewport camera frustum
  const viewportPolyString = useMemo(() => {
    if (!viewportPoly || viewportPoly.length < 4) return null;
    return viewportPoly.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  }, [viewportPoly]);

  // Recenter main camera to Bristol HQ
  const handleRecenterBristol = (e: React.MouseEvent) => {
    e.stopPropagation();
    mapRef.current?.flyTo({
      center: [-82.1887, 36.5951],
      zoom: 13.5,
      pitch: 0,
      bearing: 0,
      duration: 800,
    });
  };

  // -------------------------------------------------------------
  // COLLAPSED MODE: Sleek Floating Capsule
  // -------------------------------------------------------------
  if (!isOpen) {
    return (
      <div className="fixed bottom-5 left-4 z-20 pointer-events-auto select-none">
        <button
          onClick={() => onToggle(true)}
          className="glass group flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/15 bg-slate-950/80 hover:bg-slate-900/90 text-white shadow-xl shadow-black/40 hover:scale-105 active:scale-95 transition-all duration-200"
          title="Open Tactical Radar Minimap (M)"
        >
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-xs font-black tracking-wide text-slate-200 group-hover:text-white">
            RADAR HUD
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
            M
          </span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // EXPANDED MODE: Full Square Tactical HUD
  // -------------------------------------------------------------
  return (
    <div
      id="tour-minimap-hud"
      className="fixed bottom-5 left-4 z-20 pointer-events-auto select-none animate-slide-up"
    >
      <div className="glass w-[246px] rounded-2xl border border-white/20 bg-slate-950/90 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden ring-1 ring-white/10">
        
        {/* --- Header Bar --- */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Radar HUD
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-white/10 text-slate-400">
              Z {currentZoom}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Snap to Bristol Center */}
            <button
              onClick={handleRecenterBristol}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Snap Camera to Bristol Center"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            {/* Minimize */}
            <button
              onClick={() => onToggle(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Minimize Radar (M)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* --- Interactive Radar Viewport --- */}
        <div
          className="relative bg-slate-950/95 cursor-crosshair overflow-hidden"
          style={{ width: `${width}px`, height: `${height}px`, margin: '0 auto' }}
        >
          {/* Subtle Radar Background Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '28.75px 25px',
            }}
          />

          {/* SVG Map Projection */}
          <svg
            ref={svgRef}
            width={width}
            height={height}
            onClick={handleMinimapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCoord(null)}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            className="w-full h-full block"
          >
            {/* Bristol Municipal Boundary Outline */}
            <path
              d={boundaryPath}
              fill="rgba(14, 165, 233, 0.05)"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeDasharray="4 3"
              opacity="0.75"
            />

            {/* Key Arterials (Volunteer Pkwy & State St) */}
            {arterialPaths.map((art, i) => (
              <g key={i}>
                <path
                  d={art.d}
                  fill="none"
                  stroke={art.name === 'State St' ? 'rgba(251, 191, 36, 0.45)' : 'rgba(255, 255, 255, 0.2)'}
                  strokeWidth={art.name === 'State St' ? '1.5' : '1.2'}
                  strokeDasharray={art.name === 'State St' ? '2 2' : undefined}
                />
              </g>
            ))}

            {/* State Line Label (VA / TN border indicator) */}
            <text
              x={project(-82.23, 36.596)[0]}
              y={project(-82.23, 36.596)[1] - 3}
              fill="rgba(251, 191, 36, 0.6)"
              fontSize="7.5"
              fontWeight="bold"
              fontFamily="monospace"
              className="pointer-events-none"
            >
              STATE ST (TN/VA)
            </text>

            {/* Canvass Knocks (Teal dots) */}
            {canvassDots.map((dot) => (
              <circle
                key={`c-${dot.id}`}
                cx={dot.x}
                cy={dot.y}
                r={1.8}
                fill="#14b8a6"
                opacity="0.6"
              />
            ))}

            {/* Campaign Signs (Emerald yard, Blue 4x4, Red opponent) */}
            {signDots.map((dot) => (
              <circle
                key={`s-${dot.id}`}
                cx={dot.x}
                cy={dot.y}
                r={dot.radius}
                fill={dot.color}
                stroke="rgba(0,0,0,0.8)"
                strokeWidth="0.8"
              />
            ))}

            {/* Active Dispatched Missions (Purple pulsing rings) */}
            {missionDots.map((dot) => (
              <g key={`m-${dot.id}`}>
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={5.5}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.2"
                  className="animate-pulse"
                />
                <circle cx={dot.x} cy={dot.y} r={2.5} fill="#c084fc" />
              </g>
            ))}

            {/* -------------------------------------------------------------
                DYNAMIC CAMERA VIEWPORT FRUSTUM (Live Bounding Box)
                ------------------------------------------------------------- */}
            {viewportPolyString && (
              <g className="transition-all duration-75 ease-out">
                {/* Viewport Fill & Outer Border */}
                <polygon
                  points={viewportPolyString}
                  fill="rgba(6, 182, 212, 0.16)"
                  stroke="#06b6d4"
                  strokeWidth="1.8"
                  className="drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]"
                />

                {/* Corner Accent Brackets for Military/Tactical Feel */}
                {viewportPoly && viewportPoly.length === 4 && (
                  <>
                    {/* Top Left Bracket */}
                    <circle cx={viewportPoly[0][0]} cy={viewportPoly[0][1]} r={2.2} fill="#22d3ee" />
                    {/* Top Right Bracket */}
                    <circle cx={viewportPoly[1][0]} cy={viewportPoly[1][1]} r={2.2} fill="#22d3ee" />
                    {/* Bottom Right Bracket */}
                    <circle cx={viewportPoly[2][0]} cy={viewportPoly[2][1]} r={2.2} fill="#22d3ee" />
                    {/* Bottom Left Bracket */}
                    <circle cx={viewportPoly[3][0]} cy={viewportPoly[3][1]} r={2.2} fill="#22d3ee" />
                  </>
                )}
              </g>
            )}

            {/* Center Reticle Crosshair */}
            {cameraCenter && (
              <g className="pointer-events-none">
                <line
                  x1={cameraCenter[0] - 5}
                  y1={cameraCenter[1]}
                  x2={cameraCenter[0] + 5}
                  y2={cameraCenter[1]}
                  stroke="#22d3ee"
                  strokeWidth="1.2"
                />
                <line
                  x1={cameraCenter[0]}
                  y1={cameraCenter[1] - 5}
                  x2={cameraCenter[0]}
                  y2={cameraCenter[1] + 5}
                  stroke="#22d3ee"
                  strokeWidth="1.2"
                />
                <circle
                  cx={cameraCenter[0]}
                  cy={cameraCenter[1]}
                  r={1.5}
                  fill="#ffffff"
                />
              </g>
            )}
          </svg>

          {/* Corner Aerospace HUD Brackets */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/40 pointer-events-none" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/40 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/40 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/40 pointer-events-none" />

          {/* Teleport Tip Watermark */}
          <div className="absolute bottom-1 right-1.5 pointer-events-none">
            <span className="text-[8px] font-bold text-slate-400/70 tracking-tight">
              CLICK TO TELEPORT
            </span>
          </div>
        </div>

        {/* --- Footer Mini Legend Strip --- */}
        <div className="px-2.5 py-1.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[9px] font-bold">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              Yard
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
              4×4
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
              Opp
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
              Task
            </span>
            <span className="flex items-center gap-1 text-teal-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
              Knock
            </span>
          </div>

          <span className="text-[8.5px] font-mono text-cyan-300 font-extrabold shrink-0 pl-1">
            BRISTOL
          </span>
        </div>

      </div>
    </div>
  );
}
