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
} from 'lucide-react';

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
}: VolunteerManagerModalProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [masterPin, setMasterPin] = useState(DEFAULT_MASTER_PIN);
  const [isEditingMasterPin, setIsEditingMasterPin] = useState(false);
  const [tempMasterPin, setTempMasterPin] = useState(DEFAULT_MASTER_PIN);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<Volunteer['role']>('Field Volunteer');
  const [customPin, setCustomPin] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedMaster, setCopiedMaster] = useState(false);

  // Load from localStorage
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
    } catch (e) {
      setVolunteers(DEFAULT_VOLUNTEERS);
    }
  }, []);

  // Save changes to localStorage
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
                <h2 className="text-lg font-black tracking-tight text-white">Volunteer & PIN Directory</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {volunteers.length} Crew Members
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage field crew credentials, assign PINs, and share direct one-tap sign deployment links.
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

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
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
                      maxLength={6}
                      value={tempMasterPin}
                      onChange={(e) => setTempMasterPin(e.target.value)}
                      className="w-28 px-2.5 py-1 bg-black/40 border border-emerald-500/40 rounded-lg font-mono text-sm text-emerald-400 font-bold focus:outline-none"
                    />
                    <button
                      onClick={handleSaveMasterPin}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1 transition"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      onClick={() => {
                        setTempMasterPin(masterPin);
                        setIsEditingMasterPin(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-lg font-black tracking-widest text-emerald-400">
                      {masterPin}
                    </span>
                    <button
                      onClick={() => setIsEditingMasterPin(true)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition"
                      title="Edit Master PIN"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => handleCopyLink()}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center justify-center gap-2 text-slate-200 transition active:scale-95"
            >
              {copiedMaster ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied Universal Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Universal Field Link</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Add Volunteer Form */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Register New Field Volunteer
              </span>
            </div>

            <form onSubmit={handleAddVolunteer} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rachel Miller"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Role & Permissions
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Volunteer['role'])}
                    className="w-full h-9 px-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="Field Volunteer">🏡 Field Volunteer (Deploy signs)</option>
                    <option value="Field Scout">🔎 Field Scout (Opponent sightings)</option>
                    <option value="Precinct Captain">🗺️ Precinct Captain (Zone Lead)</option>
                    <option value="Field Director">⭐ Field Director (HQ Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Custom PIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder={`Default: ${masterPin}`}
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. (423) 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-rose-400 font-medium">{formError}</p>}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/25 transition active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add to Roster</span>
                </button>
              </div>
            </form>
          </div>

          {/* Volunteer Roster */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Active Field Crew ({volunteers.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Click link button to text pre-filled login URL
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
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      vol.active
                        ? 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        : 'bg-white/[0.01] border-white/5 opacity-50'
                    }`}
                  >
                    {/* Volunteer Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center font-black text-sm text-purple-300 shrink-0">
                        {vol.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white truncate">
                            {vol.name}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            PIN changes authorize field sessions in real time.
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
