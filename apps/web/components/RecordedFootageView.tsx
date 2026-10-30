'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RecordingSegment,
  CctvDetection,
  AiModelInfo,
  AnalysisJob,
  AnalysisJobStatus,
} from '@civiclens/shared-types';
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
  Target,
  Check,
} from 'lucide-react';

interface RecordedFootageViewProps {
  initialCameraId?: string;
  initialSeekSeconds?: number;
  onOpenIncidentTriage?: (detection: CctvDetection) => void;
  userRole?: string;
}

const CAMERA_POSTERS: Record<string, string> = {
  'CAM-DL-101': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
  'CAM-DL-102': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
  'CAM-MH-201': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80',
  'CAM-MH-202': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
  'CAM-KA-301': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
  'CAM-MH-401': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
};

// Robust Multi-Category Visual Color Mapping supporting exact categories and common aliases
export function getCategoryColor(category: string = '', eventType: string = '') {
  const cat = (category || '').toLowerCase();
  const et = (eventType || '').toLowerCase();

  if (cat.includes('traffic') || et.includes('traffic') || et.includes('vehicle') || et.includes('congestion')) {
    return {
      bg: 'bg-purple-950/60',
      border: 'border-purple-500',
      text: 'text-purple-300',
      pin: 'bg-purple-500',
      hex: '#a855f7',
      label: 'Traffic & Transit',
      icon: Car,
    };
  }
  if (cat.includes('garbage') || cat.includes('waste') || et.includes('garbage') || et.includes('waste')) {
    return {
      bg: 'bg-amber-950/60',
      border: 'border-amber-500',
      text: 'text-amber-300',
      pin: 'bg-amber-500',
      hex: '#f59e0b',
      label: 'Garbage & Waste',
      icon: Trash2,
    };
  }
  if (cat.includes('water') || cat.includes('flood') || cat.includes('drain') || et.includes('water') || et.includes('drain')) {
    return {
      bg: 'bg-cyan-950/60',
      border: 'border-cyan-400',
      text: 'text-cyan-300',
      pin: 'bg-cyan-400',
      hex: '#22d3ee',
      label: 'Waterlogging & Flood',
      icon: Waves,
    };
  }
  if (cat.includes('road') || cat.includes('pothole') || et.includes('pothole') || et.includes('crack') || et.includes('damage')) {
    return {
      bg: 'bg-orange-950/60',
      border: 'border-orange-500',
      text: 'text-orange-300',
      pin: 'bg-orange-500',
      hex: '#f97316',
      label: 'Road Damage & Potholes',
      icon: Construction,
    };
  }
  if (cat.includes('assault') || cat.includes('violen') || et.includes('assault') || et.includes('altercation')) {
    return {
      bg: 'bg-rose-950/60',
      border: 'border-rose-500',
      text: 'text-rose-300',
      pin: 'bg-rose-500',
      hex: '#f43f5e',
      label: 'Physical Assault',
      icon: ShieldAlert,
    };
  }
  if (cat.includes('forced') || cat.includes('kidnap') || et.includes('forced') || et.includes('restraint')) {
    return {
      bg: 'bg-red-950/70',
      border: 'border-red-600',
      text: 'text-red-300',
      pin: 'bg-red-600',
      hex: '#dc2626',
      label: 'Forced Movement',
      icon: Users,
    };
  }
  if (cat.includes('sex') || cat.includes('harass') || et.includes('sexual')) {
    return {
      bg: 'bg-pink-950/60',
      border: 'border-pink-500',
      text: 'text-pink-300',
      pin: 'bg-pink-500',
      hex: '#ec4899',
      label: 'Sensitive Safeguarding',
      icon: Lock,
    };
  }
  return {
    bg: 'bg-yellow-950/60',
    border: 'border-yellow-500',
    text: 'text-yellow-300',
    pin: 'bg-yellow-400',
    hex: '#eab308',
    label: 'Public Safety Hazard',
    icon: Activity,
  };
}

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
  userRole = 'admin',
}: RecordedFootageViewProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(initialCameraId || '');
  const [recordings, setRecordings] = useState<RecordingSegment[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingSegment | null>(null);

  // Recording-isolated detections & analysis job
  const [recordingDetections, setRecordingDetections] = useState<CctvDetection[]>([]);
  const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null);
  const [selectedOverlayDetectionId, setSelectedOverlayDetectionId] = useState<string | null>(null);
  const [showAllDetectionsOnOverlay, setShowAllDetectionsOnOverlay] = useState<boolean>(false);
  const [resultsCategoryFilter, setResultsCategoryFilter] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  // Video container layout calculation for responsive coordinate conversion & letterbox handling
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoLayout, setVideoLayout] = useState<{
    containerWidth: number;
    containerHeight: number;
    renderWidth: number;
    renderHeight: number;
    offsetX: number;
    offsetY: number;
  }>({
    containerWidth: 640,
    containerHeight: 360,
    renderWidth: 640,
    renderHeight: 360,
    offsetX: 0,
    offsetY: 0,
  });

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

  // Update layout accounting for object-fit: contain letterbox & pillarbox
  const updateVideoLayout = useCallback(() => {
    const container = videoContainerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    if (cWidth === 0 || cHeight === 0) return;

    const vWidth = video?.videoWidth || 1280;
    const vHeight = video?.videoHeight || 720;
    const videoAspect = vWidth / vHeight;
    const containerAspect = cWidth / cHeight;

    let rWidth = cWidth;
    let rHeight = cHeight;
    let offX = 0;
    let offY = 0;

    if (containerAspect > videoAspect) {
      // Pillarbox: black bars on left/right
      rHeight = cHeight;
      rWidth = rHeight * videoAspect;
      offX = (cWidth - rWidth) / 2;
    } else {
      // Letterbox: black bars on top/bottom
      rWidth = cWidth;
      rHeight = rWidth / videoAspect;
      offY = (cHeight - rHeight) / 2;
    }

    setVideoLayout({
      containerWidth: cWidth,
      containerHeight: cHeight,
      renderWidth: rWidth,
      renderHeight: rHeight,
      offsetX: offX,
      offsetY: offY,
    });
  }, []);

  // ResizeObserver on video container for responsive overlay alignment
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateVideoLayout();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [updateVideoLayout]);

  // Load initial camera list, models
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [cams, models] = await Promise.all([
          api.getCctvCameras(),
          api.getAiModels().catch(() => []),
        ]);
        setCameras(cams);
        setAiModels(models);

        const targetCamId = initialCameraId || (cams.length > 0 ? cams[0].id : '');
        setSelectedCameraId(targetCamId);

        if (targetCamId) {
          const recs = await api.getCctvRecordings(targetCamId);
          setRecordings(recs);
          if (recs.length > 0) {
            handleSelectRecording(recs[0]);
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

  // Load recording-specific data whenever a recording is selected
  const handleSelectRecording = async (rec: RecordingSegment) => {
    setSelectedRecording(rec);
    setCurrentSeconds(0);
    setSelectedOverlayDetectionId(null);
    setVideoError(false);
    setIsPlaying(false);

    try {
      const [dets, job] = await Promise.all([
        api.getCctvDetections({ recording_id: rec.id }),
        api.getRecordingAnalysisJob(rec.id).catch(() => null),
      ]);
      setRecordingDetections(dets);
      setAnalysisJob(job);
    } catch (err) {
      console.error('Failed to load recording detections', err);
      setRecordingDetections([]);
    }
  };

  // When camera selection changes
  const handleSelectCamera = async (camId: string) => {
    setSelectedCameraId(camId);
    try {
      const recs = await api.getCctvRecordings(camId);
      setRecordings(recs);
      if (recs.length > 0) {
        handleSelectRecording(recs[0]);
      } else {
        setSelectedRecording(null);
        setRecordingDetections([]);
        setAnalysisJob(null);
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
      const vDur = videoRef.current.duration;
      if (vDur && !isNaN(vDur) && vDur > 0) {
        setDuration(vDur);
      } else if (selectedRecording?.duration_seconds) {
        setDuration(selectedRecording.duration_seconds);
      }
      updateVideoLayout();
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      const clamped = Math.max(0, Math.min(duration || 60, newTime));
      videoRef.current.currentTime = clamped;
      setCurrentSeconds(clamped);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const target = Math.max(0, Math.min(duration || 60, videoRef.current.currentTime + seconds));
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
    if (!selectedCameraId || !selectedRecording) return;

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setAnalysisProgress(15);
      setAnalysisStep('Ingesting bitstream & decoding video frames via OpenCV...');

      await new Promise((r) => setTimeout(r, 400));
      setAnalysisProgress(40);
      setAnalysisStep('Extracting optical flow kinetic motion & background subtractor masks...');

      await new Promise((r) => setTimeout(r, 400));
      setAnalysisProgress(70);
      setAnalysisStep(`Running neural vision inference for ${selectedCategories.length} categories...`);

      const res = await api.analyzeVideoMultiCategory({
        camera_id: selectedCameraId,
        recording_id: selectedRecording.id,
        video_url: selectedRecording.video_url,
        categories: selectedCategories,
        confidence_threshold: confidenceThreshold,
        sample_interval_seconds: sampleInterval,
        include_restricted: true,
      });

      setAnalysisProgress(95);
      setAnalysisStep('Generating verifiable evidence snapshots with HUD telemetry...');
      await new Promise((r) => setTimeout(r, 300));

      setAnalysisProgress(100);
      setAnalysisStep('Inference complete! Detections saved to database.');

      // Directly update detections with response
      setRecordingDetections(res.detections);
      if (res.video_duration_seconds && res.video_duration_seconds > 0) {
        setDuration(res.video_duration_seconds);
      }

      // Refresh analysis job state
      const updatedJob = await api.getRecordingAnalysisJob(selectedRecording.id).catch(() => null);
      setAnalysisJob(updatedJob);

      setUploadSuccess(
        `AI Multi-Category Scan Completed! ${res.detections.length} events identified across ${res.frames_analyzed} frames in ${res.duration_ms}ms.`
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

      const newRec = await api.uploadDemoRecording(selectedCameraId, file, 60);
      setRecordings((prev) => [newRec, ...prev]);
      handleSelectRecording(newRec);
      setUploadSuccess(`Video "${file.name}" uploaded successfully! Attached to ${selectedCameraId}.`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload demo recording');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeCamera = cameras.find((c) => c.id === selectedCameraId);

  // Active detections on the video frame at the current timestamp
  // Displays objects within a window [-1.5s, +4.5s] of the event timestamp or currently selected
  const activeDetectionsOnFrame = recordingDetections.filter((det) => {
    if (selectedOverlayDetectionId === det.id) return true;
    if (showAllDetectionsOnOverlay) return true;
    const diff = currentSeconds - det.timestamp_offset_seconds;
    return diff >= -1.5 && diff <= 4.5;
  });

  // Filtered detections for the Results Panel
  const filteredResultsDetections = recordingDetections.filter((det) => {
    if (resultsCategoryFilter === 'all') return true;
    const cat = det.category.toLowerCase();
    const et = det.event_type.toLowerCase();
    if (resultsCategoryFilter === 'traffic') return cat.includes('traffic') || et.includes('traffic') || et.includes('vehicle');
    if (resultsCategoryFilter === 'waste') return cat.includes('garbage') || cat.includes('waste') || et.includes('waste');
    if (resultsCategoryFilter === 'water') return cat.includes('water') || cat.includes('flood') || et.includes('water');
    if (resultsCategoryFilter === 'road') return cat.includes('road') || cat.includes('pothole') || et.includes('crack');
    if (resultsCategoryFilter === 'safety') return cat.includes('assault') || cat.includes('forced') || cat.includes('sexual') || cat.includes('public');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Camera Selector */}
      {userRole === 'citizen' && (
        <div className="bg-sky-950/70 border border-sky-500/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-sky-200">
          <Lock className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            <strong>Restricted Citizen View Active:</strong> You are viewing authorized municipal road feeds. Surveillance analytics involving public-safety interactions are restricted to authorized police and municipal engineer accounts.
          </span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Multi-Category CCTV Video Intelligence &amp; Playback
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
            disabled={!selectedRecording || isAnalyzing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            <Cpu className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing Footage...' : 'Analyze Recording'}
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
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-white uppercase font-mono">Archive Segment:</span>
                <span className="font-mono text-sky-400 font-bold">
                  {selectedRecording ? selectedRecording.id : 'No segment selected'}
                </span>
                {selectedRecording?.is_demo && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    DEMO FOOTAGE
                  </span>
                )}
              </div>

              {/* Truthful Inference Status Indicator */}
              <div className="flex items-center gap-3 text-xs font-mono">
                {isAnalyzing ? (
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Bitstream ({analysisProgress}%)</span>
                  </div>
                ) : analysisJob?.status === 'completed_detections_found' || recordingDetections.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span className="font-bold">Real Video Inference ({recordingDetections.length} Events)</span>
                  </div>
                ) : analysisJob?.status === 'completed_no_detections' ? (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Analysis Complete — No Incidents Detected</span>
                  </div>
                ) : analysisJob?.status === 'failed' ? (
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Analysis Failed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Analysis Not Started</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Canvas with Responsive Bounding Box Overlay Layer */}
            <div
              ref={videoContainerRef}
              className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none"
            >
              {selectedRecording ? (
                <>
                  <video
                    ref={videoRef}
                    key={selectedRecording.id + '_' + selectedRecording.video_url}
                    src={selectedRecording.video_url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      handleTimeUpdate();
                      updateVideoLayout();
                    }}
                    onLoadedData={() => {
                      setVideoError(false);
                      updateVideoLayout();
                    }}
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
                      <div className="absolute top-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-sky-400">
                        OPTICAL FOOTAGE ARCHIVE
                      </div>
                    </div>
                  )}

                  {/* Dedicated Responsive Bounding Box Overlay Layer */}
                  {!videoError && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                      {activeDetectionsOnFrame.map((det) => {
                        const bbox = det.bounding_box;
                        if (!bbox) return null;

                        const normX = bbox.norm_x !== undefined ? bbox.norm_x : (bbox.x / (bbox.orig_w || 1280));
                        const normY = bbox.norm_y !== undefined ? bbox.norm_y : (bbox.y / (bbox.orig_h || 720));
                        const normW = bbox.norm_w !== undefined ? bbox.norm_w : (bbox.w / (bbox.orig_w || 1280));
                        const normH = bbox.norm_h !== undefined ? bbox.norm_h : (bbox.h / (bbox.orig_h || 720));

                        // Compute responsive pixel coordinates relative to active video rect
                        const left = videoLayout.offsetX + normX * videoLayout.renderWidth;
                        const top = videoLayout.offsetY + normY * videoLayout.renderHeight;
                        const width = Math.max(35, normW * videoLayout.renderWidth);
                        const height = Math.max(28, normH * videoLayout.renderHeight);

                        const catStyle = getCategoryColor(det.category, det.event_type);
                        const IconComp = catStyle.icon;
                        const isSelected = selectedOverlayDetectionId === det.id;

                        return (
                          <div
                            key={det.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOverlayDetectionId(det.id);
                              handleSeek(det.timestamp_offset_seconds);
                            }}
                            className="absolute cursor-pointer pointer-events-auto transition-all duration-150 group"
                            style={{
                              left: `${Math.round(left)}px`,
                              top: `${Math.round(top)}px`,
                              width: `${Math.round(width)}px`,
                              height: `${Math.round(height)}px`,
                            }}
                            title={`[${catStyle.label}] ${det.event_type} (${Math.round(det.confidence * 100)}% conf)`}
                          >
                            {/* Bounding box outline */}
                            <div
                              className={`w-full h-full border-2 rounded-lg transition-all ${
                                isSelected
                                  ? 'border-white ring-2 ring-white/50 scale-[1.02]'
                                  : `${catStyle.border}`
                              } ${catStyle.bg}`}
                              style={{
                                boxShadow: isSelected
                                  ? '0 0 20px rgba(255, 255, 255, 0.7)'
                                  : `0 0 14px ${catStyle.hex}66`,
                              }}
                            >
                              {/* Corner brackets */}
                              <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
                              <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />

                              {/* HUD Header on box */}
                              <div
                                className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 whitespace-nowrap shadow-md border ${
                                  isSelected
                                    ? 'bg-white text-slate-950 border-white'
                                    : 'bg-slate-950/90 text-white ' + catStyle.border
                                }`}
                              >
                                <IconComp className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>{det.event_type.replace(/_/g, ' ').toUpperCase()}</span>
                                <span className={isSelected ? 'text-indigo-900 font-black' : 'text-sky-400 font-semibold'}>
                                  {Math.round(det.confidence * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Top-Right HUD Controls on Video */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
                    <button
                      onClick={() => setShowAllDetectionsOnOverlay(!showAllDetectionsOnOverlay)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 backdrop-blur-md border transition-all ${
                        showAllDetectionsOnOverlay
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-950/80 text-slate-300 border-slate-700/60 hover:text-white'
                      }`}
                      title="Toggle between Time-Locked view and displaying all detected spatial regions"
                    >
                      <Target className="w-3 h-3 text-sky-400" />
                      {showAllDetectionsOnOverlay ? 'HUD: ALL OBJECTS' : 'HUD: TIME SYNC'}
                    </button>

                    <span className="px-2 py-1 rounded-lg text-[10px] font-mono bg-slate-950/80 text-slate-300 border border-slate-700/60 backdrop-blur-md">
                      ACTIVE ON FRAME: <strong className="text-white">{activeDetectionsOnFrame.length}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-xs">No recording segment selected.</div>
              )}
            </div>

            {/* Interactive Timeline Bar with Synchronized Incident Markers */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-3">
              {/* Scrub Track with Event Markers */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Current: <strong className="text-white font-bold">{formatTime(currentSeconds)}</strong> / {formatTime(duration || 60)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {recordingDetections.length} Events on Timeline
                  </span>
                </div>

                <div className="relative h-7 flex items-center">
                  {/* Background Track Bar */}
                  <div className="absolute inset-x-0 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-600 to-indigo-600 transition-all duration-100"
                      style={{ width: `${duration > 0 ? (currentSeconds / duration) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Native Range Scrubber (Invisible Overlay for touch & click drag) */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 60}
                    step={0.1}
                    value={currentSeconds}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                  />

                  {/* Playhead Scrubber Thumb */}
                  <div
                    className="absolute w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-full shadow-lg pointer-events-none -translate-x-1/2 z-20"
                    style={{ left: `${duration > 0 ? Math.min(100, Math.max(0, (currentSeconds / duration) * 100)) : 0}%` }}
                  />

                  {/* Category-Colored Incident Timeline Pin Markers */}
                  {recordingDetections.map((det) => {
                    const markerPercent = duration > 0 ? (det.timestamp_offset_seconds / duration) * 100 : 0;
                    const catStyle = getCategoryColor(det.category, det.event_type);
                    const isHovered = hoveredMarkerId === det.id;
                    const isActive = Math.abs(currentSeconds - det.timestamp_offset_seconds) <= 2;

                    return (
                      <div
                        key={det.id}
                        style={{ left: `${Math.min(98, Math.max(2, markerPercent))}%` }}
                        className="absolute -translate-x-1/2 -top-1 z-25 group"
                      >
                        <button
                          onClick={() => {
                            handleSeek(det.timestamp_offset_seconds);
                            setSelectedOverlayDetectionId(det.id);
                          }}
                          onMouseEnter={() => setHoveredMarkerId(det.id)}
                          onMouseLeave={() => setHoveredMarkerId(null)}
                          className={`w-3.5 h-5 rounded-sm border shadow-lg transition-transform hover:scale-150 z-20 ${
                            catStyle.pin
                          } ${isActive ? 'ring-2 ring-white scale-125' : 'border-white/80'}`}
                          title={`[${catStyle.label}] ${det.event_type} (T+${formatTime(det.timestamp_offset_seconds)})`}
                        />

                        {/* Hover Tooltip Card */}
                        {isHovered && (
                          <div className="absolute bottom-7 -translate-x-1/2 left-1/2 w-48 bg-slate-950 border border-slate-700 p-2 rounded-xl shadow-2xl z-50 pointer-events-none text-left">
                            <img src={det.snapshot_url} alt="" className="w-full h-20 object-cover rounded-lg mb-1.5" />
                            <div className="text-[10px] font-mono font-bold text-white flex items-center justify-between">
                              <span className={catStyle.text}>{det.event_type.replace(/_/g, ' ').toUpperCase()}</span>
                              <span className="text-sky-400">T+{formatTime(det.timestamp_offset_seconds)}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{det.description}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline Category Legend */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
                <span className="text-slate-500 font-bold">Timeline Legend:</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" /> Traffic</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Waste</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" /> Waterlogging</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> Road Damage</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Assault</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Forced Move</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-pink-500 inline-block" /> Sensitive</span>
              </div>

              {/* Transport Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-900">
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

          {/* AI Detection Results Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  AI Detection Results ({recordingDetections.length})
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Verified object classifications and behavioral event markers mapped to this recording segment.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'traffic', label: 'Traffic' },
                  { id: 'waste', label: 'Waste' },
                  { id: 'water', label: 'Water' },
                  { id: 'road', label: 'Road' },
                  { id: 'safety', label: 'Safety' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setResultsCategoryFilter(f.id)}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      resultsCategoryFilter === f.id
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredResultsDetections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredResultsDetections.map((det) => {
                  const catStyle = getCategoryColor(det.category, det.event_type);
                  const IconComp = catStyle.icon;
                  const isSelected = selectedOverlayDetectionId === det.id;

                  return (
                    <div
                      key={det.id}
                      onClick={() => {
                        setSelectedOverlayDetectionId(det.id);
                        handleSeek(det.timestamp_offset_seconds);
                      }}
                      className={`p-3 rounded-xl bg-slate-950 border cursor-pointer transition-all flex items-start gap-3 shadow-md ${
                        isSelected
                          ? 'border-sky-400 ring-1 ring-sky-400/50'
                          : `${catStyle.border} hover:border-sky-500/80`
                      }`}
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

                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Conf: <strong className="text-white">{Math.round(det.confidence * 100)}%</strong></span>
                          <span className="text-slate-500 truncate max-w-[110px]">{det.model_name || 'v2.2'}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-1 pt-1 border-t border-slate-900">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeek(det.timestamp_offset_seconds);
                              setSelectedOverlayDetectionId(det.id);
                            }}
                            className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 text-[10px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <Play className="w-2.5 h-2.5" /> Jump to Event
                          </button>

                          {onOpenIncidentTriage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenIncidentTriage(det);
                              }}
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
              <div className="text-slate-500 text-xs py-8 text-center bg-slate-950/50 rounded-xl border border-slate-800 space-y-1">
                <Layers className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-300">
                  {analysisJob?.status === 'completed_no_detections'
                    ? 'No supported incidents detected in this recording segment.'
                    : 'No detections available for this segment yet.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Click{' '}
                  <button onClick={() => setIsAnalyzeModalOpen(true)} className="text-sky-400 underline font-semibold">
                    Analyze Recording
                  </button>{' '}
                  to run the multi-category computer vision models.
                </p>
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
                    onClick={() => handleSelectRecording(rec)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 shadow-md ${
                      isSelected
                        ? 'bg-slate-950 border-sky-500 shadow-sky-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="relative flex-shrink-0 w-20 h-14 bg-black rounded-lg overflow-hidden border border-slate-800">
                      <img
                        src={CAMERA_POSTERS[selectedCameraId] || rec.thumbnail_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'}
                        alt="Segment"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10">
                        <Play className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white font-mono truncate">{rec.id}</span>
                        {rec.is_demo && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            DEMO
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatTime(rec.duration_seconds || 60)} Duration</span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(rec.start_time).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                    Configure specialized detection pipelines for recording {selectedRecording?.id || selectedCameraId}
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
