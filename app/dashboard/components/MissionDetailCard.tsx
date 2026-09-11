'use client';

import { Target, Users, Navigation, CheckCircle2, X, AlertCircle, Clock, MapPin } from 'lucide-react';
import type { VolunteerAssignment } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';

interface MissionDetailCardProps {
  mission: VolunteerAssignment | null;
  onClose: () => void;
  onToggleComplete: (id: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
  isDark?: boolean;
}

export default function MissionDetailCard({
  mission,
  onClose,
  onToggleComplete,
  onFlyTo,
  isDark = true,
}: MissionDetailCardProps) {
  if (!mission) return null;

  const isCompleted = mission.status === 'completed';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div className="w-full max-w-[420px] max-h-[88vh] overflow-y-auto no-scrollbar pointer-events-auto animate-slide-up">
        <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl border border-white/10">
        {/* Accent Edge */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
          isCompleted
            ? 'from-emerald-400 to-teal-400'
            : mission.priority === 'critical'
            ? 'from-rose-500 to-amber-500'
            : 'from-purple-500 via-indigo-500 to-emerald-400'
        }`} />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg shrink-0 ${
            isCompleted
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
              : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30'
          }`}>
            <Target className="w-6 h-6 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : mission.priority === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : mission.priority === 'high'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              }`}>
                {isCompleted ? 'Completed' : `${mission.priority} Priority`}
              </span>

              <span className="text-[10px] text-slate-400 font-mono">
                {mission.target_type === 'precinct' ? 'Precinct Target' : 'Intersection Target'}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-white mt-1 leading-snug">
              {mission.title}
            </h3>

            {mission.street_address && mission.street_address !== mission.title && (
              <p className="text-xs text-slate-400 mt-0.5">{mission.street_address}</p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Assigned Volunteer
            </span>
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mt-0.5 truncate">
              <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              {mission.volunteer_name}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Quota Requested
            </span>
            <span className="text-xs font-black text-emerald-400 mt-0.5 block">
              {mission.quantity}× {mission.sign_type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Special Instructions Quote */}
        {mission.notes && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 pl-3 border-l-2 border-purple-400 italic">
            "{mission.notes}"
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onFlyTo(mission.lat, mission.lng)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.97] transition-all"
          >
            <MapPin className="w-3.5 h-3.5" /> Center Location
          </button>

          <a
            href={getAppleMapsUrl({
              address: mission.street_address,
              lat: mission.lat,
              lng: mission.lng,
              title: mission.title,
              mode: 'view',
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Open Address in Apple Maps"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Open in Maps</span>
          </a>

          <button
            onClick={() => onToggleComplete(mission.id)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              isCompleted
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
