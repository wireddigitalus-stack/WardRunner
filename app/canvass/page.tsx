'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Navigation,
  Sparkles,
  Volume2,
  Layers,
  ChevronRight,
  ShieldCheck,
  Undo2,
  FileText,
  Sun,
  Flame,
  UserCheck,
  Footprints,
  Compass,
} from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';
import {
  CanvassRecord,
  CanvassResult,
  VoterSentiment,
  GroundActivityType,
  VolunteerSession,
  GroundVolunteerRole,
} from '@/lib/types';
import {
  addCanvassRecord,
  deleteCanvassRecord,
  getStoredCanvassRecords,
  reportVolunteerPing,
} from '@/lib/canvassData';
import { addPlacedSign } from '@/lib/signData';

const SENTIMENT_OPTIONS: { id: VoterSentiment; label: string; icon: string; bg: string; text: string; border: string }[] = [
  { id: 'strong_support', label: 'Strong Support', icon: '🟢', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  { id: 'lean_support',   label: 'Lean Support',   icon: '🌱', bg: 'bg-teal-500/20',    text: 'text-teal-300',    border: 'border-teal-500/40' },
  { id: 'undecided',      label: 'Undecided',      icon: '🟡', bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/40' },
  { id: 'lean_opposed',   label: 'Lean Opposed',   icon: '🟠', bg: 'bg-orange-500/20',  text: 'text-orange-300',  border: 'border-orange-500/40' },
  { id: 'strong_opposed', label: 'Strong Opposed', icon: '🔴', bg: 'bg-rose-500/20',    text: 'text-rose-300',    border: 'border-rose-500/40' },
];

export default function CanvassPage() {
  // Session State
  const [session, setSession] = useState<VolunteerSession | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [volunteerRole, setVolunteerRole] = useState<GroundVolunteerRole>('Door Canvasser');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Screen WakeLock State
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // GPS Coordinates & Live Tracking
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'locked' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(true);

  // Contact Modal / Detailed Logging
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedSentiment, setSelectedSentiment] = useState<VoterSentiment>('strong_support');
  const [voterName, setVoterName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [wantsYardSign, setWantsYardSign] = useState(false);

  // Activity Feedback & Undo
  const [lastLoggedRecord, setLastLoggedRecord] = useState<CanvassRecord | null>(null);
  const [justLoggedToast, setJustLoggedToast] = useState<{ label: string; color: string } | null>(null);
  const [sessionHistory, setSessionHistory] = useState<CanvassRecord[]>([]);

  // Sound Chime helper
  const playTactileChime = (tone: 'high' | 'mid' | 'flyer') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = tone === 'high' ? 659.25 : tone === 'flyer' ? 523.25 : 440.0;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq * 1.33, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Safe fallback
    }
  };

  // Request Wake Lock to prevent screen sleep
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        lock.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch {
      setWakeLockActive(false);
    }
  };

  // 1. Initial Session Load
  useEffect(() => {
    const saved = localStorage.getItem('wardrunner_session');
    if (saved) {
      try {
        const parsed: VolunteerSession = JSON.parse(saved);
        setSession(parsed);
      } catch {
        localStorage.removeItem('wardrunner_session');
      }
    }
    // Check URL parameters for direct link sharing (?pin=...&name=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlPin = params.get('pin');
      const urlName = params.get('name');
      if (urlPin) setPinInput(urlPin);
      if (urlName) setNameInput(urlName);
    }
    fetchLocation();
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {});
      }
    };
  }, []);

  // 2. Load Session Records
  useEffect(() => {
    if (!session) return;
    const records = getStoredCanvassRecords();
    const myRecords = records.filter(
      r => r.volunteer_name.toLowerCase().trim() === session.volunteerName.toLowerCase().trim()
    );
    setSessionHistory(myRecords);
  }, [session]);

  // 3. Location Acquisition
  const fetchLocation = (onSuccess?: (c: { latitude: number; longitude: number; accuracy: number }) => void) => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation unsupported by browser');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setCoords(current);
        setGpsStatus('locked');
        setGpsError(null);
        if (onSuccess) onSuccess(current);
      },
      (err) => {
        setGpsStatus('error');
        setGpsError(`GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // 4. Periodic Live GPS Beacon Broadcast (Walking Trail)
  useEffect(() => {
    if (!session || !isLiveBroadcasting) return;

    const broadcast = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = Math.round(pos.coords.accuracy);
            setCoords({ latitude: lat, longitude: lng, accuracy: acc });
            setGpsStatus('locked');
            reportVolunteerPing({
              volunteer_name: session.volunteerName,
              role: volunteerRole,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              is_active: true,
              current_action: `Walking neighborhood • ${sessionHistory.length} doors knocked`,
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
        );
      }
    };

    broadcast();
    const interval = setInterval(broadcast, 12000);
    return () => clearInterval(interval);
  }, [session, isLiveBroadcasting, volunteerRole, sessionHistory.length]);

  // Handle Authentication
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    const validPin = pinInput.trim() === '620620' || pinInput.trim().length >= 4;
    if (!validPin) {
      setAuthError('Invalid PIN code. Use campaign PIN 620620.');
      setIsAuthenticating(false);
      return;
    }

    if (!nameInput.trim()) {
      setAuthError('Please enter your volunteer name or call sign.');
      setIsAuthenticating(false);
      return;
    }

    const newSession: VolunteerSession = {
      campaignId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      campaignName: 'Melissa K. Brown for City Council',
      pin: pinInput.trim(),
      volunteerName: nameInput.trim(),
    };

    localStorage.setItem('wardrunner_session', JSON.stringify(newSession));
    setSession(newSession);
    setIsAuthenticating(false);
    requestWakeLock();
  };

  const handleLogout = () => {
    if (session) {
      // Mark volunteer inactive
      reportVolunteerPing({
        volunteer_name: session.volunteerName,
        role: volunteerRole,
        latitude: coords?.latitude || 36.5866,
        longitude: coords?.longitude || -82.1963,
        is_active: false,
        current_action: 'Logged off',
      });
    }
    localStorage.removeItem('wardrunner_session');
    setSession(null);
  };

  // Quick Action Handlers
  const handleNoContactTap = () => {
    playTactileChime('mid');
    const lat = coords?.latitude || 36.5866;
    const lng = coords?.longitude || -82.1963;
    const record = addCanvassRecord({
      volunteer_name: session?.volunteerName || 'Volunteer',
      volunteer_role: volunteerRole,
      activity_type: 'door_knock',
      result: 'no_contact',
      latitude: lat,
      longitude: lng,
      accuracy: coords?.accuracy,
    });
    setLastLoggedRecord(record);
    setSessionHistory(prev => [record, ...prev]);
    setJustLoggedToast({ label: 'Door Logged: Not Home (No Contact)', color: 'bg-slate-700' });
    setTimeout(() => setJustLoggedToast(null), 3000);
  };

  const handleLeftFlyerTap = () => {
    playTactileChime('flyer');
    const lat = coords?.latitude || 36.5866;
    const lng = coords?.longitude || -82.1963;
    const record = addCanvassRecord({
      volunteer_name: session?.volunteerName || 'Volunteer',
      volunteer_role: volunteerRole,
      activity_type: 'flyer_hang',
      result: 'left_flyer',
      latitude: lat,
      longitude: lng,
      accuracy: coords?.accuracy,
      notes: 'Hung literature door hanger on door.',
    });
    setLastLoggedRecord(record);
    setSessionHistory(prev => [record, ...prev]);
    setJustLoggedToast({ label: 'Lit Dropped: Left Flyer on Door', color: 'bg-amber-600' });
    setTimeout(() => setJustLoggedToast(null), 3000);
  };

  const handleOpenContactModal = () => {
    setShowContactModal(true);
  };

  const handleSaveContactRecord = (e: React.FormEvent) => {
    e.preventDefault();
    playTactileChime('high');
    const lat = coords?.latitude || 36.5866;
    const lng = coords?.longitude || -82.1963;

    const record = addCanvassRecord({
      volunteer_name: session?.volunteerName || 'Volunteer',
      volunteer_role: volunteerRole,
      activity_type: 'door_knock',
      result: 'contact',
      sentiment: selectedSentiment,
      latitude: lat,
      longitude: lng,
      accuracy: coords?.accuracy,
      street_address: streetAddress.trim() || undefined,
      voter_name: voterName.trim() || undefined,
      wants_yard_sign: wantsYardSign,
      notes: contactNotes.trim() || undefined,
    });

    // If voter wants a yard sign, automatically drop a yard sign request into signData!
    if (wantsYardSign) {
      addPlacedSign({
        latitude: lat,
        longitude: lng,
        placed_by_name: `${session?.volunteerName || 'Volunteer'} (Canvass Request)`,
        sign_type: 'yard_sign',
        is_competitor: false,
        street_address: streetAddress.trim() || 'Voter Lawn Request',
        status: 'placed',
      });
    }

    setLastLoggedRecord(record);
    setSessionHistory(prev => [record, ...prev]);
    setShowContactModal(false);
    setVoterName('');
    setStreetAddress('');
    setContactNotes('');
    setWantsYardSign(false);

    setJustLoggedToast({
      label: wantsYardSign ? 'Voter Contact Saved + Yard Sign Queued!' : 'Voter Contact Logged!',
      color: 'bg-emerald-600',
    });
    setTimeout(() => setJustLoggedToast(null), 3500);
  };

  const handleUndoLast = () => {
    if (!lastLoggedRecord) return;
    deleteCanvassRecord(lastLoggedRecord.id);
    setSessionHistory(prev => prev.filter(r => r.id !== lastLoggedRecord.id));
    setLastLoggedRecord(null);
    setJustLoggedToast({ label: 'Undone! Knock removed.', color: 'bg-rose-700' });
    setTimeout(() => setJustLoggedToast(null), 2500);
  };

  // Walk Session Stats
  const totalDoors = sessionHistory.length;
  const contactsCount = sessionHistory.filter(r => r.result === 'contact').length;
  const flyersCount = sessionHistory.filter(r => r.result === 'left_flyer').length;
  const contactRate = totalDoors > 0 ? Math.round((contactsCount / totalDoors) * 100) : 0;

  // =========================================================================
  // VIEW: Unauthenticated PIN Login
  // =========================================================================
  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto select-none">
        <div className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/20">
              COS
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">CampaignOS</h1>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Ground Force & Canvassing</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Footprints className="w-4 h-4" />
              <span>Door Knocker & Canvass Portal</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1">Field Check-In</h2>
            <p className="text-slate-400 text-xs mb-6">
              Enter campaign PIN and your volunteer name to start walking neighborhoods and logging doors.
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Campaign Access PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Master PIN: 620620"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-center font-mono text-xl tracking-widest text-white focus:outline-none transition shadow-inner"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Volunteer Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Field Role
                </label>
                <select
                  value={volunteerRole}
                  onChange={(e) => setVolunteerRole(e.target.value as GroundVolunteerRole)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none transition"
                >
                  <option value="Door Canvasser">🚪 Door Canvasser (Walking Turf)</option>
                  <option value="Flyer Hanger">📰 Flyer / Literature Hanger</option>
                  <option value="Field Volunteer">🤝 General Field Volunteer</option>
                  <option value="Town Hall / Events">🏛️ Town Hall / Event Team</option>
                </select>
              </div>

              {authError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-2"
              >
                {isAuthenticating ? 'Authorizing...' : 'Start Walking Turf'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <Link href="/field" className="text-emerald-400 hover:underline flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Yard Sign Drop App
              </Link>
              <Link href="/dashboard" className="text-slate-400 hover:text-white flex items-center gap-1">
                Command Map
              </Link>
            </div>
          </div>
        </div>

        <div className="py-4 text-center">
          <p className="text-xs text-slate-500">
            CampaignOS Field Ops • Melissa K. Brown for Bristol TN
          </p>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: Active Door Knocker Walk Interface
  // =========================================================================
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-16 max-w-md mx-auto select-none">
      {/* 1. Header Bar with Volunteer & GPS Status */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs tracking-tight">
              COS
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight truncate max-w-[190px]">
                {session.volunteerName}
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {volunteerRole} • Live Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Direct Switch to Yard Sign Drop */}
            <Link
              href="/field"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-emerald-400 flex items-center gap-1 transition"
              title="Switch to Yard Signs"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Signs</span>
            </Link>

            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 active:scale-95 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GPS Status & Screen Keep Awake Pill */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] bg-slate-900/90 rounded-xl px-3 py-1.5 border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'locked' ? 'text-emerald-400' : 'text-amber-400 animate-spin'}`} />
            {gpsStatus === 'locked' && coords ? (
              <span className="text-slate-300 font-mono">
                GPS ±{coords.accuracy}m locked
              </span>
            ) : (
              <span className="text-amber-400 font-medium">Acquiring GPS fix...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiveBroadcasting(!isLiveBroadcasting)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                isLiveBroadcasting
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isLiveBroadcasting ? '📡 Beacon ON' : 'Beacon Paused'}
            </button>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                wakeLockActive
                  ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Screen stays awake while open"
            >
              {wakeLockActive ? '☀️ Awake' : 'Normal'}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Walk Session HUD (Doors, Contacts, Flyers) */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Doors Knocked</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalDoors}</p>
            <p className="text-[10px] text-slate-500">This Session</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Contacts</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{contactsCount}</p>
            <p className="text-[10px] text-emerald-500/80 font-semibold">{contactRate}% Spoke</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Flyers Left</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{flyersCount}</p>
            <p className="text-[10px] text-slate-500">Door Lit</p>
          </div>
        </div>
      </div>

      {/* 3. SUB-3-SECOND GIANT ACTION BUTTONS (Designed for thumb while walking) */}
      <div className="px-4 space-y-3">
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            At the House · Tap Result
          </p>
        </div>

        {/* BUTTON 1: CONTACT (VOTER SPOKE) */}
        <button
          onClick={handleOpenContactModal}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition border border-emerald-400/30 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl group-hover:scale-110 transition">
              🤝
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                Voter Contact
              </h3>
              <p className="text-xs text-emerald-100/80 font-medium">
                Spoke with voter · Record sentiment & notes
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* BUTTON 2: NO CONTACT (NOT HOME) */}
        <button
          onClick={handleNoContactTap}
          className="w-full p-4 rounded-3xl bg-slate-900 hover:bg-slate-850 text-white shadow-lg active:scale-[0.98] transition border border-slate-700/80 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              🚪
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black tracking-tight text-slate-200 leading-tight">
                No Contact · Not Home
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                1-Tap Quick Log · Dropped pin at current GPS
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            1 Tap
          </span>
        </button>

        {/* BUTTON 3: LEFT FLYER / LIT */}
        <button
          onClick={handleLeftFlyerTap}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-600/20 active:scale-[0.98] transition border border-amber-500/40 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl group-hover:scale-110 transition">
              📰
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black tracking-tight text-white leading-tight">
                Left Flyer / Door Hanger
              </h3>
              <p className="text-xs text-amber-100/80 font-medium">
                1-Tap Quick Log · Hung literature on door
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-950 bg-amber-200 px-3 py-1.5 rounded-xl">
            1 Tap
          </span>
        </button>
      </div>

      {/* Undo Button & Toast Notification */}
      <div className="px-4 mt-3">
        {justLoggedToast && (
          <div className={`${justLoggedToast.color} text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-slide-up mb-2`}>
            <span>✓ {justLoggedToast.label}</span>
            {lastLoggedRecord && (
              <button
                onClick={handleUndoLast}
                className="bg-black/30 hover:bg-black/40 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Undo2 className="w-3 h-3" /> Undo
              </button>
            )}
          </div>
        )}

        {!justLoggedToast && lastLoggedRecord && (
          <div className="flex justify-end">
            <button
              onClick={handleUndoLast}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition py-1"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo last knock ({lastLoggedRecord.result})
            </button>
          </div>
        )}
      </div>

      {/* 4. Recent Doors Logged this Session */}
      <div className="p-4 mt-2">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            <span>Walk Log ({sessionHistory.length} Doors)</span>
          </h4>
          <Link
            href="/dashboard"
            target="_blank"
            className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>View Command Map</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No doors logged yet in this walk. Start knocking and hit a result button above!
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sessionHistory.slice(0, 15).map((rec, idx) => (
              <div
                key={rec.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">
                    {rec.result === 'contact' ? '🤝' : rec.result === 'left_flyer' ? '📰' : '🚪'}
                  </span>
                  <div>
                    <p className="font-bold text-white leading-tight">
                      {rec.street_address || `Door #${sessionHistory.length - idx}`}
                      {rec.voter_name ? ` • ${rec.voter_name}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {rec.result === 'contact' ? (
                        <span className="text-emerald-400 font-semibold">
                          Contact {rec.sentiment ? `(${rec.sentiment.replace('_', ' ')})` : ''}
                        </span>
                      ) : rec.result === 'left_flyer' ? (
                        <span className="text-amber-400 font-semibold">Left Flyer</span>
                      ) : (
                        <span className="text-slate-400 font-medium">No Contact / Not Home</span>
                      )}
                      {rec.wants_yard_sign && ' • 🏡 Sign Requested'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL: Detailed Contact Dialog
          ===================================================================== */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤝</span>
                <div>
                  <h3 className="text-lg font-black text-white">Voter Contact Details</h3>
                  <p className="text-xs text-slate-400">Record voter reaction and request</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContactRecord} className="space-y-4">
              {/* Voter Sentiment Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Voter Sentiment / Reaction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SENTIMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSentiment(opt.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                        selectedSentiment === opt.id
                          ? `${opt.bg} ${opt.text} ${opt.border} ring-2 ring-emerald-400/40 shadow-md`
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voter Name & Street Address */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Voter Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="e.g. Linda Smith"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 901 9th St"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Wants Yard Sign Toggle */}
              <div
                onClick={() => setWantsYardSign(!wantsYardSign)}
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  wantsYardSign
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏡</span>
                  <div>
                    <p className="text-xs font-bold text-white">Voter Wants Yard Sign</p>
                    <p className="text-[11px] text-slate-400">Automatically creates yard sign drop mission</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={wantsYardSign}
                  onChange={(e) => setWantsYardSign(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Conversation Notes with Speech Dictation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-400">
                    Conversation Notes
                  </label>
                  <DictateButton
                    onTranscript={(text) => {
                      setContactNotes(prev => prev ? `${prev} ${text}` : text);
                    }}
                    className="scale-90 origin-right"
                  />
                </div>
                <textarea
                  rows={3}
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Key issues, questions, volunteer interests... (or tap microphone to speak)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition"
                >
                  Save & Log Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
