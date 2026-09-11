'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Target,
  Users,
  Footprints,
  Compass,
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
  onSelectPrecinct,
  onFlyToPrecinct,
  onLock,
  isDark,
}: MobileVipBarProps) {
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick_filters' | 'precinct_intel' | 'field_pulse'>('quick_filters');

  const activeVolunteersCount = volunteerPings.filter(p => p.is_active).length;
  const contactsCount = canvassRecords.filter(r => r.result === 'contact').length;
  const contactRate = canvassRecords.length > 0 ? Math.round((contactsCount / canvassRecords.length) * 100) : 0;

  // Toggle helpers for single-tap VIP switches
  const toggleOurSigns = () => {
    if (!showSignsLayer) {
      setShowSignsLayer(true);
      setOwnerFilter('ours');
    } else if (ownerFilter === 'ours') {
      setShowSignsLayer(false);
      setOwnerFilter('all');
    } else {
      setOwnerFilter('ours');
    }
  };

  const toggleCompetitorSigns = () => {
    if (!showSignsLayer) {
      setShowSignsLayer(true);
      setOwnerFilter('theirs');
    } else if (ownerFilter === 'theirs') {
      setShowSignsLayer(false);
      setOwnerFilter('all');
    } else {
      setOwnerFilter('theirs');
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
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-2 py-1 shadow-xl overflow-x-auto max-w-[210px] no-scrollbar">
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
          2. FLOATING BOTTOM VIP CONTROL SHEET (Thumb-friendly iOS tray)
          ============================================================ */}
      <div className="absolute bottom-0 inset-x-0 z-30 pointer-events-auto pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] px-3">
        <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
          
          {/* Drag Handle & Tray Toggle Header */}
          <button
            type="button"
            onClick={() => setIsTrayExpanded(!isTrayExpanded)}
            className="w-full pt-2 pb-1.5 flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 active:scale-[0.99] transition"
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mb-1" />
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              <span>VIP Executive Controls</span>
              <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${isTrayExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Quick-Toggle Pill Bar (Always Visible at Bottom) */}
          <div className="p-2.5 pt-0 overflow-x-auto no-scrollbar flex items-center gap-2">
            {/* Our Signs */}
            <button
              onClick={toggleOurSigns}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                showSignsLayer && ownerFilter === 'ours'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-900/90 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Our Signs ({stats.ours})</span>
            </button>

            {/* Competitor Signs */}
            <button
              onClick={toggleCompetitorSigns}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                showSignsLayer && ownerFilter === 'theirs'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
                  : 'bg-slate-900/90 text-rose-300 border-rose-500/30 hover:border-rose-500/60'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Opponent ({stats.theirs})</span>
            </button>

            {/* Voting Precincts */}
            <button
              onClick={() => setShowPrecincts(!showPrecincts)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                showPrecincts
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-900/90 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/60'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>Precincts ({precincts.length})</span>
            </button>

            {/* Door Knocker Activity */}
            <button
              onClick={() => setShowCanvassLayer(!showCanvassLayer)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                showCanvassLayer
                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-lg shadow-teal-500/30'
                  : 'bg-slate-900/90 text-teal-300 border-teal-500/30 hover:border-teal-500/60'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Doors ({canvassRecords.length})</span>
            </button>

            {/* Ground Force Volunteers */}
            <button
              onClick={() => setShowFieldForceLayer(!showFieldForceLayer)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                showFieldForceLayer
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-900/90 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Field Force ({activeVolunteersCount})</span>
            </button>

            {/* Turf Routes */}
            <button
              onClick={() => setShowRoutesLayer(!showRoutesLayer)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                showRoutesLayer
                  ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/30'
                  : 'bg-slate-900/90 text-purple-300 border-purple-500/30 hover:border-purple-500/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Turf Routes ({routes.length})</span>
            </button>

            {/* Campaign Heatmap Toggle */}
            {setShowHeatmap && (
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 border ${
                  showHeatmap
                    ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white border-orange-400 shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900/90 text-orange-300 border-orange-500/30 hover:border-orange-500/60'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Heatmap {showHeatmap ? 'ON' : 'OFF'}</span>
              </button>
            )}
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
