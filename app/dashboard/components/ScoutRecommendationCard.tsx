'use client';

import React from 'react';
import { X, Navigation, Check, Users } from 'lucide-react';
import { Recommendation, SignType } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';

interface ScoutRecommendationCardProps {
  rec: Recommendation;
  isDark: boolean;
  recAddress: string;
  loadingRecAddress: boolean;
  selectedRecSignType: SignType;
  approvingRec: boolean;
  dragStyle: React.CSSProperties;
  dragProps: Record<string, any>;
  resetPosition: () => void;
  onDismiss: () => void;
  onSetSignType: (type: SignType) => void;
  onApprove: (rec: Recommendation, signType: SignType) => void;
  onDecline: (rec: Recommendation) => void;
  onAssign: (rec: Recommendation) => void;
}

export default function ScoutRecommendationCard({
  rec, isDark, recAddress, loadingRecAddress,
  selectedRecSignType, approvingRec,
  dragStyle, dragProps, resetPosition,
  onDismiss, onSetSignType, onApprove, onDecline, onAssign,
}: ScoutRecommendationCardProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div style={dragStyle} className="w-full max-w-[420px] max-h-[88vh] overflow-y-auto no-scrollbar pointer-events-auto animate-slide-up">
        <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl shadow-amber-500/10">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300" />

          <button onClick={onDismiss} className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <X className="w-3.5 h-3.5 opacity-50" />
          </button>

          <div {...dragProps} onDoubleClick={resetPosition} className="select-none md:cursor-grab md:active:cursor-grabbing pb-1" title="Drag to move card • Double click to center">
            <div className="hidden md:flex items-center justify-center -mt-2 mb-2.5">
              <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/50 transition-colors" />
            </div>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl text-white font-black shadow-lg shadow-amber-500/30 shrink-0">★</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    rec.priority === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    rec.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>{rec.priority} Priority</span>
                  <span className="text-[10px] font-black text-amber-400">★ {rec.score}/10 Score</span>
                </div>
                <h3 className="font-extrabold text-base mt-1 truncate">{rec.street}</h3>
                <p className="text-xs opacity-60 mt-0.5 font-medium">
                  {rec.aadt ? `${rec.aadt.toLocaleString()} vehicles/day` : 'High-impact corridor'}
                </p>
              </div>
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/8'} space-y-3 text-xs`}>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">📍 Street Address / Intersection</span>
              {loadingRecAddress ? (
                <span className={`inline-block h-4 w-44 rounded mt-1 animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              ) : (
                <span className="font-extrabold mt-1 block text-sm text-white">{recAddress || rec.street}</span>
              )}
              <span className="text-[10px] opacity-40 block mt-0.5 font-mono">Bristol, TN • {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold opacity-40 block">🎯 Strategic Rationale</span>
              <p className="text-xs opacity-75 leading-relaxed mt-0.5">{rec.reason}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold opacity-40 block mb-1.5">Deploy As Sign Type</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'yard_sign' as SignType, emoji: '🏡', label: 'Yard Sign' },
                  { id: 'large_sign' as SignType, emoji: '🪧', label: 'Large 4×4' },
                  { id: 'banner' as SignType, emoji: '🚩', label: 'Banner' },
                ].map(t => (
                  <button key={t.id} type="button" onClick={() => onSetSignType(t.id)}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      selectedRecSignType === t.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                        : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                    }`}>
                    <span className="text-base block">{t.emoji}</span>
                    <span className="text-[10px] font-bold block mt-0.5 leading-none">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button onClick={() => onApprove(rec, selectedRecSignType)} disabled={approvingRec}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.97] transition-all disabled:opacity-50 truncate">
              <Check className="w-4 h-4 shrink-0" /> <span>{approvingRec ? 'Deploying…' : 'Approve & Deploy'}</span>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => onAssign(rec)}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-300 border border-purple-500/30 bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                title="Assign this Scout recommendation to a field volunteer">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" /> <span>Assign</span>
              </button>
              <button onClick={() => onDecline(rec)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 active:scale-95 shrink-0">
                Decline
              </button>
              <a href={getAppleMapsUrl({ address: recAddress || rec.street, lat: rec.lat, lng: rec.lng, title: rec.street, mode: 'view' })}
                target="_blank" rel="noopener noreferrer"
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition shrink-0 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                title="Open Address in Apple Maps">
                <Navigation className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
