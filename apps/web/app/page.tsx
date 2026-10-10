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
  MapPin
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'corporator' | 'engineer' | 'crew' | 'citizen' | 'mobile' | 'map' | 'public' | 'sensors'>('corporator');
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

  // Engineer Action: Mark assigned work as done and certified
  const handleMarkWorkDone = async (issueId: string, workOrderId?: string, comment?: string) => {
    const updated = await api.updateIssueStatus(
      issueId,
      'resolved',
      comment || 'Quality certified compliant by Municipal Engineer',
      'engineer'
    );
    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedIssue?.id === updated.id) {
      setSelectedIssue(updated);
    }
    if (workOrderId) {
      await api.updateWorkOrderStatus(workOrderId, 'completed').catch(() => {});
    }

    // 🔔 Notify Public Citizen of Resolution!
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '🎉 Problem Certified & Completed!',
        message: `Great news! Chief Municipal Engineer has inspected and certified that repair work on #${issueId} is complete and meets all IRC safety standards. Hazard resolved!`,
        type: 'resolved',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`✅ Chief Engineer certified Issue ${issueId} as RESOLVED & COMPLETED! Notification sent to citizen.`);
    await loadData();
  };

  // Crew Action: Update live problem execution status
  const handleUpdateWorkOrderStatus = async (workOrderId: string, status: string, issueId?: string) => {
    await api.updateWorkOrderStatus(workOrderId, status).catch(() => {});
    if (issueId) {
      const issueStatus = status === 'completed' ? 'in_progress' : 'in_progress';
      await api.updateIssueStatus(issueId, issueStatus as any, `Crew updated status to ${status}`, 'crew');
      
      if (status === 'completed') {
        setCitizenNotifications((prev) => [
          {
            id: `NOTIF-${Date.now()}`,
            issueId,
            title: '🛠️ Field Work Finished by Crew',
            message: `Field crew has concluded repairs on #${issueId}. Pending final Municipal Engineer quality certification.`,
            type: 'in_progress',
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
      }
    }
    await loadData();
  };

  // Corporator Action: Sanction budget and release work order
  const handleSanctionWorkOrder = async (issueId: string, budgetAmount?: string, assignedCrewId?: string) => {
    // 1. Transition issue to 'in_progress'!
    const updated = await api.updateIssueStatus(
      issueId,
      'in_progress',
      `Budget sanctioned (₹ ${budgetAmount || '15,107'}) and crew assigned by Municipal Corporator`,
      'admin'
    );
    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    
    // 2. Select assigned crew
    const crewId = assignedCrewId || (crews.length > 0 ? crews[0].id : 'CREW-01');
    const crewObj = crews.find((c) => c.id === crewId);

    // 3. Create or update work order to 'in_progress'
    await api.createWorkOrder(issueId, crewId, updated.priority_score).catch(() => {});

    // 4. Update crew status to 'dispatched'
    if (crewObj) {
      await api.updateCrewLocation(crewId, {
        latitude: crewObj.latitude,
        longitude: crewObj.longitude,
        status: 'dispatched'
      }).catch(() => {});
    }

    // 5. 🔔 Notify Public Citizen that Work is In Progress!
    setCitizenNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        issueId,
        title: '🚀 Work Order Sanctioned & Assigned!',
        message: `Your complaint #${issueId} has been officially sanctioned by the Municipal Corporator and assigned to ${crewObj?.name || 'Rapid Response Crew'}. Work is now IN PROGRESS!`,
        type: 'in_progress',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    setLiveBanner(`🚀 Corporator sanctioned ₹ ${budgetAmount || '15,107'} budget for Issue ${issueId}! Work order is now IN PROGRESS.`);
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
            onMarkWorkDone={handleMarkWorkDone}
            onRefresh={loadData}
          />
        )}

        {/* 3. Field Crew Interface */}
        {activeTab === 'crew' && (
          <CrewPortal
            crews={crews}
            workOrders={workOrders}
            issues={issues}
            onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
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
            onSubmitReport={async (payload) => {
              const res = await api.createIssue(payload);
              setIssues((prev) => [res, ...prev]);
              setSelectedIssue(res);

              // 🔔 Immediate Citizen Confirmation Alert
              setCitizenNotifications((prev) => [
                {
                  id: `NOTIF-${Date.now()}`,
                  issueId: res.id,
                  title: '📝 Complaint Successfully Lodged & Dispatched',
                  message: `Your issue report #${res.id} (${res.title}) has arrived at Central Command and is awaiting Municipal Corporator budget sanction.`,
                  type: 'reported',
                  timestamp: new Date().toLocaleTimeString()
                },
                ...prev
              ]);

              setLiveBanner(`🚨 New Issue #${res.id} reported by citizen! Awaiting Corporator sanction.`);
              await loadData();
            }}
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
      </main>
    </div>
  );
}
