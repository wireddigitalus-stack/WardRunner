'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Footprints,
  MapPin,
  X,
  Check,
  Navigation,
  Sparkles,
  Activity,
  Layers,
  ChevronRight,
  Filter,
  Search,
  RotateCcw,
  Radio,
  DoorOpen,
} from 'lucide-react';
import { VolunteerLocationPing, CanvassRecord, Sign } from '@/lib/types';
import { useDraggable } from '@/lib/useDraggable';

interface VolunteerFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  selectedVolunteer: string | null;
  onSelectVolunteer: (volName: string | null) => void;
  volunteerPings: VolunteerLocationPing[];
  canvassRecords: CanvassRecord[];
  signs: Sign[];
  onFlyToVolunteer?: (lat: number, lng: number) => void;
  showRoutesLayer?: boolean;
  setShowRoutesLayer?: (show: boolean) => void;
}

const GROUPS = [
  { id: 'all', label: 'All Field Force', icon: '👥', short: 'All Teams' },
  { id: 'canvasser', label: 'Door Canvassers', icon: '🚪', short: 'Canvassers' },
  { id: 'flyer', label: 'Flyer Hangers', icon: '📰', short: 'Flyer Lit' },
  { id: 'sign', label: 'Sign Runners', icon: '🪧', short: 'Sign Team' },
  { id: 'town_hall', label: 'Town Hall & Events', icon: '🏛️', short: 'Events' },
];

export default function VolunteerFilterPanel({
  isOpen,
  onClose,
  selectedGroup,
  onSelectGroup,
  selectedVolunteer,
  onSelectVolunteer,
  volunteerPings,
  canvassRecords,
  signs,
  onFlyToVolunteer,
  showRoutesLayer,
  setShowRoutesLayer,
}: VolunteerFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { isDragging, resetPosition, dragProps, style: dragStyle } = useDraggable();

  useEffect(() => {
    if (isOpen) {
      resetPosition();
    }
  }, [isOpen, resetPosition]);

  // Calculate statistics per volunteer
  const volunteerStats = useMemo(() => {
    return volunteerPings.map(ping => {
      const vName = ping.volunteer_name.toLowerCase().trim();
      const doorsKnocked = canvassRecords.filter(r => r.volunteer_name.toLowerCase().trim() === vName).length;
      const signsPlaced = signs.filter(s => !s.is_competitor && (s.placed_by_name || '').toLowerCase().trim() === vName).length;
      const isRecent = Date.now() - new Date(ping.last_ping_at).getTime() < 1000 * 60 * 30; // 30 mins

      return {
        ...ping,
        doorsKnocked,
        signsPlaced,
        isRecent,
      };
    });
  }, [volunteerPings, canvassRecords, signs]);

  // Compute aggregate live counts
  const totalDoorsKnocked = canvassRecords.length;
  const totalSignsPlaced = useMemo(() => signs.filter(s => !s.is_competitor).length, [signs]);
  const activeNowCount = useMemo(() => volunteerStats.filter(v => v.is_active || v.isRecent).length, [volunteerStats]);

  // Compute counts per role
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: volunteerStats.length,
      canvasser: 0,
      flyer: 0,
      sign: 0,
      town_hall: 0,
    };
    volunteerStats.forEach(v => {
      const role = (v.role || '').toLowerCase();
      if (role.includes('canvass') || role.includes('door')) counts.canvasser++;
      if (role.includes('flyer') || role.includes('lit')) counts.flyer++;
      if (role.includes('sign') || role.includes('scout') || role.includes('field')) counts.sign++;
      if (role.includes('town') || role.includes('event')) counts.town_hall++;
    });
    return counts;
  }, [volunteerStats]);

  // Filter volunteer list based on selected group & search query
  const filteredVolunteers = useMemo(() => {
    return volunteerStats.filter(v => {
      if (selectedGroup !== 'all') {
        const role = (v.role || '').toLowerCase();
        if (selectedGroup === 'canvasser' && !(role.includes('canvass') || role.includes('door'))) return false;
        if (selectedGroup === 'flyer' && !(role.includes('flyer') || role.includes('lit'))) return false;
        if (selectedGroup === 'sign' && !(role.includes('sign') || role.includes('scout') || role.includes('field'))) return false;
        if (selectedGroup === 'town_hall' && !(role.includes('town') || role.includes('event'))) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.volunteer_name.toLowerCase().includes(q);
        const matchesRole = (v.role || '').toLowerCase().includes(q);
        const matchesAction = (v.current_action || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesAction) return false;
      }
      return true;
    });
  }, [volunteerStats, selectedGroup, searchQuery]);

  const handleResetAll = () => {
    onSelectGroup('all');
    onSelectVolunteer(null);
    setSearchQuery('');
  };

  const handleFlyAndClose = (lat: number, lng: number, volName: string) => {
    onSelectVolunteer(volName);
    if (onFlyToVolunteer) {
      onFlyToVolunteer(lat, lng);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in pointer-events-auto">
      {/* Dark Blurred Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Pop Card (Styled like Missions Modal) */}
      <div 
        style={dragStyle} 
        className="relative z-10 w-full max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col glass-heavy rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up"
      >
        {/* Top Accent Gradient Edge */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 shrink-0" />

        {/* Modal Header */}
        <div 
          {...dragProps}
          onDoubleClick={resetPosition}
          className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0 select-none md:cursor-grab md:active:cursor-grabbing"
          title="Drag to move modal • Double click to center"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              {/* Subtle Desktop Drag Handle Pill */}
              <div className="hidden md:flex items-center -mt-1 mb-1.5">
                <div className="w-10 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight text-white">Ground Force Intelligence</h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {volunteerStats.length} Volunteers • {activeNowCount} Live In Field
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Track live field personnel, filter map breadcrumbs, and inspect door-knocking performance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95 shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Filter Navigation Tabs */}
        <div className="flex border-b border-white/10 px-5 sm:px-6 bg-white/[0.02] shrink-0 overflow-x-auto no-scrollbar gap-1">
          {GROUPS.map(g => {
            const isSel = selectedGroup === g.id;
            const count = groupCounts[g.id] ?? 0;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelectGroup(g.id)}
                className={`py-3.5 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isSel
                    ? 'border-emerald-400 text-emerald-300 font-black'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm">{g.icon}</span>
                <span>{g.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-extrabold ${
                  isSel ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/30' : 'bg-white/10 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          
          {/* Quick HUD Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Field Crew</span>
                <Users className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{volunteerStats.length}</span>
                <span className="text-[10px] text-emerald-400 font-bold">({activeNowCount} active)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered volunteers</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Doors Knocked</span>
                <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-emerald-300">{totalDoorsKnocked}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Voter contacts logged</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Official Signs</span>
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-1">
                <span className="text-xl font-black text-cyan-300">{totalSignsPlaced}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Signs deployed in field</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Map Filter</span>
                <Radio className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-1 truncate">
                <span className="text-sm font-black text-purple-300 truncate block">
                  {selectedVolunteer ? selectedVolunteer.split(' ')[0] : selectedGroup === 'all' ? 'All Personnel' : selectedGroup}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Active map isolation</p>
            </div>
          </div>

          {/* Search Bar & Map Layer Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search field volunteers by name, role, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 text-xs bg-slate-900/80 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Option: Turf Walking Loops */}
            {setShowRoutesLayer && (
              <button
                type="button"
                onClick={() => setShowRoutesLayer(!showRoutesLayer)}
                className={`h-10 px-3.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border shrink-0 ${
                  showRoutesLayer
                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 hover:text-white border-white/10'
                }`}
              >
                <Footprints className="w-3.5 h-3.5 text-purple-400" />
                <span>Turf Routes: {showRoutesLayer ? 'Visible' : 'Hidden'}</span>
              </button>
            )}

            {(selectedGroup !== 'all' || selectedVolunteer || searchQuery) && (
              <button
                type="button"
                onClick={handleResetAll}
                className="h-10 px-3.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition flex items-center justify-center gap-1.5 border border-white/5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Active Volunteer Isolation Banner */}
          {selectedVolunteer && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-fade-in shadow-lg shadow-emerald-500/5">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-slate-300 text-xs">Map currently filtered to: </span>
                  <span className="text-emerald-300 font-extrabold text-sm">{selectedVolunteer}</span>
                  <p className="text-[11px] text-slate-400">Only showing their live location, breadcrumb trail, and knocked doors.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectVolunteer(null)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider transition shrink-0 border border-emerald-500/30"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Volunteer Roster Cards Grid (Responsive 2-Column on Desktop) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>Field Personnel ({filteredVolunteers.length})</span>
              <span>Performance & Navigation</span>
            </div>

            {filteredVolunteers.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 bg-slate-900/40 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🔍</span>
                <span className="font-bold text-sm text-slate-200">No field volunteers match your search</span>
                <p className="text-slate-500 max-w-sm">Try clearing your search query or selecting &ldquo;All Field Force&rdquo; to see all registered campaign personnel.</p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredVolunteers.map(v => {
                  const isSelected = selectedVolunteer?.toLowerCase().trim() === v.volunteer_name.toLowerCase().trim();

                  return (
                    <div
                      key={v.volunteer_name}
                      onClick={() => {
                        if (isSelected) {
                          onSelectVolunteer(null);
                        } else {
                          onSelectVolunteer(v.volunteer_name);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.99] ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-400/50 shadow-xl shadow-emerald-500/10'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Avatar with Status Pulse */}
                          <div className="relative shrink-0 mt-0.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs text-white shadow-inner">
                              {v.volunteer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            {v.is_active && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-white truncate leading-tight">
                                {v.volunteer_name}
                              </h4>
                              {isSelected && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                                  ISOLATED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                                {v.role}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {v.is_active ? '🟢 Live' : '⚪ Offline'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                              {v.current_action || 'Field Volunteer'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Performance KPIs & Quick Fly Action */}
                      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="flex items-center gap-1 text-emerald-400" title="Doors Visited">
                            <DoorOpen className="w-3.5 h-3.5" />
                            <span>{v.doorsKnocked} doors</span>
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1 text-teal-300" title="Signs Placed">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{v.signsPlaced} signs</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFlyAndClose(v.latitude, v.longitude, v.volunteer_name);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                            title="Fly to volunteer location on map and close modal"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Fly to</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Live GPS locations synchronize automatically from field volunteer devices.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold hover:shadow-lg hover:shadow-emerald-500/20 transition active:scale-95"
            >
              View on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
