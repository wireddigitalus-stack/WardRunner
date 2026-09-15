'use client';

import React from 'react';
import { Navigation, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Sign, SignType } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import CampaignWindowFrame from './CampaignWindowFrame';

const SIGN_TYPE_META: Record<SignType, { emoji: string; label: string }> = {
  yard_sign: { emoji: '🏡', label: 'Yard Sign' },
  large_sign: { emoji: '🪧', label: 'Large 4×4' },
  banner: { emoji: '🚩', label: 'Banner' },
  billboard: { emoji: '🏢', label: 'Billboard' },
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
  dragStyle?: React.CSSProperties;
  dragProps?: Record<string, any>;
  resetPosition?: () => void;
  onDismiss: () => void;
}

export default function SignInspectionCard({
  sign,
  isDark,
  streetAddress,
  loadingAddress,
  onDismiss,
}: SignInspectionCardProps) {
  const meta = SIGN_TYPE_META[sign.sign_type] || { emoji: '📍', label: sign.sign_type };
  const candidateName = sign.is_competitor ? (sign.competitor_name || 'Opponent Candidate') : 'Melissa K. Brown';
  const displayAddress = streetAddress || sign.street_address || 'Bristol, TN';

  return (
    <CampaignWindowFrame
      title={sign.is_competitor ? 'Opponent Sign Intel' : 'Official Campaign Sign'}
      subtitle={displayAddress}
      badge={sign.is_competitor ? 'Opponent' : 'Official'}
      badgeColor={sign.is_competitor ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}
      icon={<span>{meta.emoji}</span>}
      onClose={onDismiss}
      defaultWidth={400}
      doubleWidth={780}
      accentGradient={sign.is_competitor ? 'from-rose-500 via-pink-500 to-amber-500' : 'from-emerald-400 via-teal-400 to-cyan-400'}
    >
      {({ isDoubleSize }) => (
        <div className={isDoubleSize ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
          {/* Main Identity Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                  sign.is_competitor ? 'from-rose-500 to-pink-600 shadow-rose-500/30' : 'from-emerald-400 to-teal-500 shadow-emerald-500/30'
                } flex items-center justify-center text-2xl shadow-lg shrink-0`}
              >
                {meta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      sign.is_competitor ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {sign.is_competitor ? 'Opponent Sighting' : 'Official Campaign'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {relativeTime(sign.created_at)}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white mt-1 truncate">
                  {candidateName}
                </h3>
                <p className="text-xs text-slate-400 capitalize mt-0.5 flex items-center gap-1.5">
                  <span>{meta.label}</span>
                  <span className="text-slate-600">•</span>
                  <span className={sign.is_competitor ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {sign.is_competitor ? 'Reported' : sign.status === 'placed' ? 'Placed Active' : sign.status.replace('_', ' ')}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions (Apple Maps Navigation) */}
            <div className="flex gap-2 pt-1">
              <a
                href={getAppleMapsUrl({
                  address: displayAddress,
                  lat: Number(sign.latitude),
                  lng: Number(sign.longitude),
                  title: `Sign: ${displayAddress}`,
                  mode: 'directions',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 py-2.5 rounded-xl ${
                  sign.is_competitor ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/25' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/25'
                } text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all`}
              >
                <Navigation className="w-3.5 h-3.5" /> Navigate (Apple Maps)
              </a>
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Location & Tactical Details */}
          <div className="space-y-3">
            {/* Street Address Box */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Street Address / Location
              </span>
              {loadingAddress ? (
                <div className="h-4 w-44 rounded mt-1.5 animate-pulse bg-white/10" />
              ) : (
                <span className="font-extrabold mt-1 block text-sm text-white">{displayAddress}</span>
              )}
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                Bristol, TN • {Number(sign.latitude).toFixed(4)}, {Number(sign.longitude).toFixed(4)}
              </span>
            </div>

            {/* Attribution Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {sign.is_competitor ? 'Reported By' : 'Placed By'}
                </span>
                <span className="font-semibold text-white mt-0.5 block truncate">
                  {sign.placed_by_name || (sign.is_competitor ? 'Field Ground Crew' : 'Campaign Volunteer')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">GPS Coordinates</span>
                <span className="font-mono text-slate-300 mt-0.5 block truncate text-[11px]">
                  {Number(sign.latitude).toFixed(4)}, {Number(sign.longitude).toFixed(4)}
                </span>
              </div>
            </div>

            {/* Photo Preview if available */}
            {sign.photo_url && (
              <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Field Photo</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sign.photo_url} alt="Sign Photo" className="w-full h-32 object-cover rounded-xl" />
              </div>
            )}
          </div>
        </div>
      )}
    </CampaignWindowFrame>
  );
}
