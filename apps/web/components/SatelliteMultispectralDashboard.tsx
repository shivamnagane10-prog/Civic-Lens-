'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  CctvCoverageZone,
  CctvCoverageGap,
  SatelliteFinding,
  CameraPlacementRecommendation,
  Issue
} from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  Globe,
  Layers,
  MapPin,
  Camera as CameraIcon,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Eye,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  FileText,
  Send,
  Shield,
  ShieldAlert,
  Info,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Droplets,
  Construction,
  Video,
  Film,
  Building2,
  Check
} from 'lucide-react';

interface SatelliteMultispectralDashboardProps {
  onOpenCctvFeed?: (cameraId: string) => void;
  onOpenRecordings?: (cameraId: string) => void;
  onOpenIncidentTriage?: (detectionId?: string) => void;
  onComplaintCreated?: (issue: any) => void;
}

// Preset geographic inspection zones in Central Delhi
const PRESET_ZONES = [
  { id: 'cp_inner', name: 'Connaught Place Inner Circle', lat: 28.6328, lng: 77.2197, zoom: 16 },
  { id: 'shivaji_transit', name: 'Shivaji Transit Corridor', lat: 28.6318, lng: 77.2135, zoom: 17 },
  { id: 'tolstoy_marg', name: 'Tolstoy Marg Radial Sector', lat: 28.6248, lng: 77.2220, zoom: 16 },
  { id: 'barakhamba_service', name: 'Barakhamba Northern Lane', lat: 28.6345, lng: 77.2280, zoom: 16 },
  { id: 'minto_descent', name: 'Minto Overbridge Descent', lat: 28.6390, lng: 77.2250, zoom: 16 }
];

export function SatelliteMultispectralDashboard({
  onOpenCctvFeed,
  onOpenRecordings,
  onOpenIncidentTriage,
  onComplaintCreated,
}: SatelliteMultispectralDashboardProps) {
  // Data states
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [coverageZones, setCoverageZones] = useState<CctvCoverageZone[]>([]);
  const [coverageGaps, setCoverageGaps] = useState<CctvCoverageGap[]>([]);
  const [satelliteFindings, setSatelliteFindings] = useState<SatelliteFinding[]>([]);
  const [existingIssues, setExistingIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Map & View states
  const [activePreset, setActivePreset] = useState(PRESET_ZONES[0]);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6318, lng: 77.2180 });
  const [mapZoom, setMapZoom] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [searchRadiusMeters, setSearchRadiusMeters] = useState(300);

  // Layer Visibility Toggles
  const [layers, setLayers] = useState({
    satelliteImagery: true,
    streetGrid: true,
    registeredCameras: true,
    estimatedCoverage: true,
    potentialGaps: true,
    satelliteFindings: true,
    existingComplaints: true,
    recommendedPlacements: true,
  });

  // Selected entities for Inspection Side Panel
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'camera' | 'gap' | 'finding' | 'custom_area';
    data: any;
  } | null>(null);

  // Modal states
  const [isSuggestingCamera, setIsSuggestingCamera] = useState(false);
  const [suggestedCameraType, setSuggestedCameraType] = useState('PTZ Dome 4K with IR');
  const [suggestedJustification, setSuggestedJustification] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const [analyzingArea, setAnalyzingArea] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load telemetry data from backend
  const loadData = async () => {
    try {
      setLoading(true);
      const [camsData, covData, gapsData, findingsData, issuesData] = await Promise.all([
        api.getCctvCameras(),
        api.getCctvCoverage(),
        api.getCctvCoverageGaps(),
        api.getSatelliteFindings(),
        api.getIssues(),
      ]);

      setCameras(camsData);
      setCoverageZones(covData.coverage_zones || []);
      setCoverageGaps(gapsData);
      setSatelliteFindings(findingsData);
      setExistingIssues(issuesData);

      // Default select the first critical coverage gap
      if (gapsData.length > 0 && !selectedEntity) {
        setSelectedEntity({ type: 'gap', data: gapsData[0] });
      }
    } catch (err) {
      console.error('Failed to load satellite coverage data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleSelectPreset = (preset: typeof PRESET_ZONES[0]) => {
    setActivePreset(preset);
    setMapCenter({ lat: preset.lat, lng: preset.lng });
    setMapZoom(preset.zoom);

    // If there's a matching gap in this zone, select it
    const matchingGap = coverageGaps.find(
      (g) => Math.abs(g.center_lat - preset.lat) < 0.003 && Math.abs(g.center_lng - preset.lng) < 0.003
    );
    if (matchingGap) {
      setSelectedEntity({ type: 'gap', data: matchingGap });
    } else {
      setSelectedEntity({
        type: 'custom_area',
        data: {
          area_name: preset.name,
          center_lat: preset.lat,
          center_lng: preset.lng,
          radius_meters: searchRadiusMeters,
        },
      });
    }
  };

  // Trigger real-time optical multispectral analysis on active coordinate
  const handleTriggerSatelliteScan = async () => {
    try {
      setAnalyzingArea(true);
      const targetName = selectedEntity?.data?.area_name || activePreset.name;
      const targetLat = selectedEntity?.data?.center_lat || selectedEntity?.data?.latitude || mapCenter.lat;
      const targetLng = selectedEntity?.data?.center_lng || selectedEntity?.data?.longitude || mapCenter.lng;

      const res = await api.triggerSatelliteAnalysis({
        area_name: targetName,
        latitude: targetLat,
        longitude: targetLng,
        radius_meters: searchRadiusMeters,
        spectral_profile: 'optical_multispectral_v3',
      });

      setSatelliteFindings(res.findings);
      if (res.finding) {
        setSelectedEntity({ type: 'finding', data: res.finding });
      }

      setActionNotice(`✅ Optical multispectral pass complete! Satellite finding generated for ${targetName}.`);
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err) {
      console.error('Satellite scan error', err);
    } finally {
      setAnalyzingArea(false);
    }
  };

  // Submit formal CCTV camera placement recommendation
  const handleSubmitPlacementRecommendation = async () => {
    if (!selectedEntity) return;
    try {
      setIsSubmittingSuggestion(true);
      const gap = selectedEntity.type === 'gap' ? selectedEntity.data : null;
      const areaName = gap ? gap.area_name : (selectedEntity.data.name || selectedEntity.data.area_name || 'Unmonitored Sector');
      const lat = gap ? gap.center_lat : (selectedEntity.data.center_lat || selectedEntity.data.latitude || mapCenter.lat);
      const lng = gap ? gap.center_lng : (selectedEntity.data.center_lng || selectedEntity.data.longitude || mapCenter.lng);

      const res = await api.createCameraPlacementRecommendation({
        gap_id: gap?.id,
        area_name: areaName,
        proposed_latitude: lat,
        proposed_longitude: lng,
        recommended_camera_type: suggestedCameraType,
        ward_id: 'WARD-DL-01',
        estimated_coverage_radius_meters: 200,
        justification: suggestedJustification || `Identified CCTV-free gap with distance > ${gap?.distance_to_nearest_camera_meters || 350}m to nearest camera.`,
        submitted_by: 'DIRECTOR-SARAH-VANCE',
      });

      setIsSuggestingCamera(false);
      setSuggestedJustification('');
      setActionNotice(`📋 Camera Placement Recommendation #${res.id} submitted for municipal infrastructure assessment!`);
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  // Promote satellite finding to civic complaint
  const handlePromoteFindingToComplaint = async (finding: SatelliteFinding) => {
    try {
      const res = await api.promoteSatelliteFindingToComplaint(finding.id, {
        title: `Satellite Ingestion: ${finding.title}`,
        description: `${finding.description} Observable facts: ${finding.observable_indicators.join('; ')}. Source: ${finding.imagery_source}.`,
        ward_id: 'WARD-DL-01',
        severity: finding.severity,
      });

      // Update local finding state
      setSatelliteFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, status: 'promoted_to_complaint', complaint_id: res.issue_id } : f))
      );
      if (selectedEntity?.type === 'finding' && selectedEntity.data.id === finding.id) {
        setSelectedEntity({
          type: 'finding',
          data: { ...finding, status: 'promoted_to_complaint', complaint_id: res.issue_id },
        });
      }

      if (onComplaintCreated) {
        onComplaintCreated(res);
      }

      setActionNotice(`🚀 Satellite finding converted to Civic Complaint #${res.issue_id}! Routed to Corporator for repair sanction.`);
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err) {
      console.error(err);
    }
  };

  // Find cameras within current search radius from map center
  const nearbyCameras = cameras.map((cam) => {
    // Rough distance calculation in meters
    const dLat = (cam.latitude - mapCenter.lat) * 111000;
    const dLng = (cam.longitude - mapCenter.lng) * 111000 * Math.cos((mapCenter.lat * Math.PI) / 180);
    const dist = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
    return { ...cam, distanceMeters: dist };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);

  const nearestCam = nearbyCameras[0];
  const camerasInRadius = nearbyCameras.filter((c) => c.distanceMeters <= searchRadiusMeters);

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : ''}`}>
      {/* Top Demo Layout Bar (Matching Specification & Reference Image 2) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Satellite Multispectral — CCTV-Free Area Detection
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Demo layout
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800/80">
                  0.5m GSD ORBIT 42B
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect geographic sectors via multispectral satellite passes to identify unmonitored zones, calculate CCTV coverage gaps, and detect macroscopic infrastructure hazards.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Hub Navigation Cards (Live cameras, Recordings, AI detections, Incident review) */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenCctvFeed && (
            <button
              onClick={() => onOpenCctvFeed(cameras[0]?.id || 'CAM-DL-101')}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live cameras</span>
            </button>
          )}

          {onOpenRecordings && (
            <button
              onClick={() => onOpenRecordings(cameras[0]?.id || 'CAM-DL-101')}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Recordings</span>
            </button>
          )}

          {onOpenIncidentTriage && (
            <button
              onClick={() => onOpenIncidentTriage()}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>AI detections</span>
            </button>
          )}

          {/* Trigger Satellite Optical Scan */}
          <button
            onClick={handleTriggerSatelliteScan}
            disabled={analyzingArea}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${analyzingArea ? 'animate-spin' : 'text-amber-300'}`} />
            {analyzingArea ? 'Scanning Orbit Pass...' : 'Fire Satellite Detection'}
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="bg-purple-950/60 border border-purple-500/50 rounded-2xl p-3.5 shadow-xl flex items-center justify-between text-xs text-purple-200 animate-fadeIn">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-purple-400 hover:text-white font-bold ml-3">✕</button>
        </div>
      )}

      {/* Main Grid: Interactive Satellite Map (8 Cols) & Inspection Panel (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Satellite Map & Layer Controls */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col h-[760px] relative overflow-hidden">
            {/* Map Top Bar: Zone Selector, Search, Radius, Fullscreen */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-800 z-20 bg-slate-900/90 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" /> Sector:
                </span>
                <select
                  value={activePreset.id}
                  onChange={(e) => {
                    const found = PRESET_ZONES.find((p) => p.id === e.target.value);
                    if (found) handleSelectPreset(found);
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                >
                  {PRESET_ZONES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Radius filter & Layer Toggle Pills */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded-xl text-[11px] font-mono text-slate-300">
                  <span className="text-slate-500">Search Radius:</span>
                  <select
                    value={searchRadiusMeters}
                    onChange={(e) => setSearchRadiusMeters(Number(e.target.value))}
                    className="bg-transparent text-purple-400 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value={200} className="bg-slate-900 text-white">200m</option>
                    <option value={300} className="bg-slate-900 text-white">300m</option>
                    <option value={500} className="bg-slate-900 text-white">500m</option>
                    <option value={800} className="bg-slate-900 text-white">800m</option>
                  </select>
                </div>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Interactive Canvas / Visual Satellite View */}
            <div className="relative flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 my-3">
              {/* Satellite High-Res Imagery Texture / Optical Tile */}
              <div
                className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
                  layers.satelliteImagery ? 'opacity-90 filter brightness-95 contrast-110' : 'opacity-20'
                }`}
                style={{
                  backgroundImage:
                    'url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=80)',
                }}
              />

              {/* Orthorectified Grid Overlay */}
              {layers.streetGrid && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-25"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />
              )}

              {/* Map Telemetry HUD (Top Left) */}
              <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1 pointer-events-none z-10">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  SATELLITE PASS: SENTINEL-2 MSI
                </div>
                <div className="text-slate-400">
                  GSD: 0.5m/px • Band B04/B08/B11
                </div>
                <div className="text-slate-400">
                  Acquisition: 2026-10-18T05:42Z
                </div>
                <div className="text-sky-400 font-bold">
                  Center: {mapCenter.lat.toFixed(4)}°N, {mapCenter.lng.toFixed(4)}°E
                </div>
              </div>

              {/* Coverage Gaps & CCTV-Free Areas (Polygon / Ring Overlays) */}
              {layers.potentialGaps &&
                coverageGaps.map((gap, idx) => {
                  const isSelected = selectedEntity?.type === 'gap' && selectedEntity.data.id === gap.id;
                  // Relative positioning offsets inside container
                  const topOffset = 25 + idx * 16;
                  const leftOffset = 28 + (idx % 2 === 0 ? idx * 14 : -idx * 8);

                  return (
                    <div
                      key={gap.id}
                      onClick={() => setSelectedEntity({ type: 'gap', data: gap })}
                      style={{ top: `${topOffset}%`, left: `${leftOffset}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group transition-transform ${
                        isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                      }`}
                    >
                      {/* Unmonitored Gap Area Circle */}
                      <div
                        className={`w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-rose-500/25 border-rose-400 ring-4 ring-rose-500/30 animate-pulse'
                            : 'bg-rose-950/40 border-rose-500/60 hover:bg-rose-900/30'
                        }`}
                      >
                        <div className="bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-lg border border-rose-500/60 text-center shadow-lg">
                          <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1 justify-center">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            CCTV GAP
                          </span>
                          <span className="text-[9px] font-mono text-slate-300 block line-clamp-1 max-w-[90px]">
                            {gap.area_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Estimated CCTV Coverage Zones (Circular optical cones around cameras) */}
              {layers.estimatedCoverage &&
                coverageZones.map((zone, idx) => {
                  const topOffset = 20 + (idx * 22) % 65;
                  const leftOffset = 18 + (idx * 25) % 70;

                  return (
                    <div
                      key={zone.id}
                      style={{ top: `${topOffset}%`, left: `${leftOffset}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <div className="w-36 h-36 rounded-full border border-sky-500/40 bg-sky-500/10 flex items-center justify-center">
                        <span className="text-[8px] font-mono text-sky-300/70 uppercase">
                          Cov ~{zone.radius_meters}m
                        </span>
                      </div>
                    </div>
                  );
                })}

              {/* Registered CCTV Camera Markers */}
              {layers.registeredCameras &&
                cameras.map((cam, idx) => {
                  const isSelected = selectedEntity?.type === 'camera' && selectedEntity.data.id === cam.id;
                  const topOffset = 20 + (idx * 22) % 65;
                  const leftOffset = 18 + (idx * 25) % 70;

                  return (
                    <button
                      key={cam.id}
                      onClick={() => setSelectedEntity({ type: 'camera', data: cam })}
                      style={{ top: `${topOffset}%`, left: `${leftOffset}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full shadow-xl transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950 ring-4 ring-sky-400/40 scale-125'
                          : 'bg-slate-950/90 text-sky-400 border border-sky-500/50 hover:bg-sky-900/50 hover:scale-110'
                      }`}
                      title={`${cam.name} (${cam.status})`}
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}

              {/* Satellite Findings Markers (Surface damage, Subsidence, Flooding) */}
              {layers.satelliteFindings &&
                satelliteFindings.map((finding, idx) => {
                  const isSelected = selectedEntity?.type === 'finding' && selectedEntity.data.id === finding.id;
                  const topOffset = 35 + (idx * 18);
                  const leftOffset = 42 + (idx * 15);

                  return (
                    <button
                      key={finding.id}
                      onClick={() => setSelectedEntity({ type: 'finding', data: finding })}
                      style={{ top: `${topOffset}%`, left: `${leftOffset}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 px-2.5 py-1 rounded-xl shadow-xl transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white ring-4 ring-purple-400/40 scale-110'
                          : 'bg-purple-950/90 text-purple-300 border border-purple-500/50 hover:scale-105'
                      }`}
                    >
                      {finding.finding_category === 'flooding' ? (
                        <Droplets className="w-3.5 h-3.5 text-cyan-300" />
                      ) : finding.finding_category === 'construction_impact' ? (
                        <Construction className="w-3.5 h-3.5 text-amber-300" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-purple-300" />
                      )}
                      <span className="text-[10px] font-mono font-bold">{finding.id}</span>
                    </button>
                  );
                })}

              {/* Map Legend (Bottom Right) */}
              <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1.5 shadow-xl pointer-events-none z-10">
                <span className="text-slate-400 font-bold block text-[9px] uppercase border-b border-slate-800 pb-1">
                  Multispectral Map Legend
                </span>
                <div className="flex items-center gap-2 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Registered CCTV Camera
                </div>
                <div className="flex items-center gap-2 text-sky-300">
                  <span className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-sky-500/20" /> Estimated Coverage Zone (~180m)
                </div>
                <div className="flex items-center gap-2 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-rose-500 bg-rose-500/20" /> No Registered CCTV Detected (Gap)
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Satellite Optical Finding
                </div>
              </div>
            </div>

            {/* Bottom Layer Toggle Bar */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-500 uppercase mr-1">Layers:</span>
                <button
                  onClick={() => toggleLayer('satelliteImagery')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    layers.satelliteImagery
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Satellite Optical
                </button>
                <button
                  onClick={() => toggleLayer('registeredCameras')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    layers.registeredCameras
                      ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  CCTV Cameras ({cameras.length})
                </button>
                <button
                  onClick={() => toggleLayer('estimatedCoverage')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    layers.estimatedCoverage
                      ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Coverage Zones
                </button>
                <button
                  onClick={() => toggleLayer('potentialGaps')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    layers.potentialGaps
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  CCTV Gaps ({coverageGaps.length})
                </button>
                <button
                  onClick={() => toggleLayer('satelliteFindings')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    layers.satelliteFindings
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Satellite Findings ({satelliteFindings.length})
                </button>
              </div>

              {/* Data Freshness Indicator */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Registry Synced: <strong>{cameras.length} Active Feeds</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Location Inspection Side Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[760px] justify-between">
            {/* Header of Inspector */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Geographic Sector Inspector
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-purple-300 border border-slate-800">
                  {selectedEntity ? selectedEntity.type.toUpperCase() : 'NO SELECTION'}
                </span>
              </div>

              {/* Ethical Safeguard & Technical Disclosure */}
              <div className="mt-3 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200/90 space-y-1">
                <span className="font-bold flex items-center gap-1 text-[10px] text-purple-300 font-mono">
                  <Info className="w-3 h-3 text-purple-400" /> System Limitation & Disclosure:
                </span>
                <p className="text-[10px] leading-relaxed text-slate-300">
                  Satellite imagery inspects macroscopic infrastructure changes and geometry. It cannot detect individual CCTV cameras or small incidents directly. Coverage calculations rely on registered municipal inventory.
                </p>
              </div>

              {/* Content depending on Selected Entity */}
              <div className="mt-4 space-y-4 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
                {/* 1. CCTV Coverage Gap Selected */}
                {selectedEntity?.type === 'gap' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {selectedEntity.data.classification}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          Priority Score: {selectedEntity.data.priority_score}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{selectedEntity.data.area_name}</h4>
                      <p className="text-xs text-slate-300">{selectedEntity.data.rationale}</p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-rose-500/20">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Nearest Registered Cam:</span>
                          <span className="text-white font-semibold">{selectedEntity.data.nearest_camera_id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Distance to Nearest:</span>
                          <span className="text-rose-400 font-bold">{selectedEntity.data.distance_to_nearest_camera_meters} meters</span>
                        </div>
                      </div>
                    </div>

                    {/* Surrounding Camera Density Breakdown */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Nearby Registered Cameras ({camerasInRadius.length} in {searchRadiusMeters}m):
                      </span>
                      {camerasInRadius.length > 0 ? (
                        camerasInRadius.slice(0, 3).map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-[11px] text-slate-300">
                            <span className="truncate max-w-[180px]">{c.name}</span>
                            <span className="font-mono text-sky-400">{c.distanceMeters}m away</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-rose-400 text-[11px] font-mono flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Zero authorized cameras registered in {searchRadiusMeters}m radius!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Registered Camera Selected */}
                {selectedEntity?.type === 'camera' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-sky-950/30 border border-sky-500/40 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {selectedEntity.data.code}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {selectedEntity.data.status.toUpperCase()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{selectedEntity.data.name}</h4>
                      <p className="text-xs text-slate-300">{selectedEntity.data.location_name}</p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-sky-500/20">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Resolution:</span>
                          <span className="text-white">{selectedEntity.data.resolution || '1080p'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Estimated Range:</span>
                          <span className="text-sky-300 font-bold">180m Optical Buffer</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct action to jump to CCTV Monitoring or Footage */}
                    {onOpenCctvFeed && (
                      <button
                        onClick={() => onOpenCctvFeed(selectedEntity.data.id)}
                        className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Open Live CCTV Footage
                      </button>
                    )}
                  </div>
                )}

                {/* 3. Satellite Finding Selected */}
                {selectedEntity?.type === 'finding' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-purple-950/30 border border-purple-500/40 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                          {selectedEntity.data.finding_category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {Math.round(selectedEntity.data.confidence * 100)}% Confidence
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{selectedEntity.data.title}</h4>
                      <p className="text-xs text-slate-300">{selectedEntity.data.description}</p>

                      <div className="space-y-1 pt-2 border-t border-purple-500/20 text-xs">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Multispectral Indicators:
                        </span>
                        {selectedEntity.data.observable_indicators?.map((ind: string, i: number) => (
                          <div key={i} className="text-[11px] text-slate-300 flex items-start gap-1">
                            <Check className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                            <span>{ind}</span>
                          </div>
                        ))}
                      </div>

                      {/* Complaint Status if already generated */}
                      {selectedEntity.data.complaint_id && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between font-mono">
                          <span>Complaint Lodged:</span>
                          <span className="font-bold text-white">#{selectedEntity.data.complaint_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Promote to Civic Complaint Button */}
                    {!selectedEntity.data.complaint_id && (
                      <button
                        onClick={() => handlePromoteFindingToComplaint(selectedEntity.data)}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Generate Municipal Complaint
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setIsSuggestingCamera(true)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Suggest CCTV Placement in this Sector
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Suggest New Camera Placement in CCTV Gap */}
      {isSuggestingCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CameraIcon className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Propose New CCTV Placement
                </h3>
              </div>
              <button
                onClick={() => setIsSuggestingCamera(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Submit a formal camera placement proposal for municipal planning assessment. Does not fabricate an emergency dispatch; creates an authorized infrastructure work plan.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Target Unmonitored Area
                </label>
                <input
                  type="text"
                  value={selectedEntity?.data?.area_name || activePreset.name}
                  disabled
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Recommended Hardware Type
                </label>
                <select
                  value={suggestedCameraType}
                  onChange={(e) => setSuggestedCameraType(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="PTZ Dome 4K with IR">PTZ Dome 4K (360° Continuous Pan, 240m Range)</option>
                  <option value="Dual-Sensor Optical/IR Fixed">Dual-Sensor Optical/IR Fixed (180° High FOV)</option>
                  <option value="Weatherproof Junction Box Fixed">Weatherproof Junction Box Fixed 1080p</option>
                  <option value="Solar-Powered Wireless Edge Unit">Solar-Powered Wireless Edge CCTV Unit</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Coverage Justification & Notes
                </label>
                <textarea
                  value={suggestedJustification}
                  onChange={(e) => setSuggestedJustification(e.target.value)}
                  placeholder="Explain why this location warrants priority installation (e.g. blind spot adjacent to school / high-transit pedestrian corridor outside optical view)..."
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsSuggestingCamera(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPlacementRecommendation}
                disabled={isSubmittingSuggestion}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                {isSubmittingSuggestion ? 'Submitting...' : 'Submit Placement Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
