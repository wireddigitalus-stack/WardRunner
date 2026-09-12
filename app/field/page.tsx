'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { compressImage, compressImageToBase64 } from '@/lib/imageCompression';
import { SignType, SignStatus, Sign, VolunteerSession, VolunteerAssignment } from '@/lib/types';
import { getStoredAssignments, markAssignmentComplete } from '@/lib/assignmentData';
import { addPlacedSign, getStoredSigns, markSignRetrieved } from '@/lib/signData';
import { reportVolunteerPing } from '@/lib/canvassData';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import {
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Navigation,
  Flag,
  Trash2,
  Layers,
  ChevronRight,
  ShieldAlert,
  Compass,
  Target,
  Send,
  Check,
  Sparkles,
  Scan,
  Zap,
  Eye,
} from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';

const SIGN_TYPES: { id: SignType; label: string; icon: string; size: string }[] = [
  { id: 'yard_sign', label: 'Yard Sign', icon: '🏡', size: 'Standard 24"x18"' },
  { id: 'large_sign', label: 'Large 4x4', icon: '🪧', size: 'Roadside 4\'x4\'' },
  { id: 'banner', label: 'Banner', icon: '🚩', size: 'Fence / Overpass' },
  { id: 'billboard', label: 'Billboard', icon: '🏢', size: 'High-Impact Arterial' },
];

import TacticalOnboardingTour, { TourStep } from '@/app/components/TacticalOnboardingTour';

const FIELD_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-field-session',
    title: 'Field Operator Badge',
    description: 'Displays your confirmed volunteer name and campaign identity for all logged sign drops.',
    accentColor: 'emerald',
    badge: '1. Operator ID',
  },
  {
    targetId: 'tour-field-gps',
    title: 'High-Accuracy GPS Strip',
    description: 'Shows live satellite positioning accuracy in meters. Tap the refresh icon anytime to force a fresh GPS coordinate fix.',
    accentColor: 'teal',
    badge: '2. GPS Precision',
  },
  {
    targetId: 'tour-field-modetabs',
    title: 'Place vs. Retrieve Mode',
    description: 'Switch between dropping new signs during the race and retrieving signs for post-election cleanup or damaged signs.',
    accentColor: 'amber',
    badge: '3. Mode Switch',
  },
  {
    targetId: 'tour-field-camera',
    title: 'AI Photo Sign Scanner',
    description: 'Point your camera at any sign: AI automatically recognizes candidate, sign dimensions, and whether it belongs to an opponent.',
    accentColor: 'purple',
    badge: '4. AI Camera',
  },
  {
    targetId: 'tour-field-ownership',
    title: 'Whose Sign Is This?',
    description: '1-tap toggle between our campaign (Melissa K. Brown) and competitor intel sightings without typing.',
    accentColor: 'emerald',
    badge: '5. Ownership',
  },
  {
    targetId: 'tour-field-signtype',
    title: 'Sign Format Buttons',
    description: 'McDonald\'s register buttons to pick Yard Sign, Roadside 4x4, Overpass Banner, or High-Impact Billboard.',
    accentColor: 'cyan',
    badge: '6. Sign Format',
  },
  {
    targetId: 'tour-field-drop-btn',
    title: 'Giant 1-Tap Drop Button',
    description: 'Punch the giant button to lock your GPS coordinates and log the placement to CampaignOS in under 2 seconds.',
    accentColor: 'emerald',
    badge: '7. Drop Sign',
  },
  {
    targetId: 'tour-field-canvass-link',
    title: 'Switch to Door Canvassing',
    description: 'Transition directly to the Door Knocker portal without having to re-enter your volunteer PIN.',
    accentColor: 'teal',
    badge: '8. Canvass Switch',
  },
];

export default function FieldPage() {
  // Session State
  const [session, setSession] = useState<VolunteerSession | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-launch field briefing for first-time session
  useEffect(() => {
    if (!session) return;
    try {
      const seen = localStorage.getItem('wardrunner_tour_completed_wardrunner_field_tour_v1');
      if (!seen) {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [session]);

  // Field Placement State
  const [activeTab, setActiveTab] = useState<'place' | 'retrieve'>('place');
  const [selectedType, setSelectedType] = useState<SignType>('yard_sign');
  const [isCompetitor, setIsCompetitor] = useState(false);
  const [competitorName, setCompetitorName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Sign Scanner State (Gemini Multimodal Vision)
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<{
    is_sign: boolean;
    candidate_name: string;
    office?: string;
    is_competitor: boolean;
    competitor_name: string | null;
    sign_type: SignType;
    confidence: number;
    detected_text: string;
    condition: string;
    summary: string;
  } | null>(null);
  const [aiScanError, setAiScanError] = useState<string | null>(null);

  // Noticeable Sign Dropped Success State for Giant Action Button
  const [justDroppedSuccess, setJustDroppedSuccess] = useState<{
    signLabel: string;
    targetLabel: string;
    isCompetitor: boolean;
    elapsedSeconds: string;
    accuracy?: number;
  } | null>(null);

  // Play subtle celebratory chime on successful sign drop
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.10); // A5
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.10); // D6
      
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now + 0.10);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } catch {
      // AudioContext might be blocked or unsupported; safe ignore
    }
  };

  // Assigned Sign Placement Missions
  const [missions, setMissions] = useState<VolunteerAssignment[]>([]);
  const [activeMission, setActiveMission] = useState<VolunteerAssignment | null>(null);

  // GPS Coordinates State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'locked' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Retrieval Mode State
  const [nearbySigns, setNearbySigns] = useState<(Sign & { distance_meters?: number })[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [retrievingId, setRetrievingId] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wardrunner_session');
    if (saved) {
      try {
        const parsed: VolunteerSession = JSON.parse(saved);
        setSession(parsed);
      } catch (e) {
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
    fetchCurrentLocation();
  }, []);

  // Load missions and listen for real-time dispatch updates
  useEffect(() => {
    const loadMissions = () => {
      setMissions(getStoredAssignments());
    };
    loadMissions();
    window.addEventListener('wardrunner_assignments_updated', loadMissions);
    return () => window.removeEventListener('wardrunner_assignments_updated', loadMissions);
  }, []);

  const handleAcceptMission = (m: VolunteerAssignment) => {
    setActiveMission(m);
    setSelectedType(m.sign_type);
    if (m.street_address) {
      setStreetAddress(m.street_address);
    }
    setIsCompetitor(false);
    const formElement = document.getElementById('placement-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter active missions dispatched to this volunteer or open to campaign volunteers
  const myMissions = missions.filter((m) => {
    if (!session) return false;
    const sName = (session.volunteerName || '').toLowerCase().trim();
    const vName = (m.volunteer_name || '').toLowerCase().trim();
    return (
      vName === sName ||
      vName === 'campaign volunteer' ||
      sName.includes(vName) ||
      vName.includes(sName) ||
      sName === 'campaign volunteer'
    ) && m.status !== 'completed';
  });

  // Poll GPS location every 15 seconds if active
  useEffect(() => {
    if (session && activeTab === 'place') {
      fetchCurrentLocation();
    }
  }, [session, activeTab]);

  // Load nearby signs when entering retrieval mode
  useEffect(() => {
    if (session && activeTab === 'retrieve') {
      loadNearbySigns();
    }
  }, [session, activeTab, coords]);

  // 1. GPS Acquisition Function
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your mobile browser');
      return;
    }

    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setCoords(currentCoords);
        setGpsStatus('locked');
        setGpsError(null);

        if (session) {
          reportVolunteerPing({
            volunteer_name: session.volunteerName,
            role: 'Sign Runner',
            latitude: currentCoords.latitude,
            longitude: currentCoords.longitude,
            accuracy: currentCoords.accuracy,
            is_active: true,
            current_action: 'Placing & Checking Signs',
          });
        }
      },
      (err) => {
        setGpsStatus('error');
        setGpsError(`GPS Error: ${err.message}. Ensure location permissions are allowed.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  // Periodic location broadcast while active
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            });
            reportVolunteerPing({
              volunteer_name: session.volunteerName,
              role: 'Sign Runner',
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
              is_active: true,
              current_action: 'Active in Field',
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
        );
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [session]);

  // 2. Frictionless PIN Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (pinInput.trim().length < 4) {
      setAuthError('Please enter a valid 4-6 digit Campaign PIN.');
      return;
    }
    if (!nameInput.trim()) {
      setAuthError('Please enter your full name or call sign.');
      return;
    }

    setIsAuthenticating(true);
    try {
      // Query campaign by access_pin
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('access_pin', pinInput.trim())
        .maybeSingle();

      if (error || !data) {
        // Fallback for pilot campaign demo / local roster
        const storedMasterPin = (typeof window !== 'undefined' && localStorage.getItem('wardrunner_campaign_pin')) || '620620';
        let matchedVolunteer: any = null;
        if (typeof window !== 'undefined') {
          try {
            const rawVols = localStorage.getItem('wardrunner_volunteers');
            if (rawVols) {
              const vols = JSON.parse(rawVols);
              matchedVolunteer = vols.find(
                (v: any) => v.active && (v.pin === pinInput.trim() || (!v.pin && pinInput.trim() === storedMasterPin))
              );
            }
          } catch (e) {}
        }

        if (pinInput.trim() === '620620' || pinInput.trim() === '246810' || pinInput.trim() === storedMasterPin || matchedVolunteer) {
          const fallbackSession: VolunteerSession = {
            campaignId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            campaignName: 'Melissa K. Brown for Bristol TN City Council',
            pin: pinInput.trim(),
            volunteerName: matchedVolunteer?.name || nameInput.trim(),
          };
          localStorage.setItem('wardrunner_session', JSON.stringify(fallbackSession));
          setSession(fallbackSession);
          setIsAuthenticating(false);
          return;
        }

        setAuthError('Invalid PIN. Contact Campaign Headquarters for the PIN.');
        setIsAuthenticating(false);
        return;
      }

      const newSession: VolunteerSession = {
        campaignId: data.id,
        campaignName: data.name,
        pin: pinInput.trim(),
        volunteerName: nameInput.trim(),
      };

      localStorage.setItem('wardrunner_session', JSON.stringify(newSession));
      setSession(newSession);
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    if (session) {
      reportVolunteerPing({
        volunteer_name: session.volunteerName,
        role: 'Sign Runner',
        latitude: coords?.latitude || 36.595,
        longitude: coords?.longitude || -82.188,
        is_active: false,
        current_action: 'Logged off',
      });
    }
    localStorage.removeItem('wardrunner_session');
    setSession(null);
  };

  // 3. Photo Capture & Fast AI Sign Scanning (Sub-2s flow)
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setAiScanError(null);
    setAiScanResult(null);

    // Concurrently trigger GPS lock if not already locked
    if (!coords) {
      fetchCurrentLocation();
    }

    // Trigger Gemini Vision AI Scan
    setIsAiScanning(true);
    try {
      // Compress in browser canvas to ~80-120KB JPEG
      const { base64 } = await compressImageToBase64(file, 1024, 1024, 0.70);

      const res = await fetch('/api/scan-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze sign image');
      }

      const data = await res.json();
      if (data.success && data.scan) {
        const scan = data.scan;
        setAiScanResult(scan);

        // Auto-apply detection to form
        if (scan.is_sign) {
          if (scan.is_competitor) {
            setIsCompetitor(true);
            setCompetitorName(scan.competitor_name || scan.candidate_name || 'Competitor');
          } else {
            setIsCompetitor(false);
            setCompetitorName('');
          }

          if (['yard_sign', 'large_sign', 'banner', 'billboard'].includes(scan.sign_type)) {
            setSelectedType(scan.sign_type as SignType);
          }

          // Gentle haptic feedback on successful AI recognition
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([60, 40, 80]); } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      console.warn('AI sign scan error:', err);
      setAiScanError(err?.message || 'AI scan unavailable. You can still drop the sign manually.');
    } finally {
      setIsAiScanning(false);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setAiScanResult(null);
    setAiScanError(null);
    setIsAiScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 4. One-Tap Drop Sign Submission (Sub-10s mobile flow)
  const handleDropSign = async () => {
    if (!session) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate GPS
    if (!coords) {
      setErrorMessage('Acquiring high-accuracy GPS... Please wait 2 seconds and tap again.');
      fetchCurrentLocation();
      return;
    }

    if (isCompetitor && !competitorName.trim()) {
      setErrorMessage('Please enter the competitor candidate name.');
      return;
    }

    setIsSubmitting(true);
    const startTime = Date.now();

    try {
      let photoUrl: string | null = null;

      // Upload compressed photo if provided
      if (photoFile) {
        const compressedBlob = await compressImage(photoFile, 1280, 1280, 0.72);
        const fileName = `${session.campaignId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sign-photos')
          .upload(fileName, compressedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError && uploadData) {
          const { data: publicData } = supabase.storage
            .from('sign-photos')
            .getPublicUrl(fileName);
          photoUrl = publicData?.publicUrl || null;
        }
      }

      // Insert sign record
      const payload = {
        campaign_id: session.campaignId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        placed_by_name: session.volunteerName,
        sign_type: selectedType,
        is_competitor: isCompetitor,
        competitor_name: isCompetitor ? competitorName.trim() : null,
        photo_url: photoUrl,
        street_address: streetAddress.trim() || undefined,
        status: 'placed' as SignStatus,
      };

      // Save to local storage and sync to Supabase in background
      await addPlacedSign(payload);

      // Trigger Haptic Feedback on mobile devices if supported
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([120, 60, 180]);
        } catch (e) {
          // ignore if disabled
        }
      }

      // Play soft celebratory chime
      playSuccessChime();

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      const signLabel = SIGN_TYPES.find((t) => t.id === selectedType)?.label || 'Sign';
      const targetLabel = isCompetitor ? `Competitor (${competitorName})` : 'Melissa K. Brown';

      // Set noticeable button success state
      setJustDroppedSuccess({
        signLabel,
        targetLabel,
        isCompetitor,
        elapsedSeconds,
        accuracy: coords.accuracy,
      });

      // Reset button success state after 4 seconds
      setTimeout(() => {
        setJustDroppedSuccess(null);
      }, 4000);

      // Mark assigned mission completed if volunteer was fulfilling one
      if (activeMission) {
        markAssignmentComplete(activeMission.id);
        const updated = getStoredAssignments();
        setMissions(updated);
        setSuccessMessage(`Dropped ${signLabel} for ${targetLabel}! Mission "${activeMission.title}" completed!`);
        setActiveMission(null);
      } else {
        setSuccessMessage(
          isCompetitor
            ? `Reported ${signLabel} for ${targetLabel} in ${elapsedSeconds}s! (±${coords.accuracy}m)`
            : `Dropped ${signLabel} for ${targetLabel} in ${elapsedSeconds}s! (±${coords.accuracy}m)`
        );
      }

      // Reset dynamic inputs while keeping volunteer ergonomics ready for next sign
      clearPhoto();
      setStreetAddress('');
      if (isCompetitor) {
        setIsCompetitor(false);
        setCompetitorName('');
      }

      // Auto-refresh GPS for the next stop
      fetchCurrentLocation();

      // Clear banner after 6 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit sign placement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Retrieval Mode Data Fetching
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const loadNearbySigns = async () => {
    if (!session) return;
    setIsLoadingNearby(true);
    try {
      const allSigns = getStoredSigns().filter((s) => s.status === 'placed');
      if (coords && allSigns.length > 0) {
        const enriched = allSigns.map((sign) => ({
          ...sign,
          distance_meters: calculateDistance(
            coords.latitude,
            coords.longitude,
            Number(sign.latitude),
            Number(sign.longitude)
          ),
        }));
        enriched.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
        setNearbySigns(enriched);
      } else {
        setNearbySigns(allSigns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  // 6. Mark Sign Retrieved
  const handleMarkRetrieved = async (signId: string) => {
    setRetrievingId(signId);
    try {
      await markSignRetrieved(signId);
      setNearbySigns((prev) => prev.filter((s) => s.id !== signId));
      setSuccessMessage('Sign marked as RETRIEVED.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setRetrievingId(null);
    }
  };

  // =========================================================================
  // VIEW: Frictionless Login View (If unauthenticated)
  // =========================================================================
  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-5 max-w-md mx-auto">
        <div className="pt-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm tracking-tight shadow-lg shadow-emerald-500/10">
              COS
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">CampaignOS</h1>
              <p className="text-xs text-emerald-400 font-medium tracking-wide uppercase">Field Operations PWA</p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Pilot Campaign
              </span>
              <h2 className="text-lg font-bold text-white mt-2">Melissa K. Brown</h2>
              <p className="text-sm text-slate-400">Bristol TN City Council Campaign</p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Campaign 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="e.g. 620620"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full h-14 px-4 text-center text-2xl font-mono tracking-widest bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-600 transition"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Campaign Master PIN: 620620</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Volunteer Name / Call Sign
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Field Volunteer or Volunteer #1"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="words"
                    className="flex-1 h-13 px-4 text-base bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-600 transition"
                    required
                  />
                  <DictateButton
                    onTranscript={(dictated) => setNameInput(dictated)}
                    size="lg"
                    title="Push to dictate your name"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full h-14 mt-2 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black text-lg tracking-wide rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
              >
                {isAuthenticating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    ENTER FIELD OPS
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinInput('620620');
                    setNameInput('Field Volunteer');
                  }}
                  className="w-full py-3 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>⚡ 1-Tap Volunteer Auto-Fill (PIN: 620620)</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="py-4 text-center">
          <p className="text-xs text-slate-500">
            CampaignOS Field v1.0 • Built for grassroots campaigns
          </p>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: Active Mobile Field Operator Interface
  // =========================================================================
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 max-w-md mx-auto select-none">
      {/* 1. Header Bar with Volunteer & GPS Status */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div id="tour-field-session" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs tracking-tight">
              COS
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight truncate max-w-[200px]">
                {session.campaignName}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Operated by <span className="text-emerald-400 font-semibold">{session.volunteerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTourOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 transition"
              title="Interactive Briefing Tour"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tour</span>
            </button>

            <Link
              id="tour-field-canvass-link"
              href="/canvass"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 transition"
              title="Switch to Door Canvassing"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Canvass</span>
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

        {/* GPS Sensor Strip */}
        <div id="tour-field-gps" className="mt-2.5 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gpsStatus === 'locked'
                  ? 'bg-emerald-500 animate-pulse'
                  : gpsStatus === 'locating'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-[11px] text-slate-300">
              {gpsStatus === 'locked' && coords
                ? `GPS ±${coords.accuracy}m (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
                : gpsStatus === 'locating'
                ? 'Acquiring high-accuracy GPS...'
                : 'GPS Offline'}
            </span>
          </div>
          <button
            onClick={fetchCurrentLocation}
            className="text-slate-400 hover:text-white p-1 rounded active:rotate-180 transition-all duration-300"
            title="Refresh GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. Mode Selector: Placement Mode vs Cleanup / Retrieval Mode */}
      <div className="p-4 pb-1">
        <div id="tour-field-modetabs" className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('place')}
            className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'place'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Place Sign
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('retrieve')}
            className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'retrieve'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Retrieve Mode
          </button>
        </div>
      </div>

      {/* High-visibility Notification Banners */}
      {successMessage && (
        <div className="mx-4 my-2 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 font-semibold text-sm flex items-center gap-2.5 shadow-lg shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 my-2 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 font-semibold text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 1: PLACE SIGN WORKFLOW (Sub-10s Single-Hand Optimized)       */}
      {/* ================================================================= */}
      {activeTab === 'place' && (
        <div id="placement-form" className="px-4 py-2 space-y-4">
          {/* Active Mission In-Progress Banner */}
          {activeMission && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/25 via-indigo-500/20 to-emerald-500/25 border border-purple-500/40 text-xs text-white shadow-xl animate-slide-up flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-500/30 border border-purple-400/50 flex items-center justify-center text-purple-300 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider block">
                    Active Sign Mission
                  </span>
                  <p className="font-extrabold text-sm text-white truncate">{activeMission.title}</p>
                  <p className="text-[10px] text-emerald-300">
                    Pre-filled: {activeMission.quantity}× {activeMission.sign_type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMission(null)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/15 text-slate-300 transition shrink-0"
              >
                Clear
              </button>
            </div>
          )}

          {/* Assigned Sign Placement Missions Dispatch Card */}
          {myMissions.length > 0 && !activeMission && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-purple-200">
                    Your Assigned Missions ({myMissions.length})
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Dispatched
                </span>
              </div>

              <div className="space-y-2">
                {myMissions.map((m) => {
                  const distMeters = coords ? calculateDistance(coords.latitude, coords.longitude, m.lat, m.lng) : null;
                  const distText = distMeters != null
                    ? distMeters < 800
                      ? `${Math.round(distMeters)}m away`
                      : `${(distMeters * 0.000621371).toFixed(1)} mi away`
                    : null;

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              m.priority === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : m.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            }`}>
                              {m.priority}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {m.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="text-emerald-400 font-bold">
                              {m.quantity}× {m.sign_type.replace('_', ' ')}
                            </span>
                            {distText && (
                              <>
                                <span>•</span>
                                <span className="text-purple-300 font-mono font-bold">{distText}</span>
                              </>
                            )}
                          </div>

                          {m.notes && (
                            <p className="text-[11px] text-slate-300 mt-1 pl-2 border-l border-purple-500/40 italic">
                              "{m.notes}"
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <a
                            href={getAppleMapsUrl({
                              address: m.street_address,
                              lat: m.lat,
                              lng: m.lng,
                              title: m.title,
                              mode: 'directions',
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1 border border-slate-700 active:scale-95 transition"
                            title="Open Address in Apple Maps Navigation"
                          >
                            <Navigation className="w-3 h-3 text-sky-400" />
                            <span>Navigate</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleAcceptMission(m)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/25 flex items-center justify-center gap-1 active:scale-95 transition"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Plant Here</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick-Launch AI Photo Sign Scanner - Giant POS Punch Button */}
          <div className="relative">
            <button
              id="tour-field-camera"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiScanning}
              className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-2 border-purple-500/60 hover:border-purple-400 text-left flex items-center justify-between shadow-2xl shadow-purple-950/40 active:scale-[0.98] transition-all disabled:opacity-60 group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-purple-500/40 group-hover:scale-105 transition shrink-0">
                  <Camera className="w-7 h-7 text-slate-950 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                      📸 AI Photo Sign Scan
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/50 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-purple-300" />
                      Auto-Detect
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/90 font-semibold mt-0.5">
                    Point camera at sign · AI reads candidate, size & drops pin
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 ml-2">
                <ChevronRight className="w-6 h-6 text-purple-300 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          </div>

          {/* Target Ownership Switch - Giant POS Selector Tiles */}
          <div id="tour-field-ownership" className="p-4 rounded-3xl bg-slate-900/90 border-2 border-slate-800 shadow-xl">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Step 1: Whose Sign is This?</span>
              <span className="text-[11px] font-bold text-slate-500">Tap to switch</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* BUTTON 1: OUR SIGN */}
              <button
                type="button"
                onClick={() => setIsCompetitor(false)}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-200 active:scale-[0.98] ${
                  !isCompetitor
                    ? 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-500/25 shadow-xl shadow-emerald-500/20 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    !isCompetitor ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  {!isCompetitor && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                      SELECTED ✓
                    </span>
                  )}
                </div>
                <p className="font-black text-base sm:text-lg text-white leading-tight">MELISSA K. BROWN</p>
                <p className="text-[11px] font-bold text-emerald-400 mt-0.5 uppercase tracking-wider">Our Campaign</p>
              </button>

              {/* BUTTON 2: COMPETITOR INTEL */}
              <button
                type="button"
                onClick={() => setIsCompetitor(true)}
                className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-200 active:scale-[0.98] ${
                  isCompetitor
                    ? 'bg-rose-500/20 border-rose-400 ring-4 ring-rose-500/25 shadow-xl shadow-rose-500/20 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isCompetitor ? 'bg-rose-500 text-white font-black' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  {isCompetitor && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white">
                      SELECTED ✓
                    </span>
                  )}
                </div>
                <p className="font-black text-base sm:text-lg text-white leading-tight">COMPETITOR INTEL</p>
                <p className="text-[11px] font-bold text-rose-400 mt-0.5 uppercase tracking-wider">Opponent Sign</p>
              </button>
            </div>

            {/* Competitor Name Input Drawer */}
            {isCompetitor && (
              <div className="mt-4 pt-3.5 border-t border-slate-800 animate-fadeIn">
                <label className="block text-xs font-black text-rose-400 uppercase tracking-wider mb-1.5">
                  Competitor Candidate / Slate Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Bob Reynolds or Common Sense Slate"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="words"
                    className="flex-1 h-13 px-4 bg-slate-950 border-2 border-rose-500/50 rounded-2xl text-white text-base font-bold focus:outline-none focus:border-rose-400 transition"
                    autoFocus
                  />
                  <DictateButton
                    onTranscript={(dictated) => setCompetitorName(dictated)}
                    size="lg"
                    title="Push to dictate competitor candidate name"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4-Way Sign Type Selector - Giant POS Register Tiles */}
          <div id="tour-field-signtype">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Step 2: Sign Format / Size
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SIGN_TYPES.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 sm:p-5 rounded-3xl border-2 text-left flex flex-col justify-between transition-all duration-200 active:scale-[0.97] min-h-[110px] ${
                      isSelected
                        ? isCompetitor
                          ? 'bg-rose-500/20 border-rose-400 ring-4 ring-rose-500/25 shadow-xl text-white'
                          : 'bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-500/25 shadow-xl text-white'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-3xl sm:text-4xl">{type.icon}</span>
                      {isSelected ? (
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isCompetitor ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'
                          }`}
                        >
                          ACTIVE ✓
                        </span>
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-700 bg-slate-800" />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-base sm:text-lg text-white leading-tight uppercase tracking-tight">
                        {type.label}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{type.size}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Native Camera Quick Capture with Compression */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Sign Photo Verification (Optional)
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="field-camera-upload"
            />

            {/* AI Vision Scanning Indicator */}
            {isAiScanning && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/40 text-center animate-pulse flex flex-col items-center justify-center gap-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Gemini Multimodal AI Scanning Sign...</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Auto-detecting candidate name, sign dimensions & competitor status
                </p>
              </div>
            )}

            {/* AI Scan Result Intelligence Card */}
            {aiScanResult && !isAiScanning && (
              <div
                className={`mt-2.5 p-3 rounded-xl border animate-fade-in ${
                  aiScanResult.is_competitor
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                    AI Auto-Detected ({Math.round(aiScanResult.confidence * 100)}% Match)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-white/10 text-white">
                    {aiScanResult.sign_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>{aiScanResult.is_competitor ? '⚔️ Competitor Spotted:' : '✅ Supporter Sign:'}</span>
                  <span className="underline decoration-indigo-400 decoration-2 underline-offset-2">
                    {aiScanResult.candidate_name || (aiScanResult.is_competitor ? 'Opponent' : 'Melissa K. Brown')}
                  </span>
                </p>
                {aiScanResult.summary && (
                  <p className="text-[11px] text-slate-300/80 mt-1 italic">
                    "{aiScanResult.summary}"
                  </p>
                )}
                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Form auto-configured</span>
                  <span className="font-black text-emerald-400">Tap Button Below to Drop 📍</span>
                </div>
              </div>
            )}

            {/* AI Scan Fallback / Error Notice */}
            {aiScanError && !isAiScanning && (
              <div className="mt-2 p-2 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{aiScanError}</span>
              </div>
            )}

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 h-36 w-full bg-slate-950 flex items-center justify-center mt-2.5">
                <img
                  src={photoPreview}
                  alt="Captured sign"
                  className="w-full h-full object-cover"
                />
                <label
                  htmlFor="field-camera-upload"
                  className="absolute bottom-2 right-2 px-3 py-1 bg-slate-950/85 backdrop-blur rounded-lg text-xs text-white border border-slate-700 cursor-pointer font-medium flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Retake Photo</span>
                </label>
              </div>
            ) : (
              <label
                htmlFor="field-camera-upload"
                className="w-full py-4 px-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/50 flex items-center justify-center gap-3 cursor-pointer text-slate-400 hover:text-white transition active:scale-[0.99]"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold">Snap Quick Field Photo</span>
              </label>
            )}
          </div>

          {/* Ergonomic Giant McDonald's Cash Register Action Button */}
          <div className="pt-3">
            <button
              id="tour-field-drop-btn"
              type="button"
              disabled={isSubmitting || gpsStatus === 'locating' || isAiScanning}
              onClick={handleDropSign}
              className={`w-full py-6 sm:py-7 rounded-3xl font-black text-xl sm:text-2xl tracking-wider shadow-2xl flex items-center justify-center gap-3.5 active:scale-[0.96] transition-all duration-200 relative overflow-hidden border-2 ${
                justDroppedSuccess
                  ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-teal-300 border-white text-slate-950 shadow-emerald-400/80 ring-4 ring-emerald-300/80 animate-drop-pop animate-success-glow scale-[1.02]'
                  : isCompetitor
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 border-rose-400 text-white shadow-rose-600/40 hover:from-rose-500 hover:to-rose-400'
                  : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 border-emerald-300 text-slate-950 shadow-emerald-500/40 hover:from-emerald-400 hover:to-teal-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {justDroppedSuccess && (
                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
              )}

              {isSubmitting ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>UPLOADING SIGN...</span>
                </>
              ) : isAiScanning ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>AI SCANNING SIGN...</span>
                </>
              ) : justDroppedSuccess ? (
                <div className="flex flex-col items-center justify-center py-0.5 animate-fade-in">
                  <div className="flex items-center gap-2 text-2xl font-black tracking-wider text-slate-950">
                    <CheckCircle2 className="w-8 h-8 text-emerald-950 stroke-[3] animate-bounce" />
                    <span>SIGN DROPPED! ✓</span>
                    <Sparkles className="w-6 h-6 text-amber-900 fill-amber-300 animate-pulse" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-950/90 mt-0.5">
                    {justDroppedSuccess.isCompetitor
                      ? `Competitor Logged · Saved to Map`
                      : `${justDroppedSuccess.signLabel} Planted · Logged in ${justDroppedSuccess.elapsedSeconds}s (±${justDroppedSuccess.accuracy}m)`}
                  </span>
                </div>
              ) : (
                <>
                  {aiScanResult ? (
                    <Sparkles className="w-6 h-6 fill-current text-amber-300" />
                  ) : (
                    <MapPin className="w-6 h-6" />
                  )}
                  <span>
                    {aiScanResult
                      ? isCompetitor
                        ? 'CONFIRM & LOG COMPETITOR'
                        : 'CONFIRM & DROP SIGN'
                      : isCompetitor
                      ? 'LOG COMPETITOR SIGN'
                      : 'DROP OUR SIGN HERE'}
                  </span>
                </>
              )}
            </button>

            {/* Sub-label feedback under button */}
            <div className="flex items-center justify-center gap-1.5 mt-2 text-center min-h-[18px]">
              {justDroppedSuccess ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Successfully pinned to campaign map! Ready for next stop.
                </span>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Auto-timestamps and logs GPS coordinates in sub-10 seconds.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODE 2: CLEANUP / RETRIEVAL MODE                                  */}
      {/* ================================================================= */}
      {activeTab === 'retrieve' && (
        <div className="px-4 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Signs Near You</h3>
              <p className="text-xs text-slate-400">Mark signs retrieved post-election or for repair</p>
            </div>
            <button
              onClick={loadNearbySigns}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingNearby ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingNearby ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
              <p className="text-sm">Locating signs in your sector...</p>
            </div>
          ) : nearbySigns.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">All Signs Cleaned Up!</p>
              <p className="text-xs text-slate-500 mt-1">No active un-retrieved signs found in this radius.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {nearbySigns.map((sign) => {
                const isItemRetrieved = sign.status === 'retrieved';
                const signInfo = SIGN_TYPES.find((t) => t.id === sign.sign_type);

                return (
                  <div
                    key={sign.id}
                    className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between gap-3 shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                        {sign.photo_url ? (
                          <img
                            src={sign.photo_url}
                            alt="sign"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          signInfo?.icon || '📍'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {signInfo?.label || sign.sign_type}
                          </span>
                          {sign.is_competitor && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                              {sign.competitor_name || 'Competitor'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {sign.distance_meters !== undefined
                            ? `${sign.distance_meters}m away`
                            : `Lat ${Number(sign.latitude).toFixed(3)}`} • {sign.is_competitor ? 'Reported by' : 'By'} {sign.placed_by_name}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={retrievingId === sign.id}
                      onClick={() => handleMarkRetrieved(sign.id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shrink-0 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition"
                    >
                      {retrievingId === sign.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Mark Retrieved
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 60-Second Field Sign Runner Briefing Tour */}
      <TacticalOnboardingTour
        tourKey="wardrunner_field_tour_v1"
        steps={FIELD_TOUR_STEPS}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </main>
  );
}
