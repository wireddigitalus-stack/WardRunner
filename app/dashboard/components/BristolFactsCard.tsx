'use client';

import React, { useState } from 'react';
import {
  Building2,
  Landmark,
  Vote,
  Users,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Scale,
  Phone,
  Navigation,
  Sparkles,
  X,
  ExternalLink,
  ChevronRight,
  Footprints,
  Compass,
} from 'lucide-react';
import { BRISTOL_CITY_FACTS } from '@/lib/cityData';
import { Sign, CanvassRecord, VolunteerLocationPing, CanvassRoute } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';

interface BristolFactsCardProps {
  isOpen: boolean;
  onClose: () => void;
  signs: Sign[];
  canvassRecords: CanvassRecord[];
  volunteerPings: VolunteerLocationPing[];
  routes: CanvassRoute[];
  showPrecincts: boolean;
  onTogglePrecincts: () => void;
  onZoomToCity: () => void;
  isDark?: boolean;
}

export default function BristolFactsCard({
  isOpen,
  onClose,
  signs,
  canvassRecords,
  volunteerPings,
  routes,
  showPrecincts,
  onTogglePrecincts,
  onZoomToCity,
  isDark = true,
}: BristolFactsCardProps) {
  const [activeTab, setActiveTab] = useState<'civic' | 'elections' | 'field' | 'ordinances'>('civic');

  if (!isOpen) return null;

  const ourSigns = signs.filter(s => s.status === 'placed' && !s.is_competitor).length;
  const theirSigns = signs.filter(s => s.status === 'placed' && s.is_competitor).length;
  const contactsCount = canvassRecords.filter(r => r.result === 'contact').length;
  const contactRate = canvassRecords.length > 0 ? Math.round((contactsCount / canvassRecords.length) * 100) : 0;
  const activeVolunteers = volunteerPings.filter(p => p.is_active).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div className="w-full max-w-[460px] max-h-[88vh] overflow-y-auto no-scrollbar pointer-events-auto animate-slide-up">
        <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl border border-sky-500/30">
        {/* Top Gradient Edge (Sky to Emerald) */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Close Card"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-lg shrink-0 p-2.5">
            <Landmark className="w-7 h-7" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Sullivan County, TN
              </span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                Municipal Ward
              </span>
            </div>

            <h3 className="font-extrabold text-base text-white mt-1 truncate">
              {BRISTOL_CITY_FACTS.name}
            </h3>
            <p className="text-xs text-sky-300/80 mt-0.5 truncate font-medium">
              &ldquo;{BRISTOL_CITY_FACTS.slogan}&rdquo; • Est. {BRISTOL_CITY_FACTS.established}
            </p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mt-4 border border-white/10">
          <button
            onClick={() => setActiveTab('civic')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'civic'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏛️ Civic
          </button>
          <button
            onClick={() => setActiveTab('elections')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'elections'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🗳️ Elections
          </button>
          <button
            onClick={() => setActiveTab('field')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'field'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Field
          </button>
          <button
            onClick={() => setActiveTab('ordinances')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
              activeTab === 'ordinances'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Rules
          </button>
        </div>

        {/* ============================================================
            TAB 1: CIVIC & MUNICIPAL OVERVIEW
            ============================================================ */}
        {activeTab === 'civic' && (
          <div className="mt-3.5 space-y-3 animate-fade-in">
            {/* 4-Stat Metric Tiles */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                  Population
                </span>
                <span className="text-xs font-black text-white block mt-0.5">
                  {BRISTOL_CITY_FACTS.population.toLocaleString()}
                </span>
                <span className="text-[8px] text-slate-500 block">Census</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                  Voters
                </span>
                <span className="text-xs font-black text-sky-400 block mt-0.5">
                  {BRISTOL_CITY_FACTS.registeredVoters.toLocaleString()}
                </span>
                <span className="text-[8px] text-slate-500 block">Roll</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                  Land Area
                </span>
                <span className="text-xs font-black text-emerald-400 block mt-0.5">
                  {BRISTOL_CITY_FACTS.landAreaSqMi}
                </span>
                <span className="text-[8px] text-slate-500 block">sq mi</span>
              </div>

              <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                  Elevation
                </span>
                <span className="text-xs font-black text-amber-400 block mt-0.5">
                  {BRISTOL_CITY_FACTS.elevationFt}′
                </span>
                <span className="text-[8px] text-slate-500 block">AMSL</span>
              </div>
            </div>

            {/* Form of Government */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold text-sky-400 block">Municipal Government</span>
                <p className="text-xs font-bold text-white truncate">{BRISTOL_CITY_FACTS.governmentType}</p>
                <p className="text-[10px] text-slate-400 truncate">{BRISTOL_CITY_FACTS.councilStructure}</p>
              </div>
              <span className="px-2 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-[10px] font-bold text-sky-300 shrink-0">
                5 Seats
              </span>
            </div>

            {/* City Hall Contact & Directions */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-sky-400 block">Bristol City Hall</span>
                  <p className="text-xs font-bold text-white truncate">{BRISTOL_CITY_FACTS.cityHall.address}</p>
                  <p className="text-[10px] text-slate-400 truncate">{BRISTOL_CITY_FACTS.cityHall.phone} • {BRISTOL_CITY_FACTS.cityHall.hours}</p>
                </div>
              </div>
              <a
                href={getAppleMapsUrl({
                  address: BRISTOL_CITY_FACTS.cityHall.address,
                  lat: BRISTOL_CITY_FACTS.cityHall.lat,
                  lng: BRISTOL_CITY_FACTS.cityHall.lng,
                  title: 'Bristol TN City Hall',
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
          </div>
        )}

        {/* ============================================================
            TAB 2: ELECTIONS & VOTER ROLL INTEL
            ============================================================ */}
        {activeTab === 'elections' && (
          <div className="mt-3.5 space-y-3 animate-fade-in">
            {/* Turnout Comparison */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Muni Election Turnout
                </span>
                <span className="text-base font-black text-emerald-400 block mt-0.5">
                  {BRISTOL_CITY_FACTS.historicTurnoutPct}%
                </span>
                <span className="text-[9px] text-slate-500 block">~6,300 votes in off-year cycles</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Presidential Cycle
                </span>
                <span className="text-base font-black text-sky-400 block mt-0.5">
                  {BRISTOL_CITY_FACTS.presidentialTurnoutPct}%
                </span>
                <span className="text-[9px] text-slate-500 block">Peak general participation</span>
              </div>
            </div>

            {/* Sullivan County Election Commission */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Vote className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block">Election Authority</span>
                  <p className="text-xs font-bold text-white truncate">{BRISTOL_CITY_FACTS.electionCommission.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{BRISTOL_CITY_FACTS.electionCommission.address}</p>
                </div>
              </div>
              <a
                href={`tel:${BRISTOL_CITY_FACTS.electionCommission.phone.replace(/[^0-9]/g, '')}`}
                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 transition shrink-0"
                title="Call Election Commission"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Early Voting Locations Pill */}
            <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-white/5 text-[11px]">
              <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">
                Early Voting Sites
              </span>
              <div className="space-y-1 text-slate-300">
                {BRISTOL_CITY_FACTS.earlyVotingLocations.map((loc, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-white truncate">{loc.name}</span>
                    <span className="text-[10px] text-slate-400 truncate ml-2">{loc.address.split(',')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: LIVE CAMPAIGN FIELD PULSE
            ============================================================ */}
        {activeTab === 'field' && (
          <div className="mt-3.5 space-y-3 animate-fade-in">
            {/* Citywide Lawn Signs */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Citywide Sign Footprint
                </span>
                <span className="text-xs font-black text-emerald-400">
                  {ourSigns} Ours <span className="text-slate-600 font-normal">/</span> {theirSigns} Opponents
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.round((ourSigns / Math.max(1, ourSigns + theirSigns)) * 100)}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${Math.round((theirSigns / Math.max(1, ourSigns + theirSigns)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Field Operations Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Doors Knocked
                </span>
                <span className="text-sm font-black text-teal-300 block mt-0.5">
                  {canvassRecords.length}
                </span>
                <span className="text-[9px] text-slate-500 block">Total visits</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Contact Rate
                </span>
                <span className="text-sm font-black text-emerald-400 block mt-0.5">
                  {contactRate}%
                </span>
                <span className="text-[9px] text-slate-500 block">Spoke with voter</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  Field Volunteers
                </span>
                <span className="text-sm font-black text-purple-400 block mt-0.5">
                  {activeVolunteers}
                </span>
                <span className="text-[9px] text-slate-500 block">On turf</span>
              </div>
            </div>

            {/* Traffic Arterial Exposure */}
            <div className="p-2.5 rounded-2xl bg-slate-900/70 border border-white/5">
              <span className="text-[9px] uppercase font-bold text-amber-400 block mb-1">
                Highest Visibility Traffic Corridors
              </span>
              <div className="space-y-1.5">
                {BRISTOL_CITY_FACTS.keyCorridors.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-white truncate">{c.name}</span>
                    <span className="font-mono text-amber-300 font-bold shrink-0 ml-2">{c.aadt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: LOCAL SIGN ORDINANCES & RULES
            ============================================================ */}
        {activeTab === 'ordinances' && (
          <div className="mt-3.5 space-y-2 animate-fade-in max-h-[220px] overflow-y-auto no-scrollbar pr-1">
            {BRISTOL_CITY_FACTS.ordinances.map((ord, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {ord.title}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{ord.citation}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {ord.rule}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Footer Quick Action Buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={onZoomToCity}
            className="flex-1 py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Recenter City</span>
          </button>

          <button
            onClick={onTogglePrecincts}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border ${
              showPrecincts
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>{showPrecincts ? 'Precincts Visible' : 'Show Precincts'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
