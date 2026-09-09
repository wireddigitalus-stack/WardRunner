'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Target,
  Navigation,
  Zap,
  MessageCircle,
  Bell,
  BellOff,
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
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'recs' | 'chat'>('recs');
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState(true);

  // Pop-up card state
  const [activeRec, setActiveRec] = useState<Recommendation | null>(null);

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
        body: JSON.stringify({ mode: 'recommend', signs, trafficStations, intersections }),
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
        body: JSON.stringify({ mode: 'chat', message: userMsg, signs, trafficStations, intersections }),
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

  const priorityColor = (p: string) => {
    if (p === 'critical') return { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', glow: 'shadow-rose-500/20' };
    if (p === 'high') return { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', glow: 'shadow-amber-500/20' };
    return { badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30', glow: 'shadow-sky-500/20' };
  };

  return (
    <>
      {/* ============================================
          COLLAPSIBLE CARD — sits above the legend
          ============================================ */}
      <div className="absolute bottom-4 left-3 sm:left-4 z-20 pointer-events-auto w-[calc(100vw-24px)] sm:w-[320px] animate-slide-up" style={{ animationDelay: '250ms' }}>

        {/* --- Collapsed Bar --- */}
        <div
          onClick={() => { setExpanded(!expanded); if (!expanded && recs.length === 0 && !loading) fetchRecommendations(); }}
          className="glass rounded-2xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:border-amber-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-bold flex items-center gap-1.5">
                Scout
                <span className="text-[8px] font-extrabold px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 leading-none">AI</span>
              </div>
              <p className="text-[9px] opacity-35 leading-none mt-0.5">
                {recs.length > 0 ? `${recs.length} recommendations` : 'Tap to analyze'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Notifications toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setNotifications(!notifications); }}
              className={`p-1.5 rounded-lg transition ${notifications ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500'}`}
              title={notifications ? 'Suggestions on' : 'Suggestions off'}
            >
              {notifications ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            </button>
            <div className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
              <ChevronUp className="w-4 h-4 opacity-40" />
            </div>
          </div>
        </div>

        {/* --- Expanded Panel --- */}
        {expanded && (
          <div className="mt-2 glass rounded-2xl overflow-hidden animate-fade-in" style={{ maxHeight: 'calc(100vh - 200px)' }}>

            {/* Tab Switcher */}
            <div className="px-3 pt-3 pb-2">
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-white/5">
                <button
                  onClick={() => setTab('recs')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${tab === 'recs' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' : 'opacity-40 hover:opacity-70'}`}
                >
                  <Target className="w-3 h-3" /> Recommendations
                </button>
                <button
                  onClick={() => setTab('chat')}
                  className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${tab === 'chat' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' : 'opacity-40 hover:opacity-70'}`}
                >
                  <MessageCircle className="w-3 h-3" /> Ask Scout
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto custom-scrollbar px-3 pb-3" style={{ maxHeight: 'calc(100vh - 300px)' }}>

              {/* === RECOMMENDATIONS === */}
              {tab === 'recs' && (
                <div className="space-y-2">
                  {loading && (
                    <div className="flex flex-col items-center py-8 gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse shadow-md shadow-amber-500/30">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[10px] font-semibold opacity-40">Analyzing Bristol TN…</p>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px]">
                      <p className="font-bold">⚠️ {error}</p>
                      <button onClick={fetchRecommendations} className="mt-1 underline opacity-70">Retry</button>
                    </div>
                  )}

                  {!loading && !error && recs.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">Top Spots</p>
                        <button onClick={fetchRecommendations} className="p-1 rounded-lg hover:bg-white/10 transition">
                          <RefreshCw className="w-3 h-3 opacity-30" />
                        </button>
                      </div>

                      {recs.map((rec, i) => {
                        const pc = priorityColor(rec.priority);
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveRec(rec)}
                            className={`w-full text-left p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-amber-500/20 transition-all animate-fade-in`}
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow shadow-amber-500/30">
                                  {rec.rank}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold truncate">{rec.street}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border leading-none ${pc.badge}`}>{rec.priority}</span>
                                    <span className="text-[9px] opacity-30 font-mono">{rec.aadt?.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Zap className="w-2.5 h-2.5 text-amber-400" />
                                <span className="text-xs font-black text-amber-400">{rec.score}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {/* Show All on Map */}
                      <button
                        onClick={() => onShowOnMap(recs)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.97] transition-all"
                      >
                        <Target className="w-3 h-3" /> Show All on Map
                      </button>
                    </>
                  )}

                  {!loading && !error && recs.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-[10px] opacity-30">No recommendations yet</p>
                      <button onClick={fetchRecommendations} className="mt-2 text-[10px] font-bold text-amber-400">Generate Now</button>
                    </div>
                  )}
                </div>
              )}

              {/* === CHAT === */}
              {tab === 'chat' && (
                <div className="space-y-2">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-[10px] opacity-30">Ask about sign placement</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {['Best spots near downtown?', 'Counter opponents on State St?', 'High traffic, no signs?'].map(q => (
                          <button key={q} onClick={() => setChatInput(q)} className="text-[9px] px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition">{q}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-sm'
                          : 'bg-white/[0.06] border border-white/[0.06] rounded-bl-sm'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-xl rounded-bl-sm bg-white/[0.06]">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            {tab === 'chat' && (
              <div className="p-2.5 border-t border-white/[0.06]">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Ask Scout…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !chatLoading && sendChat()}
                    className="flex-1 h-9 px-3 rounded-xl border bg-white/5 border-white/10 focus:border-amber-500/50 text-white placeholder:text-zinc-500 text-[11px] focus:outline-none transition"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="h-9 w-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 active:scale-90 transition-all disabled:opacity-30"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================
          POP-UP RECOMMENDATION CARD (overlay)
          ============================================ */}
      {activeRec && (
        <>
          <div className="absolute inset-0 z-30 bg-black/30 animate-fade-in" onClick={() => setActiveRec(null)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[340px] max-w-[calc(100vw-32px)] pointer-events-auto animate-slide-up">
            <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden">
              {/* Accent top edge */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 to-orange-500" />

              <button onClick={() => setActiveRec(null)} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition">
                <X className="w-3.5 h-3.5 opacity-50" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-amber-500/30">
                  #{activeRec.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border leading-none ${priorityColor(activeRec.priority).badge}`}>{activeRec.priority}</span>
                    <div className="flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="text-sm font-black text-amber-400">{activeRec.score}</span>
                      <span className="text-[9px] opacity-30">/10</span>
                    </div>
                  </div>
                  <h3 className="font-extrabold text-sm mt-1.5">{activeRec.street}</h3>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold opacity-25 block">Est. Traffic</span>
                    <span className="font-bold text-amber-400 mt-0.5 block">{activeRec.aadt?.toLocaleString()} <span className="text-[9px] opacity-40 text-white">vehicles/day</span></span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold opacity-25 block">GPS</span>
                    <span className="font-mono opacity-50 text-[10px] mt-0.5 block">{activeRec.lat?.toFixed(4)}, {activeRec.lng?.toFixed(4)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold opacity-25 block">Why This Spot</span>
                  <p className="text-[11px] opacity-60 leading-relaxed mt-0.5">{activeRec.reason}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { onFlyTo(activeRec.lat, activeRec.lng); setActiveRec(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.97] transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" /> View on Map
                </button>
                <a
                  href={`https://maps.apple.com/?daddr=${activeRec.lat},${activeRec.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Navigation className="w-3 h-3" /> Navigate
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
