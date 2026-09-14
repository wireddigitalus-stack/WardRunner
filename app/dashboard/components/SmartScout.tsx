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
  Footprints,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { Sign, SignType, Recommendation, CanvassRoute } from '@/lib/types';
import type { TrafficStation, Intersection } from '@/lib/trafficData';
import { addCanvassRoute } from '@/lib/canvassRouteData';
import DictateButton from '@/app/components/DictateButton';

interface SmartScoutProps {
  signs: Sign[];
  trafficStations: TrafficStation[];
  intersections: Intersection[];
  isDark: boolean;
  recs: Recommendation[];
  setRecs: React.Dispatch<React.SetStateAction<Recommendation[]>>;
  onShowOnMap: (recs: Recommendation[]) => void;
  onFlyTo: (lat: number, lng: number) => void;
  onSelectRec: (rec: Recommendation) => void;
  searchBar?: React.ReactNode;
  routes?: CanvassRoute[];
  onSelectRoute?: (route: CanvassRoute) => void;
  onAssignRoute?: (routeId: string, volunteerName: string) => void;
  onAddRoute?: (route: CanvassRoute) => void;
  availableVolunteers?: { id: string; name: string; role: string }[];
  showHeatmap?: boolean;
}

export default function SmartScout({
  signs,
  trafficStations,
  intersections,
  isDark,
  recs,
  setRecs,
  onShowOnMap,
  onFlyTo,
  onSelectRec,
  searchBar,
  routes = [],
  onSelectRoute,
  onAssignRoute,
  onAddRoute,
  availableVolunteers = [],
  showHeatmap = false,
}: SmartScoutProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'recs' | 'turf' | 'chat'>('recs');
  const [loading, setLoading] = useState(false);
  const [turfLoading, setTurfLoading] = useState(false);
  const [error, setError] = useState('');
  const [turfError, setTurfError] = useState('');
  const [notifications, setNotifications] = useState(true);

  // Turf generator controls
  const [selectedPrecinctCode, setSelectedPrecinctCode] = useState('3A');
  const [doorTarget, setDoorTarget] = useState(40);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null);

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

  const fetchTurfRoutes = async () => {
    setTurfLoading(true);
    setTurfError('');
    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'canvass_route',
          precinct_code: selectedPrecinctCode,
          door_target: doorTarget,
          target_duration: durationMinutes,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const generatedRoutes = data.routes || [];
      for (const r of generatedRoutes) {
        const saved = await addCanvassRoute(r);
        if (onAddRoute) onAddRoute(saved);
        if (onSelectRoute) onSelectRoute(saved);
      }
    } catch (err: any) {
      setTurfError(err.message || 'Failed to generate turf routes');
    } finally {
      setTurfLoading(false);
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

  // Format chat responses: clean bolding, indented bullets, strip markdown noise
  const formatChatBubbleText = (text: string) => {
    const cleaned = text
      .replace(/^#+\s+/gm, '')
      .replace(/^---+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const lines = cleaned.split('\n');

    return (
      <div className="space-y-1 text-[11px] leading-relaxed break-words [overflow-wrap:anywhere]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('* ') || trimmed.startsWith('- ');
          const displayLine = isBullet ? trimmed.replace(/^[\*\-]\s+/, '• ') : trimmed;
          const parts = displayLine.split(/(\*\*.*?\*\*)/g);

          return (
            <p key={idx} className={isBullet ? 'pl-2 text-slate-300' : ''}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-bold text-white">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={pIdx}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* ============================================
          LEFT RAIL: MAP LEGEND & SCOUT CARD (level with right nav)
          ============================================ */}
      <div className="absolute top-[68px] sm:top-20 left-3 sm:left-4 z-20 pointer-events-auto w-[calc(100vw-88px)] sm:w-[340px] max-w-[340px] flex flex-col gap-2 animate-slide-up" style={{ animationDelay: '200ms' }}>

        {/* --- Map Legend (Desktop Left Rail) --- */}
        <div className="hidden sm:block pointer-events-auto w-full max-w-full">
          <div className="glass rounded-2xl px-3 py-2 text-[11px] space-y-1.5 overflow-hidden w-full max-w-full">
            {/* Row 1: Signs */}
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
              {[
                { bg: '#059669', label: 'YARD', title: 'Yard' },
                { bg: '#2563eb', label: '4×4',  title: 'Large' },
                { bg: '#e11d48', label: 'VS',   title: 'Opp' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1 shrink-0">
                  <div style={{ background: item.bg, width: 18, height: 18, borderRadius: 4, border: '1.5px solid rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 1px 4px ${item.bg}44`, flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: 7.5, fontWeight: 900 }}>{item.label}</span>
                  </div>
                  <span className="font-semibold opacity-80">{item.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 border-l border-white/10 pl-2 shrink-0">
                <span className="w-3.5 h-[2px] rounded-full bg-amber-400 shrink-0" />
                <span className="font-semibold opacity-80">AADT</span>
              </div>
            </div>
            {/* Row 2: Canvassing */}
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 border-t border-white/10 pt-1.5">
              {[
                { bg: '#9333ea', label: '🚪', title: 'Contact' },
                { bg: '#d97706', label: '📰', title: 'Flyer' },
                { bg: '#475569', label: '—', title: 'None' },
              ].map(item => (
                <div key={item.title} className="flex items-center gap-1 shrink-0">
                  <div style={{ background: item.bg, width: 18, height: 18, borderRadius: 4, border: '1.5px solid rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 1px 4px ${item.bg}44`, flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: 8, fontWeight: 900 }}>{item.label}</span>
                  </div>
                  <span className="font-semibold opacity-80">{item.title}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 border-l border-white/10 pl-2 shrink-0">
                <span className="w-4 h-[2px] rounded-full shrink-0" style={{ background: 'linear-gradient(90deg, #a855f7, #c084fc)' }} />
                <span className="font-semibold opacity-80">Trail</span>
              </div>
            </div>
            {/* Row 3: Heatmap (only when active) */}
            {showHeatmap && (
              <div className="flex items-center gap-2 border-t border-white/10 pt-1.5 animate-fadeIn flex-wrap">
                <span className="text-xs">🔥</span>
                <span className="font-extrabold opacity-80">Heat</span>
                <div className="flex items-center gap-1.5 pl-1 shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cool</span>
                  <div className="w-14 h-2 rounded-full shadow-sm ring-1 ring-white/10" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.9) 0%, rgba(16,185,129,0.9) 25%, rgba(245,158,11,0.95) 48%, rgba(249,115,22,0.95) 68%, rgba(239,68,68,0.97) 85%, rgba(255,255,255,0.98) 100%)' }} />
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Hot</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Fast Map Search Bar (Directly Under Map Legend) --- */}
        {searchBar && (
          <div className="pointer-events-auto w-full max-w-full overflow-hidden">
            {searchBar}
          </div>
        )}

        {/* --- Scout Bar --- */}
        <div
          id="tour-scout-ai"
          onClick={() => { setExpanded(!expanded); if (!expanded && recs.length === 0 && !loading) fetchRecommendations(); }}
          className="glass rounded-2xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:border-amber-500/30 transition-all group active:scale-[0.98] w-full max-w-full overflow-hidden"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                Scout
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 leading-none shrink-0">AI</span>
              </div>
              <p className="text-[11px] opacity-60 leading-none mt-0.5 truncate">
                {recs.length > 0 ? `${recs.length} recommendations` : 'Tap to analyze'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
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
          <div className="glass rounded-2xl overflow-hidden animate-fade-in flex flex-col w-full max-w-full shadow-2xl" style={{ maxHeight: 'calc(100vh - 170px)' }}>

            {/* Tab Switcher */}
            <div className="px-3 pt-3 pb-2 shrink-0 w-full">
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-white/5 text-[10px] w-full">
                <button
                  onClick={() => setTab('recs')}
                  className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-w-0 ${tab === 'recs' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' : 'opacity-40 hover:opacity-70'}`}
                >
                  <Target className="w-3 h-3 shrink-0" />
                  <span className="truncate">Signs</span>
                </button>
                <button
                  onClick={() => setTab('turf')}
                  className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-w-0 ${tab === 'turf' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/25' : 'opacity-40 hover:opacity-70'}`}
                >
                  <Footprints className="w-3 h-3 shrink-0" />
                  <span className="truncate">Turf</span>
                </button>
                <button
                  onClick={() => setTab('chat')}
                  className={`py-1.5 px-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-all min-w-0 ${tab === 'chat' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' : 'opacity-40 hover:opacity-70'}`}
                >
                  <MessageCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Chat</span>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 pb-3 space-y-2 min-h-0 w-full max-w-full">

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
                        <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">Top Spots</p>
                        <button onClick={fetchRecommendations} className="p-1 rounded-lg hover:bg-white/10 transition">
                          <RefreshCw className="w-3.5 h-3.5 opacity-40" />
                        </button>
                      </div>

                      {recs.map((rec, i) => {
                        const pc = priorityColor(rec.priority);
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              onSelectRec(rec);
                              onFlyTo(rec.lat, rec.lng);
                            }}
                            className={`w-full max-w-full text-left p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-amber-500/20 transition-all animate-fade-in overflow-hidden`}
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <div className="flex items-center justify-between gap-2 w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow shadow-amber-500/30">
                                  {rec.rank}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate">{rec.street}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border leading-none shrink-0 ${pc.badge}`}>{rec.priority}</span>
                                    <span className="text-[11px] opacity-40 font-mono truncate">{rec.aadt?.toLocaleString()} AADT</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 pl-1">
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span className="text-xs font-black text-amber-400">{rec.score}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {/* Show All on Map */}
                      <button
                        onClick={() => onShowOnMap(recs)}
                        className="w-full max-w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 active:scale-[0.97] transition-all truncate"
                      >
                        <Target className="w-3.5 h-3.5 shrink-0" /> <span>Show All on Map</span>
                      </button>
                    </>
                  )}

                  {!loading && !error && recs.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs opacity-40">No recommendations yet</p>
                      <button onClick={fetchRecommendations} className="mt-2 text-xs font-bold text-amber-400">Generate Now</button>
                    </div>
                  )}
                </div>
              )}

              {/* === TURF CANVASS ROUTES === */}
              {tab === 'turf' && (
                <div className="space-y-2.5 w-full max-w-full">
                  {/* Generation Controls */}
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 w-full max-w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-1 w-full min-w-0">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1 truncate">
                        <Footprints className="w-3.5 h-3.5 shrink-0" /> Scout Canvass Turfs
                      </span>
                      <span className="text-[11px] text-zinc-400 font-semibold shrink-0">Bristol, TN</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs w-full min-w-0">
                      <div className="min-w-0">
                        <label className="text-[11px] text-zinc-300 block mb-0.5 font-semibold truncate">Target Precinct</label>
                        <select
                          value={selectedPrecinctCode}
                          onChange={e => setSelectedPrecinctCode(e.target.value)}
                          className="w-full h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-xs font-bold text-white focus:outline-none truncate"
                        >
                          <option value="3A">Precinct 3A (Anderson)</option>
                          <option value="2A">Precinct 2A (Virginia Ave)</option>
                          <option value="2B">Precinct 2B (Holston View)</option>
                          <option value="2C">Precinct 2C (Avoca)</option>
                          <option value="1A">Precinct 1A (S. Holston)</option>
                        </select>
                      </div>

                      <div className="min-w-0">
                        <label className="text-[11px] text-zinc-300 block mb-0.5 font-semibold truncate">Doors / Duration</label>
                        <select
                          value={doorTarget}
                          onChange={e => {
                            const d = Number(e.target.value);
                            setDoorTarget(d);
                            setDurationMinutes(d === 25 ? 30 : d === 40 ? 45 : d === 50 ? 60 : 75);
                          }}
                          className="w-full h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-xs font-bold text-white focus:outline-none truncate"
                        >
                          <option value="25">25 doors (~30m)</option>
                          <option value="40">40 doors (~45m)</option>
                          <option value="50">50 doors (~60m)</option>
                          <option value="70">70 doors (~75m)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={fetchTurfRoutes}
                      disabled={turfLoading}
                      className="w-full py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 transition disabled:opacity-50 truncate"
                    >
                      {turfLoading ? (
                        <>
                          <Sparkles className="w-3 h-3 animate-spin shrink-0" />
                          <span className="truncate">Mapping Neighborhood Sidewalks…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span className="truncate">Generate Optimized Turf Loops</span>
                        </>
                      )}
                    </button>
                  </div>

                  {turfError && (
                    <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[10px] w-full break-words">
                      <p className="font-bold">⚠️ {turfError}</p>
                      <button onClick={fetchTurfRoutes} className="mt-1 underline opacity-80">Retry</button>
                    </div>
                  )}

                  {/* Route List */}
                  {routes.length > 0 ? (
                    <div className="space-y-2 w-full max-w-full">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-300 px-0.5">
                        <span className="truncate">Active & Available Turfs</span>
                        <span className="font-mono text-purple-300 font-bold shrink-0">{routes.length} Total</span>
                      </div>

                      {routes.map((route) => {
                        const isAssigned = !!route.assigned_volunteer_name;
                        const isCompleted = route.status === 'completed';

                        return (
                          <div
                            key={route.id}
                            className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all space-y-2 w-full max-w-full overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-1.5 w-full min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                    {route.precinct_code}
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${isCompleted ? 'bg-emerald-500/20 text-emerald-300' : isAssigned ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                    {isCompleted ? 'DONE' : isAssigned ? 'ASSIGNED' : 'OPEN'}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-white mt-1 truncate">
                                  {route.name}
                                </h4>
                                <p className="text-[11px] text-zinc-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                                  <span>~{route.estimated_walk_minutes}m • {route.target_doors} doors • {route.distance_miles}mi</span>
                                </p>
                              </div>
                            </div>

                            <p className="text-[11px] text-zinc-300 line-clamp-2 italic leading-relaxed break-words">
                              "{route.strategic_reasoning}"
                            </p>

                            {/* Assigned Volunteer Pill or Quick Assign */}
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs w-full min-w-0">
                              <div className="flex items-center gap-1.5 text-zinc-200 min-w-0 flex-1">
                                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                <span className="font-semibold truncate max-w-[100px] sm:max-w-[120px]">
                                  {route.assigned_volunteer_name || 'No volunteer'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    if (onSelectRoute) onSelectRoute(route);
                                    if (onFlyTo) onFlyTo(route.start_point.lat, route.start_point.lng);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-[11px] transition active:scale-95 shrink-0"
                                >
                                  Preview
                                </button>

                                <div className="relative">
                                  <button
                                    onClick={() => setAssigningRouteId(assigningRouteId === route.id ? null : route.id)}
                                    className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold text-[11px] transition flex items-center gap-1 active:scale-95 shrink-0"
                                  >
                                    <UserPlus className="w-3 h-3 shrink-0" />
                                    <span>{isAssigned ? 'Reassign' : 'Assign'}</span>
                                  </button>

                                  {assigningRouteId === route.id && (
                                    <div className="absolute right-0 bottom-full mb-1 w-44 max-w-[calc(100vw-60px)] rounded-xl bg-slate-900 border border-white/15 p-1.5 shadow-2xl z-50 animate-slide-up text-xs overflow-hidden">
                                      <div className="text-[10px] font-bold text-zinc-400 px-2 py-1 uppercase tracking-wider truncate">
                                        Assign Volunteer
                                      </div>
                                      <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-0.5">
                                        {availableVolunteers.map(vol => (
                                          <button
                                            key={vol.id}
                                            onClick={() => {
                                              if (onAssignRoute) onAssignRoute(route.id, vol.name);
                                              setAssigningRouteId(null);
                                            }}
                                            className={`w-full text-left px-2 py-1.5 rounded-lg transition flex items-center justify-between gap-1 ${
                                              route.assigned_volunteer_name === vol.name
                                                ? 'bg-purple-500/30 text-purple-200 font-bold'
                                                : 'hover:bg-white/10 text-white'
                                            }`}
                                          >
                                            <span className="truncate">{vol.name}</span>
                                            <span className="text-[10px] text-zinc-400 shrink-0">{vol.role.split(' ')[0]}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 w-full">
                      <p className="text-xs opacity-40">No turf routes generated yet</p>
                      <button onClick={fetchTurfRoutes} className="mt-2 text-xs font-bold text-purple-300 underline">
                        Generate Turf Loops for {selectedPrecinctCode}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* === CHAT === */}
              {tab === 'chat' && (
                <div className="space-y-2 w-full max-w-full">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-4 space-y-2.5 w-full">
                      <p className="text-xs opacity-40">Ask about sign placement</p>
                      <div className="flex flex-wrap gap-1.5 justify-center w-full">
                        {['Best spots near downtown?', 'Counter opponents on State St?', 'High traffic, no signs?'].map(q => (
                          <button key={q} onClick={() => setChatInput(q)} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-slate-200 text-left max-w-full truncate">{q}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full min-w-0`}>
                      <div className={`max-w-[88%] px-3 py-2 rounded-xl text-[11px] leading-relaxed break-words overflow-hidden ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-sm'
                          : 'bg-white/[0.06] border border-white/[0.06] rounded-bl-sm'
                      }`}>
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.text}</div>
                        ) : (
                          formatChatBubbleText(msg.text)
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start w-full">
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
              <div className="p-2.5 border-t border-white/[0.06] shrink-0 w-full min-w-0">
                <div className="flex items-center gap-1.5 w-full min-w-0">
                  <input
                    type="text"
                    placeholder="Ask Scout (or tap mic)…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !chatLoading && sendChat()}
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    className="flex-1 min-w-0 w-0 h-9 px-2.5 rounded-xl border bg-white/5 border-white/10 focus:border-amber-500/50 text-white placeholder:text-zinc-500 text-[11px] focus:outline-none transition"
                  />
                  <DictateButton
                    onTranscript={(dictated) => setChatInput(dictated)}
                    size="sm"
                    title="Push to dictate to Scout AI"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="h-9 w-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 active:scale-90 transition-all disabled:opacity-30 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
