'use client';

import React from 'react';
import { Vote, Users, Navigation, Sparkles } from 'lucide-react';
import { PrecinctInfo, calculatePrecinctStats } from '@/lib/precinctData';
import { Sign } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import CampaignWindowFrame from './CampaignWindowFrame';

interface PrecinctDetailCardProps {
  precinct: PrecinctInfo | null;
  signs: Sign[];
  onClose: () => void;
  onZoomToPrecinct: (precinct: PrecinctInfo) => void;
  onAssignMission?: (precinct: PrecinctInfo) => void;
  isDark?: boolean;
}

export default function PrecinctDetailCard({
  precinct,
  signs,
  onClose,
  onZoomToPrecinct,
  onAssignMission,
}: PrecinctDetailCardProps) {
  if (!precinct) return null;

  const stats = calculatePrecinctStats(precinct, signs);
  const targetSaturation = 2.5;
  const saturationPct = Math.min(100, Math.round((stats.signsPer1kVoters / targetSaturation) * 100));

  return (
    <CampaignWindowFrame
      title={`Precinct ${precinct.code}`}
      subtitle={precinct.name}
      badge={precinct.priority}
      badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/40"
      icon={<span className="font-mono font-bold text-xs">{precinct.code}</span>}
      onClose={onClose}
      defaultWidth={440}
      doubleWidth={820}
      accentGradient="from-indigo-500 via-purple-500 to-pink-500"
    >
      {({ isDoubleSize }) => (
        <div className={isDoubleSize ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
          {/* Identity & Metrics Column */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shrink-0"
                style={{
                  backgroundColor: `${precinct.color}25`,
                  color: precinct.color,
                  border: `2px solid ${precinct.color}50`,
                }}
              >
                {precinct.code}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-slate-200">
                    Sullivan County VTD
                  </span>
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: `${precinct.color}20`,
                      color: precinct.color,
                    }}
                  >
                    {precinct.priority}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-white mt-1 truncate">
                  {precinct.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 truncate">
                  {precinct.corridorFocus}
                </p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Voter Roll
                </span>
                <span className="text-sm font-black text-white block mt-0.5">
                  {precinct.registeredVoters.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">Registered</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Turnout
                </span>
                <span className="text-sm font-black text-emerald-400 block mt-0.5">
                  {precinct.historicTurnoutPct}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  ~{precinct.historicalVotesCast.toLocaleString()} votes
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Early Vote
                </span>
                <span className="text-sm font-black text-sky-400 block mt-0.5">
                  {precinct.earlyVotingRatio}%
                </span>
                <span className="text-[10px] text-slate-400 block">Absentee</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onZoomToPrecinct(precinct)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all"
              >
                <Navigation className="w-3.5 h-3.5" /> Center Precinct
              </button>
              {onAssignMission && (
                <button
                  type="button"
                  onClick={() => onAssignMission(precinct)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 flex items-center gap-1.5 transition active:scale-95"
                  title="Assign a mission to this precinct"
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" /> Assign
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 transition"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Polling Place & Saturation Column */}
          <div className="space-y-3">
            {/* Polling Place */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Vote className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                    Official Polling Location
                  </span>
                  <p className="text-xs font-bold text-white truncate">{precinct.pollingPlace}</p>
                  <p className="text-[11px] text-slate-300 truncate">{precinct.pollingAddress}</p>
                </div>
              </div>
              <a
                href={getAppleMapsUrl({
                  address: precinct.pollingAddress,
                  lat: precinct.center[1],
                  lng: precinct.center[0],
                  title: precinct.pollingPlace,
                  mode: 'view',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition shrink-0"
                title="Open in Apple Maps"
              >
                <Navigation className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Sign Coverage Ratio */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Sign Saturation
                </span>
                <span className="text-xs font-black text-emerald-400">
                  {stats.ourSigns} Ours <span className="text-slate-600 font-normal">/</span> {stats.theirSigns} Opponents
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${saturationPct}%`,
                    backgroundColor: saturationPct >= 80 ? '#10b981' : saturationPct >= 40 ? '#f59e0b' : '#38bdf8',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{stats.signsPer1kVoters} signs per 1k voters</span>
                <span className="font-bold text-slate-300">{saturationPct}% of target</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </CampaignWindowFrame>
  );
}
