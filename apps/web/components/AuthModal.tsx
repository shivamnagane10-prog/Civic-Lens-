'use client';

import React, { useState } from 'react';
import { UserRole, TokenResponse } from '@civiclens/shared-types';
import { api } from '../lib/api/client';
import {
  Shield,
  Smartphone,
  Mail,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Landmark,
  Wrench,
  ShieldAlert,
  HardHat,
  KeyRound,
  Fingerprint
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (tokenData: TokenResponse) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'citizen' | 'staff'>('citizen');
  const [citizenMethod, setCitizenMethod] = useState<'otp' | 'google'>('otp');

  // Citizen OTP State
  const [phone, setPhone] = useState('+919876543215');
  const [otp, setOtp] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Citizen Google State
  const [googleEmail, setGoogleEmail] = useState('aarav.mehta@gmail.com');
  const [googleName, setGoogleName] = useState('Aarav Mehta');

  // Staff State
  const [staffRole, setStaffRole] = useState<UserRole>('corporator');
  const [staffEmail, setStaffEmail] = useState('corporator@civiclens.gov.in');
  const [staffPassword, setStaffPassword] = useState('staff123');
  const [policeBadge, setPoliceBadge] = useState('DL-CYBER-8842');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle OTP Request
  const handleRequestOtp = async () => {
    setErrorMsg(null);
    setOtpLoading(true);
    try {
      await api.requestOtp(phone);
      setOtpSent(true);
      setOtp('123456');
      setSuccessMsg('SMS OTP dispatched (Use demo OTP: 123456)');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp, 'citizen');
      setSuccessMsg('Citizen authenticated successfully!');
      setTimeout(() => {
        onAuthSuccess(res);
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.googleAuthVerify({
        email: googleEmail,
        name: googleName,
        google_id: `g-${Date.now()}`
      });
      setSuccessMsg(`Google identity verified: ${googleEmail}`);
      setTimeout(() => {
        onAuthSuccess(res);
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Official Login
  const handleStaffLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.officialLogin(staffEmail, staffRole, {
        identifier: staffEmail,
        password: staffPassword,
        police_badge_id: staffRole === 'police' ? policeBadge : undefined,
      });
      setSuccessMsg(`Staff logged in as ${res.role.toUpperCase()}: ${res.name || staffEmail}`);
      setTimeout(() => {
        onAuthSuccess(res);
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Staff authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Account Presets
  const setDemoProfile = (role: UserRole, email: string, name: string, badge?: string) => {
    setAuthMode('staff');
    setStaffRole(role);
    setStaffEmail(email);
    setStaffPassword('staff123');
    if (badge) setPoliceBadge(badge);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500/30 to-indigo-600/30 border border-sky-500/40 p-1 flex items-center justify-center shadow-lg shadow-sky-950/50">
              <img src="/assets/civiclens-ai-logo.png" alt="CivicLens AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                CivicLens AI Authentication
              </h2>
              <p className="text-xs text-slate-400">Role-Based Access Control & Identity Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Primary Role Selector Tabs: Citizen vs Staff */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => {
              setAuthMode('citizen');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              authMode === 'citizen'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Citizen Access
          </button>
          <button
            onClick={() => {
              setAuthMode('staff');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              authMode === 'staff'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Authorized Staff
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: CITIZEN ACCESS */}
        {authMode === 'citizen' && (
          <div className="space-y-5">
            {/* Citizen Auth Method Switcher */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setCitizenMethod('otp')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  citizenMethod === 'otp'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                📱 Mobile OTP Verification
              </button>
              <button
                onClick={() => setCitizenMethod('google')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  citizenMethod === 'google'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                🇬 Google OAuth Login
              </button>
            </div>

            {citizenMethod === 'otp' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Mobile Phone Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={handleRequestOtp}
                      disabled={otpLoading}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                    >
                      {otpLoading ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">Enter 6-Digit Verification Code</label>
                      <span className="text-[11px] text-emerald-400 font-mono">Demo OTP: 123456</span>
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest font-mono text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || !otpSent}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    otpSent
                      ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Verifying Credentials...' : 'Verify OTP & Enter Citizen Portal'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Google Account Email</label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">Citizen Display Name</label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-white/10 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {loading ? 'Authenticating with Google...' : 'Continue with Google Account'}
                </button>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Citizen Access Permissions:</span>
              <p>• Access Citizen Portal (Submit issues, AI Diagnostics, BOM)</p>
              <p>• Access Public Ward Performance and Metrics</p>
              <p>• Restricted Recorded Footage (Public safety cameras & own issues only)</p>
            </div>
          </div>
        )}

        {/* TAB 2: AUTHORIZED STAFF ACCESS */}
        {authMode === 'staff' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Official Staff Role</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'corporator', label: 'Corporator', icon: Landmark, color: 'text-indigo-400' },
                  { id: 'engineer', label: 'Engineer', icon: HardHat, color: 'text-amber-400' },
                  { id: 'crew', label: 'Field Crew', icon: Wrench, color: 'text-emerald-400' },
                  { id: 'police', label: 'Cyber Police', icon: ShieldAlert, color: 'text-rose-400' },
                  { id: 'admin', label: 'Admin', icon: KeyRound, color: 'text-purple-400' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setStaffRole(item.id as UserRole);
                        if (item.id === 'corporator') {
                          setStaffEmail('corporator@civiclens.gov.in');
                        } else if (item.id === 'engineer') {
                          setStaffEmail('engineer@civiclens.gov.in');
                        } else if (item.id === 'crew') {
                          setStaffEmail('crew@civiclens.gov.in');
                        } else if (item.id === 'police') {
                          setStaffEmail('cyberpolice@delhipolice.gov.in');
                        } else if (item.id === 'admin') {
                          setStaffEmail('admin@civiclens.gov.in');
                        }
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        staffRole === item.id
                          ? 'bg-slate-800 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Official Email / ID</label>
              <input
                type="text"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {staffRole === 'police' && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Police Badge / Authority ID</label>
                <input
                  type="text"
                  value={policeBadge}
                  onChange={(e) => setPoliceBadge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-rose-300 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Passcode</label>
              <input
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <button
              onClick={handleStaffLogin}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all mt-2"
            >
              {loading ? 'Authenticating Staff...' : `Login as ${staffRole.toUpperCase()}`}
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Login Chips for Evaluation */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                ⚡ 1-Click Evaluation Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDemoProfile('corporator', 'corporator@civiclens.gov.in', 'Rajesh Sharma')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-indigo-300 rounded-lg border border-indigo-500/30 transition-all"
                >
                  🏛️ Corporator
                </button>
                <button
                  type="button"
                  onClick={() => setDemoProfile('engineer', 'engineer@civiclens.gov.in', 'Priya Nair')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 rounded-lg border border-amber-500/30 transition-all"
                >
                  👷 Engineer (Cross-Portal)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoProfile('crew', 'crew@civiclens.gov.in', 'Crew 01')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300 rounded-lg border border-emerald-500/30 transition-all"
                >
                  🛠️ Field Crew
                </button>
                <button
                  type="button"
                  onClick={() => setDemoProfile('police', 'cyberpolice@delhipolice.gov.in', 'Insp. Vikram Rathore', 'DL-CYBER-8842')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-rose-300 rounded-lg border border-rose-500/30 transition-all"
                >
                  🛡️ Cyber Police
                </button>
                <button
                  type="button"
                  onClick={() => setDemoProfile('admin', 'admin@civiclens.gov.in', 'Anand Verma')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-purple-300 rounded-lg border border-purple-500/30 transition-all"
                >
                  ⚙️ Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
