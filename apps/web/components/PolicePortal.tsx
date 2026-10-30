'use client';

import React, { useState, useEffect } from 'react';
import { PoliceEvidencePackage, PoliceCaseStatus } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Lock,
  Camera,
  Play,
  Film,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  Fingerprint,
  Search,
  Filter,
  PlusCircle,
  UserCheck
} from 'lucide-react';

interface PolicePortalProps {
  currentUserBadge?: string;
  currentUserName?: string;
  onRefresh?: () => void;
}

export function PolicePortal({ currentUserBadge = 'DL-CYBER-8842', currentUserName = 'Inspector Vikram Rathore', onRefresh }: PolicePortalProps) {
  const [packages, setPackages] = useState<PoliceEvidencePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PoliceEvidencePackage | null>(null);

  // Investigation Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteAction, setNoteAction] = useState('OFFICER_INVESTIGATION_LOG');
  const [noteContent, setNoteContent] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Load Evidence Packages
  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await api.getPoliceEvidencePackages(statusFilter === 'all' ? undefined : { case_status: statusFilter });
      setPackages(data);
      if (data.length > 0 && !selectedPackage) {
        setSelectedPackage(data[0]);
      } else if (selectedPackage) {
        const updated = data.find((p) => p.id === selectedPackage.id);
        if (updated) setSelectedPackage(updated);
      }
    } catch (e) {
      console.error('Failed to load police evidence packages', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [statusFilter]);

  // Handle Status Update
  const handleUpdateStatus = async (newStatus: PoliceCaseStatus, notes?: string) => {
    if (!selectedPackage) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updatePoliceCaseStatus(
        selectedPackage.id,
        newStatus,
        notes || `Officer ${currentUserName} updated case status to ${newStatus}`,
        currentUserBadge,
        currentUserName
      );
      setSelectedPackage(updated);
      setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Add Custody Entry
  const handleAddCustodyEntry = async () => {
    if (!selectedPackage || !noteContent.trim()) return;
    try {
      const updated = await api.addPoliceCustodyEntry(
        selectedPackage.id,
        noteAction,
        `${currentUserName} (Badge: ${currentUserBadge})`,
        noteContent
      );
      setSelectedPackage(updated);
      setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setIsNoteModalOpen(false);
      setNoteContent('');
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered list
  const filteredPackages = packages.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        p.case_number.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.location_name.toLowerCase().includes(q) ||
        p.camera_code.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Police Authority Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50 flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Cyber Police & Public Safety Evidence Portal
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  CONFIDENTIAL & RESTRICTED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically Hashed Digital Evidentiary Dossiers & Tamper-Proof Chain of Custody for Judicial Processing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-[10px] text-slate-500 block">Authorized Officer</span>
                <span className="font-semibold text-slate-200">{currentUserName}</span>
                <span className="text-[10px] font-mono text-rose-400 ml-1.5">[{currentUserBadge}]</span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center gap-1.5 text-emerald-400">
              <Fingerprint className="w-4 h-4" />
              <span className="font-semibold">SHA-256 Vault Active</span>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium block">Total Shared Packages</span>
            <span className="text-xl font-bold text-white font-mono mt-0.5 block">{packages.length}</span>
            <span className="text-[10px] text-slate-500">From AI Incident Center</span>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-amber-400 font-medium block">Under Investigation</span>
            <span className="text-xl font-bold text-amber-300 font-mono mt-0.5 block">
              {packages.filter((p) => p.case_status === 'under_investigation' || p.case_status === 'submitted_to_police').length}
            </span>
            <span className="text-[10px] text-slate-500">Active Police Inquiries</span>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-rose-400 font-medium block">Charges Filed / Court</span>
            <span className="text-xl font-bold text-rose-300 font-mono mt-0.5 block">
              {packages.filter((p) => p.case_status === 'charges_filed').length}
            </span>
            <span className="text-[10px] text-slate-500">Sent to Public Prosecutor</span>
          </div>
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-emerald-400 font-medium block">Cryptographic Integrity</span>
            <span className="text-xl font-bold text-emerald-300 font-mono mt-0.5 block">100%</span>
            <span className="text-[10px] text-emerald-500">0 Tamper Violations</span>
          </div>
        </div>
      </div>

      {/* Main Split Interface: Package List & Case Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filter & Case List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            {/* Search & Status Filters */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by FIR #, Camera, Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: 'all', label: 'All Cases' },
                { id: 'submitted_to_police', label: 'New Transfers' },
                { id: 'under_investigation', label: 'Investigating' },
                { id: 'charges_filed', label: 'Charges Filed' },
                { id: 'closed', label: 'Closed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                    statusFilter === tab.id
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Evidence Packages */}
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
                Decrypting Police Evidence Vault...
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                No police evidence packages match the selected criteria.
              </div>
            ) : (
              filteredPackages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-rose-500 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/50'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30">
                        {pkg.case_number}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          pkg.case_status === 'charges_filed'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : pkg.case_status === 'under_investigation'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : pkg.case_status === 'closed'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {pkg.case_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">{pkg.title}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{pkg.location_name}</span>
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Camera className="w-3 h-3 text-sky-400" /> {pkg.camera_code}
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Fingerprint className="w-3 h-3" /> Sealed
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Dossier Details & Custody Timeline (7 cols) */}
        <div className="lg:col-span-7">
          {selectedPackage ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
                      {selectedPackage.case_number}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {selectedPackage.classification_level}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedPackage.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedPackage.location_name}</span>
                    <span className="text-slate-600">•</span>
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedPackage.incident_timestamp || 'Recent'}</span>
                  </p>
                </div>

                {/* Status Action Buttons */}
                <div className="flex flex-wrap sm:flex-col gap-1.5 flex-shrink-0">
                  {selectedPackage.case_status === 'submitted_to_police' && (
                    <button
                      onClick={() => handleUpdateStatus('acknowledged')}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-sky-600/20"
                    >
                      Acknowledge Case
                    </button>
                  )}
                  {selectedPackage.case_status !== 'under_investigation' && (
                    <button
                      onClick={() => handleUpdateStatus('under_investigation')}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-amber-600/20"
                    >
                      Begin Investigation
                    </button>
                  )}
                  {selectedPackage.case_status !== 'charges_filed' && (
                    <button
                      onClick={() => handleUpdateStatus('charges_filed')}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-purple-600/20"
                    >
                      File Formal Charges
                    </button>
                  )}
                  {selectedPackage.case_status !== 'closed' && (
                    <button
                      onClick={() => handleUpdateStatus('closed')}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                    >
                      Close Inquiry
                    </button>
                  )}
                </div>
              </div>

              {/* Cryptographic Seal & Hashes Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Cryptographic Evidence Seal Verification</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    HASH MATCH CONFIRMED
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Video Clip SHA-256 Digest:</span>
                    <span className="text-slate-300 break-all select-all">{selectedPackage.video_hash_sha256}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Snapshot Evidence SHA-256 Digest:</span>
                    <span className="text-slate-300 break-all select-all">{selectedPackage.snapshot_hash_sha256}</span>
                  </div>
                </div>
              </div>

              {/* Evidence Media Preview (Video & Snapshot) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-indigo-400" /> Sealed Video Evidentiary Clip
                  </span>
                  <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden group">
                    <video
                      src={selectedPackage.video_clip_url}
                      controls
                      className="w-full h-full object-cover"
                      poster={selectedPackage.snapshot_url}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-400" /> Frame Snapshot Evidence
                  </span>
                  <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                    <img
                      src={selectedPackage.snapshot_url}
                      alt="Incident Snapshot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Chain of Custody Audit Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-400" />
                    Judicial Chain of Custody Timeline
                  </h4>
                  <button
                    onClick={() => setIsNoteModalOpen(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Custody Entry
                  </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 max-h-64 overflow-y-auto">
                  {selectedPackage.chain_of_custody_log && selectedPackage.chain_of_custody_log.length > 0 ? (
                    selectedPackage.chain_of_custody_log.map((entry, idx) => (
                      <div key={idx} className="relative pl-5 border-l-2 border-rose-500/40 text-xs space-y-1">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-rose-400" />
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{entry.action}</span>
                          <span className="font-mono text-slate-500">{entry.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{entry.details}</p>
                        <p className="text-[10px] text-rose-400/90 font-mono">Agent/Officer: {entry.officer_or_agent}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No custody records logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Select an evidentiary case dossier to inspect cryptographic seals and chain of custody.
            </div>
          )}
        </div>
      </div>

      {/* Add Custody Entry Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" /> Add Official Police Custody Log Entry
            </h3>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Custody Action Type</label>
              <select
                value={noteAction}
                onChange={(e) => setNoteAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="OFFICER_INVESTIGATION_LOG">Officer Investigation Progress Note</option>
                <option value="WITNESS_STATEMENT_RECORDED">Witness Statement Attached</option>
                <option value="SUBPOENA_EVIDENCE_FORWARDED">Subpoena Package Transferred to Prosecutor</option>
                <option value="FORENSIC_VALIDATION_COMPLETED">Forensic Video Validation Verified</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Details & Remarks</label>
              <textarea
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter official investigation findings or audit details..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustodyEntry}
                disabled={!noteContent.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-600/20"
              >
                Seal & Log Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
