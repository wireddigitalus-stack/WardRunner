'use client';

import React, { useState, useEffect } from 'react';
import { useDraggable } from '@/lib/useDraggable';
import {
  X,
  Navigation,
  CheckCircle2,
  Clock,
  Footprints,
  Users,
  MapPin,
  ExternalLink,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { CanvassRoute, CanvassRecord } from '@/lib/types';
import { calculateRouteProgress } from '@/lib/canvassRouteData';

interface RouteDetailCardProps {
  route: CanvassRoute | null;
  onClose: () => void;
  canvassRecords: CanvassRecord[];
  onFlyToRoute: (lat: number, lng: number) => void;
  onAssignVolunteer: (routeId: string, volunteerName: string) => void;
  onToggleStatus: (routeId: string, status: any) => void;
  availableVolunteers: { id: string; name: string; role: string }[];
  isDark?: boolean;
}

export default function RouteDetailCard({
  route,
  onClose,
  canvassRecords,
  onFlyToRoute,
  onAssignVolunteer,
  onToggleStatus,
  availableVolunteers,
  isDark = true,
}: RouteDetailCardProps) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const { isDragging, resetPosition, dragProps, style: dragStyle } = useDraggable();

  useEffect(() => {
    if (route) resetPosition();
  }, [route?.id, resetPosition]);

  if (!route) return null;

  const progress = calculateRouteProgress(route, canvassRecords);
  const isAssigned = !!route.assigned_volunteer_name;
  const isCompleted = route.status === 'completed';

  const appleMapsUrl = `https://maps.apple.com/?daddr=${route.start_point.lat},${route.start_point.lng}&dirflg=w`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div 
        style={dragStyle} 
        className="w-full max-w-[440px] max-h-[88vh] overflow-y-auto no-scrollbar pointer-events-auto animate-slide-up"
      >
        <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl border border-white/10">
        {/* Top Gradient Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${isCompleted ? 'from-emerald-400 to-teal-400' : isAssigned ? 'from-purple-500 to-indigo-500' : 'from-amber-400 to-orange-500'}`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-3.5 right-3.5 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-black/5 text-zinc-500'}`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Desktop Drag Handle & Header */}
        <div
          {...dragProps}
          onDoubleClick={resetPosition}
          className="select-none md:cursor-grab md:active:cursor-grabbing pb-1"
          title="Drag to move card • Double click to center"
        >
          {/* Subtle Drag Handle Pill */}
          <div className="hidden md:flex items-center justify-center -mt-2 mb-2.5">
            <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/50 transition-colors" />
          </div>

          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-lg ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20'
                : isAssigned
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-purple-500/20'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-amber-500/20'
            }`}>
              <Footprints className="w-6 h-6" />
            </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PRECINCT {route.precinct_code}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : isAssigned
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isCompleted ? 'COMPLETED' : isAssigned ? 'ASSIGNED' : 'UNASSIGNED'}
              </span>
            </div>

            <h3 className="font-extrabold text-base mt-1 text-white tracking-tight truncate">
              {route.name}
            </h3>

            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                ~{route.estimated_walk_minutes} mins
              </span>
              <span>•</span>
              <span>{route.distance_miles} miles</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{route.target_doors} Target Doors</span>
            </p>
          </div>
        </div>
        </div>

        {/* Live Knock Progress Meter */}
        <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Doors Knocked Along Route
            </span>
            <span className="font-bold font-mono text-emerald-400">
              {progress.doorsKnocked} / {route.target_doors} ({progress.percent}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
            <span>🤝 Contacts: <strong className="text-white">{progress.contacts}</strong></span>
            <span>📰 Flyers: <strong className="text-white">{progress.flyers}</strong></span>
            <span>🚪 No Contact: <strong className="text-white">{progress.noContacts}</strong></span>
          </div>
        </div>

        {/* Assigned Volunteer Row */}
        <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block leading-none">
                Assigned Canvasser
              </span>
              <span className="text-xs font-bold text-white mt-1 block">
                {route.assigned_volunteer_name || 'No volunteer assigned yet'}
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAssigned ? 'Reassign' : 'Assign'}</span>
            </button>

            {showAssignDropdown && (
              <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl bg-slate-900 border border-white/15 p-1.5 shadow-2xl z-50 animate-slide-up">
                <div className="text-[10px] font-bold text-zinc-400 px-2 py-1 uppercase tracking-wider">
                  Select Volunteer
                </div>
                {availableVolunteers.map(vol => (
                  <button
                    key={vol.id}
                    onClick={() => {
                      onAssignVolunteer(route.id, vol.name);
                      setShowAssignDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                      route.assigned_volunteer_name === vol.name
                        ? 'bg-purple-500/30 text-purple-200'
                        : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <span>{vol.name}</span>
                    <span className="text-[9px] text-zinc-400">{vol.role.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Waypoints Sequence List */}
        {route.waypoints && route.waypoints.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Walking Route Waypoints
            </span>
            {route.waypoints.map((wp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-white block truncate">{wp.street}</span>
                    {wp.house_range && (
                      <span className="text-[10px] text-zinc-400 block">{wp.house_range}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                  ~{wp.target_doors} doors
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={() => onFlyToRoute(route.start_point.lat, route.start_point.lng)}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fly to Start</span>
          </button>

          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white transition active:scale-95"
            title="Open in Apple Maps Walking Navigation"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={() => onToggleStatus(route.id, isCompleted ? 'in_progress' : 'completed')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
              isCompleted
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isCompleted ? 'Mark Active' : 'Complete Route'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
