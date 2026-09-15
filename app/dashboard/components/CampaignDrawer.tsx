'use client';

import React from 'react';
import { X, Sparkles, Target, Package, Search, MapPin, CircleDot, Download, Vote } from 'lucide-react';
import { Sign, SignType, VolunteerAssignment, InventoryStock } from '@/lib/types';
import PrecinctLeaderboard from './PrecinctLeaderboard';
import MissionsDrawerTab from './MissionsDrawerTab';
import DictateButton from '@/app/components/DictateButton';
import { PrecinctInfo } from '@/lib/precinctData';

const SIGN_TYPE_META: Record<SignType, { emoji: string; label: string }> = {
  yard_sign: { emoji: '🏡', label: 'Yard Sign' },
  large_sign: { emoji: '🪧', label: 'Large 4×4' },
  banner: { emoji: '🚩', label: 'Banner' },
  billboard: { emoji: '🏢', label: 'Billboard' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export interface AadtCorridor {
  name: string;
  aadt: number;
  color: string;
  pct: number;
}

export interface InventoryStatsData {
  totalPlaced: number;
  totalStock: number;
  totalReserve: number;
  pctDeployed: number;
  placedByType: Record<string, number>;
}

export type DrawerTab = 'signs' | 'precincts' | 'missions' | 'inventory';

interface CampaignDrawerProps {
  isDark: boolean;
  drawerTab: DrawerTab;
  onClose: () => void;
  onSetTab: (tab: DrawerTab) => void;

  // Signs tab
  filtered: Sign[];
  signs: Sign[];
  selectedSign: Sign | null;
  searchQ: string;
  ownerFilter: 'all' | 'ours' | 'theirs';
  typeFilter: string;
  statusFilter: string;
  useDotMode: boolean;
  stats: { total: number };
  onSetSearchQ: (q: string) => void;
  onSetOwnerFilter: (f: 'all' | 'ours' | 'theirs') => void;
  onSetTypeFilter: (f: string) => void;
  onSetStatusFilter: (f: string) => void;
  onSetUseDotMode: (v: boolean) => void;
  onSelectSign: (sign: Sign) => void;
  onFlyTo: (center: [number, number], zoom: number) => void;

  // Precincts tab
  selectedPrecinctId?: string;
  onSelectPrecinct: (p: PrecinctInfo) => void;

  // Missions tab
  assignments: VolunteerAssignment[];
  activeMissionsCount: number;
  onOpenDispatch: () => void;
  onSelectMission: (m: VolunteerAssignment) => void;
  onToggleMissionComplete: (id: string) => void;

  // Inventory tab
  inventoryStock: InventoryStock;
  inventoryStats: InventoryStatsData;
  editingStock: boolean;
  onSetEditingStock: (v: boolean) => void;
  onUpdateStockQuantity: (type: SignType, delta: number) => void;
  aadtCorridors: AadtCorridor[];

  // Export
  onExportCSV: () => void;
  onExportGeoJSON: () => void;
}

export default function CampaignDrawer(props: CampaignDrawerProps) {
  const {
    isDark, drawerTab, onClose, onSetTab,
    filtered, signs, selectedSign, searchQ, ownerFilter, typeFilter, statusFilter, useDotMode, stats,
    onSetSearchQ, onSetOwnerFilter, onSetTypeFilter, onSetStatusFilter, onSetUseDotMode, onSelectSign, onFlyTo,
    selectedPrecinctId, onSelectPrecinct,
    assignments, activeMissionsCount, onOpenDispatch, onSelectMission, onToggleMissionComplete,
    inventoryStock, inventoryStats, editingStock, onSetEditingStock, onUpdateStockQuantity, aadtCorridors,
    onExportCSV, onExportGeoJSON,
  } = props;

  return (
    <>
      {/* Scrim */}
      <div className="absolute inset-0 z-30 bg-black/20 animate-fade-in" onClick={onClose} />

      <aside className={`absolute inset-y-0 right-0 z-40 w-full sm:w-[400px] flex flex-col animate-slide-in-right ${isDark ? 'bg-zinc-950/95 border-l border-white/[0.06]' : 'bg-white/95 border-l border-black/[0.06]'}`} style={{ backdropFilter: 'saturate(200%) blur(40px)', WebkitBackdropFilter: 'saturate(200%) blur(40px)' }}>

        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 animate-throbbing-blue shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm text-white">Campaign Intel</h2>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                </span>
              </div>
              <p className="text-[11px] text-sky-300/80 font-medium">{filtered.length} tactical placements visible</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`grid grid-cols-4 gap-1 p-2 border-b shrink-0 ${isDark ? 'border-white/[0.06] bg-black/20' : 'border-black/[0.06] bg-black/[0.02]'}`}>
          <button onClick={() => onSetTab('signs')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${drawerTab === 'signs' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            <span>Signs</span>
            <span className="text-[10px] opacity-60 font-mono">({filtered.length})</span>
          </button>
          <button onClick={() => onSetTab('precincts')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${drawerTab === 'precincts' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            <Vote className="w-3.5 h-3.5" />
            <span>Precincts</span>
          </button>
          <button onClick={() => onSetTab('missions')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${drawerTab === 'missions' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span>Missions</span>
            {activeMissionsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/40 text-purple-100 font-mono font-bold">{activeMissionsCount}</span>
            )}
          </button>
          <button onClick={() => onSetTab('inventory')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${drawerTab === 'inventory' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            <Package className="w-3.5 h-3.5" />
            <span>Stock</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {drawerTab === 'precincts' && (
            <PrecinctLeaderboard
              signs={signs}
              selectedPrecinctId={selectedPrecinctId}
              onSelectPrecinct={onSelectPrecinct}
              isDark={isDark}
            />
          )}

          {drawerTab === 'missions' && (
            <MissionsDrawerTab
              assignments={assignments}
              onOpenDispatch={onOpenDispatch}
              onSelectMission={onSelectMission}
              onToggleComplete={onToggleMissionComplete}
              isDark={isDark}
            />
          )}

          {drawerTab === 'inventory' && (
            <>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.08]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Sign Inventory</span>
                  </div>
                  <button onClick={() => onSetEditingStock(!editingStock)} className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1">
                    {editingStock ? '✓ Done' : '⚙ Adjust Stock'}
                  </button>
                </div>

                {/* Overall Progress */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold opacity-80">Total Campaign Deployment</span>
                    <span className="font-extrabold text-emerald-400 font-mono">
                      {inventoryStats.totalPlaced} / {inventoryStats.totalStock} ({inventoryStats.pctDeployed}%)
                    </span>
                  </div>
                  <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'}`}>
                    <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 shadow-sm" style={{ width: `${inventoryStats.pctDeployed}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] opacity-40">
                    <span>{inventoryStats.totalPlaced} placed in field</span>
                    <span>{inventoryStats.totalReserve} in reserve</span>
                  </div>
                </div>

                {/* Per-Type Breakdown */}
                <div className="space-y-2.5">
                  {[
                    { type: 'yard_sign' as SignType, color: '#10b981' },
                    { type: 'large_sign' as SignType, color: '#38bdf8' },
                    { type: 'banner' as SignType, color: '#f59e0b' },
                    { type: 'billboard' as SignType, color: '#ec4899' },
                  ].map(item => {
                    const meta = SIGN_TYPE_META[item.type];
                    const placed = inventoryStats.placedByType[item.type] || 0;
                    const total = inventoryStock[item.type] || 0;
                    const reserve = Math.max(0, total - placed);
                    const pct = total > 0 ? Math.min(100, Math.round((placed / total) * 100)) : 0;
                    return (
                      <div key={item.type} className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.01] border-black/[0.05]'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{meta.emoji}</span>
                            <span className="text-xs font-bold">{meta.label}</span>
                          </div>
                          {editingStock ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => onUpdateStockQuantity(item.type, -10)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center font-bold">-</button>
                              <span className="font-mono text-xs font-bold w-10 text-center">{total}</span>
                              <button onClick={() => onUpdateStockQuantity(item.type, 10)} className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center font-bold">+</button>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-xs font-extrabold font-mono" style={{ color: item.color }}>{placed} / {total}</span>
                              <span className="text-[11px] opacity-60 ml-1.5 font-semibold">({reserve} left)</span>
                            </div>
                          )}
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AADT Corridors */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-amber-400">AADT Corridors</label>
                  <span className="text-[10px] opacity-50 font-mono font-bold">vehicles/day</span>
                </div>
                <div className="space-y-2 stagger-children">
                  {aadtCorridors.map(c => (
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
            </>
          )}

          {drawerTab === 'signs' && (
            <>
              {/* Search */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                <input type="text" placeholder="Search streets, signs, or opponents…" value={searchQ} onChange={e => onSetSearchQ(e.target.value)} spellCheck={true} autoCorrect="on" autoCapitalize="words"
                  className={`w-full h-10 pl-10 pr-16 rounded-xl border text-sm focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 focus:border-emerald-500/50 text-white placeholder:text-zinc-500' : 'bg-black/[0.03] border-black/10 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400'}`} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQ && (
                    <button onClick={() => onSetSearchQ('')} className="p-1 rounded-md text-slate-400 hover:text-white" title="Clear filter">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <DictateButton onTranscript={(dictated) => onSetSearchQ(dictated)} size="sm" title="Push to dictate search filter" />
                </div>
              </div>

              {/* Marker Mode */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-2 flex items-center justify-between">
                  <span>Map Marker Mode</span>
                  <span className="text-[11px] font-bold text-cyan-400/90">{useDotMode ? '● Street Dots Active' : '📍 Pins Active'}</span>
                </label>
                <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                  <button onClick={() => onSetUseDotMode(false)} className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${!useDotMode ? isDark ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow' : 'opacity-50 hover:opacity-80'}`}>
                    <MapPin className="w-3.5 h-3.5" /> Pins
                  </button>
                  <button onClick={() => onSetUseDotMode(true)} className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${useDotMode ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25' : 'opacity-50 hover:opacity-80'}`}>
                    <CircleDot className="w-3.5 h-3.5" /> Street Dots
                  </button>
                </div>
              </div>

              {/* Ownership Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Ownership</label>
                <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                  {(['all', 'ours', 'theirs'] as const).map(v => (
                    <button key={v} onClick={() => onSetOwnerFilter(v)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                        ownerFilter === v
                          ? v === 'theirs' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                          : v === 'ours' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                          : isDark ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow'
                          : 'opacity-50 hover:opacity-80'
                      }`}>
                      {v === 'all' ? `All (${stats.total})` : v === 'ours' ? 'Brown' : 'Opponents'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type + Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1.5 block">Sign Type</label>
                  <select value={typeFilter} onChange={e => onSetTypeFilter(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/[0.03] border-black/10 text-slate-900'}`}>
                    <option value="all">All Types</option>
                    <option value="yard_sign">🏡 Yard Signs</option>
                    <option value="large_sign">🪧 Large 4×4</option>
                    <option value="banner">🚩 Banners</option>
                    <option value="billboard">🏢 Billboards</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1.5 block">Status</label>
                  <select value={statusFilter} onChange={e => onSetStatusFilter(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/[0.03] border-black/10 text-slate-900'}`}>
                    <option value="all">All Statuses</option>
                    <option value="placed">✅ Active</option>
                    <option value="retrieved">📦 Retrieved</option>
                    <option value="needs_repair">🔧 Needs Repair</option>
                  </select>
                </div>
              </div>

              {/* Signs List */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Signs in Field ({filtered.length})</label>
                <div className="space-y-1.5 stagger-children max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {filtered.map(sign => {
                    const meta = SIGN_TYPE_META[sign.sign_type] || { emoji: '📍', label: 'Sign' };
                    return (
                      <button key={sign.id} onClick={() => onSelectSign(sign)}
                        className={`w-full text-left p-3 rounded-xl border transition-all animate-fade-in ${
                          selectedSign?.id === sign.id ? 'border-emerald-500/50 bg-emerald-500/10'
                          : isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                          : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04] hover:border-black/[0.12]'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{meta.emoji}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate">{sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}</span>
                                {sign.is_competitor && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400" />}
                              </div>
                              <p className="text-[10px] opacity-40 truncate">{sign.street_address ? `${sign.street_address} · ` : ''}{sign.is_competitor ? 'Reported' : 'Placed'} {relativeTime(sign.created_at)}</p>
                            </div>
                          </div>
                          <span className={`shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${sign.is_competitor ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                            {meta.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`p-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'} grid grid-cols-2 gap-2`}>
          <button onClick={onExportCSV} className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.97] ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={onExportGeoJSON} className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all">
            <Download className="w-3.5 h-3.5" /> GeoJSON
          </button>
        </div>
      </aside>
    </>
  );
}
