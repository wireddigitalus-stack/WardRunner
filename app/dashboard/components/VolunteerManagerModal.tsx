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
  Navigation,
  Send,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';
import type { SignType, VolunteerAssignment } from '@/lib/types';
import {
  TARGET_PRESETS,
  TargetPreset,
  getStoredAssignments,
  saveStoredAssignments,
  addAssignment,
} from '@/lib/assignmentData';

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

const DEFAULT_MASTER_PIN = '246810';

const DEFAULT_VOLUNTEERS: Volunteer[] = [
  {
    id: 'vol-1',
    name: 'Campaign Volunteer',
    role: 'Field Volunteer',
    pin: '246810',
    phone: '(423) 555-0142',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    active: true,
  },
  {
    id: 'vol-2',
    name: 'Sarah Jenkins',
    role: 'Precinct Captain',
    pin: '849201',
    phone: '(423) 555-0188',
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    active: true,
  },
  {
    id: 'vol-3',
    name: 'Marcus Taylor',
    role: 'Field Scout',
    pin: '246810',
    phone: '(423) 555-0199',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    active: true,
  },
  {
    id: 'vol-4',
    name: 'David Vance',
    role: 'Field Director',
    pin: '394812',
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
  const [activeTab, setActiveTab] = useState<'roster' | 'dispatch'>(initialTab);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [masterPin, setMasterPin] = useState(DEFAULT_MASTER_PIN);
  const [isEditingMasterPin, setIsEditingMasterPin] = useState(false);
  const [tempMasterPin, setTempMasterPin] = useState(DEFAULT_MASTER_PIN);

  // Volunteer Roster Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<Volunteer['role']>('Field Volunteer');
  const [customPin, setCustomPin] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMaster, setCopiedMaster] = useState(false);

  // Assignments / Dispatch State
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]);
  const [assignedVolunteer, setAssignedVolunteer] = useState('');
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
  const [missionFilter, setMissionFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Load Volunteers & Assignments
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedPin = localStorage.getItem('wardrunner_campaign_pin');
      if (savedPin) {
        setMasterPin(savedPin);
        setTempMasterPin(savedPin);
      }

      const savedVols = localStorage.getItem('wardrunner_volunteers');
      if (savedVols) {
        setVolunteers(JSON.parse(savedVols));
      } else {
        setVolunteers(DEFAULT_VOLUNTEERS);
        localStorage.setItem('wardrunner_volunteers', JSON.stringify(DEFAULT_VOLUNTEERS));
      }

      setAssignments(getStoredAssignments());
    } catch (e) {
      setVolunteers(DEFAULT_VOLUNTEERS);
    }

    const handleAssignmentsUpdated = (e: any) => {
      if (e.detail) setAssignments(e.detail);
      else setAssignments(getStoredAssignments());
    };
    window.addEventListener('wardrunner_assignments_updated', handleAssignmentsUpdated);
    return () => window.removeEventListener('wardrunner_assignments_updated', handleAssignmentsUpdated);
  }, []);

  // Handle external tab & target triggers (e.g. from Scout or Precinct cards)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialTarget) {
      setActiveTab('dispatch');
      setSelectedTargetId('custom');
      setCustomTitle(initialTarget.title);
      setCustomAddress(initialTarget.street_address || initialTarget.title);
      setCustomLat(initialTarget.lat);
      setCustomLng(initialTarget.lng);
      if (initialTarget.signType) setAssignSignType(initialTarget.signType);
      if (initialTarget.quantity) setAssignQty(initialTarget.quantity);
    }
  }, [initialTarget]);

  // Save volunteers to localStorage
  const saveVolunteers = (newVols: Volunteer[]) => {
    setVolunteers(newVols);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wardrunner_volunteers', JSON.stringify(newVols));
    }
  };

  const handleSaveMasterPin = () => {
    const cleaned = tempMasterPin.trim();
    if (cleaned.length < 4 || cleaned.length > 6) {
      alert('Master PIN must be 4 to 6 digits.');
      return;
    }
    setMasterPin(cleaned);
    setIsEditingMasterPin(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wardrunner_campaign_pin', cleaned);
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

    if (customPin && (customPin.trim().length < 4 || customPin.trim().length > 6)) {
      setFormError('Custom PIN must be 4 to 6 digits.');
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
  };

  const handleDeleteVolunteer = (id: string) => {
    saveVolunteers(volunteers.filter((v) => v.id !== id));
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

  // Dispatch Mission Handler
  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const volName = assignedVolunteer || (volunteers[0]?.name || 'Campaign Volunteer');
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
      const preset = TARGET_PRESETS.find(p => p.id === selectedTargetId);
      if (preset) {
        title = preset.title;
        street_address = preset.title;
        lat = preset.lat;
        lng = preset.lng;
        target_type = preset.type === 'precinct' ? 'precinct' : 'intersection';
      }
    }

    const newAssign = addAssignment({
      volunteer_name: volName,
      target_type,
      title,
      street_address,
      sign_type: assignSignType,
      quantity: Number(assignQty) || 1,
      lat,
      lng,
      priority: assignPriority,
      notes: assignNotes.trim() || undefined,
    });

    setAssignments(prev => [newAssign, ...prev]);
    setAssignNotes('');
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 2500);
  };

  const handleToggleComplete = (id: string) => {
    const updated = assignments.map(a => {
      if (a.id === id) {
        const isCompleted = a.status === 'completed';
        return {
          ...a,
          status: (isCompleted ? 'assigned' : 'completed') as any,
          completed_at: isCompleted ? undefined : new Date().toISOString(),
        };
      }
      return a;
    });
    setAssignments(updated);
    saveStoredAssignments(updated);
  };

  const handleDeleteAssignment = (id: string) => {
    const updated = assignments.filter(a => a.id !== id);
    setAssignments(updated);
    saveStoredAssignments(updated);
  };

  const activeAssignmentsCount = assignments.filter(a => a.status !== 'completed').length;
  const filteredAssignments = assignments.filter(a => {
    if (missionFilter === 'active') return a.status !== 'completed';
    if (missionFilter === 'completed') return a.status === 'completed';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Center Pop Card */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col glass-heavy rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up">
        {/* Top Accent Gradient Edge */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Campaign Field Hub</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {volunteers.length} Crew • {activeAssignmentsCount} Active Missions
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage volunteer PIN access and dispatch sign placement missions to specific intersections & precincts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-5 sm:px-6 bg-white/[0.02] shrink-0">
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'roster'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Crew Roster & PINs</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {volunteers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'dispatch'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Sign Missions & Dispatch</span>
            {activeAssignmentsCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold animate-pulse">
                {activeAssignmentsCount} Active
              </span>
            )}
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* ========================================================
              TAB 1: CREW ROSTER & PINS
              ======================================================== */}
          {activeTab === 'roster' && (
            <>
              {/* Master Campaign PIN Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Key className="w-5 h-5" />
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
                          onChange={(e) => setTempMasterPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-28 px-2.5 py-1 text-sm font-mono font-bold bg-white/10 rounded-lg border border-emerald-500 text-white focus:outline-none"
                          autoFocus
                          maxLength={6}
                        />
                        <button
                          onClick={handleSaveMasterPin}
                          className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
                          title="Save PIN"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTempMasterPin(masterPin);
                            setIsEditingMasterPin(false);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl font-black font-mono tracking-widest text-emerald-400">
                          {masterPin}
                        </span>
                        <button
                          onClick={() => setIsEditingMasterPin(true)}
                          className="p-1 text-slate-400 hover:text-white transition"
                          title="Edit Master PIN"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleCopyLink()}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition active:scale-95 ${
                      copiedMaster
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                    }`}
                  >
                    {copiedMaster ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Master Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 opacity-60" />
                        <span>Copy Field App Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Add New Volunteer Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-purple-400" />
                    Add Field Volunteer or Captain
                  </span>
                  <span className="text-[10px] text-slate-400">Custom PIN is optional</span>
                </div>

                {formError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold">
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
                        Dedicated PIN (4-6 digits)
                      </label>
                      <input
                        type="text"
                        value={customPin}
                        onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={`Leave blank to use ${masterPin}`}
                        maxLength={6}
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

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95 transition"
                    >
                      Add to Roster
                    </button>
                  </div>
                </form>
              </div>

              {/* Volunteers Roster List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Active Volunteer Crew ({volunteers.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Direct links pre-authenticate volunteers into <code>/field</code>
                  </span>
                </div>

                <div className="space-y-2">
                  {volunteers.map((vol) => {
                    const badge = ROLE_BADGES[vol.role] || ROLE_BADGES['Field Volunteer'];
                    const placedCount = signsCountByVolunteer[vol.name] || 0;
                    const isCopied = copiedId === vol.id;

                    return (
                      <div
                        key={vol.id}
                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center font-black text-sm text-white shrink-0 border border-white/10">
                            {vol.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{vol.name}</span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {vol.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
                              <span className="font-mono text-emerald-400 font-semibold">
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
                                  <span className="text-amber-400 font-semibold">{placedCount} signs dropped</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => {
                              setAssignedVolunteer(vol.name);
                              setActiveTab('dispatch');
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                            title="Assign a sign placement mission"
                          >
                            <Target className="w-3.5 h-3.5" />
                            <span>Assign Mission</span>
                          </button>

                          <button
                            onClick={() => handleCopyLink(vol)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                              isCopied
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                            }`}
                            title="Copy direct volunteer sign-in link"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Link Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy Link</span>
                              </>
                            )}
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
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ========================================================
              TAB 2: SIGN MISSIONS & DISPATCH (Assign Areas & Intersections)
              ======================================================== */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              {/* Dispatch Form Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    Dispatch New Sign Mission
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Syncs directly to volunteer mobile app
                  </span>
                </div>

                {dispatchSuccess && (
                  <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-slide-up">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Mission dispatched! The volunteer will see this at the top of their field dashboard.
                  </div>
                )}

                <form onSubmit={handleDispatch} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Volunteer Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Assign To Volunteer *
                      </label>
                      <select
                        value={assignedVolunteer || (volunteers[0]?.name || '')}
                        onChange={(e) => setAssignedVolunteer(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        {volunteers.map(v => (
                          <option key={v.id} value={v.name}>
                            {v.name} ({v.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Urgency / Priority
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'critical', label: 'Critical', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
                          { id: 'high', label: 'High', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                          { id: 'medium', label: 'Normal', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setAssignPriority(p.id as any)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
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

                  {/* Target Location Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Target Area or Intersection *
                      </label>
                      <span className="text-[10px] text-slate-400">Intersections, Precincts, or Custom Address</span>
                    </div>

                    <select
                      value={selectedTargetId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTargetId(val);
                        const found = TARGET_PRESETS.find(p => p.id === val);
                        if (found) {
                          setAssignSignType(found.recommendedSign);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <optgroup label="🚦 High-Traffic Corridors & Intersections">
                        {TARGET_PRESETS.filter(p => p.type === 'intersection').map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} — {p.subtitle}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🗳️ Bristol Voting Precincts">
                        {TARGET_PRESETS.filter(p => p.type === 'precinct').map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} — {p.subtitle}
                          </option>
                        ))}
                      </optgroup>
                      <option value="custom">📍 Custom Street Address / Specific Cross Street</option>
                    </select>

                    {/* Custom Address Input if 'custom' is selected */}
                    {selectedTargetId === 'custom' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 animate-slide-up">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="Location Name (e.g. 1430 Lee Hwy near Kroger)"
                            spellCheck={true}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                          <DictateButton onTranscript={(txt) => setCustomTitle(txt)} size="sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                          <div>Lat: {customLat.toFixed(4)}</div>
                          <div>Lng: {customLng.toFixed(4)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sign Type & Quantity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Sign Type Requested
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'yard_sign', emoji: '🏡', label: 'Yard Sign' },
                          { id: 'large_sign', emoji: '🪧', label: 'Large 4×4' },
                          { id: 'banner', emoji: '🚩', label: 'Banner' },
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAssignSignType(t.id as any)}
                            className={`p-2 rounded-xl text-center border transition ${
                              assignSignType === t.id
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                : 'border-white/10 text-slate-400 hover:text-white bg-white/5'
                            }`}
                          >
                            <span className="text-sm block">{t.emoji}</span>
                            <span className="text-[9px] block mt-0.5 leading-none">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Sign Quantity
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 5, 10].map(qty => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setAssignQty(qty)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                              assignQty === qty
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'border-white/10 text-slate-400 hover:text-white bg-white/5'
                            }`}
                          >
                            {qty}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Special Placement Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Special Instructions / Placement Notes (Optional)
                      </label>
                      <DictateButton onTranscript={(txt) => setAssignNotes(prev => prev ? `${prev} ${txt}` : txt)} size="sm" />
                    </div>
                    <textarea
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      placeholder="e.g. Place 15ft off curb near gas station entrance. Homeowner at corner approved sign."
                      spellCheck={true}
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95 transition"
                    >
                      <Send className="w-3.5 h-3.5" /> Dispatch Mission to Volunteer
                    </button>
                  </div>
                </form>
              </div>

              {/* Active & Completed Missions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Dispatched Sign Missions ({assignments.length})
                  </span>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[10px]">
                    <button
                      onClick={() => setMissionFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${missionFilter === 'all' ? 'bg-white/15 text-white' : 'text-slate-400'}`}
                    >
                      All ({assignments.length})
                    </button>
                    <button
                      onClick={() => setMissionFilter('active')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${missionFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`}
                    >
                      Active ({activeAssignmentsCount})
                    </button>
                    <button
                      onClick={() => setMissionFilter('completed')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${missionFilter === 'completed' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400'}`}
                    >
                      Completed ({assignments.length - activeAssignmentsCount})
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {filteredAssignments.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 rounded-2xl bg-white/[0.02] border border-white/5">
                      No missions matching this filter. Dispatch a mission above to give your field crew targeted drop zones.
                    </div>
                  ) : (
                    filteredAssignments.map((a) => {
                      const isDone = a.status === 'completed';
                      return (
                        <div
                          key={a.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isDone
                              ? 'bg-white/[0.01] border-white/5 opacity-60'
                              : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  a.priority === 'critical'
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                    : a.priority === 'high'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                }`}>
                                  {a.priority}
                                </span>

                                <span className="text-xs font-bold text-white truncate">
                                  {a.title}
                                </span>

                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 border border-white/10">
                                  {a.quantity}× {a.sign_type.replace('_', ' ')}
                                </span>

                                {isDone && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Completed
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                                <span className="text-purple-300 font-semibold flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {a.volunteer_name}
                                </span>
                                <span>•</span>
                                <span className="text-slate-500">
                                  {a.target_type === 'precinct' ? '🗳️ Precinct Area' : '🚦 Intersection'}
                                </span>
                                <span>•</span>
                                <span className="font-mono text-[10px]">
                                  {Number(a.lat).toFixed(4)}, {Number(a.lng).toFixed(4)}
                                </span>
                              </div>

                              {a.notes && (
                                <p className="text-xs text-slate-300 mt-1.5 pl-2.5 border-l-2 border-emerald-500/40 italic">
                                  "{a.notes}"
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={`https://maps.apple.com/?daddr=${a.lat},${a.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                title="Open GPS Location in Maps"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                              </a>

                              <button
                                onClick={() => handleToggleComplete(a.id)}
                                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition active:scale-95 ${
                                  isDone
                                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                                }`}
                                title={isDone ? 'Mark as Active' : 'Mark as Completed'}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isDone ? 'Done' : 'Complete'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteAssignment(a.id)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete mission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {activeTab === 'dispatch'
              ? 'Missions update the volunteer mobile app immediately.'
              : 'PIN changes authorize field sessions in real time.'}
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
