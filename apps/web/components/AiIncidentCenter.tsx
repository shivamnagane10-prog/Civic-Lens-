'use client';

import React, { useState, useEffect } from 'react';
import {
  CctvDetection,
  IncidentReport,
  DetectionCategory,
  DetectionReviewStatus,
  EscalationAgency,
  EscalationStatus,
  Camera,
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
  ArrowRight,
  Database,
  Cpu,
  Car,
  Trash2,
  Waves,
  Construction,
  Users,
  Lock,
  Layers,
  ZoomIn,
} from 'lucide-react';

interface AiIncidentCenterProps {
  onWatchIncident: (cameraId: string, seekSeconds: number) => void;
  onWatchLive: (cameraId: string) => void;
  onComplaintCreated?: (issue: any) => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All Incidents', icon: Layers },
  { id: 'traffic_safety', label: 'Traffic & Road Safety', icon: Car },
  { id: 'garbage_waste', label: 'Garbage & Waste', icon: Trash2 },
  { id: 'waterlogging_flood', label: 'Waterlogging & Flood', icon: Waves },
  { id: 'road_damage', label: 'Road Damage', icon: Construction },
  { id: 'assault_violence', label: 'Physical Violence', icon: ShieldAlert },
  { id: 'forced_movement', label: 'Possible Forced Movement', icon: Users },
  { id: 'sexual_violence_sensitive', label: 'Sensitive Safeguarding', icon: Lock },
  { id: 'other_public_safety', label: 'Other Hazards', icon: Activity },
];

function isCivicInfrastructureCategory(category: string, eventType: string): boolean {
  if (['assault_violence', 'forced_movement', 'sexual_violence_sensitive', 'other_public_safety'].includes(category)) {
    return false;
  }
  if (eventType.includes('assault') || eventType.includes('forced') || eventType.includes('collapse') || eventType.includes('sexual')) {
    return false;
  }
  return true;
}

function matchCategory(det: CctvDetection, filter: string): boolean {
  if (filter === 'all') return true;
  const cat = det.category as string;
  const et = det.event_type.toLowerCase();
  if (cat === filter) return true;
  if (filter === 'traffic_safety' && (cat === 'traffic_safety' || et.includes('traffic') || et.includes('vehicle') || et.includes('congestion'))) return true;
  if (filter === 'garbage_waste' && (cat === 'garbage_waste' || cat === 'garbage' || et.includes('garbage') || et.includes('waste'))) return true;
  if (filter === 'waterlogging_flood' && (cat === 'waterlogging_flood' || cat === 'waterlogging' || et.includes('waterlogging') || et.includes('water') || et.includes('drainage'))) return true;
  if (filter === 'road_damage' && (cat === 'road_damage' || cat === 'civic_infrastructure' || et.includes('pothole') || et.includes('damage') || et.includes('crack'))) return true;
  if (filter === 'assault_violence' && (cat === 'assault_violence' || et.includes('assault') || et.includes('violence') || et.includes('altercation'))) return true;
  if (filter === 'forced_movement' && (cat === 'forced_movement' || et.includes('forced') || et.includes('restraint'))) return true;
  if (filter === 'sexual_violence_sensitive' && (cat === 'sexual_violence_sensitive' || det.is_restricted || et.includes('sexual'))) return true;
  if (filter === 'other_public_safety' && (cat === 'other_public_safety' || et.includes('collapse') || et.includes('fall') || et.includes('crowd') || et.includes('harassment'))) return true;
  return false;
}

export function AiIncidentCenter({
  onWatchIncident,
  onWatchLive,
  onComplaintCreated,
}: AiIncidentCenterProps) {
  const [detections, setDetections] = useState<CctvDetection[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [reviewFilter, setReviewFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [cameraFilter, setCameraFilter] = useState<string>('all');
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
      const [dets, reports, cams] = await Promise.all([
        api.getCctvDetections(),
        api.getIncidentReports().catch(() => []),
        api.getCctvCameras().catch(() => []),
      ]);
      setDetections(dets);
      setIncidentReports(reports);
      setCameras(cams);
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
    const matchesCategory = matchCategory(d, categoryFilter);
    const matchesReview = reviewFilter === 'all' || d.review_status === reviewFilter;
    const matchesPriority = priorityFilter === 'all' || d.priority === priorityFilter;
    const matchesCamera = cameraFilter === 'all' || d.camera_id === cameraFilter;
    const matchesSearch =
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.camera_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.observable_indicators && d.observable_indicators.some((ind) => ind.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesReview && matchesPriority && matchesCamera && matchesSearch;
  });

  // Action 1: Submit Human Review (Verified / Inconclusive / False Positive / Escalated / Closed)
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

      setDetections((prev) =>
        prev.map((d) => (d.id === detection.id ? { ...d, review_status: 'verified', complaint_id: res.issue_id } : d))
      );

      if (onComplaintCreated) {
        onComplaintCreated(res);
      }

      setActionBanner(`Created Civic Complaint #${res.issue_id}! Routed to Corporator Portal for budget approval & crew dispatch.`);
      setTimeout(() => setActionBanner(null), 6000);
    } catch (err: any) {
      console.error(err);
      setActionBanner(`Notice: ${err.message || 'Could not route complaint'}`);
      setTimeout(() => setActionBanner(null), 6000);
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
        reviewer_notes: `Incident verified by Authorized Operator. Transmitted to ${escalationAgency.toUpperCase()} emergency channel.`,
      });

      setIncidentReports((prev) => [rep, ...prev]);
      setDetections((prev) =>
        prev.map((d) => (d.id === reportingDetection.id ? { ...d, review_status: 'verified', incident_report_id: rep.id } : d))
      );

      setActionBanner(`Formal Incident Report #${rep.id} created & transmitted to ${escalationAgency.toUpperCase()}! Agency Ref: ${rep.agency_reference_id}`);
      setTimeout(() => setActionBanner(null), 6000);
      setReportingDetection(null);
      setReportSummary('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsEscalating(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/40 text-slate-400 border border-slate-700">
            LOW
          </span>
        );
    }
  };

  const getReviewBadge = (st: string) => {
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
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Send className="w-3 h-3" /> Escalated
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <Check className="w-3 h-3" /> Closed
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
              Multi-Category AI Incident Center & Verification Queue
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/80">
                EVIDENCE-BASED REVIEW
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Centralized review queue for traffic events, waste management, waterlogging, road defects, and public-safety interactions.
            Municipal issues route into civic complaints; sensitive and physical-safety incidents route into formal emergency escalations.
          </p>
        </div>

        {/* Quick Triage Tallies */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">TOTAL EVENTS</span>
            <span className="text-white font-bold">{detections.length}</span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">PENDING</span>
            <span className="text-sky-400 font-bold">
              {detections.filter((d) => d.review_status === 'pending_review').length}
            </span>
          </div>
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">VERIFIED</span>
            <span className="text-emerald-400 font-bold">
              {detections.filter((d) => d.review_status === 'verified').length}
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
          <Radio className="w-4 h-4 text-sky-400 animate-pulse flex-shrink-0" />
          <span className="font-medium">{actionBanner}</span>
        </div>
      )}

      {/* Filter and Category Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        {/* Row 1: Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_TABS.map((tab) => {
            const IconComp = tab.icon;
            const count =
              tab.id === 'all'
                ? detections.length
                : detections.filter((d) => matchCategory(d, tab.id)).length;
            const isSelected = categoryFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/20 font-bold'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Secondary Filters (Camera, Review, Priority, Search) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Camera Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Camera:</span>
              <select
                value={cameraFilter}
                onChange={(e) => setCameraFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none"
              >
                <option value="all">All Cameras ({cameras.length})</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.location_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Review Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Status:</span>
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="inconclusive">Inconclusive</option>
                <option value="false_positive">False Positive</option>
                <option value="escalated">Escalated</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-800 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facts, camera, or description..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Detections Triage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDetections.map((det) => {
          const isCivic = isCivicInfrastructureCategory(det.category, det.event_type);

          return (
            <div
              key={det.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all hover:shadow-2xl ${
                !isCivic ? 'border-slate-800 hover:border-rose-500/50' : 'border-slate-800 hover:border-sky-500/50'
              }`}
            >
              {/* Snapshot with Badges */}
              <div className="relative aspect-video bg-black overflow-hidden group">
                <img
                  src={det.snapshot_url}
                  alt={det.description}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Overlaid Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                  {getPriorityBadge(det.priority)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/80 backdrop-blur-md text-white border border-slate-800">
                    {det.event_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {det.is_restricted && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-pink-950/80 text-pink-300 border border-pink-700/50 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> RESTRICTED
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5">{getReviewBadge(det.review_status)}</div>

                {/* Offset & Model Info Footer on snapshot */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                  <span className="text-sky-400 font-bold">
                    T+{det.timestamp_offset_seconds}s
                  </span>
                  <span className="text-indigo-300 truncate max-w-[150px]">
                    {det.model_name || 'v2.2'}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round(det.confidence * 100)}% Conf
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
                        Verifiable Observable Indicators:
                      </span>
                      {det.observable_indicators.slice(0, 3).map((ind, i) => (
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
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {/* Watch Incident (-5s buffer) */}
                    <button
                      onClick={() => onWatchIncident(det.camera_id, det.timestamp_offset_seconds)}
                      className="px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                      title="Seek to exact incident offset"
                    >
                      <Play className="w-3 h-3" /> Watch
                    </button>

                    {/* View Full Recording */}
                    <button
                      onClick={() => onWatchIncident(det.camera_id, 0)}
                      className="px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                      title="Open full video archive"
                    >
                      <FileText className="w-3 h-3 text-indigo-400" /> Full Video
                    </button>

                    {/* Review Evidence */}
                    <button
                      onClick={() => {
                        setReviewingDetection(det);
                        setReviewDecision('verified');
                        setReviewerNotes(det.reviewer_notes || '');
                      }}
                      className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <UserCheck className="w-3 h-3 text-emerald-400" /> Triage
                    </button>
                  </div>

                  {/* Fork Action Buttons: Complaint vs Formal Incident Report */}
                  {isCivic ? (
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
                      {det.incident_report_id ? 'Formal Report Dispatched' : 'Generate Formal Incident Report'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDetections.length === 0 && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-xl space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-bold text-white text-sm">No incidents match current filter criteria</p>
          <p className="text-slate-500">Try adjusting the category tab, camera dropdown, or clearing search keywords.</p>
        </div>
      )}

      {/* ========================================== */}
      {/* Human Review Modal (Triage & Audit Log) */}
      {/* ========================================== */}
      {reviewingDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Evidence Verification & Human Review: #{reviewingDetection.id}
                </h3>
              </div>
              <button
                onClick={() => setReviewingDetection(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Snapshot Preview */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <img
                src={reviewingDetection.snapshot_url}
                alt="Evidence"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-slate-950/90 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800">
                Model: {reviewingDetection.model_name || 'CivicLens-v2.2'} • Conf: {Math.round(reviewingDetection.confidence * 100)}%
              </div>
            </div>

            {/* Observable Indicators Review */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Observed Facts from Video:</label>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                {reviewingDetection.observable_indicators?.map((ind, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px]">
                    <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Decision Radios */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Reviewer Decision:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(['verified', 'inconclusive', 'false_positive', 'closed'] as const).map((dec) => (
                  <button
                    key={dec}
                    type="button"
                    onClick={() => setReviewDecision(dec)}
                    className={`py-2 px-2 rounded-xl border text-center font-semibold transition-all ${
                      reviewDecision === dec
                        ? dec === 'verified'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : dec === 'inconclusive'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {dec.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Reviewer Justification & Audit Notes:</label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Detail optical findings, temporal checks, and justification for review classification..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReviewingDetection(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/30"
              >
                {isSubmittingReview ? 'Submitting...' : 'Save Review Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Formal Incident Report / Escalation Modal */}
      {/* ========================================== */}
      {reportingDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Generate Formal Incident Report & Dispatch: #{reportingDetection.id}
                </h3>
              </div>
              <button
                onClick={() => setReportingDetection(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Target Channel Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Emergency Escalation Channel:</label>
              <select
                value={escalationAgency}
                onChange={(e) => setEscalationAgency(e.target.value as EscalationAgency)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="police_112">🚓 Police Control Room (Dial 112 / PCR)</option>
                <option value="mrrt">🛡️ Municipal Rapid Response Team (MRRT)</option>
                <option value="traffic_police">🚦 Traffic Management Beat Unit</option>
                <option value="women_safety_1091">🚨 Women Safety Helpline 1091 (Specialized Cell)</option>
                <option value="ambulance_108">🚑 Emergency Medical Ambulance (108)</option>
                <option value="fire_rescue">🚒 Fire & Emergency Services</option>
              </select>
            </div>

            {/* Incident Summary */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Verifiable Incident Summary:</label>
              <textarea
                value={reportSummary}
                onChange={(e) => setReportSummary(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="text-white font-mono">{reportingDetection.location_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Offset:</span>
                <span className="text-sky-400 font-mono">T+{reportingDetection.timestamp_offset_seconds}s</span>
              </div>
              <div className="flex justify-between">
                <span>Reviewer Accountability:</span>
                <span className="text-emerald-400 font-mono">Director Sarah Vance (ID: USER-ADMIN)</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setReportingDetection(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateAndEscalateReport}
                disabled={isEscalating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isEscalating ? 'Dispatching...' : 'Dispatch & Escalate Agency'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
