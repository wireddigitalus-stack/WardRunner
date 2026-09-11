'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getTrafficData, stationsToGeoJSON, intersectionsToGeoJSON, TrafficStation, Intersection } from '@/lib/trafficData';
import realCorridors from '@/lib/realCorridors.json';
import SmartScout from './components/SmartScout';
import VolunteerManagerModal from './components/VolunteerManagerModal';
import VolunteerFilterPanel from './components/VolunteerFilterPanel';
import MapSearchBar from './components/MapSearchBar';
import PrecinctLeaderboard from './components/PrecinctLeaderboard';
import PrecinctDetailCard from './components/PrecinctDetailCard';
import MissionDetailCard from './components/MissionDetailCard';
import MissionsDrawerTab from './components/MissionsDrawerTab';
import CommandPinGate from './components/CommandPinGate';
import RouteDetailCard from './components/RouteDetailCard';
import { PrecinctInfo, BRISTOL_PRECINCTS, BRISTOL_PRECINCTS_GEOJSON } from '@/lib/precinctData';
import { getStoredAssignments, saveStoredAssignments } from '@/lib/assignmentData';
import { getStoredSigns, addPlacedSign, SEED_SIGNS } from '@/lib/signData';
import { getStoredCanvassRecords, getStoredVolunteerPings, snapWalkingPathToStreets } from '@/lib/canvassData';
import { getStoredCanvassRoutes, saveStoredCanvassRoutes, assignCanvassRoute, updateCanvassRouteStatus } from '@/lib/canvassRouteData';
import { Sign, SignType, Recommendation, InventoryStock, VolunteerAssignment, CanvassRecord, VolunteerLocationPing, CanvassRoute } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import DictateButton from '@/app/components/DictateButton';
import {
  Vote,
  Users,
  Target,
  Download,
  Layers,
  TrendingUp,
  RefreshCw,
  Search,
  Sun,
  Moon,
  Navigation,
  X,
  SlidersHorizontal,
  MapPin,
  Footprints,
  UserCheck,
  Activity,
  Shield,
  Clock,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  RotateCcw,
  Flame,
  Check,
  Package,
  Plus,
  Minus,
  CircleDot,
  Lock,
  Compass,
} from 'lucide-react';

/* ================================================================
   CONSTANTS
   ================================================================ */
const BRISTOL_CENTER: [number, number] = [-82.1887, 36.5951];

const DEFAULT_INVENTORY_STOCK: InventoryStock = {
  yard_sign: 250,
  large_sign: 25,
  banner: 10,
  billboard: 4,
};

const SIGN_TYPE_META: Record<string, { emoji: string; label: string; short: string }> = {
  yard_sign:  { emoji: '🏡', label: 'Yard Sign',    short: 'Yard' },
  large_sign: { emoji: '🪧', label: 'Large 4×4',    short: '4×4' },
  banner:     { emoji: '🚩', label: 'Banner',       short: 'Ban' },
  billboard:  { emoji: '🏢', label: 'Billboard',    short: 'Bill' },
};

const AADT_CORRIDORS = [
  { name: 'State St (US-11E/19)',          aadt: 21400, pct: 100, color: '#f59e0b' },
  { name: 'Volunteer Pkwy (US-11W)',       aadt: 18200, pct: 85,  color: '#fbbf24' },
  { name: 'Lee Hwy (US-11/19)',            aadt: 15600, pct: 73,  color: '#38bdf8' },
  { name: 'Bluff City Hwy',               aadt: 11300, pct: 53,  color: '#10b981' },
];

const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

/* ================================================================
   COMPONENT
   ================================================================ */
export default function DashboardPage() {
  const theme = 'dark' as const;

  // Security Gate Authentication (Master PIN: 620620)
  const [isCommandAuthorized, setIsCommandAuthorized] = useState<boolean>(true);
  const [checkedAuth, setCheckedAuth] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth =
        sessionStorage.getItem('wardrunner_field_command_auth') === 'true' ||
        localStorage.getItem('wardrunner_field_command_auth') === 'true';
      setIsCommandAuthorized(isAuth);
      setCheckedAuth(true);
    }
  }, []);

  const handleLockCommand = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('wardrunner_field_command_auth');
      localStorage.removeItem('wardrunner_field_command_auth');
    }
    setIsCommandAuthorized(false);
  }, []);

  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [is3D, setIs3D] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showCorridors, setShowCorridors] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Traffic data from TDOT + OSM
  const [trafficStations, setTrafficStations] = useState<TrafficStation[]>([]);
  const [trafficIntersections, setTrafficIntersections] = useState<Intersection[]>([]);
  const scoutMarkersRef = useRef<{ marker: any; rank: number }[]>([]);

  // AI Scout Recommendations & Approval
  const [scoutRecs, setScoutRecs] = useState<Recommendation[]>([]);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [selectedRecSignType, setSelectedRecSignType] = useState<SignType>('yard_sign');
  const [recAddress, setRecAddress] = useState<string>('');
  const [loadingRecAddress, setLoadingRecAddress] = useState(false);
  const [approvingRec, setApprovingRec] = useState(false);

  // Sign Inventory Management
  const [inventoryStock, setInventoryStock] = useState<InventoryStock>(DEFAULT_INVENTORY_STOCK);
  const [editingStock, setEditingStock] = useState(false);

  // Volunteer & PIN Directory Modal & Dispatch Missions
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'roster' | 'dispatch'>('roster');
  const [modalInitialTarget, setModalInitialTarget] = useState<{
    title: string;
    street_address?: string;
    lat: number;
    lng: number;
    signType?: SignType;
    quantity?: number;
    targetType?: 'intersection' | 'precinct' | 'scout_rec' | 'custom';
  } | null>(null);

  // Dispatched Sign Missions State
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]);
  const [selectedMission, setSelectedMission] = useState<VolunteerAssignment | null>(null);
  const [showMissionsLayer, setShowMissionsLayer] = useState(false);
  const missionMarkersRef = useRef<any[]>([]);

  // Voting Precincts & Turnout State
  const [showPrecincts, setShowPrecincts] = useState(true);
  const [selectedPrecinct, setSelectedPrecinct] = useState<PrecinctInfo | null>(null);
  const precinctMarkersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Signs Layer Toggle (Defaults to off per user preference)
  const [showSignsLayer, setShowSignsLayer] = useState(false);

  // Street-Level Precision Micro Dot Mode
  const [useDotMode, setUseDotMode] = useState(false);

  // Ground Campaign & Field Force State
  const [canvassRecords, setCanvassRecords] = useState<CanvassRecord[]>([]);
  const [volunteerPings, setVolunteerPings] = useState<VolunteerLocationPing[]>([]);
  const [showCanvassLayer, setShowCanvassLayer] = useState(false);
  const [showFieldForceLayer, setShowFieldForceLayer] = useState(false);
  const [isVolunteerFilterOpen, setIsVolunteerFilterOpen] = useState(false);
  const [selectedVolunteerGroup, setSelectedVolunteerGroup] = useState<string>('all');
  const [selectedVolunteerFilter, setSelectedVolunteerFilter] = useState<string | null>(null);
  const [selectedCanvassRecord, setSelectedCanvassRecord] = useState<CanvassRecord | null>(null);
  const canvassMarkersRef = useRef<any[]>([]);
  const volunteerMarkersRef = useRef<any[]>([]);

  // Canvass Routes State
  const [routes, setRoutes] = useState<CanvassRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<CanvassRoute | null>(null);
  const [showRoutesLayer, setShowRoutesLayer] = useState(false);
  const routeMarkersRef = useRef<any[]>([]);

  // Drawer Active Tab ('signs' | 'inventory' | 'precincts' | 'missions')
  const [drawerTab, setDrawerTab] = useState<'signs' | 'inventory' | 'precincts' | 'missions'>('signs');

  // Load saved inventory stock and dispatched assignments from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wardrunner_inventory_stock');
      if (saved) setInventoryStock(JSON.parse(saved));
    } catch {}

    const loadAssigns = () => {
      setAssignments(getStoredAssignments());
    };
    loadAssigns();
    window.addEventListener('wardrunner_assignments_updated', loadAssigns);

    // Ground Campaign Data Loaders
    const loadGroundData = () => {
      setCanvassRecords(getStoredCanvassRecords());
      setVolunteerPings(getStoredVolunteerPings());
    };
    loadGroundData();
    window.addEventListener('wardrunner_canvass_updated', loadGroundData);
    window.addEventListener('wardrunner_pings_updated', loadGroundData);

    // Canvass Routes Data Loader
    const loadRoutes = () => {
      setRoutes(getStoredCanvassRoutes());
    };
    loadRoutes();
    window.addEventListener('wardrunner_routes_updated', loadRoutes);

    // Poll ground data every 8s for live field updates
    const groundInterval = setInterval(loadGroundData, 8000);

    return () => {
      window.removeEventListener('wardrunner_assignments_updated', loadAssigns);
      window.removeEventListener('wardrunner_canvass_updated', loadGroundData);
      window.removeEventListener('wardrunner_pings_updated', loadGroundData);
      window.removeEventListener('wardrunner_routes_updated', loadRoutes);
      clearInterval(groundInterval);
    };
  }, []);

  const updateStockQuantity = (type: keyof InventoryStock, delta: number) => {
    setInventoryStock(prev => {
      const next = { ...prev, [type]: Math.max(0, prev[type] + delta) };
      try { localStorage.setItem('wardrunner_inventory_stock', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'ours' | 'theirs'>('all');
  const [searchQ, setSearchQ] = useState('');

  // Reverse geocoding for street names
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const geocodeCacheRef = useRef<Record<string, string>>({});

  const reverseGeocode = useCallback(async (lat: number, lng: number, fallback?: string | null): Promise<string> => {
    if (fallback && fallback.trim()) return fallback;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (geocodeCacheRef.current[key]) return geocodeCacheRef.current[key];
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      const addr = data.address;
      const street = addr?.road || addr?.pedestrian || addr?.footway || '';
      const num = addr?.house_number || '';
      const result = num && street ? `${num} ${street}` : street || data.display_name?.split(',').slice(0, 2).join(',') || fallback || 'Bristol, TN';
      geocodeCacheRef.current[key] = result;
      return result;
    } catch {
      return fallback || 'Bristol, TN';
    }
  }, []);

  /* ---------- Data Fetching ---------- */
  useEffect(() => {
    fetchSigns();
    // Fetch TDOT + OSM traffic data
    getTrafficData().then(td => {
      setTrafficStations(td.stations);
      setTrafficIntersections(td.intersections);
    }).catch(console.warn);

    // Real-time synchronization across local events & browser tabs
    const handleSignsSync = () => {
      setSigns(getStoredSigns());
    };
    window.addEventListener('wardrunner_signs_updated', handleSignsSync);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'wardrunner_signs_data' || e.key === 'wardrunner_signs_ping') {
        handleSignsSync();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('wardrunner_signs_updated', handleSignsSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const fetchSigns = async () => {
    setLoading(true);
    // Initialize immediately from persistent stored signs
    const localSigns = getStoredSigns();
    setSigns(localSigns);

    try {
      const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-publishable-key');
      if (!isPlaceholder) {
        const { data, error } = await supabase.from('signs').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0 && !error) {
          const localIds = new Set(data.map((d: any) => d.id));
          const onlyLocal = localSigns.filter(s => !localIds.has(s.id));
          const merged = [...onlyLocal, ...data];
          setSigns(merged);
        }
      }
    } catch (err) {
      console.warn('Remote fetch signs fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search Target Pin Marker
  const searchMarkerRef = useRef<any>(null);

  const handleSearchSelectLocation = useCallback((lat: number, lng: number, title?: string) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 16.5,
      pitch: is3D ? 55 : 0,
      duration: 900,
    });

    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }

    const mgl = (window as any).maplibregl;
    if (mgl) {
      const el = document.createElement('div');
      el.className = 'search-target-marker';
      el.style.zIndex = '300';
      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
          <div style="position:absolute;bottom:18px;background:rgba(16,185,129,0.95);color:white;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 4px 16px rgba(16,185,129,0.5);border:1.5px solid rgba(255,255,255,0.4);">
            📍 ${title || 'Target Location'}
          </div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
            <div class="animate-radar pointer-events-none" style="width:40px;height:40px;background:rgba(16,185,129,0.4);z-index:1;"></div>
            <div style="position:relative;width:14px;height:14px;background:#10b981;border:2.5px solid white;border-radius:50%;box-shadow:0 0 14px #10b981;z-index:2;"></div>
          </div>
        </div>
      `;
      const marker = new mgl.Marker({
        element: el,
        anchor: 'center',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      }).setLngLat([lng, lat]).addTo(mapRef.current);
      searchMarkerRef.current = marker;

      setTimeout(() => {
        if (searchMarkerRef.current === marker) {
          marker.remove();
          searchMarkerRef.current = null;
        }
      }, 25000);
    }
  }, [is3D]);

  /* ---------- Derived ---------- */
  const filtered = useMemo(() => signs.filter(s => {
    if (typeFilter !== 'all' && s.sign_type !== typeFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (ownerFilter === 'ours' && s.is_competitor) return false;
    if (ownerFilter === 'theirs' && !s.is_competitor) return false;
    if (selectedVolunteerFilter) {
      const volLower = selectedVolunteerFilter.toLowerCase().trim();
      const placedLower = (s.placed_by_name || '').toLowerCase().trim();
      if (!placedLower.includes(volLower) && !volLower.includes(placedLower)) return false;
    }
    if (searchQ && 
      !s.placed_by_name.toLowerCase().includes(searchQ.toLowerCase()) && 
      !(s.competitor_name || '').toLowerCase().includes(searchQ.toLowerCase()) &&
      !(s.street_address || '').toLowerCase().includes(searchQ.toLowerCase()) &&
      !s.sign_type.replace('_', ' ').toLowerCase().includes(searchQ.toLowerCase())
    ) return false;
    return true;
  }), [signs, typeFilter, statusFilter, ownerFilter, searchQ, selectedVolunteerFilter]);

  const stats = useMemo(() => ({
    ours:       signs.filter(s => !s.is_competitor && s.status === 'placed').length,
    theirs:     signs.filter(s => s.is_competitor).length,
    retrieved:  signs.filter(s => s.status === 'retrieved').length,
    highImpact: signs.filter(s => !s.is_competitor && ['large_sign', 'banner', 'billboard'].includes(s.sign_type)).length,
    total:      signs.length,
  }), [signs]);

  const activeMissionsCount = useMemo(() => {
    return assignments.filter(a => a.status !== 'completed').length;
  }, [assignments]);

  const availableVolunteersList = useMemo(() => {
    if (volunteerPings.length > 0) {
      return volunteerPings.map(p => ({
        id: p.volunteer_name,
        name: p.volunteer_name,
        role: String(p.role || 'Volunteer'),
      }));
    }
    return [
      { id: 'vol-1', name: 'Sarah Jenkins', role: 'Door Canvasser' },
      { id: 'vol-2', name: 'Marcus Taylor', role: 'Flyer Hanger' },
      { id: 'vol-3', name: 'David Vance', role: 'Field Director' },
      { id: 'vol-4', name: 'Campaign Volunteer', role: 'Field Volunteer' },
    ];
  }, [volunteerPings]);

  /* ---------- Inventory Supply Calculations ---------- */
  const inventoryStats = useMemo(() => {
    const activeOurs = signs.filter(s => !s.is_competitor && s.status === 'placed');
    const placedByType = {
      yard_sign: activeOurs.filter(s => s.sign_type === 'yard_sign').length,
      large_sign: activeOurs.filter(s => s.sign_type === 'large_sign').length,
      banner: activeOurs.filter(s => s.sign_type === 'banner').length,
      billboard: activeOurs.filter(s => s.sign_type === 'billboard').length,
    };
    const totalStock = Object.values(inventoryStock).reduce((a, b) => a + b, 0);
    const totalPlaced = Object.values(placedByType).reduce((a, b) => a + b, 0);
    const totalReserve = Math.max(0, totalStock - totalPlaced);
    const pctDeployed = totalStock > 0 ? Math.min(100, Math.round((totalPlaced / totalStock) * 100)) : 0;
    return { placedByType, totalStock, totalPlaced, totalReserve, pctDeployed };
  }, [signs, inventoryStock]);

  const signsCountByVolunteer = useMemo(() => {
    const counts: Record<string, number> = {};
    signs.forEach(s => {
      if (s.placed_by_name) {
        counts[s.placed_by_name] = (counts[s.placed_by_name] || 0) + 1;
      }
    });
    return counts;
  }, [signs]);

  const isDark = theme === 'dark';

  /* ---------- Reverse Geocode Selected Sign ---------- */
  useEffect(() => {
    if (!selectedSign) { setStreetAddress(''); return; }
    if (selectedSign.street_address) {
      setStreetAddress(selectedSign.street_address);
      setLoadingAddress(false);
      return;
    }
    let cancelled = false;
    setLoadingAddress(true);
    reverseGeocode(Number(selectedSign.latitude), Number(selectedSign.longitude), selectedSign.street_address).then(addr => {
      if (!cancelled) { setStreetAddress(addr); setLoadingAddress(false); }
    });
    return () => { cancelled = true; };
  }, [selectedSign, reverseGeocode]);

  /* ---------- Reverse Geocode Selected Recommendation ---------- */
  useEffect(() => {
    if (!selectedRec) { setRecAddress(''); return; }
    let cancelled = false;
    setLoadingRecAddress(true);
    reverseGeocode(selectedRec.lat, selectedRec.lng).then(addr => {
      if (!cancelled) { setRecAddress(addr); setLoadingRecAddress(false); }
    });
    return () => { cancelled = true; };
  }, [selectedRec, reverseGeocode]);

  /* ---------- Recommendation Actions ---------- */
  const handleApproveRec = async (rec: Recommendation, signType: SignType) => {
    setApprovingRec(true);
    const newSign: Sign = {
      id: crypto.randomUUID(),
      campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      latitude: rec.lat,
      longitude: rec.lng,
      placed_by_name: 'Scout AI (Approved)',
      sign_type: signType,
      is_competitor: false,
      competitor_name: null,
      photo_url: null,
      status: 'placed',
      created_at: new Date().toISOString(),
    };

    try {
      await addPlacedSign(newSign);
    } catch (err) {
      console.warn('Fallback adding placed sign:', err);
      setSigns(prev => [newSign, ...prev]);
    }

    // Remove this recommendation from scout recs
    setScoutRecs(prev => prev.filter(r => r.rank !== rec.rank));

    // Remove the gold preview marker from the map
    const markerItem = scoutMarkersRef.current.find(item => item.rank === rec.rank);
    if (markerItem) {
      markerItem.marker?.remove?.();
      scoutMarkersRef.current = scoutMarkersRef.current.filter(item => item.rank !== rec.rank);
    }

    setApprovingRec(false);
    setSelectedRec(null);
    setSelectedSign(newSign);
    mapRef.current?.flyTo({ center: [rec.lng, rec.lat], zoom: 16, pitch: is3D ? 55 : 0, duration: 600 });
  };

  const handleDeclineRec = (rec: Recommendation) => {
    setScoutRecs(prev => prev.filter(r => r.rank !== rec.rank));
    const markerItem = scoutMarkersRef.current.find(item => item.rank === rec.rank);
    if (markerItem) {
      markerItem.marker?.remove?.();
      scoutMarkersRef.current = scoutMarkersRef.current.filter(item => item.rank !== rec.rank);
    }
    setSelectedRec(null);
  };

  /* ---------- Map Initialization ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!mapContainerRef.current) return;
      const mgl = (await import('maplibre-gl')).default;
      if (mapRef.current) mapRef.current.remove();

      const map = new mgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[theme],
        center: BRISTOL_CENTER,
        zoom: 13.2,
        pitch: is3D ? 52 : 0,
        bearing: is3D ? -15 : 0,
        attributionControl: false,
      } as any);

      map.addControl(new mgl.AttributionControl({ compact: true }), 'bottom-left');

      map.on('load', () => {
        if (!alive) return;
        try { map.resize(); } catch {}

        /* --- AADT corridor glow lines (Real Road Geometry) --- */
        map.addSource('corridors', {
          type: 'geojson',
          data: realCorridors as any,
        });
        map.addLayer({ id: 'corridor-glow', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 12, 'line-opacity': isDark ? 0.22 : 0.14, 'line-blur': 6 } });
        map.addLayer({ id: 'corridor-core', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.95 } });
        map.addLayer({ id: 'corridor-inner', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.55 } });

        // Hover tooltip on corridor lines
        try {
          const corridorPopup = new mgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
          map.on('mouseenter', 'corridor-core', (e: any) => {
            map.getCanvas().style.cursor = 'pointer';
            const f = e.features?.[0];
            if (!f) return;
            const p = f.properties;
            corridorPopup.setLngLat(e.lngLat)
              .setHTML(`<div style="background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);border-radius:10px;padding:6px 10px;border:1px solid rgba(255,255,255,0.15);box-shadow:0 4px 14px rgba(0,0,0,0.4);">
                <div style="color:white;font-size:11px;font-weight:800;">${p.name}</div>
                <div style="color:#fbbf24;font-size:10px;font-weight:700;margin-top:2px;">${p.aadt || 'Primary Arterial'}</div>
              </div>`)
              .addTo(map);
          });
          map.on('mouseleave', 'corridor-core', () => { map.getCanvas().style.cursor = ''; corridorPopup.remove(); });
        } catch {}

        /* --- Ward boundary polygon --- */
        map.addSource('boundary', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-82.215, 36.615], [-82.165, 36.612], [-82.160, 36.578], [-82.185, 36.572], [-82.220, 36.585], [-82.215, 36.615]]] } } as any,
        });
        map.addLayer({ id: 'boundary-fill', type: 'fill', source: 'boundary', paint: { 'fill-color': isDark ? '#0ea5e9' : '#0284c7', 'fill-opacity': isDark ? 0.06 : 0.04 } });
        map.addLayer({ id: 'boundary-line', type: 'line', source: 'boundary', paint: { 'line-color': isDark ? '#38bdf8' : '#0284c7', 'line-width': 2.5, 'line-dasharray': [4, 3], 'line-opacity': 0.6 } });

        /* --- Bristol Voting Precincts & Turnout Grid --- */
        map.addSource('bristol-precincts', {
          type: 'geojson',
          data: BRISTOL_PRECINCTS_GEOJSON as any,
        });

        map.addLayer({
          id: 'precincts-fill',
          type: 'fill',
          source: 'bristol-precincts',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': isDark ? 0.14 : 0.10,
          },
        });

        map.addLayer({
          id: 'precincts-line',
          type: 'line',
          source: 'bristol-precincts',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-dasharray': [3, 2],
            'line-opacity': 0.85,
          },
        });

        /* --- Volunteer Walking Trails (Live GPS Breadcrumbs) --- */
        map.addSource('volunteer-trails', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'volunteer-trails-glow',
          type: 'line',
          source: 'volunteer-trails',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#10b981',
            'line-width': 8,
            'line-opacity': isDark ? 0.35 : 0.22,
            'line-blur': 4,
          },
        });

        map.addLayer({
          id: 'volunteer-trails-line',
          type: 'line',
          source: 'volunteer-trails',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#10b981',
            'line-width': 3,
            'line-opacity': 0.85,
            'line-dasharray': [3, 2],
          },
        });

        /* --- Canvass Turf Walking Routes --- */
        map.addSource('canvass-turf-routes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'canvass-turf-glow',
          type: 'line',
          source: 'canvass-turf-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#a855f7',
            'line-width': 9,
            'line-opacity': isDark ? 0.45 : 0.3,
            'line-blur': 4,
          },
        });

        map.addLayer({
          id: 'canvass-turf-line',
          type: 'line',
          source: 'canvass-turf-routes',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#c084fc',
            'line-width': 3.5,
            'line-opacity': 0.9,
            'line-dasharray': [4, 2],
          },
        });

        // Precinct hover cursor and click to inspect
        try {
          map.on('mouseenter', 'precincts-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'precincts-fill', () => {
            map.getCanvas().style.cursor = '';
          });
          map.on('click', 'precincts-fill', (e: any) => {
            const f = e.features?.[0];
            if (!f) return;
            const found = BRISTOL_PRECINCTS.find((pr) => pr.code === f.properties.code);
            if (found) {
              setSelectedSign(null);
              setSelectedRec(null);
              setSelectedPrecinct(found);
            }
          });
        } catch {}

        // Immediate creation of precinct letter watermarks (1A, 2A, 2B, 3A...) so they appear automatically
        precinctMarkersRef.current.forEach(item => item.marker?.remove?.());
        precinctMarkersRef.current = [];
        BRISTOL_PRECINCTS.forEach(p => {
          const el = document.createElement('div');
          el.className = 'precinct-ghost-watermark';
          el.style.zIndex = '5';
          el.style.cursor = 'pointer';
          el.innerHTML = `
            <div style="
              user-select: none;
              font-size: 28px;
              font-weight: 900;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              letter-spacing: -0.03em;
              line-height: 1;
              color: ${p.color};
              opacity: 0.88;
              text-shadow: 0 0 16px ${p.color}80, 0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.95);
              transition: transform 0.2s ease, opacity 0.2s ease;
            ">
              ${p.code}
            </div>
          `;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedSign(null);
            setSelectedRec(null);
            setSelectedPrecinct(p);
          });
          const marker = new mgl.Marker({
            element: el,
            anchor: 'center',
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport',
          }).setLngLat(p.center).addTo(map);
          precinctMarkersRef.current.push({ marker, id: p.id });
        });

        setMapReady(true);
      });

      map.on('click', () => {
        setSelectedSign(null);
        setSelectedRec(null);
        setSelectedPrecinct(null);
      });
      mapRef.current = map;
    })();

    return () => { alive = false; mapRef.current?.remove(); mapRef.current = null; setMapReady(false); };
  }, [theme]);

  // Ensure map canvas is resized and fully painted upon unlocking the security gate
  useEffect(() => {
    if (isCommandAuthorized && mapRef.current) {
      try { mapRef.current.resize(); } catch {}
      const t1 = setTimeout(() => { try { mapRef.current?.resize?.(); } catch {} }, 100);
      const t2 = setTimeout(() => { try { mapRef.current?.resize?.(); } catch {} }, 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isCommandAuthorized]);

  /* ---------- Layer Visibility ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m?.isStyleLoaded?.()) return;
    const bVis = showBoundary ? 'visible' : 'none';
    const cVis = showCorridors ? 'visible' : 'none';
    const hVis = showHeatmap ? 'visible' : 'none';
    const pVis = showPrecincts ? 'visible' : 'none';
    const vVis = showFieldForceLayer ? 'visible' : 'none';
    const rVis = (showRoutesLayer || selectedRoute) ? 'visible' : 'none';
    ['boundary-fill', 'boundary-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', bVis));
    ['corridor-glow', 'corridor-core', 'corridor-inner'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', cVis));
    ['traffic-heat-glow', 'traffic-heat-core'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', hVis));
    ['precincts-fill', 'precincts-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', pVis));
    ['volunteer-trails-glow', 'volunteer-trails-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', vVis));
    ['canvass-turf-glow', 'canvass-turf-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', rVis));
  }, [showBoundary, showCorridors, showHeatmap, showPrecincts, showFieldForceLayer, showRoutesLayer, selectedRoute, mapReady]);

  /* ---------- Precinct Center Badges on Map ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    (async () => {
      const mgl = (await import('maplibre-gl')).default;
      precinctMarkersRef.current.forEach(item => item.marker?.remove?.());
      precinctMarkersRef.current = [];

      if (!showPrecincts) return;

      BRISTOL_PRECINCTS.forEach(p => {
        const el = document.createElement('div');
        const isSel = selectedPrecinct?.id === p.id;
        el.className = 'precinct-ghost-watermark';
        el.style.zIndex = '5';
        el.style.cursor = 'pointer';

        // Letters only watermark (e.g. 1A, 2A, 2B, 3A) directly on the map — no card container
        el.innerHTML = `
          <div style="
            user-select: none;
            font-size: 28px;
            font-weight: 900;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            letter-spacing: -0.03em;
            line-height: 1;
            color: ${p.color};
            opacity: ${isSel ? 1 : 0.88};
            text-shadow: 0 0 16px ${p.color}80, 0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.95);
            transform: ${isSel ? 'scale(1.15)' : 'scale(1)'};
            transition: transform 0.2s ease, opacity 0.2s ease;
          ">
            ${p.code}
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(null);
          setSelectedRec(null);
          setSelectedPrecinct(p);
        });

        const marker = new mgl.Marker({
          element: el,
          anchor: 'center',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        }).setLngLat(p.center).addTo(m);
        precinctMarkersRef.current.push({ marker, id: p.id });
      });
    })();
  }, [showPrecincts, selectedPrecinct, is3D, useDotMode, mapReady]);

  /* ---------- Traffic Heatmap Layer ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m || trafficStations.length === 0) return;

    (async () => {
    const mgl = (await import('maplibre-gl')).default;

    const addHeatmap = () => {
      if (m.getSource('traffic-stations')) {
        (m.getSource('traffic-stations') as any).setData(stationsToGeoJSON(trafficStations));
        return;
      }
      m.addSource('traffic-stations', { type: 'geojson', data: stationsToGeoJSON(trafficStations) });
      // Outer glow
      m.addLayer({
        id: 'traffic-heat-glow', type: 'circle', source: 'traffic-stations',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'aadt'], 5000, 16, 12000, 28, 25000, 48],
          'circle-color': ['interpolate', ['linear'], ['get', 'aadt'], 5000, '#22c55e', 12000, '#eab308', 20000, '#ef4444'],
          'circle-opacity': 0.15,
          'circle-blur': 1,
        },
      });
      // Core dot
      m.addLayer({
        id: 'traffic-heat-core', type: 'circle', source: 'traffic-stations',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'aadt'], 5000, 5, 12000, 8, 25000, 13],
          'circle-color': ['interpolate', ['linear'], ['get', 'aadt'], 5000, '#22c55e', 12000, '#eab308', 20000, '#ef4444'],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
        },
      });

      // Popup on hover (use dynamically imported mgl)
      try {
        const popup = new mgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        m.on('mouseenter', 'traffic-heat-core', (e: any) => {
          m.getCanvas().style.cursor = 'pointer';
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties;
          popup.setLngLat(e.lngLat)
            .setHTML(`<div style="background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);border-radius:10px;padding:8px 12px;border:1px solid rgba(255,255,255,0.1);">
              <div style="color:white;font-size:12px;font-weight:800;">${p.route}</div>
              <div style="color:rgba(255,255,255,0.5);font-size:10px;margin-top:2px;">${p.location || ''}</div>
              <div style="color:#fbbf24;font-size:13px;font-weight:900;margin-top:4px;">${Number(p.aadt).toLocaleString()} <span style="font-size:9px;color:rgba(255,255,255,0.4);">AADT</span></div>
            </div>`)
            .addTo(m);
        });
        m.on('mouseleave', 'traffic-heat-core', () => { m.getCanvas().style.cursor = ''; popup.remove(); });
      } catch {}
    };

    if (m.isStyleLoaded()) addHeatmap();
    else m.on('load', addHeatmap);
    })();
  }, [trafficStations, theme]);

  /* ---------- Markers ---------- */
  useEffect(() => {
    (async () => {
      const m = mapRef.current;
      if (!m) return;
      const mgl = (await import('maplibre-gl')).default;

      markersRef.current.forEach(mk => mk.remove());
      markersRef.current = [];

      if (!showSignsLayer) return;

      filtered.forEach((sign, i) => {
        const el = document.createElement('div');
        const isComp = sign.is_competitor;
        const isBig  = ['large_sign', 'banner', 'billboard'].includes(sign.sign_type);
        const isSel  = selectedSign?.id === sign.id;
        el.className = `sign-map-marker ${isSel ? 'is-selected' : ''}`;
        el.style.cursor = 'pointer';
        el.style.zIndex = isSel ? '500' : '100';

        // High-contrast solid colors — no subtle gradients, maximum readability
        const bgColor = isComp ? '#e11d48' : isBig ? '#2563eb' : '#059669';
        const bgColorDark = isComp ? '#be123c' : isBig ? '#1d4ed8' : '#047857';
        const glowColor = isComp ? 'rgba(225,29,72,0.45)' : isBig ? 'rgba(37,99,235,0.4)' : 'rgba(5,150,105,0.4)';

        // Bold, clear label — no emoji, just crisp uppercase text
        const pinLabel = isComp
          ? 'VS'
          : sign.sign_type === 'yard_sign'
          ? 'YARD'
          : sign.sign_type === 'large_sign'
          ? '4×4'
          : sign.sign_type === 'banner'
          ? 'BNR'
          : 'BILL';

        // Hover tooltip with candidate + type
        const tooltipName = isComp ? (sign.competitor_name || 'Opponent') : 'M. Brown';
        const tooltipType = SIGN_TYPE_META[sign.sign_type]?.label || 'Sign';

        if (useDotMode) {
          el.innerHTML = `
            <div style="position:relative;width:${isSel ? 22 : 16}px;height:${isSel ? 22 : 16}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              ${/* If selected: glowing active radar pulse */''}
              ${isSel ? `
                <div class="animate-radar" style="
                  width: 28px;
                  height: 28px;
                  background: ${glowColor};
                  border: 2px solid #ffffff;
                "></div>
              ` : ''}

              ${/* Street-Level Precision Micro Dot */''}
              <div class="street-dot" style="
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: ${bgColor};
                border: 2px solid white;
                box-shadow: 0 0 10px ${glowColor}, 0 2px 5px rgba(0,0,0,0.6);
                transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
                z-index: 10;
              "></div>

              ${/* Hover Tooltip */''}
              <div class="
                hidden group-hover:flex
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                flex-col items-center pointer-events-none z-50
              ">
                <div style="
                  background: rgba(15,23,42,0.94);
                  backdrop-filter: blur(12px);
                  border-radius: 12px;
                  padding: 7px 12px;
                  white-space: nowrap;
                  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                  border: 1px solid rgba(255,255,255,0.12);
                  text-align: center;
                ">
                  <div style="display:flex;align-items:center;gap:5px;justify-content:center;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${bgColor};display:inline-block;"></span>
                    <span style="color:white;font-size:12px;font-weight:800;line-height:1.2;">${tooltipName}</span>
                  </div>
                  <div style="color:rgba(255,255,255,0.6);font-size:10px;font-weight:600;margin-top:2px;">
                    ${tooltipType} · ${sign.is_competitor ? 'Opponent Sighting' : 'Official Campaign'}
                  </div>
                  ${sign.street_address ? `<div style="color:#38bdf8;font-size:10px;margin-top:2px;">${sign.street_address}</div>` : ''}
                </div>
                <div style="
                  width:0;height:0;
                  border-left:6px solid transparent;
                  border-right:6px solid transparent;
                  border-top:6px solid rgba(15,23,42,0.94);
                  margin-top:-1px;
                "></div>
              </div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;width:48px;">
              <div class="flex flex-col items-center group w-full">

                ${/* === THE PIN HEAD === */''}
                <div class="sign-pin-head" style="
                  width: 48px;
                  height: 48px;
                  background: linear-gradient(135deg, ${bgColor}, ${bgColorDark});
                  border-radius: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 3px solid rgba(255,255,255,0.95);
                  box-shadow: 0 4px 16px ${glowColor}, 0 2px 4px rgba(0,0,0,0.2);
                  position: relative;
                  transform-origin: center bottom;
                  transform: ${isSel ? 'scale(1.18)' : 'scale(1)'};
                  transition: transform 0.15s ease;
                ">
                  ${/* Concentric Radar Ring Centered Directly Inside Pin Head */''}
                  ${!isComp && !isSel ? `<div class="animate-radar pointer-events-none" style="width: 44px; height: 44px; background: ${glowColor}; z-index: -1;"></div>` : ''}
                  ${isSel ? `<div class="animate-radar pointer-events-none" style="width: 48px; height: 48px; border: 2.5px solid #ffffff; background: ${glowColor}; z-index: -1;"></div>` : ''}

                  <span style="
                    color: white;
                    font-size: 13px;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.4);
                    line-height: 1;
                    position: relative;
                  ">${pinLabel}</span>
                </div>

                ${/* Pin pointer triangle touching ground coordinate */''}
                <div style="
                  width: 0; height: 0;
                  border-left: 7px solid transparent;
                  border-right: 7px solid transparent;
                  border-top: 8px solid ${bgColorDark};
                  margin-top: -1px;
                  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));
                "></div>

                ${/* Hover tooltip — big text for readability */''}
                <div class="
                  hidden group-hover:flex
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  flex-col items-center pointer-events-none z-50
                ">
                  <div style="
                    background: rgba(0,0,0,0.88);
                    backdrop-filter: blur(12px);
                    border-radius: 12px;
                    padding: 8px 14px;
                    white-space: nowrap;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                  ">
                    <div style="color:white;font-size:13px;font-weight:800;line-height:1.3;">${tooltipName}</div>
                    <div style="color:rgba(255,255,255,0.55);font-size:11px;font-weight:600;margin-top:2px;">${tooltipType} · ${sign.is_competitor ? 'Reported by Opponent Volunteer' : 'Placed by Campaign Volunteer'}</div>
                  </div>
                  <div style="
                    width:0;height:0;
                    border-left:6px solid transparent;
                    border-right:6px solid transparent;
                    border-top:6px solid rgba(0,0,0,0.88);
                    margin-top:-1px;
                  "></div>
                </div>

              </div>
            </div>
          `;
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(sign);
          m.flyTo({ center: [Number(sign.longitude), Number(sign.latitude)], zoom: 16.5, pitch: is3D ? 55 : 0, duration: 800 });
        });

        // Hover scale & elevate z-index with bottom transform-origin
        el.addEventListener('mouseenter', () => {
          el.style.zIndex = '9999';
          const pin = (el.querySelector('.sign-pin-head') || el.querySelector('.street-dot')) as HTMLElement;
          if (pin && !isSel) {
            pin.style.transformOrigin = useDotMode ? 'center center' : 'center bottom';
            pin.style.transform = useDotMode ? 'scale(1.4)' : 'scale(1.15)';
          }
        });
        el.addEventListener('mouseleave', () => {
          el.style.zIndex = isSel ? '500' : '100';
          const pin = (el.querySelector('.sign-pin-head') || el.querySelector('.street-dot')) as HTMLElement;
          if (pin && !isSel) pin.style.transform = 'scale(1)';
        });

        const marker = new mgl.Marker({
          element: el,
          anchor: useDotMode ? 'center' : 'bottom',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        }).setLngLat([Number(sign.longitude), Number(sign.latitude)]).addTo(m);
        markersRef.current.push(marker);
      });
    })();
  }, [filtered, selectedSign, is3D, useDotMode, showSignsLayer]);

  // Render Dispatched Sign Missions on Map
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    (async () => {
      const mgl = (await import('maplibre-gl')).default;

      // Clear old mission markers
      missionMarkersRef.current.forEach(item => item.marker?.remove?.());
      missionMarkersRef.current = [];

      if (!showMissionsLayer) return;

      const activeAssignments = assignments.filter(a => a.status !== 'completed');

      activeAssignments.forEach(mission => {
        const el = document.createElement('div');
        const isSel = selectedMission?.id === mission.id;
        el.className = `mission-map-marker group ${isSel ? 'is-selected' : ''}`;
        el.style.cursor = 'pointer';
        el.style.zIndex = isSel ? '600' : '150';

        const isCritical = mission.priority === 'critical';
        const isHigh = mission.priority === 'high';

        const gradient = isCritical
          ? 'linear-gradient(135deg, #f43f5e, #be123c)'
          : isHigh
          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
          : 'linear-gradient(135deg, #9333ea, #4f46e5)';

        const pointerColor = isCritical ? '#be123c' : isHigh ? '#d97706' : '#4f46e5';
        const rippleColor = isCritical ? 'rgba(244,63,94,0.35)' : isHigh ? 'rgba(245,158,11,0.35)' : 'rgba(168,85,247,0.35)';
        const glow = isCritical
          ? '0 4px 18px rgba(244,63,94,0.6)'
          : isHigh
          ? '0 4px 18px rgba(245,158,11,0.5)'
          : '0 4px 18px rgba(147,51,234,0.5)';

        const shortLabel = mission.title.includes('3A') || mission.title.toLowerCase().includes('anderson')
          ? '3A TARGET'
          : mission.title.toLowerCase().includes('weaver')
          ? 'WEAVER PKWY'
          : mission.target_type === 'precinct'
          ? 'PRECINCT'
          : 'TARGET';

        if (useDotMode) {
          el.innerHTML = `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;width:24px;height:24px;">
              ${/* Centered radar ring */''}
              <div class="animate-radar pointer-events-none" style="
                width: 38px;
                height: 38px;
                background: ${rippleColor};
                z-index: 1;
              "></div>

              ${/* Street-level mission target dot */''}
              <div class="mission-street-dot" style="
                position: relative;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: ${gradient};
                border: 2px solid white;
                box-shadow: 0 0 12px ${glow}, 0 2px 6px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                z-index: 10;
              ">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>
              </div>

              ${/* Hover Tooltip */''}
              <div class="
                hidden group-hover:flex
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                flex-col items-center pointer-events-none z-50
              ">
                <div style="
                  background: rgba(15,23,42,0.94);
                  backdrop-filter: blur(14px);
                  border-radius: 12px;
                  padding: 8px 12px;
                  white-space: nowrap;
                  box-shadow: 0 10px 28px rgba(0,0,0,0.45);
                  border: 1px solid rgba(255,255,255,0.12);
                  text-align: center;
                ">
                  <div style="display:flex;align-items:center;gap:5px;justify-content:center;">
                    <span style="font-size:12px;">🎯</span>
                    <span style="color:white;font-size:12px;font-weight:800;line-height:1.2;">${mission.title}</span>
                  </div>
                  <div style="color:${isCritical ? '#fda4af' : isHigh ? '#fde68a' : '#c084fc'};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">
                    ${mission.priority} Priority · ${mission.quantity}× ${mission.sign_type.replace('_', ' ')}
                  </div>
                  <div style="color:rgba(255,255,255,0.65);font-size:11px;font-weight:600;margin-top:2px;">
                    Assigned to: ${mission.volunteer_name}
                  </div>
                </div>
                <div style="
                  width:0;height:0;
                  border-left:6px solid transparent;
                  border-right:6px solid transparent;
                  border-top:6px solid rgba(15,23,42,0.94);
                  margin-top:-1px;
                "></div>
              </div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;">
              ${/* Prominent mission badge pill */''}
              <div style="
                background: rgba(15, 23, 42, 0.95);
                color: white;
                border: 1.5px solid ${isSel ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'};
                padding: 2px 7.5px;
                border-radius: 9999px;
                font-size: 9.5px;
                font-weight: 900;
                letter-spacing: 0.5px;
                white-space: nowrap;
                box-shadow: 0 4px 14px rgba(0,0,0,0.5);
                margin-bottom: 3.5px;
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span style="color: ${isCritical ? '#fda4af' : isHigh ? '#fde68a' : '#c084fc'}; font-size: 9px;">🎯</span>
                <span style="color: white; font-weight: 900;">${shortLabel}</span>
                <span style="color: rgba(255,255,255,0.4);">·</span>
                <span style="color: #38bdf8; font-family: monospace; font-weight: 900;">${mission.quantity}×</span>
              </div>

              ${/* Pin Head with vector Target Reticle icon */''}
              <div class="mission-pin-head" style="
                position: relative;
                width: 46px;
                height: 46px;
                border-radius: 15px;
                background: ${gradient};
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: ${isSel ? '0 0 0 3.5px #ffffff, 0 0 20px rgba(168,85,247,0.9)' : glow};
                border: 2.5px solid white;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
              ">
                ${/* Radar ripple locked concentric to pin head */''}
                <div class="animate-radar pointer-events-none" style="
                  width: 60px;
                  height: 60px;
                  background: ${rippleColor};
                  z-index: -1;
                "></div>

                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="6"></circle>
                  <circle cx="12" cy="12" r="2.2" fill="white"></circle>
                </svg>
              </div>

              ${/* Downward pointer needle to coordinate (bottom edge is the exact needle tip) */''}
              <div style="
                width: 0;
                height: 0;
                border-left: 7px solid transparent;
                border-right: 7px solid transparent;
                border-top: 8px solid ${pointerColor};
                margin-top: -1px;
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));
              "></div>

              ${/* Crisp hover tooltip */''}
              <div class="
                hidden group-hover:flex
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5
                flex-col items-center pointer-events-none z-50
              ">
                <div style="
                  background: rgba(15,23,42,0.94);
                  backdrop-filter: blur(14px);
                  border-radius: 12px;
                  padding: 8px 12px;
                  white-space: nowrap;
                  box-shadow: 0 10px 28px rgba(0,0,0,0.45);
                  border: 1px solid rgba(255,255,255,0.12);
                  text-align: center;
                ">
                  <div style="display:flex;align-items:center;gap:5px;justify-content:center;">
                    <span style="font-size:12px;">🎯</span>
                    <span style="color:white;font-size:12px;font-weight:800;line-height:1.2;">${mission.title}</span>
                  </div>
                  <div style="color:${isCritical ? '#fda4af' : isHigh ? '#fde68a' : '#c084fc'};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">
                    ${mission.priority} Priority · ${mission.quantity}× ${mission.sign_type.replace('_', ' ')}
                  </div>
                  <div style="color:rgba(255,255,255,0.65);font-size:11px;font-weight:600;margin-top:2px;">
                    Assigned to: ${mission.volunteer_name}
                  </div>
                </div>
                <div style="
                  width:0;height:0;
                  border-left:6px solid transparent;
                  border-right:6px solid transparent;
                  border-top:6px solid rgba(15,23,42,0.94);
                  margin-top:-1px;
                "></div>
              </div>
            </div>
          `;
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedMission(mission);
          setSelectedSign(null);
          setSelectedRec(null);
          setSelectedPrecinct(null);
          m.flyTo({ center: [mission.lng, mission.lat], zoom: 16.5, pitch: is3D ? 55 : 0, duration: 800 });
        });

        // Hover scale & elevate z-index
        el.addEventListener('mouseenter', () => {
          el.style.zIndex = '9999';
          const pin = (el.querySelector('.mission-pin-head') || el.querySelector('.mission-street-dot')) as HTMLElement;
          if (pin && !isSel) {
            pin.style.transform = useDotMode ? 'scale(1.3)' : 'scale(1.15)';
            pin.style.transformOrigin = useDotMode ? 'center center' : 'center bottom';
          }
        });
        el.addEventListener('mouseleave', () => {
          el.style.zIndex = isSel ? '600' : '150';
          const pin = (el.querySelector('.mission-pin-head') || el.querySelector('.mission-street-dot')) as HTMLElement;
          if (pin && !isSel) pin.style.transform = 'scale(1)';
        });

        const marker = new mgl.Marker({
          element: el,
          anchor: useDotMode ? 'center' : 'bottom',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        }).setLngLat([mission.lng, mission.lat]).addTo(m);
        missionMarkersRef.current.push({ marker, id: mission.id });
      });
    })();
  }, [assignments, selectedMission, is3D, useDotMode, showMissionsLayer]);

  /* ---------- Ground Canvass Markers ---------- */
  useEffect(() => {
    (async () => {
      const m = mapRef.current;
      if (!m) return;
      const mgl = (await import('maplibre-gl')).default;

      canvassMarkersRef.current.forEach(item => item.marker?.remove?.());
      canvassMarkersRef.current = [];

      if (!showCanvassLayer) return;

      const activeRecords = canvassRecords.filter(rec => {
        if (selectedVolunteerFilter) {
          const v1 = rec.volunteer_name.toLowerCase().trim();
          const v2 = selectedVolunteerFilter.toLowerCase().trim();
          if (!v1.includes(v2) && !v2.includes(v1)) return false;
        }
        if (selectedVolunteerGroup !== 'all') {
          const role = (rec.volunteer_role || '').toLowerCase();
          if (selectedVolunteerGroup === 'canvasser' && !(role.includes('canvass') || role.includes('door'))) return false;
          if (selectedVolunteerGroup === 'flyer' && !(role.includes('flyer') || role.includes('lit'))) return false;
          if (selectedVolunteerGroup === 'sign' && !(role.includes('sign') || role.includes('field'))) return false;
          if (selectedVolunteerGroup === 'town_hall' && !(role.includes('town') || role.includes('event'))) return false;
        }
        return true;
      });

      activeRecords.forEach(rec => {
        const el = document.createElement('div');
        const isSel = selectedCanvassRecord?.id === rec.id;
        el.className = `canvass-map-marker ${isSel ? 'is-selected' : ''}`;
        el.style.cursor = 'pointer';
        el.style.zIndex = isSel ? '650' : '140';

        const isContact = rec.result === 'contact';
        const isFlyer = rec.result === 'left_flyer';

        const bg = isContact ? '#059669' : isFlyer ? '#d97706' : '#475569';
        const icon = isContact ? '🤝' : isFlyer ? '📰' : '🚪';
        const label = isContact ? (rec.sentiment ? rec.sentiment.replace('_', ' ').toUpperCase() : 'CONTACT') : isFlyer ? 'FLYER' : 'NO CONTACT';

        if (useDotMode) {
          el.innerHTML = `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;width:20px;height:20px;" title="${rec.street_address || rec.volunteer_name}">
              <div style="width:10px;height:10px;border-radius:50%;background:${bg};border:2px solid #ffffff;box-shadow:0 0 10px ${bg};"></div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <div style="position:absolute;bottom:28px;background:${bg};color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.4);display:flex;align-items:center;gap:4px;">
                <span>${icon}</span>
                <span>${label}</span>
              </div>
              <div style="width:24px;height:24px;border-radius:50%;background:${bg};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-size:11px;">
                ${icon}
              </div>
            </div>
          `;
        }

        el.addEventListener('mouseenter', () => {
          el.style.zIndex = '9999';
        });
        el.addEventListener('mouseleave', () => {
          el.style.zIndex = isSel ? '650' : '140';
        });

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(null);
          setSelectedRec(null);
          setSelectedPrecinct(null);
          setSelectedMission(null);
          setSelectedCanvassRecord(rec);
        });

        const marker = new mgl.Marker({
          element: el,
          anchor: 'center',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        }).setLngLat([rec.longitude, rec.latitude]).addTo(m);

        canvassMarkersRef.current.push({ marker, id: rec.id });
      });
    })();
  }, [canvassRecords, showCanvassLayer, selectedVolunteerFilter, selectedVolunteerGroup, selectedCanvassRecord, useDotMode]);

  /* ---------- Live Volunteer Markers & Walking Trails ---------- */
  useEffect(() => {
    (async () => {
      const m = mapRef.current;
      if (!m) return;
      const mgl = (await import('maplibre-gl')).default;

      volunteerMarkersRef.current.forEach(item => item.marker?.remove?.());
      volunteerMarkersRef.current = [];

      const trailFeatures: any[] = [];

      if (showFieldForceLayer) {
        const activeVolunteers = volunteerPings.filter(ping => {
          if (selectedVolunteerFilter) {
            const v1 = ping.volunteer_name.toLowerCase().trim();
            const v2 = selectedVolunteerFilter.toLowerCase().trim();
            if (!v1.includes(v2) && !v2.includes(v1)) return false;
          }
          if (selectedVolunteerGroup !== 'all') {
            const role = (ping.role || '').toLowerCase();
            if (selectedVolunteerGroup === 'canvasser' && !(role.includes('canvass') || role.includes('door'))) return false;
            if (selectedVolunteerGroup === 'flyer' && !(role.includes('flyer') || role.includes('lit'))) return false;
            if (selectedVolunteerGroup === 'sign' && !(role.includes('sign') || role.includes('field'))) return false;
            if (selectedVolunteerGroup === 'town_hall' && !(role.includes('town') || role.includes('event'))) return false;
          }
          return true;
        });

        for (const vol of activeVolunteers) {
          if (vol.breadcrumbs && vol.breadcrumbs.length >= 2) {
            const streetCoords = await snapWalkingPathToStreets(vol.breadcrumbs);
            trailFeatures.push({
              type: 'Feature',
              properties: { volunteer_name: vol.volunteer_name },
              geometry: {
                type: 'LineString',
                coordinates: streetCoords,
              },
            });
          } else {
            // Check if volunteer has canvass knocks; if so, connect along the street!
            const volKnocks = canvassRecords
              .filter(r => r.volunteer_name.toLowerCase().trim() === vol.volunteer_name.toLowerCase().trim())
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            if (volKnocks.length >= 2) {
              const knockCoords: [number, number][] = volKnocks.map(r => [r.longitude, r.latitude]);
              const streetCoords = await snapWalkingPathToStreets(knockCoords);
              trailFeatures.push({
                type: 'Feature',
                properties: { volunteer_name: vol.volunteer_name },
                geometry: {
                  type: 'LineString',
                  coordinates: streetCoords,
                },
              });
            }
          }

          const el = document.createElement('div');
          el.className = 'volunteer-live-marker';
          el.style.cursor = 'pointer';
          el.style.zIndex = '700';

          const initials = vol.volunteer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const roleColor = (vol.role || '').includes('Flyer') ? '#d97706' : '#10b981';

          el.innerHTML = `
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
              <div style="position:absolute;bottom:32px;background:rgba(15,23,42,0.92);color:white;padding:3px 8px;border-radius:9999px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1.5px solid ${roleColor};display:flex;align-items:center;gap:4px;">
                <span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></span>
                <span>${vol.volunteer_name}</span>
              </div>
              <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
                <div class="animate-radar pointer-events-none" style="width:48px;height:48px;background:${roleColor}33;z-index:1;"></div>
                <div style="position:relative;width:26px;height:26px;background:linear-gradient(135deg, #10b981, #0d9488);border:2.5px solid white;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.4);z-index:2;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:white;">
                  ${initials}
                </div>
              </div>
            </div>
          `;

          el.addEventListener('mouseenter', () => {
            el.style.zIndex = '9999';
          });
          el.addEventListener('mouseleave', () => {
            el.style.zIndex = '700';
          });

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedVolunteerFilter(vol.volunteer_name);
            setIsVolunteerFilterOpen(true);
          });

          const marker = new mgl.Marker({
            element: el,
            anchor: 'center',
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport',
          }).setLngLat([vol.longitude, vol.latitude]).addTo(m);

          volunteerMarkersRef.current.push({ marker, name: vol.volunteer_name });
        }
      }

      try {
        const src = m.getSource('volunteer-trails');
        if (src) {
          (src as any).setData({
            type: 'FeatureCollection',
            features: trailFeatures,
          });
        }
      } catch {}
    })();
  }, [volunteerPings, canvassRecords, showFieldForceLayer, selectedVolunteerFilter, selectedVolunteerGroup]);

  /* ---------- Canvass Turf Routes Rendering ---------- */
  useEffect(() => {
    (async () => {
      const m = mapRef.current;
      if (!m) return;
      const mgl = (await import('maplibre-gl')).default;

      routeMarkersRef.current.forEach(item => item.marker?.remove?.());
      routeMarkersRef.current = [];

      const routeFeatures: any[] = [];

      if (showRoutesLayer || selectedRoute) {
        const routesToRender = selectedRoute ? [selectedRoute] : routes;

        routesToRender.forEach(route => {
          if (route.path_coordinates && route.path_coordinates.length >= 2) {
            routeFeatures.push({
              type: 'Feature',
              properties: { id: route.id, name: route.name, precinct: route.precinct_code },
              geometry: {
                type: 'LineString',
                coordinates: route.path_coordinates,
              },
            });

            // Add start pin (🚩)
            const startEl = document.createElement('div');
            startEl.className = 'route-start-marker';
            startEl.style.cursor = 'pointer';
            startEl.style.zIndex = '550';
            startEl.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                <div style="background:rgba(15,23,42,0.92);color:white;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:900;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1.5px solid #a855f7;display:flex;align-items:center;gap:4px;">
                  <span>🚩</span>
                  <span>${route.name.split(':')[0]}</span>
                </div>
                <div style="width:24px;height:24px;border-radius:50%;background:#9333ea;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-size:11px;margin-top:2px;">
                  🚶
                </div>
              </div>
            `;

            startEl.addEventListener('click', (e) => {
              e.stopPropagation();
              setSelectedRoute(route);
              setSelectedSign(null);
              setSelectedMission(null);
              setSelectedCanvassRecord(null);
              setSelectedPrecinct(null);
            });

            const marker = new mgl.Marker({
              element: startEl,
              anchor: 'bottom',
              pitchAlignment: 'viewport',
              rotationAlignment: 'viewport',
            }).setLngLat([route.start_point.lng, route.start_point.lat]).addTo(m);

            routeMarkersRef.current.push({ marker, id: route.id });
          }
        });
      }

      try {
        const src = m.getSource('canvass-turf-routes');
        if (src) {
          (src as any).setData({
            type: 'FeatureCollection',
            features: routeFeatures,
          });
        }
      } catch {}
    })();
  }, [routes, selectedRoute, showRoutesLayer, mapReady]);

  /* ---------- Actions ---------- */
  const toggle3D = useCallback(() => {
    const m = mapRef.current; if (!m) return;
    const next = !is3D; setIs3D(next);
    m.easeTo({ pitch: next ? 55 : 0, bearing: next ? -15 : 0, duration: 800 });
  }, [is3D]);

  const recenter = useCallback(() => {
    mapRef.current?.flyTo({ center: BRISTOL_CENTER, zoom: 13.2, pitch: is3D ? 52 : 0, bearing: is3D ? -15 : 0, duration: 900 });
  }, [is3D]);

  const exportCSV = () => {
    const h = ['ID','Type','Competitor','Competitor Name','Lat','Lng','Placed / Reported By','Status','Date'];
    const rows = filtered.map(s => [s.id, s.sign_type, s.is_competitor, s.competitor_name||'', s.latitude, s.longitude, `"${s.placed_by_name}"`, s.status, s.created_at]);
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([h, ...rows].map(r => (r as any[]).join(',')).join('\n'));
    a.download = `campaignos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const exportGeoJSON = () => {
    const gj = { type: 'FeatureCollection', features: filtered.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+s.longitude, +s.latitude] }, properties: { id: s.id, sign_type: s.sign_type, is_competitor: s.is_competitor, competitor_name: s.competitor_name, placed_by: s.placed_by_name, status: s.status, created_at: s.created_at } })) };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gj, null, 2));
    a.download = `campaignos_${new Date().toISOString().slice(0,10)}.geojson`;
    a.click();
  };

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className={`h-screen w-screen overflow-hidden relative font-sans transition-colors duration-500 ${isDark ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Security Gate Overlay (Master PIN: 620620) */}
      {(!checkedAuth || !isCommandAuthorized) && (
        <CommandPinGate
          onUnlock={() => {
            setIsCommandAuthorized(true);
            setTimeout(() => {
              mapRef.current?.resize?.();
            }, 100);
          }}
          masterPin="620620"
        />
      )}

      {/* ============================================================
          FULL-BLEED MAP CANVAS
          ============================================================ */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* ============================================================
          TOP FLOATING BAR
          ============================================================ */}
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none p-3 sm:p-4">
        <div className="w-full flex items-start justify-between gap-3">

          {/* — Brand Capsule — */}
          <div className="pointer-events-auto glass rounded-2xl px-4 py-2.5 flex items-center gap-3 animate-slide-up">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white font-black text-xs tracking-tight">COS</span>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-tight">Field Command</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">LIVE</span>
              </div>
              <p className="text-[11px] opacity-50 leading-none mt-0.5">CampaignOS • Melissa K. Brown • Bristol TN City Council</p>
            </div>
          </div>

          {/* — KPI Pills — */}
          <div className="hidden lg:flex pointer-events-auto glass rounded-2xl px-1 py-1 items-center gap-1 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/40" />
              <span className="text-[11px] font-medium opacity-60">Our Signs</span>
              <span className="text-sm font-black text-emerald-400 animate-count-up">{stats.ours}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-md shadow-amber-400/40" />
              <span className="text-[11px] font-medium opacity-60">Inventory</span>
              <span className="text-sm font-black text-amber-400 animate-count-up">{inventoryStats.totalPlaced}/{inventoryStats.totalStock}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-md shadow-rose-400/40" />
              <span className="text-[11px] font-medium opacity-60">Competitor</span>
              <span className="text-sm font-black text-rose-400 animate-count-up">{stats.theirs}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-md shadow-sky-400/40" />
              <span className="text-[11px] font-medium opacity-60">Arterials</span>
              <span className="text-sm font-black text-sky-400 animate-count-up">{stats.highImpact}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-teal-400 shadow-md shadow-teal-400/40" />
              <span className="text-[11px] font-medium opacity-60">Doors</span>
              <span className="text-sm font-black text-teal-400 animate-count-up">{canvassRecords.length}</span>
            </div>
          </div>

          {/* — Right Controls — */}
          <div className="pointer-events-auto flex items-center gap-2 animate-slide-up" style={{ animationDelay: '160ms' }}>
            {/* Quick Access to Field Force / Volunteer Filter */}
            <button
              onClick={() => setIsVolunteerFilterOpen(!isVolunteerFilterOpen)}
              className={`glass rounded-2xl px-3 py-2 flex items-center gap-1.5 transition-all text-xs font-bold active:scale-95 ${
                selectedVolunteerFilter || isVolunteerFilterOpen
                  ? 'bg-teal-500/25 text-teal-200 border border-teal-500/50 shadow-lg shadow-teal-500/20'
                  : 'hover:scale-105 border border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Filter map by volunteer individual or team"
            >
              <Users className="w-4 h-4 text-teal-400" />
              <span className="hidden sm:inline">
                {selectedVolunteerFilter ? selectedVolunteerFilter.split(' ')[0] : 'Ground Force'}
              </span>
              {selectedVolunteerFilter && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVolunteerFilter(null);
                  }}
                  className="ml-0.5 text-xs text-teal-300 hover:text-white"
                >
                  ✕
                </span>
              )}
            </button>

            {/* Quick Access to Sign Missions on all screen sizes */}
            <button
              onClick={() => {
                setModalInitialTab('dispatch');
                setModalInitialTarget(null);
                setShowVolunteerModal(true);
              }}
              className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5 hover:scale-105 transition-all text-xs font-bold border border-purple-500/30 hover:border-purple-500/50 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 shadow-lg shadow-purple-500/10 active:scale-95"
              title="Sign Placement Missions & Field Dispatch"
            >
              <Target className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Missions</span>
              {activeMissionsCount > 0 && (
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full bg-purple-500/40 text-purple-100 border border-purple-400/40">
                  {activeMissionsCount}
                </span>
              )}
            </button>

            {/* Quick Access to Volunteers Modal on all screen sizes */}
            <button
              onClick={() => {
                setModalInitialTab('roster');
                setModalInitialTarget(null);
                setShowVolunteerModal(true);
              }}
              className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5 hover:scale-105 transition-all text-xs font-bold border border-white/10 hover:border-white/20 text-slate-300 hover:text-white active:scale-95"
              title="Manage Volunteers & Field PINs"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Roster</span>
            </button>

            {/* Street-Level Dot View Quick Toggle */}
            <button
              onClick={() => setUseDotMode(!useDotMode)}
              className={`glass rounded-2xl px-3 py-2 flex items-center gap-1.5 transition-all text-xs font-bold active:scale-95 ${
                useDotMode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                  : 'hover:scale-105 border border-white/10 text-slate-300 hover:text-white'
              }`}
              title={useDotMode ? "Switch to standard pins" : "Filter off large icons to view street-level color coded dots"}
            >
              <CircleDot className={`w-4 h-4 ${useDotMode ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline">{useDotMode ? 'Dots Active' : 'Street Dots'}</span>
            </button>

            {/* Lock Field Command Security Gate */}
            <button
              onClick={handleLockCommand}
              className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5 hover:scale-105 transition-all text-xs font-bold border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 active:scale-95 group"
              title="Lock Field Command Gate (Master PIN: 620620)"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
              <span className="hidden md:inline">Lock</span>
            </button>

            {/* Drawer Toggle */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`glass rounded-2xl p-2.5 transition-all duration-300 ${drawerOpen ? 'bg-emerald-500 !border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : 'hover:scale-105'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Street-Level Dot Mode Active Floating Banner Pill */}
      {useDotMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-slide-up">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 text-cyan-200 text-xs font-semibold shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <span>Street-Level Color Coded Dots Active</span>
            <button
              onClick={() => setUseDotMode(false)}
              className="ml-1 text-[11px] text-slate-400 hover:text-white underline font-bold transition"
            >
              Reset to Pins
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          RIGHT-RAIL MAP CONTROLS (Apple Maps style)
          ============================================================ */}
      <div className="absolute right-3 sm:right-4 top-20 z-10 flex flex-col gap-2 pointer-events-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
        {/* Navigation Stack */}
        <div className="glass rounded-2xl p-1 flex flex-col items-center">
          <button onClick={recenter} title="Recenter Bristol" className="p-2.5 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-400 active:scale-90 transition-all">
            <Navigation className="w-4 h-4" />
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button onClick={toggle3D} title="3D Perspective" className={`p-2.5 rounded-xl text-xs font-black transition-all active:scale-90 ${is3D ? 'text-emerald-400 bg-emerald-500/15' : 'hover:bg-white/10'}`}>
            3D
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button onClick={() => mapRef.current?.zoomIn()} className="p-2.5 rounded-xl hover:bg-white/10 text-sm font-bold active:scale-90 transition-all leading-none">+</button>
          <button onClick={() => mapRef.current?.zoomOut()} className="p-2.5 rounded-xl hover:bg-white/10 text-sm font-bold active:scale-90 transition-all leading-none">−</button>
        </div>

        {/* Layer Toggles */}
        <div className="glass rounded-2xl p-1 flex flex-col items-center gap-0.5">
          <button
            onClick={() => setShowSignsLayer(!showSignsLayer)}
            title={showSignsLayer ? "Hide Yard Signs" : "Show Yard Signs"}
            className={`p-2 rounded-xl transition-all ${showSignsLayer ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowMissionsLayer(!showMissionsLayer)}
            title={showMissionsLayer ? "Hide Target Missions" : "Show Target Missions"}
            className={`p-2 rounded-xl transition-all ${showMissionsLayer ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-md shadow-purple-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCanvassLayer(!showCanvassLayer)}
            title={showCanvassLayer ? "Hide Canvass Knocks & Flyers" : "Show Canvass Knocks & Flyers"}
            className={`p-2 rounded-xl transition-all ${showCanvassLayer ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-md shadow-teal-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Footprints className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFieldForceLayer(!showFieldForceLayer)}
            title={showFieldForceLayer ? "Hide Live Volunteer Trails" : "Show Live Volunteer Trails"}
            className={`p-2 rounded-xl transition-all ${showFieldForceLayer ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRoutesLayer(!showRoutesLayer)}
            title={showRoutesLayer ? "Hide Canvass Turf Routes" : "Show Canvass Turf Routes"}
            className={`p-2 rounded-xl transition-all ${showRoutesLayer ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Compass className="w-4 h-4" />
          </button>
          <div className={`w-5 h-px my-0.5 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button
            onClick={() => setShowPrecincts(!showPrecincts)}
            title="Voting Precincts & Turnout Grid"
            className={`p-2 rounded-xl transition-all ${showPrecincts ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Vote className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowBoundary(!showBoundary)}
            title="Ward Boundary"
            className={`p-2 rounded-xl transition-all ${showBoundary ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCorridors(!showCorridors)}
            title="AADT Corridors"
            className={`p-2 rounded-xl transition-all ${showCorridors ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            title="Traffic Heatmap"
            className={`p-2 rounded-xl transition-all ${showHeatmap ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-md shadow-rose-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Flame className="w-4 h-4" />
          </button>
          <div className={`w-5 h-px my-0.5 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button
            onClick={() => setUseDotMode(!useDotMode)}
            title={useDotMode ? "Switch to Standard Pin View" : "Street-Level Color Coded Dots (fine street view)"}
            className={`p-2 rounded-xl transition-all ${useDotMode ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/25' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <CircleDot className="w-4 h-4" />
          </button>
        </div>
      </div>



      {/* ============================================================
          SELECTED SIGN — INSPECTION CARD (Bottom Center slide-up)
          ============================================================ */}
      {selectedSign && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[380px] max-w-[calc(100vw-32px)] pointer-events-auto animate-slide-up">
          <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden">
            {/* Accent edge */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${selectedSign.is_competitor ? 'from-rose-500 to-pink-500' : 'from-emerald-400 to-teal-400'}`} />

            <button onClick={() => setSelectedSign(null)} className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
              <X className="w-3.5 h-3.5 opacity-50" />
            </button>

            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedSign.is_competitor ? 'from-rose-500 to-pink-600' : 'from-emerald-400 to-teal-500'} flex items-center justify-center text-2xl shadow-lg ${selectedSign.is_competitor ? 'shadow-rose-500/30' : 'shadow-emerald-500/30'}`}>
                {SIGN_TYPE_META[selectedSign.sign_type]?.emoji || '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${selectedSign.is_competitor ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {selectedSign.is_competitor ? 'Opponent Sighting' : 'Official Campaign'}
                </span>
                <h3 className="font-extrabold text-base mt-1 truncate">
                  {selectedSign.is_competitor ? selectedSign.competitor_name : 'Melissa K. Brown'}
                </h3>
                <p className="text-xs opacity-50 capitalize mt-0.5">
                  {selectedSign.sign_type.replace('_', ' ')} · <span className={selectedSign.is_competitor ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>{selectedSign.is_competitor ? 'Reported' : (selectedSign.status === 'placed' ? 'Placed' : selectedSign.status.replace('_', ' '))}</span> {relativeTime(selectedSign.created_at)}
                </p>
              </div>
            </div>

            <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/8'} space-y-3 text-xs`}>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider block">📍 Street Address</span>
                {loadingAddress ? (
                  <span className={`inline-block h-4 w-44 rounded mt-1 animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                ) : (
                  <span className="font-extrabold mt-1 block text-sm text-white">{streetAddress || selectedSign.street_address || 'Bristol, TN'}</span>
                )}
                <span className="text-[10px] opacity-40 block mt-0.5 font-mono">Bristol, TN • {Number(selectedSign.latitude).toFixed(4)}, {Number(selectedSign.longitude).toFixed(4)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] uppercase font-bold opacity-30 block">
                    {selectedSign.is_competitor ? 'Reported By' : 'Placed By'}
                  </span>
                  <span className="font-semibold mt-0.5 block">
                    {selectedSign.is_competitor ? 'Opponent Volunteer' : 'Campaign Volunteer'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold opacity-30 block">GPS</span>
                  <span className="font-mono opacity-60 mt-0.5 block">{Number(selectedSign.latitude).toFixed(4)}, {Number(selectedSign.longitude).toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={getAppleMapsUrl({
                  address: selectedSign.street_address,
                  lat: Number(selectedSign.latitude),
                  lng: Number(selectedSign.longitude),
                  title: selectedSign.is_competitor
                    ? `${selectedSign.competitor_name || 'Competitor'} Sign`
                    : 'Brown Campaign Sign',
                  mode: 'view',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all"
              >
                <Navigation className="w-3.5 h-3.5" /> View in Apple Maps
              </a>
              <button onClick={() => setSelectedSign(null)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SELECTED GROUND CANVASS RECORD — INSPECTION CARD (Bottom Center)
          ============================================================ */}
      {selectedCanvassRecord && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[400px] max-w-[calc(100vw-32px)] pointer-events-auto animate-slide-up">
          <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl">
            {/* Accent top edge */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${
              selectedCanvassRecord.result === 'contact'
                ? 'from-emerald-400 to-teal-400'
                : selectedCanvassRecord.result === 'left_flyer'
                ? 'from-amber-400 to-orange-400'
                : 'from-slate-400 to-slate-600'
            }`} />

            <button
              onClick={() => setSelectedCanvassRecord(null)}
              className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <X className="w-3.5 h-3.5 opacity-50" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg ${
                selectedCanvassRecord.result === 'contact'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : selectedCanvassRecord.result === 'left_flyer'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}>
                {selectedCanvassRecord.result === 'contact' ? '🤝' : selectedCanvassRecord.result === 'left_flyer' ? '📰' : '🚪'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    selectedCanvassRecord.result === 'contact'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : selectedCanvassRecord.result === 'left_flyer'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {selectedCanvassRecord.result === 'contact'
                      ? 'VOTER CONTACT'
                      : selectedCanvassRecord.result === 'left_flyer'
                      ? 'LEFT FLYER / LIT'
                      : 'NO CONTACT'}
                  </span>
                  {selectedCanvassRecord.sentiment && (
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-md border border-teal-500/30">
                      {selectedCanvassRecord.sentiment.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-white mt-1 leading-tight">
                  {selectedCanvassRecord.street_address || 'Door Knock Location'}
                </h3>
                {selectedCanvassRecord.voter_name && (
                  <p className="text-xs text-slate-300 font-medium">
                    Voter: <span className="font-bold text-white">{selectedCanvassRecord.voter_name}</span>
                  </p>
                )}
              </div>
            </div>

            {selectedCanvassRecord.notes && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Voter Notes</span>
                <p className="italic leading-relaxed">"{selectedCanvassRecord.notes}"</p>
              </div>
            )}

            {selectedCanvassRecord.wants_yard_sign && (
              <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <span>🏡</span>
                <span>Voter Requested Yard Sign for Front Lawn!</span>
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>Knocked by <strong className="text-white">{selectedCanvassRecord.volunteer_name}</strong></span>
              <span className="font-mono">{new Date(selectedCanvassRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="mt-3 flex gap-2">
              <a
                href={getAppleMapsUrl({
                  address: selectedCanvassRecord.street_address,
                  lat: Number(selectedCanvassRecord.latitude),
                  lng: Number(selectedCanvassRecord.longitude),
                  title: `Door: ${selectedCanvassRecord.street_address || 'Voter'}`,
                  mode: 'directions',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.98] transition"
              >
                <Navigation className="w-3.5 h-3.5" /> Navigate
              </a>
              <button
                onClick={() => setSelectedCanvassRecord(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SCOUT RECOMMENDATION — APPROVAL CARD (Bottom Center slide-up)
          ============================================================ */}
      {selectedRec && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[420px] max-w-[calc(100vw-32px)] pointer-events-auto animate-slide-up">
          <div className="glass-heavy rounded-3xl p-5 relative overflow-hidden shadow-2xl shadow-amber-500/10">
            {/* Amber glowing top edge */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300" />

            <button onClick={() => setSelectedRec(null)} className={`absolute top-3 right-3 p-1.5 rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
              <X className="w-3.5 h-3.5 opacity-50" />
            </button>

            {/* Header Badge & Title */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl text-white font-black shadow-lg shadow-amber-500/30 shrink-0">
                ★
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    selectedRec.priority === 'critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    selectedRec.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {selectedRec.priority} Priority
                  </span>
                  <span className="text-[10px] font-black text-amber-400">★ {selectedRec.score}/10 Score</span>
                </div>
                <h3 className="font-extrabold text-base mt-1 truncate">{selectedRec.street}</h3>
                <p className="text-xs opacity-60 mt-0.5 font-medium">
                  {selectedRec.aadt ? `${selectedRec.aadt.toLocaleString()} vehicles/day` : 'High-impact corridor'}
                </p>
              </div>
            </div>

            {/* Details Section */}
            <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/10' : 'border-black/8'} space-y-3 text-xs`}>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-amber-500/20">
                <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider block">📍 Street Address / Intersection</span>
                {loadingRecAddress ? (
                  <span className={`inline-block h-4 w-44 rounded mt-1 animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                ) : (
                  <span className="font-extrabold mt-1 block text-sm text-white">{recAddress || selectedRec.street}</span>
                )}
                <span className="text-[10px] opacity-40 block mt-0.5 font-mono">Bristol, TN • {selectedRec.lat.toFixed(4)}, {selectedRec.lng.toFixed(4)}</span>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold opacity-30 block">🎯 Strategic Rationale</span>
                <p className="text-xs opacity-75 leading-relaxed mt-0.5">{selectedRec.reason}</p>
              </div>

              {/* Sign Type Selector */}
              <div>
                <span className="text-[9px] uppercase font-bold opacity-30 block mb-1.5">Deploy As Sign Type</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'yard_sign', emoji: '🏡', label: 'Yard Sign' },
                    { id: 'large_sign', emoji: '🪧', label: 'Large 4×4' },
                    { id: 'banner', emoji: '🚩', label: 'Banner' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedRecSignType(t.id as SignType)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        selectedRecSignType === t.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="text-base block">{t.emoji}</span>
                      <span className="text-[10px] font-bold block mt-0.5 leading-none">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleApproveRec(selectedRec, selectedRecSignType)}
                disabled={approvingRec}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {approvingRec ? 'Deploying…' : 'Approve & Deploy'}
              </button>
              <button
                onClick={() => {
                  setModalInitialTarget({
                    title: selectedRec.street,
                    street_address: recAddress || selectedRec.street,
                    lat: selectedRec.lat,
                    lng: selectedRec.lng,
                    signType: selectedRecSignType,
                    quantity: 1,
                    targetType: 'scout_rec',
                  });
                  setModalInitialTab('dispatch');
                  setShowVolunteerModal(true);
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-300 border border-purple-500/30 bg-purple-500/20 hover:bg-purple-500/30 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title="Assign this Scout recommendation to a field volunteer"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" /> Assign
              </button>
              <button
                onClick={() => handleDeclineRec(selectedRec)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 active:scale-95`}
              >
                Decline
              </button>
              <a
                href={getAppleMapsUrl({
                  address: recAddress || selectedRec.street,
                  lat: selectedRec.lat,
                  lng: selectedRec.lng,
                  title: selectedRec.street,
                  mode: 'view',
                })}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                title="Open Address in Apple Maps"
              >
                <Navigation className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          iOS-STYLE SLIDE-OVER DRAWER
          ============================================================ */}
      {drawerOpen && (
        <>
          {/* Scrim */}
          <div className="absolute inset-0 z-30 bg-black/20 animate-fade-in" onClick={() => setDrawerOpen(false)} />

          <aside className={`absolute inset-y-0 right-0 z-40 w-full sm:w-[400px] flex flex-col animate-slide-in-right ${isDark ? 'bg-zinc-950/95 border-l border-white/[0.06]' : 'bg-white/95 border-l border-black/[0.06]'}`} style={{ backdropFilter: 'saturate(200%) blur(40px)', WebkitBackdropFilter: 'saturate(200%) blur(40px)' }}>

            {/* Drawer Header */}
            <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Campaign Intel</h2>
                  <p className="text-[11px] opacity-40">{filtered.length} placements visible</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className={`grid grid-cols-4 gap-1 p-2 border-b shrink-0 ${isDark ? 'border-white/[0.06] bg-black/20' : 'border-black/[0.06] bg-black/[0.02]'}`}>
              <button
                onClick={() => setDrawerTab('signs')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  drawerTab === 'signs'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Signs</span>
                <span className="text-[10px] opacity-60 font-mono">({filtered.length})</span>
              </button>

              <button
                onClick={() => setDrawerTab('precincts')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  drawerTab === 'precincts'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>Precincts</span>
              </button>

              <button
                onClick={() => setDrawerTab('missions')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  drawerTab === 'missions'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span>Missions</span>
                {activeMissionsCount > 0 && (
                  <span className="text-[9px] px-1 py-0.2 rounded-full bg-purple-500/40 text-purple-100 font-mono font-bold">
                    {activeMissionsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDrawerTab('inventory')}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                  drawerTab === 'inventory'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Stock</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
              {drawerTab === 'precincts' && (
                <PrecinctLeaderboard
                  signs={signs}
                  selectedPrecinctId={selectedPrecinct?.id}
                  onSelectPrecinct={(p) => {
                    setSelectedPrecinct(p);
                    setSelectedSign(null);
                    setSelectedRec(null);
                    mapRef.current?.flyTo({
                      center: p.center,
                      zoom: 15.2,
                      pitch: is3D ? 50 : 0,
                      duration: 900,
                    });
                  }}
                  isDark={isDark}
                />
              )}

              {drawerTab === 'missions' && (
                <MissionsDrawerTab
                  assignments={assignments}
                  onOpenDispatch={() => {
                    setModalInitialTab('dispatch');
                    setModalInitialTarget(null);
                    setShowVolunteerModal(true);
                  }}
                  onSelectMission={(m) => {
                    setShowMissionsLayer(true);
                    setSelectedMission(m);
                    setSelectedSign(null);
                    setSelectedRec(null);
                    setSelectedPrecinct(null);
                    setDrawerOpen(false);
                    mapRef.current?.flyTo({
                      center: [m.lng, m.lat],
                      zoom: 15.8,
                      pitch: is3D ? 55 : 0,
                      duration: 800,
                    });
                  }}
                  onToggleComplete={(id) => {
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
                  }}
                  isDark={isDark}
                />
              )}

              {drawerTab === 'inventory' && (
                <>
                  {/* ============================================================
                      SIGN INVENTORY & SUPPLY CHAIN TRACKER
                      ============================================================ */}
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.08]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Sign Inventory</span>
                      </div>
                      <button
                        onClick={() => setEditingStock(!editingStock)}
                        className="text-[10px] font-bold text-sky-400 hover:underline flex items-center gap-1"
                      >
                        {editingStock ? '✓ Done' : '⚙ Adjust Stock'}
                      </button>
                    </div>

                    {/* Overall Deployment Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold opacity-80">Total Campaign Deployment</span>
                        <span className="font-extrabold text-emerald-400 font-mono">
                          {inventoryStats.totalPlaced} / {inventoryStats.totalStock} ({inventoryStats.pctDeployed}%)
                        </span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'}`}>
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 shadow-sm"
                          style={{ width: `${inventoryStats.pctDeployed}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-40">
                        <span>{inventoryStats.totalPlaced} placed in field</span>
                        <span>{inventoryStats.totalReserve} in reserve</span>
                      </div>
                    </div>

                    {/* Per-Type Inventory Breakdown */}
                    <div className="space-y-2.5">
                      {[
                        { type: 'yard_sign' as const, meta: SIGN_TYPE_META.yard_sign, color: '#10b981' },
                        { type: 'large_sign' as const, meta: SIGN_TYPE_META.large_sign, color: '#38bdf8' },
                        { type: 'banner' as const, meta: SIGN_TYPE_META.banner, color: '#f59e0b' },
                        { type: 'billboard' as const, meta: SIGN_TYPE_META.billboard, color: '#ec4899' },
                      ].map(item => {
                        const placed = inventoryStats.placedByType[item.type] || 0;
                        const total = inventoryStock[item.type] || 0;
                        const reserve = Math.max(0, total - placed);
                        const pct = total > 0 ? Math.min(100, Math.round((placed / total) * 100)) : 0;

                        return (
                          <div key={item.type} className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.01] border-black/[0.05]'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{item.meta.emoji}</span>
                                <span className="text-xs font-bold">{item.meta.label}</span>
                              </div>
                              {editingStock ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateStockQuantity(item.type, -10)}
                                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono text-xs font-bold w-10 text-center">{total}</span>
                                  <button
                                    onClick={() => updateStockQuantity(item.type, 10)}
                                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <span className="text-xs font-extrabold font-mono" style={{ color: item.color }}>
                                    {placed} / {total}
                                  </span>
                                  <span className="text-[9px] opacity-40 ml-1.5">({reserve} left)</span>
                                </div>
                              )}
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AADT Corridor Cards */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-amber-400">AADT Corridors</label>
                      <span className="text-[9px] opacity-30 font-mono">vehicles/day</span>
                    </div>
                    <div className="space-y-2 stagger-children">
                      {AADT_CORRIDORS.map(c => (
                        <div key={c.name} className={`p-3 rounded-xl border transition animate-fade-in ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold">{c.name}</span>
                            <span className="text-xs font-black font-mono" style={{ color: c.color }}>{c.aadt.toLocaleString()}</span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, background: `linear-gradient(90deg, ${c.color}, ${c.color}88)` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'signs' && (
                <>
                  {/* Search */}
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search streets, signs, or opponents…"
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      spellCheck={true}
                      autoCorrect="on"
                      autoCapitalize="words"
                      className={`w-full h-10 pl-10 pr-16 rounded-xl border text-sm focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 focus:border-emerald-500/50 text-white placeholder:text-zinc-500' : 'bg-black/[0.03] border-black/10 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400'}`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQ && (
                        <button
                          onClick={() => setSearchQ('')}
                          className="p-1 rounded-md text-slate-400 hover:text-white"
                          title="Clear filter"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <DictateButton
                        onTranscript={(dictated) => setSearchQ(dictated)}
                        size="sm"
                        title="Push to dictate search filter"
                      />
                    </div>
                  </div>

                  {/* Map Marker Display Mode Segment */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 flex items-center justify-between">
                      <span>Map Marker Mode</span>
                      <span className="text-[9px] font-medium text-cyan-400/90">{useDotMode ? '● Street Dots Active' : '📍 Pins Active'}</span>
                    </label>
                    <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                      <button
                        onClick={() => setUseDotMode(false)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          !useDotMode
                            ? isDark ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow'
                            : 'opacity-50 hover:opacity-80'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Pins
                      </button>
                      <button
                        onClick={() => setUseDotMode(true)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          useDotMode
                            ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                            : 'opacity-50 hover:opacity-80'
                        }`}
                      >
                        <CircleDot className="w-3.5 h-3.5" />
                        Street Dots
                      </button>
                    </div>
                  </div>

                  {/* Owner Segment */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Ownership</label>
                    <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                      {(['all', 'ours', 'theirs'] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setOwnerFilter(v)}
                          className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                            ownerFilter === v
                              ? v === 'theirs'
                                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                                : v === 'ours'
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                : isDark ? 'bg-zinc-800 text-white shadow' : 'bg-white text-slate-900 shadow'
                              : 'opacity-50 hover:opacity-80'
                          }`}
                        >
                          {v === 'all' ? `All (${stats.total})` : v === 'ours' ? 'Brown' : 'Opponents'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type + Status Filters */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1.5 block">Sign Type</label>
                      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/[0.03] border-black/10 text-slate-900'}`}>
                        <option value="all">All Types</option>
                        <option value="yard_sign">🏡 Yard Signs</option>
                        <option value="large_sign">🪧 Large 4×4</option>
                        <option value="banner">🚩 Banners</option>
                        <option value="billboard">🏢 Billboards</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1.5 block">Status</label>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/[0.03] border-black/10 text-slate-900'}`}>
                        <option value="all">All Statuses</option>
                        <option value="placed">✅ Active</option>
                        <option value="retrieved">📦 Retrieved</option>
                        <option value="needs_repair">🔧 Needs Repair</option>
                      </select>
                    </div>
                  </div>

                  {/* Signs in Field Feed */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">
                      Signs in Field ({filtered.length})
                    </label>
                    <div className="space-y-1.5 stagger-children max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {filtered.map(sign => {
                        const meta = SIGN_TYPE_META[sign.sign_type] || { emoji: '📍', label: 'Sign' };
                        return (
                          <button
                            key={sign.id}
                            onClick={() => {
                              setShowSignsLayer(true);
                              setSelectedSign(sign);
                              mapRef.current?.flyTo({ center: [+sign.longitude, +sign.latitude], zoom: 15.8, pitch: is3D ? 55 : 0, duration: 800 });
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all animate-fade-in ${
                              selectedSign?.id === sign.id
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : isDark
                                ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                                : 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04] hover:border-black/[0.12]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base shrink-0">{meta.emoji}</span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold truncate">{sign.is_competitor ? sign.competitor_name : 'Melissa K. Brown'}</span>
                                    {sign.is_competitor && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400" />}
                                  </div>
                                  <p className="text-[10px] opacity-40 truncate">{sign.street_address ? `${sign.street_address} · ` : ''}{sign.is_competitor ? 'Reported' : 'Placed'} {relativeTime(sign.created_at)}</p>
                                </div>
                              </div>
                              <span className={`shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-md ${sign.is_competitor ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                {meta.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className={`p-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'} grid grid-cols-2 gap-2`}>
              <button onClick={exportCSV} className={`py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.97] ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'}`}>
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={exportGeoJSON} className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all">
                <Download className="w-3.5 h-3.5" /> GeoJSON
              </button>
            </div>
          </aside>
        </>
      )}
      {/* ============================================================
          SCOUT — AI SIGN PLACEMENT ADVISOR
          ============================================================ */}
      <SmartScout
        signs={signs}
        trafficStations={trafficStations}
        intersections={trafficIntersections}
        isDark={isDark}
        recs={scoutRecs}
        setRecs={setScoutRecs}
        searchBar={
          <MapSearchBar
            signs={signs}
            onSelectLocation={handleSearchSelectLocation}
            onSelectSign={(sign) => {
              setSelectedSign(sign);
            }}
            isDark={isDark}
          />
        }
        onSelectRec={(rec) => {
          setSelectedSign(null);
          setSelectedRec(rec);
          setSelectedRecSignType(rec.aadt >= 15000 ? 'large_sign' : 'yard_sign');
        }}
        onFlyTo={(lat, lng) => {
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: is3D ? 55 : 0, duration: 800 });
        }}
        onShowOnMap={async (recs) => {
          const m = mapRef.current;
          if (!m) return;
          const mgl = (await import('maplibre-gl')).default;
          // Clear old scout markers
          scoutMarkersRef.current.forEach(item => item.marker?.remove?.());
          scoutMarkersRef.current = [];
          setScoutRecs(recs);

          // Drop gold preview pins with click handlers
          recs.forEach((rec, i) => {
            const el = document.createElement('div');
            el.className = 'scout-map-marker group';
            el.style.cursor = 'pointer';
            el.style.zIndex = '200';
            el.addEventListener('mouseenter', () => {
              el.style.zIndex = '9999';
              const pin = el.querySelector('.scout-pin-head') as HTMLElement;
              if (pin) {
                pin.style.transform = 'scale(1.15)';
                pin.style.transformOrigin = 'center bottom';
              }
            });
            el.addEventListener('mouseleave', () => {
              el.style.zIndex = '200';
              const pin = el.querySelector('.scout-pin-head') as HTMLElement;
              if (pin) pin.style.transform = 'scale(1)';
            });
            el.innerHTML = `
              <div class="animate-pin-drop" style="animation-delay:${i * 100}ms">
                <div class="relative flex flex-col items-center">
                  <div class="scout-pin-head" style="
                    position: relative;
                    width: 46px;
                    height: 46px;
                    background: linear-gradient(135deg,#f59e0b,#d97706);
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2.5px solid rgba(255,255,255,0.95);
                    box-shadow: 0 4px 20px rgba(245,158,11,0.5),0 2px 4px rgba(0,0,0,0.2);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 10;
                  ">
                    <div class="animate-radar pointer-events-none" style="
                      width: 58px;
                      height: 58px;
                      background: rgba(245,158,11,0.35);
                      z-index: -1;
                    "></div>
                    <span style="color:white;font-size:16px;font-weight:900;text-shadow:0 1px 3px rgba(0,0,0,0.4);">★</span>
                  </div>
                  <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #d97706;margin-top:-1px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));z-index:10;"></div>
                </div>
              </div>`;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              setSelectedSign(null);
              setSelectedRec(rec);
              setSelectedRecSignType(rec.aadt >= 15000 ? 'large_sign' : 'yard_sign');
              m.flyTo({ center: [rec.lng, rec.lat], zoom: 16, pitch: is3D ? 55 : 0, duration: 800 });
            });

            const marker = new mgl.Marker({
              element: el,
              anchor: 'bottom',
              pitchAlignment: 'viewport',
              rotationAlignment: 'viewport',
            }).setLngLat([rec.lng, rec.lat]).addTo(m);
            scoutMarkersRef.current.push({ marker, rank: rec.rank });
          });

          // Fit bounds to show all recommendations
          if (recs.length > 1) {
            const bounds = recs.reduce((b, r) => b.extend([r.lng, r.lat]), new mgl.LngLatBounds([recs[0].lng, recs[0].lat], [recs[0].lng, recs[0].lat]));
            m.fitBounds(bounds, { padding: 80, duration: 1000 });
          }
        }}
        routes={routes}
        onSelectRoute={(route) => {
          setShowRoutesLayer(true);
          setSelectedRoute(route);
          setSelectedSign(null);
          setSelectedMission(null);
          setSelectedPrecinct(null);
          setSelectedCanvassRecord(null);
        }}
        onAssignRoute={(routeId, volunteerName) => {
          assignCanvassRoute(routeId, volunteerName);
          const updated = getStoredCanvassRoutes();
          setRoutes(updated);
          const sel = updated.find(r => r.id === routeId);
          if (sel) setSelectedRoute(sel);
        }}
        onAddRoute={() => {
          setRoutes(getStoredCanvassRoutes());
        }}
        availableVolunteers={availableVolunteersList}
      />

      {/* ============================================================
          VOLUNTEER & PIN DIRECTORY MODAL (Center Pop Card)
          ============================================================ */}
      <VolunteerManagerModal
        isOpen={showVolunteerModal}
        onClose={() => {
          setShowVolunteerModal(false);
          setModalInitialTarget(null);
        }}
        signsCountByVolunteer={signsCountByVolunteer}
        isDark={isDark}
        initialTab={modalInitialTab}
        initialTarget={modalInitialTarget}
      />

      {/* ============================================================
          FIELD FORCE & VOLUNTEER FILTER PANEL (Floating Glass Modal)
          ============================================================ */}
      <VolunteerFilterPanel
        isOpen={isVolunteerFilterOpen}
        onClose={() => setIsVolunteerFilterOpen(false)}
        selectedGroup={selectedVolunteerGroup}
        onSelectGroup={(grp) => {
          setSelectedVolunteerGroup(grp);
          if (grp !== 'all') {
            setShowSignsLayer(true);
            setShowCanvassLayer(true);
            setShowFieldForceLayer(true);
          }
        }}
        selectedVolunteer={selectedVolunteerFilter}
        onSelectVolunteer={(vol) => {
          setSelectedVolunteerFilter(vol);
          if (vol) {
            setShowSignsLayer(true);
            setShowCanvassLayer(true);
            setShowFieldForceLayer(true);
            const ping = volunteerPings.find(p => p.volunteer_name.toLowerCase().trim() === vol.toLowerCase().trim());
            if (ping && mapRef.current) {
              mapRef.current.flyTo({ center: [ping.longitude, ping.latitude], zoom: 16, duration: 1000 });
            }
          }
        }}
        volunteerPings={volunteerPings}
        canvassRecords={canvassRecords}
        signs={signs}
        onFlyToVolunteer={(lat, lng) => {
          setShowSignsLayer(true);
          setShowCanvassLayer(true);
          setShowFieldForceLayer(true);
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 16.5, duration: 1000 });
        }}
      />

      {/* ============================================================
          VOTING PRECINCT DETAIL CARD (Bottom Center slide-up)
          ============================================================ */}
      <PrecinctDetailCard
        precinct={selectedPrecinct}
        signs={signs}
        onClose={() => setSelectedPrecinct(null)}
        onZoomToPrecinct={(p) => {
          mapRef.current?.flyTo({
            center: p.center,
            zoom: 15.2,
            pitch: is3D ? 50 : 0,
            duration: 900,
          });
        }}
        onAssignMission={(p) => {
          setModalInitialTarget({
            title: p.name,
            street_address: p.pollingAddress,
            lat: p.center[1],
            lng: p.center[0],
            signType: 'yard_sign',
            quantity: 5,
            targetType: 'precinct',
          });
          setModalInitialTab('dispatch');
          setShowVolunteerModal(true);
        }}
        isDark={isDark}
      />

      {/* ============================================================
          SELECTED MISSION — DETAIL CARD (Bottom Center slide-up)
          ============================================================ */}
      <MissionDetailCard
        mission={selectedMission}
        onClose={() => setSelectedMission(null)}
        onToggleComplete={(id) => {
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
          if (selectedMission?.id === id) {
            setSelectedMission(prev => prev ? { ...prev, status: prev.status === 'completed' ? 'assigned' : 'completed' } : null);
          }
        }}
        onFlyTo={(lat, lng) => {
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: is3D ? 55 : 0, duration: 800 });
        }}
        isDark={isDark}
      />

      {/* ============================================================
          CANVASS TURF ROUTE DETAIL CARD (Bottom Center slide-up)
          ============================================================ */}
      <RouteDetailCard
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        canvassRecords={canvassRecords}
        onFlyToRoute={(lat, lng) => {
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 16.5, pitch: is3D ? 55 : 0, duration: 900 });
        }}
        onAssignVolunteer={(routeId, volunteerName) => {
          assignCanvassRoute(routeId, volunteerName);
          const updated = getStoredCanvassRoutes();
          setRoutes(updated);
          const sel = updated.find(r => r.id === routeId);
          if (sel) setSelectedRoute(sel);
        }}
        onToggleStatus={(routeId, status) => {
          updateCanvassRouteStatus(routeId, status);
          const updated = getStoredCanvassRoutes();
          setRoutes(updated);
          const sel = updated.find(r => r.id === routeId);
          if (sel) setSelectedRoute(sel);
        }}
        availableVolunteers={availableVolunteersList}
        isDark={isDark}
      />
    </div>
  );
}
