'use client';

import React, { useState, useEffect } from 'react';
import { PublicWardMetrics, Ward } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import { ShieldCheck, BarChart2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface PublicWardViewProps {
  wards: Ward[];
}

export const PublicWardView: React.FC<PublicWardViewProps> = ({ wards }) => {
  const [selectedWardId, setSelectedWardId] = useState<string>(wards[0]?.id || 'WARD-01');
  const [metrics, setMetrics] = useState<PublicWardMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedWardId) {
      setLoading(true);
      api.getPublicWardMetrics(selectedWardId)
        .then((data) => setMetrics(data))
        .catch((err) => console.error('Failed to fetch public metrics', err))
        .finally(() => setLoading(false));
    }
  }, [selectedWardId]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto">
      {/* Privacy Guarantee Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-bold text-lg">Public Transparency Portal</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Unauthenticated • Zero PII • No Crew Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Open municipal civic governance data published directly from the Metro City municipal core.
          </p>
        </div>

        <div>
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500"
          >
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading public metrics...</div>
      ) : metrics ? (
        <div className="py-6 space-y-6">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <BarChart2 className="w-3.5 h-3.5 text-sky-400" /> Total Reported
              </div>
              <div className="text-2xl font-black text-white">{metrics.total_issues}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Municipal Ward Total</div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Resolved
              </div>
              <div className="text-2xl font-black text-emerald-400">{metrics.resolved_issues}</div>
              <div className="text-[10px] text-emerald-500/80 mt-0.5">
                {metrics.total_issues > 0 ? `${((metrics.resolved_issues / metrics.total_issues) * 100).toFixed(0)}% fix rate` : '100%'}
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Avg Fix Time
              </div>
              <div className="text-2xl font-black text-amber-400">{metrics.avg_resolution_hours}h</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Turnaround Time</div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400" /> Active Backlog
              </div>
              <div className="text-2xl font-black text-sky-400">{metrics.pending_issues + metrics.in_progress_issues}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">In Pipeline</div>
            </div>
          </div>

          {/* Privacy Audit Note */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Public Data Privacy Certificate
            </div>
            <p className="text-[11px] leading-relaxed">
              This endpoint strictly excludes all Personally Identifiable Information (reporter phone numbers, names, IP addresses) and municipal crew operational GPS locations. All statistics displayed are pre-computed mathematical aggregations for civic accountability.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
