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
  Package,
  Upload,
  ArrowRight
} from 'lucide-react';
import { getDiagnosticPreset } from '../lib/diagnosticData';
import { api } from '../lib/api/client';

interface CrewPortalProps {
  crews: Crew[];
  workOrders: WorkOrder[];
  issues: Issue[];
  onAcceptTask: (issueId: string, workOrderId?: string) => Promise<void>;
  onSubmitInspection: (
    issueId: string,
    afterPhotoUrl: string,
    crewNotes: string,
    workOrderId?: string
  ) => Promise<void>;
  onUpdateCrewLocation: (crewId: string, lat: number, lon: number, status: any) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const CrewPortal: React.FC<CrewPortalProps> = ({
  crews,
  workOrders,
  issues,
  onAcceptTask,
  onSubmitInspection,
  onUpdateCrewLocation,
  onRefresh,
}) => {
  // Default to first crew or CREW-01
  const [selectedCrewId, setSelectedCrewId] = useState<string>(
    crews.length > 0 ? crews[0].id : 'CREW-01'
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Field execution form inputs
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80'
  );
  const [crewNotes, setCrewNotes] = useState<string>(
    'Excavated cavity to solid sub-base, applied prime coat bitumen emulsion, filled with 50mm compacted asphalt patch, rolled smooth with vibrating roller.'
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const activeCrew = crews.find((c) => c.id === selectedCrewId) || crews[0];

  // Find all issues assigned to this crew (via assigned_crew_id or work orders)
  const myAssignedIssues = issues.filter((i) => {
    if (i.assigned_crew_id === activeCrew?.id) return true;
    const wo = workOrders.find((w) => w.issue_id === i.id);
    return wo?.assigned_crew_id === activeCrew?.id;
  });

  // Selected issue
  const activeIssue =
    myAssignedIssues.find((i) => i.id === selectedIssueId) ||
    myAssignedIssues[0] ||
    (issues.length > 0 ? issues[0] : null);

  const activeWorkOrder = workOrders.find((w) => w.issue_id === activeIssue?.id);
  const diagnostic = activeIssue ? getDiagnosticPreset(activeIssue.category) : getDiagnosticPreset('pothole');

  // Filtered list
  const filteredMyIssues = myAssignedIssues.filter((i) => {
    if (filterTab === 'all') return true;
    return i.status === filterTab;
  });

  const handleAccept = async (issueId: string) => {
    setIsUpdating(true);
    setActionNotice(null);
    try {
      await onAcceptTask(issueId, activeWorkOrder?.id);
      setActionNotice(`✅ Task accepted for #${issueId}! Work status is now IN PROGRESS. Dispatched telemetry updated.`);
      await onRefresh();
    } catch (e: any) {
      setActionNotice(`Error accepting task: ${e.message || 'Server error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitForInspection = async (issueId: string) => {
    if (!afterPhotoUrl) {
      setActionNotice('Please upload or provide a completion after-photo before submitting for inspection.');
      return;
    }
    setIsUpdating(true);
    setActionNotice(null);
    try {
      await onSubmitInspection(issueId, afterPhotoUrl, crewNotes, activeWorkOrder?.id);
      setActionNotice(`🎉 Repairs submitted for Engineering Inspection! Status: AWAITING INSPECTION. Chief Engineer notified.`);
      await onRefresh();
    } catch (e: any) {
      setActionNotice(`Error submitting for inspection: ${e.message || 'Server error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadImage(file);
      if (res && res.url) {
        setAfterPhotoUrl(res.url);
        setActionNotice('Uploaded completion after-photo successfully!');
      }
    } catch (e) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setAfterPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleBroadcastGps = async () => {
    if (!activeCrew) return;
    setIsUpdating(true);
    try {
      const newLat = +(activeCrew.latitude + (Math.random() - 0.5) * 0.005).toFixed(4);
      const newLon = +(activeCrew.longitude + (Math.random() - 0.5) * 0.005).toFixed(4);
      await onUpdateCrewLocation(activeCrew.id, newLat, newLon, activeCrew.status);
      setActionNotice(`📍 Live GPS Broadcasted: ${newLat}° N, ${newLon}° E (Transmitted to Central Command)`);
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
            Assigned Field Tasks &amp; Repair Execution
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Accept assigned tasks, visit location, execute repairs, upload completion after-photos, and submit for Engineering Quality Inspection.
          </p>
        </div>

        {/* Crew Selector & Telemetry */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 pl-2">Active Crew:</span>
            <select
              value={selectedCrewId}
              onChange={(e) => {
                setSelectedCrewId(e.target.value);
                setSelectedIssueId(null);
              }}
              className="bg-slate-900 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              {crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name} ({crew.status === 'available' ? '🟢 Available' : '🟡 Dispatched'})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleBroadcastGps}
            disabled={isUpdating}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Ping GPS
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Main Layout: Left Queue & Right Operations Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Problems Queue (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                Tasks For {activeCrew?.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select an assignment to view repair details and execute work
              </p>
            </div>
            <span className="text-xs text-amber-300 font-mono bg-amber-950/80 border border-amber-800 px-2.5 py-0.5 rounded-full font-bold">
              {myAssignedIssues.length} Assigned
            </span>
          </div>

          {/* Filter Tabs for Crew */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: 'all', label: 'All' },
              { id: 'assigned', label: 'New Assigned' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'rework_required', label: 'Rework Req.' },
              { id: 'awaiting_inspection', label: 'In Inspection' },
              { id: 'resolved', label: 'Certified' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTab(t.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filterTab === t.id
                    ? 'bg-amber-600 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Jobs List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredMyIssues.length === 0 ? (
              <div className="p-10 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400">
                <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                No tasks found in &quot;{filterTab.replace('_', ' ')}&quot; status for this crew.
                <div className="text-[11px] text-slate-500 mt-1">
                  Operator will assign complaints from the municipal queue.
                </div>
              </div>
            ) : (
              filteredMyIssues.map((issue) => {
                const isSelected = activeIssue?.id === issue.id;
                const isRework = issue.status === 'rework_required';

                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-slate-950 border-amber-500 shadow-md shadow-amber-500/10'
                        : isRework
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          #{issue.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {issue.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          issue.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : issue.status === 'rework_required'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : issue.status === 'awaiting_inspection'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : issue.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{issue.title}</h4>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">
                        {issue.latitude.toFixed(4)}° N, {issue.longitude.toFixed(4)}° E ({issue.ward_id})
                      </span>
                    </div>

                    {isRework && (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-[10px] text-rose-300 font-medium">
                        ⚠️ Rework required: {issue.engineer_remarks || 'Inspection failed'}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-semibold pt-2 border-t border-slate-900">
                      <span className="text-slate-400">Approved Budget:</span>
                      <span className="text-[#2dd4bf] font-bold font-mono">
                        ₹ {issue.approved_budget || diagnostic.estimate.inr}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Problem Details, Checklist & Field Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {activeIssue ? (
            <div className="bg-[#0b1329] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Job Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Assigned to {activeCrew?.name}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      #{activeIssue.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1.5">
                    {activeIssue.title || diagnostic.geometry.title}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Location: {activeIssue.latitude.toFixed(4)}° N, {activeIssue.longitude.toFixed(4)}° E ({activeIssue.ward_id})</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Workflow State</span>
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mt-0.5 border ${
                      activeIssue.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : activeIssue.status === 'rework_required'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : activeIssue.status === 'awaiting_inspection'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : activeIssue.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    }`}
                  >
                    {activeIssue.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Rework Alert Banner (If Engineer rejected work) */}
              {activeIssue.status === 'rework_required' && (
                <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-xl p-4 space-y-1.5 text-xs text-rose-200 shadow-lg animate-pulse">
                  <div className="flex items-center gap-2 font-black uppercase text-rose-300 tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Chief Engineer Rework Required
                  </div>
                  <p className="font-medium text-slate-200">
                    {activeIssue.engineer_remarks || 'Inspection rejected. Please re-level the surface and clear debris.'}
                  </p>
                  <span className="text-[10px] text-slate-400 block pt-1">
                    Execute corrective repairs, take a new completion photo, and re-submit for engineering verification below.
                  </span>
                </div>
              )}

              {/* Citizen Incident Photo & AI Geometry Specs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Photo (5 cols) */}
                <div className="md:col-span-5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-44 relative">
                  <img
                    src={activeIssue.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'}
                    alt="Citizen problem photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm p-1.5 rounded-lg text-[10px] text-slate-300 flex items-center justify-between">
                    <span>Citizen Photo (Before)</span>
                    <span className="text-emerald-400 font-bold">Verified</span>
                  </div>
                </div>

                {/* AI Geometry & Sizing (7 cols) */}
                <div className="md:col-span-7 bg-[#0e1935] p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf] mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" /> Defect Geometry &amp; Field Specs
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">{diagnostic.geometry.stat1.label}</span>
                      <div className="font-bold text-white mt-0.5">{diagnostic.geometry.stat1.value}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">{diagnostic.geometry.stat2.label}</span>
                      <div className="font-bold text-[#f87171] mt-0.5">{diagnostic.geometry.stat2.value}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">Approved Budget</span>
                      <div className="font-bold text-[#2dd4bf] mt-0.5">₹ {activeIssue.approved_budget || diagnostic.estimate.inr}</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400">Target SLA</span>
                      <div className="font-bold text-white mt-0.5">{diagnostic.estimate.workWindow}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800 mt-2">
                    {activeIssue.description}
                  </div>
                </div>
              </div>

              {/* Stage 1 Action: If Status is "Assigned" -> Accept Task Button */}
              {activeIssue.status === 'assigned' && (
                <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-purple-950/40 p-4 rounded-xl border border-purple-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        ⚡ Step 1: Accept Assigned Task
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Confirm task receipt to notify Central Command and mark status as &quot;In Progress&quot;.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAccept(activeIssue.id)}
                    disabled={isUpdating}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Accept Task &amp; Mark In Progress (Arrive On Site)
                  </button>
                </div>
              )}

              {/* Stage 2 Action: If Status is "In Progress" or "Rework Required" -> Upload After-Photo and Submit for Inspection */}
              {(activeIssue.status === 'in_progress' || activeIssue.status === 'rework_required') && (
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 rounded-xl border border-amber-500/40 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-400" />
                      Step 2: Submit Completed Work for Engineering Inspection
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload photographic proof of completed repairs and provide technical work notes for the Chief Engineer.
                    </p>
                  </div>

                  {/* Completion Photo Upload / URL */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Completion Photo (After Repair):
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer flex items-center gap-2 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingPhoto ? 'Uploading...' : 'Upload After-Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={afterPhotoUrl}
                        onChange={(e) => setAfterPhotoUrl(e.target.value)}
                        placeholder="Or paste photo URL..."
                        className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    {afterPhotoUrl && (
                      <div className="h-32 w-full rounded-xl overflow-hidden border border-emerald-500/40 bg-black relative mt-2">
                        <img
                          src={afterPhotoUrl}
                          alt="After-repair preview"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                          ✓ Repair After-Photo Ready
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Work Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Field Execution Notes for Quality Inspection:
                    </label>
                    <textarea
                      rows={2}
                      value={crewNotes}
                      onChange={(e) => setCrewNotes(e.target.value)}
                      placeholder="Describe materials used, depth of cut, compaction method, etc."
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={() => handleSubmitForInspection(activeIssue.id)}
                    disabled={isUpdating || isUploadingPhoto}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    🚀 Submit Task for Engineering Quality Inspection
                  </button>
                </div>
              )}

              {/* Stage 3 Action: If Status is "Awaiting Inspection" */}
              {activeIssue.status === 'awaiting_inspection' && (
                <div className="bg-cyan-950/30 border border-cyan-500/40 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-cyan-300">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Awaiting Engineering Inspection &amp; Certification
                  </div>
                  <p className="text-slate-300">
                    Field repairs have been completed and submitted. The Chief Municipal Engineer will compare before/after photos and certify compliance.
                  </p>
                  {activeIssue.after_photo_url && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Submitted After-Photo:</span>
                      <div className="h-28 rounded-lg overflow-hidden border border-cyan-500/30 w-48 bg-black">
                        <img src={activeIssue.after_photo_url} alt="After photo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 4: If Status is "Resolved" */}
              {activeIssue.status === 'resolved' && (
                <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-1.5 text-xs text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Work Order Certified &amp; Completed!
                  </div>
                  <p className="text-slate-300">
                    {activeIssue.engineer_remarks || 'Work certified compliant by Municipal Chief Engineer.'}
                  </p>
                </div>
              )}
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
