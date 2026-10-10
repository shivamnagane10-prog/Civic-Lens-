'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Issue, Crew, Ward } from '@civiclens/shared-types';
import { Globe, MapPin, Radio, Navigation, Compass, Layers, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';

interface WardMapProps {
  wards: Ward[];
  issues: Issue[];
  crews: Crew[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  selectedWardId: string | null;
  onSelectWard: (wardId: string) => void;
}

export const WardMap: React.FC<WardMapProps> = ({
  wards,
  issues,
  crews,
  selectedIssue,
  onSelectIssue,
  selectedWardId,
  onSelectWard,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeRegion, setActiveRegion] = useState<'india' | 'delhi' | 'mumbai' | 'bengaluru' | 'pune' | 'world'>('india');
  const [tileMode, setTileMode] = useState<'streets' | 'dark' | 'osm'>('streets');
  const [clickedCoord, setClickedCoord] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Leaflet Map safely in client
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import leaflet to prevent SSR window error
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        // Default center on India
        const map = L.map(mapContainerRef.current, {
          center: [20.5937, 78.9629],
          zoom: 5,
          minZoom: 2,
          maxZoom: 19,
          zoomControl: false,
        });

        // Add zoom control top right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Tile layer CartoDB Voyager / OSM
        const tileUrl = tileMode === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        const tileLayer = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        (map as any)._currentTileLayer = tileLayer;

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;

        // Map click handler to copy/show coordinates
        map.on('click', (e: any) => {
          setClickedCoord({
            lat: +e.latlng.lat.toFixed(4),
            lng: +e.latlng.lng.toFixed(4),
          });
        });

        leafletMapRef.current = map;
        setMapLoaded(true);
      }
    });

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update tile layer if tileMode changes
  useEffect(() => {
    if (!leafletMapRef.current || typeof window === 'undefined') return;
    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (map && map._currentTileLayer) {
        map.removeLayer(map._currentTileLayer);
        const tileUrl = tileMode === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : tileMode === 'osm'
          ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        const newLayer = L.tileLayer(tileUrl, {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        map._currentTileLayer = newLayer;
      }
    });
  }, [tileMode]);

  // Update markers when issues, crews, or selection changes
  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current || typeof window === 'undefined') return;

    import('leaflet').then((L) => {
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      const filteredIssues = selectedWardId
        ? issues.filter((i) => i.ward_id === selectedWardId)
        : issues;

      // 1. Render Issue Markers
      filteredIssues.forEach((issue) => {
        const isSelected = selectedIssue?.id === issue.id;
        const isResolved = issue.status === 'resolved';

        const color = isResolved
          ? '#10b981'
          : issue.severity === 'critical'
          ? '#ef4444'
          : issue.severity === 'high'
          ? '#f59e0b'
          : '#0284c7';

        const htmlIcon = `
          <div style="
            background: ${color};
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transform: translate(-50%, -50%);
            transition: transform 0.2s;
          ">
            ${issue.priority_score.toFixed(0)}
          </div>
        `;

        const customIcon = L.divIcon({
          html: htmlIcon,
          className: 'civic-issue-marker',
          iconSize: [26, 26],
        });

        const marker = L.marker([issue.latitude, issue.longitude], { icon: customIcon });

        marker.on('click', () => {
          onSelectIssue(issue);
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 2px;">
            <div style="font-weight: bold; font-size: 13px; color: ${color}; margin-bottom: 2px;">
              ${issue.title || issue.category.toUpperCase()}
            </div>
            <div style="margin-bottom: 4px; color: #475569;">
              Category: <b>${issue.category.replace('_', ' ')}</b> • Severity: <b>${issue.severity}</b>
            </div>
            <div style="font-size: 11px; background: #f1f5f9; padding: 4px 6px; border-radius: 6px;">
              Priority Score: <b>${issue.priority_score.toFixed(1)}/100</b>
            </div>
          </div>
        `);

        markersLayer.addLayer(marker);
      });

      // 2. Render Live Crew Markers
      crews.forEach((crew) => {
        const isBusy = crew.status === 'dispatched' || crew.status === 'busy';
        const crewColor = isBusy ? '#f59e0b' : '#10b981';

        const crewHtml = `
          <div style="
            background: #0f172a;
            border: 2px solid ${crewColor};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span style="font-size: 12px;">🚚</span>
          </div>
        `;

        const crewIcon = L.divIcon({
          html: crewHtml,
          className: 'civic-crew-marker',
          iconSize: [28, 28],
        });

        const crewMarker = L.marker([crew.latitude, crew.longitude], { icon: crewIcon });
        crewMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a;">
            <b>${crew.name}</b><br/>
            Status: <span style="color: ${crewColor}; font-weight: bold; text-transform: uppercase;">${crew.status}</span><br/>
            Ward: ${crew.ward_id}
          </div>
        `);
        markersLayer.addLayer(crewMarker);
      });
    });
  }, [issues, crews, selectedIssue, selectedWardId]);

  // Jump to location helper
  const jumpTo = (lat: number, lng: number, zoom: number, regionName: any) => {
    setActiveRegion(regionName);
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
  };

  return (
    <div className="relative w-full h-[540px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-2.5 rounded-xl border border-slate-700/60 shadow-xl">
        {/* Region Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Quick Nav:
          </span>
          <button
            onClick={() => jumpTo(20.5937, 78.9629, 5, 'india')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeRegion === 'india'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            🇮🇳 India
          </button>
          <button
            onClick={() => jumpTo(28.6139, 77.2090, 13, 'delhi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeRegion === 'delhi'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            🏛️ Delhi
          </button>
          <button
            onClick={() => jumpTo(19.0760, 72.8777, 13, 'mumbai')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeRegion === 'mumbai'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            🌊 Mumbai
          </button>
          <button
            onClick={() => jumpTo(12.9716, 77.5946, 13, 'bengaluru')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeRegion === 'bengaluru'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            💻 Bengaluru
          </button>
          <button
            onClick={() => jumpTo(20.0, 0.0, 2, 'world')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeRegion === 'world'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
            }`}
          >
            🌍 Whole World
          </button>
        </div>

        {/* Right side controls: Map tiles & Ward dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={tileMode}
            onChange={(e) => setTileMode(e.target.value as any)}
            className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none"
          >
            <option value="streets">Carto Streets</option>
            <option value="dark">Dark Matrix</option>
            <option value="osm">OpenStreetMap</option>
          </select>

          <select
            className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none"
            value={selectedWardId || ''}
            onChange={(e) => {
              onSelectWard(e.target.value);
              const found = wards.find((w) => w.id === e.target.value);
              if (found) {
                // Fly to ward center
                if (found.id.includes('DL')) jumpTo(28.6315, 77.2167, 13, 'delhi');
                else if (found.id.includes('MH-02')) jumpTo(19.0596, 72.8295, 13, 'mumbai');
                else if (found.id.includes('KA')) jumpTo(12.9784, 77.6408, 13, 'bengaluru');
                else if (found.id.includes('MH-04')) jumpTo(18.5314, 73.8446, 13, 'pune');
                else if (found.id.includes('GL-05')) jumpTo(51.5074, -0.1278, 12, 'world');
              }
            }}
          >
            <option value="">All Wards ({wards.length})</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="w-full flex-1 z-0" />

      {/* Bottom Floating Status Bar */}
      <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 z-[1000]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical (80+)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Resolved
          </span>
          <span className="flex items-center gap-1">
            <span>🚚</span> Live Municipal Crew
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          {clickedCoord ? (
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-sky-300">
              Selected GPS: <b>{clickedCoord.lat}, {clickedCoord.lng}</b>
            </span>
          ) : (
            <span>Click anywhere on the map to inspect GPS</span>
          )}
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> Global OpenStreetMap Tiles Active
          </span>
        </div>
      </div>
    </div>
  );
};
