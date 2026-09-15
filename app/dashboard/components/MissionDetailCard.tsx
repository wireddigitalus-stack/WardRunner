'use client';

import React from 'react';
import { Target, Users, Navigation, CheckCircle2, MapPin } from 'lucide-react';
import type { VolunteerAssignment } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import CampaignWindowFrame from './CampaignWindowFrame';

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
}: MissionDetailCardProps) {
  if (!mission) return null;

  const isCompleted = mission.status === 'completed';

  return (
    <CampaignWindowFrame
      title="Mission Dispatch Intel"
      subtitle={mission.street_address || mission.title}
      badge={isCompleted ? 'Completed' : `${mission.priority} Priority`}
      badgeColor={
        isCompleted
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          : mission.priority === 'critical'
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : mission.priority === 'high'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
      }
      icon={<Target className="w-4 h-4 text-purple-400" />}
      onClose={onClose}
      defaultWidth={420}
      doubleWidth={800}
      accentGradient={
        isCompleted
          ? 'from-emerald-400 to-teal-400'
          : mission.priority === 'critical'
          ? 'from-rose-500 to-amber-500'
          : 'from-purple-500 via-indigo-500 to-emerald-400'
      }
    >
      {({ isDoubleSize }) => (
        <div className={isDoubleSize ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
          {/* Identity & Actions Column */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg shrink-0 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                    : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30'
                }`}
              >
                <Target className="w-7 h-7 text-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : mission.priority === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : mission.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}
                  >
                    {isCompleted ? 'Completed' : `${mission.priority} Priority`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mission.target_type === 'precinct' ? 'Precinct Mission' : 'Intersection Target'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white mt-1 leading-snug truncate">
                  {mission.title}
                </h3>

                {mission.street_address && mission.street_address !== mission.title && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{mission.street_address}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onFlyTo(mission.lat, mission.lng)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.97] transition-all min-w-[130px]"
              >
                <MapPin className="w-3.5 h-3.5" /> Center on Map
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
                title="Open in Apple Maps"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Apple Maps</span>
              </a>

              <button
                type="button"
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

          {/* Details & Assignment Column */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Volunteer
                </span>
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mt-0.5 truncate">
                  <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  {mission.volunteer_name}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quota Requested
                </span>
                <span className="text-xs font-black text-emerald-400 mt-0.5 block truncate">
                  {mission.quantity}× {mission.sign_type.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Special Instructions Note */}
            {mission.notes && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 pl-3 border-l-2 border-purple-400 italic">
                &ldquo;{mission.notes}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </CampaignWindowFrame>
  );
}
