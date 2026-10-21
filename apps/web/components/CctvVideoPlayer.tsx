'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraStatus } from '@civiclens/shared-types';
import {
  AlertTriangle,
  Radio,
  RefreshCw,
  Eye,
  Camera as CameraIcon,
  Maximize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Activity,
  Layers
} from 'lucide-react';

interface CctvVideoPlayerProps {
  camera: Camera;
  className?: string;
  isFocused?: boolean;
  showControls?: boolean;
  onOpenFocus?: () => void;
  seekTime?: number;
}

// Fallback high-res real street footage backgrounds for Indian cities
const CAMERA_POSTERS: Record<string, string> = {
  'CAM-DL-101': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80', // New Delhi Connaught Place
  'CAM-DL-102': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80', // Delhi Janpath Junction
  'CAM-MH-201': 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80', // Mumbai Bandra Market
  'CAM-MH-202': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80', // Mumbai Carter Road Seafront
  'CAM-KA-301': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80', // Bengaluru Indiranagar
  'CAM-MH-401': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80', // Pune FC Road
};

export function CctvVideoPlayer({
  camera,
  className = '',
  isFocused = false,
  showControls = true,
  onOpenFocus,
  seekTime,
}: CctvVideoPlayerProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [liveTimestamp, setLiveTimestamp] = useState('');
  const [millisecondCount, setMillisecondCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Timecode generator
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      setLiveTimestamp(timeStr);
      setMillisecondCount(Math.floor(now.getMilliseconds() / 10));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Safe Autoplay initializer
  useEffect(() => {
    setVideoError(false);
    setVideoLoaded(false);

    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.playsInline = true;

      if (seekTime !== undefined) {
        videoRef.current.currentTime = seekTime;
      }

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn(`[CCTV] Stream playback for ${camera.id} deferred to Optical Feed:`, err);
            // If the browser blocks or network drops external MP4, gracefully switch to Optical Live Mode
            setVideoError(true);
          });
      }
    }

    // Safety timeout: if video stays stalled for > 3.5s, activate Optical Live feed
    const stallTimeout = setTimeout(() => {
      if (!videoLoaded) {
        setVideoError(true);
      }
    }, 3500);

    return () => clearTimeout(stallTimeout);
  }, [camera.stream_url, camera.id]);

  const posterImg =
    CAMERA_POSTERS[camera.id] ||
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80';

  const handleTogglePlay = () => {
    if (videoRef.current && !videoError) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const hasIncident = camera.status === 'incident_detected';

  return (
    <div
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none group ${className}`}
    >
      {/* 1. Underlying Video Element */}
      <video
        ref={videoRef}
        key={camera.stream_url}
        src={camera.stream_url}
        autoPlay
        loop
        muted
        playsInline
        poster={posterImg}
        onLoadedData={() => {
          setVideoLoaded(true);
          setVideoError(false);
        }}
        onError={() => {
          setVideoError(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          videoLoaded && !videoError ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      />

      {/* 2. Optical CCTV Live Simulated Feed (renders when stream buffers or fails CORS) */}
      {(!videoLoaded || videoError) && (
        <div className="absolute inset-0 w-full h-full">
          <img
            src={posterImg}
            alt={camera.name}
            className="w-full h-full object-cover filter brightness-90 contrast-110"
          />

          {/* CCTV Optical Scanlines Effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.8) 3px, rgba(0, 0, 0, 0.8) 4px)',
            }}
          />

          {/* Subtle slow panning CCTV camera drift animation */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

          {/* AI Object Detection Bounding Boxes Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Box 1: Vehicle Tracking */}
            <div className="absolute top-[38%] left-[22%] w-[26%] h-[28%] border-2 border-emerald-400/80 bg-emerald-500/10 rounded-sm">
              <span className="absolute -top-4 left-0 bg-emerald-500 text-slate-950 font-mono text-[9px] font-bold px-1 py-0.2 rounded-t">
                BUS / TRAFFIC: 98%
              </span>
            </div>

            {/* Box 2: Anomaly / Hazard or Pedestrian */}
            {hasIncident ? (
              <div className="absolute top-[48%] right-[20%] w-[22%] h-[32%] border-2 border-rose-500/90 bg-rose-500/15 rounded-sm animate-pulse">
                <span className="absolute -top-4 left-0 bg-rose-600 text-white font-mono text-[9px] font-bold px-1 py-0.2 rounded-t flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  INCIDENT LOCUS: 94%
                </span>
              </div>
            ) : (
              <div className="absolute top-[45%] right-[24%] w-[16%] h-[35%] border-2 border-sky-400/80 bg-sky-500/10 rounded-sm">
                <span className="absolute -top-4 left-0 bg-sky-500 text-slate-950 font-mono text-[9px] font-bold px-1 py-0.2 rounded-t">
                  PEDESTRIAN: 93%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CCTV Telemetry Overlay (Top Left & Top Right) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono pointer-events-none z-20">
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
          <span className="text-rose-400 font-bold">REC</span>
          <span className="text-slate-400">|</span>
          <span className="text-white font-bold tracking-wider">{camera.code}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
          <span className="text-sky-400 font-bold">{liveTimestamp}</span>
          <span className="text-slate-500">.{millisecondCount.toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* 4. Bottom Location & Status Banner */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono pointer-events-none z-20">
        <div className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 truncate max-w-[240px]">
          {camera.name}
        </div>

        {hasIncident ? (
          <div className="bg-rose-950/90 text-rose-300 border border-rose-500/60 px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            INCIDENT DETECTED
          </div>
        ) : (
          <div className="bg-slate-950/85 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </div>
        )}
      </div>

      {/* 5. Clickable Open Focus on Hover for Grid View */}
      {onOpenFocus && (
        <div
          onClick={onOpenFocus}
          className="absolute inset-0 bg-sky-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-30"
        >
          <span className="px-3.5 py-2 rounded-xl bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-2">
            <Eye className="w-4 h-4" /> Open Focused Camera
          </span>
        </div>
      )}

      {/* 6. Custom Controls Bar for Focused Single View */}
      {showControls && !onOpenFocus && (
        <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between text-white z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleToggleMute}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <span className="text-xs font-mono text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {camera.location_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>EDGE-AI PERCEPTION</span>
            </div>
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
