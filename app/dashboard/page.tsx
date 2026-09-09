'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sign, SignType, SignStatus } from '@/lib/types';
import {
  Filter,
  Download,
  Layers,
  Compass,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  User,
  ShieldAlert,
  Sun,
  Moon,
  Navigation,
  ExternalLink,
  X,
  Maximize2,
  Share2,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

// Bristol, CT Geo Center
const BRISTOL_CENTER: [number, number] = [-72.9460, 41.6730];

// Bristol AADT Corridors Data
const BRISTOL_TRAFFIC_CORRIDORS = [
  { name: 'Route 229 (Middle St / ESPN Corridor)', aadt: 28900, rating: 'Critical Arterial', color: '#f59e0b' },
  { name: 'Route 6 (Farmington Ave)', aadt: 24500, rating: 'High Priority', color: '#fbbf24' },
  { name: 'Route 72 (Pine St / School St)', aadt: 19800, rating: 'High Priority', color: '#38bdf8' },
  { name: 'King Street (CT-229 Connector)', aadt: 14200, rating: 'Moderate Flow', color: '#10b981' },
];

// Apple Maps Vector Styles (CARTO Positron for iOS Light, Dark Matter for iOS Dark)
const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

export default function DashboardPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);

  // Map & Controls State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [is3D, setIs3D] = useState(false);
  const [showWardBoundary, setShowWardBoundary] = useState(true);
  const [showTrafficCorridors, setShowTrafficCorridors] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'campaign' | 'competitor'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Fetch Signs Data
  useEffect(() => {
    fetchSigns();
  }, []);

  const fetchSigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('signs')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setSigns(data);
      } else {
        // Fallback seed signs for Bristol City Council pilot display
        setSigns([
          {
            id: '1',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6730,
            longitude: -72.9460,
            placed_by_name: 'Allen Hurley',
            sign_type: 'large_sign',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: '2',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6785,
            longitude: -72.9372,
            placed_by_name: 'Allen Hurley',
            sign_type: 'banner',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
          {
            id: '3',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6695,
            longitude: -72.9510,
            placed_by_name: 'Sarah Volunteer',
            sign_type: 'yard_sign',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          },
          {
            id: '4',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6742,
            longitude: -72.9415,
            placed_by_name: 'Sarah Volunteer',
            sign_type: 'yard_sign',
            is_competitor: true,
            competitor_name: 'Bob Reynolds',
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
          },
          {
            id: '5',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6850,
            longitude: -72.9250,
            placed_by_name: 'Dave K.',
            sign_type: 'billboard',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
          {
            id: '6',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6650,
            longitude: -72.9340,
            placed_by_name: 'Mike Johnson',
            sign_type: 'yard_sign',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Sign List
  const filteredSigns = useMemo(() => {
    return signs.filter((sign) => {
      if (typeFilter !== 'all' && sign.sign_type !== typeFilter) return false;
      if (statusFilter !== 'all' && sign.status !== statusFilter) return false;
      if (ownershipFilter === 'campaign' && sign.is_competitor) return false;
      if (ownershipFilter === 'competitor' && !sign.is_competitor) return false;
      if (
        searchQuery &&
        !sign.placed_by_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(sign.competitor_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [signs, typeFilter, statusFilter, ownershipFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalOurSigns = signs.filter((s) => !s.is_competitor && s.status === 'placed').length;
    const totalCompetitor = signs.filter((s) => s.is_competitor).length;
    const totalRetrieved = signs.filter((s) => s.status === 'retrieved').length;
    const largeAndBanners = signs.filter(
      (s) => !s.is_competitor && (s.sign_type === 'large_sign' || s.sign_type === 'banner' || s.sign_type === 'billboard')
    ).length;

    return { totalOurSigns, totalCompetitor, totalRetrieved, largeAndBanners };
  }, [signs]);

  // 2. Initialize MapLibre GL Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[theme],
        center: BRISTOL_CENTER,
        zoom: 13.2,
        pitch: is3D ? 50 : 0,
        bearing: 0,
        antialias: true,
        attributionControl: false,
      });

      map.on('load', () => {
        if (!isMounted) return;

        // Add 3D building extrusions if dark mode for Apple Maps night glow
        if (map.getSource('openmaptiles')) {
          map.addLayer({
            id: '3d-buildings',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': theme === 'dark' ? '#1f2937' : '#e2e8f0',
              'fill-extrusion-height': ['get', 'render_height'],
              'fill-extrusion-base': ['get', 'render_min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          });
        }

        // Add Bristol Traffic Arterial GeoJSON Lines
        map.addSource('bristol-corridors', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              // Route 229 ESPN Corridor
              {
                type: 'Feature',
                properties: { name: 'Route 229', color: '#f59e0b', aadt: '28.9k AADT' },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-72.9300, 41.6500],
                    [-72.9335, 41.6620],
                    [-72.9370, 41.6750],
                    [-72.9390, 41.6900],
                  ],
                },
              },
              // Route 6 (Farmington Ave)
              {
                type: 'Feature',
                properties: { name: 'Route 6', color: '#fbbf24', aadt: '24.5k AADT' },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-72.9750, 41.6820],
                    [-72.9550, 41.6780],
                    [-72.9350, 41.6750],
                    [-72.9150, 41.6720],
                  ],
                },
              },
              // Route 72
              {
                type: 'Feature',
                properties: { name: 'Route 72', color: '#38bdf8', aadt: '19.8k AADT' },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [-72.9520, 41.6580],
                    [-72.9460, 41.6710],
                    [-72.9410, 41.6820],
                  ],
                },
              },
            ],
          },
        });

        // Arterial glow outline
        map.addLayer({
          id: 'corridors-glow',
          type: 'line',
          source: 'bristol-corridors',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: showTrafficCorridors ? 'visible' : 'none',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 8,
            'line-opacity': theme === 'dark' ? 0.35 : 0.25,
            'line-blur': 4,
          },
        });

        // Arterial core line
        map.addLayer({
          id: 'corridors-core',
          type: 'line',
          source: 'bristol-corridors',
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: showTrafficCorridors ? 'visible' : 'none',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3.5,
            'line-opacity': 0.9,
          },
        });

        // Bristol Ward Boundary MultiPolygon
        map.addSource('bristol-boundary', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-72.9680, 41.6950],
                  [-72.9180, 41.6900],
                  [-72.9120, 41.6550],
                  [-72.9450, 41.6480],
                  [-72.9750, 41.6620],
                  [-72.9680, 41.6950],
                ],
              ],
            },
          },
        });

        map.addLayer({
          id: 'ward-fill',
          type: 'fill',
          source: 'bristol-boundary',
          layout: { visibility: showWardBoundary ? 'visible' : 'none' },
          paint: {
            'fill-color': theme === 'dark' ? '#0284c7' : '#38bdf8',
            'fill-opacity': theme === 'dark' ? 0.08 : 0.05,
          },
        });

        map.addLayer({
          id: 'ward-line',
          type: 'line',
          source: 'bristol-boundary',
          layout: { visibility: showWardBoundary ? 'visible' : 'none' },
          paint: {
            'line-color': theme === 'dark' ? '#38bdf8' : '#0284c7',
            'line-width': 2,
            'line-dasharray': [3, 2],
            'line-opacity': 0.7,
          },
        });
      });

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [theme]);

  // 3. Toggle Layers Visibility in MapLibre
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('ward-fill') && map.getLayer('ward-line')) {
      const vis = showWardBoundary ? 'visible' : 'none';
      map.setLayoutProperty('ward-fill', 'visibility', vis);
      map.setLayoutProperty('ward-line', 'visibility', vis);
    }
    if (map.getLayer('corridors-core') && map.getLayer('corridors-glow')) {
      const vis = showTrafficCorridors ? 'visible' : 'none';
      map.setLayoutProperty('corridors-core', 'visibility', vis);
      map.setLayoutProperty('corridors-glow', 'visibility', vis);
    }
  }, [showWardBoundary, showTrafficCorridors]);

  // 4. Render Apple-Style Pin Markers on Map
  useEffect(() => {
    async function updateMarkers() {
      const map = mapInstanceRef.current;
      if (!map) return;

      const maplibregl = (await import('maplibre-gl')).default;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      filteredSigns.forEach((sign) => {
        // Create Apple-style DOM marker element
        const el = document.createElement('div');
        el.className = 'apple-pin-container cursor-pointer group';

        const isCompetitor = sign.is_competitor;
        const isSelected = selectedSign?.id === sign.id;
        const isBigSign = sign.sign_type === 'large_sign' || sign.sign_type === 'banner' || sign.sign_type === 'billboard';

        // Apple Maps pin styling
        el.innerHTML = `
          <div class="relative flex items-center justify-center animate-apple-drop transition-transform duration-300 hover:scale-125 ${
            isSelected ? 'scale-125 z-30' : 'z-10'
          }">
            ${
              !isCompetitor && !isSelected
                ? '<div class="absolute w-8 h-8 rounded-full bg-emerald-400/30 animate-ping pointer-events-none"></div>'
                : ''
            }
            <div class="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xl border-2 transition-all ${
              isCompetitor
                ? 'bg-gradient-to-tr from-rose-600 to-rose-400 text-white border-white/80 shadow-rose-500/50'
                : isBigSign
                ? 'bg-gradient-to-tr from-blue-600 to-sky-400 text-white border-white/80 shadow-blue-500/50'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white border-white/80 shadow-emerald-500/50'
            } ${isSelected ? 'ring-4 ring-offset-2 ring-emerald-500' : ''}">
              ${
                isCompetitor
                  ? 'VS'
                  : sign.sign_type === 'large_sign'
                  ? '4x4'
                  : sign.sign_type === 'banner'
                  ? '🚩'
                  : 'MB'
              }
            </div>
            <div class="w-1.5 h-1.5 rounded-full bg-black/40 mt-0.5 mx-auto blur-[1px]"></div>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(sign);
          map.flyTo({
            center: [Number(sign.longitude), Number(sign.latitude)],
            zoom: 15.5,
            pitch: is3D ? 55 : 0,
            duration: 900,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([Number(sign.longitude), Number(sign.latitude)])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    updateMarkers();
  }, [filteredSigns, selectedSign, is3D]);

  // Toggle 3D Perspective Tilt
  const toggle3D = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const next3D = !is3D;
    setIs3D(next3D);
    map.easeTo({
      pitch: next3D ? 55 : 0,
      bearing: next3D ? 20 : 0,
      duration: 1000,
    });
  };

  // Reset Map View to Bristol Center
  const recenterMap = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({
      center: BRISTOL_CENTER,
      zoom: 13.2,
      pitch: is3D ? 50 : 0,
      bearing: 0,
      duration: 1000,
    });
  };

  // One-Click CSV Export
  const exportToCSV = () => {
    const headers = ['Sign ID', 'Campaign', 'Sign Type', 'Is Competitor', 'Competitor Name', 'Latitude', 'Longitude', 'Placed By', 'Status', 'Created At'];
    const rows = filteredSigns.map((s) => [
      s.id, 'Melissa K. Brown', s.sign_type, s.is_competitor, s.competitor_name || '', s.latitude, s.longitude, `"${s.placed_by_name}"`, s.status, s.created_at,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `wardrunner_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // One-Click GeoJSON Export
  const exportToGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: filteredSigns.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(s.longitude), Number(s.latitude)] },
        properties: { ...s },
      })),
    };
    const link = document.createElement('a');
    link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
    link.download = `wardrunner_map_${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen relative flex flex-col font-sans transition-colors duration-500 overflow-hidden ${isDark ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* ===================================================================== */}
      {/* 1. APPLE MAPS FLOATING GLASS TOP NAVIGATION BAR                      */}
      {/* ===================================================================== */}
      <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Glass Capsule */}
          <div className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-3xl backdrop-blur-2xl border shadow-xl transition-all duration-300 ${
            isDark
              ? 'bg-zinc-900/80 border-white/10 shadow-black/40 text-white'
              : 'bg-white/85 border-black/10 shadow-slate-200/80 text-slate-900'
          }`}>
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-emerald-500/30">
              WR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-tight">WardRunner</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Bristol Pilot
                </span>
              </div>
              <p className="text-[11px] opacity-60">Melissa K. Brown • Lead: Allen Hurley</p>
            </div>
          </div>

          {/* Center Apple-Style KPI Quick Pill */}
          <div className={`hidden md:flex pointer-events-auto items-center gap-5 px-5 py-2.5 rounded-3xl backdrop-blur-2xl border shadow-xl ${
            isDark ? 'bg-zinc-900/80 border-white/10' : 'bg-white/85 border-black/10'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold">Our Signs:</span>
              <span className="text-sm font-black text-emerald-400">{stats.totalOurSigns}</span>
            </div>
            <div className="h-4 w-[1px] bg-zinc-500/30" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-xs font-semibold">Competitor Intel:</span>
              <span className="text-sm font-black text-rose-400">{stats.totalCompetitor}</span>
            </div>
            <div className="h-4 w-[1px] bg-zinc-500/30" />
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold">Arterials:</span>
              <span className="text-sm font-black text-amber-400">{stats.largeAndBanners}</span>
            </div>
          </div>

          {/* Right Floating Controls: Apple Segmented Theme Switcher & Actions */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Apple iOS Segmented Theme Pill */}
            <div className={`p-1 rounded-2xl backdrop-blur-2xl border shadow-xl flex items-center gap-1 transition ${
              isDark ? 'bg-zinc-900/80 border-white/10' : 'bg-white/85 border-black/10'
            }`}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                title="Apple Maps Light Theme"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !isDark
                    ? 'bg-white text-slate-950 shadow-md scale-105'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="Apple Maps Dark OLED Theme"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-zinc-800 text-white shadow-md scale-105'
                    : 'text-zinc-500 hover:text-slate-950'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Dark</span>
              </button>
            </div>

            {/* Filter Drawer Trigger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2.5 rounded-2xl backdrop-blur-2xl border shadow-xl flex items-center gap-2 text-xs font-bold transition active:scale-95 ${
                sidebarOpen
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30'
                  : isDark
                  ? 'bg-zinc-900/80 border-white/10 text-white hover:bg-zinc-800'
                  : 'bg-white/85 border-black/10 text-slate-900 hover:bg-white'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Layers & Filters</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. FULL-SCREEN INTERACTIVE MAP CANVAS (MapLibre GL Vector Engine)     */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full h-screen relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Apple Maps Compass & View Controls (Right Rail) */}
        <div className="absolute right-4 top-24 z-10 flex flex-col gap-2 pointer-events-auto">
          <div className={`p-1 rounded-2xl backdrop-blur-2xl border shadow-2xl flex flex-col items-center gap-1 ${
            isDark ? 'bg-zinc-900/80 border-white/10' : 'bg-white/85 border-black/10'
          }`}>
            <button
              onClick={recenterMap}
              title="Recenter on Bristol, CT"
              className="p-2.5 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-400 active:scale-90 transition"
            >
              <Navigation className="w-4 h-4" />
            </button>
            <div className="w-5 h-[1px] bg-zinc-500/20" />
            <button
              onClick={toggle3D}
              title="Toggle 3D Perspective Tilt"
              className={`p-2.5 rounded-xl text-xs font-black transition active:scale-90 ${
                is3D ? 'text-emerald-400 bg-emerald-500/20' : 'hover:bg-zinc-500/20'
              }`}
            >
              3D
            </button>
            <div className="w-5 h-[1px] bg-zinc-500/20" />
            <button
              onClick={() => mapInstanceRef.current?.zoomIn()}
              title="Zoom In"
              className="p-2.5 rounded-xl hover:bg-zinc-500/20 text-base font-bold active:scale-90 transition leading-none"
            >
              +
            </button>
            <button
              onClick={() => mapInstanceRef.current?.zoomOut()}
              title="Zoom Out"
              className="p-2.5 rounded-xl hover:bg-zinc-500/20 text-base font-bold active:scale-90 transition leading-none"
            >
              -
            </button>
          </div>

          {/* Quick Layer Toggles Glass Stack */}
          <div className={`p-1.5 rounded-2xl backdrop-blur-2xl border shadow-2xl flex flex-col gap-1.5 ${
            isDark ? 'bg-zinc-900/80 border-white/10' : 'bg-white/85 border-black/10'
          }`}>
            <button
              onClick={() => setShowWardBoundary(!showWardBoundary)}
              title="Toggle Ward MultiPolygon Boundary"
              className={`p-2 rounded-xl text-xs flex items-center justify-center transition ${
                showWardBoundary ? 'bg-sky-500/20 text-sky-400 font-bold' : 'text-zinc-500'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTrafficCorridors(!showTrafficCorridors)}
              title="Toggle AADT Arterial Traffic Heat"
              className={`p-2 rounded-xl text-xs flex items-center justify-center transition ${
                showTrafficCorridors ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-zinc-500'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Apple Maps Place Inspection Card (Bottom Left Slide-Up) */}
        {selectedSign && (
          <div className="absolute bottom-6 left-4 z-20 w-80 sm:w-96 max-w-[calc(100vw-32px)] animate-apple-drop">
            <div className={`p-4 rounded-3xl backdrop-blur-2xl border shadow-2xl relative overflow-hidden ${
              isDark ? 'bg-zinc-900/90 border-white/10 text-white' : 'bg-white/90 border-black/10 text-slate-950'
            }`}>
              {/* Close Button */}
              <button
                onClick={() => setSelectedSign(null)}
                className="absolute top-3.5 right-3.5 p-1 rounded-full bg-zinc-500/20 hover:bg-zinc-500/40 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shrink-0 ${
                  selectedSign.is_competitor
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                }`}>
                  {selectedSign.is_competitor ? 'VS' : selectedSign.sign_type === 'large_sign' ? '4x4' : '🏡'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                      selectedSign.is_competitor
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {selectedSign.is_competitor ? 'Competitor Placement' : 'Official Brown Sign'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base mt-1 text-white">
                    {selectedSign.is_competitor ? selectedSign.competitor_name : 'Melissa K. Brown'}
                  </h3>
                  <p className="text-xs text-zinc-400 capitalize">
                    {selectedSign.sign_type.replace('_', ' ')} • Status: <span className="text-emerald-400 font-semibold">{selectedSign.status}</span>
                  </p>
                </div>
              </div>

              {/* Placed by Details & GPS */}
              <div className="mt-3.5 pt-3 border-t border-zinc-500/20 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Placed By</span>
                  <span className="font-semibold text-zinc-300">{selectedSign.placed_by_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">GPS Pin</span>
                  <span className="font-mono text-zinc-400">
                    {Number(selectedSign.latitude).toFixed(4)}, {Number(selectedSign.longitude).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Action: Open Turn-by-Turn in Apple Maps or Google Maps */}
              <div className="mt-4 flex items-center gap-2">
                <a
                  href={`https://maps.apple.com/?daddr=${selectedSign.latitude},${selectedSign.longitude}&q=Sign+Placement`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Route in Apple Maps
                </a>
                <button
                  onClick={() => setSelectedSign(null)}
                  className="py-2.5 px-3 rounded-2xl bg-zinc-500/15 hover:bg-zinc-500/25 text-xs font-semibold text-zinc-300 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Apple Maps Legend (Bottom Right) */}
        <div className="absolute bottom-6 right-4 z-10 hidden sm:block">
          <div className={`p-3 rounded-2xl backdrop-blur-2xl border shadow-xl text-xs space-y-2 ${
            isDark ? 'bg-zinc-900/80 border-white/10 text-zinc-300' : 'bg-white/85 border-black/10 text-slate-800'
          }`}>
            <p className="font-bold text-[10px] uppercase tracking-wider opacity-60">Apple Map Layers</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
              <span>Melissa Brown (Yard Signs)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500" />
              <span>4x4s & Overpass Banners</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
              <span>Competitor Sightings</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-500/20">
              <span className="w-4 h-1 rounded bg-amber-400" />
              <span>AADT Arterial Corridors</span>
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* 3. APPLE iOS SLIDE-OVER CONTROL DRAWER (Filters & Inventory Feed)    */}
      {/* ===================================================================== */}
      {sidebarOpen && (
        <aside className={`fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] shadow-2xl flex flex-col backdrop-blur-3xl animate-fadeIn ${
          isDark ? 'bg-zinc-950/95 border-l border-white/10 text-white' : 'bg-white/95 border-l border-black/10 text-slate-900'
        }`}>
          {/* Drawer Header */}
          <div className="p-5 border-b border-zinc-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-base">Campaign Operations</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl bg-zinc-500/15 hover:bg-zinc-500/25 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search volunteer or opponent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-11 pl-10 pr-4 rounded-2xl border text-sm focus:outline-none transition ${
                  isDark
                    ? 'bg-zinc-900 border-white/10 text-white focus:border-emerald-500'
                    : 'bg-slate-100 border-black/10 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Ownership Segmented Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Ownership Category
              </label>
              <div className={`grid grid-cols-3 gap-1 p-1 rounded-2xl border ${
                isDark ? 'bg-zinc-900 border-white/10' : 'bg-slate-100 border-black/10'
              }`}>
                <button
                  onClick={() => setOwnershipFilter('all')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    ownershipFilter === 'all'
                      ? isDark ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({signs.length})
                </button>
                <button
                  onClick={() => setOwnershipFilter('campaign')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    ownershipFilter === 'campaign'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Brown
                </button>
                <button
                  onClick={() => setOwnershipFilter('competitor')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    ownershipFilter === 'competitor'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Opponents
                </button>
              </div>
            </div>

            {/* Sign Type Dropdown */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Sign Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`w-full h-11 px-3 rounded-2xl border text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-slate-100 border-black/10 text-slate-900'
                  }`}
                >
                  <option value="all">All Types</option>
                  <option value="yard_sign">Yard Signs</option>
                  <option value="large_sign">4x4 Roadside</option>
                  <option value="banner">Overpass Banners</option>
                  <option value="billboard">Billboards</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full h-11 px-3 rounded-2xl border text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-slate-100 border-black/10 text-slate-900'
                  }`}
                >
                  <option value="all">All Statuses</option>
                  <option value="placed">Active Placed</option>
                  <option value="retrieved">Retrieved</option>
                  <option value="needs_repair">Needs Repair</option>
                </select>
              </div>
            </div>

            {/* Bristol AADT Traffic Corridor Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Bristol High-AADT Arterials
                </label>
                <span className="text-[10px] text-zinc-400">Voter Eyeballs / Day</span>
              </div>
              <div className="space-y-2">
                {BRISTOL_TRAFFIC_CORRIDORS.map((corr) => (
                  <div
                    key={corr.name}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                      isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-slate-100 border-black/10'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{corr.name}</p>
                      <p className="text-[10px] text-zinc-400">{corr.rating}</p>
                    </div>
                    <span className="font-mono text-xs font-black text-amber-400">
                      {corr.aadt.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory List */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Placement Inventory ({filteredSigns.length})
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredSigns.map((sign) => (
                  <div
                    key={sign.id}
                    onClick={() => {
                      setSelectedSign(sign);
                      mapInstanceRef.current?.flyTo({
                        center: [Number(sign.longitude), Number(sign.latitude)],
                        zoom: 15.5,
                        pitch: is3D ? 55 : 0,
                        duration: 800,
                      });
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      selectedSign?.id === sign.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isDark
                        ? 'bg-zinc-900/60 border-white/10 hover:border-white/30'
                        : 'bg-slate-100 border-black/10 hover:border-black/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">
                        {sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        sign.is_competitor ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {sign.sign_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      By {sign.placed_by_name} • {new Date(sign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Footer with Export Actions */}
          <div className="p-5 border-t border-zinc-500/20 grid grid-cols-2 gap-3">
            <button
              onClick={exportToCSV}
              className="py-3 px-4 rounded-2xl border border-zinc-500/30 hover:bg-zinc-500/15 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={exportToGeoJSON}
              className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Export GeoJSON
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
