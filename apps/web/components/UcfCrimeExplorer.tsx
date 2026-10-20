'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UcfCrimeDatasetInfo,
  UcfCrimeVideo,
  Camera,
  CctvDetection
} from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  Database,
  Download,
  ExternalLink,
  Play,
  Pause,
  Sparkles,
  ShieldAlert,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  Film,
  Flame,
  Radio,
  FileCode,
  ArrowRight,
  ChevronRight,
  Info,
  Activity,
  HardDrive
} from 'lucide-react';

interface UcfCrimeExplorerProps {
  onOpenIncidentTriage?: (detection: CctvDetection) => void;
  onWatchInFootage?: (cameraId: string, seekSeconds: number) => void;
}

export function UcfCrimeExplorer({ onOpenIncidentTriage, onWatchInFootage }: UcfCrimeExplorerProps) {
  const [datasetInfo, setDatasetInfo] = useState<UcfCrimeDatasetInfo | null>(null);
  const [videos, setVideos] = useState<UcfCrimeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<UcfCrimeVideo | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [targetCameraId, setTargetCameraId] = useState<string>('CAM-DL-101');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Inference state
  const [runningInference, setRunningInference] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [info, vids, cams] = await Promise.all([
          api.getUcfCrimeDatasetInfo(),
          api.getUcfCrimeVideos(),
          api.getCctvCameras(),
        ]);
        setDatasetInfo(info);
        setVideos(vids);
        setCameras(cams);
        if (vids.length > 0) {
          setSelectedVideo(vids[0]);
        }
        if (cams.length > 0) {
          setTargetCameraId(cams[0].id);
        }
      } catch (err) {
        console.error('Failed to load UCF-Crime dataset', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const filteredVideos = videos.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || v.ucf_category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      v.video_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ucf_category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectVideo = (vid: UcfCrimeVideo) => {
    setSelectedVideo(vid);
    setInferenceResult(null);
    setCurrentTime(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || selectedVideo?.duration_seconds || 60);
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

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Run CivicLens AI Inference on selected UCF Video
  const handleRunInference = async () => {
    if (!selectedVideo) return;
    try {
      setRunningInference(true);
      const res = await api.runUcfCrimeInference(selectedVideo.id);
      setInferenceResult(res);
      setActionMessage(`AI Temporal Inference Complete: Detected ${res.ai_prediction.event_type.toUpperCase()} with ${Math.round(res.ai_prediction.confidence * 100)}% confidence!`);
      setTimeout(() => setActionMessage(null), 6000);
    } catch (err: any) {
      console.error(err);
      setActionMessage(`Inference failed: ${err.message}`);
    } finally {
      setRunningInference(false);
    }
  };

  // Import UCF Clip into Camera Timeline
  const handleImportToCamera = async () => {
    if (!selectedVideo || !targetCameraId) return;
    try {
      setImporting(true);
      const res = await api.importUcfCrimeVideo(selectedVideo.id, targetCameraId);
      setActionMessage(`Imported ${selectedVideo.video_name} into Camera #${targetCameraId} timeline!`);
      setTimeout(() => setActionMessage(null), 5000);
      if (onWatchInFootage) {
        onWatchInFootage(targetCameraId, selectedVideo.anomaly_start_seconds);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Dataset Overview & Download Links */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                UCF-Crime Surveillance Anomaly Benchmark Dataset
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/80">
                  CVPR 2018 (CRCV)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Waqas Sultani, Chen Chen, Mubarak Shah — Center for Research in Computer Vision (CRCV), University of Central Florida
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            1,900 untrimmed CCTV videos across 13 crime & public safety classes (128 hours of real surveillance footage). CivicLens AI incorporates temporal ground-truth annotations to validate automated optical incident detection.
          </p>
        </div>

        {/* Dataset Download Links */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
          <a
            href="https://www.crcv.ucf.edu/data1/chenchen/UCF_Crimes.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>UCF_Crimes.zip (103 GB)</span>
          </a>

          <a
            href="https://www.dropbox.com/sh/75v5ehq4cdg5g5g/AABvnJSwZI7zXb8_myBA0CLHa?dl=0"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <HardDrive className="w-4 h-4 text-sky-400" />
            <span>Dropbox Parts Download</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-purple-950/70 border border-purple-500/50 rounded-xl text-xs text-purple-200 flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="font-semibold">{actionMessage}</span>
        </div>
      )}

      {/* Main Layout: Video Player + Temporal Ground-Truth + Video Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player & Ground-Truth Verification (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header info */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="font-bold text-white font-mono">{selectedVideo?.video_name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {selectedVideo?.ucf_category.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {selectedVideo?.fps} FPS • {selectedVideo?.total_frames} FRAMES
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>{selectedVideo?.location_context}</span>
              </div>
            </div>

            {/* Video Canvas with Fallback Poster and Overlays */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {selectedVideo ? (
                <>
                  <video
                    ref={videoRef}
                    key={selectedVideo.id}
                    src={selectedVideo.video_url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleTimeUpdate}
                    poster={selectedVideo.poster_url}
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />

                  {/* Optical Scanlines & Ground-Truth Telemetry Overlay */}
                  <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-purple-300 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-purple-400 animate-pulse" />
                    <span>BENCHMARK CLIP: {selectedVideo.video_name}</span>
                  </div>

                  {/* Anomaly Indicator Banner when current playhead inside anomaly frame window */}
                  {selectedVideo.anomaly_start_seconds > 0 &&
                    currentTime >= selectedVideo.anomaly_start_seconds &&
                    currentTime <= selectedVideo.anomaly_end_seconds && (
                      <div className="absolute top-3 right-3 bg-rose-950/90 border border-rose-500/80 text-rose-200 px-3 py-1 rounded-xl text-xs font-mono font-bold animate-pulse flex items-center gap-1.5 shadow-lg">
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        GROUND-TRUTH ANOMALY WINDOW ACTIVE
                      </div>
                    )}
                </>
              ) : (
                <div className="text-slate-500 text-xs">Select a UCF-Crime video to begin.</div>
              )}
            </div>

            {/* Ground-Truth Temporal Annotation Bar */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">TEMPORAL TIMELINE (CVPR 2018 GROUND TRUTH)</span>
                {selectedVideo?.anomaly_start_seconds ? (
                  <span className="text-rose-400 font-bold">
                    Anomaly Frames: {selectedVideo.anomaly_start_frame} - {selectedVideo.anomaly_end_frame} ({selectedVideo.anomaly_start_seconds}s - {selectedVideo.anomaly_end_seconds}s)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold">Normal Footage (No Anomalies)</span>
                )}
              </div>

              {/* Progress Scrub Bar with Anomaly Highlight Zone */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 60}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 relative z-10"
                />

                {/* Highlight Ground Truth Window on bar */}
                {selectedVideo && selectedVideo.anomaly_start_seconds > 0 && duration > 0 && (
                  <div
                    style={{
                      left: `${(selectedVideo.anomaly_start_seconds / duration) * 100}%`,
                      width: `${((selectedVideo.anomaly_end_seconds - selectedVideo.anomaly_start_seconds) / duration) * 100}%`,
                    }}
                    className="absolute top-0 bottom-0 bg-rose-500/50 border-x-2 border-rose-400 pointer-events-none rounded z-0"
                    title="Ground Truth Anomaly Window"
                  />
                )}
              </div>

              {/* Playback Controls & Frame Display */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePlay}
                    className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <div className="font-mono text-slate-300 text-xs">
                    <span className="text-white font-bold">{formatSecs(currentTime)}</span>
                    <span className="text-slate-500"> / {formatSecs(duration)}</span>
                  </div>

                  {selectedVideo && selectedVideo.anomaly_start_seconds > 0 && (
                    <button
                      onClick={() => handleSeek(Math.max(0, selectedVideo.anomaly_start_seconds - 3))}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] font-mono font-semibold transition-all flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3 text-rose-400" /> Jump to Anomaly ({selectedVideo.anomaly_start_seconds}s)
                    </button>
                  )}
                </div>

                {/* Inference & Import Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunInference}
                    disabled={runningInference}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${runningInference ? 'animate-spin' : 'text-amber-300'}`} />
                    {runningInference ? 'Running Inference...' : 'Run CivicLens AI Inference'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Inference Validation Card */}
          {inferenceResult && (
            <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-5 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    CivicLens AI Inference vs Ground Truth
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {inferenceResult.ai_prediction.temporal_overlap_accuracy} Frame IoU Overlap
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">GROUND TRUTH CLASS</span>
                  <span className="text-white font-bold">{inferenceResult.ground_truth_class}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">AI DETECTED EVENT</span>
                  <span className="text-sky-400 font-bold uppercase">{inferenceResult.ai_prediction.event_type}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 block">CONFIDENCE SCORE</span>
                  <span className="text-emerald-400 font-bold">{Math.round(inferenceResult.ai_prediction.confidence * 100)}%</span>
                </div>
              </div>

              {/* Action Buttons to route into CivicLens AI Workflows */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-300">
                  Incident registered in Central Incident Queue as <span className="font-mono text-white font-bold">#{inferenceResult.detection.id}</span>
                </p>

                <div className="flex items-center gap-2">
                  {onOpenIncidentTriage && (
                    <button
                      onClick={() => onOpenIncidentTriage(inferenceResult.detection)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md transition-all"
                    >
                      Open in AI Incident Center <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Observable Indicators Breakdown */}
          {selectedVideo && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                Observable Physical Indicators (CVPR 2018 Annotation)
              </h3>
              <p className="text-xs text-slate-300">{selectedVideo.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {selectedVideo.observable_indicators.map((ind, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>

              {/* Import to Surveillance Camera */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Import clip into camera:</span>
                  <select
                    value={targetCameraId}
                    onChange={(e) => setTargetCameraId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleImportToCamera}
                  disabled={importing}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Film className="w-3.5 h-3.5 text-sky-400" />
                  {importing ? 'Importing...' : 'Import to Camera Recording Timeline'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: UCF-Crime Video Catalog & Category Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[760px]">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UCF videos (e.g. Assault, Road, Robbery)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 pb-3 border-b border-slate-800 overflow-x-auto text-[11px] custom-scrollbar">
              {['all', 'RoadAccidents', 'Assault', 'Fighting', 'Robbery', 'Vandalism', 'Burglary', 'Normal_Videos'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat === 'all' ? 'All Clips' : cat}
                </button>
              ))}
            </div>

            {/* Videos List */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 custom-scrollbar">
              {filteredVideos.map((vid) => {
                const isSelected = selectedVideo?.id === vid.id;
                const isSafety = vid.civiclens_category === 'public_safety';
                return (
                  <div
                    key={vid.id}
                    onClick={() => handleSelectVideo(vid)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-purple-400 flex items-center justify-center text-xs font-mono">
                          <Film className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white tracking-tight">{vid.video_name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{vid.location_context}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSafety
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {vid.ucf_category}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{vid.duration_seconds}s Duration</span>
                      <span>
                        {vid.anomaly_start_seconds > 0
                          ? `Anomaly @ ${vid.anomaly_start_seconds}s`
                          : 'Normal'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Citation */}
            <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 text-center">
              CRCV UCF-Crime • 13 Anomaly Categories • CVPR 2018
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
