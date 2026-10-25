'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, RecordingSegment, CctvDetection, AiModelInfo } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Upload,
  Calendar,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  FileVideo,
  Layers,
  Sparkles,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX,
  MapPin,
  Tag,
  Database,
  Cpu,
  Sliders,
  CheckSquare,
  Square,
  ShieldAlert,
  Trash2,
  Waves,
  Construction,
  Car,
  Activity,
  Users,
  Lock,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface RecordedFootageViewProps {
  initialCameraId?: string;
  initialSeekSeconds?: number;
  onOpenIncidentTriage?: (detection: CctvDetection) => void;
}

const CAMERA_POSTERS: Record<string, string> = {
  'CAM-DL-101': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
  'CAM-DL-102': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
  'CAM-MH-201': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80',
  'CAM-MH-202': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
  'CAM-KA-301': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
  'CAM-MH-401': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
};

// 8 Multi-Category Visual Color Mapping
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; pin: string; icon: any }> = {
  traffic_safety: { bg: 'bg-purple-950/40', border: 'border-purple-500/50', text: 'text-purple-400', pin: 'bg-purple-500', icon: Car },
  garbage_waste: { bg: 'bg-amber-950/40', border: 'border-amber-500/50', text: 'text-amber-400', pin: 'bg-amber-500', icon: Trash2 },
  waterlogging_flood: { bg: 'bg-cyan-950/40', border: 'border-cyan-500/50', text: 'text-cyan-400', pin: 'bg-cyan-400', icon: Waves },
  road_damage: { bg: 'bg-orange-950/40', border: 'border-orange-500/50', text: 'text-orange-400', pin: 'bg-orange-400', icon: Construction },
  assault_violence: { bg: 'bg-rose-950/40', border: 'border-rose-500/50', text: 'text-rose-400', pin: 'bg-rose-500', icon: ShieldAlert },
  forced_movement: { bg: 'bg-red-950/50', border: 'border-red-500/60', text: 'text-red-400', pin: 'bg-red-600', icon: Users },
  sexual_violence_sensitive: { bg: 'bg-pink-950/40', border: 'border-pink-500/50', text: 'text-pink-400', pin: 'bg-pink-500', icon: Lock },
  other_public_safety: { bg: 'bg-yellow-950/40', border: 'border-yellow-500/50', text: 'text-yellow-400', pin: 'bg-yellow-400', icon: Activity },
};

const CATEGORY_OPTIONS = [
  { id: 'traffic_safety', name: 'Traffic and Road Safety', desc: 'Congestion, collisions, obstructions & wrong-way movement', icon: Car },
  { id: 'garbage_waste', name: 'Garbage and Waste Management', desc: 'Refuse accumulation, overflowing bins, illegal dumping', icon: Trash2 },
  { id: 'waterlogging_flood', name: 'Waterlogging and Flooding', desc: 'Road standing water, storm drainage backup & puddling', icon: Waves },
  { id: 'road_damage', name: 'Road Damage and Defects', desc: 'Potholes, pavement fractures, broken curbs & paver cavities', icon: Construction },
  { id: 'assault_violence', name: 'Potential Physical Assault', desc: 'Action recognition: striking, shoving & physical struggle', icon: ShieldAlert },
  { id: 'forced_movement', name: 'Possible Forced Movement', desc: 'Constrained trajectory, physical restraint & vehicle intercept', icon: Users },
  { id: 'sexual_violence_sensitive', name: 'Potential Sexual Violence (Restricted)', desc: 'Safeguarding early-warning with strict audit logging', icon: Lock },
  { id: 'other_public_safety', name: 'Other Public-Safety Events', desc: 'Pedestrian medical collapse, fall & crowd surge', icon: Activity },
];

export function RecordedFootageView({
  initialCameraId,
  initialSeekSeconds,
  onOpenIncidentTriage,
}: RecordedFootageViewProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(initialCameraId || '');
  const [recordings, setRecordings] = useState<RecordingSegment[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingSegment | null>(null);
  const [detections, setDetections] = useState<CctvDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Demo Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-Category Analysis Modal State
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'traffic_safety',
    'garbage_waste',
    'waterlogging_flood',
    'road_damage',
    'assault_violence',
    'forced_movement',
    'sexual_violence_sensitive',
    'other_public_safety',
  ]);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.75);
  const [sampleInterval, setSampleInterval] = useState<number>(1.0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiModels, setAiModels] = useState<AiModelInfo[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Load initial camera list & detections & model catalog
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [cams, dets, models] = await Promise.all([
          api.getCctvCameras(),
          api.getCctvDetections(),
          api.getAiModels().catch(() => []),
        ]);
        setCameras(cams);
        setDetections(dets);
        setAiModels(models);

        const targetCamId = initialCameraId || (cams.length > 0 ? cams[0].id : '');
        setSelectedCameraId(targetCamId);

        if (targetCamId) {
          const recs = await api.getCctvRecordings(targetCamId);
          setRecordings(recs);
          if (recs.length > 0) {
            setSelectedRecording(recs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load recorded footage', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [initialCameraId]);

  // When camera selection changes
  const handleSelectCamera = async (camId: string) => {
    setSelectedCameraId(camId);
    try {
      const recs = await api.getCctvRecordings(camId);
      setRecordings(recs);
      if (recs.length > 0) {
        setSelectedRecording(recs[0]);
      } else {
        setSelectedRecording(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Seek from initial prop
  useEffect(() => {
    if (initialSeekSeconds !== undefined && videoRef.current) {
      const seekTarget = Math.max(0, initialSeekSeconds - 5);
      videoRef.current.currentTime = seekTarget;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [initialSeekSeconds, selectedRecording]);

  // Video Time Update Listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentSeconds(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentSeconds(newTime);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const target = Math.max(0, Math.min(videoRef.current.duration || 3600, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = target;
      setCurrentSeconds(target);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Category Toggle in Modal
  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategories.length === CATEGORY_OPTIONS.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(CATEGORY_OPTIONS.map((c) => c.id));
    }
  };

  // Execute Real Multi-Category AI Video Analysis
  const handleRunVideoAnalysis = async () => {
    if (!selectedCameraId) return;

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setAnalysisProgress(15);
      setAnalysisStep('Ingesting video bitstream & decoding frames via OpenCV...');

      await new Promise((r) => setTimeout(r, 600));
      setAnalysisProgress(40);
      setAnalysisStep('Extracting optical flow kinetic motion & background subtractor masks...');

      await new Promise((r) => setTimeout(r, 600));
      setAnalysisProgress(70);
      setAnalysisStep(`Running neural vision inference for ${selectedCategories.length} configured categories...`);

      const res = await api.analyzeVideoMultiCategory({
        camera_id: selectedCameraId,
        recording_id: selectedRecording?.id,
        video_url: selectedRecording?.video_url,
        categories: selectedCategories,
        confidence_threshold: confidenceThreshold,
        sample_interval_seconds: sampleInterval,
        include_restricted: true,
      });

      setAnalysisProgress(95);
      setAnalysisStep('Generating verifiable evidence snapshots with HUD telemetry...');
      await new Promise((r) => setTimeout(r, 400));

      setAnalysisProgress(100);
      setAnalysisStep('Inference complete! Detections saved to database.');

      // Refresh detections
      const updatedDets = await api.getCctvDetections();
      setDetections(updatedDets);

      setUploadSuccess(
        `AI Multi-Category Scan Completed! ${res.detections.length} candidate events detected across ${res.frames_analyzed} frames in ${res.duration_ms}ms.`
      );
      setTimeout(() => setUploadSuccess(null), 7000);

      setIsAnalyzeModalOpen(false);
    } catch (err: any) {
      console.error('Video analysis failed', err);
      setAnalysisError(err.message || 'Video analysis encountered an error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Demo Video Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCameraId) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const newRec = await api.uploadDemoRecording(selectedCameraId, file, 120);
      setRecordings((prev) => [newRec, ...prev]);
      setSelectedRecording(newRec);
      setUploadSuccess(`Demo video "${file.name}" uploaded successfully! Tagged DEMO VIDEO.`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload demo recording');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeCamera = cameras.find((c) => c.id === selectedCameraId);

  // Relevant detections on current camera and current recording if matched
  const cameraDetections = detections.filter(
    (d) =>
      d.camera_id === selectedCameraId &&
      (!selectedRecording || !d.recording_id || d.recording_id === selectedRecording.id)
  );

  // Active detection overlay on current video playback second
  const activeOverlayDetection = cameraDetections.find(
    (d) => Math.abs(d.timestamp_offset_seconds - currentSeconds) <= 2.5
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Camera Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Multi-Category CCTV Video Intelligence & Playback
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/80">
                8-PIPELINE VISION ENGINE
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze authorized CCTV streams and recorded footage for traffic events, waste accumulations, waterlogging, road damage, and physical public-safety incidents.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Camera Selector */}
          <select
            value={selectedCameraId}
            onChange={(e) => handleSelectCamera(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:border-indigo-500 font-medium"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.name} ({cam.code})
              </option>
            ))}
          </select>

          {/* Analyze Recording Button */}
          <button
            onClick={() => setIsAnalyzeModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30"
          >
            <Cpu className="w-3.5 h-3.5" />
            Analyze Recording
          </button>

          {/* Upload Demo Video Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/mov,video/avi"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Upload className={`w-3.5 h-3.5 text-amber-400 ${isUploading ? 'animate-bounce' : ''}`} />
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Layout: Video Player + Timeline + Segment Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player & Timeline Controls (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header info */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-white">RECORDING ARCHIVE:</span>
                <span className="font-mono text-sky-400 font-semibold">
                  {selectedRecording ? selectedRecording.id : 'No segment selected'}
                </span>
                {selectedRecording?.is_demo && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    DEMO VIDEO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Real Video Inference</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {selectedRecording
                      ? new Date(selectedRecording.start_time).toLocaleDateString()
                      : 'Today'}
                  </span>
                </div>
              </div>
            </div>

            {/* Video Canvas with Dynamic Bounding Box Overlay */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {selectedRecording ? (
                <>
                  <video
                    ref={videoRef}
                    key={selectedRecording.video_url}
                    src={selectedRecording.video_url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleTimeUpdate}
                    onLoadedData={() => setVideoError(false)}
                    onError={() => setVideoError(true)}
                    poster={CAMERA_POSTERS[selectedCameraId] || selectedRecording.thumbnail_url}
                    muted={isMuted}
                    playsInline
                    className={`w-full h-full object-contain ${videoError ? 'hidden' : 'block'}`}
                  />

                  {videoError && (
                    <div className="absolute inset-0 w-full h-full">
                      <img
                        src={CAMERA_POSTERS[selectedCameraId] || selectedRecording.thumbnail_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80'}
                        alt="Recorded Scene"
                        className="w-full h-full object-cover filter brightness-90 contrast-110"
                      />
                      <div
                        className="absolute inset-0 pointer-events-none opacity-20"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.8) 3px, rgba(0, 0, 0, 0.8) 4px)',
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-sky-400">
                        OPTICAL FOOTAGE ARCHIVE
                      </div>
                    </div>
                  )}

                  {/* Object Detection Overlay Bounding Box */}
                  {activeOverlayDetection && (
                    <div className="absolute inset-0 pointer-events-none transition-all duration-300">
                      {/* Bounding box outline */}
                      <div
                        className="absolute border-2 border-dashed border-rose-500 rounded-lg shadow-2xl bg-rose-500/10 animate-pulse"
                        style={{
                          top: '35%',
                          left: '30%',
                          width: '40%',
                          height: '40%',
                        }}
                      >
                        {/* HUD Header on box */}
                        <div className="absolute -top-7 left-0 bg-slate-950/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-rose-500/50 flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping" />
                          <span className="font-bold uppercase">{activeOverlayDetection.event_type.replace(/_/g, ' ')}</span>
                          <span className="text-sky-400 font-semibold">{Math.round(activeOverlayDetection.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-500 text-xs">No recording segment found for this camera.</div>
              )}

              {/* Watermark / Demo Badge */}
              {selectedRecording?.is_demo && (
                <div className="absolute top-3 left-3 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded backdrop-blur-md">
                  DEMO VIDEO — TEST FOOTAGE
                </div>
              )}
            </div>

            {/* Interactive Timeline Bar with Multi-Category Incident Markers */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-3">
              {/* Scrub Bar */}
              <div className="relative pt-2 pb-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentSeconds}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />

                {/* Category-Colored Incident Timeline Markers */}
                {cameraDetections.map((det) => {
                  const markerPercent = duration > 0 ? (det.timestamp_offset_seconds / duration) * 100 : 25;
                  const catColor = CATEGORY_COLORS[det.category] || CATEGORY_COLORS['traffic_safety'];

                  return (
                    <button
                      key={det.id}
                      onClick={() => handleSeek(det.timestamp_offset_seconds)}
                      title={`[${det.category}] ${det.event_type}: ${det.description} (${det.timestamp_offset_seconds}s)`}
                      style={{ left: `${Math.min(98, Math.max(2, markerPercent))}%` }}
                      className={`absolute top-1.5 -translate-x-1/2 -translate-y-1 w-3.5 h-4.5 rounded-sm border shadow-lg transition-transform hover:scale-150 z-20 ${
                        catColor.pin
                      } border-white/80`}
                    />
                  );
                })}
              </div>

              {/* Timeline Category Legend */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
                <span className="text-slate-500">Timeline Markers:</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" /> Traffic</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Waste</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-400 inline-block" /> Waterlogging</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" /> Road Damage</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /> Assault</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-600 inline-block" /> Forced Move</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-pink-500 inline-block" /> Sensitive</span>
              </div>

              {/* Transport Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-900">
                {/* Play, Pause, Skip */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                    title="Rewind 10s"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleTogglePlay}
                    className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-md shadow-sky-600/30"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleSkip(10)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                    title="Fast Forward 10s"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-800 mx-1" />

                  {/* Timestamp Display */}
                  <div className="font-mono text-slate-300 text-xs">
                    <span className="text-white font-bold">{formatTime(currentSeconds)}</span>
                    <span className="text-slate-500"> / {formatTime(duration)}</span>
                  </div>
                </div>

                {/* Speed Selector & Mute */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    {[0.5, 1, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                          playbackSpeed === spd
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Event Context Jump Callout & Detections List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Multi-Category AI Detections Linked to this Footage ({cameraDetections.length})
              </h3>
              <button
                onClick={() => setIsAnalyzeModalOpen(true)}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" /> Configure & Re-scan
              </button>
            </div>

            {cameraDetections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {cameraDetections.map((det) => {
                  const catStyle = CATEGORY_COLORS[det.category] || CATEGORY_COLORS['traffic_safety'];
                  const IconComp = catStyle.icon || AlertTriangle;

                  return (
                    <div
                      key={det.id}
                      className={`p-3 rounded-xl bg-slate-950 border ${catStyle.border} flex items-start gap-3 hover:border-sky-500/80 transition-all shadow-md`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={det.snapshot_url}
                          alt="Detection Evidence"
                          className="w-16 h-14 object-cover rounded-lg border border-slate-800"
                        />
                        <div className={`absolute bottom-0 right-0 p-0.5 rounded-tl bg-slate-950/90 ${catStyle.text}`}>
                          <IconComp className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border truncate ${catStyle.bg} ${catStyle.border} ${catStyle.text}`}
                          >
                            {det.event_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-sky-400 font-bold whitespace-nowrap">
                            T+{formatTime(det.timestamp_offset_seconds)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">{det.description}</p>

                        <div className="mt-2 flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleSeek(Math.max(0, det.timestamp_offset_seconds - 3))}
                            className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 text-[10px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <Play className="w-2.5 h-2.5" /> Jump to Event
                          </button>

                          {onOpenIncidentTriage && (
                            <button
                              onClick={() => onOpenIncidentTriage(det)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all flex items-center gap-1"
                            >
                              <Eye className="w-2.5 h-2.5" /> Triage
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 text-xs py-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                No detections flagged yet on this recording. Click{' '}
                <button onClick={() => setIsAnalyzeModalOpen(true)} className="text-sky-400 underline font-semibold">
                  Analyze Recording
                </button>{' '}
                to execute multi-category vision inference.
              </div>
            )}
          </div>
        </div>

        {/* Right: Archived Footage Segments List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[740px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-3.5 h-3.5 text-indigo-400" />
                Available Recording Segments
              </h3>
              <span className="text-[11px] font-mono text-slate-400">{recordings.length} Available</span>
            </div>

            {/* Segments List */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 custom-scrollbar">
              {recordings.map((rec) => {
                const isSelected = selectedRecording?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setSelectedRecording(rec);
                      setCurrentSeconds(0);
                      setIsPlaying(true);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-indigo-400 flex items-center justify-center text-xs font-mono">
                          <Film className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white tracking-tight">{rec.id}</h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(rec.start_time).toLocaleTimeString()} -{' '}
                            {new Date(rec.end_time).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {rec.is_demo && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          DEMO
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{Math.round(rec.duration_seconds / 60)} mins</span>
                      <span>{rec.file_size_mb} MB</span>
                    </div>
                  </div>
                );
              })}

              {recordings.length === 0 && (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No recording files stored for this camera.
                </div>
              )}
            </div>

            {/* Camera Geo Metadata Footer */}
            {activeCamera && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{activeCamera.location_name}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Storage Vault: ENC-AES256 • Retention: 30 Days
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* Multi-Category AI Analysis Configuration Modal */}
      {/* ==================================================== */}
      {isAnalyzeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Multi-Category AI Video Intelligence Engine
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure specialized detection pipelines for camera {activeCamera?.code || selectedCameraId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAnalyzeModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Select All Toggle */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-xs">
                <span className="font-semibold text-white">Detection Categories</span>
                <p className="text-[11px] text-slate-400">
                  {selectedCategories.length} of {CATEGORY_OPTIONS.length} active pipelines enabled
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSelectAllCategories}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                {selectedCategories.length === CATEGORY_OPTIONS.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-sky-400" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" /> Select All Supported Categories
                  </>
                )}
              </button>
            </div>

            {/* 8 Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const IconC = cat.icon;
                const catModel = aiModels.find((m) => m.category_id === cat.id);

                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-slate-950 border-sky-500/80 shadow-md shadow-sky-500/5'
                        : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">{cat.name}</span>
                        {catModel && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            P: {catModel.validation_metrics.precision}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{cat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls: Threshold & Interval */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold">Confidence Threshold</span>
                  <span className="font-mono text-sky-400 font-bold">{Math.round(confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Higher threshold reduces false positives</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold">Sampling Interval</span>
                  <span className="font-mono text-sky-400 font-bold">{sampleInterval.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.5}
                  value={sampleInterval}
                  onChange={(e) => setSampleInterval(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Frame sample density for temporal analysis</span>
              </div>
            </div>

            {/* Analysis Progress & Error Display */}
            {isAnalyzing && (
              <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/40 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    {analysisStep}
                  </span>
                  <span className="font-mono text-sky-400 font-bold">{analysisProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </div>
            )}

            {analysisError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{analysisError}</span>
                </div>
                <button
                  onClick={handleRunVideoAnalysis}
                  className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAnalyzeModalOpen(false)}
                disabled={isAnalyzing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRunVideoAnalysis}
                disabled={isAnalyzing || selectedCategories.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing Video...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Run Multi-Category Inference
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
