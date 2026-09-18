'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getTrafficData, stationsToGeoJSON, intersectionsToGeoJSON, TrafficStation, Intersection } from '@/lib/trafficData';
import realCorridors from '@/lib/realCorridors.json';
import SmartScout from './components/SmartScout';
import CrewMissionControl from './components/CrewMissionControl';
import MapSearchBar from './components/MapSearchBar';
import PrecinctLeaderboard from './components/PrecinctLeaderboard';
import PrecinctDetailCard from './components/PrecinctDetailCard';
import MissionDetailCard from './components/MissionDetailCard';
import CommandPinGate from './components/CommandPinGate';
import RouteDetailCard from './components/RouteDetailCard';
import MobileVipBar from './components/MobileVipBar';
import BristolFactsCard from './components/BristolFactsCard';
import SignInspectionCard from './components/SignInspectionCard';
import CanvassInspectionCard from './components/CanvassInspectionCard';
import ScoutRecommendationCard from './components/ScoutRecommendationCard';
import CampaignDrawer from './components/CampaignDrawer';
import TacticalMinimap from './components/TacticalMinimap';
import WarRoomSyncModal from './components/WarRoomSyncModal';
import { initRemoteChannel, LiveMode, CommandAction } from '@/lib/remoteCommander';
import { PrecinctInfo, BRISTOL_PRECINCTS, BRISTOL_PRECINCTS_GEOJSON, BRISTOL_ALL_PRECINCTS_BOUNDS, BRISTOL_ALL_PRECINCTS_CENTER } from '@/lib/precinctData';
import { getStoredAssignments, saveStoredAssignments } from '@/lib/assignmentData';
import { getStoredSigns, addPlacedSign, SEED_SIGNS, subscribeSigns } from '@/lib/signData';
import { getStoredCanvassRecords, getStoredVolunteerPings, snapWalkingPathToStreets, SEED_CANVASS_RECORDS } from '@/lib/canvassData';
import { getStoredCanvassRoutes, saveStoredCanvassRoutes, assignCanvassRoute, updateCanvassRouteStatus } from '@/lib/canvassRouteData';
import { Sign, SignType, Recommendation, InventoryStock, VolunteerAssignment, CanvassRecord, VolunteerLocationPing, CanvassRoute } from '@/lib/types';
import { getAppleMapsUrl } from '@/lib/mapUrls';
import { useDraggable } from '@/lib/useDraggable';
import DictateButton from '@/app/components/DictateButton';
import TacticalOnboardingTour, { TourStep } from '@/app/components/TacticalOnboardingTour';

const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-stats-hud, tour-mobile-stats-hud',
    title: 'Live Campaign Stats HUD',
    description: 'Track real-time field performance: total signs deployed, percentage of goal reached, and live door knocks recorded by canvassers across Bristol.',
    accentColor: 'emerald',
    badge: '1. Campaign HUD',
  },
  {
    targetId: 'tour-crew-control',
    title: 'Crew & Mission Control',
    description: 'Your unified command center: track live volunteer GPS locations, manage crew roster & PINs, and dispatch sign missions — all in one panel with 3 easy tabs.',
    accentColor: 'emerald',
    badge: '2. Crew & Missions',
  },
  {
    targetId: 'tour-lock-btn',
    title: 'Lock Command Center',
    description: 'Secures your strategy room. Locks the dashboard behind your 4-digit Campaign Master PIN (2468) when stepping away from your desk.',
    accentColor: 'rose',
    badge: '3. Security Gate',
  },
  {
    targetId: 'tour-drawer-btn',
    title: 'Campaign Intel & Analytics Drawer',
    description: 'Slide open full precinct voting breakdowns, inventory stock management, CSV export, and granular map layer controls.',
    accentColor: 'cyan',
    badge: '4. Campaign Intel',
  },
  {
    targetId: 'tour-recenter-btn',
    title: 'Recenter Map',
    description: 'One tap snaps your camera back to the geographic center of Bristol, TN whenever you pan away.',
    accentColor: 'emerald',
    badge: '5. Recenter',
  },
  {
    targetId: 'tour-3d-btn, tour-orbit-btn',
    title: '3D Tilt & Cinematic Orbit',
    description: 'Angles into a 3D perspective to visualize Bristol terrain. Tap the Rotate button below it to slowly orbit the map in 3D (tap again to reset default view).',
    accentColor: 'emerald',
    badge: '6. 3D & Orbit',
  },
  {
    targetId: 'tour-zoom-btns',
    title: 'Map Zoom Controls',
    description: 'Quickly zoom between street-level yard sign placements and ward-wide regional overview.',
    accentColor: 'cyan',
    badge: '7. Zoom Stack',
  },
  {
    targetId: 'tour-signs-toggle, tour-mobile-signs, tour-mobile-palette-toggle',
    title: 'Yard Signs Radar',
    description: 'Toggle sign markers on the map: always displays filter labels with glowing color pills when on. Tap to switch between compact smart pill badges and full pin markers.',
    accentColor: 'emerald',
    badge: '8. Sign Radar',
  },
  {
    targetId: 'tour-missions-layer',
    title: 'Target Missions Layer',
    description: 'Toggle purple target rings to see active high-priority dispatch missions deployed across Bristol with live progress tracking.',
    accentColor: 'purple',
    badge: '9. Missions Layer',
  },
  {
    targetId: 'tour-canvass-layer, tour-mobile-doors',
    title: 'Canvass Knocks & Flyers',
    description: 'Display teal footprint pins for every household visited, literature flyer dropped, and voter sentiment recorded by the walk team.',
    accentColor: 'teal',
    badge: '10. Canvass Doors',
  },
  {
    targetId: 'tour-field-ops, tour-mobile-field-ops',
    title: 'Field Ops & Turf Routes',
    description: 'Live GPS volunteer tracks, walking breadcrumbs, and assigned canvass neighborhood walking loops.',
    accentColor: 'emerald',
    badge: '11. Field Force',
  },
  {
    targetId: 'tour-precincts-layer, tour-mobile-precincts',
    title: 'Voting Precincts & Wards',
    description: 'Color-coded boundaries for all 12 Bristol voting precincts with turnout history and sign density benchmarks.',
    accentColor: 'emerald',
    badge: '12. Precincts',
  },
  {
    targetId: 'tour-boundary',
    title: 'Bristol TN City Boundary',
    description: 'Toggles the official Bristol, TN municipal border outline. Click to explore key city stats, square mileage, and geographic perimeter.',
    accentColor: 'cyan',
    badge: '13. City Boundary',
  },
  {
    targetId: 'tour-corridors-layer',
    title: 'TDOT Traffic Corridors (AADT)',
    description: 'Traffic heat-map layer displaying Annual Average Daily Traffic counts along major arterials to prioritize high-dwell commuter visibility.',
    accentColor: 'amber',
    badge: '14. Traffic Corridors',
  },
  {
    targetId: 'tour-heatmap-layer, tour-mobile-heatmap',
    title: 'Sign Density Heatmap',
    description: 'High-visibility visual gradient showing campaign saturation hot spots versus underserved neighborhoods across Bristol.',
    accentColor: 'rose',
    badge: '15. Heatmap',
  },
  {
    targetId: 'tour-map-search',
    title: 'Address & Voter Search',
    description: 'Quickly find any Bristol street address, intersection, or voter location and jump the camera directly there.',
    accentColor: 'cyan',
    badge: '16. Map Search',
  },
  {
    targetId: 'tour-scout-ai',
    title: 'Scout AI Strategic Advisor',
    description: 'Autonomous AI cross-references TDOT traffic volume with sign gaps to generate short, actionable placement recommendations and 1-tap dispatching.',
    accentColor: 'amber',
    badge: '17. Scout AI',
  },
  {
    targetId: 'tour-minimap-hud, tour-minimap-toggle',
    title: 'Tactical Radar Minimap HUD',
    description: 'Square bird’s-eye radar in the bottom-left showing color-coded asset dots and a live dynamic camera bounding box that tracks your exact viewport when zoomed into street view. Click anywhere to teleport!',
    accentColor: 'cyan',
    badge: '18. Radar HUD',
  },
];

const DASHBOARD_MOBILE_STEPS: TourStep[] = [
  {
    targetId: 'tour-mobile-stats-hud',
    title: 'Live VIP SitRep Pulse',
    description: 'Instant glance at campaign operations: our yard signs, opponent sign intelligence, and total doors knocked across Bristol.',
    accentColor: 'emerald',
    badge: '1. VIP METRICS',
    icon: '⚡',
  },
  {
    targetId: 'tour-mobile-nav-pod',
    title: 'Navigation, 3D & Slow Orbit',
    description: 'Tap compass to snap to Bristol HQ, 3D for terrain tilt, or Rotate to slowly orbit the map in 3D. Tap again to jump back to default view.',
    accentColor: 'teal',
    badge: '2. NAVIGATION',
    icon: '🧭',
  },
  {
    targetId: 'tour-mobile-palette-toggle',
    title: 'Field Layers Palette',
    description: 'Tap this icon to expand quick map toggles: switch between yard signs, opponent intel, canvass doors, voter wards, and traffic heatmaps.',
    accentColor: 'cyan',
    badge: '3. MAP LAYERS',
    icon: '🗺️',
  },
  {
    targetId: 'tour-mobile-drawer-header',
    title: 'VIP SitRep & Precinct Intel',
    description: 'Slide up this bottom tray to review voting precinct turnout, ground force activity, and filter maps by neighborhood.',
    accentColor: 'purple',
    badge: '4. SITREP INTEL',
    icon: '📊',
  },
];

import {
  Vote,
  Users,
  Target,
  Download,
  Layers,
  Building2,
  Landmark,
  TrendingUp,
  RefreshCw,
  Search,
  Sun,
  Moon,
  Navigation,
  X,
  SlidersHorizontal,
  MapPin,
  Home,
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
  RotateCw,
  Flame,
  Check,
  Package,
  Plus,
  Minus,
  CircleDot,
  Lock,
  Compass,
  Radio,
} from 'lucide-react';

/* ================================================================
   CONSTANTS
   ================================================================ */
const BRISTOL_CENTER: [number, number] = [-82.1887, 36.5951];

const DEFAULT_INVENTORY_STOCK: InventoryStock = {
  yard_sign: 50,
  large_sign: 10,
  banner: 5,
  billboard: 2,
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

  // Security Gate Authentication
  const [isCommandAuthorized, setIsCommandAuthorized] = useState<boolean>(false);
  const [checkedAuth, setCheckedAuth] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth =
        sessionStorage.getItem('campaignos_field_command_auth') === 'true' ||
        localStorage.getItem('campaignos_field_command_auth') === 'true' ||
        sessionStorage.getItem('wardrunner_field_command_auth') === 'true' ||
        localStorage.getItem('wardrunner_field_command_auth') === 'true';
      setIsCommandAuthorized(isAuth);
      setCheckedAuth(true);
    }
  }, []);

  const handleLockCommand = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('campaignos_field_command_auth');
      sessionStorage.removeItem('wardrunner_field_command_auth');
      localStorage.removeItem('campaignos_field_command_auth');
      localStorage.removeItem('wardrunner_field_command_auth');
    }
    setIsCommandAuthorized(false);
    setIsTourOpen(false);
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
  const [showMinimap, setShowMinimap] = useState(true);
  const [isScoutExpanded, setIsScoutExpanded] = useState(false);
  const [radarWasOpenBeforeScout, setRadarWasOpenBeforeScout] = useState(true);

  // Load minimap visibility preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('campaignos_minimap_visible');
      if (saved !== null) {
        const val = saved === 'true';
        setShowMinimap(val);
        setRadarWasOpenBeforeScout(val);
      }
    } catch {}
  }, []);

  const handleToggleMinimap = useCallback((open: boolean) => {
    setShowMinimap(open);
    if (open) {
      setIsScoutExpanded(false); // If radar is opened, collapse Scout
    }
    try {
      localStorage.setItem('campaignos_minimap_visible', String(open));
    } catch {}
  }, []);

  const handleScoutExpandChange = useCallback((expanded: boolean) => {
    setIsScoutExpanded(expanded);
    if (expanded) {
      // Auto-collapse radar when Scout opens
      setShowMinimap((prev) => {
        setRadarWasOpenBeforeScout(prev);
        return false;
      });
    } else {
      // Restore radar when Scout collapses if it was open before
      if (radarWasOpenBeforeScout) {
        setShowMinimap(true);
      }
    }
  }, [radarWasOpenBeforeScout]);

  // Global hotkey 'M' to toggle Tactical Radar Minimap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        setShowMinimap((prev) => {
          const next = !prev;
          if (next) {
            setIsScoutExpanded(false);
          }
          try {
            localStorage.setItem('campaignos_minimap_visible', String(next));
          } catch {}
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ================================================================
  // WAR ROOM PRESENTATION SYNC (Remote Commander via WebSockets)
  // ================================================================
  const [liveMode, setLiveMode] = useState<LiveMode>('off');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [showWarRoomModal, setShowWarRoomModal] = useState<boolean>(false);
  const remoteSenderRef = useRef<((action: CommandAction) => void) | null>(null);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastBroadcastCameraTime = useRef<number>(0);

  // Auto-detect ?live= query parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const liveParam = params.get('live');
      if (liveParam === 'commander' || liveParam === 'host' || liveParam === 'pilot') {
        setLiveMode('commander');
      } else if (liveParam === 'display' || liveParam === 'sync' || liveParam === 'viewer' || liveParam === 'war_room') {
        setLiveMode('display');
      }
    }
  }, []);

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
  const [crewPanelInitialTab, setCrewPanelInitialTab] = useState<'tracker' | 'roster' | 'missions'>('tracker');
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

  // Stand Alone Bristol Overlay Facts Card State
  const [showBristolFacts, setShowBristolFacts] = useState(false);
  const bristolWatermarkRef = useRef<any>(null);

  // Signs Layer Toggle (Defaults to off per user preference)
  const [showSignsLayer, setShowSignsLayer] = useState(false);

  // Street-Level Precision Micro Dot Mode
  const [useDotMode, setUseDotMode] = useState(true);

  // Ground Campaign & Field Force State
  const [canvassRecords, setCanvassRecords] = useState<CanvassRecord[]>([]);
  const [volunteerPings, setVolunteerPings] = useState<VolunteerLocationPing[]>([]);
  const [showCanvassLayer, setShowCanvassLayer] = useState(false);
  const [showFieldForceLayer, setShowFieldForceLayer] = useState(false);
  const [isCrewPanelOpen, setIsCrewPanelOpen] = useState(false);
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

  // Draggable popup cards on desktop
  const signDrag = useDraggable();
  const canvassDrag = useDraggable();
  const recDrag = useDraggable();

  useEffect(() => {
    if (selectedSign) signDrag.resetPosition();
  }, [selectedSign?.id]);

  useEffect(() => {
    if (selectedCanvassRecord) canvassDrag.resetPosition();
  }, [selectedCanvassRecord?.id]);

  useEffect(() => {
    if (selectedRec) recDrag.resetPosition();
  }, [selectedRec?.rank]);

  const handleToggleCanvassLayer = useCallback((force?: boolean) => {
    const next = force !== undefined ? force : !showCanvassLayer;
    setShowCanvassLayer(next);
    if (next) {
      setShowFieldForceLayer(true);
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [-82.1953, 36.5852],
          zoom: 16.2,
          pitch: is3D ? 45 : 0,
          duration: 900,
        });
      }
    }
  }, [showCanvassLayer, is3D]);

  // Drawer Active Tab ('signs' | 'inventory' | 'precincts' | 'missions')
  const [drawerTab, setDrawerTab] = useState<'signs' | 'inventory' | 'precincts'>('signs');

  // Load saved inventory stock and dispatched assignments from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('campaignos_inventory_stock') || localStorage.getItem('wardrunner_inventory_stock');
      if (saved) setInventoryStock(JSON.parse(saved));
    } catch {}

    const loadAssigns = () => {
      setAssignments(getStoredAssignments());
    };
    loadAssigns();
    window.addEventListener('campaignos_assignments_updated', loadAssigns);
    window.addEventListener('wardrunner_assignments_updated', loadAssigns);

    // Ground Campaign Data Loaders
    const loadGroundData = async () => {
      const localRecords = getStoredCanvassRecords();
      setCanvassRecords(localRecords);
      setVolunteerPings(getStoredVolunteerPings());

      try {
        const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-publishable-key');
        if (!isPlaceholder) {
          const { data, error } = await supabase.from('canvass_records').select('*').order('created_at', { ascending: false });
          if (data && data.length > 0 && !error) {
            const canonicalMap = new Map(SEED_CANVASS_RECORDS.slice(0, 5).map(s => [s.id, s]));
            const sanitized = data.map((d: any) => {
              if (canonicalMap.has(d.id)) {
                const seed = canonicalMap.get(d.id)!;
                return {
                  ...d,
                  latitude: seed.latitude,
                  longitude: seed.longitude,
                  street_address: seed.street_address,
                };
              }
              return d;
            });
            const localIds = new Set(sanitized.map((d: any) => d.id));
            const onlyLocal = localRecords.filter(s => !localIds.has(s.id));
            const merged = [...onlyLocal, ...sanitized];
            setCanvassRecords(merged);
          }
        }
      } catch (err) {
        console.warn('Remote canvass records sync offline/deferred:', err);
      }
    };
    loadGroundData();
    window.addEventListener('campaignos_canvass_updated', loadGroundData);
    window.addEventListener('campaignos_pings_updated', loadGroundData);
    window.addEventListener('wardrunner_canvass_updated', loadGroundData);
    window.addEventListener('wardrunner_pings_updated', loadGroundData);

    // Canvass Routes Data Loader
    const loadRoutes = () => {
      setRoutes(getStoredCanvassRoutes());
    };
    loadRoutes();
    window.addEventListener('campaignos_routes_updated', loadRoutes);
    window.addEventListener('wardrunner_routes_updated', loadRoutes);

    // Poll ground data every 8s for live field updates
    const groundInterval = setInterval(loadGroundData, 8000);

    return () => {
      window.removeEventListener('campaignos_assignments_updated', loadAssigns);
      window.removeEventListener('wardrunner_assignments_updated', loadAssigns);
      window.removeEventListener('campaignos_canvass_updated', loadGroundData);
      window.removeEventListener('campaignos_pings_updated', loadGroundData);
      window.removeEventListener('wardrunner_canvass_updated', loadGroundData);
      window.removeEventListener('wardrunner_pings_updated', loadGroundData);
      window.removeEventListener('campaignos_routes_updated', loadRoutes);
      window.removeEventListener('wardrunner_routes_updated', loadRoutes);
      clearInterval(groundInterval);
    };
  }, []);

  const updateStockQuantity = (type: keyof InventoryStock, delta: number) => {
    setInventoryStock(prev => {
      const next = { ...prev, [type]: Math.max(0, prev[type] + delta) };
      try { localStorage.setItem('campaignos_inventory_stock', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'ours' | 'theirs'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth < 768;
      setIsMobileScreen(isMob);
      if (isMob) setIsTourOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-launch Onboarding Briefing for first-time dashboard visitors ONLY AFTER successful PIN login (Desktop only)
  useEffect(() => {
    if (!checkedAuth || !isCommandAuthorized) return;
    if (isMobileScreen || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    try {
      const key = 'campaignos_tour_completed_dashboard_v1';
      const seen = localStorage.getItem(key) || localStorage.getItem('wardrunner_tour_completed_wardrunner_dashboard_tour_v1');
      if (!seen) {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [checkedAuth, isCommandAuthorized, isMobileScreen]);

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
    window.addEventListener('campaignos_signs_updated', handleSignsSync);
    window.addEventListener('wardrunner_signs_updated', handleSignsSync);
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'campaignos_signs_data' ||
        e.key === 'campaignos_signs_ping' ||
        e.key === 'wardrunner_signs_data' ||
        e.key === 'wardrunner_signs_ping'
      ) {
        handleSignsSync();
      }
    };
    // Remote Supabase real-time updates across volunteer devices
    const unsubscribeRemote = subscribeSigns((remoteSigns) => {
      if (remoteSigns && remoteSigns.length > 0) {
        setSigns(remoteSigns);
      }
    });

    // Background refresh fallback for field drops
    const signInterval = setInterval(fetchSigns, 10000);

    return () => {
      window.removeEventListener('campaignos_signs_updated', handleSignsSync);
      window.removeEventListener('wardrunner_signs_updated', handleSignsSync);
      window.removeEventListener('storage', handleStorage);
      unsubscribeRemote();
      clearInterval(signInterval);
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

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const initialCenter: [number, number] = isMobile ? BRISTOL_ALL_PRECINCTS_CENTER : BRISTOL_CENTER;
      const initialZoom = isMobile ? 11.4 : 13.2;

      const map = new mgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[theme],
        center: initialCenter,
        zoom: initialZoom,
        pitch: is3D ? (isMobile ? 32 : 52) : 0,
        bearing: is3D ? (isMobile ? -10 : -15) : 0,
        attributionControl: false,
      } as any);

      map.addControl(new mgl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        if (!alive) return;
        try { map.resize(); } catch {}

        if (isMobile) {
          try {
            map.fitBounds(BRISTOL_ALL_PRECINCTS_BOUNDS, {
              padding: { top: 95, bottom: 85, left: 24, right: 64 },
              maxZoom: 12.0,
              duration: 0,
            });
          } catch {}
        }

        /* --- Brighten & Enlarge Street Name Labels on Dark Basemap --- */
        try {
          const layers = map.getStyle().layers || [];
          for (const layer of layers) {
            if ((layer as any).type === 'symbol' && (layer as any).layout?.['text-field']) {
              const id = (layer as any).id as string;
              try { map.setPaintProperty(id, 'text-color', '#e2e8f0'); } catch {}
              try { map.setPaintProperty(id, 'text-halo-color', 'rgba(0,0,0,0.95)'); } catch {}
              try { map.setPaintProperty(id, 'text-halo-width', 2); } catch {}
              // Scale up street labels — larger when zoomed in
              try {
                map.setLayoutProperty(id, 'text-size', [
                  'interpolate', ['linear'], ['zoom'],
                  10, 10,
                  13, 13,
                  15, 16,
                  17, 20,
                  19, 26,
                ]);
              } catch {}
            }
          }
        } catch {}

        /* --- AADT corridor glow lines (Real Road Geometry — Gradient Fade) --- */
        // Each feature needs its own source for line-gradient to work
        const corridorFeatures = (realCorridors as any).features || [];
        corridorFeatures.forEach((feature: any, idx: number) => {
          const srcId = `corridor-src-${idx}`;
          const color = feature.properties?.color || '#f59e0b';
          
          map.addSource(srcId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [feature] },
            lineMetrics: true,
          });

          // Outer glow — wide, blurred, fades at both ends
          map.addLayer({
            id: `corridor-glow-${idx}`,
            type: 'line',
            source: srcId,
            layout: { 'line-cap': 'butt', 'line-join': 'round' },
            paint: {
              'line-width': 14,
              'line-blur': 8,
              'line-opacity': isDark ? 0.25 : 0.15,
              'line-gradient': [
                'interpolate', ['linear'], ['line-progress'],
                0, 'transparent',
                0.08, color,
                0.92, color,
                1, 'transparent',
              ],
            },
          });

          // Core line — solid color, fades at ends
          map.addLayer({
            id: `corridor-core-${idx}`,
            type: 'line',
            source: srcId,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-width': 3.5,
              'line-opacity': 1,
              'line-gradient': [
                'interpolate', ['linear'], ['line-progress'],
                0, 'transparent',
                0.06, color,
                0.94, color,
                1, 'transparent',
              ],
            },
          });

          // Inner highlight — white center glow, fades at ends
          map.addLayer({
            id: `corridor-inner-${idx}`,
            type: 'line',
            source: srcId,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-width': 1.2,
              'line-opacity': 0.5,
              'line-gradient': [
                'interpolate', ['linear'], ['line-progress'],
                0, 'transparent',
                0.1, 'rgba(255,255,255,0.6)',
                0.9, 'rgba(255,255,255,0.6)',
                1, 'transparent',
              ],
            },
          });
        });

        // Alias the first corridor-core for hover/visibility (backwards compat)
        map.addSource('corridors', {
          type: 'geojson',
          data: realCorridors as any,
        });
        map.addLayer({ id: 'corridor-core', type: 'line', source: 'corridors', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': 'transparent', 'line-width': 12, 'line-opacity': 0 } });

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
            'line-color': '#a855f7',
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
            'line-color': '#c084fc',
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
              setSelectedMission(null);
              setSelectedRoute(null);
              setShowBristolFacts(false);
              setSelectedPrecinct(found);
            }
          });
        } catch {}

        // Stand Alone Bristol Overlay hover and click to inspect Bristol Facts
        try {
          map.on('mouseenter', 'boundary-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'boundary-fill', () => {
            map.getCanvas().style.cursor = '';
          });
          map.on('click', 'boundary-fill', (e: any) => {
            // Check if user clicked an active precinct feature
            const bbox: [[number, number], [number, number]] = [
              [e.point.x - 4, e.point.y - 4],
              [e.point.x + 4, e.point.y + 4],
            ];
            const pLayer = map.getLayer('precincts-fill');
            const isPrecinctsVis = pLayer && map.getLayoutProperty('precincts-fill', 'visibility') !== 'none';
            const precinctFeatures = isPrecinctsVis ? map.queryRenderedFeatures(bbox, { layers: ['precincts-fill'] }) : [];
            if (precinctFeatures.length > 0) return; // handled by precincts-fill

            setSelectedSign(null);
            setSelectedRec(null);
            setSelectedPrecinct(null);
            setSelectedMission(null);
            setSelectedRoute(null);
            setShowBristolFacts(true);
          });

          map.on('mouseenter', 'boundary-line', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'boundary-line', () => {
            map.getCanvas().style.cursor = '';
          });
          map.on('click', 'boundary-line', () => {
            setSelectedSign(null);
            setSelectedRec(null);
            setSelectedPrecinct(null);
            setSelectedMission(null);
            setSelectedRoute(null);
            setShowBristolFacts(true);
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
            setSelectedMission(null);
            setSelectedRoute(null);
            setShowBristolFacts(false);
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

        // Bristol City Boundary Watermark Marker (Interactive Chip)
        if (bristolWatermarkRef.current) {
          try { bristolWatermarkRef.current.remove(); } catch {}
          bristolWatermarkRef.current = null;
        }
        const bristolBadgeEl = document.createElement('div');
        bristolBadgeEl.className = 'bristol-boundary-badge';
        bristolBadgeEl.style.zIndex = '6';
        bristolBadgeEl.style.cursor = 'pointer';
        bristolBadgeEl.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 9999px;
            background: rgba(14, 165, 233, 0.18);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(56, 189, 248, 0.5);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
            color: #38bdf8;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.02em;
            transition: transform 0.2s ease, opacity 0.2s ease;
          ">
            <span>🏛️</span>
            <span>Bristol, TN</span>
            <span style="font-size: 11px; opacity: 0.85; font-weight: 800; text-transform: uppercase;">Facts</span>
          </div>
        `;
        bristolBadgeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(null);
          setSelectedRec(null);
          setSelectedPrecinct(null);
          setSelectedMission(null);
          setSelectedRoute(null);
          setShowBristolFacts(true);
        });
        bristolWatermarkRef.current = new mgl.Marker({
          element: bristolBadgeEl,
          anchor: 'center',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        }).setLngLat([-82.188, 36.612]).addTo(map);

        setMapReady(true);
      });

      map.on('click', (e: any) => {
        // 1. Check if user clicked an active precinct
        const pLayer = map.getLayer('precincts-fill');
        const isPrecinctVis = pLayer && map.getLayoutProperty('precincts-fill', 'visibility') !== 'none';
        if (isPrecinctVis) {
          const precinctFeatures = map.queryRenderedFeatures(e.point, { layers: ['precincts-fill'] });
          if (precinctFeatures.length > 0) {
            const code = precinctFeatures[0].properties?.code;
            const found = BRISTOL_PRECINCTS.find((pr) => pr.code === code);
            if (found) {
              setSelectedSign(null);
              setSelectedRec(null);
              setSelectedMission(null);
              setSelectedRoute(null);
              setShowBristolFacts(false);
              setSelectedPrecinct(found);
              return;
            }
          }
        }

        // 2. Check if user clicked the Bristol boundary overlay (when boundary is visible!)
        const bLayer = map.getLayer('boundary-fill');
        const isBoundaryVis = bLayer && map.getLayoutProperty('boundary-fill', 'visibility') !== 'none';
        if (isBoundaryVis) {
          const bbox: [[number, number], [number, number]] = [
            [e.point.x - 6, e.point.y - 6],
            [e.point.x + 6, e.point.y + 6],
          ];
          const boundaryFeatures = map.queryRenderedFeatures(bbox, {
            layers: ['boundary-fill', 'boundary-line'].filter(id => map.getLayer(id)),
          });
          if (boundaryFeatures.length > 0) {
            setSelectedSign(null);
            setSelectedRec(null);
            setSelectedPrecinct(null);
            setSelectedMission(null);
            setSelectedRoute(null);
            setShowBristolFacts(true);
            return;
          }
        }

        // 3. User clicked outside overlays -> dismiss cards
        setSelectedSign(null);
        setSelectedRec(null);
        setSelectedPrecinct(null);
        setShowBristolFacts(false);
      });

      map.on('mousemove', (e: any) => {
        const pLayer = map.getLayer('precincts-fill');
        const isPrecinctVis = pLayer && map.getLayoutProperty('precincts-fill', 'visibility') !== 'none';
        const bLayer = map.getLayer('boundary-fill');
        const isBoundaryVis = bLayer && map.getLayoutProperty('boundary-fill', 'visibility') !== 'none';

        const layersToCheck: string[] = [];
        if (isPrecinctVis) layersToCheck.push('precincts-fill');
        if (isBoundaryVis) layersToCheck.push('boundary-fill', 'boundary-line');

        if (layersToCheck.length === 0) {
          map.getCanvas().style.cursor = '';
          return;
        }

        const bbox: [[number, number], [number, number]] = [
          [e.point.x - 3, e.point.y - 3],
          [e.point.x + 3, e.point.y + 3],
        ];
        const features = map.queryRenderedFeatures(bbox, { layers: layersToCheck });
        map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
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
    const vVis = (showFieldForceLayer || showCanvassLayer) ? 'visible' : 'none';
    const rVis = (showRoutesLayer || selectedRoute) ? 'visible' : 'none';
    ['boundary-fill', 'boundary-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', bVis));
    if (bristolWatermarkRef.current) {
      bristolWatermarkRef.current.getElement().style.display = showBoundary ? 'block' : 'none';
    }
    ['corridor-core'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', cVis));
    // Toggle per-feature gradient corridor layers
    for (let i = 0; i < 10; i++) {
      [`corridor-glow-${i}`, `corridor-core-${i}`, `corridor-inner-${i}`].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', cVis));
    }
    ['campaign-signs-heatmap'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', hVis));
    ['precincts-fill', 'precincts-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', pVis));
    ['volunteer-trails-glow', 'volunteer-trails-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', vVis));
    ['canvass-turf-glow', 'canvass-turf-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', rVis));
  }, [showBoundary, showCorridors, showHeatmap, showPrecincts, showFieldForceLayer, showCanvassLayer, showRoutesLayer, selectedRoute, mapReady]);

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

  /* ---------- Campaign Field Footprint Heatmap Layer ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    (async () => {
      const addHeatmap = () => {
        const signFeatures = signs
          .filter(s => s.status === 'placed' && !s.is_competitor)
          .map(s => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [+s.longitude, +s.latitude] },
            properties: {
              weight: s.sign_type === 'large_sign' || s.sign_type === 'banner' ? 3.0 : 1.8,
            },
          }));

        const canvassFeatures = canvassRecords.map(rec => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [+rec.longitude, +rec.latitude] },
          properties: {
            weight: rec.result === 'contact' ? 2.4 : 1.2,
          },
        }));

        const geojsonData = {
          type: 'FeatureCollection',
          features: [...signFeatures, ...canvassFeatures],
        };

        if (m.getSource('campaign-signs-heat')) {
          (m.getSource('campaign-signs-heat') as any).setData(geojsonData);
          return;
        }

        m.addSource('campaign-signs-heat', { type: 'geojson', data: geojsonData as any });

        // Place heatmap UNDER precinct boundaries and road cores so the map stays 100% sharp and readable
        const beforeLayer = m.getLayer('precincts-line') ? 'precincts-line' : m.getLayer('corridor-core') ? 'corridor-core' : undefined;

        m.addLayer({
          id: 'campaign-signs-heatmap',
          type: 'heatmap',
          source: 'campaign-signs-heat',
          maxzoom: 17,
          paint: {
            // Point weight scaling
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 1, 0.4, 3, 1],

            // Intensify heat smoothly with zoom
            'heatmap-intensity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0.9,
              13, 1.9,
              16, 2.7
            ],

            // Vibrant multi-stop electric neon spectrum with smooth alpha:
            // 0: transparent (reveals basemap)
            // 0.12: electric cyan / sky blue aura
            // 0.32: radiant neon emerald
            // 0.52: solar amber gold
            // 0.72: blazing neon orange
            // 0.88: hot crimson red
            // 1.0: white-hot center core
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.12, 'rgba(6, 182, 212, 0.40)',
              0.32, 'rgba(16, 185, 129, 0.70)',
              0.52, 'rgba(245, 158, 11, 0.85)',
              0.72, 'rgba(249, 115, 22, 0.92)',
              0.88, 'rgba(239, 68, 68, 0.96)',
              1.0, 'rgba(255, 255, 255, 0.98)'
            ],

            // Expanding radius for gorgeous ambient blend across neighborhoods
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 24,
              13, 42,
              16, 58
            ],

            // Calibrated opacity: vibrant yet translucent so street grid & roads shine through
            'heatmap-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11, 0.82,
              14, 0.70,
              16, 0.55
            ],
          },
        }, beforeLayer);

        const hVis = showHeatmap ? 'visible' : 'none';
        if (m.getLayer('campaign-signs-heatmap')) {
          m.setLayoutProperty('campaign-signs-heatmap', 'visibility', hVis);
        }
      };

      if (m.isStyleLoaded()) addHeatmap();
      else m.on('load', addHeatmap);
    })();
  }, [signs, canvassRecords, theme, mapReady, showHeatmap]);

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
          // Smart Pill Badge — compact but type-identifiable
          const pillW = isSel ? 40 : 34;
          const pillH = isSel ? 22 : 18;
          const fontSize = isSel ? 11 : 9.5;
          el.innerHTML = `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              ${isSel ? `
                <div class="animate-radar" style="
                  width: ${pillW + 14}px;
                  height: ${pillW + 14}px;
                  background: ${glowColor};
                  border: 2px solid #ffffff;
                "></div>
              ` : ''}

              <div class="street-dot" style="
                width: ${pillW}px;
                height: ${pillH}px;
                border-radius: 10px;
                background: linear-gradient(135deg, ${bgColor}, ${bgColorDark});
                border: 1.5px solid rgba(255,255,255,0.9);
                box-shadow: 0 0 8px ${glowColor}, 0 1px 4px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                position: relative;
                z-index: 10;
              ">
                <span style="
                  color: white;
                  font-size: ${fontSize}px;
                  font-weight: 900;
                  letter-spacing: 0.3px;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
                  line-height: 1;
                ">${pinLabel}</span>
              </div>

              ${/* Hover Tooltip */''}
              <div class="
                hidden group-hover:flex
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                flex-col items-center pointer-events-none z-50
              ">
                <div style="
                  background: rgba(15,23,42,0.94);
                  backdrop-filter: blur(12px);
                  border-radius: 10px;
                  padding: 6px 10px;
                  white-space: nowrap;
                  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                  border: 1px solid rgba(255,255,255,0.1);
                ">
                  <div style="color:white;font-size:11px;font-weight:800;line-height:1.3;">${tooltipName}</div>
                  <div style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:600;margin-top:1px;">${tooltipType}</div>
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
                padding: 2.5px 8px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 0.5px;
                white-space: nowrap;
                box-shadow: 0 4px 14px rgba(0,0,0,0.5);
                margin-bottom: 3.5px;
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span style="color: ${isCritical ? '#fda4af' : isHigh ? '#fde68a' : '#c084fc'}; font-size: 11px;">🎯</span>
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

  /* ---------- Ground Canvass Markers (House Pins) ---------- */
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

        const bg = isContact ? '#9333ea' : isFlyer ? '#d97706' : '#475569';
        const bgDark = isContact ? '#7e22ce' : isFlyer ? '#b45309' : '#334155';
        const glowColor = isContact ? 'rgba(147, 51, 234, 0.45)' : isFlyer ? 'rgba(245, 158, 11, 0.45)' : 'rgba(100, 116, 139, 0.4)';
        const label = isContact ? (rec.sentiment ? rec.sentiment.replace('_', ' ').toUpperCase() : 'CONTACT') : isFlyer ? 'FLYER' : 'NO CONTACT';
        const houseLabel = rec.street_address ? rec.street_address.split(',')[0] : 'House';

        if (useDotMode) {
          el.innerHTML = `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;width:22px;height:22px;" title="${rec.street_address || 'Canvass Stop'} · ${label}">
              <div style="width:12px;height:12px;border-radius:4px;background:${bg};border:2px solid #ffffff;box-shadow:0 0 10px ${bg};"></div>
            </div>
          `;
        } else {
          el.innerHTML = `
            <div class="canvass-house-marker flex flex-col items-center group cursor-pointer" style="width: 44px; position: relative;">
              <!-- Top Address & Outcome Badge -->
              <div style="
                position: absolute;
                bottom: 46px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 3px 8px;
                border-radius: 9999px;
                font-size: 10px;
                font-weight: 800;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                border: 1.5px solid ${bg};
                display: flex;
                align-items: center;
                gap: 5px;
                letter-spacing: 0.2px;
                pointer-events: none;
              ">
                <span style="font-size: 11px;">🏠</span>
                <span style="color: #f1f5f9;">${houseLabel}</span>
                <span style="
                  background: ${bg};
                  color: white;
                  font-size: 11px;
                  font-weight: 900;
                  padding: 1.5px 6px;
                  border-radius: 6px;
                  text-transform: uppercase;
                ">${label}</span>
              </div>

              <!-- House Silhouette Pin Head -->
              <div class="house-pin-head" style="
                width: 38px;
                height: 38px;
                background: linear-gradient(135deg, ${bg}, ${bgDark});
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2.5px solid rgba(255, 255, 255, 0.95);
                box-shadow: 0 4px 14px ${glowColor}, 0 2px 4px rgba(0,0,0,0.25);
                position: relative;
                transform-origin: center bottom;
                transform: ${isSel ? 'scale(1.2)' : 'scale(1)'};
                transition: transform 0.15s ease;
              ">
                <!-- Pulse radar ring -->
                <div class="animate-radar pointer-events-none" style="width: 38px; height: 38px; background: ${glowColor}; z-index: -1;"></div>

                <!-- House SVG Icon -->
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>

              <!-- Pin Pointer to ground -->
              <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 7px solid ${bgDark};
                margin-top: -1px;
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
              "></div>
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
          anchor: 'bottom',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        }).setLngLat([rec.longitude, rec.latitude]).addTo(m);

        canvassMarkersRef.current.push({ marker, id: rec.id });
      });
    })();
  }, [canvassRecords, showCanvassLayer, selectedVolunteerFilter, selectedVolunteerGroup, selectedCanvassRecord, useDotMode, mapReady]);

  /* ---------- Live Volunteer Markers & Walking Trails ---------- */
  useEffect(() => {
    (async () => {
      const m = mapRef.current;
      if (!m) return;
      const mgl = (await import('maplibre-gl')).default;

      volunteerMarkersRef.current.forEach(item => item.marker?.remove?.());
      volunteerMarkersRef.current = [];

      const trailFeatures: any[] = [];

      if (showFieldForceLayer || showCanvassLayer) {
        // 1. Trails from volunteer GPS pings (e.g. Sarah Jenkins on Anderson St, Marcus Taylor on Virginia Ave)
        for (const vol of volunteerPings) {
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
          }
        }

        // 2. Also construct breadcrumb trails connecting all knocked houses for each volunteer
        const knocksByVol = new Map<string, CanvassRecord[]>();
        canvassRecords.forEach(rec => {
          const name = rec.volunteer_name || 'Volunteer';
          if (!knocksByVol.has(name)) knocksByVol.set(name, []);
          knocksByVol.get(name)!.push(rec);
        });

        for (const [name, knocks] of knocksByVol.entries()) {
          const hasPingTrail = volunteerPings.some(p => p.volunteer_name.toLowerCase().trim() === name.toLowerCase().trim() && p.breadcrumbs && p.breadcrumbs.length >= 2);
          if (hasPingTrail) continue;

          if (knocks.length >= 2) {
            const sorted = [...knocks].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const coords: [number, number][] = sorted.map(k => [k.longitude, k.latitude]);
            const streetCoords = await snapWalkingPathToStreets(coords);
            trailFeatures.push({
              type: 'Feature',
              properties: { volunteer_name: name },
              geometry: {
                type: 'LineString',
                coordinates: streetCoords,
              },
            });
          }
        }

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
            setCrewPanelInitialTab('tracker'); setIsCrewPanelOpen(true);
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
  }, [volunteerPings, canvassRecords, showFieldForceLayer, showCanvassLayer, selectedVolunteerFilter, selectedVolunteerGroup, mapReady]);

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
  const [isOrbiting, setIsOrbiting] = useState(false);
  const isOrbitingRef = useRef(false);
  const orbitAnimRef = useRef<number | null>(null);

  const stopOrbitAndResetDefault = useCallback(() => {
    isOrbitingRef.current = false;
    setIsOrbiting(false);
    if (orbitAnimRef.current) {
      cancelAnimationFrame(orbitAnimRef.current);
      orbitAnimRef.current = null;
    }
    setIs3D(false);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      mapRef.current?.fitBounds(BRISTOL_ALL_PRECINCTS_BOUNDS, {
        padding: { top: 95, bottom: 85, left: 24, right: 64 },
        pitch: 0,
        bearing: 0,
        maxZoom: 12.0,
        duration: 900,
      });
    } else {
      mapRef.current?.flyTo({
        center: BRISTOL_CENTER,
        zoom: 13.2,
        pitch: 0,
        bearing: 0,
        duration: 900,
      });
    }
  }, []);

  const toggleOrbit = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;

    if (isOrbitingRef.current) {
      // Toggle off: Stop rotation and jump back to default view
      stopOrbitAndResetDefault();
    } else {
      // Toggle on: Activate 3D mode and start smooth slow orbit
      isOrbitingRef.current = true;
      setIsOrbiting(true);
      setIs3D(true);

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      // Animate pitch into 3D
      m.easeTo({
        pitch: isMobile ? 38 : 55,
        duration: 700,
      });

      let lastTime = performance.now();
      const rotateCamera = (now: number) => {
        if (!isOrbitingRef.current || !mapRef.current) return;
        const delta = now - lastTime;
        lastTime = now;
        // ~6 degrees per second = ~60 seconds per 360 degree smooth revolution
        const currentBearing = mapRef.current.getBearing();
        const nextBearing = (currentBearing + (delta * 0.006)) % 360;
        mapRef.current.setBearing(nextBearing);
        orbitAnimRef.current = requestAnimationFrame(rotateCamera);
      };

      const startTimer = setTimeout(() => {
        lastTime = performance.now();
        orbitAnimRef.current = requestAnimationFrame(rotateCamera);
      }, 250);

      return () => clearTimeout(startTimer);
    }
  }, [stopOrbitAndResetDefault]);

  // Clean up orbit animation on unmount
  useEffect(() => {
    return () => {
      isOrbitingRef.current = false;
      if (orbitAnimRef.current) {
        cancelAnimationFrame(orbitAnimRef.current);
      }
    };
  }, []);

  const toggle3D = useCallback(() => {
    const m = mapRef.current; if (!m) return;
    if (isOrbitingRef.current) {
      stopOrbitAndResetDefault();
      return;
    }
    const next = !is3D; setIs3D(next);
    m.easeTo({ pitch: next ? 55 : 0, bearing: next ? -15 : 0, duration: 800 });
  }, [is3D, stopOrbitAndResetDefault]);

  const recenter = useCallback(() => {
    if (isOrbitingRef.current) {
      stopOrbitAndResetDefault();
      return;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      mapRef.current?.fitBounds(BRISTOL_ALL_PRECINCTS_BOUNDS, {
        padding: { top: 95, bottom: 85, left: 24, right: 64 },
        pitch: is3D ? 32 : 0,
        bearing: is3D ? -10 : 0,
        maxZoom: 12.0,
        duration: 900,
      });
    } else {
      mapRef.current?.flyTo({ center: BRISTOL_CENTER, zoom: 13.2, pitch: is3D ? 52 : 0, bearing: is3D ? -15 : 0, duration: 900 });
    }
  }, [is3D, stopOrbitAndResetDefault]);

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

  // Handle incoming remote commands (Display / War Room Screen mode)
  const handleRemoteAction = useCallback((action: CommandAction) => {
    switch (action.type) {
      case 'CAMERA_MOVE':
        if (mapRef.current) {
          isApplyingRemoteRef.current = true;
          mapRef.current.easeTo({
            center: action.center,
            zoom: action.zoom,
            pitch: action.pitch,
            bearing: action.bearing,
            duration: action.duration || 500,
          });
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, (action.duration || 500) + 50);
        }
        break;
      case 'LAYER_TOGGLE':
        switch (action.layer) {
          case 'signs': setShowSignsLayer(action.active); break;
          case 'corridors': setShowCorridors(action.active); break;
          case 'heatmap': setShowHeatmap(action.active); break;
          case 'precincts': setShowPrecincts(action.active); break;
          case 'boundary': setShowBoundary(action.active); break;
          case 'missions': setShowMissionsLayer(action.active); break;
          case 'canvass': setShowCanvassLayer(action.active); break;
          case 'minimap': setShowMinimap(action.active); break;
          case 'field_ops':
            setShowFieldForceLayer(action.active);
            setShowRoutesLayer(action.active);
            break;
        }
        break;
      case 'FILTER_VOLUNTEER':
        setSelectedVolunteerFilter(action.volunteerName);
        if (action.volunteerGroup) setSelectedVolunteerGroup(action.volunteerGroup);
        break;
      case 'SELECT_SIGN':
        if (!action.signId) {
          setSelectedSign(null);
        } else {
          setSigns((prev) => {
            const found = prev.find((s) => s.id === action.signId);
            if (found) setSelectedSign(found);
            return prev;
          });
        }
        break;
      case 'SELECT_MISSION':
        if (!action.missionId) {
          setSelectedMission(null);
        } else {
          setAssignments((prev) => {
            const found = prev.find((a) => a.id === action.missionId);
            if (found) setSelectedMission(found);
            return prev;
          });
        }
        break;
      case 'SELECT_PRECINCT':
        if (!action.precinctCode) {
          setSelectedPrecinct(null);
        } else {
          const found = BRISTOL_PRECINCTS.find((p) => p.code === action.precinctCode);
          if (found) setSelectedPrecinct(found);
        }
        break;
      case 'TRIGGER_ORBIT':
        setIsOrbiting(action.active);
        break;
      case 'TOUR_SYNC':
        setIsTourOpen(action.isOpen);
        break;
    }
  }, []);

  // Connect / disconnect Supabase Realtime channel
  useEffect(() => {
    if (liveMode === 'off') {
      remoteSenderRef.current = null;
      setIsLiveConnected(false);
      return;
    }

    const { sendAction, disconnect } = initRemoteChannel(
      liveMode,
      (action: CommandAction) => {
        handleRemoteAction(action);
      },
      (status) => {
        setIsLiveConnected(status === 'connected');
      }
    );

    remoteSenderRef.current = sendAction;

    return () => {
      disconnect();
    };
  }, [liveMode, handleRemoteAction]);

  // Hook map camera updates in commander mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || liveMode !== 'commander') return;

    const handleCameraChange = () => {
      if (isApplyingRemoteRef.current || !remoteSenderRef.current) return;
      const now = Date.now();
      if (now - lastBroadcastCameraTime.current > 70) {
        lastBroadcastCameraTime.current = now;
        const c = map.getCenter();
        remoteSenderRef.current({
          type: 'CAMERA_MOVE',
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          duration: 90,
        });
      }
    };

    map.on('move', handleCameraChange);
    map.on('zoom', handleCameraChange);
    map.on('rotate', handleCameraChange);
    map.on('pitch', handleCameraChange);

    return () => {
      map.off('move', handleCameraChange);
      map.off('zoom', handleCameraChange);
      map.off('rotate', handleCameraChange);
      map.off('pitch', handleCameraChange);
    };
  }, [liveMode]);

  // Broadcast state updates from Commander to meeting room
  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'signs', active: showSignsLayer });
    }
  }, [showSignsLayer, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'corridors', active: showCorridors });
    }
  }, [showCorridors, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'heatmap', active: showHeatmap });
    }
  }, [showHeatmap, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'precincts', active: showPrecincts });
    }
  }, [showPrecincts, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'boundary', active: showBoundary });
    }
  }, [showBoundary, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'missions', active: showMissionsLayer });
    }
  }, [showMissionsLayer, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'canvass', active: showCanvassLayer });
    }
  }, [showCanvassLayer, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'LAYER_TOGGLE', layer: 'minimap', active: showMinimap });
    }
  }, [showMinimap, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'FILTER_VOLUNTEER', volunteerName: selectedVolunteerFilter, volunteerGroup: selectedVolunteerGroup });
    }
  }, [selectedVolunteerFilter, selectedVolunteerGroup, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'TRIGGER_ORBIT', active: isOrbiting });
    }
  }, [isOrbiting, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'SELECT_SIGN', signId: selectedSign?.id || null });
    }
  }, [selectedSign, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'SELECT_MISSION', missionId: selectedMission?.id || null });
    }
  }, [selectedMission, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'SELECT_PRECINCT', precinctCode: selectedPrecinct?.code || null });
    }
  }, [selectedPrecinct, liveMode]);

  useEffect(() => {
    if (liveMode === 'commander' && remoteSenderRef.current) {
      remoteSenderRef.current({ type: 'TOUR_SYNC', isOpen: isTourOpen });
    }
  }, [isTourOpen, liveMode]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className={`h-screen w-screen overflow-hidden relative font-sans transition-colors duration-500 ${isDark ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Security Gate Overlay */}
      {(!checkedAuth || !isCommandAuthorized) && (
        <CommandPinGate
          onUnlock={() => {
            setIsCommandAuthorized(true);
            setTimeout(() => {
              mapRef.current?.resize?.();
            }, 100);
          }}
        />
      )}

      {/* ============================================================
          FULL-BLEED MAP CANVAS
          ============================================================ */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* ============================================================
          TOP FLOATING BAR (Desktop md: screens — 100% Unchanged)
          ============================================================ */}
      <header className="hidden md:block absolute top-0 inset-x-0 z-20 pointer-events-none p-3 sm:p-4">
        <div className="w-full flex items-start justify-between gap-3">

          {/* — Brand Capsule (Compact, Single-Line, Matches Top Bar Height) — */}
          <div className="pointer-events-auto glass rounded-2xl px-3 py-2 flex items-center gap-2.5 animate-slide-up h-[38px]">
            <div className="w-6 h-6 min-w-6 min-h-6 shrink-0 aspect-square rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <span className="text-white font-black text-[9px] leading-none tracking-wider select-none">COS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-xs tracking-tight text-white whitespace-nowrap">Field Command</h1>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 leading-none">
                LIVE
              </span>
            </div>
          </div>

          {/* — Center: Campaign Title (Top Dead Center) & KPI HUD — */}
          <div className="hidden md:flex flex-col items-center gap-1.5 pointer-events-auto animate-slide-up" style={{ animationDelay: '80ms' }}>
            {/* Top Dead Center Campaign Title */}
            <div className="glass rounded-2xl px-3.5 py-1.5 flex items-center gap-2 border border-white/10 shadow-lg shadow-black/20 h-[34px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-extrabold text-xs tracking-tight text-white whitespace-nowrap">
                Melissa K. Brown
              </span>
              <span className="text-white/20 text-[10px] font-bold">•</span>
              <span className="text-[11px] font-semibold text-emerald-300 whitespace-nowrap">
                Bristol TN City Council
              </span>
            </div>

            {/* KPI Pills */}
            <div id="tour-stats-hud" className="hidden lg:flex glass rounded-2xl px-1 py-0.5 items-center gap-0.5 h-[30px] border border-white/10">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl" title="Official Campaign Signs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/40" />
                <span className="text-[10px] font-medium opacity-60">Signs</span>
                <span className="text-xs font-black text-emerald-400 animate-count-up">{stats.ours}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl" title="Sign Inventory Placed / Total">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/40" />
                <span className="text-[10px] font-medium opacity-60">Inv</span>
                <span className="text-xs font-black text-amber-400 animate-count-up">{inventoryStats.totalPlaced}/{inventoryStats.totalStock}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl" title="Competitor Signs Sighted">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/40" />
                <span className="text-[10px] font-medium opacity-60">Opp</span>
                <span className="text-xs font-black text-rose-400 animate-count-up">{stats.theirs}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl" title="High-Dwell Arterials">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/40" />
                <span className="text-[10px] font-medium opacity-60">Arterials</span>
                <span className="text-xs font-black text-sky-400 animate-count-up">{stats.highImpact}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl" title="Doors Knocked">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/40" />
                <span className="text-[10px] font-medium opacity-60">Doors</span>
                <span className="text-xs font-black text-teal-400 animate-count-up">{canvassRecords.length}</span>
              </div>
            </div>
          </div>

          {/* — Right Controls (Stacked in 2 Sleek Rows: Ops above Utilities) — */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 animate-slide-up" style={{ animationDelay: '160ms' }}>
            {/* Row 1: Unified Crew & Mission Control */}
            <div className="flex items-center gap-1.5">
              <button
                id="tour-crew-control"
                onClick={() => {
                  setCrewPanelInitialTab('tracker');
                  setModalInitialTarget(null);
                  setIsCrewPanelOpen(true);
                }}
                className={`glass rounded-2xl px-3.5 py-2 flex items-center gap-2 transition-all text-sm font-black border active:scale-95 h-[38px] ${
                  selectedVolunteerFilter || isCrewPanelOpen
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                    : 'hover:scale-105 border-purple-500/30 hover:border-purple-500/50 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 shadow-lg shadow-purple-500/10'
                }`}
                title="Crew & Mission Control — Field Tracker, Roster, Dispatch"
              >
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/20 text-[10px]">/</span>
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span>
                  {selectedVolunteerFilter ? selectedVolunteerFilter.split(' ')[0] : 'Crew & Missions'}
                </span>
                {selectedVolunteerFilter && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVolunteerFilter(null);
                    }}
                    className="ml-0.5 text-xs text-teal-300 hover:text-white cursor-pointer"
                  >
                    ✕
                  </span>
                )}
                {!selectedVolunteerFilter && activeMissionsCount > 0 && (
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    {activeMissionsCount}
                  </span>
                )}
                {!selectedVolunteerFilter && activeMissionsCount === 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400">
                    Ready
                  </span>
                )}
              </button>
            </div>

            {/* Row 2: Utilities (Tour, War Room, Lock, Settings) */}
            <div className="flex items-center gap-1.5">
              {/* Interactive Onboarding Mission Tour */}
              <button
                id="tour-replay-btn"
                onClick={() => setIsTourOpen(true)}
                className="glass rounded-2xl px-2.5 py-1 flex items-center gap-1.5 hover:scale-105 transition-all text-xs font-bold border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 active:scale-95 group shadow-sm shadow-emerald-500/10 h-[30px]"
                title="Interactive Briefing Tour"
              >
                <Sparkles className="w-3 h-3 text-emerald-400 group-hover:rotate-12 transition-transform" />
                <span>Tour</span>
              </button>

              {/* War Room Remote Presentation Sync Button */}
              {liveMode === 'commander' ? (
                <button
                  id="tour-war-room-btn"
                  onClick={() => setShowWarRoomModal(true)}
                  className="glass rounded-2xl px-2.5 py-1 flex items-center gap-1.5 border border-purple-500/50 bg-purple-500/20 text-purple-200 shadow-md shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all text-xs font-bold h-[30px]"
                  title="Commander Pilot Active — Broadcasting to War Room"
                >
                  <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                  <span>Commander</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-purple-500/30 text-purple-200">
                    LIVE
                  </span>
                </button>
              ) : liveMode === 'display' ? (
                <button
                  id="tour-war-room-btn"
                  onClick={() => setShowWarRoomModal(true)}
                  className="glass rounded-2xl px-2.5 py-1 flex items-center gap-1.5 border border-emerald-500/50 bg-emerald-500/20 text-emerald-200 shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-xs font-bold h-[30px]"
                  title="War Room Display Connected to Commander"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>War Room</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200">
                    SYNCED
                  </span>
                </button>
              ) : (
                <button
                  id="tour-war-room-btn"
                  onClick={() => setShowWarRoomModal(true)}
                  className="glass rounded-2xl px-2.5 py-1 flex items-center gap-1.5 hover:scale-105 transition-all text-xs font-bold border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-purple-300 active:scale-95 group shadow-sm shadow-purple-500/5 h-[30px]"
                  title="War Room Remote Presentation Sync"
                >
                  <Radio className="w-3 h-3 text-slate-400 group-hover:text-purple-400 transition-colors" />
                  <span>War Room</span>
                </button>
              )}

              {/* Lock Field Command Security Gate */}
              <button
                id="tour-lock-btn"
                onClick={handleLockCommand}
                className="glass rounded-2xl px-2.5 py-1 flex items-center gap-1 hover:scale-105 transition-all text-xs font-bold border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 active:scale-95 group h-[30px]"
                title="Lock Field Command Gate"
              >
                <Lock className="w-3 h-3 text-slate-400 group-hover:text-rose-400 transition-colors" />
                <span>Lock</span>
              </button>

              {/* Campaign Intel Drawer Toggle */}
              <button
                id="tour-drawer-btn"
                onClick={() => setDrawerOpen(!drawerOpen)}
                className={`glass rounded-2xl px-2.5 py-1 flex items-center gap-1.5 transition-all duration-300 h-[30px] text-xs font-black tracking-wide border group active:scale-95 ${
                  drawerOpen
                    ? 'bg-sky-500 !border-sky-300 text-white shadow-lg shadow-sky-500/50'
                    : 'bg-sky-500/15 border-sky-400/60 text-sky-200 hover:text-white hover:bg-sky-500/25 hover:border-sky-300 animate-throbbing-blue'
                }`}
                title="Campaign Intel Drawer (D)"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                </span>
                <SlidersHorizontal className="w-3 h-3 text-sky-300 group-hover:rotate-45 transition-transform shrink-0" />
                <span className="whitespace-nowrap">Campaign Intel</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
          MOBILE VIP EXECUTIVE VIEW (< md screens)
          ============================================================ */}
      <MobileVipBar
        stats={stats}
        inventoryStats={inventoryStats}
        canvassRecords={canvassRecords}
        volunteerPings={volunteerPings}
        routes={routes}
        precincts={BRISTOL_PRECINCTS}
        signs={signs}
        showSignsLayer={showSignsLayer}
        setShowSignsLayer={setShowSignsLayer}
        ownerFilter={ownerFilter}
        setOwnerFilter={setOwnerFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        showPrecincts={showPrecincts}
        setShowPrecincts={setShowPrecincts}
        showCanvassLayer={showCanvassLayer}
        setShowCanvassLayer={setShowCanvassLayer}
        onToggleCanvass={handleToggleCanvassLayer}
        showFieldForceLayer={showFieldForceLayer}
        setShowFieldForceLayer={setShowFieldForceLayer}
        showRoutesLayer={showRoutesLayer}
        setShowRoutesLayer={setShowRoutesLayer}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showBoundary={showBoundary}
        setShowBoundary={setShowBoundary}
        useDotMode={useDotMode}
        setUseDotMode={setUseDotMode}
        onRecenter={recenter}
        onToggle3D={toggle3D}
        is3D={is3D}
        onToggleOrbit={toggleOrbit}
        isOrbiting={isOrbiting}
        onOpenBristolFacts={() => {
          setSelectedSign(null);
          setSelectedRec(null);
          setSelectedPrecinct(null);
          setSelectedMission(null);
          setSelectedRoute(null);
          setShowBristolFacts(true);
        }}
        onSelectPrecinct={(p) => {
          setSelectedPrecinct(p);
          setSelectedSign(null);
          setSelectedRec(null);
          setShowBristolFacts(false);
        }}
        onFlyToPrecinct={(p) => {
          mapRef.current?.flyTo({
            center: p.center,
            zoom: 15.2,
            pitch: is3D ? 50 : 0,
            duration: 900,
          });
        }}
        onLock={handleLockCommand}
        isDark={isDark}
      />

      {/* ============================================================
          RIGHT-RAIL MAP CONTROLS (Desktop md: screens — 100% Unchanged)
          ============================================================ */}
      <div className="hidden md:flex absolute right-3 sm:right-4 top-20 z-10 flex-col gap-2 pointer-events-auto animate-slide-up" style={{ animationDelay: '200ms' }}>
        {/* Navigation Stack */}
        <div id="tour-zoom-btns" className="glass rounded-2xl p-1 flex flex-col items-center">
          <button id="tour-recenter-btn" onClick={recenter} title="Recenter Bristol" className="p-2.5 rounded-xl hover:bg-emerald-500/15 hover:text-emerald-400 active:scale-90 transition-all">
            <Navigation className="w-4 h-4" />
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button id="tour-3d-btn" onClick={toggle3D} title="3D Perspective" className={`p-2.5 rounded-xl text-xs font-black transition-all active:scale-90 ${is3D && !isOrbiting ? 'text-emerald-400 bg-emerald-500/15' : 'hover:bg-white/10'}`}>
            3D
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button
            id="tour-orbit-btn"
            onClick={toggleOrbit}
            title={isOrbiting ? "Stop 3D Orbit & Reset to Default View" : "3D Cinematic Orbit (Slow Rotate)"}
            className={`p-2.5 rounded-xl transition-all active:scale-90 relative ${
              isOrbiting
                ? 'text-cyan-300 bg-cyan-500/25 border border-cyan-500/40 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40'
                : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${isOrbiting ? 'animate-spin' : ''}`} style={isOrbiting ? { animationDuration: '3.5s' } : undefined} />
          </button>
          <div className={`w-5 h-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <button onClick={() => mapRef.current?.zoomIn()} className="p-2.5 rounded-xl hover:bg-white/10 text-sm font-bold active:scale-90 transition-all leading-none">+</button>
          <button onClick={() => mapRef.current?.zoomOut()} className="p-2.5 rounded-xl hover:bg-white/10 text-sm font-bold active:scale-90 transition-all leading-none">−</button>
        </div>

        {/* Layer Toggles — Slide-Out Pill Badges */}
        <div className="glass rounded-2xl p-1.5 flex flex-col items-end gap-1">
          {[
            {
              id: 'tour-signs-toggle',
              label: 'Signs',
              icon: showSignsLayer && useDotMode ? <CircleDot className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />,
              active: showSignsLayer,
              color: useDotMode ? 'cyan' : 'emerald',
              onClick: () => {
                if (!showSignsLayer) { setShowSignsLayer(true); setUseDotMode(true); }
                else if (useDotMode) { setUseDotMode(false); }
                else { setShowSignsLayer(false); setUseDotMode(true); }
              },
            },
            {
              id: 'tour-missions-layer',
              label: 'Missions',
              icon: <Target className="w-3.5 h-3.5" />,
              active: showMissionsLayer,
              color: 'purple',
              onClick: () => setShowMissionsLayer(!showMissionsLayer),
            },
            {
              id: 'tour-canvass-layer',
              label: 'Canvass',
              icon: <Home className="w-3.5 h-3.5" />,
              active: showCanvassLayer,
              color: 'teal',
              onClick: () => handleToggleCanvassLayer(),
            },
            {
              id: 'tour-field-ops',
              label: 'Field Ops',
              icon: <Users className="w-3.5 h-3.5" />,
              active: showFieldForceLayer || showRoutesLayer,
              color: 'emerald',
              onClick: () => {
                if (showFieldForceLayer || showRoutesLayer) {
                  setShowFieldForceLayer(false); setShowRoutesLayer(false);
                } else {
                  setShowFieldForceLayer(true); setShowRoutesLayer(true);
                }
              },
            },
            { divider: true } as any,
            {
              id: 'tour-precincts-layer',
              label: 'Precincts',
              icon: <Vote className="w-3.5 h-3.5" />,
              active: showPrecincts,
              color: 'emerald',
              onClick: () => setShowPrecincts(!showPrecincts),
            },
            {
              id: 'tour-boundary',
              label: 'Bristol',
              tip: 'Bristol TN City Boundary',
              icon: <Building2 className="w-3.5 h-3.5" />,
              active: showBoundary,
              color: 'sky',
              onClick: () => { const next = !showBoundary; setShowBoundary(next); if (!next) setShowBristolFacts(false); },
            },
            {
              id: 'tour-corridors-layer',
              label: 'Traffic',
              tip: 'Traffic Volume Corridors (AADT)',
              icon: <TrendingUp className="w-3.5 h-3.5" />,
              active: showCorridors,
              color: 'amber',
              onClick: () => setShowCorridors(!showCorridors),
            },
            {
              id: 'tour-heatmap-layer',
              label: 'Heat Map',
              tip: 'Sign Density Heat Map',
              icon: <Flame className="w-3.5 h-3.5" />,
              active: showHeatmap,
              color: 'rose',
              onClick: () => setShowHeatmap(!showHeatmap),
            },
            {
              id: 'tour-minimap-toggle',
              label: 'Radar',
              tip: 'Tactical Overview Radar HUD (M)',
              icon: <Radio className="w-3.5 h-3.5" />,
              active: showMinimap,
              color: 'cyan',
              onClick: () => handleToggleMinimap(!showMinimap),
            },
          ].map((item: any, idx) => {
            if (item.divider) {
              return <div key={`div-${idx}`} className={`w-full h-px my-0.5 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />;
            }
            const colorMap: Record<string, { bg: string; text: string; border: string; shadow: string; glow: string }> = {
              emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', shadow: 'shadow-emerald-500/20', glow: 'ring-emerald-400/30' },
              cyan:    { bg: 'bg-cyan-500/25',    text: 'text-cyan-300',    border: 'border-cyan-500/40',    shadow: 'shadow-cyan-500/20',    glow: 'ring-cyan-400/30' },
              teal:    { bg: 'bg-teal-500/25',    text: 'text-teal-300',    border: 'border-teal-500/40',    shadow: 'shadow-teal-500/20',    glow: 'ring-teal-400/30' },
              purple:  { bg: 'bg-purple-500/20',  text: 'text-purple-300',  border: 'border-purple-500/30',  shadow: 'shadow-purple-500/20',  glow: 'ring-purple-400/30' },
              sky:     { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     shadow: 'shadow-sky-500/20',     glow: 'ring-sky-400/30' },
              amber:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30',   shadow: 'shadow-amber-500/20',   glow: 'ring-amber-400/30' },
              rose:    { bg: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-500/30',    shadow: 'shadow-rose-500/20',    glow: 'ring-rose-400/30' },
            };
            const c = colorMap[item.color] || colorMap.emerald;
            return (
              <button
                key={item.id}
                id={item.id}
                onClick={item.onClick}
                className={`group flex items-center gap-1.5 rounded-xl transition-all duration-200 active:scale-95 pl-2.5 pr-2 py-1.5 ${
                  item.active
                    ? `${c.bg} ${c.text} border ${c.border} shadow-md ${c.shadow} ring-1 ${c.glow}`
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
                title={item.tip || item.label}
              >
                <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${item.active ? c.text : 'text-zinc-500'}`}>
                  {item.label}
                </span>
                {item.icon}
              </button>
            );
          })}
        </div>
      </div>



      {/* SELECTED SIGN — INSPECTION CARD */}
      {selectedSign && (
        <SignInspectionCard
          sign={selectedSign} isDark={isDark}
          streetAddress={streetAddress} loadingAddress={loadingAddress}
          dragStyle={signDrag.style} dragProps={signDrag.dragProps}
          resetPosition={signDrag.resetPosition}
          onDismiss={() => setSelectedSign(null)}
          onDelete={(signId) => {
            setSigns(prev => prev.filter(s => s.id !== signId));
            setSelectedSign(null);
          }}
        />
      )}




      {/* SELECTED CANVASS RECORD — INSPECTION CARD */}
      {selectedCanvassRecord && (
        <CanvassInspectionCard
          record={selectedCanvassRecord} isDark={isDark}
          dragStyle={canvassDrag.style} dragProps={canvassDrag.dragProps}
          resetPosition={canvassDrag.resetPosition}
          onDismiss={() => setSelectedCanvassRecord(null)}
        />
      )}

      {/* SCOUT RECOMMENDATION — APPROVAL CARD */}
      {selectedRec && (
        <ScoutRecommendationCard
          rec={selectedRec} isDark={isDark}
          recAddress={recAddress} loadingRecAddress={loadingRecAddress}
          selectedRecSignType={selectedRecSignType}
          approvingRec={approvingRec}
          dragStyle={recDrag.style} dragProps={recDrag.dragProps}
          resetPosition={recDrag.resetPosition}
          onDismiss={() => setSelectedRec(null)}
          onSetSignType={setSelectedRecSignType}
          onApprove={handleApproveRec}
          onDecline={handleDeclineRec}
          onAssign={(rec) => {
            setModalInitialTarget({
              title: rec.street,
              street_address: recAddress || rec.street,
              lat: rec.lat,
              lng: rec.lng,
              signType: selectedRecSignType,
              quantity: 1,
              targetType: 'scout_rec',
            });
            setCrewPanelInitialTab('roster');
            setIsCrewPanelOpen(true);
          }}
        />
      )}

      {/* CAMPAIGN INTEL DRAWER */}
      {drawerOpen && (
        <CampaignDrawer
          isDark={isDark}
          drawerTab={drawerTab}
          onClose={() => setDrawerOpen(false)}
          onSetTab={setDrawerTab}
          filtered={filtered}
          signs={signs}
          selectedSign={selectedSign}
          searchQ={searchQ}
          ownerFilter={ownerFilter}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          useDotMode={useDotMode}
          stats={stats}
          onSetSearchQ={setSearchQ}
          onSetOwnerFilter={setOwnerFilter}
          onSetTypeFilter={setTypeFilter}
          onSetStatusFilter={setStatusFilter}
          onSetUseDotMode={setUseDotMode}
          onSelectSign={(sign) => {
            setShowSignsLayer(true);
            setSelectedSign(sign);
            mapRef.current?.flyTo({ center: [+sign.longitude, +sign.latitude], zoom: 15.8, pitch: is3D ? 55 : 0, duration: 800 });
          }}
          onFlyTo={(center, zoom) => mapRef.current?.flyTo({ center, zoom, pitch: is3D ? 50 : 0, duration: 900 })}
          selectedPrecinctId={selectedPrecinct?.id}
          onSelectPrecinct={(p) => {
            setSelectedPrecinct(p);
            setSelectedSign(null);
            setSelectedRec(null);
            mapRef.current?.flyTo({ center: p.center, zoom: 15.2, pitch: is3D ? 50 : 0, duration: 900 });
          }}

          inventoryStock={inventoryStock}
          inventoryStats={inventoryStats}
          editingStock={editingStock}
          onSetEditingStock={setEditingStock}
          onUpdateStockQuantity={updateStockQuantity}
          aadtCorridors={AADT_CORRIDORS}
          onExportCSV={exportCSV}
          onExportGeoJSON={exportGeoJSON}
        />
      )}
      {/* ============================================================
          SCOUT — AI SIGN PLACEMENT ADVISOR
          ============================================================ */}
      <SmartScout
        signs={signs}
        trafficStations={trafficStations}
        intersections={trafficIntersections}
        isDark={isDark}
        showHeatmap={showHeatmap}
        recs={scoutRecs}
        setRecs={setScoutRecs}
        isExpanded={isScoutExpanded}
        onExpandedChange={handleScoutExpandChange}
        searchBar={
          <div id="tour-map-search" className="w-full">
            <MapSearchBar
              signs={signs}
              onSelectLocation={handleSearchSelectLocation}
              onSelectSign={(sign) => {
                setSelectedSign(sign);
              }}
              isDark={isDark}
            />
          </div>
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
          TACTICAL OVERVIEW RADAR MINIMAP (Lower Left Corner)
          ============================================================ */}
      <TacticalMinimap
        mapRef={mapRef}
        signs={signs}
        canvassRecords={canvassRecords}
        assignments={assignments}
        isDark={isDark}
        isOpen={showMinimap}
        onToggle={handleToggleMinimap}
        isScoutExpanded={isScoutExpanded}
      />

      {/* ============================================================
          VOLUNTEER & PIN DIRECTORY MODAL (Center Pop Card)
          ============================================================ */}
      {/* ============================================================
          CREW & MISSION CONTROL PANEL
          ============================================================ */}
      <CrewMissionControl
        isOpen={isCrewPanelOpen}
        onClose={() => { setIsCrewPanelOpen(false); setModalInitialTarget(null); }}
        selectedGroup={selectedVolunteerGroup}
        onSelectGroup={(grp) => {
          setSelectedVolunteerGroup(grp);
          if (grp !== 'all') {
            setShowSignsLayer(true);
            setShowCanvassLayer(true);
            setShowFieldForceLayer(true);
            setShowRoutesLayer(true);
          }
        }}
        selectedVolunteer={selectedVolunteerFilter}
        onSelectVolunteer={(vol) => {
          setSelectedVolunteerFilter(vol);
          if (vol) {
            setShowSignsLayer(true);
            setShowCanvassLayer(true);
            setShowFieldForceLayer(true);
            setShowRoutesLayer(true);
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
          setShowRoutesLayer(true);
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 16.5, duration: 1000 });
        }}
        showRoutesLayer={showRoutesLayer}
        setShowRoutesLayer={setShowRoutesLayer}
        assignments={assignments}
        onSelectMission={(m) => {
          setShowMissionsLayer(true);
          setSelectedMission(m);
          setIsCrewPanelOpen(false);
          mapRef.current?.flyTo({ center: [m.lng, m.lat], zoom: 15.8, pitch: 55, duration: 1200 });
        }}
        onToggleComplete={(id) => {
          const current = assignments.find(a => a.id === id);
          if (!current) return;
          const newStatus = current.status === 'completed' ? 'assigned' : 'completed';
          const updated = assignments.map(a => a.id === id ? { ...a, status: newStatus as any } : a);
          setAssignments(updated);
          if (typeof window !== 'undefined') {
            localStorage.setItem('campaignos_assignments', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('campaignos_assignments_updated', { detail: updated }));
          }
        }}
        signsCountByVolunteer={signsCountByVolunteer}
        isDark={isDark}
        initialTab={crewPanelInitialTab}
        initialTarget={modalInitialTarget}
      />

      {/* ============================================================
          BRISTOL MUNICIPAL & CAMPAIGN FACTS CARD (Bottom Center slide-up)
          ============================================================ */}
      <BristolFactsCard
        isOpen={showBristolFacts}
        onClose={() => setShowBristolFacts(false)}
        signs={signs}
        canvassRecords={canvassRecords}
        volunteerPings={volunteerPings}
        routes={routes}
        showPrecincts={showPrecincts}
        onTogglePrecincts={() => setShowPrecincts(!showPrecincts)}
        onZoomToCity={() => {
          mapRef.current?.flyTo({
            center: [-82.188, 36.595],
            zoom: 13.5,
            pitch: is3D ? 45 : 0,
            duration: 900,
          });
        }}
        isDark={isDark}
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
          setCrewPanelInitialTab('roster');
          setIsCrewPanelOpen(true);
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

      {/* Tactical Mission Briefing Onboarding Tour (Desktop Only) */}
      {!isMobileScreen && (
        <TacticalOnboardingTour
          tourKey="campaignos_dashboard_tour_v1"
          steps={DASHBOARD_TOUR_STEPS}
          isOpen={isTourOpen && isCommandAuthorized && checkedAuth}
          onClose={() => setIsTourOpen(false)}
        />
      )}

      {/* War Room Remote Presentation Sync Modal */}
      <WarRoomSyncModal
        isOpen={showWarRoomModal}
        onClose={() => setShowWarRoomModal(false)}
        liveMode={liveMode}
        onSetLiveMode={(mode) => setLiveMode(mode)}
        isConnected={isLiveConnected}
      />
    </div>
  );
}
