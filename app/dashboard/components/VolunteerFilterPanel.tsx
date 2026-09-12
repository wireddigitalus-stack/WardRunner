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

  // Compute live counts per role
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div 
        style={dragStyle} 
        className="w-full max-w-[430px] max-h-[85vh] glass rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/10 flex flex-col animate-slide-up backdrop-blur-2xl pointer-events-auto overflow-hidden transition-shadow"
      >
        
        {/* Pinned Header & Drag Handle */}
        <div 
          {...dragProps}
          onDoubleClick={resetPosition}
          className="pb-3 border-b border-white/10 shrink-0 select-none md:cursor-grab md:active:cursor-grabbing"
          title="Drag to move panel • Double click to center"
        >
          {/* Subtle Desktop Drag Handle Pill */}
          <div className="hidden md:flex items-center justify-center -mt-1 mb-2.5">
            <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/50 transition-colors" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
                  Field Force Intelligence
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {volunteerStats.length} registered field volunteers
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-white/5 active:scale-95"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Filter Grid (No Side Scroll) */}
        <div className="shrink-0 pt-2.5 space-y-2">
          {/* 2-Column Responsive Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Full Team Button (Spans 2 columns) */}
            <button
              type="button"
              onClick={() => onSelectGroup('all')}
              className={`col-span-2 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border active:scale-[0.99] ${
                selectedGroup === 'all'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-black'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 border-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">👥</span>
                <span>All Field Personnel</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
                selectedGroup === 'all'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {groupCounts.all} Active
              </span>
            </button>

            {/* Role-Specific Filter Buttons */}
            {GROUPS.filter(g => g.id !== 'all').map(g => {
              const isSel = selectedGroup === g.id;
              const count = groupCounts[g.id] ?? 0;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGroup(g.id)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border active:scale-[0.98] ${
                    isSel
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-black'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-white/5 hover:border-white/15'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{g.icon}</span>
                    <span className="truncate">{g.short}</span>
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSel ? 'bg-slate-950/20 text-slate-950 font-black' : 'text-slate-400 bg-white/5'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search volunteers by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Volunteer Banner */}
          {selectedVolunteer && (
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs animate-fade-in">
              <div className="flex items-center gap-2 truncate">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-300 text-[11px]">Map filtered to: </span>
                  <span className="text-emerald-300 font-extrabold">{selectedVolunteer}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectVolunteer(null)}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase tracking-wider transition shrink-0 ml-2"
              >
                Clear
              </button>
            </div>
          )}

          {/* Quick Option: Turf Walking Loops */}
          {setShowRoutesLayer && (
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                <span>🚩</span> Show Turf Walking Loops
              </span>
              <button
                type="button"
                onClick={() => setShowRoutesLayer(!showRoutesLayer)}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition border ${
                  showRoutesLayer
                    ? 'bg-purple-500/25 text-purple-300 border-purple-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {showRoutesLayer ? 'Visible' : 'Hidden'}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Volunteer List (Vertical Only, Never Side Scrolls) */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-2.5 min-h-0 no-scrollbar">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
            <span>Roster & Activity ({filteredVolunteers.length})</span>
            <span>Doors / Signs</span>
          </div>

          {filteredVolunteers.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-white/5 flex flex-col items-center gap-1">
              <span className="text-base">🔍</span>
              <span>No volunteers found matching your criteria.</span>
            </div>
          ) : (
            filteredVolunteers.map(v => {
              const isSelected = selectedVolunteer?.toLowerCase().trim() === v.volunteer_name.toLowerCase().trim();

              return (
                <div
                  key={v.volunteer_name}
                  onClick={() => {
                    if (isSelected) {
                      onSelectVolunteer(null);
                    } else {
                      onSelectVolunteer(v.volunteer_name);
                      if (onFlyToVolunteer) {
                        onFlyToVolunteer(v.latitude, v.longitude);
                      }
                    }
                  }}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {/* Status Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {v.volunteer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {v.is_active && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-white leading-tight truncate">
                          {v.volunteer_name}
                        </p>
                        {isSelected && (
                          <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-500 text-slate-950 shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {v.role} • {v.current_action || (v.is_active ? 'In Field' : 'Offline')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs font-bold text-white justify-end">
                      <span className="text-emerald-400" title="Doors Visited">{v.doorsKnocked}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-teal-300" title="Signs Placed">{v.signsPlaced}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFlyToVolunteer) {
                          onFlyToVolunteer(v.latitude, v.longitude);
                        }
                      }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 mt-0.5 font-medium ml-auto transition"
                    >
                      <Navigation className="w-2.5 h-2.5" /> Fly to
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pinned Footer */}
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live GPS Beacon
          </span>
          <button
            type="button"
            onClick={handleResetAll}
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      </div>
    </div>
  );
}
