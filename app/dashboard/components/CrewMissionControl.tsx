'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, UserCheck, Footprints, MapPin, X, Check, Navigation, Sparkles, Activity, Layers, ChevronRight, Filter, Search, RotateCcw, Radio, DoorOpen, Target, UserPlus, Key, Trash2, Copy, Edit2, Save, Send, PlusCircle, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Plus
} from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';
import type { VolunteerLocationPing, CanvassRecord, Sign, SignType, VolunteerAssignment } from '@/lib/types';
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

const DEFAULT_MASTER_PIN = process.env.NEXT_PUBLIC_DEFAULT_PIN || '2468';
const DEFAULT_VOLUNTEERS: Volunteer[] = [];

const ROLE_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  'Field Volunteer': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Field Scout': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Precinct Captain': { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Field Director': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
};

const GROUPS = [
  { id: 'all', label: 'All Field Force', icon: '👥', short: 'All Teams' },
  { id: 'canvasser', label: 'Door Canvassers', icon: '🚪', short: 'Canvassers' },
  { id: 'flyer', label: 'Flyer Hangers', icon: '📰', short: 'Flyer Lit' },
  { id: 'sign', label: 'Sign Runners', icon: '🪧', short: 'Sign Team' },
  { id: 'town_hall', label: 'Town Hall & Events', icon: '🏛️', short: 'Events' },
];

export interface CrewMissionControlProps {
  isOpen: boolean;
  onClose: () => void;
  // Map integration
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  selectedVolunteer: string | null;
  onSelectVolunteer: (volName: string | null) => void;
  volunteerPings: VolunteerLocationPing[];
  canvassRecords: CanvassRecord[];
  signs: Sign[];
  onFlyToVolunteer?: (lat: number, lng: number) => void;
  showRoutesLayer?: boolean;
  setShowRoutesLayer?: (show: boolean) => void;
  // Missions
  assignments: VolunteerAssignment[];
  onSelectMission: (mission: VolunteerAssignment) => void;
  onToggleComplete: (id: string) => void;
  // Roster context
  signsCountByVolunteer?: Record<string, number>;
  isDark?: boolean;
  initialTab?: 'tracker' | 'roster' | 'missions';
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

export default function CrewMissionControl({
  isOpen,
  onClose,
  selectedGroup,
  onSelectGroup,
  selectedVolunteer,
  onSelectVolunteer,
  volunteerPings,
  canvassRecords,
  signs,
  onFlyToVolunteer,
  showRoutesLayer,
  setShowRoutesLayer,
  assignments,
  onSelectMission,
  onToggleComplete,
  signsCountByVolunteer = {},
  isDark = true,
  initialTab = 'tracker',
  initialTarget = null,
}: CrewMissionControlProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'tracker' | 'roster' | 'missions'>(initialTab);

  // Filter Panel (Tracker) State
  const [searchQuery, setSearchQuery] = useState('');

  // Roster & Dispatch State
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [masterPin, setMasterPin] = useState(DEFAULT_MASTER_PIN);
  const [isEditingMasterPin, setIsEditingMasterPin] = useState(false);
  const [tempMasterPin, setTempMasterPin] = useState(DEFAULT_MASTER_PIN);

  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Volunteer['role']>('Field Volunteer');
  const [customPin, setCustomPin] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [volunteerSearchQuery, setVolunteerSearchQuery] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMaster, setCopiedMaster] = useState(false);

  const [internalAssignments, setInternalAssignments] = useState<VolunteerAssignment[]>([]);
  const [dispatchingForVolunteer, setDispatchingForVolunteer] = useState<string | null>(null);
  const [expandedMissionsForVol, setExpandedMissionsForVol] = useState<Record<string, boolean>>({});
  const [missionFilter, setMissionFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [missionSearchQuery, setMissionSearchQuery] = useState('');

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

  // Load volunteers & assignments on mount
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

      setInternalAssignments(getStoredAssignments());
    } catch (e) {
      setVolunteers(DEFAULT_VOLUNTEERS);
    }

    const handleAssignmentsUpdated = (e: any) => {
      if (e.detail) setInternalAssignments(e.detail);
      else setInternalAssignments(getStoredAssignments());
    };
    window.addEventListener('campaignos_assignments_updated', handleAssignmentsUpdated);
    window.addEventListener('wardrunner_assignments_updated', handleAssignmentsUpdated);
    return () => {
      window.removeEventListener('campaignos_assignments_updated', handleAssignmentsUpdated);
      window.removeEventListener('wardrunner_assignments_updated', handleAssignmentsUpdated);
    };
  }, []);

  // Sync initialTab change
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle external tab & target triggers
  useEffect(() => {
    if (initialTarget) {
      setActiveTab('roster');
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

  // Compute tracker values
  const volunteerStats = useMemo(() => {
    return volunteerPings.map(ping => {
      const vName = ping.volunteer_name.toLowerCase().trim();
      const doorsKnocked = canvassRecords.filter(r => r.volunteer_name.toLowerCase().trim() === vName).length;
      const signsPlaced = signs.filter(s => !s.is_competitor && (s.placed_by_name || '').toLowerCase().trim() === vName).length;
      const isRecent = Date.now() - new Date(ping.last_ping_at).getTime() < 1000 * 60 * 30;

      return {
        ...ping,
        doorsKnocked,
        signsPlaced,
        isRecent,
      };
    });
  }, [volunteerPings, canvassRecords, signs]);

  const totalDoorsKnocked = canvassRecords.length;
  const totalSignsPlaced = useMemo(() => signs.filter(s => !s.is_competitor).length, [signs]);
  const activeNowCount = useMemo(() => volunteerStats.filter(v => v.is_active || v.isRecent).length, [volunteerStats]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: volunteerStats.length,
      canvasser: 0,
      flyer: 0,
      sign: 0,
      town_hall: 0,
    };
    volunteerStats.forEach(v => {
      const role = (v.role || '').toLowerCase();
      if (role.includes('canvass') || role.includes('door')) counts.canvasser++;
      if (role.includes('flyer') || role.includes('lit')) counts.flyer++;
      if (role.includes('sign') || role.includes('scout') || role.includes('field')) counts.sign++;
      if (role.includes('town') || role.includes('event')) counts.town_hall++;
    });
    return counts;
  }, [volunteerStats]);

  const filteredVolunteers = useMemo(() => {
    return volunteerStats.filter(v => {
      if (selectedGroup !== 'all') {
        const role = (v.role || '').toLowerCase();
        if (selectedGroup === 'canvasser' && !(role.includes('canvass') || role.includes('door'))) return false;
        if (selectedGroup === 'flyer' && !(role.includes('flyer') || role.includes('lit'))) return false;
        if (selectedGroup === 'sign' && !(role.includes('sign') || role.includes('scout') || role.includes('field'))) return false;
        if (selectedGroup === 'town_hall' && !(role.includes('town') || role.includes('event'))) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.volunteer_name.toLowerCase().includes(q);
        const matchesRole = (v.role || '').toLowerCase().includes(q);
        const matchesAction = (v.current_action || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesAction) return false;
      }
      return true;
    });
  }, [volunteerStats, selectedGroup, searchQuery]);

  const activeAssignmentsCount = internalAssignments.filter((a) => a.status !== 'completed').length;

  // Handlers
  const handleResetAll = () => {
    onSelectGroup('all');
    onSelectVolunteer(null);
    setSearchQuery('');
  };

  const handleFlyAndClose = (lat: number, lng: number, volName: string) => {
    onSelectVolunteer(volName);
    if (onFlyToVolunteer) {
      onFlyToVolunteer(lat, lng);
    }
    onClose();
  };

  const saveVolunteers = (newVols: Volunteer[]) => {
    setVolunteers(newVols);
    if (typeof window !== 'undefined') {
      localStorage.setItem('campaignos_volunteers', JSON.stringify(newVols));
    }
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

  const handleToggleMissionComplete = (missionId: string) => {
    const updated = markAssignmentComplete(missionId);
    setInternalAssignments(updated);
    if (onToggleComplete) {
      onToggleComplete(missionId);
    }
  };

  const playDispatchChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
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

    setInternalAssignments((prev) => [newAssign, ...prev]);
    setLastDispatchedMission(newAssign);
    setDispatchSuccess(true);
    setAssignNotes('');
    setDispatchingForVolunteer(null);
    setExpandedMissionsForVol((prev) => ({ ...prev, [targetVolunteer]: true }));
    playDispatchChime();
  };

  const toggleVolMissionsExpanded = (volName: string) => {
    setExpandedMissionsForVol((prev) => ({
      ...prev,
      [volName]: !prev[volName],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in pointer-events-auto">
      {/* Dark Blurred Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Panel Card */}
      <div className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col glass-heavy rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up">
        {/* Top Accent Line */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-purple-500 to-amber-400 shrink-0" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-purple-600 to-amber-500 flex items-center justify-center text-white shadow-lg shrink-0 border border-white/20">
              <div className="flex items-center">
                <Users className="w-5 h-5 -mr-1" />
                <Target className="w-4 h-4 text-amber-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Crew & Mission Control
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track field crew, manage roster & PINs, and dispatch missions — all in one place.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB BAR (BOLD, VISIBLE) */}
        <div className="flex items-center border-b border-white/10 bg-white/[0.02] shrink-0">
          {/* Field Tracker Tab — Teal/Emerald */}
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-4 px-4 text-sm font-black flex items-center justify-center gap-2 border-b-3 transition-all ${
              activeTab === 'tracker'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span>Field Tracker</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              {activeNowCount} Live
            </span>
          </button>

          {/* Roster & Dispatch Tab — Purple */}
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-4 px-4 text-sm font-black flex items-center justify-center gap-2 border-b-3 transition-all ${
              activeTab === 'roster'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Roster</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {volunteers.length}
            </span>
          </button>

          {/* Missions Tab — Amber/Gold */}
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 py-4 px-4 text-sm font-black flex items-center justify-center gap-2 border-b-3 transition-all ${
              activeTab === 'missions'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-5 h-5" />
            <span>Missions</span>
            {activeAssignmentsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono animate-pulse">
                {activeAssignmentsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {activeTab === 'tracker' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2">
                {GROUPS.map((g, idx) => {
                  const isSel = selectedGroup === g.id;
                  const count = groupCounts[g.id] ?? 0;
                  const isFirst = idx === 0;
                  const chipColors: Record<string, { sel: string; badge: string }> = {
                    all:       { sel: 'bg-teal-500/20 text-teal-300 border-teal-500/40 ring-1 ring-teal-400/30', badge: 'bg-teal-500/30 text-teal-100 border border-teal-500/40' },
                    canvasser: { sel: 'bg-purple-500/20 text-purple-300 border-purple-500/40 ring-1 ring-purple-400/30', badge: 'bg-purple-500/30 text-purple-100 border border-purple-500/40' },
                    flyer:     { sel: 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30', badge: 'bg-amber-500/30 text-amber-100 border border-amber-500/40' },
                    sign:      { sel: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-400/30', badge: 'bg-emerald-500/30 text-emerald-100 border border-emerald-500/40' },
                    town_hall: { sel: 'bg-blue-500/20 text-blue-300 border-blue-500/40 ring-1 ring-blue-400/30', badge: 'bg-blue-500/30 text-blue-100 border border-blue-500/40' },
                  };
                  const cc = chipColors[g.id] || chipColors.all;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSelectGroup(g.id)}
                      title={g.label}
                      className={`py-2 px-2.5 sm:px-3 text-xs font-bold rounded-xl transition-all duration-100 flex items-center justify-between gap-1.5 border ${
                        isFirst ? 'col-span-2 sm:col-span-1' : ''
                      } ${
                        isSel
                          ? `${cc.sel} shadow-sm font-black`
                          : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="text-sm shrink-0">{g.icon}</span>
                        <span className="truncate hidden sm:inline">{g.label}</span>
                        <span className="truncate sm:hidden">{g.short}</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-extrabold shrink-0 ${
                        isSel ? cc.badge : 'bg-white/10 text-slate-300'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <span>Field Crew</span>
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-white">{volunteerStats.length}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">({activeNowCount} active)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Registered volunteers</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <span>Doors Knocked</span>
                    <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-black text-emerald-300">{totalDoorsKnocked}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Voter contacts logged</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <span>Official Signs</span>
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="mt-1">
                    <span className="text-xl font-black text-cyan-300">{totalSignsPlaced}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Signs deployed in field</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <span>Map Filter</span>
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="mt-1 truncate">
                    <span className="text-sm font-black text-purple-300 truncate block">
                      {selectedVolunteer ? selectedVolunteer.split(' ')[0] : selectedGroup === 'all' ? 'All Personnel' : selectedGroup}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active map isolation</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search field volunteers by name, role, or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-16 text-xs bg-slate-900/80 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition shadow-inner"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-slate-400 hover:text-white p-1 rounded-md"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <DictateButton
                      onTranscript={(dictated) => setSearchQuery(dictated)}
                      size="sm"
                      title="Push to dictate volunteer search"
                    />
                  </div>
                </div>

                {setShowRoutesLayer && (
                  <button
                    type="button"
                    onClick={() => setShowRoutesLayer(!showRoutesLayer)}
                    className={`h-10 px-3.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border shrink-0 ${
                      showRoutesLayer
                        ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-sm'
                        : 'bg-slate-900/70 text-slate-400 hover:text-white border-white/10'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5 text-purple-400" />
                    <span>Turf Routes: {showRoutesLayer ? 'Visible' : 'Hidden'}</span>
                  </button>
                )}

                {(selectedGroup !== 'all' || selectedVolunteer || searchQuery) && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="h-10 px-3.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition flex items-center justify-center gap-1.5 border border-white/5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {selectedVolunteer && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs animate-fade-in shadow-lg shadow-emerald-500/5">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-slate-300 text-xs">Map currently filtered to: </span>
                      <span className="text-emerald-300 font-extrabold text-sm">{selectedVolunteer}</span>
                      <p className="text-[11px] text-slate-400">Only showing their live location, breadcrumb trail, and knocked doors.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectVolunteer(null)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider transition shrink-0 border border-emerald-500/30"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Field Personnel ({filteredVolunteers.length})</span>
                  <span>Performance & Navigation</span>
                </div>

                {filteredVolunteers.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400 bg-slate-900/40 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">🔍</span>
                    <span className="font-bold text-sm text-slate-200">No field volunteers match your search</span>
                    <p className="text-slate-500 max-w-sm">Try clearing your search query or selecting &ldquo;All Field Force&rdquo; to see all registered campaign personnel.</p>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredVolunteers.map(v => {
                      const isSelected = selectedVolunteer?.toLowerCase().trim() === v.volunteer_name.toLowerCase().trim();

                      return (
                        <div
                          key={v.volunteer_name}
                          onClick={() => {
                            if (isSelected) {
                              onSelectVolunteer(null);
                            } else {
                              onSelectVolunteer(v.volunteer_name);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all duration-100 cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.99] ${
                            isSelected
                              ? ((v.role || '').toLowerCase().includes('canvass') || (v.role || '').toLowerCase().includes('door'))
                                ? 'bg-purple-500/15 border-purple-400/50 shadow-xl shadow-purple-500/10'
                                : (v.role || '').toLowerCase().includes('sign') || (v.role || '').toLowerCase().includes('field')
                                ? 'bg-emerald-500/15 border-emerald-400/50 shadow-xl shadow-emerald-500/10'
                                : (v.role || '').toLowerCase().includes('flyer')
                                ? 'bg-amber-500/15 border-amber-400/50 shadow-xl shadow-amber-500/10'
                                : 'bg-teal-500/15 border-teal-400/50 shadow-xl shadow-teal-500/10'
                              : 'bg-slate-900/70 hover:bg-slate-800/80 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="relative shrink-0 mt-0.5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-xs text-white shadow-inner">
                                  {v.volunteer_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                {v.is_active && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-sm text-white truncate leading-tight">
                                    {v.volunteer_name}
                                  </h4>
                                  {isSelected && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                                      ISOLATED
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                                    {v.role}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {v.is_active ? '🟢 Live' : '⚪ Offline'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                                  {v.current_action || 'Field Volunteer'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-xs font-bold">
                              <span className="flex items-center gap-1 text-emerald-400" title="Doors Visited">
                                <DoorOpen className="w-3.5 h-3.5" />
                                <span>{v.doorsKnocked} doors</span>
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1 text-teal-300" title="Signs Placed">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{v.signsPlaced} signs</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFlyAndClose(v.latitude, v.longitude, v.volunteer_name);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                                title="Fly to volunteer location on map and close modal"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Fly to</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="space-y-5">
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

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setShowAddVolunteer((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Crew Member</span>
                </button>
              </div>

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
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Rachel Adams"
                            spellCheck={true}
                            className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                          />
                          <DictateButton
                            onTranscript={(dictated) => setName(dictated)}
                            size="sm"
                            title="Push to dictate volunteer name"
                          />
                        </div>
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
                      Live in volunteer's mobile app & cloud database
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

              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter crew by name, role, or phone..."
                  value={volunteerSearchQuery}
                  onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-14 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {volunteerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setVolunteerSearchQuery('')}
                      className="text-slate-400 hover:text-white p-0.5 rounded"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <DictateButton
                    onTranscript={(dictated) => setVolunteerSearchQuery(dictated)}
                    size="sm"
                    title="Push to dictate crew filter"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {volunteers.filter(v => {
                  if (!volunteerSearchQuery.trim()) return true;
                  const q = volunteerSearchQuery.toLowerCase().trim();
                  return v.name.toLowerCase().includes(q) || v.role.toLowerCase().includes(q) || (v.phone && v.phone.toLowerCase().includes(q));
                }).map((vol) => {
                  const badge = ROLE_BADGES[vol.role] || ROLE_BADGES['Field Volunteer'];
                  const placedCount = signsCountByVolunteer[vol.name] || 0;
                  const isCopied = copiedId === vol.id;
                  const isDispatchingThis = dispatchingForVolunteer === vol.name;
                  
                  const volMissions = internalAssignments.filter((a) => a.volunteer_name === vol.name);
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

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
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

                          <button
                            onClick={() => handleDeleteVolunteer(vol.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-95"
                            title="Remove volunteer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

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

                            {selectedTargetId === 'custom' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Location Title
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={customTitle}
                                      onChange={(e) => setCustomTitle(e.target.value)}
                                      placeholder="e.g. Anderson St & 9th St Corner"
                                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500"
                                    />
                                    <DictateButton
                                      onTranscript={(dictated) => setCustomTitle(dictated)}
                                      size="sm"
                                      title="Push to dictate location title"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Street Address
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={customAddress}
                                      onChange={(e) => setCustomAddress(e.target.value)}
                                      placeholder="e.g. 900 Anderson St, Bristol, TN"
                                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500"
                                    />
                                    <DictateButton
                                      onTranscript={(dictated) => setCustomAddress(dictated)}
                                      size="sm"
                                      title="Push to dictate street address"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {activeTab === 'missions' && (
            <div className="space-y-4">
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
                    setActiveTab('roster');
                    setDispatchingForVolunteer(volunteers[0]?.name || 'Campaign Volunteer');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Dispatch New Mission</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search missions, volunteers, streets..."
                  value={missionSearchQuery}
                  onChange={(e) => setMissionSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-14 text-xs bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 transition"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {missionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMissionSearchQuery('')}
                      className="text-slate-400 hover:text-white p-0.5 rounded"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <DictateButton
                    onTranscript={(dictated) => setMissionSearchQuery(dictated)}
                    size="sm"
                    title="Push to dictate mission search"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {assignments
                  .filter((a) => {
                    if (missionFilter === 'active' && a.status === 'completed') return false;
                    if (missionFilter === 'completed' && a.status !== 'completed') return false;
                    if (missionSearchQuery.trim()) {
                      const q = missionSearchQuery.toLowerCase().trim();
                      const matchTitle = a.title.toLowerCase().includes(q);
                      const matchVol = (a.volunteer_name || '').toLowerCase().includes(q);
                      const matchAddr = (a.street_address || '').toLowerCase().includes(q);
                      const matchType = a.sign_type.replace('_', ' ').toLowerCase().includes(q);
                      if (!matchTitle && !matchVol && !matchAddr && !matchType) return false;
                    }
                    return true;
                  })
                  .map((m) => {
                    const isDone = m.status === 'completed';
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isDone
                            ? 'bg-white/[0.01] border-white/5 opacity-60'
                            : 'bg-white/[0.03] border-white/10 hover:border-purple-500/30'
                        }`}
                        onClick={() => onSelectMission(m)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                m.priority === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : m.priority === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              }`}>
                                {m.priority}
                              </span>

                              <h4 className="text-xs font-extrabold text-white truncate">
                                {m.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                              <span className="text-purple-300 font-semibold flex items-center gap-1">
                                <Users className="w-3 h-3" /> {m.volunteer_name}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">
                                {m.quantity}× {m.sign_type.replace('_', ' ')}
                              </span>
                              <span>•</span>
                              <span className="text-slate-500">
                                {m.target_type === 'precinct' ? 'Precinct' : 'Intersection'}
                              </span>
                            </div>

                            {m.notes && (
                              <p className="text-[11px] text-slate-300 mt-1 pl-2 border-l border-purple-500/40 italic truncate">
                                "{m.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onToggleComplete(m.id)}
                              className={`p-1.5 rounded-lg border transition ${
                                isDone
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                              }`}
                              title={isDone ? 'Mark as Active' : 'Mark as Completed'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onSelectMission(m)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                              title="Center location on map"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Live GPS & mission data syncing from field devices.</span>
          </div>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs hover:shadow-lg active:scale-95 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
