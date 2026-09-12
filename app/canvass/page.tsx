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
  ChevronDown,
  ShieldCheck,
  Undo2,
  FileText,
  Sun,
  Flame,
  UserCheck,
  Footprints,
  Compass,
  Clock,
  ExternalLink,
  Camera,
  Scan,
  RefreshCw,
  Zap,
} from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';
import { compressImageToBase64 } from '@/lib/imageCompression';
import {
  CanvassRecord,
  CanvassResult,
  VoterSentiment,
  GroundActivityType,
  VolunteerSession,
  GroundVolunteerRole,
  CanvassRoute,
} from '@/lib/types';
import {
  addCanvassRecord,
  deleteCanvassRecord,
  getStoredCanvassRecords,
  reportVolunteerPing,
} from '@/lib/canvassData';
import { getVolunteerActiveRoute } from '@/lib/canvassRouteData';
import { addPlacedSign } from '@/lib/signData';
import TacticalOnboardingTour, { TourStep } from '@/app/components/TacticalOnboardingTour';

const CANVASS_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-canvass-session',
    title: 'Canvasser Identity & Beacon',
    description: 'Displays your confirmed volunteer name, active door canvasser role, live GPS tracking beacon, and screen awake status.',
    accentColor: 'emerald',
    badge: '1. Identity & Beacon',
  },
  {
    targetId: 'tour-canvass-hud',
    title: 'Walk Session HUD',
    description: 'Tracks doors knocked, contacts made, conversation rate, and literature flyers left during your active walking shift.',
    accentColor: 'teal',
    badge: '2. Session HUD',
  },
  {
    targetId: 'tour-canvass-route-card',
    title: 'Assigned Turf Route',
    description: 'Shows your designated precinct walking route. Tap "Walk" to open turn-by-turn walking navigation directly in Apple Maps.',
    accentColor: 'cyan',
    badge: '3. Turf Route',
  },
  {
    targetId: 'tour-canvass-contact',
    title: 'Voter Contact (Spoke)',
    description: 'When a voter opens the door, tap here to record their sentiment (Strong Support, Undecided, Opposed), lawn sign requests, and notes.',
    accentColor: 'emerald',
    badge: '4. Spoke to Voter',
  },
  {
    targetId: 'tour-canvass-not-home',
    title: 'Not Home / No Answer',
    description: 'Fast 1-tap logging when nobody answers the door. Instantly drops a pin with your GPS coordinates without typing.',
    accentColor: 'cyan',
    badge: '5. Not Home',
  },
  {
    targetId: 'tour-canvass-flyer',
    title: 'Left Flyer / Door Lit',
    description: 'Fast 1-tap logging when hanging a campaign door hanger or literature packet on the handle.',
    accentColor: 'amber',
    badge: '6. Left Lit',
  },
  {
    targetId: 'tour-canvass-spot-sign',
    title: 'Spot Yard Signs On Foot',
    description: 'See a yard sign while walking? Snap a photo and AI automatically classifies the candidate and pins it to the command map.',
    accentColor: 'purple',
    badge: '7. AI Sign Spotter',
  },
  {
    targetId: 'tour-canvass-signs-link',
    title: 'Switch to Sign Runner',
    description: 'Quickly switch to the Field Sign Runner portal without having to re-authenticate with your PIN.',
    accentColor: 'emerald',
    badge: '8. Sign Runner Switch',
  },
];

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
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-launch canvass briefing for first-time session (Desktop only for now)
  useEffect(() => {
    if (!session) return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    try {
      const seen = localStorage.getItem('wardrunner_tour_completed_wardrunner_canvass_tour_v1');
      if (!seen) {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [session]);

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

  // Active Assigned Turf Route
  const [activeRoute, setActiveRoute] = useState<CanvassRoute | null>(null);
  const [showRouteWaypoints, setShowRouteWaypoints] = useState(false);

  // AI Sign Spotter State
  const signPhotoInputRef = useRef<HTMLInputElement>(null);
  const [isScanningSign, setIsScanningSign] = useState(false);
  const [scannedSignToast, setScannedSignToast] = useState<{ label: string; color: string } | null>(null);

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

  // 2b. Load Active Assigned Turf Route
  useEffect(() => {
    if (!session) {
      setActiveRoute(null);
      return;
    }
    const loadRoute = () => {
      const r = getVolunteerActiveRoute(session.volunteerName);
      setActiveRoute(r || null);
    };
    loadRoute();

    const handleUpdate = () => loadRoute();
    window.addEventListener('wardrunner_routes_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('wardrunner_routes_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
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
    setIsTourOpen(false);
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

  // AI Yard Sign Spotter Handler (Fast photo capture & auto-drop)
  const handleSpotSignCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    setIsScanningSign(true);
    try {
      const { base64 } = await compressImageToBase64(file, 1024, 1024, 0.70);
      const res = await fetch('/api/scan-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!res.ok) {
        throw new Error('AI sign recognition failed');
      }

      const data = await res.json();
      if (data.success && data.scan) {
        const scan = data.scan;
        const lat = coords?.latitude || 36.5866;
        const lng = coords?.longitude || -82.1963;

        await addPlacedSign({
          campaign_id: session.campaignId,
          latitude: lat,
          longitude: lng,
          placed_by_name: session.volunteerName,
          sign_type: scan.sign_type || 'yard_sign',
          is_competitor: scan.is_competitor,
          competitor_name: scan.is_competitor ? (scan.competitor_name || scan.candidate_name || 'Competitor') : null,
          status: 'placed',
        });

        playTactileChime('high');
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([80, 50, 100]); } catch (err) {}
        }

        const candidateName = scan.candidate_name || (scan.is_competitor ? 'Competitor' : 'Melissa K. Brown');
        const signTypeLabel = scan.sign_type === 'large_sign' ? '4x4 Sign' : 'Yard Sign';

        setScannedSignToast({
          label: scan.is_competitor
            ? `⚔️ Competitor Spotted: ${candidateName} (${signTypeLabel}) pinned to map!`
            : `✅ Supporter Sign Logged: ${candidateName} pinned to map!`,
          color: scan.is_competitor ? 'bg-rose-600' : 'bg-emerald-600',
        });
        setTimeout(() => setScannedSignToast(null), 5000);
      }
    } catch (err: any) {
      console.warn('Canvass AI sign scan error:', err);
      setScannedSignToast({
        label: 'Could not auto-detect sign text. Check connection.',
        color: 'bg-amber-600',
      });
      setTimeout(() => setScannedSignToast(null), 4000);
    } finally {
      setIsScanningSign(false);
      if (signPhotoInputRef.current) signPhotoInputRef.current.value = '';
    }
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

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinInput('620620');
                    setNameInput('Door Canvasser');
                  }}
                  className="w-full py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>⚡ 1-Tap Canvasser Auto-Fill (PIN: 620620)</span>
                </button>
              </div>
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
          <div id="tour-canvass-session" className="flex items-center gap-2">
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
            {/* Mission Briefing Tour Button (Desktop Only for now) */}
            <button
              onClick={() => setIsTourOpen(true)}
              className="hidden md:flex px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 items-center gap-1 transition"
              title="Interactive Briefing Tour"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tour</span>
            </button>

            {/* Direct Switch to Yard Sign Drop */}
            <Link
              id="tour-canvass-signs-link"
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

      {/* 1.5 Active Assigned Turf Route (Scout Walking Loop) */}
      {activeRoute && (
        <div id="tour-canvass-route-card" className="mx-4 mt-3 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 shadow-xl shadow-indigo-950/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-500/30">
                    Turf {activeRoute.precinct_code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Assigned Walking Route</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5 leading-tight">
                  {activeRoute.name}
                </h3>
              </div>
            </div>
            <a
              href={`https://maps.apple.com/?daddr=${encodeURIComponent(`${activeRoute.waypoints[0]?.street || 'Bristol TN'}, Bristol, TN`)}&dirflg=w`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-[11px] font-bold text-indigo-200 flex items-center gap-1 transition shrink-0 active:scale-95 shadow-sm"
              title="Open walking directions in Apple Maps"
            >
              <Navigation className="w-3 h-3 text-indigo-300" />
              <span>Walk</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
              <span className="text-slate-300">
                Route Progress: <strong className="text-white font-bold">{sessionHistory.length}</strong> / {activeRoute.target_doors} doors
              </span>
              <span className={`font-bold ${sessionHistory.length >= activeRoute.target_doors ? 'text-emerald-400' : 'text-indigo-300'}`}>
                {Math.min(100, Math.round((sessionHistory.length / Math.max(1, activeRoute.target_doors)) * 100))}%
              </span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  sessionHistory.length >= activeRoute.target_doors
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (sessionHistory.length / Math.max(1, activeRoute.target_doors)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Waypoint Streets Expand Toggle */}
          {activeRoute.waypoints && activeRoute.waypoints.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowRouteWaypoints(!showRouteWaypoints)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{activeRoute.waypoints.length} Target Blocks ({activeRoute.estimated_walk_minutes} min walk)</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRouteWaypoints ? 'rotate-180' : ''}`} />
              </button>

              {showRouteWaypoints && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {activeRoute.waypoints.map((wp, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-bold text-white leading-tight">{wp.street}</p>
                          <p className="text-[10px] text-slate-400">
                            {wp.house_range ? `${wp.house_range} • ` : ''}{wp.notes || 'Walking segment'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/25 shrink-0">
                        {wp.target_doors || 10} doors
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Walk Session HUD (Doors, Contacts, Flyers) */}
      <div id="tour-canvass-hud" className="p-4">
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
          id="tour-canvass-contact"
          onClick={handleOpenContactModal}
          className="w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-2xl shadow-emerald-500/30 active:scale-[0.96] transition-all duration-150 border-2 border-emerald-300 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition shrink-0">
              🤝
            </div>
            <div className="text-left">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight uppercase">
                Voter Contact
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 font-bold mt-0.5">
                Spoke face-to-face · Record reaction
              </p>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-wider bg-white text-emerald-950 px-4 py-2 rounded-2xl shadow-md shrink-0">
            SPOKE ➔
          </span>
        </button>

        {/* BUTTON 2: NO CONTACT (NOT HOME) */}
        <button
          id="tour-canvass-not-home"
          onClick={handleNoContactTap}
          className="w-full p-5 sm:p-6 rounded-3xl bg-slate-900 hover:bg-slate-850 text-white shadow-xl active:scale-[0.96] transition-all duration-150 border-2 border-slate-700 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl group-hover:scale-105 transition shrink-0">
              🚪
            </div>
            <div className="text-left">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100 leading-tight uppercase">
                Not Home / No Answer
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-bold mt-0.5">
                Nobody at door · 1-Tap drop pin
              </p>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200 bg-slate-800 px-4 py-2 rounded-2xl border-2 border-slate-700 shadow-md shrink-0">
            1 TAP ✓
          </span>
        </button>

        {/* BUTTON 3: LEFT FLYER / LIT */}
        <button
          id="tour-canvass-flyer"
          onClick={handleLeftFlyerTap}
          className="w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-amber-600 text-white shadow-2xl shadow-amber-600/30 active:scale-[0.96] transition-all duration-150 border-2 border-amber-300 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition shrink-0">
              📰
            </div>
            <div className="text-left">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight uppercase">
                Left Flyer / Lit
              </h3>
              <p className="text-xs sm:text-sm text-amber-100 font-bold mt-0.5">
                Hung door hanger · 1-Tap drop pin
              </p>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-950 bg-amber-300 px-4 py-2 rounded-2xl shadow-md shrink-0">
            1 TAP ✓
          </span>
        </button>

        {/* BUTTON 4: SPOT YARD SIGN (AI PHOTO SCAN) */}
        <button
          id="tour-canvass-spot-sign"
          type="button"
          onClick={() => signPhotoInputRef.current?.click()}
          disabled={isScanningSign}
          className="w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 hover:from-purple-900 hover:to-indigo-900 text-white shadow-2xl shadow-purple-950/40 active:scale-[0.96] transition-all duration-150 border-2 border-purple-400/80 flex items-center justify-between group disabled:opacity-60"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center text-3xl group-hover:scale-105 transition shrink-0">
              {isScanningSign ? (
                <RefreshCw className="w-7 h-7 animate-spin text-purple-300" />
              ) : (
                <Scan className="w-7 h-7 text-purple-300 stroke-[2.5]" />
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight uppercase">
                  {isScanningSign ? 'AI Scanning...' : 'Spot Yard Sign'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-purple-200/90 font-bold mt-0.5">
                Snap any sign · AI reads candidate & drops pin
              </p>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-purple-950 bg-purple-300 px-4 py-2 rounded-2xl shadow-md shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-purple-950" />
            AUTO-PIN ✓
          </span>
        </button>

        {/* Hidden Camera Input for Canvass Yard Sign Spotting */}
        <input
          ref={signPhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSpotSignCapture}
          className="hidden"
          id="canvass-sign-photo-upload"
        />
      </div>

      {/* Undo Button & Toast Notifications */}
      <div className="px-4 mt-3">
        {scannedSignToast && (
          <div className={`${scannedSignToast.color} text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl animate-slide-up mb-2 border border-white/20`}>
            <span>{scannedSignToast.label}</span>
          </div>
        )}

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
              {/* Voter Sentiment Selector - POS Style Big Punch Buttons */}
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
                  Voter Sentiment / Reaction (Tap to Pick)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {SENTIMENT_OPTIONS.map(opt => {
                    const isChosen = selectedSentiment === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedSentiment(opt.id)}
                        className={`p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all duration-150 active:scale-95 ${
                          isChosen
                            ? `${opt.bg} ${opt.text} ${opt.border} ring-4 ring-emerald-500/20 shadow-lg scale-[1.02]`
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                        } ${opt.id === 'strong_opposed' ? 'col-span-2' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{opt.icon}</span>
                          <span className="font-black text-xs sm:text-sm uppercase tracking-tight text-white">
                            {opt.label}
                          </span>
                        </div>
                        {isChosen && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-slate-950">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voter Name & Street Address */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Voter Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="e.g. Linda Smith"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Street Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 901 9th St"
                    className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Wants Yard Sign Toggle */}
              <div
                onClick={() => setWantsYardSign(!wantsYardSign)}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  wantsYardSign
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏡</span>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">Voter Wants Yard Sign</p>
                    <p className="text-[11px] text-slate-400 font-semibold">Auto-creates yard sign drop mission on map</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={wantsYardSign}
                  onChange={(e) => setWantsYardSign(e.target.checked)}
                  className="w-6 h-6 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Conversation Notes with Speech Dictation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Notes (Optional)
                  </label>
                  <DictateButton
                    onTranscript={(text) => {
                      setContactNotes(prev => prev ? `${prev} ${text}` : text);
                    }}
                    className="scale-90 origin-right"
                  />
                </div>
                <textarea
                  rows={2}
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Key issues, questions, volunteer interests... (or tap mic)"
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition active:scale-[0.98]"
                >
                  SAVE & RECORD KNOCK ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 60-Second Canvass Briefing Onboarding Tour (Desktop Only for now) */}
      <TacticalOnboardingTour
        tourKey="wardrunner_canvass_tour_v1"
        steps={CANVASS_TOUR_STEPS}
        isOpen={isTourOpen && !!session && (typeof window !== 'undefined' ? window.innerWidth >= 768 : false)}
        onClose={() => setIsTourOpen(false)}
      />
    </main>
  );
}
