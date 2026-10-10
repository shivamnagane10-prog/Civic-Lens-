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
  DollarSign
} from 'lucide-react';
import { getDiagnosticPreset } from '../lib/diagnosticData';

interface EngineerPortalProps {
  issues: Issue[];
  workOrders: WorkOrder[];
  crews: Crew[];
  wards: Ward[];
  onMarkWorkDone: (issueId: string, workOrderId?: string, comment?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const EngineerPortal: React.FC<EngineerPortalProps> = ({
  issues,
  workOrders,
  crews,
  wards,
  onMarkWorkDone,
  onRefresh,
}) => {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    issues.length > 0 ? issues[0].id : null
  );
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'pending_approval' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [engineerComment, setEngineerComment] = useState('Certified compliant with SOP and IRC structural standards.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) || issues[0] || null;
  const diagnostic = selectedIssue ? getDiagnosticPreset(selectedIssue.category) : getDiagnosticPreset('pothole');
  const associatedWorkOrder = workOrders.find((w) => w.issue_id === selectedIssue?.id);
  const assignedCrew = associatedWorkOrder?.assigned_crew_id
    ? crews.find((c) => c.id === associatedWorkOrder.assigned_crew_id)
    : null;

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === 'in_progress') return issue.status === 'in_progress';
    if (filterTab === 'pending_approval') return issue.status === 'acknowledged' || issue.status === 'in_progress';
    if (filterTab === 'resolved') return issue.status === 'resolved';
    return true;
  });

  const handleCertifyAndDone = async () => {
    if (!selectedIssue) return;
    setIsSubmitting(true);
    setActionNotice(null);

    try {
      await onMarkWorkDone(selectedIssue.id, associatedWorkOrder?.id, engineerComment);
      setActionNotice(`✅ Work Order certified and marked DONE for Issue ${selectedIssue.id}! Quality certificate issued.`);
      await onRefresh();
    } catch (err: any) {
      setActionNotice(`Error certifying work: ${err.message || 'Server error'}`);
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
            Municipal Engineering & Quality Certification Workspace
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Assigned Technical Tasks & Quality Sign-Off
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Inspect defect geometry, audit materials bill (BOM), verify field execution, and certify assigned repairs as completed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
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

      {/* Main Grid: Left Task Queue & Right Technical Audit Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assigned Technical Tasks List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Assigned Engineering Tasks
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
              {filteredIssues.length} Tasks
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by issue, ID, or hazard..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Tasks ({issues.length})
            </button>
            <button
              onClick={() => setFilterTab('in_progress')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                filterTab === 'in_progress'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              In Progress ({issues.filter((i) => i.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setFilterTab('resolved')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                filterTab === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              Done & Certified ({issues.filter((i) => i.status === 'resolved').length})
            </button>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[560px] pr-1">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No tasks match current filter.
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const isSelected = selectedIssue?.id === issue.id;
                const isResolved = issue.status === 'resolved';

                return (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-950 border-sky-500/80 shadow-md shadow-sky-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-sky-400 font-bold">{issue.id}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {issue.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : issue.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}>
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">
                      {issue.title || `${issue.category.toUpperCase()} hazard reported`}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span>Priority: <b className="text-white">{issue.priority_score.toFixed(0)}</b></span>
                      <span className="text-emerald-400 font-semibold">{diagnostic.estimate.sorYear}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Engineering Inspection, BOM Audit & "Mark Work Done" (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedIssue ? (
            <>
              {/* Technical Inspection Card */}
              <div className="bg-[#091124] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-400">{selectedIssue.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {selectedIssue.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-1">
                      {selectedIssue.title || diagnostic.geometry.title}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Current Status</div>
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase mt-0.5 ${
                      selectedIssue.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedIssue.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {selectedIssue.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Assigned Crew & Location Meta */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Assigned Field Crew:</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-sky-400" />
                      {assignedCrew ? assignedCrew.name : 'Crew-Alpha (Asphalt Unit)'}
                    </span>
                  </div>

                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">GPS Geotag:</span>
                    <span className="font-mono font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {selectedIssue.latitude.toFixed(4)}, {selectedIssue.longitude.toFixed(4)}
                    </span>
                  </div>

                  <div className="bg-[#0e1935] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-0.5">SOP Target Window:</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {diagnostic.estimate.workWindow}
                    </span>
                  </div>
                </div>

                {/* Photogrammetric Geometry Specs (2x2 Grid) */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf] mb-2.5 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#2dd4bf]" /> Defect Geometry & Photogrammetry
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-[#0e1935] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">{diagnostic.geometry.stat1.label}</div>
                      <div className="text-sm font-black text-white">{diagnostic.geometry.stat1.value}</div>
                    </div>
                    <div className="bg-[#0e1935] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">{diagnostic.geometry.stat2.label}</div>
                      <div className="text-sm font-black text-[#f87171]">{diagnostic.geometry.stat2.value}</div>
                    </div>
                    <div className="bg-[#0e1935] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">{diagnostic.geometry.stat3.label}</div>
                      <div className="text-sm font-black text-white">{diagnostic.geometry.stat3.value}</div>
                    </div>
                    <div className="bg-[#0e1935] p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">{diagnostic.geometry.stat4.label}</div>
                      <div className="text-sm font-black text-white">{diagnostic.geometry.stat4.value}</div>
                    </div>
                  </div>
                </div>

                {/* SOP Repair Standard */}
                <div className="bg-[#0e1935] p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200">
                  <span className="font-bold text-[#2dd4bf] block mb-1">Standard Operating Procedure (SOP):</span>
                  {diagnostic.engineeringFix.sopStandard}
                </div>

                {/* Itemized BOM Requisition Summary */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-950 px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>Approved Bill of Materials ({diagnostic.bom.rateStandard})</span>
                    <span className="text-[#2dd4bf] font-mono">Budget: ₹ {diagnostic.estimate.inr}</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 bg-[#091124] text-xs">
                    {diagnostic.bom.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="px-3.5 py-2 flex items-center justify-between">
                        <span className="text-slate-300">{item.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400">{item.quantityDuration}</span>
                          <span className="font-mono text-white font-semibold">{item.subtotal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engineer Sign-Off & "Mark Work Done" Action */}
                <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" /> Engineer Quality Verification & Sign-off
                    </span>
                    {selectedIssue.status === 'resolved' ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        Certified Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        Pending Sign-off
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Engineering Quality Certification Comment
                    </label>
                    <input
                      type="text"
                      value={engineerComment}
                      onChange={(e) => setEngineerComment(e.target.value)}
                      disabled={selectedIssue.status === 'resolved'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>

                  {/* The Critical Button Requested by User: "in engineers interface there should done assigned work is done" */}
                  <button
                    type="button"
                    onClick={handleCertifyAndDone}
                    disabled={isSubmitting || selectedIssue.status === 'resolved'}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                      selectedIssue.status === 'resolved'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                    {selectedIssue.status === 'resolved'
                      ? '✓ Assigned Work is Certified & Marked Done'
                      : '✅ Certify Inspection & Mark Assigned Work Done'}
                  </button>
                </div>
              </div>
            </>
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
