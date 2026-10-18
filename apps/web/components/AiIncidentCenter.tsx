'use client';

import React, { useState, useEffect } from 'react';
import {
  CctvDetection,
  IncidentReport,
  DetectionCategory,
  DetectionReviewStatus,
  EscalationAgency,
  EscalationStatus,
  Issue
} from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  AlertTriangle,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  FileText,
  Send,
  Radio,
  Clock,
  MapPin,
  Sparkles,
  PhoneCall,
  Flame,
  Truck,
  Activity,
  UserCheck,
  Search,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface AiIncidentCenterProps {
  onWatchIncident: (cameraId: string, seekSeconds: number) => void;
  onWatchLive: (cameraId: string) => void;
  onComplaintCreated?: (issue: any) => void;
}

export function AiIncidentCenter({
  onWatchIncident,
  onWatchLive,
  onComplaintCreated,
}: AiIncidentCenterProps) {
  const [detections, setDetections] = useState<CctvDetection[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | DetectionCategory>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | DetectionReviewStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected for review modal
  const [reviewingDetection, setReviewingDetection] = useState<CctvDetection | null>(null);
  const [reviewDecision, setReviewDecision] = useState<DetectionReviewStatus>('verified');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Selected for Incident Report / Emergency Escalation Modal
  const [reportingDetection, setReportingDetection] = useState<CctvDetection | null>(null);
  const [reportSummary, setReportSummary] = useState('');
  const [escalationAgency, setEscalationAgency] = useState<EscalationAgency>('police_112');
  const [isEscalating, setIsEscalating] = useState(false);

  // Status Notification Banner
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dets, reports] = await Promise.all([
        api.getCctvDetections(),
        api.getIncidentReports().catch(() => []),
      ]);
      setDetections(dets);
      setIncidentReports(reports);
    } catch (err) {
      console.error('Failed to load incident center data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Detections
  const filteredDetections = detections.filter((d) => {
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    const matchesReview = reviewFilter === 'all' || d.review_status === reviewFilter;
    const matchesPriority = priorityFilter === 'all' || d.priority === priorityFilter;
    const matchesSearch =
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.camera_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesReview && matchesPriority && matchesSearch;
  });

  // Action 1: Submit Human Review (Verified / Inconclusive / False Positive)
  const handleSubmitReview = async () => {
    if (!reviewingDetection) return;
    try {
      setIsSubmittingReview(true);
      const updated = await api.reviewCctvDetection(
        reviewingDetection.id,
        reviewDecision,
        reviewerNotes,
        'USER-OFFICIAL-SARAH'
      );
      setDetections((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setActionBanner(`Detection #${reviewingDetection.id} updated to status: ${reviewDecision.toUpperCase()}`);
      setTimeout(() => setActionBanner(null), 5000);
      setReviewingDetection(null);
      setReviewerNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Action 2: Route Civic Detection directly into Civic Complaint Workflow
  const handleRouteToCivicComplaint = async (detection: CctvDetection) => {
    try {
      const res = await api.createComplaintFromDetection(detection.id, {
        title: `CCTV Auto-Detection: ${detection.description.slice(0, 60)}`,
        description: `Automated optical edge detection at ${detection.location_name}. Event ID: ${detection.id}. Observable indicators: ${detection.observable_indicators?.join(', ')}.`,
        ward_id: detection.ward_id,
        severity: detection.priority,
      });

      // Update local state
      setDetections((prev) =>
        prev.map((d) => (d.id === detection.id ? { ...d, review_status: 'verified', complaint_id: res.issue_id } : d))
      );

      if (onComplaintCreated) {
        onComplaintCreated(res);
      }

      setActionBanner(`✅ Created Civic Complaint #${res.issue_id}! Routed to Corporator Portal for budget approval & crew dispatch.`);
      setTimeout(() => setActionBanner(null), 6000);
    } catch (err) {
      console.error(err);
    }
  };

  // Action 3: Generate Formal Incident Report & Escalate to Emergency Channel
  const handleGenerateAndEscalateReport = async () => {
    if (!reportingDetection) return;
    try {
      setIsEscalating(true);
      const rep = await api.createIncidentReport(reportingDetection.id, {
        summary: reportSummary || reportingDetection.description,
        priority: reportingDetection.priority,
        escalation_channel: escalationAgency,
        reviewer_notes: `Incident verified by Operator. Transmitted to ${escalationAgency.toUpperCase()} emergency channel.`,
      });

      setIncidentReports((prev) => [rep, ...prev]);
      setDetections((prev) =>
        prev.map((d) => (d.id === reportingDetection.id ? { ...d, review_status: 'verified', incident_report_id: rep.id } : d))
      );

      setActionBanner(`🚨 Formal Incident Report #${rep.id} created & transmitted to ${escalationAgency.toUpperCase()}! Tracking Ref: ${rep.agency_reference_id}`);
      setTimeout(() => setActionBanner(null), 6000);
      setReportingDetection(null);
      setReportSummary('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsEscalating(false);
    }
  };

  // Action 4: Update live escalation progression
  const handleUpdateEscalationStatus = async (reportId: string, newStatus: EscalationStatus) => {
    try {
      const rep = incidentReports.find((r) => r.id === reportId);
      if (!rep) return;
      const updated = await api.escalateIncidentReport(reportId, rep.escalation_channel || 'police_112', newStatus);
      setIncidentReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setActionBanner(`Agency Ref ${updated.agency_reference_id} status updated to: ${newStatus.toUpperCase()}`);
      setTimeout(() => setActionBanner(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700 text-slate-300">
            LOW
          </span>
        );
    }
  };

  const getReviewBadge = (st: DetectionReviewStatus) => {
    switch (st) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        );
      case 'inconclusive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3 h-3" /> Inconclusive
          </span>
        );
      case 'false_positive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/50">
            <XCircle className="w-3 h-3" /> False Positive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              AI Incident Queue & Emergency Response Center
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/80">
                HUMAN-IN-THE-LOOP TRIAGE
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ethical AI video inference with mandatory human triage. Fork A: Route civic hazards to municipal complaints. Fork B: Generate verifiable incident reports for emergency agencies.
          </p>
        </div>

        {/* Quick Triage Tallies */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">PENDING</span>
            <span className="text-sky-400 font-bold">
              {detections.filter((d) => d.review_status === 'pending_review').length}
            </span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">ESCALATED</span>
            <span className="text-rose-400 font-bold">{incidentReports.length}</span>
          </div>
        </div>
      </div>

      {actionBanner && (
        <div className="p-3 bg-indigo-950/70 border border-indigo-500/50 rounded-xl text-xs text-indigo-200 flex items-center gap-2 shadow-lg animate-fadeIn">
          <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
          <span className="font-medium">{actionBanner}</span>
        </div>
      )}

      {/* Filter and Category Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Category Filter Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Incidents ({detections.length})
            </button>
            <button
              onClick={() => setCategoryFilter('public_safety')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'public_safety'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              Public Safety & Emergencies ({detections.filter((d) => d.category === 'public_safety').length})
            </button>
            <button
              onClick={() => setCategoryFilter('civic_infrastructure')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'civic_infrastructure'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-amber-300" />
              Civic Infrastructure Hazards ({detections.filter((d) => d.category === 'civic_infrastructure').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event, camera, or description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Secondary Filter Row: Review Status & Priority */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <span className="text-[11px] font-mono uppercase text-slate-500">Review Status:</span>
          {(['all', 'pending_review', 'verified', 'inconclusive', 'false_positive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setReviewFilter(st)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                reviewFilter === st
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? 'All'
                : st.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}

          <span className="text-slate-700 mx-1">|</span>

          <span className="text-[11px] font-mono uppercase text-slate-500">Priority:</span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((pr) => (
            <button
              key={pr}
              onClick={() => setPriorityFilter(pr)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                priorityFilter === pr
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'hover:text-slate-200'
              }`}
            >
              {pr.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Detections Triage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDetections.map((det) => {
          const isSafety = det.category === 'public_safety';
          return (
            <div
              key={det.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all hover:shadow-2xl ${
                isSafety ? 'border-slate-800 hover:border-rose-500/50' : 'border-slate-800 hover:border-sky-500/50'
              }`}
            >
              {/* Snapshot with Badges */}
              <div className="relative aspect-video bg-black">
                <img
                  src={det.snapshot_url}
                  alt={det.description}
                  className="w-full h-full object-cover"
                />

                {/* Overlaid Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  {getPriorityBadge(det.priority)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/80 backdrop-blur-md text-white border border-slate-800">
                    {det.event_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5">{getReviewBadge(det.review_status)}</div>

                {/* Offset & Confidence */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                  <span className="text-sky-400 font-bold">
                    Offset: {det.timestamp_offset_seconds}s
                  </span>
                  <span className="text-emerald-400">
                    AI Confidence: {Math.round(det.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="text-slate-300 font-bold">{det.id}</span>
                    <span>{new Date(det.incident_time).toLocaleTimeString()}</span>
                  </div>

                  <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{det.camera_name}</h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{det.location_name}</span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 line-clamp-2">{det.description}</p>

                  {/* Observable Indicators Breakdown */}
                  {det.observable_indicators && det.observable_indicators.length > 0 && (
                    <div className="mt-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                        Observable Facts:
                      </span>
                      {det.observable_indicators.slice(0, 2).map((ind, i) => (
                        <div key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{ind}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Status (Complaint or Report) */}
                  {det.complaint_id && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between font-mono">
                      <span>Complaint Lodged:</span>
                      <span className="font-bold text-white">#{det.complaint_id}</span>
                    </div>
                  )}
                  {det.incident_report_id && (
                    <div className="mt-2.5 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 flex items-center justify-between font-mono">
                      <span>Report Escalated:</span>
                      <span className="font-bold text-white">#{det.incident_report_id}</span>
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Watch Incident (-5s buffer) */}
                    <button
                      onClick={() => onWatchIncident(det.camera_id, det.timestamp_offset_seconds)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Play className="w-3 h-3" /> Watch Incident
                    </button>

                    {/* Review Decision */}
                    <button
                      onClick={() => {
                        setReviewingDetection(det);
                        setReviewDecision('verified');
                        setReviewerNotes(det.reviewer_notes || '');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-3 h-3 text-sky-400" /> Review
                    </button>
                  </div>

                  {/* Fork Action Buttons */}
                  {det.category === 'civic_infrastructure' ? (
                    <button
                      onClick={() => handleRouteToCivicComplaint(det)}
                      disabled={!!det.complaint_id}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      {det.complaint_id ? 'Civic Complaint Active' : 'Create Civic Complaint Draft'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setReportingDetection(det);
                        setReportSummary(det.description);
                      }}
                      disabled={!!det.incident_report_id}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {det.incident_report_id ? 'Escalated to Emergency Agency' : 'Generate Incident Report & Escalate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDetections.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          No detections matching active filters.
        </div>
      )}

      {/* Escalated Emergency Incidents Tracking Table */}
      {incidentReports.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                Active Emergency Agency Escalation Feed
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live agency reference tracking and dispatch status updates.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{incidentReports.length} Dispatches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Report ID</th>
                  <th className="py-2.5 px-3">Agency Channel</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Agency Ref</th>
                  <th className="py-2.5 px-3">Dispatch Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {incidentReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-white">{rep.id}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                        {rep.escalation_channel || 'POLICE-112'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{rep.location_text}</td>
                    <td className="py-3 px-3 font-mono text-sky-400 font-semibold">{rep.agency_reference_id}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                          rep.escalation_status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rep.escalation_status === 'unit_en_route'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {rep.escalation_status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {rep.escalation_status !== 'resolved' && (
                        <>
                          {rep.escalation_status === 'dispatched' && (
                            <button
                              onClick={() => handleUpdateEscalationStatus(rep.id, 'unit_en_route')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-semibold"
                            >
                              Unit En Route
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateEscalationStatus(rep.id, 'resolved')}
                            className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[10px] font-semibold"
                          >
                            Mark Resolved
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Human Review Decision Modal */}
      {reviewingDetection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Triage Decision: #{reviewingDetection.id}
                </h3>
              </div>
              <button
                onClick={() => setReviewingDetection(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Ethical Safeguard Notice */}
            <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-xl text-xs text-sky-300 space-y-1">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-sky-400" /> Ethical Safeguarding Notice:
              </span>
              <p className="text-[11px] text-slate-300">
                Base your evaluation strictly on observable physical evidence. Do not profile or speculate on legal guilt. Use "Inconclusive" when footage is ambiguous.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Triage Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setReviewDecision('verified')}
                    className={`py-2 px-3 rounded-xl font-semibold border transition-all text-xs flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'verified'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </button>

                  <button
                    onClick={() => setReviewDecision('inconclusive')}
                    className={`py-2 px-3 rounded-xl font-semibold border transition-all text-xs flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'inconclusive'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Inconclusive
                  </button>

                  <button
                    onClick={() => setReviewDecision('false_positive')}
                    className={`py-2 px-3 rounded-xl font-semibold border transition-all text-xs flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'false_positive'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" /> False Positive
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Reviewer Observations & Notes
                </label>
                <textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Record objective, observable facts (e.g. verified pothole depth, observed physical altercation, or inconclusive due to occluded lens)..."
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReviewingDetection(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                {isSubmittingReview ? 'Saving Decision...' : 'Commit Review Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Formal Incident Report & Emergency Escalation */}
      {reportingDetection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Generate Formal Incident Report & Escalate
                </h3>
              </div>
              <button
                onClick={() => setReportingDetection(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Emergency Dispatch Agency Channel
                </label>
                <select
                  value={escalationAgency}
                  onChange={(e) => setEscalationAgency(e.target.value as EscalationAgency)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="police_112">Police Emergency Dispatch (112 / PCR)</option>
                  <option value="mrrt">Municipal Rapid Response Team (MRRT)</option>
                  <option value="traffic_police">Traffic Control Room & Towing</option>
                  <option value="fire_rescue">Fire & Disaster Rescue Services</option>
                  <option value="women_safety_1091">Women Safety Helpline (1091 Special Cell)</option>
                  <option value="ambulance_108">Emergency Ambulance Services (108)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                  Verifiable Incident Summary
                </label>
                <textarea
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="text-white font-mono">{reportingDetection.location_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exact Timestamp Offset:</span>
                  <span className="text-sky-400 font-mono font-bold">
                    {reportingDetection.timestamp_offset_seconds}s in recording
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reviewing Official:</span>
                  <span className="text-white font-mono">Sarah Vance (Admin)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReportingDetection(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAndEscalateReport}
                disabled={isEscalating}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isEscalating ? 'Transmitting...' : 'Transmit Emergency Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
