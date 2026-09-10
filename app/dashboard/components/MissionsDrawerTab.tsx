'use client';

import React, { useState } from 'react';
import { Target, Users, Plus, Navigation, CheckCircle2, Clock, MapPin, Send, AlertCircle } from 'lucide-react';
import type { VolunteerAssignment } from '@/lib/types';

interface MissionsDrawerTabProps {
  assignments: VolunteerAssignment[];
  onOpenDispatch: () => void;
  onSelectMission: (mission: VolunteerAssignment) => void;
  onToggleComplete: (id: string) => void;
  isDark?: boolean;
}

export default function MissionsDrawerTab({
  assignments,
  onOpenDispatch,
  onSelectMission,
  onToggleComplete,
  isDark = true,
}: MissionsDrawerTabProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const activeCount = assignments.filter(a => a.status !== 'completed').length;
  const completedCount = assignments.filter(a => a.status === 'completed').length;

  const filtered = assignments.filter(a => {
    if (filter === 'active') return a.status !== 'completed';
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-emerald-500/10 border border-purple-500/25">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Sign Dispatch Hub
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {activeCount} active mission{activeCount === 1 ? '' : 's'} assigned to field crew
          </p>
        </div>

        <button
          onClick={onOpenDispatch}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dispatch</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[11px]">
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            filter === 'active'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Active</span>
          <span className="text-[10px] font-mono">({activeCount})</span>
        </button>

        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            filter === 'all'
              ? 'bg-white/15 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>All</span>
          <span className="text-[10px] font-mono">({assignments.length})</span>
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            filter === 'completed'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Done</span>
          <span className="text-[10px] font-mono">({completedCount})</span>
        </button>
      </div>

      {/* Missions List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <Target className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No missions in this view.</p>
            <button
              onClick={onOpenDispatch}
              className="text-xs font-bold text-purple-400 hover:underline inline-block mt-1"
            >
              + Dispatch a new sign mission
            </button>
          </div>
        ) : (
          filtered.map((m) => {
            const isDone = m.status === 'completed';
            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isDone
                    ? 'bg-white/[0.01] border-white/5 opacity-60'
                    : 'bg-white/[0.03] border-white/10 hover:border-purple-500/30'
                }`}
                onClick={() => onSelectMission(m)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        m.priority === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : m.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      }`}>
                        {m.priority}
                      </span>

                      <h4 className="text-xs font-extrabold text-white truncate">
                        {m.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                      <span className="text-purple-300 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3" /> {m.volunteer_name}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">
                        {m.quantity}× {m.sign_type.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500">
                        {m.target_type === 'precinct' ? 'Precinct' : 'Intersection'}
                      </span>
                    </div>

                    {m.notes && (
                      <p className="text-[11px] text-slate-300 mt-1 pl-2 border-l border-purple-500/40 italic truncate">
                        "{m.notes}"
                      </p>
                    )}
                  </div>

                  {/* Quick Action */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleComplete(m.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        isDone
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                      }`}
                      title={isDone ? 'Mark as Active' : 'Mark as Completed'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectMission(m)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                      title="Center location on map"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
