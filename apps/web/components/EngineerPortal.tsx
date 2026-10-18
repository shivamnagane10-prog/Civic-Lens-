'use client';

import React, { useState } from 'react';
import { Issue, WorkOrder, Crew, Ward } from '@civiclens/shared-types';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Compass,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign,
  Camera,
  XCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { getDiagnosticPreset } from '../lib/diagnosticData';

interface EngineerPortalProps {
  issues: Issue[];
  workOrders: WorkOrder[];
  crews: Crew[];
  wards: Ward[];
  onApproveWork: (
    issueId: string,
    checklist: Record<string, boolean>,
    remarks: string,
    workOrderId?: string
  ) => Promise<void>;
  onRejectWork: (
    issueId: string,
    checklist: Record<string, boolean>,
    remarks: string,
    workOrderId?: string
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const EngineerPortal: React.FC<EngineerPortalProps> = ({
  issues,
  workOrders,
  crews,
  wards,
  onApproveWork,
  onRejectWork,
  onRefresh,
}) => {
  // Default to tasks awaiting inspection, or first issue
  const awaitingCount = issues.filter((i) => i.status === 'awaiting_inspection').length;
  const [filterTab, setFilterTab] = useState<'awaiting_inspection' | 'rework_required' | 'in_progress' | 'resolved' | 'all'>(
    awaitingCount > 0 ? 'awaiting_inspection' : 'all'
  );

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inspection Checklist State
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    structural_integrity: true,
    material_compaction: true,
    debris_cleared: true,
    safety_traffic_restored: true,
  });

  // Engineer Remarks
  const [remarks, setRemarks] = useState('Quality certified compliant with SOP and IRC structural standards.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === 'all') return true;
    return issue.status === filterTab;
  });

  const selectedIssue =
    issues.find((i) => i.id === selectedIssueId) ||
    filteredIssues[0] ||
    issues[0] ||
    null;

  const diagnostic = selectedIssue ? getDiagnosticPreset(selectedIssue.category) : getDiagnosticPreset('pothole');
  const associatedWorkOrder = workOrders.find((w) => w.issue_id === selectedIssue?.id);
  const assignedCrew = selectedIssue?.assigned_crew_id
    ? crews.find((c) => c.id === selectedIssue.assigned_crew_id)
    : associatedWorkOrder?.assigned_crew_id
    ? crews.find((c) => c.id === associatedWorkOrder.assigned_crew_id)
    : null;

  const handleToggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApprove = async () => {
    if (!selectedIssue) return;
    setIsSubmitting(true);
    setActionNotice(null);
    setRejectionError(null);

    try {
      await onApproveWork(
        selectedIssue.id,
        checklist,
        remarks || 'Quality certified compliant with SOP and IRC structural standards.',
        associatedWorkOrder?.id
      );
      setActionNotice(`✅ Complaint #${selectedIssue.id} APPROVED & RESOLVED! Quality certificate issued and notification dispatched to citizen.`);
      await onRefresh();
    } catch (err: any) {
      setActionNotice(`Error approving work: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedIssue) return;
    if (!remarks || remarks.trim().length < 5) {
      setRejectionError('Please enter a specific explanation/reason in the Remarks field before requesting rework.');
      return;
    }
    setIsSubmitting(true);
    setActionNotice(null);
    setRejectionError(null);

    try {
      await onRejectWork(
        selectedIssue.id,
        checklist,
        remarks,
        associatedWorkOrder?.id
      );
      setActionNotice(`⚠️ Complaint #${selectedIssue.id} REJECTED. Status set to REWORK REQUIRED. Returned to ${assignedCrew?.name || 'Field Crew'}.`);
      await onRefresh();
    } catch (err: any) {
      setActionNotice(`Error rejecting work: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            Municipal Engineering &amp; Quality Certification Workspace
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Work Verification &amp; Before/After Quality Sign-Off
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compare citizen before-photos against field crew after-photos, audit repair checklist, and approve resolution or request rework.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
          </button>
          <div className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-300 font-bold">
            Chief Civil Engineer • Active Session
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Main Grid: Left Task Queue & Right Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Technical Tasks List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Inspection Queue
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
              {filteredIssues.length} Complaints
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, keyword, or ward..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {[
              { id: 'awaiting_inspection', label: 'Inspection Queue', count: issues.filter((i) => i.status === 'awaiting_inspection').length },
              { id: 'rework_required', label: 'Rework Req.', count: issues.filter((i) => i.status === 'rework_required').length },
              { id: 'in_progress', label: 'In Progress', count: issues.filter((i) => i.status === 'in_progress').length },
              { id: 'resolved', label: 'Resolved', count: issues.filter((i) => i.status === 'resolved').length },
              { id: 'all', label: 'All', count: issues.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  filterTab === tab.id
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1 rounded-full bg-slate-800/80 font-mono">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Task Cards List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-sky-500 mx-auto mb-2 opacity-80" />
                No complaints found in &quot;{filterTab.replace('_', ' ')}&quot; filter.
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const isSelected = selectedIssue?.id === issue.id;
                const isAwaiting = issue.status === 'awaiting_inspection';
                const isRework = issue.status === 'rework_required';

                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-950 border-sky-500 shadow-md shadow-sky-500/10'
                        : isAwaiting
                        ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400'
                        : isRework
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                        : 'bg-[#091124] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                          #{issue.id}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {issue.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                          issue.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : isRework
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : isAwaiting
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse'
                            : issue.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{issue.title}</h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                      </span>
                      <span className="font-mono text-cyan-300 font-bold">
                        ₹ {issue.approved_budget || '15,107'}
                      </span>
                    </div>

                    {/* Has completion photo preview tag */}
                    {issue.after_photo_url && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Crew Completion Photo Attached
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Quality Inspection & Approval/Rejection Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedIssue ? (
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      #{selectedIssue.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(selectedIssue.id);
                          setCopiedId(selectedIssue.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-200 font-semibold underline"
                    >
                      {copiedId === selectedIssue.id ? '✓ Copied' : 'Copy'}
                    </button>
                    <span className="text-[10px] font-bold uppercase text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      {selectedIssue.category.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1.5">
                    {selectedIssue.title || diagnostic.geometry.title}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{selectedIssue.latitude.toFixed(4)}° N, {selectedIssue.longitude.toFixed(4)}° E ({selectedIssue.ward_id})</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Current Status</div>
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mt-0.5 border ${
                      selectedIssue.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : selectedIssue.status === 'rework_required'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : selectedIssue.status === 'awaiting_inspection'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : selectedIssue.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    }`}
                  >
                    {selectedIssue.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Photographic Verification: Before vs After */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-sky-400" />
                    Photographic Quality Audit: Before vs After
                  </h4>
                  <span className="text-[10px] text-slate-400">Visual Evidence Side-by-Side</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Original Citizen Photo (Before) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      1. Citizen Original Photo (Before Repair)
                    </span>
                    <div className="h-44 rounded-xl overflow-hidden border border-slate-800 bg-black relative">
                      <img
                        src={selectedIssue.photo_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'}
                        alt="Citizen report photo"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-bold text-sky-300">
                        Initial Citizen Report
                      </span>
                    </div>
                  </div>

                  {/* Right: Field Crew After-Photo (After) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      2. Field Crew Completion Photo (After Repair)
                    </span>
                    {selectedIssue.after_photo_url ? (
                      <div className="h-44 rounded-xl overflow-hidden border-2 border-emerald-500/60 bg-black relative shadow-lg shadow-emerald-500/10">
                        <img
                          src={selectedIssue.after_photo_url}
                          alt="Crew repair photo"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 bg-emerald-950/90 border border-emerald-500/60 px-2 py-0.5 rounded text-[10px] font-black text-emerald-300">
                          ✓ Crew Repair Proof
                        </span>
                      </div>
                    ) : (
                      <div className="h-44 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-4 text-center bg-slate-950/40">
                        <Clock className="w-6 h-6 text-slate-600 mb-2" />
                        <span className="text-xs text-slate-400 font-semibold">
                          Completion Photo Not Yet Uploaded
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1">
                          Crew must submit after-photo from the field workstation.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Crew Notes */}
              {selectedIssue.crew_notes && (
                <div className="bg-[#0e1935] p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-amber-400 uppercase text-[10px] block">
                    Field Crew Execution Notes:
                  </span>
                  <p className="text-slate-200">{selectedIssue.crew_notes}</p>
                </div>
              )}

              {/* Meta Grid: Assigned Crew, Approved Budget & SLA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Assigned Crew:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-sky-400" />
                    {assignedCrew?.name || 'Rapid Response Crew'}
                  </span>
                </div>

                <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Approved Budget:</span>
                  <span className="font-mono font-bold text-[#2dd4bf] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    ₹ {selectedIssue.approved_budget || diagnostic.estimate.inr}
                  </span>
                </div>

                <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">SOP Target Window:</span>
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {diagnostic.estimate.workWindow}
                  </span>
                </div>
              </div>

              {/* Interactive Inspection Checklist */}
              <div className="bg-[#0e1935] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Chief Engineer Quality Inspection Checklist
                  </h4>
                  <span className="text-[10px] text-sky-400 font-bold">IRC &amp; Municipal SOP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { key: 'structural_integrity', label: '1. Surface leveled & structural compaction verified' },
                    { key: 'material_compaction', label: '2. Asphalt/concrete grade & material depth certified' },
                    { key: 'debris_cleared', label: '3. Construction debris, gravel & hazard tape cleared' },
                    { key: 'safety_traffic_restored', label: '4. Full road reopening & pedestrian safety verified' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2.5 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checklist[item.key] ?? true}
                        onChange={() => handleToggleChecklist(item.key)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span className="text-slate-200 font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Engineer Remarks / Quality Decision Explanation:
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    if (rejectionError) setRejectionError(null);
                  }}
                  placeholder="Enter certification sign-off remarks or specific rework instructions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-sans"
                />
                {rejectionError && (
                  <span className="text-rose-400 text-xs font-semibold block">
                    {rejectionError}
                  </span>
                )}
              </div>

              {/* Decision Action Buttons: Approve (Resolve) vs Reject (Rework) */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-4">
                {/* 🟢 Approve & Certify Button */}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting || selectedIssue.status === 'resolved'}
                  className={`flex-1 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                    selectedIssue.status === 'resolved'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <ThumbsUp className="w-4 h-4 text-white" />
                  )}
                  {selectedIssue.status === 'resolved'
                    ? '✓ Already Certified & Resolved'
                    : '✅ Approve & Mark Resolved (Notify Citizen)'}
                </button>

                {/* 🔴 Reject / Request Rework Button */}
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || selectedIssue.status === 'resolved'}
                  className="px-6 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 transition-all shadow-md shadow-rose-950/50 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  ❌ Reject / Request Rework
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select an engineering task from the left list to review specifications and certify completion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
