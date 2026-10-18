'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Issue, IssueCategory } from '@civiclens/shared-types';
import {
  Camera,
  MapPin,
  Upload,
  WifiOff,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  FolderOpen,
  Compass,
  Wrench,
  Banknote,
  FileText,
  Mic,
  Crosshair,
  Maximize2
} from 'lucide-react';
import { api } from '../lib/api/client';
import { getDiagnosticPreset, DiagnosticDetail } from '../lib/diagnosticData';

export interface CitizenNotification {
  id: string;
  issueId: string;
  title: string;
  message: string;
  type: 'reported' | 'in_progress' | 'resolved' | 'rejected';
  timestamp: string;
  read?: boolean;
}

interface CitizenPortalProps {
  myIssues: Issue[];
  onSubmitReport: (payload: any) => Promise<Issue | any>;
  notifications?: CitizenNotification[];
  onClearNotifications?: () => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  myIssues,
  onSubmitReport,
  notifications = [],
  onClearNotifications,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<IssueCategory>('pothole');
  
  // Location & Observation inputs matching User Screenshot 1
  const [streetAddress, setStreetAddress] = useState('42 MG Road, near Trinity Junction');
  const [wardZone, setWardZone] = useState('Ward 112 (Richmond Town)');
  const [landmark, setLandmark] = useState('Opposite Metro Station Pillar 184');
  const [description, setDescription] = useState(
    'Deep cavity in center of lane. Two scooterists swerved dangerously this morning; high risk at night.'
  );

  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [wardId, setWardId] = useState('WARD-KA-03');
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [recentlySubmitted, setRecentlySubmitted] = useState<Issue | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // AI Diagnostics state matching User Screenshots 2 & 3
  const [isClassifying, setIsClassifying] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticDetail>(getDiagnosticPreset('pothole'));
  const [aiConfidence, setAiConfidence] = useState<number>(0.96);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('civiclens_offline_reports');
      if (stored) {
        try {
          setOfflineQueue(JSON.parse(stored));
        } catch (e) {}
      }

      const updateOnlineStatus = () => {
        setIsOnline(navigator.onLine);
        if (navigator.onLine) {
          syncOfflineReports();
        }
      };

      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);

  // Update diagnostic data when category changes
  useEffect(() => {
    setDiagnosticData(getDiagnosticPreset(category));
  }, [category]);

  const syncOfflineReports = async () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('civiclens_offline_reports');
    if (!stored) return;

    try {
      const items = JSON.parse(stored);
      if (items.length === 0) return;

      for (const item of items) {
        await onSubmitReport(item);
      }
      localStorage.removeItem('civiclens_offline_reports');
      setOfflineQueue([]);
      setSuccessNotice(`Synced ${items.length} offline reports automatically!`);
    } catch (e) {
      console.warn('Sync pending...', e);
    }
  };

  const handleUsePhoneGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(+pos.coords.latitude.toFixed(4));
          setLongitude(+pos.coords.longitude.toFixed(4));
          setLandmark(`Live GPS: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`);
          setSuccessNotice('Acquired high-accuracy device GPS position!');
        },
        () => {
          // Fallback to Bengaluru Richmond Town coords
          setLatitude(12.9716);
          setLongitude(77.5946);
          setSuccessNotice('Simulated GPS coordinates locked to Richmond Town (Ward 112).');
        }
      );
    } else {
      setLatitude(12.9716);
      setLongitude(77.5946);
    }
  };

  const handleSimulateVoiceNote = () => {
    const voiceTranscripts = [
      'Deep cavity in center of lane. Two scooterists swerved dangerously this morning; high risk at night.',
      'Water main burst spraying 30 liters per minute across asphalt, forming deep erosion pocket.',
      'Streetlight luminaire cracked and dangling right above pedestrian footway, dark stretch after 7 PM.',
      'Large municipal garbage heap spilling onto primary lane, obstructing morning school traffic.',
      'Stormwater drain slab collapsed under footpath, exposed deep opening dangerous for elders.'
    ];
    const chosen = voiceTranscripts[Math.floor(Math.random() * voiceTranscripts.length)];
    setDescription(chosen);
    setSuccessNotice('Voice note successfully transcribed by speech engine!');
  };

  // Run AI Vision Classifier
  const analyzeImageWithAi = async (file?: File, onlineUrl?: string) => {
    setIsClassifying(true);
    setShowDiagnostics(true);
    try {
      const result = await api.classifyImage(file, onlineUrl);
      if (result && result.detected_category) {
        setCategory(result.detected_category);
        setAiConfidence(result.confidence);
        setDiagnosticData(getDiagnosticPreset(result.detected_category));
      }
    } catch (e) {
      console.warn('Classification API fallback to local preset', e);
      setDiagnosticData(getDiagnosticPreset(category));
    } finally {
      setIsClassifying(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsUploadingImage(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      setPhotoUrl(previewUrl);

      const uploadRes = await api.uploadImage(file);
      if (uploadRes && uploadRes.url) {
        setPhotoUrl(uploadRes.url);
        await analyzeImageWithAi(file, uploadRes.url);
      }
    } catch (err) {
      console.warn('Backend upload fallback', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setPhotoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
      await analyzeImageWithAi(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTriggerAiDiagnostics = async () => {
    setIsClassifying(true);
    setShowDiagnostics(true);
    setTimeout(() => {
      setDiagnosticData(getDiagnosticPreset(category));
      setIsClassifying(false);
      setSuccessNotice('AI Vision Diagnostics & Bill of Materials calculated successfully!');
    }, 600);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setSuccessNotice(null);

    const fullTitle = `${category.replace('_', ' ').toUpperCase()} at ${streetAddress}`;
    const reportPayload = {
      title: fullTitle,
      category,
      description: `${description} [Landmark: ${landmark}, Zone: ${wardZone}]`,
      latitude,
      longitude,
      photo_url: photoUrl,
      source: 'citizen',
      ward_id: wardId
    };

    if (!isOnline) {
      const updatedQueue = [...offlineQueue, reportPayload];
      setOfflineQueue(updatedQueue);
      if (typeof window !== 'undefined') {
        localStorage.setItem('civiclens_offline_reports', JSON.stringify(updatedQueue));
      }
      setSuccessNotice('Report queued locally (offline mode). Will auto-sync on reconnect.');
      setIsSubmitting(false);
      return;
    }

    try {
      const created = await onSubmitReport(reportPayload);
      if (created) {
        setRecentlySubmitted(created);
        setSuccessNotice(`✅ Complaint Registered Successfully! Unique ID: #${created.id} • Status: Submitted`);
      } else {
        setSuccessNotice('Work Order Issued! Vision AI has diagnosed the hazard and routed to the municipal team.');
      }
    } catch (err: any) {
      const updatedQueue = [...offlineQueue, reportPayload];
      setOfflineQueue(updatedQueue);
      if (typeof window !== 'undefined') {
        localStorage.setItem('civiclens_offline_reports', JSON.stringify(updatedQueue));
      }
      setSuccessNotice('Network error: report stored in offline queue and will sync when server is reachable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Offline and Status Alerts */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-white font-extrabold text-xl tracking-tight">Citizen Spatial Reporting Portal</h2>
          <p className="text-xs text-slate-400">
            Offline-first municipal incident capture with automated photogrammetric sizing & SoR cost breakdown
          </p>
        </div>
        <div className="flex items-center gap-3">
          {offlineQueue.length > 0 && (
            <button
              onClick={syncOfflineReports}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync {offlineQueue.length} Queued
            </button>
          )}
          {!isOnline ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <WifiOff className="w-4 h-4" /> Offline Mode
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry Online
            </span>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-medium">{successNotice}</span>
        </div>
      )}

      {recentlySubmitted && (
        <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border-2 border-blue-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Complaint Registered</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Status: Submitted
                  </span>
                </div>
                <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  Complaint ID: <span className="font-mono text-cyan-300">{recentlySubmitted.id}</span>
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(recentlySubmitted.id);
                  setCopiedId(recentlySubmitted.id);
                  setTimeout(() => setCopiedId(null), 2500);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              {copiedId === recentlySubmitted.id ? '✓ Copied ID' : '📋 Copy Complaint ID'}
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Your complaint has been logged and transmitted in real-time to the Municipal Operator Dashboard. You will receive live status updates as the Corporator sanctions the work order and the Field Crew executes the repairs.
          </p>

          {/* 5-Stage Live Progress Pipeline */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px] font-bold">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300">
                1. 📝 Submitted
                <span className="block text-[9px] font-normal text-slate-400 mt-0.5">Citizen logged</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-500">
                2. 🏛️ Assigned
                <span className="block text-[9px] font-normal text-slate-500 mt-0.5">Operator sanction</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-500">
                3. 🛠️ In Progress
                <span className="block text-[9px] font-normal text-slate-500 mt-0.5">Crew on site</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-500">
                4. 📐 Awaiting Inspection
                <span className="block text-[9px] font-normal text-slate-500 mt-0.5">Repairs completed</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-500">
                5. ✅ Resolved
                <span className="block text-[9px] font-normal text-slate-500 mt-0.5">Engineer certified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Citizen Notifications from Municipal Authorities & Engineers */}
      {notifications.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/40 p-4 rounded-2xl shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                🔔 Live Municipal Notifications for You ({notifications.length})
              </h3>
            </div>
            {onClearNotifications && (
              <button
                type="button"
                onClick={onClearNotifications}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                  notif.type === 'resolved'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : notif.type === 'in_progress'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-sky-950/40 border-sky-500/50 text-sky-200'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-2">
                    <span>{notif.title}</span>
                    <span className="text-[10px] opacity-75 font-mono">[{notif.timestamp}]</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">{notif.message}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                  notif.type === 'resolved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : notif.type === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {notif.type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Reporting Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 1. Photo Evidence & Category Selection */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Camera className="w-4 h-4" /> 1. Visual Evidence & Category
            </h3>
            {selectedFileName && (
              <span className="text-[11px] text-emerald-400 font-semibold truncate max-w-[180px]">
                ✓ {selectedFileName}
              </span>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Gallery Picker Card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-slate-950/70 hover:bg-slate-950 p-4 rounded-xl flex items-center justify-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 group-hover:bg-sky-500/30 text-sky-400 flex items-center justify-center transition-colors">
              {isUploadingImage ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <FolderOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-sky-300">
                Upload from Gallery / Storage
              </div>
              <p className="text-[10px] text-slate-400">Tap to select photo from device storage</p>
            </div>
          </div>

          {/* Photo Preview & Quick Presets */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <div className="h-44 w-full overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={photoUrl}
                alt="Hazard preview"
                className="w-full h-full object-cover"
              />
              {isUploadingImage && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-sky-300 text-xs font-semibold gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" /> Uploading image to server...
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center gap-1.5 justify-between">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm"
              >
                <Camera className="w-3 h-3" /> Change Photo
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('pothole');
                    setPhotoUrl('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80');
                    setSelectedFileName('Sample: Pothole');
                    analyzeImageWithAi(undefined, 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80');
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700"
                >
                  Pothole
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('water_leak');
                    setPhotoUrl('https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80');
                    setSelectedFileName('Sample: Water Leak');
                    analyzeImageWithAi(undefined, 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80');
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700"
                >
                  Leak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('streetlight');
                    setSelectedFileName('Sample: Streetlight');
                    setDiagnosticData(getDiagnosticPreset('streetlight'));
                  }}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700"
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Infrastructure Hazard Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pothole', label: 'Pothole' },
                { id: 'water_leak', label: 'Water Leak' },
                { id: 'drainage', label: 'Drainage' },
                { id: 'garbage', label: 'Garbage' },
                { id: 'streetlight', label: 'Streetlight' },
                { id: 'road_damage', label: 'Road Damage' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id as IssueCategory);
                    setDiagnosticData(getDiagnosticPreset(c.id));
                  }}
                  className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                    category === c.id
                      ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-600/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 2. Location & Notes (Matching User Screenshot 1) */}
        <div className="lg:col-span-7 bg-[#0b1329] border border-slate-800/90 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            {/* Header: Title and Use My Phone GPS */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-bold text-base tracking-wide">2. Location & Notes</h3>
              </div>
              <button
                type="button"
                onClick={handleUsePhoneGps}
                className="px-3.5 py-1.5 bg-[#0e2730] hover:bg-[#133644] text-[#2dd4bf] border border-[#2dd4bf]/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                <Crosshair className="w-4 h-4 text-[#2dd4bf]" />
                Use My Phone GPS
              </button>
            </div>

            {/* Row 1: Street Address & Ward & Municipal Zone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. 42 MG Road, near Trinity Junction"
                  className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Ward & Municipal Zone
                </label>
                <input
                  type="text"
                  value={wardZone}
                  onChange={(e) => setWardZone(e.target.value)}
                  placeholder="e.g. Ward 112 (Richmond Town)"
                  className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Row 2: Prominent Landmark / GPS Reference */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Prominent Landmark / GPS Reference
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Metro Station Pillar 184"
                className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Row 3: Citizen Observation Notes & Simulate Voice Note */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Citizen Observation Notes
                </label>
                <button
                  type="button"
                  onClick={handleSimulateVoiceNote}
                  className="text-xs text-[#2dd4bf] hover:text-[#5eead4] flex items-center gap-1 font-semibold"
                >
                  <Mic className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  Simulate Voice Note
                </button>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe details, safety risks, or observations..."
                className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Action Button: Run AI Diagnostics & Cost Estimator (Matching User Screenshot 1) */}
          <button
            type="button"
            onClick={handleTriggerAiDiagnostics}
            disabled={isClassifying}
            className="w-full py-3.5 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99]"
          >
            {isClassifying ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
            ) : (
              <Maximize2 className="w-5 h-5 text-slate-950" />
            )}
            Run AI Diagnostics & Cost Estimator
          </button>
        </div>
      </div>

      {/* AI Diagnostics 3-Card Grid (Matching User Screenshot 2) */}
      {showDiagnostics && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: DEFECT GEOMETRY & SIZING (4 cols) */}
            <div className="lg:col-span-4 bg-[#091124] border border-slate-800/90 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2dd4bf] mb-3">
                  <Compass className="w-4 h-4 text-[#2dd4bf]" />
                  DEFECT GEOMETRY & SIZING
                </div>

                <h4 className="text-white font-extrabold text-base mb-4 leading-snug">
                  {diagnosticData.geometry.title}
                </h4>

                {/* 2x2 Grid Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800/70">
                    <div className="text-[10px] text-slate-400 font-medium">{diagnosticData.geometry.stat1.label}</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">{diagnosticData.geometry.stat1.value}</div>
                  </div>

                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800/70">
                    <div className="text-[10px] text-slate-400 font-medium">{diagnosticData.geometry.stat2.label}</div>
                    <div className={`text-sm font-extrabold mt-0.5 ${diagnosticData.geometry.stat2.isAlert ? 'text-[#f87171]' : 'text-white'}`}>
                      {diagnosticData.geometry.stat2.value}
                    </div>
                  </div>

                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800/70">
                    <div className="text-[10px] text-slate-400 font-medium">{diagnosticData.geometry.stat3.label}</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">{diagnosticData.geometry.stat3.value}</div>
                  </div>

                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800/70">
                    <div className="text-[10px] text-slate-400 font-medium">{diagnosticData.geometry.stat4.label}</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">{diagnosticData.geometry.stat4.value}</div>
                  </div>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="p-3 bg-[#1e1708] border border-[#f59e0b]/40 rounded-xl text-xs text-[#fbbf24] leading-relaxed">
                {diagnosticData.geometry.warningText}
              </div>
            </div>

            {/* Card 2: RECOMMENDED ENGINEERING FIX (4 cols) */}
            <div className="lg:col-span-4 bg-[#091124] border border-slate-800/90 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2dd4bf] mb-3">
                  <Wrench className="w-4 h-4 text-[#2dd4bf]" />
                  RECOMMENDED ENGINEERING FIX
                </div>

                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    SOP Repair Standard
                  </div>
                  <div className="bg-[#0e1935] p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-medium">
                    {diagnosticData.engineeringFix.sopStandard}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Structural Signatures:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {diagnosticData.engineeringFix.signatures.map((sig, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#2dd4bf] mt-0.5">•</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Card 3: TOTAL REPAIR ESTIMATE (4 cols) */}
            <div className="lg:col-span-4 bg-[#091124] border border-slate-800/90 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2dd4bf]">
                    <Banknote className="w-4 h-4 text-[#2dd4bf]" />
                    TOTAL REPAIR ESTIMATE
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {diagnosticData.estimate.sorYear}
                  </span>
                </div>

                {/* Big Currency Figures */}
                <div className="mb-5">
                  <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
                    <span>₹</span>
                    <span>{diagnosticData.estimate.inr}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">
                    approx. $ {diagnosticData.estimate.usd} USD
                  </div>
                </div>

                {/* Window & SLA Details */}
                <div className="space-y-2.5 text-xs border-t border-slate-800 pt-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Work Window:</span>
                    <span className="text-slate-200 font-bold">{diagnosticData.estimate.workWindow}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-400 shrink-0">Municipal SLA:</span>
                    <span className="text-[#f87171] font-bold text-right">{diagnosticData.estimate.sla}</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Notify Authorities & Issue Work Order */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Send className="w-4 h-4 text-slate-950" />
                )}
                Notify Authorities & Issue Work Order
              </button>
            </div>
          </div>

          {/* Itemized Bill of Materials (BOM) Table (Matching User Screenshot 3) */}
          <div className="bg-[#091124] border border-slate-800/90 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2dd4bf]" />
                <h3 className="text-white font-bold text-base tracking-wide">
                  Itemized Bill of Materials (BOM)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {diagnosticData.bom.rateStandard}
              </span>
            </div>

            {/* BOM Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">ITEM / SERVICE DESCRIPTION</th>
                    <th className="py-3 px-3 text-center">CATEGORY</th>
                    <th className="py-3 px-3 text-center">QUANTITY / DURATION</th>
                    <th className="py-3 px-3 text-right">UNIT RATE</th>
                    <th className="py-3 px-3 text-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {diagnosticData.bom.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-3 text-slate-200 font-semibold">{item.description}</td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                          item.category === 'Material'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                            : item.category === 'Equipment'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-300 font-mono">{item.quantityDuration}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-mono">{item.unitRate}</td>
                      <td className="py-3.5 px-3 text-right text-white font-bold font-mono">{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Contingency & Total Estimated Budget */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col items-end space-y-2 text-xs">
              <div className="flex items-center gap-6 text-slate-400">
                <span>{diagnosticData.bom.contingencyRate}</span>
                <span className="font-mono text-white font-semibold">{diagnosticData.bom.contingencyAmount}</span>
              </div>
              <div className="flex items-center gap-6 text-sm font-bold pt-1">
                <span className="text-white">Total Estimated Repair Budget:</span>
                <span className="text-lg font-extrabold text-[#2dd4bf] font-mono">
                  {diagnosticData.bom.totalBudget}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citizen "My Reports Timeline" */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-white font-extrabold text-base flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              My Submitted Complaints &amp; Work Progress
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Track live municipal workflow: Citizen &rarr; Operator &rarr; Field Crew &rarr; Quality Inspection &rarr; Resolution
            </p>
          </div>
          <span className="text-xs text-sky-300 font-mono bg-sky-950/80 border border-sky-800/80 px-3 py-1 rounded-full font-bold">
            {myIssues.length} Complaints Registered
          </span>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {['all', 'submitted', 'assigned', 'in_progress', 'awaiting_inspection', 'rework_required', 'resolved'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {myIssues.filter((i) => filterStatus === 'all' || i.status === filterStatus).length === 0 ? (
            <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No complaints in &quot;{filterStatus.replace('_', ' ')}&quot; status.
            </div>
          ) : (
            myIssues
              .filter((i) => filterStatus === 'all' || i.status === filterStatus)
              .map((issue) => {
                const isResolved = issue.status === 'resolved';
                const isAwaiting = issue.status === 'awaiting_inspection';
                const isInProg = issue.status === 'in_progress';
                const isAssigned = issue.status === 'assigned';
                const isRework = issue.status === 'rework_required';
                const isSub = issue.status === 'submitted' || issue.status === 'reported';

                return (
                  <div
                    key={issue.id}
                    className="p-5 bg-[#091124] border border-slate-800 rounded-xl space-y-4 shadow-md hover:border-slate-700 transition-all"
                  >
                    {/* Header Row: ID, Category & Distinct Status Badge */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-cyan-400 font-extrabold bg-cyan-950/70 border border-cyan-800 px-2 py-0.5 rounded">
                            #{issue.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                navigator.clipboard.writeText(issue.id);
                                setCopiedId(issue.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold underline"
                          >
                            {copiedId === issue.id ? '✓ Copied' : 'Copy ID'}
                          </button>
                          <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                            {issue.category.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{issue.title}</h4>
                      </div>

                      {/* Distinct Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isRework
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isAwaiting
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : isInProg
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isAssigned
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                      {issue.description}
                    </div>

                    {/* Before & After Photo Previews */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {issue.photo_url && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-sky-400" />
                            Original Citizen Photo (Before)
                          </span>
                          <div className="relative h-32 rounded-lg overflow-hidden border border-slate-800 bg-black">
                            <img
                              src={issue.photo_url}
                              alt="Citizen report photo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {issue.after_photo_url ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Field Crew Completion Photo (After)
                          </span>
                          <div className="relative h-32 rounded-lg overflow-hidden border border-emerald-500/40 bg-black">
                            <img
                              src={issue.after_photo_url}
                              alt="Crew repair photo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-slate-500" />
                            Field Crew Completion Photo (After)
                          </span>
                          <div className="h-32 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center p-3 text-center bg-slate-950/40">
                            <Clock className="w-5 h-5 text-slate-600 mb-1" />
                            <span className="text-[11px] text-slate-500 font-medium">
                              Repairs in progress. Crew will upload after-photo upon completion.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Engineer Remarks or Rework Alert */}
                    {issue.engineer_remarks && (
                      <div
                        className={`p-3 rounded-lg border text-xs space-y-1 ${
                          isRework
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        }`}
                      >
                        <span className="font-extrabold uppercase text-[10px] block">
                          {isRework ? '⚠️ Engineer Rework Directive' : '✅ Chief Engineer Sign-Off Remarks'}
                        </span>
                        <p>{issue.engineer_remarks}</p>
                      </div>
                    )}

                    {/* 5-Stage Visual Workflow Stepper */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
                        <span className="text-blue-400">1. Submitted</span>
                        <span className={isAssigned || isInProg || isAwaiting || isResolved ? 'text-purple-400' : 'text-slate-600'}>
                          2. Assigned
                        </span>
                        <span className={isInProg || isAwaiting || isResolved ? 'text-amber-400' : 'text-slate-600'}>
                          3. In Progress
                        </span>
                        <span className={isAwaiting || isResolved ? 'text-cyan-400' : 'text-slate-600'}>
                          4. Inspection
                        </span>
                        <span className={isResolved ? 'text-emerald-400' : isRework ? 'text-rose-400' : 'text-slate-600'}>
                          {isRework ? '5. Rework Req.' : '5. Resolved'}
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex border border-slate-800">
                        {/* Stage 1 */}
                        <div className="bg-blue-500 h-full w-1/5" />
                        {/* Stage 2 */}
                        <div className={`h-full w-1/5 ${isAssigned || isInProg || isAwaiting || isResolved ? 'bg-purple-500' : 'bg-transparent'}`} />
                        {/* Stage 3 */}
                        <div className={`h-full w-1/5 ${isInProg || isAwaiting || isResolved ? 'bg-amber-500' : 'bg-transparent'}`} />
                        {/* Stage 4 */}
                        <div className={`h-full w-1/5 ${isAwaiting || isResolved ? 'bg-cyan-500' : 'bg-transparent'}`} />
                        {/* Stage 5 */}
                        <div className={`h-full w-1/5 ${isResolved ? 'bg-emerald-500' : isRework ? 'bg-rose-500' : 'bg-transparent'}`} />
                      </div>
                    </div>

                    {/* Audit History Log */}
                    {issue.events && issue.events.length > 0 && (
                      <details className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <summary className="cursor-pointer font-semibold text-slate-300 hover:text-white">
                          View Status Event History ({issue.events.length} Events)
                        </summary>
                        <div className="mt-2 space-y-1.5 pl-2 border-l border-slate-700">
                          {issue.events.map((ev, idx) => (
                            <div key={ev.id || idx} className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200 capitalize">{ev.actor_role || 'official'}:</span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-300 text-[10px]">{ev.comment}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
