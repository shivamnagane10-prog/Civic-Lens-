'use client';

import React from 'react';
import { Issue } from '@civiclens/shared-types';
import { Cpu, DollarSign, Clock, Wrench, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface DiagnosticCardViewProps {
  issue: Issue | null;
  onUpdateStatus?: (status: any) => void;
  onDispatchNearestCrew?: () => void;
}

export const DiagnosticCardView: React.FC<DiagnosticCardViewProps> = ({
  issue,
  onUpdateStatus,
  onDispatchNearestCrew,
}) => {
  if (!issue) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
        <Cpu className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h4 className="text-white font-medium text-base mb-1">No Issue Selected</h4>
        <p className="text-xs max-w-xs text-slate-400">
          Select an issue pin on the map or from the priority queue to view deep AI diagnostics and dispatch actions.
        </p>
      </div>
    );
  }

  const diag = issue.diagnostic_card;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {issue.id}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              issue.status === 'resolved'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : issue.status === 'in_progress'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {issue.status.replace('_', ' ')}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
              Source: {issue.source.toUpperCase()}
            </span>
          </div>
          <h3 className="text-white font-bold text-lg leading-snug">{issue.title}</h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{issue.description}</p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] text-slate-400">Priority Score</div>
          <div className={`text-2xl font-black ${
            issue.priority_score >= 80 ? 'text-red-400' : issue.priority_score >= 60 ? 'text-amber-400' : 'text-sky-400'
          }`}>
            {issue.priority_score.toFixed(1)}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {/* Photo Preview if available */}
        {issue.photo_url && (
          <div className="relative rounded-xl overflow-hidden border border-slate-800 h-44 bg-slate-950">
            <img
              src={issue.photo_url}
              alt="Issue capture"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] text-slate-200 border border-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-sky-400" />
              Vision AI Confidence: {(issue.ai_confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* AI Municipal Diagnostic Card */}
        {diag && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/30 border border-sky-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  AI Diagnostic Assessment
                </span>
              </div>
              {/* Mandatory Labeled Estimate Badge */}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                [LABELED ESTIMATE]
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Estimated Municipal Cost
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  {diag.cost_estimate}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 italic">
                  *Standard PWD tender schedule estimate
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Suggested SLA Target
                </div>
                <div className="text-sm font-bold text-sky-300">
                  {diag.suggested_sla_hours} Hours
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 italic">
                  *Based on safety hazard level
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Recommended Engineering Fix
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {diag.recommended_fix}
              </p>
            </div>
          </div>
        )}

        {/* Location & Ward metadata */}
        <div className="text-xs text-slate-400 flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          <span>Ward: <strong className="text-slate-200">{issue.ward_id}</strong></span>
          <span>Coordinates: <strong className="text-slate-200">{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</strong></span>
          <span>Reported: <strong className="text-slate-200">{new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        {onDispatchNearestCrew && issue.status !== 'resolved' && (
          <button
            onClick={onDispatchNearestCrew}
            className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Dispatch Suggested Crew
          </button>
        )}

        {onUpdateStatus && issue.status !== 'resolved' && (
          <button
            onClick={() => onUpdateStatus('resolved')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
};
