'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, RecordingSegment, CctvDetection } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  FastForward,
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
  Tag
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

  const videoRef = useRef<HTMLVideoElement>(null);

  // Load initial camera list & detections
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [cams, dets] = await Promise.all([
          api.getCctvCameras(),
          api.getCctvDetections(),
        ]);
        setCameras(cams);
        setDetections(dets);

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
      const seekTarget = Math.max(0, initialSeekSeconds - 5); // 5-second buffer before incident
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

  // Relevant detections on current camera
  const cameraDetections = detections.filter((d) => d.camera_id === selectedCameraId);

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
              Historical CCTV Video Playback & Incident Timeline
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/80">
                FRAME-ACCURATE SEEKING
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Search archived multi-camera video footage, inspect pre-event and post-event context buffers, and review AI temporal markers.
          </p>
        </div>

        {/* Camera Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
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
          </div>

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
            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Upload className={`w-3.5 h-3.5 text-amber-400 ${isUploading ? 'animate-bounce' : ''}`} />
            {isUploading ? 'Uploading Demo...' : 'Upload Demo Video'}
          </button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
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

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {selectedRecording
                    ? new Date(selectedRecording.start_time).toLocaleDateString()
                    : 'Today'}
                </span>
              </div>
            </div>

            {/* Video Canvas */}
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


            {/* Interactive Timeline Bar with AI Incident Markers */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-3">
              {/* Scrub Bar */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentSeconds}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />

                {/* AI Detected Event Markers on Timeline */}
                {cameraDetections.map((det) => {
                  const markerPercent = duration > 0 ? (det.timestamp_offset_seconds / duration) * 100 : 25;
                  const isSafety = det.category === 'public_safety';
                  return (
                    <button
                      key={det.id}
                      onClick={() => handleSeek(det.timestamp_offset_seconds)}
                      title={`AI Event #${det.id}: ${det.description} (${det.timestamp_offset_seconds}s)`}
                      style={{ left: `${Math.min(98, Math.max(2, markerPercent))}%` }}
                      className={`absolute top-0 -translate-x-1/2 -translate-y-1 w-3 h-4 rounded-sm border shadow-md transition-transform hover:scale-125 z-10 ${
                        isSafety
                          ? 'bg-rose-500 border-rose-300 animate-pulse'
                          : 'bg-amber-400 border-amber-200'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Transport Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
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

          {/* AI Event Context Jump Callout */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI Temporal Detections on this Footage Timeline
            </h3>

            {cameraDetections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cameraDetections.map((det) => {
                  const isSafety = det.category === 'public_safety';
                  return (
                    <div
                      key={det.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition-all"
                    >
                      <img
                        src={det.snapshot_url}
                        alt="Detection"
                        className="w-14 h-12 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isSafety
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {det.event_type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Offset: {det.timestamp_offset_seconds}s
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">{det.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => handleSeek(Math.max(0, det.timestamp_offset_seconds - 5))}
                            className="px-2 py-1 rounded bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 text-[10px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <Play className="w-2.5 h-2.5" /> Jump (-5s Context)
                          </button>
                          {onOpenIncidentTriage && (
                            <button
                              onClick={() => onOpenIncidentTriage(det)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all"
                            >
                              Triage
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-500 text-xs py-4 text-center">
                No automatic AI events flagged in this specific segment.
              </div>
            )}
          </div>
        </div>

        {/* Right: Archived Footage Segments List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[680px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileVideo className="w-3.5 h-3.5 text-indigo-400" />
                Available Segments
              </h3>
              <span className="text-[11px] font-mono text-slate-400">{recordings.length} Saved</span>
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
    </div>
  );
}
