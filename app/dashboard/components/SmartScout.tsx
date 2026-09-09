'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  MapPin,
  Send,
  RefreshCw,
  Eye,
  MessageCircle,
  Zap,
  ChevronRight,
  Target,
  Navigation,
} from 'lucide-react';
import type { Sign } from '@/lib/types';
import type { TrafficStation, Intersection } from '@/lib/trafficData';

interface Recommendation {
  rank: number;
  street: string;
  lat: number;
  lng: number;
  reason: string;
  score: number;
  aadt: number;
  priority: 'critical' | 'high' | 'medium';
}

interface SmartScoutProps {
  signs: Sign[];
  trafficStations: TrafficStation[];
  intersections: Intersection[];
  isDark: boolean;
  onShowOnMap: (recs: Recommendation[]) => void;
  onFlyTo: (lat: number, lng: number) => void;
}

export default function SmartScout({
  signs,
  trafficStations,
  intersections,
  isDark,
  onShowOnMap,
  onFlyTo,
}: SmartScoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'recs' | 'chat'>('recs');
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'recommend',
          signs,
          trafficStations,
          intersections,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecs(data.recommendations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          message: userMsg,
          signs,
          trafficStations,
          intersections,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const priorityStyle = (p: string) => {
    if (p === 'critical') return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' };
    if (p === 'high') return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
    return { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' };
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); if (recs.length === 0 && !loading) fetchRecommendations(); }}
        className="absolute bottom-5 right-3 sm:right-4 z-20 pointer-events-auto glass rounded-2xl px-4 py-3 flex items-center gap-2.5 animate-slide-up hover:scale-105 active:scale-95 transition-all group"
        style={{ animationDelay: '400ms' }}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 transition-shadow">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-bold">Smart Scout</div>
          <div className="text-[10px] opacity-40">AI Sign Advisor</div>
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Scrim */}
      <div className="absolute inset-0 z-30 bg-black/20 animate-fade-in sm:bg-transparent sm:pointer-events-none" onClick={() => setIsOpen(false)} />

      {/* Panel */}
      <div className={`absolute bottom-0 right-0 sm:bottom-4 sm:right-4 z-40 w-full sm:w-[420px] sm:max-h-[calc(100vh-100px)] flex flex-col pointer-events-auto animate-slide-up sm:rounded-3xl overflow-hidden ${isDark ? 'bg-zinc-950/95 border border-white/[0.06]' : 'bg-white/95 border border-black/[0.06]'}`} style={{ backdropFilter: 'saturate(200%) blur(40px)', WebkitBackdropFilter: 'saturate(200%) blur(40px)', maxHeight: 'calc(100vh - 80px)' }}>

        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm flex items-center gap-1.5">Smart Scout <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">AI</span></h2>
              <p className="text-[10px] opacity-40">Powered by Gemini</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`px-4 pt-3 pb-2`}>
          <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
            <button
              onClick={() => setTab('recs')}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${tab === 'recs' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' : 'opacity-50 hover:opacity-80'}`}
            >
              <Target className="w-3.5 h-3.5" /> Recommendations
            </button>
            <button
              onClick={() => setTab('chat')}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${tab === 'chat' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' : 'opacity-50 hover:opacity-80'}`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Ask Scout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">

          {/* === RECOMMENDATIONS TAB === */}
          {tab === 'recs' && (
            <div className="space-y-3 mt-2">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold opacity-50">Analyzing Bristol TN corridors…</p>
                  <p className="text-[10px] opacity-30">Crunching AADT data & coverage gaps</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
                  <p className="font-bold mb-1">⚠️ Error</p>
                  <p>{error}</p>
                  <button onClick={fetchRecommendations} className="mt-2 text-rose-300 underline text-[10px]">Try again</button>
                </div>
              )}

              {!loading && !error && recs.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Top Locations</p>
                    <button onClick={fetchRecommendations} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                      <RefreshCw className="w-3.5 h-3.5 opacity-40" />
                    </button>
                  </div>

                  {recs.map((rec, i) => {
                    const ps = priorityStyle(rec.priority);
                    return (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border transition-all animate-fade-in cursor-pointer ${isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]' : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04]'}`}
                        style={{ animationDelay: `${i * 80}ms` }}
                        onClick={() => onFlyTo(rec.lat, rec.lng)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-black shrink-0 shadow shadow-amber-500/30">
                              {rec.rank}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold truncate">{rec.street}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${ps.bg} ${ps.text} border ${ps.border}`}>{rec.priority}</span>
                                <span className="text-[10px] opacity-40 font-mono">{rec.aadt?.toLocaleString()} AADT</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-sm font-black text-amber-400">{rec.score}</span>
                            <span className="text-[9px] opacity-30">/10</span>
                          </div>
                        </div>
                        <p className="text-[11px] opacity-60 leading-relaxed">{rec.reason}</p>
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.04]">
                          <span className="text-[9px] font-mono opacity-30">{rec.lat?.toFixed(4)}, {rec.lng?.toFixed(4)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onFlyTo(rec.lat, rec.lng); }}
                            className="text-[10px] font-bold text-amber-400 flex items-center gap-1 hover:text-amber-300 transition"
                          >
                            <Navigation className="w-3 h-3" /> View
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => onShowOnMap(recs)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.97] transition-all"
                  >
                    <Eye className="w-4 h-4" /> Show All on Map
                  </button>
                </>
              )}

              {!loading && !error && recs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xs opacity-40">No recommendations yet.</p>
                  <button onClick={fetchRecommendations} className="mt-3 text-xs font-bold text-amber-400 underline">Generate Now</button>
                </div>
              )}
            </div>
          )}

          {/* === CHAT TAB === */}
          {tab === 'chat' && (
            <div className="space-y-3 mt-2">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <p className="text-xs opacity-40">Ask Smart Scout anything about sign placement</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {[
                      'Best spots near Bristol Motor Speedway?',
                      'Counter Bob Reynolds on State St?',
                      'Where has highest traffic but no signs?',
                      'Signs near King University?',
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className={`text-[10px] font-medium px-3 py-1.5 rounded-lg border transition ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md'
                      : isDark
                      ? 'bg-white/[0.06] border border-white/[0.06] rounded-bl-md'
                      : 'bg-black/[0.04] border border-black/[0.06] rounded-bl-md'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input (only on chat tab) */}
        {tab === 'chat' && (
          <div className={`p-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about sign placement…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !chatLoading && sendChat()}
                className={`flex-1 h-10 px-4 rounded-xl border text-[12px] focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 focus:border-amber-500/50 text-white placeholder:text-zinc-500' : 'bg-black/[0.03] border-black/10 focus:border-amber-500 text-slate-900 placeholder:text-slate-400'}`}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="h-10 w-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-90 transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
