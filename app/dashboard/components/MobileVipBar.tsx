'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Target,
  Users,
  Footprints,
  Vote,
  ChevronUp,
  ChevronDown,
  Layers,
  Lock,
  Flame,
  Shield,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Building2,
  Navigation,
  CircleDot,
  X,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import type { Sign, SignType, CanvassRecord, VolunteerLocationPing, CanvassRoute } from '@/lib/types';
import type { PrecinctInfo } from '@/lib/precinctData';

interface MobileVipBarProps {
  stats: {
    total: number;
    ours: number;
    theirs: number;
    highImpact: number;
  };
  inventoryStats: {
    totalStock: number;
    totalPlaced: number;
  };
  canvassRecords: CanvassRecord[];
  volunteerPings: VolunteerLocationPing[];
  routes: CanvassRoute[];
  precincts: PrecinctInfo[];
  signs: Sign[];
  showSignsLayer: boolean;
  setShowSignsLayer: (v: boolean) => void;
  ownerFilter: 'all' | 'ours' | 'theirs';
  setOwnerFilter: (v: 'all' | 'ours' | 'theirs') => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  showPrecincts: boolean;
  setShowPrecincts: (v: boolean) => void;
  showCanvassLayer: boolean;
  setShowCanvassLayer: (v: boolean) => void;
  showFieldForceLayer: boolean;
  setShowFieldForceLayer: (v: boolean) => void;
  showRoutesLayer: boolean;
  setShowRoutesLayer: (v: boolean) => void;
  showHeatmap?: boolean;
  setShowHeatmap?: (v: boolean) => void;
  showBoundary?: boolean;
  setShowBoundary?: (v: boolean) => void;
  useDotMode?: boolean;
  setUseDotMode?: (v: boolean) => void;
  onRecenter?: () => void;
  onToggle3D?: () => void;
  is3D?: boolean;
  onToggleOrbit?: () => void;
  isOrbiting?: boolean;
  onOpenBristolFacts?: () => void;
  onSelectPrecinct: (p: PrecinctInfo) => void;
  onFlyToPrecinct: (p: PrecinctInfo) => void;
  onLock: () => void;
  isDark: boolean;
}

export default function MobileVipBar({
  stats,
  inventoryStats,
  canvassRecords,
  volunteerPings,
  routes,
  precincts,
  signs,
  showSignsLayer,
  setShowSignsLayer,
  ownerFilter,
  setOwnerFilter,
  typeFilter,
  setTypeFilter,
  showPrecincts,
  setShowPrecincts,
  showCanvassLayer,
  setShowCanvassLayer,
  showFieldForceLayer,
  setShowFieldForceLayer,
  showRoutesLayer,
  setShowRoutesLayer,
  showHeatmap,
  setShowHeatmap,
  showBoundary,
  setShowBoundary,
  useDotMode,
  setUseDotMode,
  onRecenter,
  onToggle3D,
  is3D,
  onToggleOrbit,
  isOrbiting,
  onOpenBristolFacts,
  onSelectPrecinct,
  onFlyToPrecinct,
  onLock,
  isDark,
}: MobileVipBarProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick_filters' | 'precinct_intel' | 'field_pulse'>('quick_filters');

  const activeVolunteersCount = volunteerPings.filter(p => p.is_active).length;
  const contactsCount = canvassRecords.filter(r => r.result === 'contact').length;
  const contactRate = canvassRecords.length > 0 ? Math.round((contactsCount / canvassRecords.length) * 100) : 0;

  // Field Ops & Turf Routes unified state
  const isFieldOpsActive = showFieldForceLayer || showRoutesLayer;

  // Active layers counter for badge (Field Ops counted as single cohesive layer)
  const activeLayersCount = [
    showSignsLayer && (ownerFilter === 'ours' || ownerFilter === 'all'),
    showSignsLayer && (ownerFilter === 'theirs' || ownerFilter === 'all'),
    showCanvassLayer,
    isFieldOpsActive,
    showPrecincts,
    showBoundary,
    showHeatmap,
  ].filter(Boolean).length;

  // Toggle helpers for single-tap VIP switches
  const toggleFieldOps = () => {
    if (isFieldOpsActive) {
      setShowFieldForceLayer(false);
      setShowRoutesLayer(false);
    } else {
      setShowFieldForceLayer(true);
      setShowRoutesLayer(true);
    }
  };

  const toggleOurSigns = () => {
    if (!(showSignsLayer && ownerFilter === 'ours')) {
      setShowSignsLayer(true);
      setOwnerFilter('ours');
      setUseDotMode?.(false);
    } else if (!useDotMode) {
      setUseDotMode?.(true);
    } else {
      setShowSignsLayer(false);
      setOwnerFilter('all');
      setUseDotMode?.(false);
    }
  };

  const toggleCompetitorSigns = () => {
    if (!(showSignsLayer && ownerFilter === 'theirs')) {
      setShowSignsLayer(true);
      setOwnerFilter('theirs');
      setUseDotMode?.(false);
    } else if (!useDotMode) {
      setUseDotMode?.(true);
    } else {
      setShowSignsLayer(false);
      setOwnerFilter('all');
      setUseDotMode?.(false);
    }
  };

  return (
    <div className="md:hidden">
      {/* ============================================================
          1. TOP VIP EXECUTIVE PULSE STRIP (Sticky under status bar)
          ============================================================ */}
      <div className="absolute top-0 inset-x-0 z-30 pointer-events-none pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] px-3">
        <div className="flex items-center justify-between gap-2">
          {/* Brand Monogram */}
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-2.5 py-1.5 shadow-xl">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
              COS
            </div>
            <div className="flex items-center gap-1.5 pr-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-black tracking-wider text-white">VIP</span>
            </div>
          </div>

          {/* Quick Metrics Capsule */}
          <div id="tour-mobile-stats-hud" className="pointer-events-auto flex items-center gap-1 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-2 py-1 shadow-xl overflow-x-auto max-w-[210px] no-scrollbar">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 shrink-0">
              <span>🟢 {stats.ours}</span>
              <span className="text-[9px] font-medium text-emerald-400/70">Ours</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/20 text-[10px] font-bold text-rose-300 shrink-0">
              <span>🔴 {stats.theirs}</span>
              <span className="text-[9px] font-medium text-rose-400/70">Opp</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/20 text-[10px] font-bold text-teal-300 shrink-0">
              <span>🚪 {canvassRecords.length}</span>
              <span className="text-[9px] font-medium text-teal-400/70">Doors</span>
            </div>
          </div>

          {/* Lock Button */}
          <button
            onClick={onLock}
            className="pointer-events-auto w-9 h-9 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white shadow-xl active:scale-95 transition"
            title="Lock Dashboard"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ============================================================
          2. RIGHT-SIDE MOBILE CONTROL PALETTE (Icons Only, Clunky-Finger Spaced, Toggleable)
          ============================================================ */}
      <div className="absolute right-3 top-[188px] sm:top-20 z-30 flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* Navigation & Toggle Header Pod */}
        <div id="tour-mobile-nav-pod" className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-1 flex flex-col items-center shadow-2xl">
          {onRecenter && (
            <button
              onClick={onRecenter}
              title="Recenter Bristol"
              className="w-10 h-10 rounded-xl hover:bg-emerald-500/15 text-emerald-400 flex items-center justify-center active:scale-90 transition-all"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}

          {onToggle3D && (
            <>
              <div className="w-5 h-px bg-white/10 my-0.5" />
              <button
                onClick={onToggle3D}
                title="3D Perspective"
                className={`w-10 h-10 rounded-xl text-[11px] font-black flex items-center justify-center transition-all active:scale-90 ${
                  is3D && !isOrbiting ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                3D
              </button>
            </>
          )}

          {onToggleOrbit && (
            <>
              <div className="w-5 h-px bg-white/10 my-0.5" />
              <button
                onClick={onToggleOrbit}
                title={isOrbiting ? "Stop Orbit & Reset Default" : "3D Cinematic Orbit (Slow Rotate)"}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 relative ${
                  isOrbiting
                    ? 'text-cyan-300 bg-cyan-500/25 border border-cyan-500/40 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <RotateCw className={`w-4 h-4 ${isOrbiting ? 'animate-spin' : ''}`} style={isOrbiting ? { animationDuration: '3.5s' } : undefined} />
              </button>
            </>
          )}

          <div className="w-5 h-px bg-white/10 my-0.5" />

          {/* Palette Expand / Collapse Toggle Button */}
          <button
            id="tour-mobile-palette-toggle"
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            title={isPaletteOpen ? "Hide Filter Palette" : "Show Filter Palette"}
            className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all active:scale-90 ${
              isPaletteOpen
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {isPaletteOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            {/* Active Layers Indicator Badge when closed */}
            {!isPaletteOpen && activeLayersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-md">
                {activeLayersCount}
              </span>
            )}
          </button>
        </div>

        {/* Vertical Icon Palette (Visible when isPaletteOpen is true) */}
        {isPaletteOpen && (
          <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-1 flex flex-col items-center gap-1.5 shadow-2xl animate-slide-down max-h-[calc(100vh-210px)] overflow-y-auto no-scrollbar">
            {/* 1. Our Lawn Signs (3-State Cycle: Pins -> Dots -> Off) */}
            <button
              id="tour-mobile-signs"
              onClick={toggleOurSigns}
              title={
                showSignsLayer && ownerFilter === 'ours'
                  ? useDotMode
                    ? `Our Signs (${stats.ours}): Dots Active (tap to hide)`
                    : `Our Signs (${stats.ours}): Pins Active (tap for Dots)`
                  : `Our Signs (${stats.ours}) (tap to show Pins)`
              }
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                showSignsLayer && ownerFilter === 'ours'
                  ? useDotMode
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                    : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30'
                  : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              {showSignsLayer && ownerFilter === 'ours' && useDotMode ? (
                <CircleDot className="w-4 h-4" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </button>

            {/* 2. Opponent Signs (3-State Cycle: Pins -> Dots -> Off) */}
            <button
              id="tour-mobile-opponents"
              onClick={toggleCompetitorSigns}
              title={
                showSignsLayer && ownerFilter === 'theirs'
                  ? useDotMode
                    ? `Opponent Signs (${stats.theirs}): Dots Active (tap to hide)`
                    : `Opponent Signs (${stats.theirs}): Pins Active (tap for Dots)`
                  : `Opponent Signs (${stats.theirs}) (tap to show Pins)`
              }
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                showSignsLayer && ownerFilter === 'theirs'
                  ? useDotMode
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                    : 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                  : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              {showSignsLayer && ownerFilter === 'theirs' && useDotMode ? (
                <CircleDot className="w-4 h-4" />
              ) : (
                <Target className="w-4 h-4" />
              )}
            </button>

            {/* 3. Door Knocks / Canvass */}
            <button
              id="tour-mobile-doors"
              onClick={() => setShowCanvassLayer(!showCanvassLayer)}
              title={`Door Knocks (${canvassRecords.length})`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                showCanvassLayer
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/30'
                  : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              <Footprints className="w-4 h-4" />
            </button>

            {/* 4. Field Ops & Turf Routes (Consolidated) */}
            <button
              id="tour-mobile-field-ops"
              onClick={toggleFieldOps}
              title={`Field Ops & Turf Routes (${activeVolunteersCount} active • ${routes.length} loops)`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                isFieldOpsActive
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                  : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
            </button>

            {/* 6. Voting Precincts */}
            <button
              id="tour-mobile-precincts"
              onClick={() => setShowPrecincts(!showPrecincts)}
              title={`Voting Precincts (${precincts.length})`}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                showPrecincts
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                  : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              <Vote className="w-4 h-4" />
            </button>

            {/* 7. Bristol Boundary Overlay */}
            {setShowBoundary && (
              <button
                onClick={() => {
                  const next = !showBoundary;
                  setShowBoundary(next);
                }}
                title="Bristol Boundary Overlay"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                  showBoundary
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-500/30'
                    : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </button>
            )}

            {/* 8. Vibrant Heatmap */}
            {setShowHeatmap && (
              <button
                id="tour-mobile-heatmap"
                onClick={() => setShowHeatmap(!showHeatmap)}
                title="Sign Density Heatmap"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                  showHeatmap
                    ? 'bg-gradient-to-br from-orange-500 to-rose-600 text-white border-orange-400 shadow-md shadow-rose-600/30'
                    : 'text-zinc-400 hover:text-white border-transparent hover:bg-white/5'
                }`}
              >
                <Flame className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          3. FLOATING BOTTOM VIP INTEL DRAWER (Elevated Safe from Safari Nav)
          ============================================================ */}
      <div className="absolute bottom-3 inset-x-0 z-30 pointer-events-auto pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] px-3">
        <div className="max-w-md mx-auto bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
          
          {/* Drawer Toggle Header Button */}
          <div
            id="tour-mobile-drawer-header"
            className="w-full py-2.5 px-3.5 flex items-center justify-between text-slate-300 transition"
          >
            <button
              type="button"
              onClick={() => setIsTrayExpanded(!isTrayExpanded)}
              className="flex items-center gap-2 hover:text-white active:scale-95 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase text-white">VIP Intel & SitRep</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsTrayExpanded(!isTrayExpanded)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full border border-white/10 active:scale-95 transition"
              >
                <span>{isTrayExpanded ? 'Close' : 'Precincts'}</span>
                <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${isTrayExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Expandable Executive Drawer Content */}
          {isTrayExpanded && (
            <div className="px-3 pb-3 pt-1 border-t border-white/10 animate-fade-in max-h-[50vh] overflow-y-auto">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-900/90 p-1 mb-3 border border-white/10">
                <button
                  onClick={() => setActiveTab('quick_filters')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    activeTab === 'quick_filters'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ All Filters
                </button>
                <button
                  onClick={() => setActiveTab('precinct_intel')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    activeTab === 'precinct_intel'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📊 Precincts
                </button>
                <button
                  onClick={() => setActiveTab('field_pulse')}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    activeTab === 'field_pulse'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🤝 Field Pulse
                </button>
              </div>

              {/* TAB 1: ALL FILTERS & VIEW MODES */}
              {activeTab === 'quick_filters' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowSignsLayer(true);
                        setOwnerFilter('all');
                        setTypeFilter('all');
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left hover:border-slate-700"
                    >
                      <p className="text-[10px] text-slate-400 font-bold uppercase">All Lawn Signs</p>
                      <p className="text-base font-black text-white">{stats.total} <span className="text-xs text-slate-400 font-normal">pins</span></p>
                    </button>

                    <button
                      onClick={() => {
                        setShowSignsLayer(true);
                        setTypeFilter('large_sign');
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left hover:border-slate-700"
                    >
                      <p className="text-[10px] text-sky-400 font-bold uppercase">High-Impact Banners</p>
                      <p className="text-base font-black text-sky-300">{stats.highImpact} <span className="text-xs text-slate-400 font-normal">signs</span></p>
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">Inventory Distribution</span>
                      <span className="text-xs font-extrabold text-emerald-400">{inventoryStats.totalPlaced} / {inventoryStats.totalStock}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((inventoryStats.totalPlaced / Math.max(1, inventoryStats.totalStock)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Bristol City Facts Card Button */}
                  {onOpenBristolFacts && (
                    <button
                      onClick={onOpenBristolFacts}
                      className="w-full p-3 rounded-2xl bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-transparent border border-sky-500/30 flex items-center justify-between hover:border-sky-500/50 active:scale-[0.99] transition text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">City of Bristol, TN Facts</p>
                          <p className="text-[10px] text-sky-300/80">Pop: 27,147 • 22,150 Registered Voters • Ordinances</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider px-2 py-1 rounded-lg bg-sky-500/20 border border-sky-500/30">
                        View
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* TAB 2: PRECINCT INTEL */}
              {activeTab === 'precinct_intel' && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    Bristol TN Turnout Rankings (Tap to fly)
                  </p>
                  {precincts.map((p) => {
                    const pSigns = signs.filter(s => s.status === 'placed');
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectPrecinct(p);
                          onFlyToPrecinct(p);
                          setShowPrecincts(true);
                        }}
                        className="p-2.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-white/5 flex items-center justify-between active:scale-[0.98] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                            style={{ backgroundColor: p.color }}
                          >
                            {p.code}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.pollingPlace} • {p.registeredVoters.toLocaleString()} reg</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-400">{p.historicTurnoutPct}%</span>
                          <p className="text-[9px] text-slate-400">Turnout</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: FIELD FORCE PULSE */}
              {activeTab === 'field_pulse' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[10px] text-teal-400 font-bold uppercase">Spoke With Voter</p>
                      <p className="text-lg font-black text-white">{contactsCount} <span className="text-xs font-bold text-teal-400">({contactRate}%)</span></p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase">Active Field Techs</p>
                      <p className="text-lg font-black text-white">{activeVolunteersCount} <span className="text-xs font-bold text-slate-400">live</span></p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Live Volunteer Trackers
                    </p>
                    {volunteerPings.slice(0, 4).map((v) => (
                      <div
                        key={v.volunteer_name}
                        className="p-2 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${v.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className="font-bold text-white">{v.volunteer_name}</span>
                          <span className="text-[10px] text-slate-400">{v.role}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {v.breadcrumbs?.length || 0} stops
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
