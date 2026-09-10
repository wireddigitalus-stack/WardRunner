'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Navigation, Compass, Loader2 } from 'lucide-react';
import DictateButton from '@/app/components/DictateButton';
import { Sign } from '@/lib/types';
import realCorridors from '@/lib/realCorridors.json';

interface SearchResult {
  id: string;
  type: 'sign' | 'corridor' | 'address';
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  sign?: Sign;
}

interface MapSearchBarProps {
  signs: Sign[];
  onSelectLocation: (lat: number, lng: number, title?: string) => void;
  onSelectSign?: (sign: Sign) => void;
  isDark?: boolean;
}

// Major Bristol landmarks and high-traffic corridors for instant fuzzy lookup
const BRISTOL_KEY_LOCATIONS = [
  { title: 'State Street (Downtown)', subtitle: 'US-11E · 21,500 AADT · Core Arterial', lat: 36.5951, lng: -82.1887 },
  { title: 'Volunteer Parkway', subtitle: 'US-11W · 28,400 AADT · Main Commercial Corridor', lat: 36.5880, lng: -82.1860 },
  { title: 'Lee Highway & Exit 7', subtitle: 'US-11/19 · 19,200 AADT · Northbound Arterial', lat: 36.6085, lng: -82.1720 },
  { title: 'Bluff City Highway', subtitle: 'TN-37 · 14,800 AADT · Southbound Commuter', lat: 36.5840, lng: -82.1810 },
  { title: 'West State Street & 24th', subtitle: 'West Bristol Commercial Gateway', lat: 36.6030, lng: -82.1920 },
  { title: 'Bristol TN City Hall', subtitle: '801 Anderson St, Bristol, TN', lat: 36.5947, lng: -82.1843 },
  { title: 'Steele Creek Park', subtitle: '407 Steele Creek Park Rd', lat: 36.5682, lng: -82.2370 },
  { title: 'Bristol Motor Speedway', subtitle: '151 Speedway Blvd, Bristol, TN', lat: 36.5156, lng: -82.2570 },
];

export default function MapSearchBar({
  signs,
  onSelectLocation,
  onSelectSign,
  isDark = true,
}: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute local fast matches (signs + key Bristol locations)
  const localMatches: SearchResult[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: SearchResult[] = [];

    // 1. Match Signs
    for (const sign of signs) {
      const addr = (sign.street_address || '').toLowerCase();
      const comp = (sign.competitor_name || '').toLowerCase();
      const vol = (sign.placed_by_name || '').toLowerCase();
      const type = sign.sign_type.replace('_', ' ').toLowerCase();

      if (
        addr.includes(q) ||
        comp.includes(q) ||
        vol.includes(q) ||
        type.includes(q) ||
        (q.includes('sign') && (sign.is_competitor ? 'opponent' : 'brown').includes(q))
      ) {
        matches.push({
          id: `sign-${sign.id}`,
          type: 'sign',
          title: sign.street_address || `${sign.sign_type.replace('_', ' ')} #${sign.id}`,
          subtitle: sign.is_competitor
            ? `Opponent sighting: ${sign.competitor_name || 'Competitor'}`
            : `Melissa K. Brown · ${sign.sign_type.replace('_', ' ')}`,
          lat: sign.latitude,
          lng: sign.longitude,
          sign,
        });
      }
      if (matches.length >= 4) break;
    }

    // 2. Match Key Bristol Locations & Corridors
    for (const loc of BRISTOL_KEY_LOCATIONS) {
      if (
        loc.title.toLowerCase().includes(q) ||
        loc.subtitle.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `loc-${loc.title}`,
          type: 'corridor',
          title: loc.title,
          subtitle: loc.subtitle,
          lat: loc.lat,
          lng: loc.lng,
        });
      }
      if (matches.length >= 6) break;
    }

    return matches;
  }, [query, signs]);

  // Geocode with Nominatim bounded to Bristol TN if user typed an address not in local matches
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setGeocodeResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Search Bristol TN bounding box
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q + ', Bristol, TN'
        )}&format=json&addressdetails=1&limit=3&viewbox=-82.26,36.54,-82.11,36.65`;

        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' },
        });
        const data = await res.json();

        if (Array.isArray(data)) {
          const results: SearchResult[] = data.map((item: any) => ({
            id: `geo-${item.place_id}`,
            type: 'address',
            title: item.address?.road
              ? `${item.address.house_number || ''} ${item.address.road}`.trim()
              : item.display_name.split(',')[0],
            subtitle: item.display_name.split(',').slice(1, 3).join(',').trim() || 'Bristol, TN',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));
          setGeocodeResults(results);
        }
      } catch (err) {
        console.warn('Geocoding search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Combined Results
  const combinedResults: SearchResult[] = React.useMemo(() => {
    const all = [...localMatches];
    for (const g of geocodeResults) {
      if (!all.some((m) => Math.abs(m.lat - g.lat) < 0.001 && Math.abs(m.lng - g.lng) < 0.001)) {
        all.push(g);
      }
    }
    return all.slice(0, 7);
  }, [localMatches, geocodeResults]);

  const handleSelectResult = (item: SearchResult) => {
    setQuery(item.title);
    setIsOpen(false);
    if (item.sign && onSelectSign) {
      onSelectSign(item.sign);
    }
    onSelectLocation(item.lat, item.lng, item.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedResults.length) % Math.max(1, combinedResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedResults.length > 0) {
        handleSelectResult(combinedResults[selectedIndex] || combinedResults[0]);
      }
    }
  };

  const handleDictatedText = (dictated: string) => {
    setQuery(dictated);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative pointer-events-auto z-30">
      {/* Search Capsule Input */}
      <div
        className={`glass flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-200 shadow-xl ${
          isOpen ? 'ring-2 ring-emerald-400/50 !border-emerald-400/60' : 'hover:border-white/20'
        } ${isDark ? 'bg-black/60 text-white' : 'bg-white/80 text-slate-900'}`}
      >
        <Search className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Fast map search: address, street, sign..."
          spellCheck={true}
          autoCorrect="on"
          autoCapitalize="sentences"
          className="w-48 sm:w-72 bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder:text-slate-400 placeholder:text-xs text-white"
        />

        {/* Clear Query Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setGeocodeResults([]);
              inputRef.current?.focus();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Loading Spinner */}
        {isLoading && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />}

        {/* Push to Dictate Button */}
        <DictateButton
          onTranscript={handleDictatedText}
          size="sm"
          title="Push to dictate map address or location"
        />
      </div>

      {/* Instant Dropdown Suggestions */}
      {isOpen && (combinedResults.length > 0 || query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-heavy rounded-2xl p-2 shadow-2xl border border-white/15 animate-slide-up overflow-hidden max-h-80 overflow-y-auto">
          {combinedResults.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  Searching Bristol locations...
                </span>
              ) : (
                <span>No matching Bristol TN locations found. Press Enter to try geocoding.</span>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Fast Map Jump ({combinedResults.length})</span>
                <span>Select to Zoom</span>
              </div>

              {combinedResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const icon =
                  item.type === 'sign' ? (
                    <span className="text-base shrink-0">🏡</span>
                  ) : item.type === 'corridor' ? (
                    <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-2.5 transition active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-white'
                        : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    <Navigation className="w-3 h-3 text-slate-400 shrink-0 opacity-40 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
