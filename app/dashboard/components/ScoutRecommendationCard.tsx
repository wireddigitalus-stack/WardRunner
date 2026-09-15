'use client';

import React from 'react';
import { Navigation, Check, Users, MapPin, Sparkles } from 'lucide-react';
import { Recommendation, SignType } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import CampaignWindowFrame from './CampaignWindowFrame';

interface ScoutRecommendationCardProps {
  rec: Recommendation;
  isDark: boolean;
  recAddress: string;
  loadingRecAddress: boolean;
  selectedRecSignType: SignType;
  approvingRec: boolean;
  dragStyle?: React.CSSProperties;
  dragProps?: Record<string, any>;
  resetPosition?: () => void;
  onDismiss: () => void;
  onSetSignType: (type: SignType) => void;
  onApprove: (rec: Recommendation, signType: SignType) => void;
  onDecline: (rec: Recommendation) => void;
  onAssign: (rec: Recommendation) => void;
}

export default function ScoutRecommendationCard({
  rec,
  recAddress,
  loadingRecAddress,
  selectedRecSignType,
  approvingRec,
  onDismiss,
  onSetSignType,
  onApprove,
  onDecline,
  onAssign,
}: ScoutRecommendationCardProps) {
  const displayAddress = recAddress || rec.street;

  return (
    <CampaignWindowFrame
      title="Scout AI Recommendation"
      subtitle={displayAddress}
      badge={`${rec.priority} Priority`}
      badgeColor={
        rec.priority === 'critical'
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : rec.priority === 'high'
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
      }
      icon={<span>★</span>}
      onClose={onDismiss}
      defaultWidth={420}
      doubleWidth={820}
      accentGradient="from-amber-400 via-orange-500 to-amber-300"
    >
      {({ isDoubleSize }) => (
        <div className={isDoubleSize ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
          {/* Identity & Actions Column */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl text-white font-black shadow-lg shadow-amber-500/30 shrink-0">
                ★
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      rec.priority === 'critical'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : rec.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {rec.priority} Priority
                  </span>
                  <span className="text-[10px] font-black text-amber-400">
                    ★ {rec.score}/10 Score
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white mt-1 truncate">{rec.street}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {rec.aadt ? `${rec.aadt.toLocaleString()} vehicles/day` : 'High-impact corridor'}
                </p>
              </div>
            </div>

            {/* Strategic Rationale */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Strategic Rationale
              </span>
              <p className="text-xs text-slate-200 leading-relaxed mt-1">{rec.reason}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => onApprove(rec, selectedRecSignType)}
                disabled={approvingRec}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.97] transition-all disabled:opacity-50 truncate"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{approvingRec ? 'Deploying…' : 'Approve & Deploy'}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAssign(rec)}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-300 border border-purple-500/30 bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                  title="Assign to a field volunteer"
                >
                  <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" /> <span>Assign</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDecline(rec)}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 active:scale-95 transition shrink-0"
                >
                  Decline
                </button>
                <a
                  href={getAppleMapsUrl({
                    address: displayAddress,
                    lat: rec.lat,
                    lng: rec.lng,
                    title: rec.street,
                    mode: 'view',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition shrink-0"
                  title="Open in Apple Maps"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Location & Sign Type Selection Column */}
          <div className="space-y-3">
            {/* Street Address Box */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" /> Street Address / Intersection
              </span>
              {loadingRecAddress ? (
                <div className="h-4 w-44 rounded mt-1.5 animate-pulse bg-white/10" />
              ) : (
                <span className="font-extrabold mt-1 block text-sm text-white">{displayAddress}</span>
              )}
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                Bristol, TN • {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
              </span>
            </div>

            {/* Deploy As Sign Type Picker */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Deploy As Sign Type
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'yard_sign' as SignType, emoji: '🏡', label: 'Yard Sign' },
                  { id: 'large_sign' as SignType, emoji: '🪧', label: 'Large 4×4' },
                  { id: 'banner' as SignType, emoji: '🚩', label: 'Banner' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSetSignType(t.id)}
                    className={`p-2.5 rounded-xl text-center border transition-all ${
                      selectedRecSignType === t.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="text-xl block">{t.emoji}</span>
                    <span className="text-[10px] font-bold block mt-1 leading-none">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </CampaignWindowFrame>
  );
}
