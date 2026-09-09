'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sign, SignType, SignStatus } from '@/lib/types';
import {
  Map,
  Filter,
  Download,
  Layers,
  Compass,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Search,
  Calendar,
  User,
  ShieldAlert,
} from 'lucide-react';

// Sample Bristol AADT Corridors (High traffic corridors where signs get max eyeballs)
const BRISTOL_TRAFFIC_CORRIDORS = [
  { name: 'Route 6 (Farmington Ave)', aadt: 24500, status: 'high_priority', coverage: '85%' },
  { name: 'Route 72 (Pine St / School St)', aadt: 19800, status: 'high_priority', coverage: '60%' },
  { name: 'Route 229 (Middle St - ESPN Corridor)', aadt: 28900, status: 'critical', coverage: '90%' },
  { name: 'King Street (CT-229 connector)', aadt: 14200, status: 'moderate', coverage: '45%' },
  { name: 'Stafford Ave', aadt: 11600, status: 'moderate', coverage: '50%' },
];

export default function DashboardPage() {
  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'campaign' | 'competitor'>('all');
  const [searchVolunteer, setSearchVolunteer] = useState<string>('');

  // Overlays
  const [showWardBoundary, setShowWardBoundary] = useState(true);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  useEffect(() => {
    fetchSigns();
  }, []);

  const fetchSigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('signs')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setSigns(data);
      } else {
        // Fallback seed signs for Bristol City Council pilot display
        setSigns([
          {
            id: '1',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6730,
            longitude: -72.9460,
            placed_by_name: 'Allen Hurley',
            sign_type: 'large_sign',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: '2',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6785,
            longitude: -72.9372,
            placed_by_name: 'Allen Hurley',
            sign_type: 'banner',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
          {
            id: '3',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6695,
            longitude: -72.9510,
            placed_by_name: 'Sarah Volunteer',
            sign_type: 'yard_sign',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          },
          {
            id: '4',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6742,
            longitude: -72.9415,
            placed_by_name: 'Sarah Volunteer',
            sign_type: 'yard_sign',
            is_competitor: true,
            competitor_name: 'Bob Reynolds',
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
          },
          {
            id: '5',
            campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            latitude: 41.6850,
            longitude: -72.9250,
            placed_by_name: 'Dave K.',
            sign_type: 'billboard',
            is_competitor: false,
            status: 'placed',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Sign List
  const filteredSigns = useMemo(() => {
    return signs.filter((sign) => {
      if (typeFilter !== 'all' && sign.sign_type !== typeFilter) return false;
      if (statusFilter !== 'all' && sign.status !== statusFilter) return false;
      if (ownershipFilter === 'campaign' && sign.is_competitor) return false;
      if (ownershipFilter === 'competitor' && !sign.is_competitor) return false;
      if (
        searchVolunteer &&
        !sign.placed_by_name.toLowerCase().includes(searchVolunteer.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [signs, typeFilter, statusFilter, ownershipFilter, searchVolunteer]);

  // Statistics
  const stats = useMemo(() => {
    const totalOurSigns = signs.filter((s) => !s.is_competitor && s.status === 'placed').length;
    const totalCompetitor = signs.filter((s) => s.is_competitor).length;
    const totalRetrieved = signs.filter((s) => s.status === 'retrieved').length;
    const largeAndBanners = signs.filter(
      (s) => !s.is_competitor && (s.sign_type === 'large_sign' || s.sign_type === 'banner' || s.sign_type === 'billboard')
    ).length;

    return { totalOurSigns, totalCompetitor, totalRetrieved, largeAndBanners };
  }, [signs]);

  // One-Click CSV Export
  const exportToCSV = () => {
    const headers = [
      'Sign ID',
      'Campaign ID',
      'Sign Type',
      'Is Competitor',
      'Competitor Name',
      'Latitude',
      'Longitude',
      'Placed By',
      'Status',
      'Created At',
      'Retrieved At',
    ];

    const rows = filteredSigns.map((s) => [
      s.id,
      s.campaign_id,
      s.sign_type,
      s.is_competitor ? 'TRUE' : 'FALSE',
      s.competitor_name || '',
      s.latitude,
      s.longitude,
      `"${s.placed_by_name.replace(/"/g, '""')}"`,
      s.status,
      s.created_at,
      s.retrieved_at || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wardrunner_signs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // One-Click GeoJSON Export
  const exportToGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: filteredSigns.map((s) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(s.longitude), Number(s.latitude)],
        },
        properties: {
          id: s.id,
          sign_type: s.sign_type,
          is_competitor: s.is_competitor,
          competitor_name: s.competitor_name,
          placed_by_name: s.placed_by_name,
          status: s.status,
          created_at: s.created_at,
        },
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `wardrunner_signs_${new Date().toISOString().slice(0, 10)}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-lg">
            WR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-tight">WardRunner Command</h1>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Bristol City Council Pilot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operations Director: <span className="text-white font-medium">Allen Hurley</span> • Candidate: <span className="text-emerald-400 font-semibold">Melissa K. Brown</span>
            </p>
          </div>
        </div>

        {/* Quick Action & Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSigns}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={exportToGeoJSON}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export GeoJSON
          </button>
        </div>
      </header>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-900/40 border-b border-slate-800/80">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Melissa Brown Signs</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">{stats.totalOurSigns}</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Active on Bristol turf</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Competitor Intel</span>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.totalCompetitor}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged opposition markers</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">High-Impact Arterials</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-1">{stats.largeAndBanners}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Banners & 4x4 placements</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Retrieved / Cleaned</span>
            <CheckCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.totalRetrieved}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Post-election sweep status</p>
        </div>
      </div>

      {/* Main Command Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Interactive Map & Geospatial Layer Canvas */}
        <div className="flex-1 relative bg-slate-950 flex flex-col">
          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2 rounded-2xl shadow-xl flex items-center gap-2">
            <button
              onClick={() => setShowWardBoundary(!showWardBoundary)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                showWardBoundary
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Ward Boundary
            </button>
            <button
              onClick={() => setShowTrafficOverlay(!showTrafficOverlay)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                showTrafficOverlay
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              AADT Traffic Heat
            </button>
          </div>

          {/* Interactive Map Visualizer */}
          <div className="flex-1 w-full h-full min-h-[460px] bg-slate-900 relative flex items-center justify-center overflow-hidden">
            {/* Grid styling to emulate map canvas */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Bristol AADT Traffic Corridor Overlays */}
            {showTrafficOverlay && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                {/* Route 229 ESPN corridor */}
                <line x1="15%" y1="90%" x2="85%" y2="25%" stroke="#f59e0b" strokeWidth="6" strokeDasharray="6 4" />
                {/* Route 6 */}
                <line x1="10%" y1="40%" x2="90%" y2="45%" stroke="#f59e0b" strokeWidth="5" />
                {/* Route 72 */}
                <line x1="45%" y1="10%" x2="55%" y2="95%" stroke="#fbbf24" strokeWidth="4" />
              </svg>
            )}

            {/* Ward MultiPolygon Boundary Outline */}
            {showWardBoundary && (
              <div className="absolute inset-12 border-2 border-dashed border-blue-500/40 rounded-3xl pointer-events-none flex items-start justify-end p-4">
                <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-1 rounded border border-blue-500/30">
                  Bristol City Council District Boundary (WGS84)
                </span>
              </div>
            )}

            {/* Clustered Pins Visualization */}
            <div className="relative w-4/5 h-4/5 flex items-center justify-center">
              {filteredSigns.map((sign, idx) => {
                const isSelected = selectedSign?.id === sign.id;
                // Calculate position relative to Bristol coordinates
                const xOffset = ((sign.longitude + 72.946) * 4000 + 50) % 85 + 5;
                const yOffset = ((41.678 - sign.latitude) * 4000 + 50) % 85 + 5;

                return (
                  <div
                    key={sign.id}
                    onClick={() => setSelectedSign(sign)}
                    style={{ left: `${xOffset}%`, top: `${yOffset}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                        isSelected ? 'scale-125 ring-4 ring-white' : 'hover:scale-110'
                      } ${
                        sign.is_competitor
                          ? 'bg-rose-600 text-white shadow-rose-600/50'
                          : sign.sign_type === 'large_sign' || sign.sign_type === 'banner'
                          ? 'bg-blue-500 text-white shadow-blue-500/50'
                          : 'bg-emerald-500 text-slate-950 shadow-emerald-500/50'
                      }`}
                    >
                      <span className="text-xs font-black">
                        {sign.is_competitor ? 'VS' : sign.sign_type === 'large_sign' ? '4x4' : 'MB'}
                      </span>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-xl bg-slate-950/95 border border-slate-700 text-xs shadow-2xl z-20 pointer-events-none">
                      <p className="font-bold text-white">
                        {sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        Type: {sign.sign_type.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-emerald-400">By {sign.placed_by_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl text-xs space-y-2 shadow-xl">
              <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Map Legend</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Melissa Brown (Yard Sign)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-300">Melissa Brown (4x4 / Banner)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-300">Competitor Placement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Filters, Inventory Feed & Traffic Corridor Analytics */}
        <div className="w-full lg:w-96 border-l border-slate-800 bg-slate-950 flex flex-col h-full overflow-y-auto">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-emerald-400" />
                Filter Placements
              </h3>
              <span className="text-xs text-slate-400">{filteredSigns.length} visible</span>
            </div>

            {/* Ownership Filter */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setOwnershipFilter('all')}
                className={`py-1.5 rounded-lg font-bold transition ${
                  ownershipFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setOwnershipFilter('campaign')}
                className={`py-1.5 rounded-lg font-bold transition ${
                  ownershipFilter === 'campaign' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                }`}
              >
                Brown
              </button>
              <button
                onClick={() => setOwnershipFilter('competitor')}
                className={`py-1.5 rounded-lg font-bold transition ${
                  ownershipFilter === 'competitor' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'
                }`}
              >
                Competitors
              </button>
            </div>

            {/* Sign Type Dropdown */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Sign Types</option>
                <option value="yard_sign">Yard Signs</option>
                <option value="large_sign">Large 4x4s</option>
                <option value="banner">Banners</option>
                <option value="billboard">Billboards</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="placed">Active Placed</option>
                <option value="retrieved">Retrieved</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>

            {/* Search Volunteer */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by volunteer name..."
                value={searchVolunteer}
                onChange={(e) => setSearchVolunteer(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* High Visibility Traffic Corridors (AADT) */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2.5 flex items-center justify-between">
              <span>Bristol AADT Corridors</span>
              <span className="text-[10px] text-slate-500 font-normal">Vehicles / Day</span>
            </h4>
            <div className="space-y-2">
              {BRISTOL_TRAFFIC_CORRIDORS.map((corr) => (
                <div
                  key={corr.name}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white text-[12px]">{corr.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Coverage: <span className="text-emerald-400 font-semibold">{corr.coverage}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-amber-400">{corr.aadt.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign Inventory List */}
          <div className="p-4 flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Inventory Feed ({filteredSigns.length})
            </h4>

            <div className="space-y-2">
              {filteredSigns.map((sign) => (
                <div
                  key={sign.id}
                  onClick={() => setSelectedSign(sign)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedSign?.id === sign.id
                      ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">
                      {sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        sign.is_competitor
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {sign.sign_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    By {sign.placed_by_name} • {new Date(sign.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    {Number(sign.latitude).toFixed(4)}, {Number(sign.longitude).toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
