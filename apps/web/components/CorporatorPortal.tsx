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
  onSanctionWorkOrder: (issueId: string, budgetAmount?: string, assignedCrewId?: string) => Promise<void>;
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
  
  // Track assigned crew per issue
  const [selectedCrewForIssue, setSelectedCrewForIssue] = useState<Record<string, string>>({});

  const wardIssues =
    selectedWardId === 'all'
      ? issues
      : issues.filter((i) => i.ward_id === selectedWardId);

  // Issues awaiting municipal sanction (reported or acknowledged)
  const pendingSanctions = wardIssues.filter(
    (i) => i.status === 'reported' || i.status === 'acknowledged'
  );

  // Issues already in progress
  const inProgressIssues = wardIssues.filter((i) => i.status === 'in_progress');

  // Municipal budget calculations
  const totalAllocatedBudget = 2500000; // ₹ 25 Lakhs per ward
  const estimatedExpenses = wardIssues.reduce((acc, issue) => {
    const diag = getDiagnosticPreset(issue.category);
    const num = parseInt(diag.estimate.inr.replace(/,/g, ''), 10) || 15000;
    return acc + num;
  }, 0);

  const resolvedCount = wardIssues.filter((i) => i.status === 'resolved').length;
  const healthIndex = wardIssues.length > 0
    ? Math.round((resolvedCount / wardIssues.length) * 100)
    : 94;

  const handleSanction = async (issue: Issue) => {
    setIsSanctioning(issue.id);
    setSanctionNotice(null);
    try {
      const diag = getDiagnosticPreset(issue.category);
      // Pick selected crew or first available
      const crewToAssign = selectedCrewForIssue[issue.id] || (crews.length > 0 ? crews[0].id : 'CREW-01');
      await onSanctionWorkOrder(issue.id, diag.estimate.inr, crewToAssign);
      
      const crewObj = crews.find((c) => c.id === crewToAssign);
      setSanctionNotice(
        `✅ Sanctioned ₹ ${diag.estimate.inr} budget for "${issue.title || issue.category}". Assigned to ${crewObj?.name || crewToAssign}! Work order is now IN PROGRESS.`
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

        {/* Right: Newly Reported Complaints Awaiting Sanction & Crew Assignment (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Newly Reported Complaints Awaiting Sanction
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Assign a crew and click Sanction to move to &quot;In Progress&quot; for Crew &amp; Engineer
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingSanctions.length} Pending
            </span>
          </div>

          <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
            {pendingSanctions.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All complaints have been sanctioned and assigned to crews!
                <div className="text-[11px] text-slate-400 mt-1">
                  New reports from the Citizen Portal will appear here instantly.
                </div>
              </div>
            ) : (
              pendingSanctions.map((issue) => {
                const diag = getDiagnosticPreset(issue.category);
                const isCurrentSanctioning = isSanctioning === issue.id;
                const activeAssignedCrew = selectedCrewForIssue[issue.id] || (crews.length > 0 ? crews[0].id : 'CREW-01');

                return (
                  <div
                    key={issue.id}
                    className="p-4 bg-[#091124] rounded-xl border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {issue.id}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            {issue.category.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 line-clamp-1">{issue.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {issue.severity}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                      {issue.description}
                    </div>

                    {/* Crew Assignment Selector */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0e1935] p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Assign Crew:</span>
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
                            {c.name} ({c.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Footer: Estimate & Action Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Estimated Budget:</span>
                        <span className="text-sm font-black text-[#2dd4bf] font-mono">
                          ₹ {diag.estimate.inr}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSanction(issue)}
                        disabled={isCurrentSanctioning}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                      >
                        {isCurrentSanctioning ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        🚀 Sanction Budget &amp; Assign Crew
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
