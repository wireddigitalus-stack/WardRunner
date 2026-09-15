'use client';

import React from 'react';
import { Navigation, MapPin, MessageSquare, HeartHandshake, UserCheck } from 'lucide-react';
import { CanvassRecord, CanvassResult } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import CampaignWindowFrame from './CampaignWindowFrame';

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
  dragStyle?: React.CSSProperties;
  dragProps?: Record<string, any>;
  resetPosition?: () => void;
  onDismiss: () => void;
}

export default function CanvassInspectionCard({
  record,
  onDismiss,
}: CanvassInspectionCardProps) {
  const resultMeta: Record<CanvassResult, { emoji: string; label: string; color: string; badge: string }> = {
    contact: { emoji: '🤝', label: 'Spoke With Voter', color: 'from-purple-500 to-violet-600', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    left_flyer: { emoji: '📰', label: 'Left Campaign Flyer', color: 'from-amber-500 to-orange-600', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    no_contact: { emoji: '🚪', label: 'Not Home / No Contact', color: 'from-slate-600 to-slate-700', badge: 'bg-slate-700/40 text-slate-300 border-slate-600' },
  };
  const currentMeta = resultMeta[record.result] || resultMeta.no_contact;

  return (
    <CampaignWindowFrame
      title="Canvass Door Intel"
      subtitle={record.street_address || 'Bristol, TN'}
      badge={record.result === 'contact' ? 'Contact' : record.result === 'left_flyer' ? 'Flyer' : 'No Contact'}
      badgeColor={currentMeta.badge}
      icon={<span>{currentMeta.emoji}</span>}
      onClose={onDismiss}
      defaultWidth={420}
      doubleWidth={800}
      accentGradient={
        record.result === 'contact'
          ? 'from-purple-400 via-indigo-400 to-teal-400'
          : record.result === 'left_flyer'
          ? 'from-amber-400 via-orange-400 to-yellow-400'
          : 'from-slate-400 via-slate-500 to-slate-600'
      }
    >
      {({ isDoubleSize }) => (
        <div className={isDoubleSize ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
          {/* Main Identity & Actions Column */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentMeta.color} flex items-center justify-center text-2xl shadow-lg shrink-0`}
              >
                {currentMeta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${currentMeta.badge}`}>
                    {currentMeta.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {relativeTime(record.created_at)}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white mt-1 truncate">
                  {record.voter_name || 'Voter Interaction'}
                </h3>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-medium flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Canvasser: <strong className="text-white">{record.volunteer_name || 'Ground Force'}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-1">
              <a
                href={getAppleMapsUrl({
                  address: record.street_address,
                  lat: Number(record.latitude),
                  lng: Number(record.longitude),
                  title: `Door: ${record.street_address || 'Voter Contact'}`,
                  mode: 'directions',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-violet-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
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

          {/* Location & Canvass Feedback Intel Column */}
          <div className="space-y-3">
            {/* Street Address */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <span className="text-[10px] uppercase font-black text-teal-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Canvassed Location
              </span>
              <p className="font-extrabold text-sm text-white mt-0.5 truncate">
                {record.street_address || 'Bristol, TN'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {Number(record.latitude).toFixed(4)}, {Number(record.longitude).toFixed(4)}
              </p>
            </div>

            {/* Voter Sentiment */}
            {record.sentiment && (
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <HeartHandshake className="w-3.5 h-3.5 text-purple-400" /> Voter Sentiment
                </span>
                <span
                  className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-lg ${
                    record.sentiment === 'strong_support'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : record.sentiment === 'lean_support'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : record.sentiment === 'undecided'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {record.sentiment.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Yard Sign Request Flag */}
            {record.wants_yard_sign && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <span className="text-base">🏡</span>
                <span>Voter Requested Yard Sign for Front Lawn!</span>
              </div>
            )}

            {/* Door Notes */}
            {record.notes && (
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-slate-400" /> Canvasser Field Notes
                </span>
                <p className="text-xs text-slate-200 mt-1 italic">&ldquo;{record.notes}&rdquo;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </CampaignWindowFrame>
  );
}
