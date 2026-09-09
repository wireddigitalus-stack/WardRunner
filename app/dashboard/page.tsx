'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Sign, SignType, Recommendation, InventoryStock } from '@/lib/types';
import { getTrafficData, stationsToGeoJSON, intersectionsToGeoJSON, TrafficStation, Intersection } from '@/lib/trafficData';
import realCorridors from '@/lib/realCorridors.json';
import SmartScout from './components/SmartScout';
import {
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
   SEED DATA (used until Supabase returns rows)
   ================================================================ */
const SEED_SIGNS: Sign[] = [
  { id: '1', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5951, longitude: -82.1887, placed_by_name: 'Campaign Volunteer', street_address: '620 State Street', sign_type: 'large_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: '2', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.6010, longitude: -82.1780, placed_by_name: 'Campaign Volunteer', street_address: '1430 Lee Highway', sign_type: 'banner', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: '3', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5880, longitude: -82.1950, placed_by_name: 'Campaign Volunteer', street_address: '920 Volunteer Parkway', sign_type: 'yard_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: '4', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5975, longitude: -82.1830, placed_by_name: 'Opponent Volunteer', street_address: '412 State Street', sign_type: 'yard_sign', is_competitor: true, competitor_name: 'Bob Reynolds', status: 'placed', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: '5', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.6085, longitude: -82.1720, placed_by_name: 'Campaign Volunteer', street_address: '2105 Lee Highway', sign_type: 'billboard', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: '6', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5840, longitude: -82.1810, placed_by_name: 'Campaign Volunteer', street_address: '1750 Bluff City Highway', sign_type: 'yard_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: '7', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.6030, longitude: -82.1920, placed_by_name: 'Campaign Volunteer', street_address: '1100 West State Street', sign_type: 'yard_sign', is_competitor: false, status: 'placed', created_at: new Date(Date.now() - 3600000 * 1).toISOString() },
  { id: '8', campaign_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', latitude: 36.5860, longitude: -82.1750, placed_by_name: 'Opponent Volunteer', street_address: '1820 Bluff City Highway', sign_type: 'large_sign', is_competitor: true, competitor_name: 'Common Sense Slate', status: 'placed', created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
];

/* ================================================================
   COMPONENT
   ================================================================ */
export default function DashboardPage() {
  const theme = 'dark' as const;
  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [is3D, setIs3D] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
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

  // Load saved inventory stock from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wardrunner_inventory_stock');
      if (saved) setInventoryStock(JSON.parse(saved));
    } catch {}
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
  }, []);

  const fetchSigns = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('signs').select('*').order('created_at', { ascending: false });
      setSigns(data && data.length > 0 ? data : SEED_SIGNS);
    } catch { setSigns(SEED_SIGNS); } finally { setLoading(false); }
  };

  /* ---------- Derived ---------- */
  const filtered = useMemo(() => signs.filter(s => {
    if (typeFilter !== 'all' && s.sign_type !== typeFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (ownerFilter === 'ours' && s.is_competitor) return false;
    if (ownerFilter === 'theirs' && !s.is_competitor) return false;
    if (searchQ && !s.placed_by_name.toLowerCase().includes(searchQ.toLowerCase()) && !(s.competitor_name || '').toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }), [signs, typeFilter, statusFilter, ownerFilter, searchQ]);

  const stats = useMemo(() => ({
    ours:       signs.filter(s => !s.is_competitor && s.status === 'placed').length,
    theirs:     signs.filter(s => s.is_competitor).length,
    retrieved:  signs.filter(s => s.status === 'retrieved').length,
    highImpact: signs.filter(s => !s.is_competitor && ['large_sign', 'banner', 'billboard'].includes(s.sign_type)).length,
    total:      signs.length,
  }), [signs]);

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
      await supabase.from('signs').insert([newSign]);
    } catch (err) {
      console.warn('Supabase insert fallback:', err);
    }

    // Immediately update campaign signs state
    setSigns(prev => [newSign, ...prev]);

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
      });

      map.on('click', () => {
        setSelectedSign(null);
        setSelectedRec(null);
      });
      mapRef.current = map;
    })();

    return () => { alive = false; mapRef.current?.remove(); mapRef.current = null; };
  }, [theme]);

  /* ---------- Layer Visibility ---------- */
  useEffect(() => {
    const m = mapRef.current;
    if (!m?.isStyleLoaded?.()) return;
    const bVis = showBoundary ? 'visible' : 'none';
    const cVis = showCorridors ? 'visible' : 'none';
    const hVis = showHeatmap ? 'visible' : 'none';
    ['boundary-fill', 'boundary-line'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', bVis));
    ['corridor-glow', 'corridor-core', 'corridor-inner'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', cVis));
    ['traffic-heat-glow', 'traffic-heat-core'].forEach(id => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', hVis));
  }, [showBoundary, showCorridors, showHeatmap]);

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

      filtered.forEach((sign, i) => {
        const el = document.createElement('div');
        el.style.cssText = 'cursor:pointer;';
        const isComp = sign.is_competitor;
        const isBig  = ['large_sign', 'banner', 'billboard'].includes(sign.sign_type);
        const isSel  = selectedSign?.id === sign.id;

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

        el.innerHTML = `
          <div class="animate-pin-drop" style="animation-delay:${Math.min(i * 35, 500)}ms">
            <div class="relative flex flex-col items-center group">

              ${/* Pulse ring for campaign signs */''}
              ${!isComp && !isSel ? `<div class="absolute w-14 h-14 rounded-full animate-ripple pointer-events-none" style="background:${glowColor};top:-3px;left:-3px;"></div>` : ''}

              ${/* Selection glow ring */''}
              ${isSel ? `<div class="absolute -inset-[5px] rounded-2xl animate-pin-pulse" style="--pulse-color:${glowColor};box-shadow:0 0 0 4px ${glowColor}"></div>` : ''}

              ${/* === THE PIN === */''}
              <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, ${bgColor}, ${bgColorDark});
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid rgba(255,255,255,0.95);
                box-shadow: 0 4px 16px ${glowColor}, 0 2px 4px rgba(0,0,0,0.2);
                transition: transform 0.2s ease;
                transform: ${isSel ? 'scale(1.25)' : 'scale(1)'};
                position: relative;
                z-index: ${isSel ? 30 : 10};
              ">
                <span style="
                  color: white;
                  font-size: 13px;
                  font-weight: 900;
                  letter-spacing: 0.5px;
                  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
                  line-height: 1;
                ">${pinLabel}</span>
              </div>

              ${/* Pin pointer triangle */''}
              <div style="
                width: 0; height: 0;
                border-left: 7px solid transparent;
                border-right: 7px solid transparent;
                border-top: 8px solid ${bgColorDark};
                margin-top: -2px;
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
              "></div>

              ${/* Ground shadow dot */''}
              <div style="
                width: 8px; height: 4px;
                background: rgba(0,0,0,0.15);
                border-radius: 50%;
                margin-top: 2px;
                filter: blur(1px);
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

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedSign(sign);
          m.flyTo({ center: [Number(sign.longitude), Number(sign.latitude)], zoom: 15.8, pitch: is3D ? 55 : 0, duration: 800 });
        });

        // Hover scale
        el.addEventListener('mouseenter', () => {
          const pin = el.querySelector('div[style*="width: 48px"]') as HTMLElement;
          if (pin && !isSel) pin.style.transform = 'scale(1.15)';
        });
        el.addEventListener('mouseleave', () => {
          const pin = el.querySelector('div[style*="width: 48px"]') as HTMLElement;
          if (pin && !isSel) pin.style.transform = 'scale(1)';
        });

        const marker = new mgl.Marker({ element: el }).setLngLat([Number(sign.longitude), Number(sign.latitude)]).addTo(m);
        markersRef.current.push(marker);
      });
    })();
  }, [filtered, selectedSign, is3D]);

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
    a.download = `wardrunner_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const exportGeoJSON = () => {
    const gj = { type: 'FeatureCollection', features: filtered.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+s.longitude, +s.latitude] }, properties: { id: s.id, sign_type: s.sign_type, is_competitor: s.is_competitor, competitor_name: s.competitor_name, placed_by: s.placed_by_name, status: s.status, created_at: s.created_at } })) };
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gj, null, 2));
    a.download = `wardrunner_${new Date().toISOString().slice(0,10)}.geojson`;
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
              <span className="text-white font-black text-sm">WR</span>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-tight">WardRunner</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">LIVE</span>
              </div>
              <p className="text-[11px] opacity-50 leading-none mt-0.5">Melissa K. Brown • Bristol TN City Council</p>
            </div>
          </div>

          {/* — KPI Pills — */}
          <div className="hidden lg:flex pointer-events-auto glass rounded-2xl px-1 py-1 items-center gap-1 animate-slide-up" style={{ animationDelay: '80ms' }}>
            {[
              { label: 'Our Signs', value: stats.ours, color: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-emerald-400/40' },
              { label: 'Inventory', value: `${inventoryStats.totalPlaced}/${inventoryStats.totalStock}`, color: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-amber-400/40' },
              { label: 'Competitor', value: stats.theirs, color: 'text-rose-400', dot: 'bg-rose-400', glow: 'shadow-rose-400/40' },
              { label: 'Arterials', value: stats.highImpact, color: 'text-sky-400', dot: 'bg-sky-400', glow: 'shadow-sky-400/40' },
            ].map((kpi, i) => (
              <div key={kpi.label} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl ${i === 0 ? '' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${kpi.dot} shadow-md ${kpi.glow}`} />
                <span className="text-[11px] font-medium opacity-60">{kpi.label}</span>
                <span className={`text-sm font-black ${kpi.color} animate-count-up`} style={{ animationDelay: `${200 + i * 100}ms` }}>{kpi.value}</span>
              </div>
            ))}
          </div>

          {/* — Right Controls — */}
          <div className="pointer-events-auto flex items-center gap-2 animate-slide-up" style={{ animationDelay: '160ms' }}>
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
          <button onClick={() => setShowBoundary(!showBoundary)} title="Ward Boundary" className={`p-2 rounded-xl transition-all ${showBoundary ? 'bg-sky-500/15 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <Layers className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCorridors(!showCorridors)} title="AADT Corridors" className={`p-2 rounded-xl transition-all ${showCorridors ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <TrendingUp className="w-4 h-4" />
          </button>
          <button onClick={() => setShowHeatmap(!showHeatmap)} title="Traffic Heatmap" className={`p-2 rounded-xl transition-all ${showHeatmap ? 'bg-rose-500/15 text-rose-400' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <Flame className="w-4 h-4" />
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
                  {selectedSign.sign_type.replace('_', ' ')} · <span className={selectedSign.is_competitor ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>{selectedSign.is_competitor ? 'Reported' : selectedSign.status}</span> · {selectedSign.is_competitor ? 'Reported' : 'Placed'} {relativeTime(selectedSign.created_at)}
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
                href={`https://maps.apple.com/?daddr=${selectedSign.latitude},${selectedSign.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.97] transition-all"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
              <button onClick={() => setSelectedSign(null)} className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
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
                onClick={() => handleDeclineRec(selectedRec)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 active:scale-95`}
              >
                Decline
              </button>
              <a
                href={`https://maps.apple.com/?daddr=${selectedRec.lat},${selectedRec.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                title="Directions in Apple Maps"
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

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                <input
                  type="text"
                  placeholder="Search streets, signs, or opponents…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className={`w-full h-10 pl-10 pr-4 rounded-xl border text-sm focus:outline-none transition ${isDark ? 'bg-white/5 border-white/10 focus:border-emerald-500/50 text-white placeholder:text-zinc-500' : 'bg-black/[0.03] border-black/10 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400'}`}
                />
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

              {/* Signs in Field Feed */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2 block">
                  Signs in Field ({filtered.length})
                </label>
                <div className="space-y-1.5 stagger-children max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {filtered.map(sign => {
                    const meta = SIGN_TYPE_META[sign.sign_type] || { emoji: '📍', label: 'Sign' };
                    return (
                      <button
                        key={sign.id}
                        onClick={() => {
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
                              <p className="text-[10px] opacity-40 truncate">{sign.street_address ? `${sign.street_address} · ` : ''}{sign.is_competitor ? 'Reported' : 'Placed'} · {relativeTime(sign.created_at)}</p>
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
            el.className = 'cursor-pointer hover:scale-110 active:scale-95 transition-transform';
            el.innerHTML = `
              <div class="animate-pin-drop" style="animation-delay:${i * 100}ms">
                <div class="relative flex flex-col items-center">
                  <div class="absolute w-16 h-16 rounded-full animate-ripple pointer-events-none" style="background:rgba(245,158,11,0.3);top:-4px;left:-4px;"></div>
                  <div style="width:48px;height:48px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;display:flex;align-items:center;justify-content:center;border:3px solid rgba(255,255,255,0.95);box-shadow:0 4px 20px rgba(245,158,11,0.5),0 2px 4px rgba(0,0,0,0.2);">
                    <span style="color:white;font-size:16px;font-weight:900;text-shadow:0 1px 3px rgba(0,0,0,0.4);">★</span>
                  </div>
                  <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #d97706;margin-top:-2px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));"></div>
                  <div style="width:8px;height:4px;background:rgba(0,0,0,0.15);border-radius:50%;margin-top:2px;filter:blur(1px);"></div>
                </div>
              </div>`;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              setSelectedSign(null);
              setSelectedRec(rec);
              setSelectedRecSignType(rec.aadt >= 15000 ? 'large_sign' : 'yard_sign');
              m.flyTo({ center: [rec.lng, rec.lat], zoom: 16, pitch: is3D ? 55 : 0, duration: 800 });
            });

            const marker = new mgl.Marker({ element: el }).setLngLat([rec.lng, rec.lat]).addTo(m);
            scoutMarkersRef.current.push({ marker, rank: rec.rank });
          });

          // Fit bounds to show all recommendations
          if (recs.length > 1) {
            const bounds = recs.reduce((b, r) => b.extend([r.lng, r.lat]), new mgl.LngLatBounds([recs[0].lng, recs[0].lat], [recs[0].lng, recs[0].lat]));
            m.fitBounds(bounds, { padding: 80, duration: 1000 });
          }
        }}
      />
    </div>
  );
}
