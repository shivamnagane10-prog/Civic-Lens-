'use client';

import React from 'react';
import { Issue, CrewSuggestion } from '@civiclens/shared-types';
import { AlertCircle, ArrowUpRight, Zap, Navigation, Check } from 'lucide-react';

interface PriorityQueueProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
  suggestions: CrewSuggestion[];
  onAcceptSuggestion: (crewId: string) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  issues,
  selectedIssue,
  onSelectIssue,
  suggestions,
  onAcceptSuggestion,
}) => {
  // Sort descending by priority score
  const sortedIssues = [...issues].sort((a, b) => b.priority_score - a.priority_score);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-bold text-sm">Smart Priority Dispatch Queue</h3>
        </div>
        <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full font-medium">
          {sortedIssues.length} Ranked Issues
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5">
        {sortedIssues.map((issue, idx) => {
          const isSelected = selectedIssue?.id === issue.id;
          const isWater = issue.category === 'water_leak';
          const isPothole = issue.category === 'pothole';

          return (
            <div
              key={issue.id}
              onClick={() => onSelectIssue(issue)}
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-sky-950/40 border border-sky-500/40 shadow-md'
                  : 'bg-slate-950/40 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                    idx === 0 ? 'bg-red-500 text-white' : idx === 1 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white hover:text-sky-400">
                        {issue.title || issue.category}
                      </span>
                      {isWater && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                          WATER SAFETY
                        </span>
                      )}
                      {isPothole && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                          TRAFFIC HAZARD
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{issue.ward_id}</span>
                      <span>•</span>
                      <span className="capitalize">{issue.category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="capitalize">{issue.status}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-sm font-black ${
                    issue.priority_score >= 80 ? 'text-red-400' : issue.priority_score >= 60 ? 'text-amber-400' : 'text-sky-400'
                  }`}>
                    {issue.priority_score.toFixed(1)}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Priority</div>
                </div>
              </div>

              {/* If this issue is selected and has crew suggestions, show one-click Accept Suggestion action */}
              {isSelected && suggestions.length > 0 && issue.status !== 'resolved' && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 bg-sky-950/20 p-2.5 rounded-lg border border-sky-900/40">
                  <div className="flex items-center justify-between text-xs text-sky-300 mb-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                      Nearest Available Crew
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      Match: {suggestions[0].recommended_score}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{suggestions[0].crew.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {suggestions[0].distance_km} km away • ETA ~{suggestions[0].estimated_eta_minutes} mins
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcceptSuggestion(suggestions[0].crew.id);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-700/30 flex items-center gap-1.5 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      One-Click Dispatch
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
