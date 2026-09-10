'use client';

import React from 'react';
import { Vote, Users, TrendingUp, ChevronRight, MapPin, Target, ShieldCheck, Flame, Compass } from 'lucide-react';
import { PrecinctInfo, BRISTOL_PRECINCTS, calculatePrecinctStats } from '@/lib/precinctData';
import { Sign } from '@/lib/types';

interface PrecinctLeaderboardProps {
  signs: Sign[];
  onSelectPrecinct: (precinct: PrecinctInfo) => void;
  selectedPrecinctId?: string | null;
  isDark?: boolean;
}

export default function PrecinctLeaderboard({
  signs,
  onSelectPrecinct,
  selectedPrecinctId,
  isDark = true,
}: PrecinctLeaderboardProps) {
  // Sort precincts by registered voters or turnout
  const sortedPrecincts = React.useMemo(() => {
    return [...BRISTOL_PRECINCTS].sort((a, b) => b.historicTurnoutPct - a.historicTurnoutPct);
  }, []);

  const totalRegisteredAll = BRISTOL_PRECINCTS.reduce((acc, p) => acc + p.registeredVoters, 0);
  const avgTurnoutAll = (
    BRISTOL_PRECINCTS.reduce((acc, p) => acc + p.historicTurnoutPct, 0) / BRISTOL_PRECINCTS.length
  ).toFixed(1);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered</span>
          </div>
          <p className="text-base font-black text-white mt-1">
            {totalRegisteredAll.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Across 6 Bristol TN Precincts</p>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg City Turnout</span>
          </div>
          <p className="text-base font-black text-emerald-400 mt-1">
            {avgTurnoutAll}%
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Historical Municipal Rate</p>
        </div>
      </div>

      {/* Precinct List Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
          <span>Precinct & Turnout Rank</span>
          <span>Our Signs / Target</span>
        </div>

        {sortedPrecincts.map((p, idx) => {
          const stats = calculatePrecinctStats(p, signs);
          const isSelected = selectedPrecinctId === p.id;
          const targetSaturation = 2.5; // Target signs per 1,000 voters
          const saturationPct = Math.min(100, Math.round((stats.signsPer1kVoters / targetSaturation) * 100));

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPrecinct(p)}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md"
                    style={{
                      backgroundColor: `${p.color}25`,
                      color: p.color,
                      border: `1.5px solid ${p.color}50`,
                    }}
                  >
                    {p.code}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white truncate">
                        {p.name.replace('Precinct ', '')}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                          p.priority === 'Stronghold'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : p.priority === 'High Impact'
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                            : p.priority === 'Swing Zone'
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {p.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-bold text-white">{p.registeredVoters.toLocaleString()} voters</span>
                      <span>•</span>
                      <span className="font-bold" style={{ color: p.color }}>
                        {p.historicTurnoutPct}% turnout
                      </span>
                      <span>•</span>
                      <span className="text-slate-500 truncate">{p.pollingPlace}</span>
                    </div>
                  </div>
                </div>

                {/* Sign Count Badges */}
                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-black text-emerald-400">{stats.ourSigns}</span>
                    <span className="text-[10px] text-slate-500">ours</span>
                    {stats.theirSigns > 0 && (
                      <>
                        <span className="text-[10px] text-slate-600">/</span>
                        <span className="text-xs font-black text-rose-400">{stats.theirSigns}</span>
                        <span className="text-[10px] text-slate-500">op</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {stats.signsPer1kVoters} / 1k voters
                  </span>
                </div>
              </div>

              {/* Saturation Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-slate-500">Sign Saturation Target</span>
                  <span className="font-bold text-slate-300">{saturationPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${saturationPct}%`,
                      backgroundColor: saturationPct >= 80 ? '#10b981' : saturationPct >= 40 ? '#f59e0b' : '#38bdf8',
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
