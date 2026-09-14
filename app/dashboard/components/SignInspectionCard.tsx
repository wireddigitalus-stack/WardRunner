'use client';

import React from 'react';
import { X, Navigation } from 'lucide-react';
import { Sign, SignType } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';

const SIGN_TYPE_META: Record<SignType, { emoji: string }> = {
  yard_sign: { emoji: '🏡' },
  large_sign: { emoji: '🪧' },
  banner: { emoji: '🚩' },
  billboard: { emoji: '🏢' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface SignInspectionCardProps {
  sign: Sign;
  isDark: boolean;
  streetAddress: string;
  loadingAddress: boolean;
  dragStyle: React.CSSProperties;
  dragProps: Record<string, any>;
  resetPosition: () => void;
  onDismiss: () => void;
}

export default function SignInspectionCard({
  sign, isDark, streetAddress, loadingAddress,
  dragStyle, dragProps, resetPosition, onDismiss,
}: SignInspectionCardProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
      <div style={dragStyle} className="w-full max-w-[380px] max-h-[88vh] overflow-y-auto no-scrollbar pointer-events-auto animate-slide-up">
        <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl">
          <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${sign.is_competitor ? 'from-rose-500 to-pink-500' : 'from-emerald-400 to-teal-400'}`} />

          <button onClick={onDismiss} className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <X className="w-3.5 h-3.5 opacity-50" />
          </button>

          <div {...dragProps} onDoubleClick={resetPosition} className="select-none md:cursor-grab md:active:cursor-grabbing pb-1" title="Drag to move card • Double click to center">
            <div className="hidden md:flex items-center justify-center -mt-2 mb-2.5">
              <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/50 transition-colors" />
            </div>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sign.is_competitor ? 'from-rose-500 to-pink-600' : 'from-emerald-400 to-teal-500'} flex items-center justify-center text-2xl shadow-lg ${sign.is_competitor ? 'shadow-rose-500/30' : 'shadow-emerald-500/30'}`}>
                {SIGN_TYPE_META[sign.sign_type]?.emoji || '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${sign.is_competitor ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {sign.is_competitor ? 'Opponent Sighting' : 'Official Campaign'}
                </span>
                <h3 className="font-extrabold text-base mt-1 truncate">
                  {sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}
                </h3>
                <p className="text-xs opacity-50 capitalize mt-0.5">
                  {sign.sign_type.replace('_', ' ')} · <span className={sign.is_competitor ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>{sign.is_competitor ? 'Reported' : (sign.status === 'placed' ? 'Placed' : sign.status.replace('_', ' '))}</span> {relativeTime(sign.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/8'} space-y-3 text-xs`}>
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">📍 Street Address</span>
              {loadingAddress ? (
                <span className={`inline-block h-4 w-44 rounded mt-1 animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              ) : (
                <span className="font-extrabold mt-1 block text-sm text-white">{streetAddress || sign.street_address || 'Bristol, TN'}</span>
              )}
              <span className="text-[10px] opacity-40 block mt-0.5 font-mono">Bristol, TN • {Number(sign.latitude).toFixed(4)}, {Number(sign.longitude).toFixed(4)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold opacity-40 block">{sign.is_competitor ? 'Reported By' : 'Placed By'}</span>
                <span className="font-semibold mt-0.5 block">{sign.is_competitor ? 'Opponent Volunteer' : 'Campaign Volunteer'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold opacity-40 block">GPS</span>
                <span className="font-mono opacity-60 mt-0.5 block">{Number(sign.latitude).toFixed(4)}, {Number(sign.longitude).toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <a
              href={getAppleMapsUrl({ address: streetAddress || sign.street_address, lat: Number(sign.latitude), lng: Number(sign.longitude), title: `Sign: ${streetAddress || sign.street_address || 'Bristol TN'}`, mode: 'directions' })}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all"
            >
              <Navigation className="w-3.5 h-3.5" /> View in Apple Maps
            </a>
            <button onClick={onDismiss} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
