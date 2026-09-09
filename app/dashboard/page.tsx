'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sign } from '@/lib/types';
import {
  Download,
  Layers,
  TrendingUp,
  RefreshCw,
  Search,
  Sun,
  Moon,
  Navigation,
  X,
  SlidersHorizontal,
  MapPin,
  Activity,
  Shield,
  Clock,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

/* ================================================================
   CONSTANTS
   ================================================================ */
const BRISTOL_CENTER: [number, number] = [-72.9460, 41.6730];

const SIGN_TYPE_META: Record<string, { emoji: string; label: string; short: string }> = {
  yard_sign:  { emoji: '🏡', label: 'Yard Sign',    short: 'Yard' },
  large_sign: { emoji: '📐', label: 'Large 4×4',    short: '4×4' },
  banner:     { emoji: '🚩', label: 'Banner',       short: 'Ban' },
  billboard:  { emoji: '🏢', label: 'Billboard',    short: 'Bill' },
};

const AADT_CORRIDORS = [
  { name: 'Route 229 — ESPN Corridor',   aadt: 28900, pct: 100, color: '#f59e0b' },
  { name: 'Route 6 — Farmington Ave',    aadt: 24500, pct: 85,  color: '#fbbf24' },
  { name: 'Route 72 — Pine St / School', aadt: 19800, pct: 68,  color: '#38bdf8' },
  { name: 'King St — CT-229 Connector',  aadt: 14200, pct: 49,  color: '#10b981' },
];

const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

/* ================================================================
   SEED DATA (used until Supabase returns rows)
   ================================================================ */
const SEED_SIGNS: Sign[] = [
  { id: '1', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6730, longitude: -72.9460, placed_by_name: 'Allen Hurley',    sign_type: 'large_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6785, longitude: -72.9372, placed_by_name: 'Allen Hurley',    sign_type: 'banner',     is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: '3', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6695, longitude: -72.9510, placed_by_name: 'Sarah Volunteer',  sign_type: 'yard_sign',  is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: '4', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6742, longitude: -72.9415, placed_by_name: 'Sarah Volunteer',  sign_type: 'yard_sign',  is_competitor: true, competitor_name: 'Bob Reynolds', status: 'placed', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: '5', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6850, longitude: -72.9250, placed_by_name: 'Dave K.',          sign_type: 'billboard',  is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: '6', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6650, longitude: -72.9340, placed_by_name: 'Mike Johnson',     sign_type: 'yard_sign',  is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '7', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6810, longitude: -72.9490, placed_by_name: 'Allen Hurley',    sign_type: 'yard_sign',  is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 1).toISOString() },
  { id: '8', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 41.6660, longitude: -72.9280, placed_by_name: 'Dave K.',          sign_type: 'large_sign', is_competitor: true, competitor_name: 'Common Sense Slate', status: 'placed', created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
];

/* ================================================================
   COMPONENT
   ================================================================ */
export default function DashboardPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [is3D, setIs3D] = useState(false);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'ours' | 'theirs'>('all');
  const [searchQ, setSearchQ] = useState('');

  /* ---------- Data Fetching ---------- */
  useEffect(() => { fetchSigns(); }, []);

  const fetchSigns = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('signs').select('*').order('created_at', { ascending: false });
      setSigns(data && data.length > 0 ? data : SEED_SIGNS);
    } catch { setSigns(SEED_SIGNS); } finally { setLoading(false); }
  };

  /* ---------- Derived ---------- */
  const filtered = useMemo(() => signs.filter(s => {
    if (typeFilter !== 'all' && s.sign_type !== typeFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (ownerFilter === 'ours' && s.is_competitor) return false;
    if (ownerFilter === 'theirs' && !s.is_competitor) return false;
    if (searchQ && !s.placed_by_name.toLowerCase().includes(searchQ.toLowerCase()) && !(s.competitor_name || '').toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [signs, typeFilter, statusFilter, ownerFilter, searchQ]);

  const stats = useMemo(() => ({
    ours:       signs.filter(s => !s.is_competitor && s.status === 'placed').length,
    theirs:     signs.filter(s => s.is_competitor).length,
    retrieved:  signs.filter(s => s.status === 'retrieved').length,
    highImpact: signs.filter(s => !s.is_competitor && ['large_sign', 'banner', 'billboard'].includes(s.sign_type)).length,
    total:      signs.length,
  }), [signs]);

  const isDark = theme === 'dark';

  /* ---------- Map Initialization ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!mapContainerRef.current) return;
      const mgl = (await import('maplibre-gl')).default;
      if (mapRef.current) mapRef.current.remove();

      const map = new mgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[theme],
        center: BRISTOL_CENTER,
        zoom: 13.2,
        pitch: is3D ? 52 : 0,
        bearing: is3D ? -15 : 0,
        attributionControl: false,
      } as any);

      map.addControl(new mgl.AttributionControl({ compact: true }), 'bottom-left');

      map.on('load', () => {
        if (!alive) return;

        /* --- AADT corridor glow lines --- */
        map.addSource('corridors', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', properties: { name: 'Route 229', color: '#f59e0b' }, geometry: { type: 'LineString', coordinates: [[-72.930, 41.650], [-72.934, 41.662], [-72.937, 41.675], [-72.939, 41.690]] } },
              { type: 'Feature', properties: { name: 'Route 6',   color: '#fbbf24' }, geometry: { type: 'LineString', coordinates: [[-72.975, 41.682], [-72.955, 41.678], [-72.935, 41.675], [-72.915, 41.672]] } },
              { type: 'Feature', properties: { name: 'Route 72',  color: '#38bdf8' }, geometry: { type: 'LineString', coordinates: [[-72.952, 41.658], [-72.946, 41.671], [-72.941, 41.682]] } },
            ],
          } as any,
        });
        map.addLayer({ id: 'corridor-glow', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 14, 'line-opacity': isDark ? 0.18 : 0.12, 'line-blur': 8 } });
        map.addLayer({ id: 'corridor-core', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.85 } });
        map.addLayer({ id: 'corridor-dash', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': isDark ? 0.15 : 0.25, 'line-dasharray': [2, 4] } });

        /* --- Ward boundary polygon --- */
        map.addSource('boundary', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-72.968, 41.695], [-72.918, 41.690], [-72.912, 41.655], [-72.945, 41.648], [-72.975, 41.662], [-72.968, 41.695]]] } } as any,
        });
        map.addLayer({ id: 'boundary-fill', type: 'fill', source: 'boundary', paint: { 'fill-color': isDark ? '#0ea5e9' : '#0284c7', 'fill-opacity': isDark ? 0.06 : 0.04 } });
        map.addLayer({ id: 'boundary-line', type: 'line', source: 'boundary', paint: { 'line-color': isDark ? '#38bdf8' : '#0284c7', 'line-width': 2.5, 'line-dasharray': [4, 3], 'line-opacity': 0.6 } });
      });

      map.on('click', () => setSelectedSign(null));
      mapRef.current = map;
    })();

    return () => { alive = false; mapRef.current?.remove(); mapRef.current = null; };
  }, [theme]);

  /* ---------- Layer Visibility ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m?.isStyleLoaded?.()) return;
    const bVis = showBoundary ? 'visible' : 'none';
    const cVis = showCorridors ? 'visible' : 'none';
    ['boundary-fill', 'boundary-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', bVis));
    ['corridor-glow', 'corridor-core', 'corridor-dash'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', cVis));
  }, [showBoundary, showCorridors]);

  /* ---------- Markers ---------- */
  useEffect(() => {
    (async () => {
      const m = mapRef.current;
      if (!m) return;
      const mgl = (await import('maplibre-gl')).default;

      markersRef.current.forEach(mk => mk.remove());
      markersRef.current = [];

      filtered.forEach((sign, i) => {
        const el = document.createElement('div');
        el.style.cssText = 'cursor:pointer;';
        const isComp = sign.is_competitor;
        const isBig  = ['large_sign', 'banner', 'billboard'].includes(sign.sign_type);
        const isSel  = selectedSign?.id === sign.id;
        const meta   = SIGN_TYPE_META[sign.sign_type] || { emoji: '📍', short: '?' };

        const grad = isComp
          ? 'from-rose-500 to-pink-600'
          : isBig
          ? 'from-blue-500 to-indigo-600'
          : 'from-emerald-400 to-teal-500';

        const shadow = isComp
          ? 'shadow-rose-500/40'
          : isBig
          ? 'shadow-blue-500/40'
          : 'shadow-emerald-500/40';

        const pulseColor = isComp ? 'rgba(244,63,94,0.35)' : 'rgba(16,185,129,0.35)';

        el.innerHTML = `
          <div class="animate-pin-drop" style="animation-delay:${i * 40}ms">
            <div class="relative flex flex-col items-center">
              ${!isComp && !isSel ? `<div class="absolute -inset-1 rounded-full animate-ripple" style="background:${pulseColor}"></div>` : ''}
              <div class="
                relative w-10 h-10 rounded-[14px] bg-gradient-to-br ${grad}
                flex items-center justify-center
                text-white text-[11px] font-extrabold tracking-tight
                shadow-lg ${shadow}
                border-[2.5px] border-white/90
                transition-all duration-200
                ${isSel ? 'scale-[1.3] ring-[3px] ring-white/60 ring-offset-2 ring-offset-transparent' : 'hover:scale-110'}
              " style="--pulse-color:${pulseColor}" >
                ${meta.short === '4×4' ? '4×4' : meta.short === 'Ban' ? '🚩' : isComp ? '⚔️' : meta.short === 'Bill' ? '🏢' : '✓'}
              </div>
              <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent ${
                isComp ? 'border-t-pink-600' : isBig ? 'border-t-indigo-600' : 'border-t-teal-500'
              } -mt-[1px]"></div>
              <div class="w-[6px] h-[6px] rounded-full bg-black/20 blur-[2px] mt-[2px]"></div>
            </div>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(sign);
          m.flyTo({ center: [Number(sign.longitude), Number(sign.latitude)], zoom: 15.8, pitch: is3D ? 55 : 0, duration: 800 });
        });

        const marker = new mgl.Marker({ element: el }).setLngLat([Number(sign.longitude), Number(sign.latitude)]).addTo(m);
        markersRef.current.push(marker);
      });
    })();
  }, [filtered, selectedSign, is3D]);

  /* ---------- Actions ---------- */
  const toggle3D = useCallback(() => {
    const m = mapRef.current; if (!m) return;
    const next = !is3D; setIs3D(next);
    m.easeTo({ pitch: next ? 55 : 0, bearing: next ? -15 : 0, duration: 800 });
  }, [is3D]);

  const recenter = useCallback(() => {
    mapRef.current?.flyTo({ center: BRISTOL_CENTER, zoom: 13.2, pitch: is3D ? 52 : 0, bearing: is3D ? -15 : 0, duration: 900 });
  }, [is3D]);

  const exportCSV = () => {
    const h = ['ID','Type','Competitor','Competitor Name','Lat','Lng','Placed By','Status','Date'];
    const rows = filtered.map(s => [s.id, s.sign_type, s.is_competitor, s.competitor_name||'', s.latitude, s.longitude, `"${s.placed_by_name}"`, s.status, s.created_at]);
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([h, ...rows].map(r => (r as any[]).join(',')).join('\n'));
    a.download = `wardrunner_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const exportGeoJSON = () => {
    const gj = { type: 'FeatureCollection', features: filtered.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+s.longitude, +s.latitude] }, properties: { id: s.id, sign_type: s.sign_type, is_competitor: s.is_competitor, competitor_name: s.competitor_name, placed_by: s.placed_by_name, status: s.status, created_at: s.created_at } })) };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gj, null, 2));
    a.download = `wardrunner_${new Date().toISOString().slice(0,10)}.geojson`;
    a.click();
  };

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className={`h-screen w-screen overflow-hidden relative font-sans transition-colors duration-500 ${isDark ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* ============================================================
          FULL-BLEED MAP CANVAS
          ============================================================ */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* ============================================================
          TOP FLOATING BAR
          ============================================================ */}
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none p-3 sm:p-4">
        <div className="max-w-[1600px] mx-auto flex items-start justify-between gap-3">

          {/* — Brand Capsule — */}
          <div className="pointer-events-auto glass rounded-2xl px-4 py-2.5 flex items-center gap-3 animate-slide-up">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white font-black text-sm">WR</span>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-tight">WardRunner</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">LIVE</span>
              </div>
              <p className="text-[11px] opacity-50 leading-none mt-0.5">Melissa K. Brown • Bristol City Council</p>
            </div>
          </div>

          {/* — KPI Pills — */}
          <div className="hidden lg:flex pointer-events-auto glass rounded-2xl px-1 py-1 items-center gap-1 animate-slide-up" style={{ animationDelay: '80ms' }}>
            {[
              { label: 'Our Signs', value: stats.ours, color: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-emerald-400/40' },
              { label: 'Competitor', value: stats.theirs, color: 'text-rose-400', dot: 'bg-rose-400', glow: 'shadow-rose-400/40' },
              { label: 'Arterials', value: stats.highImpact, color: 'text-sky-400', dot: 'bg-sky-400', glow: 'shadow-sky-400/40' },
            ].map((kpi, i) => (
              <div key={kpi.label} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl ${i === 0 ? '' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${kpi.dot} shadow-md ${kpi.glow}`} />
                <span className="text-[11px] font-medium opacity-60">{kpi.label}</span>
                <span className={`text-sm font-black ${kpi.color} animate-count-up`} style={{ animationDelay: `${200 + i * 100}ms` }}>{kpi.value}</span>
              </div>
            ))}
          </div>

          {/* — Right Controls — */}
          <div className="pointer-events-auto flex items-center gap-2 animate-slide-up" style={{ animationDelay: '160ms' }}>
            {/* Theme Toggle */}
            <div className="glass rounded-2xl p-1 flex items-center">
              <button onClick={() => setTheme('light')} className={`p-2 rounded-xl transition-all duration-300 ${!isDark ? 'bg-white dark:bg-zinc-800 shadow-md text-amber-500 scale-105' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <Sun className="w-4 h-4" />
              </button>
              <button onClick={() => setTheme('dark')} className={`p-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-zinc-800 shadow-md text-sky-400 scale-105' : 'text-zinc-400 hover:text-zinc-800'}`}>
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Toggle */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`glass rounded-2xl p-2.5 transition-all duration-300 ${drawerOpen ? 'bg-emerald-500 !border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : 'hover:scale-105'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          RIGHT-RAIL MAP CONTROLS (Apple Maps style)
          ============================================================ */}
      <div className="absolute right-3 sm:right-4 top-20 z-10 flex flex-col gap-2 pointer-events-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
        {/* Navigation Stack */}
        <div className="glass rounded-2xl p-1 flex flex-col items-center">
          <button onClick={recenter} title="Recenter Bristol" className="p-2.5 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-400 active:scale-90 transition-all">
            <Navigation className="w-4 h-4" />
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button onClick={toggle3D} title="3D Perspective" className={`p-2.5 rounded-xl text-xs font-black transition-all active:scale-90 ${is3D ? 'text-emerald-400 bg-emerald-500/15' : 'hover:bg-white/10'}`}>
            3D
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button onClick={() => mapRef.current?.zoomIn()} className="p-2.5 rounded-xl hover:bg-white/10 text-sm font-bold active:scale-90 transition-all leading-none">+</button>
          <button onClick={() => mapRef.current?.zoomOut()} className="p-2.5 rounded-xl hover:bg-white/10 text-sm font-bold active:scale-90 transition-all leading-none">−</button>
        </div>

        {/* Layer Toggles */}
        <div className="glass rounded-2xl p-1 flex flex-col items-center gap-0.5">
          <button onClick={() => setShowBoundary(!showBoundary)} title="Ward Boundary" className={`p-2 rounded-xl transition-all ${showBoundary ? 'bg-sky-500/15 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <Layers className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCorridors(!showCorridors)} title="AADT Corridors" className={`p-2 rounded-xl transition-all ${showCorridors ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
          BOTTOM-LEFT: MAP LEGEND
          ============================================================ */}
      <div className="absolute bottom-4 left-3 sm:left-4 z-10 hidden sm:block pointer-events-auto animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="glass rounded-2xl p-3.5 space-y-2.5 min-w-[180px]">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] opacity-40">Map Legend</p>
          {[
            { color: 'bg-gradient-to-r from-emerald-400 to-teal-500', label: 'Melissa Brown — Yard' },
            { color: 'bg-gradient-to-r from-blue-500 to-indigo-600', label: '4×4s, Banners & Billboards' },
            { color: 'bg-gradient-to-r from-rose-500 to-pink-600', label: 'Competitor Placements' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-[4px] ${item.color} shadow-sm`} />
              <span className="text-[11px] font-medium opacity-70">{item.label}</span>
            </div>
          ))}
          <div className={`pt-2 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-[3px] rounded-full bg-amber-400" />
              <span className="text-[11px] font-medium opacity-70">AADT Traffic Corridors</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SELECTED SIGN — INSPECTION CARD (Bottom Center slide-up)
          ============================================================ */}
      {selectedSign && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[380px] max-w-[calc(100vw-32px)] pointer-events-auto animate-slide-up">
          <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden">
            {/* Accent edge */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${selectedSign.is_competitor ? 'from-rose-500 to-pink-500' : 'from-emerald-400 to-teal-400'}`} />

            <button onClick={() => setSelectedSign(null)} className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
              <X className="w-3.5 h-3.5 opacity-50" />
            </button>

            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedSign.is_competitor ? 'from-rose-500 to-pink-600' : 'from-emerald-400 to-teal-500'} flex items-center justify-center text-2xl shadow-lg ${selectedSign.is_competitor ? 'shadow-rose-500/30' : 'shadow-emerald-500/30'}`}>
                {SIGN_TYPE_META[selectedSign.sign_type]?.emoji || '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${selectedSign.is_competitor ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {selectedSign.is_competitor ? 'Opponent Sighting' : 'Official Campaign'}
                </span>
                <h3 className="font-extrabold text-base mt-1 truncate">
                  {selectedSign.is_competitor ? selectedSign.competitor_name : 'Melissa K. Brown'}
                </h3>
                <p className="text-xs opacity-50 capitalize mt-0.5">
                  {selectedSign.sign_type.replace('_', ' ')} · <span className="text-emerald-400 font-semibold">{selectedSign.status}</span> · {relativeTime(selectedSign.created_at)}
                </p>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/8'} grid grid-cols-2 gap-3 text-xs`}>
              <div>
                <span className="text-[9px] uppercase font-bold opacity-30 block">Placed By</span>
                <span className="font-semibold mt-0.5 block">{selectedSign.placed_by_name}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold opacity-30 block">GPS</span>
                <span className="font-mono opacity-60 mt-0.5 block">{Number(selectedSign.latitude).toFixed(5)}, {Number(selectedSign.longitude).toFixed(5)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={`https://maps.apple.com/?daddr=${selectedSign.latitude},${selectedSign.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
              <button onClick={() => setSelectedSign(null)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          iOS-STYLE SLIDE-OVER DRAWER
          ============================================================ */}
      {drawerOpen && (
        <>
          {/* Scrim */}
          <div className="absolute inset-0 z-30 bg-black/20 animate-fade-in" onClick={() => setDrawerOpen(false)} />

          <aside className={`absolute inset-y-0 right-0 z-40 w-full sm:w-[400px] flex flex-col animate-slide-in-right ${isDark ? 'bg-zinc-950/95 border-l border-white/[0.06]' : 'bg-white/95 border-l border-black/[0.06]'}`} style={{ backdropFilter: 'saturate(200%) blur(40px)', WebkitBackdropFilter: 'saturate(200%) blur(40px)' }}>

            {/* Drawer Header */}
            <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Campaign Intel</h2>
                  <p className="text-[11px] opacity-40">{filtered.length} placements visible</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                <input
                  type="text"
                  placeholder="Search volunteers or opponents…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className={`w-full h-10 pl-10 pr-4 rounded-xl border text-sm focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 focus:border-emerald-500/50 text-white placeholder:text-zinc-500' : 'bg-black/[0.03] border-black/10 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400'}`}
                />
              </div>

              {/* Owner Segment */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Ownership</label>
                <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                  {(['all', 'ours', 'theirs'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setOwnerFilter(v)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                        ownerFilter === v
                          ? v === 'theirs'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                            : v === 'ours'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                            : isDark ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow'
                          : 'opacity-50 hover:opacity-80'
                      }`}
                    >
                      {v === 'all' ? `All (${stats.total})` : v === 'ours' ? 'Brown' : 'Opponents'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type + Status Filters */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1.5 block">Sign Type</label>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/[0.03] border-black/10 text-slate-900'}`}>
                    <option value="all">All Types</option>
                    <option value="yard_sign">🏡 Yard Signs</option>
                    <option value="large_sign">📐 Large 4×4</option>
                    <option value="banner">🚩 Banners</option>
                    <option value="billboard">🏢 Billboards</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1.5 block">Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/[0.03] border-black/10 text-slate-900'}`}>
                    <option value="all">All Statuses</option>
                    <option value="placed">✅ Active</option>
                    <option value="retrieved">📦 Retrieved</option>
                    <option value="needs_repair">🔧 Needs Repair</option>
                  </select>
                </div>
              </div>

              {/* AADT Corridor Cards */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-amber-400">AADT Corridors</label>
                  <span className="text-[9px] opacity-30 font-mono">vehicles/day</span>
                </div>
                <div className="space-y-2 stagger-children">
                  {AADT_CORRIDORS.map(c => (
                    <div key={c.name} className={`p-3 rounded-xl border transition animate-fade-in ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold">{c.name}</span>
                        <span className="text-xs font-black font-mono" style={{ color: c.color }}>{c.aadt.toLocaleString()}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, background: `linear-gradient(90deg, ${c.color}, ${c.color}88)` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory Feed */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">
                  Inventory ({filtered.length})
                </label>
                <div className="space-y-1.5 stagger-children max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {filtered.map(sign => {
                    const meta = SIGN_TYPE_META[sign.sign_type] || { emoji: '📍', label: 'Sign' };
                    return (
                      <button
                        key={sign.id}
                        onClick={() => {
                          setSelectedSign(sign);
                          mapRef.current?.flyTo({ center: [+sign.longitude, +sign.latitude], zoom: 15.8, pitch: is3D ? 55 : 0, duration: 800 });
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all animate-fade-in ${
                          selectedSign?.id === sign.id
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : isDark
                            ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                            : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04] hover:border-black/[0.12]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{meta.emoji}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate">{sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}</span>
                                {sign.is_competitor && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400" />}
                              </div>
                              <p className="text-[10px] opacity-40 truncate">{sign.placed_by_name} · {relativeTime(sign.created_at)}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-md ${sign.is_competitor ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                            {meta.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className={`p-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'} grid grid-cols-2 gap-2`}>
              <button onClick={exportCSV} className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.97] ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}>
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={exportGeoJSON} className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all">
                <Download className="w-3.5 h-3.5" /> GeoJSON
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
