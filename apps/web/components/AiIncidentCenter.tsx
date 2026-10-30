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

const QUEUE_TABS = [
  { id: 'all', label: 'All Review Queues', icon: Layers, code: 'CENTRAL' },
  { id: 'road_maintenance', label: 'Road Maintenance', icon: Construction, code: 'ROAD-01' },
  { id: 'waste_management', label: 'Waste Management', icon: Trash2, code: 'WASTE-02' },
  { id: 'electrical_maintenance', label: 'Streetlight Ops', icon: Activity, code: 'ELEC-03' },
  { id: 'drainage_management', label: 'Drainage & Floods', icon: Waves, code: 'DRAIN-04' },
  { id: 'traffic_management', label: 'Traffic Operations', icon: Car, code: 'TRAFFIC-05' },
  { id: 'public_safety_review', label: 'Restricted Public Safety', icon: ShieldAlert, code: 'SAFETY-06' },
  { id: 'sensitive_safeguarding', label: 'Sensitive Safeguarding', icon: Lock, code: 'SAFEGUARD-07' },
  { id: 'police_submission_tracking', label: 'Police Submission Tracking', icon: Shield, code: 'POLICE-08' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All Incidents', icon: Layers },
  { id: 'road_damage', label: 'Damaged Roads & Potholes', icon: Construction },
  { id: 'garbage_waste', label: 'Garbage & Waste', icon: Trash2 },
  { id: 'streetlight', label: 'Broken Streetlights', icon: Activity },
  { id: 'waterlogging_flood', label: 'Waterlogging & Flood', icon: Waves },
  { id: 'traffic_safety', label: 'Traffic & Transit', icon: Car },
  { id: 'assault_violence', label: 'Physical Assault', icon: ShieldAlert },
  { id: 'sexual_violence_sensitive', label: 'Sensitive Safeguarding', icon: Lock },
  { id: 'forced_movement', label: 'Possible Forced Movement', icon: Users },
  { id: 'drug_activity', label: 'Suspected Narcotics', icon: Shield },
  { id: 'other_public_safety', label: 'Other Hazards', icon: Activity },
];

function isCivicInfrastructureCategory(category: string, eventType: string): boolean {
  if (['assault_violence', 'forced_movement', 'sexual_violence_sensitive', 'drug_activity', 'other_public_safety'].includes(category)) {
    return false;
  }
  if (eventType.includes('assault') || eventType.includes('forced') || eventType.includes('collapse') || eventType.includes('sexual') || eventType.includes('drug') || eventType.includes('kidnap')) {
    return false;
  }
  return true;
}

function matchQueue(det: CctvDetection, queueId: string): boolean {
  if (queueId === 'all') return true;
  if (det.review_queue === queueId) return true;
  const cat = (det.category || '').toLowerCase();
  const et = (det.event_type || '').toLowerCase();
  if (queueId === 'road_maintenance') return cat.includes('road') || cat.includes('pothole') || et.includes('pothole') || et.includes('crack') || et.includes('road');
  if (queueId === 'waste_management') return cat.includes('garbage') || cat.includes('waste') || et.includes('garbage') || et.includes('waste');
  if (queueId === 'electrical_maintenance') return cat.includes('light') || cat.includes('street') || et.includes('light') || et.includes('lamp');
  if (queueId === 'drainage_management') return cat.includes('water') || cat.includes('flood') || cat.includes('drain') || et.includes('water');
  if (queueId === 'traffic_management') return cat.includes('traffic') || et.includes('traffic') || et.includes('vehicle') || et.includes('congestion');
  if (queueId === 'public_safety_review') return cat.includes('assault') || cat.includes('forced') || cat.includes('kidnap') || cat.includes('drug') || cat.includes('other_public');
  if (queueId === 'sensitive_safeguarding') return cat.includes('sexual') || cat.includes('harass') || !!det.is_restricted;
  if (queueId === 'police_submission_tracking') return det.review_status === 'escalated' || !!det.incident_report_id;
  return false;
}

function matchCategory(det: CctvDetection, filter: string): boolean {
  if (filter === 'all') return true;
  const cat = (det.category || '').toLowerCase();
  const et = (det.event_type || '').toLowerCase();
  if (cat === filter) return true;
  if (filter === 'road_damage' && (cat.includes('road') || cat.includes('pothole') || et.includes('pothole') || et.includes('damage') || et.includes('crack'))) return true;
  if (filter === 'garbage_waste' && (cat.includes('garbage') || cat.includes('waste') || et.includes('garbage') || et.includes('waste'))) return true;
  if (filter === 'streetlight' && (cat.includes('light') || cat.includes('street') || et.includes('light') || et.includes('lamp'))) return true;
  if (filter === 'waterlogging_flood' && (cat.includes('water') || cat.includes('flood') || et.includes('water') || et.includes('drain'))) return true;
  if (filter === 'traffic_safety' && (cat.includes('traffic') || et.includes('traffic') || et.includes('vehicle') || et.includes('congestion'))) return true;
  if (filter === 'assault_violence' && (cat.includes('assault') || et.includes('assault') || et.includes('violence') || et.includes('altercation'))) return true;
  if (filter === 'sexual_violence_sensitive' && (cat.includes('sexual') || et.includes('sexual') || det.is_restricted)) return true;
  if (filter === 'forced_movement' && (cat.includes('forced') || cat.includes('kidnap') || et.includes('forced') || et.includes('restraint'))) return true;
  if (filter === 'drug_activity' && (cat.includes('drug') || et.includes('drug') || et.includes('narcotic'))) return true;
  if (filter === 'other_public_safety' && (cat.includes('other') || et.includes('collapse') || et.includes('fall') || et.includes('crowd') || et.includes('harassment'))) return true;
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
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
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
    const matchesQueue = matchQueue(d, selectedQueue);
    const matchesCategory = matchCategory(d, categoryFilter);
    const matchesReview = reviewFilter === 'all' || d.review_status === reviewFilter;
    const matchesPriority = priorityFilter === 'all' || d.priority === priorityFilter;
    const matchesCamera = cameraFilter === 'all' || d.camera_id === cameraFilter;
    const matchesSearch =
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.camera_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.assigned_department && d.assigned_department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.workflow_type && d.workflow_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.observable_indicators && d.observable_indicators.some((ind) => ind.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesQueue && matchesCategory && matchesReview && matchesPriority && matchesCamera && matchesSearch;
  });

  // Action: Deploy Traffic Patrol (handled via Traffic Operations Center)
  const handleDeployTrafficPatrol = (detection: CctvDetection) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === detection.id ? { ...d, review_status: 'verified', current_status: 'patrol_dispatched' } : d))
    );
    setActionBanner(`Traffic Operations Center: Patrol unit deployed to ${detection.camera_name}! Signal timings recalibrated. (Traffic events do not create municipal road repair complaints).`);
    setTimeout(() => setActionBanner(null), 6000);
  };

  const getCategoryAction = (det: CctvDetection) => {
    const cat = (det.category || '').toLowerCase();
    const et = (det.event_type || '').toLowerCase();
    const queue = det.review_queue || '';

    if (queue === 'traffic_management' || cat.includes('traffic') || et.includes('traffic') || et.includes('congestion')) {
      return {
        type: 'traffic_patrol',
        label: 'Deploy Traffic Patrol (PCR/Transit QRP)',
        desc: 'Handled in Traffic Operations Center; notifies Traffic Police without creating road repair complaints',
        color: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/20 text-white',
        icon: Car
      };
    }

    if (queue === 'electrical_maintenance' || cat.includes('light') || et.includes('light')) {
      return {
        type: 'complaint_draft',
        label: 'Verify Lux & Dispatch Electrical Crew',
        desc: 'Routes to Municipal Electrical Division for daylight & lux compliance check',
        color: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-yellow-600/20 text-white',
        icon: Activity
      };
    }

    if (queue === 'waste_management' || cat.includes('garbage') || cat.includes('waste') || et.includes('waste')) {
      return {
        type: 'complaint_draft',
        label: 'Dispatch Sanitation & Waste Team',
        desc: 'Routes to Solid Waste & Sanitation Division for clearance receipt verification',
        color: 'from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/20 text-white',
        icon: Trash2
      };
    }

    if (queue === 'drainage_management' || cat.includes('water') || cat.includes('flood') || et.includes('water') || et.includes('drain')) {
      return {
        type: 'complaint_draft',
        label: 'Immediate Flood Clearance / Drainage Crew',
        desc: 'Routes to Stormwater Drainage Authority with emergency pump option',
        color: 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/20 text-white',
        icon: Waves
      };
    }

    if (queue === 'road_maintenance' || cat.includes('road') || cat.includes('pothole') || et.includes('pothole')) {
      return {
        type: 'complaint_draft',
        label: 'Route to Corporator & Road Crew',
        desc: 'Routes to Road Pavement Division for budget approval and IRC inspection verification',
        color: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20 text-white',
        icon: Truck
      };
    }

    if (queue === 'sensitive_safeguarding' || cat.includes('sexual') || det.is_restricted) {
      return {
        type: 'sensitive_safeguarding',
        label: 'Restricted Safeguarding Escalation (SPUWAC 1091)',
        desc: 'Restricted review strictly for Authorized Safeguarding Officers',
        color: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-600/20 text-white',
        icon: Lock
      };
    }

    if (cat.includes('drug') || et.includes('drug')) {
      return {
        type: 'drug_intelligence',
        label: 'Log Confidential Crime Intelligence Dossier',
        desc: 'Transfers neutral observation evidence to Anti-Narcotics Task Force',
        color: 'from-rose-700 to-red-700 hover:from-rose-600 hover:to-red-600 shadow-rose-700/20 text-white',
        icon: ShieldAlert
      };
    }

    if (cat.includes('forced') || et.includes('forced') || et.includes('kidnap')) {
      return {
        type: 'urgent_intercept',
        label: 'Escalate to Police Flying Squad / Quick Response',
        desc: 'Urgent trajectory tracking dispatch for immediate subject interception',
        color: 'from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-red-600/20 text-white',
        icon: ShieldAlert
      };
    }

    return {
      type: 'police_report',
      label: 'Prepare Cryptographic Dossier & Escalate to Police PCR 112',
      desc: 'Formal chain-of-custody sealed incident transmittal',
      color: 'from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20 text-white',
      icon: ShieldAlert
    };
  };

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

      // If escalated to police or women safety channel, create formal cryptographically sealed PoliceEvidencePackage
      if (escalationAgency === 'police_112' || escalationAgency === 'women_safety_1091' || escalationAgency === 'traffic_police') {
        try {
          await api.createPoliceEvidencePackage({
            incident_report_id: rep.id,
            detection_id: reportingDetection.id,
            title: reportSummary || reportingDetection.description,
            category: reportingDetection.category,
            location_name: reportingDetection.location_name,
            latitude: 28.6139,
            longitude: 77.2090,
            camera_code: reportingDetection.camera_name,
            video_clip_url: reportingDetection.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            snapshot_url: reportingDetection.snapshot_url,
            reviewer_name: 'AI Incident Command Triage Officer',
            reviewer_notes: `Transferred via formal emergency escalation to ${escalationAgency}. Chain-of-custody recorded.`,
            classification_level: reportingDetection.priority === 'critical' ? 'Urgent Judicial Evidence' : 'Restricted',
            assigned_police_dept: escalationAgency === 'women_safety_1091' ? 'Special Police Unit for Women & Children (SPUWAC)' : 'Cyber Crime & Video Surveillance Division'
          });
        } catch (pkgErr) {
          console.warn('Could not auto-create police evidence package', pkgErr);
        }
      }

      setIncidentReports((prev) => [rep, ...prev]);
      setDetections((prev) =>
        prev.map((d) => (d.id === reportingDetection.id ? { ...d, review_status: 'verified', incident_report_id: rep.id } : d))
      );

      setActionBanner(`Formal Incident Report #${rep.id} sealed & transmitted to ${escalationAgency.toUpperCase()}! Dispatched to Cyber Police Evidence Vault.`);
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
        {/* Row 0: Dedicated Review Queues (8 Independent Workflows) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" /> Independent Review Queues &amp; Workflows:
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Active: {selectedQueue === 'all' ? 'All Queues (Universal Operations)' : selectedQueue.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {QUEUE_TABS.map((q) => {
              const IconComp = q.icon;
              const count =
                q.id === 'all'
                  ? detections.length
                  : detections.filter((d) => matchQueue(d, q.id)).length;
              const isSelected = selectedQueue === q.id;

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedQueue(q.id);
                    if (q.id === 'road_maintenance') setCategoryFilter('road_damage');
                    else if (q.id === 'waste_management') setCategoryFilter('garbage_waste');
                    else if (q.id === 'electrical_maintenance') setCategoryFilter('streetlight');
                    else if (q.id === 'drainage_management') setCategoryFilter('waterlogging_flood');
                    else if (q.id === 'traffic_management') setCategoryFilter('traffic_safety');
                    else if (q.id === 'public_safety_review') setCategoryFilter('assault_violence');
                    else if (q.id === 'sensitive_safeguarding') setCategoryFilter('sexual_violence_sensitive');
                    else setCategoryFilter('all');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 whitespace-nowrap border ${
                    isSelected
                      ? 'bg-gradient-to-r from-rose-600 via-indigo-600 to-sky-600 text-white border-sky-400/50 shadow-lg shadow-sky-600/20 font-bold'
                      : 'bg-slate-950/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{q.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/40 text-white' : 'bg-slate-900 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 1: Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 pt-1 border-t border-slate-800/60">
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

                  {/* Category-Specific Workflow & Department Routing Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Workflow Engine:</span>
                      <span className="text-sky-300 font-bold px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/60">
                        {det.workflow_type || 'road_maintenance'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Assigned Dept:</span>
                      <span className="text-slate-200 truncate max-w-[170px]" title={det.assigned_department || 'Municipal Division'}>
                        {det.assigned_department || 'Municipal Division'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Assigned Team:</span>
                      <span className="text-emerald-300 font-bold truncate max-w-[170px]">
                        {det.assigned_user_or_team || 'Field Crew'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Target SLA:</span>
                      <span className="text-amber-300 font-bold">
                        {det.sla_hours || 48} Hours
                      </span>
                    </div>
                    {det.evidence_required && det.evidence_required.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-800/80">
                        <span className="text-[9px] text-slate-500 uppercase block mb-1">Workflow Evidence Required:</span>
                        <div className="flex flex-wrap gap-1">
                          {det.evidence_required.map((ev, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-[9px] text-slate-300">
                              ✓ {ev.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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

                  {/* Category-Specific Workflow Action Button */}
                  {(() => {
                    const action = getCategoryAction(det);
                    const ActionIcon = action.icon;

                    if (action.type === 'traffic_patrol') {
                      return (
                        <button
                          onClick={() => handleDeployTrafficPatrol(det)}
                          disabled={det.current_status === 'patrol_dispatched'}
                          className={`w-full py-2 rounded-xl bg-gradient-to-r ${action.color} text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50`}
                          title={action.desc}
                        >
                          <ActionIcon className="w-3.5 h-3.5" />
                          {det.current_status === 'patrol_dispatched' ? 'Traffic Patrol Deployed' : action.label}
                        </button>
                      );
                    }

                    if (action.type === 'complaint_draft') {
                      return (
                        <button
                          onClick={() => handleRouteToCivicComplaint(det)}
                          disabled={!!det.complaint_id}
                          className={`w-full py-2 rounded-xl bg-gradient-to-r ${action.color} text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50`}
                          title={action.desc}
                        >
                          <ActionIcon className="w-3.5 h-3.5" />
                          {det.complaint_id ? 'Civic Complaint Active' : action.label}
                        </button>
                      );
                    }

                    return (
                      <button
                        onClick={() => {
                          setReportingDetection(det);
                          setReportSummary(det.description);
                          if (action.type === 'sensitive_safeguarding') {
                            setEscalationAgency('women_safety_1091');
                          } else {
                            setEscalationAgency('police_112');
                          }
                        }}
                        disabled={!!det.incident_report_id}
                        className={`w-full py-2 rounded-xl bg-gradient-to-r ${action.color} text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50`}
                        title={action.desc}
                      >
                        <ActionIcon className="w-3.5 h-3.5" />
                        {det.incident_report_id ? 'Formal Incident Sealed' : action.label}
                      </button>
                    );
                  })()}
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
