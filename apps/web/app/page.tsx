'use client';

import React, { useState, useEffect } from 'react';
import { Issue, Crew, Ward, CrewSuggestion, UserRole, WorkOrder } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import { liveSocket } from '../lib/api/websocket';
import { WardMap } from '../components/WardMap';
import { DiagnosticCardView } from '../components/DiagnosticCardView';
import { PriorityQueue } from '../components/PriorityQueue';
import { CitizenPortal } from '../components/CitizenPortal';
import { EngineerPortal } from '../components/EngineerPortal';
import { CrewPortal } from '../components/CrewPortal';
import { CorporatorPortal } from '../components/CorporatorPortal';
import { PublicWardView } from '../components/PublicWardView';
import { CrewTrackerModal } from '../components/CrewTrackerModal';
import { MobileAppView } from '../components/MobileAppView';
import { CctvMonitoring } from '../components/CctvMonitoring';
import { RecordedFootageView } from '../components/RecordedFootageView';
import { AiIncidentCenter } from '../components/AiIncidentCenter';
import {
  Shield,
  Layers,
  Smartphone,
  Globe,
  Radio,
  Camera,
  Activity,
  CheckCircle2,
  Users,
  RefreshCw,
  BellRing,
  Wrench,
  Truck,
  Landmark,
  MapPin,
  Video,
  Film,
  ShieldAlert
} from 'lucide-react';


export default function Home() {
  const [activeTab, setActiveTab] = useState<
    'corporator' | 'engineer' | 'crew' | 'citizen' | 'mobile' | 'map' | 'public' | 'sensors' | 'cctv' | 'footage' | 'ai_incidents'
  >('corporator');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [wards, setWards] = useState<Ward[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [crewSuggestions, setCrewSuggestions] = useState<CrewSuggestion[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveBanner, setLiveBanner] = useState<string | null>(null);

  // CCTV Navigation & Playback State
  const [selectedCctvCameraId, setSelectedCctvCameraId] = useState<string | undefined>(undefined);
  const [seekFootageSeconds, setSeekFootageSeconds] = useState<number | undefined>(undefined);

  const handleWatchIncident = (cameraId: string, seekSeconds: number) => {
    setSelectedCctvCameraId(cameraId);
    setSeekFootageSeconds(seekSeconds);
    setActiveTab('footage');
  };

  const handleWatchLive = (cameraId: string) => {
    setSelectedCctvCameraId(cameraId);
    setActiveTab('cctv');
  };

  const handleOpenRecordings = (cameraId: string) => {
    setSelectedCctvCameraId(cameraId);
    setSeekFootageSeconds(undefined);
    setActiveTab('footage');
  };


  // Synchronize activeTab whenever role dropdown is changed
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'admin') {
      setActiveTab('corporator');
    } else if (role === 'engineer') {
      setActiveTab('engineer');
    } else if (role === 'crew') {
      setActiveTab('crew');
    } else if (role === 'citizen') {
      setActiveTab('citizen');
    }
  };

  // Load initial data
  const loadData = async () => {
    try {
      const [fetchedWards, fetchedIssues, fetchedCrews, fetchedOrders] = await Promise.all([
        api.getWards(),
        api.getIssues(),
        api.getCrews(),
        api.getWorkOrders().catch(() => []),
      ]);
      setWards(fetchedWards);
      setIssues(fetchedIssues);
      setCrews(fetchedCrews);
      setWorkOrders(fetchedOrders);

      if (fetchedIssues.length > 0 && !selectedIssue) {
        setSelectedIssue(fetchedIssues[0]);
      }
    } catch (err) {
      console.error('Error loading initial data', err);
    }
  };

  useEffect(() => {
    loadData();

    // Connect WebSocket
    liveSocket.connect();
    setWsConnected(true);

    const unsubscribe = liveSocket.subscribe((msg) => {
      console.log('[WebSocket Event Received]', msg);
      if (msg.event === 'ISSUE_CREATED') {
        const newIssue = msg.data as Issue;
        setIssues((prev) => [newIssue, ...prev.filter((i) => i.id !== newIssue.id)]);
        setLiveBanner(`🚨 New Issue Reported via ${newIssue.source.toUpperCase()}: ${newIssue.title}`);
        setTimeout(() => setLiveBanner(null), 5000);
      } else if (msg.event === 'ISSUE_STATUS_CHANGED') {
        const updated = msg.data as Issue;
        setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        if (selectedIssue?.id === updated.id) {
          setSelectedIssue(updated);
        }
        setLiveBanner(`🔄 Issue ${updated.id} transitioned to: ${updated.status.toUpperCase()}`);
        setTimeout(() => setLiveBanner(null), 5000);
      } else if (msg.event === 'CREW_LOCATION_UPDATED') {
        const crewData = msg.data;
        setCrews((prev) =>
          prev.map((c) =>
            c.id === crewData.id ? { ...c, latitude: crewData.latitude, longitude: crewData.longitude, status: crewData.status } : c
          )
        );
        setLiveBanner(`📍 Crew Telemetry Update: ${crewData.name} updated GPS`);
        setTimeout(() => setLiveBanner(null), 4000);
      } else if (msg.event === 'WORK_ORDER_UPDATED') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch crew suggestions whenever selectedIssue changes
  useEffect(() => {
    if (selectedIssue && selectedIssue.status !== 'resolved') {
      api.getCrewSuggestions(selectedIssue.id)
        .then((suggs) => setCrewSuggestions(suggs))
        .catch(() => setCrewSuggestions([]));
    } else {
      setCrewSuggestions([]);
    }
  }, [selectedIssue]);

  const handleUpdateStatus = async (newStatus: any) => {
    if (!selectedIssue) return;
    try {
      const updated = await api.updateIssueStatus(selectedIssue.id, newStatus, 'Status updated via Central Console', currentRole);
      setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIssue(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptSuggestion = async (crewId: string) => {
    if (!selectedIssue) return;
    try {
      await api.createWorkOrder(selectedIssue.id, crewId, selectedIssue.priority_score);
      await api.updateIssueStatus(selectedIssue.id, 'in_progress', `Assigned crew ${crewId}`, currentRole);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCrewLocation = async (crewId: string, lat: number, lon: number, status: any) => {
    await api.updateCrewLocation(crewId, { latitude: lat, longitude: lon, status: status as any });
  };

  // Citizen Notifications Feed state
  const [citizenNotifications, setCitizenNotifications] = useState<{
    id: string;
    issueId: string;
    title: string;
    message: string;
    type: 'reported' | 'in_progress' | 'resolved' | 'rejected';
    timestamp: string;
    read?: boolean;
  }[]>([
    {
      id: 'notif-1',
      issueId: 'SYS-READY',
      title: '🏛️ Municipal System Online',
      message: 'Citizen notifications active. You will receive real-time alerts when your reported issue is sanctioned, when crews start work, and when the Engineer certifies completion.',
      type: 'reported',
      timestamp: 'Active'
    }
  ]);

  // 1. Public Portal Submission Handler
  const handleCitizenSubmitReport = async (payload: any): Promise<Issue> => {
    const res = await api.createIssue(payload);
    setIssues((prev) => [res, ...prev]);
    setSelectedIssue(res);

    // 🔔 Immediate Citizen Notification
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId: res.id,
        title: '📝 Complaint Successfully Lodged (Status: Submitted)',
        message: `Your complaint #${res.id} (${res.title}) has arrived at Central Municipal Command. Status: SUBMITTED. Awaiting Corporator review & budget approval.`,
        type: 'reported',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`🚨 New Complaint #${res.id} submitted! Status: SUBMITTED. Awaiting Operator review.`);
    await loadData();
    return res;
  };

  // 2. Operator / Corporator Action: Sanction budget, set priority, and assign crew
  const handleSanctionWorkOrder = async (
    issueId: string,
    budgetAmount?: string,
    assignedCrewId?: string,
    priority?: string,
    severity?: string
  ) => {
    const crewId = assignedCrewId || (crews.length > 0 ? crews[0].id : 'CREW-01');
    const crewObj = crews.find((c) => c.id === crewId);

    const updated = await api.updateIssueStatus(
      issueId,
      'assigned',
      `Budget sanctioned (₹ ${budgetAmount || '15,107'}) and assigned to ${crewObj?.name || crewId} by Municipal Corporator`,
      'admin',
      {
        assigned_crew_id: crewId,
        approved_budget: budgetAmount,
        severity: (severity as any) || 'medium',
      }
    );

    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedIssue?.id === updated.id) {
      setSelectedIssue(updated);
    }

    // 🔔 Notify Citizen: Complaint Assigned!
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '🏛️ Work Order Sanctioned & Assigned!',
        message: `Your complaint #${issueId} has been reviewed by the Municipal Corporator. Approved Budget: ₹${budgetAmount || '15,107'}. Assigned to ${crewObj?.name || 'Field Crew'}. Status: ASSIGNED.`,
        type: 'in_progress',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`🏛️ Corporator sanctioned ₹${budgetAmount || '15,107'} for #${issueId}! Assigned to ${crewObj?.name || crewId}.`);
    await loadData();
  };

  // 3. Field Crew Action: Accept task & mark In Progress
  const handleCrewAcceptTask = async (issueId: string, workOrderId?: string) => {
    const updated = await api.updateIssueStatus(
      issueId,
      'in_progress',
      'Field crew accepted task and commenced repairs on site',
      'crew'
    );

    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedIssue?.id === updated.id) {
      setSelectedIssue(updated);
    }
    if (workOrderId) {
      await api.updateWorkOrderStatus(workOrderId, 'in_progress').catch(() => {});
    }

    // 🔔 Notify Citizen: Crew On-Site
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '🛠️ Field Repairs In Progress!',
        message: `Field crew has arrived on site for complaint #${issueId}. Active repair execution underway. Status: IN PROGRESS.`,
        type: 'in_progress',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`🛠️ Crew accepted task #${issueId}! Work is now IN PROGRESS on site.`);
    await loadData();
  };

  // 4. Field Crew Action: Submit After-Photo and Notes for Engineering Inspection
  const handleCrewSubmitInspection = async (
    issueId: string,
    afterPhotoUrl: string,
    crewNotes: string,
    workOrderId?: string
  ) => {
    const updated = await api.updateIssueStatus(
      issueId,
      'awaiting_inspection',
      'Repairs concluded on site. Submitted for Municipal Engineer Quality Inspection.',
      'crew',
      {
        after_photo_url: afterPhotoUrl,
        crew_notes: crewNotes,
      }
    );

    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedIssue?.id === updated.id) {
      setSelectedIssue(updated);
    }
    if (workOrderId) {
      await api.updateWorkOrderStatus(workOrderId, 'awaiting_inspection').catch(() => {});
    }

    // 🔔 Notify Citizen: Awaiting Quality Inspection
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '📐 Repairs Concluded — Awaiting Quality Inspection',
        message: `Field crew has completed repairs on #${issueId} and uploaded photographic evidence. Chief Municipal Engineer has been summoned for quality certification. Status: AWAITING INSPECTION.`,
        type: 'in_progress',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`📐 Crew finished repairs on #${issueId}! Status: AWAITING INSPECTION. Sent to Engineer.`);
    await loadData();
  };

  // 5. Engineer Action: Approve & Mark Resolved
  const handleEngineerApprove = async (
    issueId: string,
    checklist: Record<string, boolean>,
    remarks: string,
    workOrderId?: string
  ) => {
    const updated = await api.updateIssueStatus(
      issueId,
      'resolved',
      remarks || 'Chief Municipal Engineer certified quality compliance with IRC standards',
      'engineer',
      {
        engineer_remarks: remarks,
        inspection_checklist: checklist,
      }
    );

    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedIssue?.id === updated.id) {
      setSelectedIssue(updated);
    }
    if (workOrderId) {
      await api.updateWorkOrderStatus(workOrderId, 'completed').catch(() => {});
    }

    // 🔔 Notify Public Citizen: Problem Resolved & Certified!
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '🎉 Problem Certified & Completed!',
        message: `Great news! Chief Municipal Engineer has inspected and certified that repair work on #${issueId} meets all structural and IRC safety standards. Hazard resolved! Status: RESOLVED.`,
        type: 'resolved',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`✅ Chief Engineer certified Issue #${issueId} as RESOLVED & COMPLETED! Citizen notified.`);
    await loadData();
  };

  // 6. Engineer Action: Reject & Request Rework
  const handleEngineerReject = async (
    issueId: string,
    checklist: Record<string, boolean>,
    remarks: string,
    workOrderId?: string
  ) => {
    const updated = await api.updateIssueStatus(
      issueId,
      'rework_required',
      remarks,
      'engineer',
      {
        engineer_remarks: remarks,
        inspection_checklist: checklist,
      }
    );

    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedIssue?.id === updated.id) {
      setSelectedIssue(updated);
    }
    if (workOrderId) {
      await api.updateWorkOrderStatus(workOrderId, 'rework_required').catch(() => {});
    }

    // 🔔 Notify Citizen: Rework Directive
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '⚠️ Municipal Engineer Requested Rework',
        message: `Chief Municipal Engineer inspected #${issueId} and requested adjustments: "${remarks}". Field crew has been returned to perfect the repair. Status: REWORK REQUIRED.`,
        type: 'rejected',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`⚠️ Chief Engineer requested REWORK on #${issueId}: "${remarks}". Returned to Field Crew.`);
    await loadData();
  };

  const handleSimulateSensorDetection = async (sourceType: 'cctv' | 'satellite' | 'iot') => {
    try {
      const payload = {
        source: sourceType,
        device_id: `${sourceType.toUpperCase()}-FEED-${Math.floor(100 + Math.random() * 900)}`,
        category: sourceType === 'cctv' ? 'pothole' : sourceType === 'iot' ? 'water_leak' : 'road_damage',
        latitude: +(28.61 + Math.random() * 0.04).toFixed(4),
        longitude: +(77.20 + Math.random() * 0.04).toFixed(4),
        ward_id: 'WARD-DL-01',
        confidence: 0.95
      };

      const res = await fetch('http://localhost:8000/api/v1/internal/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setIssues((prev) => [data, ...prev]);
      setSelectedIssue(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                CivicLens AI
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  v2.0-MultiRole
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Intelligent Municipal Spatial Governance & Role-Based Portals</p>
            </div>
          </div>

          {/* Navigation Tabs - Distinct Interfaces for Each Persona */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('corporator');
                setCurrentRole('admin');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'corporator'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" /> Corporator
            </button>

            <button
              onClick={() => {
                setActiveTab('engineer');
                setCurrentRole('engineer');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'engineer'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Engineer
            </button>

            <button
              onClick={() => {
                setActiveTab('crew');
                setCurrentRole('crew');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'crew'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Field Crew
            </button>

            <button
              onClick={() => {
                setActiveTab('citizen');
                setCurrentRole('citizen');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'citizen'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Citizen Portal
            </button>

            <button
              onClick={() => setActiveTab('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'mobile'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" /> Mobile App Simulator
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'map'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Spatial Map
            </button>

            <button
              onClick={() => setActiveTab('public')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'public'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Public
            </button>

            <button
              onClick={() => setActiveTab('sensors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'sensors'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Sensors
            </button>

            <button
              onClick={() => setActiveTab('cctv')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'cctv'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-sky-400" /> CCTV Surveillance
            </button>

            <button
              onClick={() => setActiveTab('footage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'footage'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-indigo-300" /> Recorded Footage
            </button>

            <button
              onClick={() => setActiveTab('ai_incidents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'ai_incidents'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> AI Incident Center
            </button>
          </div>


          {/* Role Switcher & Live WS Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live Telemetry
            </div>

            <div className="flex items-center gap-1 text-xs">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none font-medium"
              >
                <option value="admin">🏛️ Municipal Corporator (Ward Head)</option>
                <option value="engineer">👷 Municipal Engineer (Technical Tasks)</option>
                <option value="crew">🛠️ Field Crew (Assigned Problems)</option>
                <option value="citizen">📱 Citizen Portal (AI & BOM)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Event Toast Banner */}
      {liveBanner && (
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 border-b border-sky-500/40 px-4 py-2 text-center text-xs text-sky-200 flex items-center justify-center gap-2 animate-bounce">
          <BellRing className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="font-semibold">{liveBanner}</span>
        </div>
      )}

      {/* Main Content Area - Renders Dedicated Portal Based on Active Tab/Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* 1. Municipal Corporator Interface */}
        {activeTab === 'corporator' && (
          <CorporatorPortal
            wards={wards}
            issues={issues}
            workOrders={workOrders}
            crews={crews}
            onSanctionWorkOrder={handleSanctionWorkOrder}
            onRefresh={loadData}
          />
        )}

        {/* 2. Municipal Engineer Interface */}
        {activeTab === 'engineer' && (
          <EngineerPortal
            issues={issues}
            workOrders={workOrders}
            crews={crews}
            wards={wards}
            onApproveWork={handleEngineerApprove}
            onRejectWork={handleEngineerReject}
            onRefresh={loadData}
          />
        )}

        {/* 3. Field Crew Interface */}
        {activeTab === 'crew' && (
          <CrewPortal
            crews={crews}
            workOrders={workOrders}
            issues={issues}
            onAcceptTask={handleCrewAcceptTask}
            onSubmitInspection={handleCrewSubmitInspection}
            onUpdateCrewLocation={handleUpdateCrewLocation}
            onRefresh={loadData}
          />
        )}

        {/* 4. Citizen Portal Interface (Photos 1, 2, 3) */}
        {activeTab === 'citizen' && (
          <CitizenPortal
            myIssues={issues.filter((i) => i.source === 'citizen')}
            notifications={citizenNotifications}
            onClearNotifications={() => setCitizenNotifications([])}
            onSubmitReport={handleCitizenSubmitReport}
          />
        )}

        {/* 5. Mobile Integrated App Simulator */}
        {activeTab === 'mobile' && (
          <MobileAppView
            issues={issues}
            crews={crews}
            workOrders={workOrders}
            notifications={citizenNotifications}
            onReportSubmitted={async (newIssue) => {
              setIssues((prev) => [newIssue, ...prev]);
              setSelectedIssue(newIssue);
              await loadData();
            }}
          />
        )}

        {/* 6. Spatial Map & Priority Dispatch Queue */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <WardMap
                  wards={wards}
                  issues={issues}
                  crews={crews}
                  selectedIssue={selectedIssue}
                  onSelectIssue={(issue) => setSelectedIssue(issue)}
                  selectedWardId={selectedWardId}
                  onSelectWard={(wardId) => setSelectedWardId(wardId)}
                />
              </div>

              <div className="lg:col-span-4 h-[540px]">
                <PriorityQueue
                  issues={issues}
                  selectedIssue={selectedIssue}
                  onSelectIssue={(issue) => setSelectedIssue(issue)}
                  suggestions={crewSuggestions}
                  onAcceptSuggestion={handleAcceptSuggestion}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <DiagnosticCardView
                  issue={selectedIssue}
                  onUpdateStatus={handleUpdateStatus}
                  onDispatchNearestCrew={() => {
                    if (crewSuggestions[0]) {
                      handleAcceptSuggestion(crewSuggestions[0].crew.id);
                    }
                  }}
                />
              </div>

              <div className="lg:col-span-4">
                <CrewTrackerModal
                  crews={crews}
                  onUpdateCrewLocation={handleUpdateCrewLocation}
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. Public Transparency View */}
        {activeTab === 'public' && (
          <PublicWardView wards={wards} />
        )}

        {/* 7. Sensor Feeds Ingestion */}
        {activeTab === 'sensors' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-400" />
                Phase 5 Automated Ingestion Bridge (CCTV / Satellite / IoT)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Trigger internal sensor feeds through <code className="text-sky-300">POST /api/v1/internal/detections</code>.
                Detections flow into the issues pipeline, calculate priority, and broadcast in real-time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-sky-400" /> CCTV Traffic Camera
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulates municipal roadside high-speed optical feed detecting road craters.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulateSensorDetection('cctv')}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Fire CCTV Detection
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> IoT Water Pressure Sensor
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulates underground acoustic / flow sensors detecting burst water mains.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulateSensorDetection('iot')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Fire IoT Detection
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-400" /> Satellite Multispectral
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulates satellite optical pass detecting asphalt subsidence and damage.
                  </p>
                </div>
                <button
                  onClick={() => handleSimulateSensorDetection('satellite')}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Fire Satellite Detection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. CCTV Live Monitoring & Surveillance Dashboard */}
        {activeTab === 'cctv' && (
          <CctvMonitoring
            onOpenRecordings={handleOpenRecordings}
            onSelectIncident={(det) => {
              handleWatchIncident(det.camera_id, det.timestamp_offset_seconds);
            }}
          />
        )}

        {/* 9. Recorded Footage & Video Playback */}
        {activeTab === 'footage' && (
          <RecordedFootageView
            initialCameraId={selectedCctvCameraId}
            initialSeekSeconds={seekFootageSeconds}
            onOpenIncidentTriage={() => {
              setActiveTab('ai_incidents');
            }}
          />
        )}

        {/* 10. AI Incident Queue & Public Safety Response Center */}
        {activeTab === 'ai_incidents' && (
          <AiIncidentCenter
            onWatchIncident={handleWatchIncident}
            onWatchLive={handleWatchLive}
            onComplaintCreated={async (res) => {
              await loadData();
              setLiveBanner(`🚨 CCTV Detection promoted to Civic Complaint #${res.issue_id}! Switched to Corporator queue.`);
              setActiveTab('corporator');
            }}
          />
        )}
      </main>

    </div>
  );
}
