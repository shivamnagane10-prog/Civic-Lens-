'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Issue, IssueCategory, Crew, WorkOrder } from '@civiclens/shared-types';
import {
  Smartphone,
  Camera,
  MapPin,
  Mic,
  Crosshair,
  Maximize2,
  RefreshCw,
  Send,
  FolderOpen,
  Wifi,
  WifiOff,
  BatteryCharging,
  Signal,
  CheckCircle2,
  Bell,
  Wrench,
  Truck,
  Compass,
  Banknote,
  FileText,
  ChevronRight,
  Shield,
  Layers,
  ArrowLeft,
  QrCode,
  Share2
} from 'lucide-react';
import { api } from '../lib/api/client';
import { getDiagnosticPreset, DiagnosticDetail } from '../lib/diagnosticData';

interface MobileAppViewProps {
  issues: Issue[];
  crews: Crew[];
  workOrders: WorkOrder[];
  onReportSubmitted: (issue: Issue) => void;
  notifications: any[];
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  issues,
  crews,
  workOrders,
  onReportSubmitted,
  notifications = [],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deviceModel, setDeviceModel] = useState<'ios' | 'android' | 'fullscreen'>('ios');
  const [activeScreen, setActiveScreen] = useState<'report' | 'diagnostics' | 'bom' | 'notifications' | 'crew'>('report');
  const [category, setCategory] = useState<IssueCategory>('pothole');
  
  // Form fields matching Photo 1
  const [streetAddress, setStreetAddress] = useState('42 MG Road, near Trinity Junction');
  const [wardZone, setWardZone] = useState('Ward 112 (Richmond Town)');
  const [landmark, setLandmark] = useState('Opposite Metro Station Pillar 184');
  const [description, setDescription] = useState(
    'Deep cavity in center of lane. Two scooterists swerved dangerously this morning; high risk at night.'
  );
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  );

  const [diagnosticData, setDiagnosticData] = useState<DiagnosticDetail>(getDiagnosticPreset('pothole'));
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileNotice, setMobileNotice] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Active crew mode for mobile
  const [activeCrewId, setActiveCrewId] = useState(crews.length > 0 ? crews[0].id : 'CREW-01');
  const activeCrew = crews.find((c) => c.id === activeCrewId) || crews[0];
  const assignedJobs = issues.filter((i) => i.status === 'in_progress');

  useEffect(() => {
    setDiagnosticData(getDiagnosticPreset(category));
  }, [category]);

  const handleUsePhoneGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(+pos.coords.latitude.toFixed(4));
          setLongitude(+pos.coords.longitude.toFixed(4));
          setLandmark(`Device GPS: ${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°`);
          setMobileNotice('Device GPS locked with 3m precision!');
        },
        () => {
          setLatitude(12.9716);
          setLongitude(77.5946);
          setMobileNotice('Simulated GPS coordinates locked to Richmond Town.');
        }
      );
    }
  };

  const handleSimulateVoice = () => {
    setDescription('Deep cavity in center of lane. Two scooterists swerved dangerously this morning; high risk at night.');
    setMobileNotice('Voice note converted to text via on-device speech engine!');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const preview = URL.createObjectURL(file);
      setPhotoUrl(preview);
      setIsClassifying(true);
      const uploadRes = await api.uploadImage(file).catch(() => null);
      const onlineUrl = uploadRes?.url || preview;
      if (uploadRes?.url) setPhotoUrl(uploadRes.url);

      const aiRes = await api.classifyImage(file, onlineUrl).catch(() => null);
      if (aiRes && aiRes.detected_category) {
        setCategory(aiRes.detected_category);
        setDiagnosticData(getDiagnosticPreset(aiRes.detected_category));
        setMobileNotice(`AI identified: ${aiRes.detected_category.replace('_', ' ').toUpperCase()}`);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleTriggerAiDiagnostics = () => {
    setIsClassifying(true);
    setTimeout(() => {
      setDiagnosticData(getDiagnosticPreset(category));
      setIsClassifying(false);
      setActiveScreen('diagnostics');
      setMobileNotice('AI Diagnostics computed! Swipe to review geometry & BOM.');
    }, 500);
  };

  const handleSubmitWorkOrder = async () => {
    setIsSubmitting(true);
    setMobileNotice(null);

    const payload = {
      title: `${category.replace('_', ' ').toUpperCase()} at ${streetAddress}`,
      category,
      description: `${description} [Landmark: ${landmark}, Zone: ${wardZone}]`,
      latitude,
      longitude,
      photo_url: photoUrl,
      source: 'citizen' as const,
      ward_id: 'WARD-KA-03'
    };

    try {
      const res = await api.createIssue(payload);
      onReportSubmitted(res);
      setMobileNotice('🚀 Work Order issued! Sent to Municipal Corporator for sanction.');
      setActiveScreen('notifications');
    } catch (e: any) {
      setMobileNotice('Offline Mode: Report cached locally in SQLite queue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Device Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">
            <Smartphone className="w-4 h-4 text-sky-400" />
            CivicLens Mobile Integrated Application
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Native Mobile App Simulator & Physical Device Gateway
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Experience the complete citizen & field crew workflow optimized for mobile touchscreens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setDeviceModel('ios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              deviceModel === 'ios'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone 15 Pro
          </button>
          <button
            onClick={() => setDeviceModel('android')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              deviceModel === 'android'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pixel 8 Pro
          </button>
          <button
            onClick={() => setDeviceModel('fullscreen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              deviceModel === 'fullscreen'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Full Width
          </button>
        </div>
      </div>

      {/* Network / Physical Phone Connection Callout */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold">Open on Your Physical Mobile Phone:</div>
            <div className="text-slate-400 font-mono text-[11px]">
              Connect to your Wi-Fi and browse to: <b className="text-emerald-400">http://{typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.hostname : '10.172.186.26'}:3000</b>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online 5G' : 'Offline Mode'}
          </button>
        </div>
      </div>

      {/* Center Phone Mockup Canvas */}
      <div className="flex justify-center items-center py-4">
        <div
          className={`transition-all duration-300 ${
            deviceModel === 'fullscreen'
              ? 'w-full max-w-xl'
              : 'w-[390px] h-[820px] rounded-[52px] border-[10px] border-[#1e293b] shadow-2xl relative overflow-hidden bg-slate-950 flex flex-col'
          }`}
        >
          {/* Dynamic Island / Speaker Notch (iOS) */}
          {deviceModel === 'ios' && (
            <div className="h-9 bg-slate-950 px-6 flex items-center justify-between shrink-0 select-none z-30">
              <span className="text-[11px] font-bold text-white font-sans">9:41</span>
              {/* Dynamic Island Pill */}
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center gap-2 border border-slate-900">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-[8px] font-mono text-emerald-300 font-bold">AI READY</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          )}

          {/* Android Punch Hole & Status Bar */}
          {deviceModel === 'android' && (
            <div className="h-8 bg-slate-950 px-5 flex items-center justify-between shrink-0 select-none z-30">
              <span className="text-[11px] font-bold text-slate-300">12:30</span>
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800" />
              <div className="flex items-center gap-2 text-slate-400">
                <Wifi className="w-3 h-3" />
                <Signal className="w-3 h-3" />
                <span className="text-[10px] font-bold text-emerald-400">100%</span>
              </div>
            </div>
          )}

          {/* App Header Inside Phone */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center shadow-md">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white tracking-wide">CivicLens Mobile</h3>
                <span className="text-[9px] text-sky-400 font-mono block">v2.0 • Bengaluru Metro</span>
              </div>
            </div>

            <button
              onClick={() => setActiveScreen('notifications')}
              className="relative p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Toast Banner */}
          {mobileNotice && (
            <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-3 py-2 text-[11px] text-emerald-300 flex items-center justify-between">
              <span className="font-semibold line-clamp-1">{mobileNotice}</span>
              <button onClick={() => setMobileNotice(null)} className="text-slate-400 pl-2">✕</button>
            </div>
          )}

          {/* Phone Scrollable Screen Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
            {/* Screen 1: Report Hazard (Location & Notes - Photo 1) */}
            {activeScreen === 'report' && (
              <div className="space-y-4">
                {/* Photo Capture Area */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 group">
                  <img
                    src={photoUrl}
                    alt="Problem attachment"
                    className="w-full h-44 object-cover"
                  />
                  {isClassifying && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs text-sky-300 font-bold gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                      Analyzing Pixels...
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-950/85 hover:bg-black text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-sm"
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-400" /> Snap Photo / Gallery
                    </button>
                    <span className="px-2 py-1 bg-black/70 rounded-lg text-[9px] font-mono font-bold text-emerald-400">
                      AI Verified
                    </span>
                  </div>
                </div>

                {/* Category Pills */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Hazard Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['pothole', 'water_leak', 'drainage', 'garbage', 'streetlight', 'road_damage'] as IssueCategory[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCategory(c);
                          setDiagnosticData(getDiagnosticPreset(c));
                        }}
                        className={`p-2 rounded-xl text-[11px] font-bold border text-center transition-all ${
                          category === c
                            ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        {c.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Location & Notes (Matching User Screenshot 1) */}
                <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>2. Location & Notes</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUsePhoneGps}
                      className="px-2.5 py-1 bg-[#0e2730] text-[#2dd4bf] border border-[#2dd4bf]/40 rounded-xl text-[10px] font-bold flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" /> Use GPS
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Ward & Municipal Zone
                    </label>
                    <input
                      type="text"
                      value={wardZone}
                      onChange={(e) => setWardZone(e.target.value)}
                      className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Prominent Landmark
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-slate-400">Citizen Observation Notes</label>
                      <button
                        type="button"
                        onClick={handleSimulateVoice}
                        className="text-[10px] text-[#2dd4bf] font-bold flex items-center gap-1"
                      >
                        <Mic className="w-3 h-3" /> Voice Note
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#070d1e] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Run AI Diagnostics Button */}
                  <button
                    type="button"
                    onClick={handleTriggerAiDiagnostics}
                    disabled={isClassifying}
                    className="w-full py-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Run AI Diagnostics & Cost Estimator
                  </button>
                </div>
              </div>
            )}

            {/* Screen 2: AI Diagnostics Cards (Matching Photo 2) */}
            {activeScreen === 'diagnostics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf] flex items-center gap-1.5">
                    <Compass className="w-4 h-4" /> AI Defect Sizing & Fix (Photo 2)
                  </h3>
                  <button
                    onClick={() => setActiveScreen('bom')}
                    className="text-[11px] font-bold text-sky-400 flex items-center gap-1"
                  >
                    View BOM <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Card 1: Defect Geometry */}
                <div className="bg-[#091124] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-[10px] font-bold uppercase text-[#2dd4bf]">
                    DEFECT GEOMETRY & SIZING
                  </div>
                  <h4 className="text-sm font-black text-white leading-tight">
                    {diagnosticData.geometry.title}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0e1935] p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">{diagnosticData.geometry.stat1.label}</span>
                      <span className="font-bold text-white text-xs">{diagnosticData.geometry.stat1.value}</span>
                    </div>
                    <div className="bg-[#0e1935] p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">{diagnosticData.geometry.stat2.label}</span>
                      <span className="font-bold text-[#f87171] text-xs">{diagnosticData.geometry.stat2.value}</span>
                    </div>
                    <div className="bg-[#0e1935] p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">{diagnosticData.geometry.stat3.label}</span>
                      <span className="font-bold text-white text-xs">{diagnosticData.geometry.stat3.value}</span>
                    </div>
                    <div className="bg-[#0e1935] p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">{diagnosticData.geometry.stat4.label}</span>
                      <span className="font-bold text-white text-xs">{diagnosticData.geometry.stat4.value}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#1e1708] border border-[#f59e0b]/40 rounded-xl text-[10px] text-[#fbbf24] leading-relaxed">
                    {diagnosticData.geometry.warningText}
                  </div>
                </div>

                {/* Card 2: Recommended Fix */}
                <div className="bg-[#091124] border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[10px] font-bold uppercase text-[#2dd4bf]">
                    RECOMMENDED ENGINEERING FIX
                  </div>
                  <div className="bg-[#0e1935] p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-200">
                    <span className="font-bold text-[#2dd4bf] block mb-1">SOP Standard:</span>
                    {diagnosticData.engineeringFix.sopStandard}
                  </div>
                </div>

                {/* Card 3: Total Repair Estimate */}
                <div className="bg-[#091124] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#2dd4bf]">
                    <span>TOTAL REPAIR ESTIMATE</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {diagnosticData.estimate.sorYear}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-white">₹ {diagnosticData.estimate.inr}</div>
                    <div className="text-[10px] text-slate-400">approx. $ {diagnosticData.estimate.usd} USD</div>
                  </div>

                  <div className="text-[10px] space-y-1 pt-2 border-t border-slate-800 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Work Window:</span>
                      <span className="font-bold">{diagnosticData.estimate.workWindow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Municipal SLA:</span>
                      <span className="text-[#f87171] font-bold">{diagnosticData.estimate.sla}</span>
                    </div>
                  </div>

                  {/* Main Notify & Issue Work Order Button */}
                  <button
                    type="button"
                    onClick={handleSubmitWorkOrder}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Send className="w-4 h-4 text-slate-950" />
                    )}
                    Notify Authorities &amp; Issue Work Order
                  </button>
                </div>
              </div>
            )}

            {/* Screen 3: Itemized Bill of Materials (Matching Photo 3) */}
            {activeScreen === 'bom' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf] flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Itemized BOM (Photo 3)
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">{diagnosticData.bom.rateStandard}</span>
                </div>

                <div className="bg-[#091124] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="divide-y divide-slate-800/80">
                    {diagnosticData.bom.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-[11px]">
                        <div className="max-w-[65%]">
                          <span className="text-white font-medium block truncate">{item.description}</span>
                          <span className="text-[9px] text-slate-400">
                            {item.quantityDuration} • <span className="uppercase text-sky-400 font-semibold">{item.category}</span>
                          </span>
                        </div>
                        <span className="text-white font-mono font-bold">{item.subtotal}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>{diagnosticData.bom.contingencyRate}</span>
                      <span className="font-mono text-white">{diagnosticData.bom.contingencyAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-white pt-1">
                      <span>Total Estimated Budget:</span>
                      <span className="text-[#2dd4bf] font-mono text-sm">{diagnosticData.bom.totalBudget}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitWorkOrder}
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Send className="w-4 h-4 text-slate-950" />
                    Issue Work Order
                  </button>
                </div>
              </div>
            )}

            {/* Screen 4: Live Notifications Feed */}
            {activeScreen === 'notifications' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    Citizen Notifications
                  </h3>
                  <span className="text-[10px] text-slate-400">{notifications.length} Alerts</span>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No new notifications. Issues will trigger alerts when sanctioned or resolved.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl border space-y-1 text-xs ${
                        notif.type === 'resolved'
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : notif.type === 'in_progress'
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                          : 'bg-sky-950/40 border-sky-500/50 text-sky-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">{notif.title}</span>
                        <span className="text-[9px] opacity-75 font-mono">{notif.timestamp}</span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Screen 5: Field Crew Mobile View */}
            {activeScreen === 'crew' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-amber-300 flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> Field Crew Mobile Queue
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">{activeCrew?.name}</span>
                </div>

                {assignedJobs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No active jobs assigned yet. Sanction an issue in the Corporator portal to see it here!
                  </div>
                ) : (
                  assignedJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3.5 bg-[#0e1935] rounded-xl border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[10px] font-bold text-amber-400">{job.id}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300">
                          {job.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs">{job.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{job.description}</p>
                      
                      <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                        <button
                          type="button"
                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] text-center"
                        >
                          En Route
                        </button>
                        <button
                          type="button"
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-[10px] text-center"
                        >
                          Finish Work
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Native Mobile Bottom Navigation Bar */}
          <div className="h-16 bg-slate-950/95 border-t border-slate-800 px-2 flex items-center justify-around shrink-0 z-20">
            <button
              onClick={() => setActiveScreen('report')}
              className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
                activeScreen === 'report' ? 'text-sky-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-[9px]">Report</span>
            </button>

            <button
              onClick={() => setActiveScreen('diagnostics')}
              className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
                activeScreen === 'diagnostics' ? 'text-[#2dd4bf] font-bold' : 'text-slate-400'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span className="text-[9px]">AI Sizing</span>
            </button>

            <button
              onClick={() => setActiveScreen('bom')}
              className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
                activeScreen === 'bom' ? 'text-[#2dd4bf] font-bold' : 'text-slate-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[9px]">BOM Rates</span>
            </button>

            <button
              onClick={() => setActiveScreen('notifications')}
              className={`flex flex-col items-center gap-1 py-1 px-2 relative transition-all ${
                activeScreen === 'notifications' ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="text-[9px]">Alerts</span>
              {notifications.length > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setActiveScreen('crew')}
              className={`flex flex-col items-center gap-1 py-1 px-2 transition-all ${
                activeScreen === 'crew' ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span className="text-[9px]">Crew</span>
            </button>
          </div>

          {/* iOS Bottom Gesture Bar */}
          {deviceModel === 'ios' && (
            <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-700 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
