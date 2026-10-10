'use client';

import React, { useState } from 'react';
import { Issue, WorkOrder, Crew } from '@civiclens/shared-types';
import {
  Wrench,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Compass,
  AlertTriangle,
  Camera,
  RefreshCw,
  Send,
  Radio,
  FileText,
  ShieldAlert,
  ChevronRight,
  Package
} from 'lucide-react';
import { getDiagnosticPreset } from '../lib/diagnosticData';

interface CrewPortalProps {
  crews: Crew[];
  workOrders: WorkOrder[];
  issues: Issue[];
  onUpdateWorkOrderStatus: (workOrderId: string, status: string, issueId?: string) => Promise<void>;
  onUpdateCrewLocation: (crewId: string, lat: number, lon: number, status: any) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const CrewPortal: React.FC<CrewPortalProps> = ({
  crews,
  workOrders,
  issues,
  onUpdateWorkOrderStatus,
  onUpdateCrewLocation,
  onRefresh,
}) => {
  // Default to first crew or CREW-01
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    crews.length > 0 ? crews[0].id : 'CREW-01'
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string>('');

  const activeCrew = crews.find((c) => c.id === selectedCrewId) || crews[0];

  // Find all work orders assigned to this crew
  const myAssignedOrders = workOrders.filter((wo) => {
    return wo.assigned_crew_id === activeCrew?.id;
  });

  // Map assigned work orders to jobs
  const myJobsFromOrders = myAssignedOrders.map((wo) => {
    const issue = issues.find((i) => i.id === wo.issue_id);
    return {
      workOrder: wo,
      issue: issue || null,
      diagnostic: issue ? getDiagnosticPreset(issue.category) : getDiagnosticPreset('pothole')
    };
  });

  // Also include in_progress issues that belong to this crew or are active
  const inProgressIssues = issues.filter(
    (i) => i.status === 'in_progress' && !myJobsFromOrders.some((job) => job.issue?.id === i.id)
  );

  const myJobsFromIssues = inProgressIssues.map((issue, idx) => ({
    workOrder: {
      id: `WO-${issue.id.slice(0, 8)}`,
      issue_id: issue.id,
      assigned_crew_id: activeCrew?.id,
      priority_score: issue.priority_score,
      status: 'in_progress',
      created_at: issue.created_at
    } as WorkOrder,
    issue,
    diagnostic: getDiagnosticPreset(issue.category)
  }));

  const myJobs = [...myJobsFromOrders, ...myJobsFromIssues];

  // If no job explicitly selected, default to first assigned job
  const activeJob =
    myJobs.find((j) => j.workOrder.id === selectedJobId) ||
    myJobs[0] ||
    (issues.length > 0
      ? {
          workOrder: {
            id: `WO-${issues[0].id.slice(0, 8)}`,
            issue_id: issues[0].id,
            assigned_crew_id: activeCrew?.id,
            priority_score: issues[0].priority_score,
            status: issues[0].status === 'in_progress' ? 'in_progress' : 'assigned',
            created_at: new Date().toISOString()
          } as WorkOrder,
          issue: issues[0],
          diagnostic: getDiagnosticPreset(issues[0].category)
        }
      : null);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeJob) return;
    setIsUpdating(true);
    setActionNotice(null);

    try {
      await onUpdateWorkOrderStatus(activeJob.workOrder.id, newStatus, activeJob.issue?.id);
      
      // Also update crew status
      let crewStatus: any = 'dispatched';
      if (newStatus === 'completed') crewStatus = 'available';
      else if (newStatus === 'in_progress') crewStatus = 'busy';

      if (activeCrew) {
        await onUpdateCrewLocation(activeCrew.id, activeCrew.latitude, activeCrew.longitude, crewStatus);
      }

      setActionNotice(`Status updated to "${newStatus.toUpperCase()}"! Notification dispatched to Municipal Engineer.`);
      await onRefresh();
    } catch (e: any) {
      setActionNotice(`Update error: ${e.message || 'Server error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBroadcastGps = async () => {
    if (!activeCrew) return;
    setIsUpdating(true);
    try {
      // Simulate slight movement or GPS ping
      const newLat = +(activeCrew.latitude + (Math.random() - 0.5) * 0.005).toFixed(4);
      const newLon = +(activeCrew.longitude + (Math.random() - 0.5) * 0.005).toFixed(4);
      await onUpdateCrewLocation(activeCrew.id, newLat, newLon, activeCrew.status);
      setActionNotice(`Live GPS broadcasted: ${newLat}, ${newLon} (Sent to Central Command)`);
      await onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Crew Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Truck className="w-4 h-4 text-amber-400" />
            Field Operative Mobile Workstation
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            My Assigned Field Problems & Work Orders
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time hazard route navigation, tools & material requisition checklist, and job progression logs.
          </p>
        </div>

        {/* Crew Selector & Telemetry */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 pl-2">Active Unit:</span>
            <select
              value={selectedCrewId}
              onChange={(e) => {
                setSelectedCrewId(e.target.value);
                setSelectedJobId(null);
              }}
              className="bg-slate-900 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              {crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name} ({crew.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleBroadcastGps}
            disabled={isUpdating}
            className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            Update Live GPS
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Main Layout: Left Assigned Jobs List & Right Job Operations Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Problems Queue (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Assigned Problems ({myJobs.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Unit: {activeCrew?.name}
            </span>
          </div>

          {/* Jobs List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {myJobs.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                No pending work orders currently assigned to {activeCrew?.name}.
                <div className="text-[11px] text-slate-500 mt-1">
                  You will receive real-time dispatch alerts when the Engineer or Municipal Corporator assigns a problem.
                </div>
              </div>
            ) : (
              myJobs.map((job) => {
                const isSelected = activeJob?.workOrder.id === job.workOrder.id;
                const isCompleted = job.workOrder.status === 'completed';

                return (
                  <div
                    key={job.workOrder.id}
                    onClick={() => setSelectedJobId(job.workOrder.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-950 border-amber-500/80 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400">
                        {job.workOrder.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : job.workOrder.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}>
                        {job.workOrder.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1.5">
                      {job.issue?.title || `${job.diagnostic.category.toUpperCase()} Repair Job`}
                    </h4>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">
                        {job.issue?.latitude.toFixed(4)}, {job.issue?.longitude.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-semibold pt-2 border-t border-slate-900">
                      <span className="text-slate-400">Target SLA:</span>
                      <span className="text-amber-400 font-bold">{job.diagnostic.estimate.workWindow}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Problem Details, Checklist & Field Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {activeJob ? (
            <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Job Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Assigned to {activeCrew?.name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      WO: {activeJob.workOrder.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1.5">
                    {activeJob.issue?.title || activeJob.diagnostic.geometry.title}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Location: 42 MG Road, near Trinity Junction (Opposite Metro Pillar 184)</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Job Progress</span>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase mt-0.5 ${
                    activeJob.workOrder.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : activeJob.workOrder.status === 'in_progress'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {activeJob.workOrder.status}
                  </span>
                </div>
              </div>

              {/* Citizen Incident Photo & AI Geometry Specs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Photo (5 cols) */}
                <div className="md:col-span-5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-44 relative">
                  <img
                    src={activeJob.issue?.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'}
                    alt="Problem evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm p-1.5 rounded-lg text-[10px] text-slate-300 flex items-center justify-between">
                    <span>Evidence Photo</span>
                    <span className="text-emerald-400 font-bold">AI Verified</span>
                  </div>
                </div>

                {/* AI Geometry & Sizing (7 cols) */}
                <div className="md:col-span-7 bg-[#0e1935] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf] mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" /> Defect Geometry for Crew
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">{activeJob.diagnostic.geometry.stat1.label}</span>
                      <div className="font-bold text-white mt-0.5">{activeJob.diagnostic.geometry.stat1.value}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">{activeJob.diagnostic.geometry.stat2.label}</span>
                      <div className="font-bold text-[#f87171] mt-0.5">{activeJob.diagnostic.geometry.stat2.value}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">{activeJob.diagnostic.geometry.stat3.label}</span>
                      <div className="font-bold text-white mt-0.5">{activeJob.diagnostic.geometry.stat3.value}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">{activeJob.diagnostic.geometry.stat4.label}</span>
                      <div className="font-bold text-white mt-0.5">{activeJob.diagnostic.geometry.stat4.value}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30 mt-2">
                    {activeJob.diagnostic.geometry.warningText}
                  </div>
                </div>
              </div>

              {/* Equipment & Tool Checklist Needed for this Problem */}
              <div className="bg-[#0e1935] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    Required Equipment & Materials Checklist
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-bold">Standard IRC SOP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activeJob.diagnostic.bom.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 bg-slate-950/70 rounded-lg border border-slate-800"
                    >
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <div className="truncate">
                        <span className="text-slate-200 font-medium block truncate">{item.description}</span>
                        <span className="text-[10px] text-slate-400">{item.quantityDuration} ({item.category})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Field Action Stepper */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Update Live Problem Execution State:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('dispatched')}
                    disabled={isUpdating}
                    className="py-3 px-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Truck className="w-4 h-4 text-sky-400" />
                    1. En Route (Leaving Depot)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={isUpdating}
                    className="py-3 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Wrench className="w-4 h-4 text-amber-400" />
                    2. Arrived On-Site (Working)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={isUpdating}
                    className="py-3 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    3. Mark Completed (Proof)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select an assigned problem from the left queue to view details and update job status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
