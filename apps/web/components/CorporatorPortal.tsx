'use client';

import React, { useState } from 'react';
import { Ward, Issue, WorkOrder, Crew } from '@civiclens/shared-types';
import {
  Landmark,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  RefreshCw,
  ThumbsUp,
  Send,
  Truck,
  Wrench,
  MapPin
} from 'lucide-react';
import { WardMap } from './WardMap';
import { getDiagnosticPreset } from '../lib/diagnosticData';

interface CorporatorPortalProps {
  wards: Ward[];
  issues: Issue[];
  workOrders: WorkOrder[];
  crews: Crew[];
  onSanctionWorkOrder: (
    issueId: string,
    budgetAmount?: string,
    assignedCrewId?: string,
    priority?: string,
    severity?: string
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const CorporatorPortal: React.FC<CorporatorPortalProps> = ({
  wards,
  issues,
  workOrders,
  crews,
  onSanctionWorkOrder,
  onRefresh,
}) => {
  // Default to 'all' so newly reported issues in ANY ward are immediately visible!
  const [selectedWardId, setSelectedWardId] = useState<string>('all');
  const [sanctionNotice, setSanctionNotice] = useState<string | null>(null);
  const [isSanctioning, setIsSanctioning] = useState<string | null>(null);
  const [complaintFilterTab, setComplaintFilterTab] = useState<string>('submitted');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Track assigned crew, budget, and priority per issue
  const [selectedCrewForIssue, setSelectedCrewForIssue] = useState<Record<string, string>>({});
  const [budgetOverrides, setBudgetOverrides] = useState<Record<string, string>>({});
  const [priorityOverrides, setPriorityOverrides] = useState<Record<string, string>>({});

  const wardIssues =
    selectedWardId === 'all'
      ? issues
      : issues.filter((i) => i.ward_id === selectedWardId);

  // Issues awaiting municipal sanction (submitted, reported, or acknowledged)
  const pendingSanctions = wardIssues.filter(
    (i) => i.status === 'submitted' || i.status === 'reported' || i.status === 'acknowledged'
  );

  // Issues already assigned or in progress
  const assignedIssues = wardIssues.filter((i) => i.status === 'assigned');
  const inProgressIssues = wardIssues.filter((i) => i.status === 'in_progress');
  const inspectionIssues = wardIssues.filter((i) => i.status === 'awaiting_inspection');
  const reworkIssues = wardIssues.filter((i) => i.status === 'rework_required');
  const resolvedIssues = wardIssues.filter((i) => i.status === 'resolved');

  // Municipal budget calculations
  const totalAllocatedBudget = 2500000; // ₹ 25 Lakhs per ward
  const estimatedExpenses = wardIssues.reduce((acc, issue) => {
    const diag = getDiagnosticPreset(issue.category);
    const num = parseInt((issue.approved_budget || diag.estimate.inr).replace(/,/g, ''), 10) || 15000;
    return acc + num;
  }, 0);

  const resolvedCount = resolvedIssues.length;
  const healthIndex = wardIssues.length > 0
    ? Math.round((resolvedCount / wardIssues.length) * 100)
    : 94;

  const handleSanction = async (issue: Issue) => {
    setIsSanctioning(issue.id);
    setSanctionNotice(null);
    try {
      const diag = getDiagnosticPreset(issue.category);
      const budgetToApprove = budgetOverrides[issue.id] || issue.approved_budget || diag.estimate.inr;
      const crewToAssign = selectedCrewForIssue[issue.id] || issue.assigned_crew_id || (crews.length > 0 ? crews[0].id : 'CREW-01');
      const selectedPriority = priorityOverrides[issue.id] || issue.severity || 'medium';
      
      await onSanctionWorkOrder(issue.id, budgetToApprove, crewToAssign, selectedPriority, selectedPriority);
      
      const crewObj = crews.find((c) => c.id === crewToAssign);
      setSanctionNotice(
        `✅ Work Order Sanctioned for #${issue.id}! Approved Budget: ₹ ${budgetToApprove} • Assigned to ${crewObj?.name || crewToAssign} • Status: ASSIGNED.`
      );
      await onRefresh();
    } catch (e: any) {
      setSanctionNotice(`Error sanctioning budget: ${e.message || 'Server error'}`);
    } finally {
      setIsSanctioning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
            <Landmark className="w-4 h-4 text-indigo-400" />
            Municipal Corporator & Ward Governance Command Center
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Ward Budget Allocation, Crew Assignment & Sanctioning
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Citizen reports appear here. Authorize repair funds, assign field crews, and advance work to &quot;In Progress&quot;.
          </p>
        </div>

        {/* Ward Selector Dropdown with "All Wards" default */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Ward Filter:</span>
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="bg-slate-900 text-indigo-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              <option value="all">🌍 All Wards & Zones (City-Wide)</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.city})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefresh}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Data
          </button>
        </div>
      </div>

      {sanctionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{sanctionNotice}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Ward Budget Sanctioned</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹ {(totalAllocatedBudget - estimatedExpenses).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>Remaining from ₹ 25,00,000 Allocation</span>
          </div>
        </div>

        <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Pending Sanctions</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {pendingSanctions.length}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            Awaiting Corporator Budget & Crew Assignment
          </div>
        </div>

        <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Work In Progress</span>
            <Wrench className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {inProgressIssues.length}
          </div>
          <div className="text-[11px] text-sky-400 mt-1">
            Assigned to Crews & Active in Field
          </div>
        </div>

        <div className="bg-[#0b1329] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Dispatched Field Crews</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {crews.filter((c) => c.status !== 'offline').length} Active
          </div>
          <div className="text-[11px] text-indigo-400 mt-1">
            Rapid Response Units Operating
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Ward Map & Pending Budget Sanctions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ward Map (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Spatial Hazard Map ({selectedWardId === 'all' ? 'All Zones' : selectedWardId})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {wardIssues.length} Geotagged Hazards
            </span>
          </div>

          <div className="h-[480px] rounded-xl overflow-hidden border border-slate-800">
            <WardMap
              wards={wards}
              issues={wardIssues}
              crews={crews}
              selectedIssue={null}
              onSelectIssue={() => {}}
              selectedWardId={selectedWardId === 'all' ? null : selectedWardId}
              onSelectWard={(id) => setSelectedWardId(id)}
            />
          </div>
        </div>

        {/* Right: Operator Review & Crew Assignment Workspace (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Operator Review &amp; Sanction Queue
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Review complaints, set priority, approve repair budget, and assign field crew &rarr; Status: Assigned
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {pendingSanctions.length} Awaiting Sanction
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: 'submitted', label: 'New Submitted', count: pendingSanctions.length },
              { id: 'assigned', label: 'Assigned', count: assignedIssues.length },
              { id: 'in_progress', label: 'In Progress', count: inProgressIssues.length },
              { id: 'awaiting_inspection', label: 'Inspection', count: inspectionIssues.length },
              { id: 'rework_required', label: 'Rework Req.', count: reworkIssues.length },
              { id: 'resolved', label: 'Resolved', count: resolvedIssues.length },
              { id: 'all', label: 'All', count: wardIssues.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setComplaintFilterTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  complaintFilterTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
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

          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {(() => {
              const displayed = wardIssues.filter((i) => {
                if (complaintFilterTab === 'submitted') {
                  return i.status === 'submitted' || i.status === 'reported' || i.status === 'acknowledged';
                }
                if (complaintFilterTab === 'all') return true;
                return i.status === complaintFilterTab;
              });

              if (displayed.length === 0) {
                return (
                  <div className="text-center py-16 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    No complaints found in &quot;{complaintFilterTab.replace('_', ' ')}&quot; status.
                    <div className="text-[11px] text-slate-400 mt-1">
                      New submissions from citizens will arrive here instantly.
                    </div>
                  </div>
                );
              }

              return displayed.map((issue) => {
                const diag = getDiagnosticPreset(issue.category);
                const isCurrentSanctioning = isSanctioning === issue.id;
                const activeAssignedCrew = selectedCrewForIssue[issue.id] || issue.assigned_crew_id || (crews.length > 0 ? crews[0].id : 'CREW-01');
                const currentBudget = budgetOverrides[issue.id] || issue.approved_budget || diag.estimate.inr;
                const currentPriority = priorityOverrides[issue.id] || issue.severity || 'medium';
                const assignedCrewObj = crews.find((c) => c.id === (issue.assigned_crew_id || activeAssignedCrew));
                const isAlreadySanctioned = issue.status !== 'submitted' && issue.status !== 'reported' && issue.status !== 'acknowledged';

                return (
                  <div
                    key={issue.id}
                    className="p-4 bg-[#091124] rounded-xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-md"
                  >
                    {/* Header: Complaint ID, Ward, and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
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
                            {copiedId === issue.id ? '✓ Copied' : 'Copy'}
                          </button>
                          <span className="text-[10px] font-bold uppercase text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                            {issue.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {issue.ward_id}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 line-clamp-1">{issue.title}</h4>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                          issue.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : issue.status === 'rework_required'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : issue.status === 'awaiting_inspection'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : issue.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : issue.status === 'assigned'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Image & Location Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                      {issue.photo_url && (
                        <div className="sm:col-span-4 h-24 rounded-lg overflow-hidden border border-slate-800 relative bg-black">
                          <img
                            src={issue.photo_url}
                            alt="Citizen uploaded problem"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className={issue.photo_url ? 'sm:col-span-8 space-y-1.5' : 'sm:col-span-12 space-y-1.5'}>
                        <div className="text-xs text-slate-300 line-clamp-2">
                          {issue.description}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span>{issue.latitude.toFixed(4)}° N, {issue.longitude.toFixed(4)}° E</span>
                          <span>• {new Date(issue.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operator Controls: Priority & Budget Approval */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#0e1935] p-3 rounded-lg border border-slate-800 text-xs">
                      {/* Priority Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Priority Classification:
                        </label>
                        <select
                          value={currentPriority}
                          onChange={(e) =>
                            setPriorityOverrides((prev) => ({
                              ...prev,
                              [issue.id]: e.target.value
                            }))
                          }
                          className="w-full bg-slate-900 text-slate-200 font-semibold text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="critical">🔴 Critical Priority (Immediate)</option>
                          <option value="high">🟠 High Priority (&lt; 24h SLA)</option>
                          <option value="medium">🟡 Medium Priority (48h SLA)</option>
                          <option value="low">🟢 Low Priority (Scheduled)</option>
                        </select>
                      </div>

                      {/* Approved Budget Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sanctioned Repair Budget (₹):
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono text-xs">₹</span>
                          <input
                            type="text"
                            value={currentBudget}
                            onChange={(e) =>
                              setBudgetOverrides((prev) => ({
                                ...prev,
                                [issue.id]: e.target.value
                              }))
                            }
                            className="w-full bg-slate-900 text-[#2dd4bf] font-mono font-bold text-xs pl-6 pr-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-teal-500"
                            placeholder="15,107"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Field Crew Assignment Selector */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b142c] p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Field Crew Assignment:</span>
                      </div>
                      <select
                        value={activeAssignedCrew}
                        onChange={(e) =>
                          setSelectedCrewForIssue((prev) => ({
                            ...prev,
                            [issue.id]: e.target.value
                          }))
                        }
                        className="bg-slate-900 text-amber-300 font-bold text-xs px-2.5 py-1 rounded border border-slate-700 focus:outline-none"
                      >
                        {crews.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.status === 'available' ? '🟢 Available' : '🟡 Dispatched'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Assigned To:</span>
                        <span className="text-xs font-bold text-slate-200">
                          {assignedCrewObj?.name || activeAssignedCrew}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSanction(issue)}
                        disabled={isCurrentSanctioning}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 ${
                          isAlreadySanctioned
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                        }`}
                      >
                        {isCurrentSanctioning ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        {isAlreadySanctioned ? '🔄 Update Sanction & Crew' : '🚀 Sanction Budget & Assign Crew'}
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
