'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Key,
  Trash2,
  Copy,
  Check,
  X,
  Edit2,
  Save,
  Target,
  MapPin,
  Send,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';
import type { SignType, VolunteerAssignment } from '@/lib/types';
import {
  TARGET_PRESETS,
  TargetPreset,
  getStoredAssignments,
  addAssignment,
  markAssignmentComplete,
} from '@/lib/assignmentData';
import { upsertToSupabase, deleteFromSupabase } from '@/lib/syncEngine';
import { getCampaignId } from '@/lib/auth';

export interface Volunteer {
  id: string;
  name: string;
  role: 'Field Volunteer' | 'Field Scout' | 'Precinct Captain' | 'Field Director';
  pin?: string;
  phone?: string;
  created_at: string;
  active: boolean;
}

interface VolunteerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  signsCountByVolunteer?: Record<string, number>;
  isDark?: boolean;
  initialTab?: 'roster' | 'dispatch';
  initialTarget?: {
    title: string;
    street_address?: string;
    lat: number;
    lng: number;
    signType?: SignType;
    quantity?: number;
    targetType?: 'intersection' | 'precinct' | 'scout_rec' | 'custom';
  } | null;
}

const DEFAULT_MASTER_PIN = process.env.NEXT_PUBLIC_DEFAULT_PIN || '2468';

const DEFAULT_VOLUNTEERS: Volunteer[] = [
  {
    id: 'vol-1',
    name: 'Campaign Volunteer',
    role: 'Field Volunteer',
    pin: DEFAULT_MASTER_PIN,
    phone: '(423) 555-0142',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    active: true,
  },
  {
    id: 'vol-2',
    name: 'Sarah Jenkins',
    role: 'Precinct Captain',
    pin: '8492',
    phone: '(423) 555-0188',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    active: true,
  },
  {
    id: 'vol-3',
    name: 'Marcus Taylor',
    role: 'Field Scout',
    pin: DEFAULT_MASTER_PIN,
    phone: '(423) 555-0199',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    active: true,
  },
  {
    id: 'vol-4',
    name: 'David Vance',
    role: 'Field Director',
    pin: '3948',
    phone: '(423) 555-0112',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    active: true,
  },
];

const ROLE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  'Field Volunteer': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Field Scout': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Precinct Captain': { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Field Director': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
};

export default function VolunteerManagerModal({
  isOpen,
  onClose,
  signsCountByVolunteer = {},
  isDark = true,
  initialTab = 'roster',
  initialTarget = null,
}: VolunteerManagerModalProps) {
  // Main view mode: 'crew' (volunteer-centric with live missions) or 'all_missions' (city-wide list)
  const [viewMode, setViewMode] = useState<'crew' | 'all_missions'>('crew');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [masterPin, setMasterPin] = useState(DEFAULT_MASTER_PIN);
  const [isEditingMasterPin, setIsEditingMasterPin] = useState(false);
  const [tempMasterPin, setTempMasterPin] = useState(DEFAULT_MASTER_PIN);

  // Volunteer creation state
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Volunteer['role']>('Field Volunteer');
  const [customPin, setCustomPin] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMaster, setCopiedMaster] = useState(false);

  // Assignments / Dispatch state
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]);
  const [dispatchingForVolunteer, setDispatchingForVolunteer] = useState<string | null>(null);
  const [expandedMissionsForVol, setExpandedMissionsForVol] = useState<Record<string, boolean>>({});
  const [missionFilter, setMissionFilter] = useState<'all' | 'active' | 'completed'>('active');

  // Dispatch Form fields
  const [selectedTargetId, setSelectedTargetId] = useState<string>(TARGET_PRESETS[0].id);
  const [customTitle, setCustomTitle] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number>(36.5951);
  const [customLng, setCustomLng] = useState<number>(-82.1887);
  const [assignSignType, setAssignSignType] = useState<SignType>('yard_sign');
  const [assignQty, setAssignQty] = useState<number>(2);
  const [assignPriority, setAssignPriority] = useState<'critical' | 'high' | 'medium'>('high');
  const [assignNotes, setAssignNotes] = useState('');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [lastDispatchedMission, setLastDispatchedMission] = useState<VolunteerAssignment | null>(null);

  // Play audio confirmation chime on dispatch
  const playDispatchChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 triumphant chime
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.3);
      });
    } catch {}
  };

  // Load Volunteers & Assignments
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedPin = localStorage.getItem('campaignos_campaign_pin') || localStorage.getItem('wardrunner_campaign_pin');
      if (savedPin) {
        setMasterPin(savedPin);
        setTempMasterPin(savedPin);
      }

      const savedVols = localStorage.getItem('campaignos_volunteers') || localStorage.getItem('wardrunner_volunteers');
      if (savedVols) {
        setVolunteers(JSON.parse(savedVols));
      } else {
        setVolunteers(DEFAULT_VOLUNTEERS);
        localStorage.setItem('campaignos_volunteers', JSON.stringify(DEFAULT_VOLUNTEERS));
      }

      setAssignments(getStoredAssignments());
    } catch (e) {
      setVolunteers(DEFAULT_VOLUNTEERS);
    }

    const handleAssignmentsUpdated = (e: any) => {
      if (e.detail) setAssignments(e.detail);
      else setAssignments(getStoredAssignments());
    };
    window.addEventListener('campaignos_assignments_updated', handleAssignmentsUpdated);
    window.addEventListener('wardrunner_assignments_updated', handleAssignmentsUpdated);
    return () => {
      window.removeEventListener('campaignos_assignments_updated', handleAssignmentsUpdated);
      window.removeEventListener('wardrunner_assignments_updated', handleAssignmentsUpdated);
    };
  }, []);

  // Handle external tab & target triggers (e.g. from Scout or Precinct cards)
  useEffect(() => {
    if (initialTab === 'dispatch') {
      setViewMode('crew');
      setDispatchingForVolunteer(volunteers[0]?.name || 'Campaign Volunteer');
    }
  }, [initialTab, volunteers]);

  useEffect(() => {
    if (initialTarget) {
      setViewMode('crew');
      setDispatchingForVolunteer(volunteers[0]?.name || 'Campaign Volunteer');
      setSelectedTargetId('custom');
      setCustomTitle(initialTarget.title);
      setCustomAddress(initialTarget.street_address || initialTarget.title);
      setCustomLat(initialTarget.lat);
      setCustomLng(initialTarget.lng);
      if (initialTarget.signType) setAssignSignType(initialTarget.signType);
      if (initialTarget.quantity) setAssignQty(initialTarget.quantity);
    }
  }, [initialTarget, volunteers]);

  // Save volunteers to localStorage AND sync to Supabase database
  const saveVolunteers = (newVols: Volunteer[]) => {
    setVolunteers(newVols);
    if (typeof window !== 'undefined') {
      localStorage.setItem('campaignos_volunteers', JSON.stringify(newVols));
    }
    // Dual-write persistence to Supabase volunteers table
    try {
      const campaignId = getCampaignId();
      newVols.forEach((v) => {
        upsertToSupabase('volunteers', 'campaignos_volunteers', {
          id: v.id,
          campaign_id: campaignId,
          name: v.name,
          pin_hash: v.pin || masterPin,
          role: v.role,
          phone: v.phone || null,
          active: v.active !== false,
          created_at: v.created_at,
        }).catch((err) => console.error('Failed to sync volunteer to database:', err));
      });
    } catch (e) {
      console.warn('Supabase volunteer sync skipped:', e);
    }
  };

  const handleSaveMasterPin = () => {
    const cleaned = tempMasterPin.trim();
    if (cleaned.length !== 4 || !/^\d{4}$/.test(cleaned)) {
      alert('Master PIN must be exactly 4 digits.');
      return;
    }
    setMasterPin(cleaned);
    setIsEditingMasterPin(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('campaignos_campaign_pin', cleaned);
    }
  };

  const handleAddVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Volunteer name is required.');
      return;
    }

    if (customPin && (customPin.trim().length !== 4 || !/^\d{4}$/.test(customPin.trim()))) {
      setFormError('Custom PIN must be exactly 4 digits.');
      return;
    }

    const newVol: Volunteer = {
      id: `vol-${Date.now()}`,
      name: cleanName,
      role,
      pin: customPin.trim() || masterPin,
      phone: phone.trim() || undefined,
      created_at: new Date().toISOString(),
      active: true,
    };

    saveVolunteers([newVol, ...volunteers]);
    setName('');
    setCustomPin('');
    setPhone('');
    setRole('Field Volunteer');
    setShowAddVolunteer(false);
  };

  const handleDeleteVolunteer = (id: string) => {
    const vol = volunteers.find((v) => v.id === id);
    if (confirm(`Remove ${vol?.name || 'volunteer'} from the active crew roster?`)) {
      const remaining = volunteers.filter((v) => v.id !== id);
      saveVolunteers(remaining);
      deleteFromSupabase('volunteers', 'campaignos_volunteers', id).catch(() => {});
    }
  };

  const getLoginLink = (vol?: Volunteer) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pin = vol?.pin || masterPin;
    const nameParam = vol?.name ? `&name=${encodeURIComponent(vol.name)}` : '';
    return `${origin}/field?pin=${pin}${nameParam}`;
  };

  const handleCopyLink = (vol?: Volunteer) => {
    const link = getLoginLink(vol);
    if (!link) return;
    navigator.clipboard.writeText(link);
    if (vol) {
      setCopiedId(vol.id);
      setTimeout(() => setCopiedId(null), 2200);
    } else {
      setCopiedMaster(true);
      setTimeout(() => setCopiedMaster(false), 2200);
    }
  };

  // Toggle mission completed status in real-time
  const handleToggleMissionComplete = (missionId: string) => {
    const updated = markAssignmentComplete(missionId);
    setAssignments(updated);
  };

  // Dispatch Mission Handler (Dual-writes to storage, window event, and Supabase)
  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVolunteer = dispatchingForVolunteer || volunteers[0]?.name || 'Campaign Volunteer';

    let title = '';
    let lat = 36.5951;
    let lng = -82.1887;
    let street_address = '';
    let target_type: VolunteerAssignment['target_type'] = 'intersection';

    if (selectedTargetId === 'custom') {
      title = customTitle.trim() || 'Custom Sign Location';
      street_address = customAddress.trim() || title;
      lat = customLat;
      lng = customLng;
      target_type = initialTarget?.targetType || 'custom';
    } else {
      const preset = TARGET_PRESETS.find((p) => p.id === selectedTargetId);
      if (preset) {
        title = preset.title;
        street_address = preset.title;
        lat = preset.lat;
        lng = preset.lng;
        target_type = preset.type === 'precinct' ? 'precinct' : 'intersection';
      }
    }

    const trimmedNotes = assignNotes.trim();

    // addAssignment automatically saves to localStorage, emits window event, and upserts to Supabase
    const newAssign = addAssignment({
      volunteer_name: targetVolunteer,
      target_type,
      title,
      street_address,
      sign_type: assignSignType,
      quantity: Number(assignQty) || 1,
      lat,
      lng,
      priority: assignPriority,
      notes: trimmedNotes || undefined,
    });

    // Instant real-time UI update: increment counter & expand missions for this volunteer
    setAssignments((prev) => [newAssign, ...prev]);
    setLastDispatchedMission(newAssign);
    setDispatchSuccess(true);
    setAssignNotes('');
    setDispatchingForVolunteer(null); // Close the inline dispatch drawer
    setExpandedMissionsForVol((prev) => ({ ...prev, [targetVolunteer]: true }));
    playDispatchChime();
  };

  const toggleVolMissionsExpanded = (volName: string) => {
    setExpandedMissionsForVol((prev) => ({
      ...prev,
      [volName]: !prev[volName],
    }));
  };

  const activeAssignmentsCount = assignments.filter((a) => a.status !== 'completed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Center Pop Card */}
      <div className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col glass-heavy rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up">
        {/* Top Accent Gradient Edge */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0 border border-white/20">
              <div className="flex items-center">
                <Users className="w-5 h-5 -mr-1" />
                <Target className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Crew & Missions Command
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage volunteer access PINs, real-time workload, and dispatch sign missions across Bristol.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95"
            title="Close command hub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Action Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('crew')}
              className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                viewMode === 'crew'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Crew & Tasks</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                {volunteers.length}
              </span>
              {activeAssignmentsCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold animate-pulse">
                  {activeAssignmentsCount} Active
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode('all_missions')}
              className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                viewMode === 'all_missions'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>All City Missions</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                {assignments.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowAddVolunteer((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Crew Member</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Master Campaign PIN Bar (Visible in all tabs) */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Campaign Master Access PIN
                </span>
                {isEditingMasterPin ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={tempMasterPin}
                      onChange={(e) => setTempMasterPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-24 px-2 py-1 text-sm font-mono font-bold bg-white/10 rounded-lg border border-emerald-500 text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveMasterPin}
                      className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      title="Save PIN"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setTempMasterPin(masterPin);
                        setIsEditingMasterPin(false);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-mono font-black text-emerald-400 tracking-wider">
                      {masterPin}
                    </span>
                    <button
                      onClick={() => setIsEditingMasterPin(true)}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                      title="Edit Master PIN"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyLink()}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                  copiedMaster
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
                title="Copy Master Field App invite link"
              >
                {copiedMaster ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Master Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* New Volunteer Registration Card (Expandable) */}
          {showAddVolunteer && (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 animate-slide-up space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Register New Field Volunteer
                </span>
                <button
                  onClick={() => setShowAddVolunteer(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleAddVolunteer} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rachel Adams"
                      spellCheck={true}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Campaign Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="Field Volunteer">Field Volunteer (Standard)</option>
                      <option value="Field Scout">Field Scout (Intelligence & Competitors)</option>
                      <option value="Precinct Captain">Precinct Captain (Neighborhood Lead)</option>
                      <option value="Field Director">Field Director (Admin Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Dedicated PIN (4 digits)
                    </label>
                    <input
                      type="text"
                      value={customPin}
                      onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder={`Leave blank to use ${masterPin}`}
                      maxLength={4}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(423) 555-0100"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddVolunteer(false)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 transition"
                  >
                    Save Volunteer to Roster & DB
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Immediate Dispatch Confirmation Alert */}
          {dispatchSuccess && lastDispatchedMission && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-2 border-emerald-400/50 shadow-xl shadow-emerald-950/40 text-white animate-slide-up space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/30 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shrink-0">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-300 tracking-wider block">
                      ✓ Mission Dispatched & Database Synced!
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Assigned to <span className="font-bold text-white">{lastDispatchedMission.volunteer_name}</span> · {lastDispatchedMission.quantity}× {lastDispatchedMission.sign_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchSuccess(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs"
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5 text-xs">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>📍 Target:</span>
                  <span className="text-slate-200">{lastDispatchedMission.title}</span>
                </p>
                {lastDispatchedMission.notes ? (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-1.5 font-medium">
                    <span className="shrink-0 text-sm">📝</span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Special Instructions Logged:</span>
                      <span className="italic">&ldquo;{lastDispatchedMission.notes}&rdquo;</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No special placement notes attached.</p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-emerald-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live in volunteer&apos;s mobile app & cloud database
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDispatchSuccess(false);
                    setLastDispatchedMission(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-bold transition active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW MODE 1: CREW & TASKS (People-First Master View)
              ======================================================== */}
          {viewMode === 'crew' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Active Volunteer Ground Force ({volunteers.length})
                </span>
                <span className="text-[10px] text-slate-400">
                  Click <span className="text-emerald-400 font-bold">+ Dispatch</span> on any card to assign tasks
                </span>
              </div>

              <div className="space-y-3">
                {volunteers.map((vol) => {
                  const badge = ROLE_BADGES[vol.role] || ROLE_BADGES['Field Volunteer'];
                  const placedCount = signsCountByVolunteer[vol.name] || 0;
                  const isCopied = copiedId === vol.id;
                  const isDispatchingThis = dispatchingForVolunteer === vol.name;
                  
                  // Missions for this specific volunteer
                  const volMissions = assignments.filter((a) => a.volunteer_name === vol.name);
                  const activeVolMissions = volMissions.filter((a) => a.status !== 'completed');
                  const completedVolMissions = volMissions.filter((a) => a.status === 'completed');
                  const isMissionsExpanded = !!expandedMissionsForVol[vol.name];

                  return (
                    <div
                      key={vol.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isDispatchingThis
                          ? 'bg-purple-950/20 border-purple-500/50 shadow-lg ring-1 ring-purple-500/30'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Volunteer Main Card Header */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center font-black text-sm text-white shrink-0 border border-white/10 shadow-md">
                            {vol.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white">{vol.name}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {vol.role}
                              </span>
                              {activeVolMissions.length > 0 ? (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                                  {activeVolMissions.length} active mission{activeVolMissions.length === 1 ? '' : 's'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  No active missions
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium flex-wrap">
                              <span className="font-mono text-emerald-400 font-bold">
                                PIN: {vol.pin || masterPin}
                              </span>
                              {vol.phone && (
                                <>
                                  <span>•</span>
                                  <span>{vol.phone}</span>
                                </>
                              )}
                              {placedCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400 font-semibold">{placedCount} signs placed</span>
                                </>
                              )}
                              {completedVolMissions.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">{completedVolMissions.length} completed</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* 1-Click Dispatch Button */}
                          <button
                            onClick={() => {
                              if (isDispatchingThis) {
                                setDispatchingForVolunteer(null);
                              } else {
                                setDispatchingForVolunteer(vol.name);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                              isDispatchingThis
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/30'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                            }`}
                            title={`Dispatch mission to ${vol.name}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isDispatchingThis ? 'Close Form' : '+ Dispatch'}</span>
                          </button>

                          {/* Toggle Assigned Missions Dropdown */}
                          <button
                            onClick={() => toggleVolMissionsExpanded(vol.name)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition active:scale-95 ${
                              isMissionsExpanded
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                            }`}
                            title="View active missions assigned to this volunteer"
                          >
                            <Target className="w-3.5 h-3.5 text-purple-400" />
                            <span>Missions ({volMissions.length})</span>
                            {isMissionsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyLink(vol)}
                            className={`p-2 rounded-xl border text-xs font-bold flex items-center transition active:scale-95 ${
                              isCopied
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                            }`}
                            title="Copy volunteer direct sign-in link"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>

                          {/* Delete Volunteer */}
                          <button
                            onClick={() => handleDeleteVolunteer(vol.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-95"
                            title="Remove volunteer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* INLINE DISPATCH FORM (Smoothly expands under selected volunteer) */}
                      {isDispatchingThis && (
                        <div className="border-t border-purple-500/30 bg-purple-950/30 p-4 sm:p-5 animate-slide-up space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                              <Send className="w-4 h-4 text-emerald-400" />
                              Dispatch Mission Directly to {vol.name}
                            </span>
                            <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Syncs directly to mobile app & cloud DB
                            </span>
                          </div>

                          <form onSubmit={handleDispatch} className="space-y-3.5">
                            {/* Target Location Preset or Custom */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                                  Target Area / Intersection *
                                </label>
                                <span className="text-[10px] text-slate-400">High-AADT Corridors & Priority Precincts</span>
                              </div>

                              <select
                                value={selectedTargetId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedTargetId(val);
                                  const found = TARGET_PRESETS.find((p) => p.id === val);
                                  if (found) {
                                    setAssignSignType(found.recommendedSign);
                                  }
                                }}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-medium"
                              >
                                <optgroup label="Priority Intersections & Corridors (High Traffic)">
                                  {TARGET_PRESETS.filter((p) => p.type === 'intersection').map((p) => (
                                    <option key={p.id} value={p.id}>
                                      📍 {p.title} ({p.subtitle})
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Key Precincts & Neighborhoods">
                                  {TARGET_PRESETS.filter((p) => p.type === 'precinct').map((p) => (
                                    <option key={p.id} value={p.id}>
                                      🗳️ {p.title} ({p.subtitle})
                                    </option>
                                  ))}
                                </optgroup>
                                <option value="custom">✏️ Enter Custom Address / Coordinates</option>
                              </select>
                            </div>

                            {/* Custom Address Fields if selected */}
                            {selectedTargetId === 'custom' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Location Title
                                  </label>
                                  <input
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    placeholder="e.g. Anderson St & 9th St Corner"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Street Address
                                  </label>
                                  <input
                                    type="text"
                                    value={customAddress}
                                    onChange={(e) => setCustomAddress(e.target.value)}
                                    placeholder="e.g. 900 Anderson St, Bristol, TN"
                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Sign Type, Quantity & Priority */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Format */}
                              <div>
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                                  Sign Format
                                </label>
                                <select
                                  value={assignSignType}
                                  onChange={(e) => setAssignSignType(e.target.value as SignType)}
                                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="yard_sign">Yard Sign (Standard Lawn)</option>
                                  <option value="large_sign">4×4 Roadside Sign</option>
                                  <option value="banner">Commercial Banner</option>
                                  <option value="billboard">Billboard Location</option>
                                </select>
                              </div>

                              {/* Quantity */}
                              <div>
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                                  Signs to Drop: <span className="text-emerald-400 font-bold">{assignQty}</span>
                                </label>
                                <div className="flex gap-1">
                                  {[1, 2, 4, 6, 10].map((qty) => (
                                    <button
                                      key={qty}
                                      type="button"
                                      onClick={() => setAssignQty(qty)}
                                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                                        assignQty === qty
                                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                                          : 'border-white/10 text-slate-400 hover:text-white bg-white/5'
                                      }`}
                                    >
                                      {qty}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Priority */}
                              <div>
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                                  Urgency
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                  {[
                                    { id: 'critical', label: 'Critical', color: 'text-rose-300 border-rose-500/40 bg-rose-500/20' },
                                    { id: 'high', label: 'High', color: 'text-amber-300 border-amber-500/40 bg-amber-500/20' },
                                    { id: 'medium', label: 'Normal', color: 'text-sky-300 border-sky-500/40 bg-sky-500/20' },
                                  ].map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => setAssignPriority(p.id as any)}
                                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                                        assignPriority === p.id
                                          ? `${p.color} ring-1 ring-white/20 font-black`
                                          : 'border-white/10 text-slate-400 hover:text-white bg-white/5'
                                      }`}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Special Placement Instructions & Dictation */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                                  Special Instructions / Placement Notes
                                </label>
                                <DictateButton
                                  onTranscript={(txt) => setAssignNotes((prev) => (prev ? `${prev} ${txt}` : txt))}
                                  size="sm"
                                />
                              </div>
                              <textarea
                                value={assignNotes}
                                onChange={(e) => setAssignNotes(e.target.value)}
                                placeholder="e.g. Place 15ft off curb near gas station entrance. Homeowner approved yard placement."
                                spellCheck={true}
                                rows={2}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                              />
                            </div>

                            {/* Form Submit & Cancel */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setDispatchingForVolunteer(null)}
                                className="px-3 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-semibold"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95 transition"
                              >
                                <Send className="w-3.5 h-3.5" /> Dispatch to {vol.name}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* INLINE ASSIGNED MISSIONS LIST (Accordion per volunteer) */}
                      {isMissionsExpanded && (
                        <div className="border-t border-white/10 bg-black/25 p-3.5 sm:p-4 space-y-2 animate-slide-up">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-purple-400" />
                              Assignments for {vol.name} ({volMissions.length})
                            </span>
                            <span className="text-[10px] text-slate-500">Click circle to mark completed</span>
                          </div>

                          {volMissions.length === 0 ? (
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                              <p className="text-xs text-slate-400">
                                No missions currently assigned to {vol.name}.
                              </p>
                              <button
                                onClick={() => setDispatchingForVolunteer(vol.name)}
                                className="mt-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Assign first mission
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {volMissions.map((m) => {
                                const isCompleted = m.status === 'completed';
                                return (
                                  <div
                                    key={m.id}
                                    className={`p-3 rounded-xl border transition-all ${
                                      isCompleted
                                        ? 'bg-white/[0.01] border-white/5 opacity-60'
                                        : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        <button
                                          onClick={() => handleToggleMissionComplete(m.id)}
                                          className={`mt-0.5 p-1 rounded-lg border transition shrink-0 ${
                                            isCompleted
                                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                              : 'bg-white/5 border-white/20 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'
                                          }`}
                                          title={isCompleted ? 'Mark active' : 'Mark completed'}
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                        </button>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                                              {m.title}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-full border ${
                                              m.priority === 'critical'
                                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                                : m.priority === 'high'
                                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                            }`}>
                                              {m.priority}
                                            </span>
                                            {isCompleted && (
                                              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                                                Completed
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                            <span className="text-emerald-300 font-semibold">
                                              {m.quantity}× {m.sign_type.replace('_', ' ')}
                                            </span>
                                            <span>•</span>
                                            <span className="truncate">{m.street_address || m.title}</span>
                                          </div>

                                          {m.notes && (
                                            <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-1.5 font-medium">
                                              <span className="shrink-0 text-xs">📝</span>
                                              <span className="italic">&ldquo;{m.notes}&rdquo;</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW MODE 2: ALL CITY MISSIONS (Bird's Eye Campaign View)
              ======================================================== */}
          {viewMode === 'all_missions' && (
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-bold">
                  {(['active', 'completed', 'all'] as const).map((f) => {
                    const count =
                      f === 'active'
                        ? assignments.filter((a) => a.status !== 'completed').length
                        : f === 'completed'
                        ? assignments.filter((a) => a.status === 'completed').length
                        : assignments.length;

                    return (
                      <button
                        key={f}
                        onClick={() => setMissionFilter(f)}
                        className={`px-3 py-1.5 rounded-lg transition capitalize flex items-center gap-1.5 ${
                          missionFilter === f
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{f}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setViewMode('crew');
                    setDispatchingForVolunteer(volunteers[0]?.name || 'Campaign Volunteer');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Dispatch New Mission</span>
                </button>
              </div>

              {/* City Missions Feed */}
              <div className="space-y-2.5">
                {assignments
                  .filter((a) => {
                    if (missionFilter === 'active') return a.status !== 'completed';
                    if (missionFilter === 'completed') return a.status === 'completed';
                    return true;
                  })
                  .map((m) => {
                    const isCompleted = m.status === 'completed';
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCompleted
                            ? 'bg-white/[0.01] border-white/5 opacity-60'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <button
                              onClick={() => handleToggleMissionComplete(m.id)}
                              className={`mt-0.5 p-1 rounded-lg border transition shrink-0 ${
                                isCompleted
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : 'bg-white/5 border-white/20 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'
                              }`}
                              title={isCompleted ? 'Mark active' : 'Mark completed'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {m.title}
                                </span>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  👤 {m.volunteer_name}
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  m.priority === 'critical'
                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    : m.priority === 'high'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                }`}>
                                  {m.priority}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                <span className="text-emerald-400 font-bold">
                                  {m.quantity}× {m.sign_type.replace('_', ' ')}
                                </span>
                                <span>•</span>
                                <span className="truncate">{m.street_address || m.title}</span>
                              </div>

                              {m.notes && (
                                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-1.5 font-medium">
                                  <span className="shrink-0 text-sm">📝</span>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                                      Special Placement Notes:
                                    </span>
                                    <span className="italic">&ldquo;{m.notes}&rdquo;</span>
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {viewMode === 'crew'
              ? 'Missions and crew updates sync to volunteer field apps & cloud DB immediately.'
              : `${activeAssignmentsCount} active field mission${activeAssignmentsCount === 1 ? '' : 's'} underway across Bristol.`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
