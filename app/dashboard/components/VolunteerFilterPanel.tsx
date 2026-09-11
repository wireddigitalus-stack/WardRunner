'use client';

import React from 'react';
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
} from 'lucide-react';
import { VolunteerLocationPing, CanvassRecord, Sign } from '@/lib/types';

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
}

const GROUPS = [
  { id: 'all', label: 'All Force', icon: '👥' },
  { id: 'canvasser', label: 'Door Canvassers', icon: '🚪' },
  { id: 'flyer', label: 'Flyer Hangers', icon: '📰' },
  { id: 'sign', label: 'Sign Runners', icon: '🪧' },
  { id: 'town_hall', label: 'Town Hall & Events', icon: '🏛️' },
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
}: VolunteerFilterPanelProps) {
  if (!isOpen) return null;

  // Calculate statistics per volunteer
  const volunteerStats = volunteerPings.map(ping => {
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

  // Filter volunteer list based on selected group
  const filteredVolunteers = volunteerStats.filter(v => {
    if (selectedGroup === 'all') return true;
    const role = (v.role || '').toLowerCase();
    if (selectedGroup === 'canvasser') return role.includes('canvass') || role.includes('door');
    if (selectedGroup === 'flyer') return role.includes('flyer') || role.includes('lit');
    if (selectedGroup === 'sign') return role.includes('sign') || role.includes('scout') || role.includes('field');
    if (selectedGroup === 'town_hall') return role.includes('town') || role.includes('event');
    return true;
  });

  return (
    <div className="absolute top-20 left-4 z-30 w-84 sm:w-96 max-h-[80vh] glass rounded-3xl p-4 shadow-2xl border border-white/10 flex flex-col animate-slide-up backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
              Field Force Filter
            </h3>
            <p className="text-[11px] text-slate-400">
              Filter map by team or individual volunteer
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role Group Pill Selector */}
      <div className="py-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => onSelectGroup(g.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedGroup === g.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-white/5'
            }`}
          >
            <span>{g.icon}</span>
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      {/* Selected Volunteer Indicator & Reset */}
      {selectedVolunteer && (
        <div className="mb-2 p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-300 font-medium">Filtering by: </span>
              <span className="text-emerald-300 font-extrabold">{selectedVolunteer}</span>
            </div>
          </div>
          <button
            onClick={() => onSelectVolunteer(null)}
            className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase tracking-wider transition"
          >
            Show All
          </button>
        </div>
      )}

      {/* Volunteer List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span>Roster & Activity ({filteredVolunteers.length})</span>
          <span>Doors / Signs</span>
        </div>

        {filteredVolunteers.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-white/5">
            No volunteers active in this category.
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
                className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/70 hover:bg-slate-800/80 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status Avatar */}
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                      {v.volunteer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    {v.is_active && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-white leading-tight">
                        {v.volunteer_name}
                      </p>
                      {isSelected && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {v.role} • {v.current_action || (v.is_active ? 'In Field' : 'Offline')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs font-bold text-white justify-end">
                    <span className="text-emerald-400">{v.doorsKnocked}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-teal-300">{v.signsPlaced}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onFlyToVolunteer) {
                        onFlyToVolunteer(v.latitude, v.longitude);
                      }
                    }}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 mt-0.5 font-medium ml-auto"
                  >
                    <Navigation className="w-2.5 h-2.5" /> Fly to
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Live GPS Beacon Active
        </span>
        <button
          onClick={() => onSelectVolunteer(null)}
          className="text-emerald-400 hover:underline font-semibold"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );
}
