'use client';

import React, { useState } from 'react';
import { Radio, X, Copy, Check, Tv, Laptop, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { LiveMode } from '@/lib/remoteCommander';

interface WarRoomSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveMode: LiveMode;
  onSetLiveMode: (mode: LiveMode) => void;
  isConnected: boolean;
}

export default function WarRoomSyncModal({
  isOpen,
  onClose,
  liveMode,
  onSetLiveMode,
  isConnected,
}: WarRoomSyncModalProps) {
  const [copiedDisplay, setCopiedDisplay] = useState(false);
  const [copiedCommander, setCopiedCommander] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://campaignos-field.vercel.app';
  const displayUrl = `${baseUrl}/dashboard?live=display&pin=2468`;
  const commanderUrl = `${baseUrl}/dashboard?live=commander&pin=2468`;

  const copyToClipboard = (url: string, type: 'display' | 'commander') => {
    navigator.clipboard.writeText(url);
    if (type === 'display') {
      setCopiedDisplay(true);
      setTimeout(() => setCopiedDisplay(false), 2000);
    } else {
      setCopiedCommander(true);
      setTimeout(() => setCopiedCommander(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="glass w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950/95 shadow-2xl p-6 text-white relative ring-1 ring-white/10">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              War Room Presentation Sync
              {isConnected && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Online
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Pilot the conference room display in real-time from Wired Digital
            </p>
          </div>
        </div>

        {/* Status Strip */}
        <div className="mb-5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${liveMode === 'commander' ? 'bg-purple-400 animate-ping' : liveMode === 'display' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-semibold text-slate-200">
              Active Mode: <strong className="text-white uppercase font-black">{liveMode}</strong>
            </span>
          </div>

          {liveMode !== 'off' && (
            <button
              onClick={() => onSetLiveMode('off')}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              Stop Sync
            </button>
          )}
        </div>

        {/* Options Grid */}
        <div className="space-y-4">
          
          {/* Option 1: Commander Mode (You at Wired Digital) */}
          <div className={`p-4 rounded-2xl border transition-all ${liveMode === 'commander' ? 'bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-500/10' : 'bg-white/[0.02] border-white/10 hover:border-purple-500/30'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Commander Mode (Pilot)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your actions (camera pan, 3D tilt, layer toggles, crew filters) are broadcast to the room.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onSetLiveMode('commander');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${liveMode === 'commander' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
              >
                {liveMode === 'commander' ? 'Active' : 'Enable'}
              </button>
            </div>
          </div>

          {/* Option 2: Meeting Room Display Link */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <Tv className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Conference Room Display Link</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Open this URL on the big screen or projector. It auto-unlocks and obeys your commands.
                  </p>
                </div>
              </div>
            </div>

            {/* Copy Link Input Bar */}
            <div className="flex items-center gap-2 bg-slate-900/90 rounded-xl p-1.5 border border-white/10">
              <input
                type="text"
                readOnly
                value={displayUrl}
                className="bg-transparent text-xs text-slate-300 font-mono px-2 flex-1 focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(displayUrl, 'display')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${copiedDisplay ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                {copiedDisplay ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDisplay ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Feature Highlights */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
          <div className="p-2 rounded-xl bg-white/[0.02]">
            <span className="block text-emerald-400 font-bold mb-0.5">⚡ &lt;50ms Latency</span>
            <span>Real-time WebSocket sync</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02]">
            <span className="block text-sky-400 font-bold mb-0.5">🎥 Full 3D Camera</span>
            <span>Follows pan, zoom &amp; orbit</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.02]">
            <span className="block text-purple-400 font-bold mb-0.5">🛡️ Zero Disturbance</span>
            <span>Safe, non-invasive protocol</span>
          </div>
        </div>

      </div>
    </div>
  );
}
