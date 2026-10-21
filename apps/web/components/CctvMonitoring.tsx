'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraStatus, CctvDetection } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import { CctvVideoPlayer } from './CctvVideoPlayer';
import {
  Camera as CameraIcon,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Grid3X3,
  Grid2X2,
  Square,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Activity,
  Sparkles,
  Clock,
  Shield,
  Radio,
  ExternalLink,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  MapPin,
  ChevronRight,
  Flame,
  Zap,
  Database
} from 'lucide-react';

interface CctvMonitoringProps {
  onSelectIncident?: (detection: CctvDetection) => void;
  onOpenRecordings?: (cameraId: string) => void;
}

export function CctvMonitoring({ onSelectIncident, onOpenRecordings }: CctvMonitoringProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CameraStatus>('all');
  const [gridMode, setGridMode] = useState<'single' | '2x2' | '3x3'>('single');
  const [multiSelectedCams, setMultiSelectedCams] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalysisResult, setLastAnalysisResult] = useState<CctvDetection | null>(null);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('00:00:00');

  const mainVideoRef = useRef<HTMLVideoElement>(null);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const data = await api.getCctvCameras();
      setCameras(data);
      if (data.length > 0 && !selectedCamera) {
        setSelectedCamera(data[0]);
        setMultiSelectedCams(data.slice(0, 4).map((c) => c.id));
      }
    } catch (err) {
      console.error('Failed to load CCTV cameras', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentTimeDisplay(d.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredCameras = cameras.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleTogglePlay = () => {
    if (mainVideoRef.current) {
      if (mainVideoRef.current.paused) {
        mainVideoRef.current.play();
        setIsPlaying(true);
      } else {
        mainVideoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleMute = () => {
    if (mainVideoRef.current) {
      mainVideoRef.current.muted = !mainVideoRef.current.muted;
      setIsMuted(mainVideoRef.current.muted);
    }
  };

  const handleFullscreen = () => {
    if (mainVideoRef.current) {
      if (mainVideoRef.current.requestFullscreen) {
        mainVideoRef.current.requestFullscreen();
      }
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!selectedCamera) return;
    try {
      setAnalyzing(true);
      const res = await api.triggerAiVideoAnalysis(selectedCamera.id, undefined, 'all');
      setLastAnalysisResult(res.detection);
      // Reload camera state to show incident
      loadCameras();
    } catch (err) {
      console.error('AI Scan Error', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusBadge = (status: CameraStatus) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        );
      case 'incident_detected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Incident Detected
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/50">
            <WifiOff className="w-3 h-3" />
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Maintenance
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Telemetry Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <CameraIcon className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Citywide CCTV Surveillance & Live Monitoring
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/80">
                LIVE RTSP / HLS GATEWAY
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time optical camera grid with AI spatial perception, emergency incident detection, and instant dispatch links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grid Layout Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setGridMode('single')}
              title="Single Focused Camera"
              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                gridMode === 'single' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('2x2')}
              title="2x2 Multi-View Grid (4 Cameras)"
              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                gridMode === '2x2' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('3x3')}
              title="3x3 Tactical Grid (6+ Cameras)"
              className={`p-2 rounded-lg text-xs font-medium transition-all ${
                gridMode === '3x3' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          {/* Trigger AI Scan */}
          <button
            onClick={handleTriggerAnalysis}
            disabled={analyzing || !selectedCamera}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : 'text-amber-300'}`} />
            {analyzing ? 'Analyzing Video Stream...' : 'Run AI Temporal Scan'}
          </button>

          {/* Refresh */}
          <button
            onClick={loadCameras}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh Camera Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera List & Interactive Filter Tree (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[740px]">
            {/* Search Box */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search camera name, street, or code..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 pb-3 border-b border-slate-800 overflow-x-auto text-[11px]">
              {(['all', 'online', 'incident_detected', 'offline'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {st === 'all'
                    ? 'All'
                    : st === 'incident_detected'
                    ? '🚨 Incidents'
                    : st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>

            {/* Camera List */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 custom-scrollbar">
              {filteredCameras.map((cam) => {
                const isSelected = selectedCamera?.id === cam.id;
                const hasIncident = cam.status === 'incident_detected';
                return (
                  <div
                    key={cam.id}
                    onClick={() => setSelectedCamera(cam)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/10'
                        : hasIncident
                        ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-700'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                            hasIncident
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-sky-400 border border-slate-700'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                            {cam.name}
                            {cam.is_demo && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                DEMO
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">{cam.code}</span>
                        </div>
                      </div>
                      {getStatusBadge(cam.status)}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{cam.location_name}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{cam.ward_name?.split('-')[0] || cam.ward_id}</span>
                      <div className="flex items-center gap-2">
                        <span>{cam.resolution}</span>
                        <span>•</span>
                        <span>{cam.fps} FPS</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredCameras.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No cameras match your search filters.
                </div>
              )}
            </div>

            {/* Quick Metrics Footer */}
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">TOTAL</span>
                <span className="text-white font-bold text-xs">{cameras.length}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-emerald-400 block">ONLINE</span>
                <span className="text-emerald-400 font-bold text-xs">
                  {cameras.filter((c) => c.status === 'online').length}
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-rose-400 block">INCIDENTS</span>
                <span className="text-rose-400 font-bold text-xs">
                  {cameras.filter((c) => c.status === 'incident_detected').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Video Surveillance Grid & Inspection Console (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {gridMode === 'single' ? (
            /* Single Focused Camera View */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[740px]">
              {/* Camera Header Banner */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      LIVE FEED
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">|</span>
                  <div className="text-xs font-semibold text-slate-200">
                    {selectedCamera ? selectedCamera.name : 'Select a Camera'}
                  </div>
                  {selectedCamera?.is_demo && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      DEMO VIDEO
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-white">{currentTimeDisplay}</span>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                    {selectedCamera?.resolution || '1080p'} • 30fps
                  </span>
                </div>
              </div>

              {/* Video Player Canvas */}
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                {selectedCamera ? (
                  <CctvVideoPlayer
                    camera={selectedCamera}
                    isFocused={true}
                    showControls={true}
                  />
                ) : (
                  <div className="text-slate-500 text-xs">No camera selected</div>
                )}
              </div>


              {/* Bottom Inspection & Metadata Panel */}
              {selectedCamera && (
                <div className="bg-slate-950 p-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono">SECTOR WARD</span>
                    <span className="text-slate-200 font-semibold">{selectedCamera.ward_name || selectedCamera.ward_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono">STREAM PROTOCOL</span>
                    <span className="text-slate-200 font-mono uppercase">{selectedCamera.stream_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono">HARDWARE CAPABILITIES</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {selectedCamera.capabilities?.ptz ? 'PTZ' : 'FIXED'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-emerald-400">
                        AI-ON
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-400">
                        NIGHT-IR
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] font-mono">SECURITY INTEGRITY</span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3" /> VERIFIED LINK
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multi-Camera Grid View (2x2 or 3x3) */
            <div
              className={`bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl h-[740px] grid gap-3 overflow-y-auto ${
                gridMode === '2x2' ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'
              }`}
            >
              {cameras.slice(0, gridMode === '2x2' ? 4 : 6).map((cam) => {
                const isFocused = selectedCamera?.id === cam.id;
                return (
                  <div
                    key={cam.id}
                    className={`relative rounded-xl overflow-hidden bg-black border transition-all ${
                      isFocused ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CctvVideoPlayer
                      camera={cam}
                      showControls={false}
                      onOpenFocus={() => {
                        setSelectedCamera(cam);
                        setGridMode('single');
                      }}
                    />
                  </div>
                );
              })}
            </div>

          )}

          {/* AI Scan Result Callout if newly triggered */}
          {lastAnalysisResult && (
            <div className="bg-slate-900 border border-sky-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <img
                  src={lastAnalysisResult.snapshot_url}
                  alt="AI Detection Snapshot"
                  className="w-16 h-12 object-cover rounded-lg border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">AI Detection Generated:</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      {lastAnalysisResult.event_type.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {Math.round(lastAnalysisResult.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{lastAnalysisResult.description}</p>
                </div>
              </div>

              {onSelectIncident && (
                <button
                  onClick={() => onSelectIncident(lastAnalysisResult)}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shadow-md transition-all flex items-center gap-1"
                >
                  Triage Incident <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
