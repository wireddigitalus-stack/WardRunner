'use client';

import React from 'react';
import { X, Navigation } from 'lucide-react';
import { CanvassRecord } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface CanvassInspectionCardProps {
  record: CanvassRecord;
  isDark: boolean;
  dragStyle: React.CSSProperties;
  dragProps: Record<string, any>;
  resetPosition: () => void;
  onDismiss: () => void;
}

export default function CanvassInspectionCard({
  record, isDark, dragStyle, dragProps, resetPosition, onDismiss,
}: CanvassInspectionCardProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div style={dragStyle} className="w-full max-w-[420px] max-h-[88vh] overflow-y-auto no-scrollbar pointer-events-auto animate-slide-up">
        <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl">
          <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
            record.result === 'contact' ? 'from-purple-400 to-violet-400'
            : record.result === 'left_flyer' ? 'from-amber-400 to-orange-400'
            : 'from-slate-400 to-slate-600'
          }`} />

          <button onClick={onDismiss} className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <X className="w-3.5 h-3.5 opacity-50" />
          </button>

          <div {...dragProps} onDoubleClick={resetPosition} className="select-none md:cursor-grab md:active:cursor-grabbing pb-1" title="Drag to move card • Double click to center">
            <div className="hidden md:flex items-center justify-center -mt-2 mb-2.5">
              <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/50 transition-colors" />
            </div>
            <div className="flex items-start gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg ${
                record.result === 'contact' ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                : record.result === 'left_flyer' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}>
                {record.result === 'contact' ? '🤝' : record.result === 'left_flyer' ? '📰' : '🚪'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    record.result === 'contact' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : record.result === 'left_flyer' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                  }`}>
                    {record.result === 'contact' ? 'Spoke With Voter' : record.result === 'left_flyer' ? 'Left Campaign Flyer' : 'No Contact / Not Home'}
                  </span>
                </div>
                <h3 className="font-extrabold text-base mt-1 truncate">{record.voter_name || 'Voter Contact'}</h3>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
                  Canvasser: <span className="text-white font-semibold">{record.volunteer_name || 'Field Team'}</span> · {relativeTime(record.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 space-y-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[9px] uppercase font-bold text-teal-400 tracking-wider block">📍 Address</span>
              <p className="font-extrabold text-sm text-white mt-0.5 truncate">{record.street_address || 'Bristol, TN'}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {Number(record.latitude).toFixed(4)}, {Number(record.longitude).toFixed(4)}
              </p>
            </div>

            {record.sentiment && (
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Voter Sentiment</span>
                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-lg ${
                  record.sentiment === 'strong_support' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  record.sentiment === 'lean_support' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                  record.sentiment === 'undecided' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {record.sentiment.replace('_', ' ')}
                </span>
              </div>
            )}

            {record.wants_yard_sign && (
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <span>🏡</span><span>Voter Requested Yard Sign for Front Lawn!</span>
              </div>
            )}

            {record.notes && (
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Field Notes</span>
                <p className="text-xs text-slate-200 mt-1 italic">&ldquo;{record.notes}&rdquo;</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <a
              href={getAppleMapsUrl({ address: record.street_address, lat: Number(record.latitude), lng: Number(record.longitude), title: `Door: ${record.street_address || 'Voter'}`, mode: 'directions' })}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.98] transition"
            >
              <Navigation className="w-3.5 h-3.5" /> Navigate
            </a>
            <button onClick={onDismiss} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
