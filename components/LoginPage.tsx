import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { authAPI } from "../services/api";
import { LogIn, AlertCircle, Shield, Moon, Sun, QrCode, Upload, Scan, KeyRound, UserCheck, Phone, CreditCard, Briefcase, MapPin, Camera, X, ExternalLink, ShieldCheck, User } from "lucide-react";
import { getIdCardDesignSettings } from "../services/idCardSettings";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

interface ScannedEmployeeProfile {
  fullName?: string;
  fatherName?: string;
  username?: string;
  phone?: string;
  nrc?: string;
  position?: string;
  address?: string;
  employeeId?: string;
  department?: string;
  site?: string;
  photoUrl?: string;
  role?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginTab, setLoginTab] = useState<"standard" | "qr">("standard");
  const [qrScanInput, setQrScanInput] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [scannedProfile, setScannedProfile] = useState<ScannedEmployeeProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const cardSettings = getIdCardDesignSettings();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("jpmonitor-dark-mode");
      if (stored !== null) return stored === "true";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("jpmonitor-dark-mode", String(darkMode));
  }, [darkMode]);

  const processQrTextPayload = async (rawText: string) => {
    let payload = rawText.trim();

    // Resolve the compact verification URL generated on employee ID cards.
    if (payload.includes('/verify-user?')) {
      try {
        const url = new URL(payload);
        const usernameParam = url.searchParams.get('username')?.trim();
        if (usernameParam) {
          const profile = await authAPI.getPublicProfile(usernameParam);
          setScannedProfile(profile);
          setUsername(profile.username || usernameParam);
          setScanNotice(`QR ID Badge Scan အောင်မြင်ပါသည် - ${profile.fullName || usernameParam}`);
          return;
        }
        const dataParam = url.searchParams.get('data');
        if (dataParam) {
          payload = dataParam;
        }
      } catch {
        const match = payload.split('/verify-user?data=')[1];
        if (match) {
          payload = decodeURIComponent(match);
        }
      }
    }

    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'object' && parsed !== null) {
        setScannedProfile(parsed);
        const uname = parsed.username || parsed.employeeId || rawText;
        setUsername(uname);
        setScanNotice(`QR ID Badge Scan အောင်မြင်ပါသည် - ${parsed.fullName || uname}`);
        return;
      }
    } catch {
      // Plain text fallback
    }
    setScannedProfile(null);
    setUsername(rawText.trim());
    setScanNotice(`Scanned Username/ID: ${rawText.trim()}`);
  };

  // Live Camera WebCam Scanning Effect
  useEffect(() => {
    if (!isCameraModalOpen) return;
    setCameraError("");
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          requestAnimationFrame(scanVideoFrame);
        }
      } catch (err: any) {
        setCameraError(err.message || "ကင်မရာ အသုံးပြုခွင့် မရရှိပါ သို့မဟုတ် ကင်မရာ ရှာမတွေ့ပါ။");
      }
    };

    const scanVideoFrame = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            void processQrTextPayload(code.data.trim());
            stopCamera();
            setIsCameraModalOpen(false);
            return;
          }
        }
      }
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    };

    const stopCamera = () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isCameraModalOpen]);

  const handleSelectStandardLogin = () => {
    setLoginTab("standard");
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authAPI.login(username.trim(), password.trim());
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setScanNotice("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            void processQrTextPayload(code.data.trim());
          } else {
            setError("QR Code ပုံရိပ်ကို ဖတ်၍ မရပါ။ ကျေးဇူးပြု၍ အကြည်လင်းဆုံး ပုံကို ရွေးချယ်ပါ။");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleQrScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrScanInput.trim()) return;
    void processQrTextPayload(qrScanInput.trim());
    setQrScanInput("");
  };

  return (
    <div className="min-h-screen flex bg-bg-page text-text-secondary transition-colors duration-300">
      {/* Left Panel - Gold Mining ERP Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-jpmonitor-red flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-12 left-12 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-12 right-12 w-72 h-72 bg-black rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="inline-flex items-center justify-center mb-8 bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm border border-white/20">
            <span className="text-amber-400 font-black text-4xl tracking-tight leading-none">
              ရွှေမိုင်း <span className="text-white font-bold">ERP</span>
            </span>
          </div>
          <h1 className="text-white text-3xl font-medium tracking-tight mb-4" style={{ letterSpacing: "-0.02em" }}>
            ရွှေတူးဖော်ရေး ERP System
          </h1>
          <p className="text-white/80 text-base font-light leading-relaxed">
            Gold Mining Enterprise Resource Planning
          </p>
          <div className="mt-12 flex items-center justify-center gap-3 text-white/60 text-sm">
            <Shield size={16} />
            <span>လုပ်ငန်းသုံးအဆင့် လုံခြုံရေးဖြင့် ကာကွယ်ထားသည်</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 bg-bg-page">
        {/* Dark mode toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-md border border-border hover:bg-bg-surface transition-colors"
            aria-label="အမှောင်ပုံစံ ပြောင်းရန်"
          >
            {darkMode ? <Sun size={18} className="text-text-secondary" /> : <Moon size={18} className="text-text-secondary" />}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center mb-8">
              <span className="text-jpmonitor-red font-black text-2xl tracking-tight">
                ရွှေတူးဖော်ရေး <span className="text-text-primary font-bold">ERP System</span>
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-text-primary text-2xl font-light tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
                Sign in to your account
              </h2>
              <p className="text-text-muted text-sm">
                Enter your credentials or scan QR Badge to access the dashboard
              </p>
            </div>

            {/* Login Mode Toggle Tabs */}
            <div className="flex border-b border-border mb-6">
              <button
                type="button"
                onClick={() => { setLoginTab("standard"); setError(""); }}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${loginTab === "standard" ? "border-jpmonitor-red text-jpmonitor-red" : "border-transparent text-text-muted hover:text-text-primary"}`}
              >
                <KeyRound size={15} /> Standard Login
              </button>
              <button
                type="button"
                onClick={() => { setLoginTab("qr"); setError(""); }}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${loginTab === "qr" ? "border-jpmonitor-red text-jpmonitor-red" : "border-transparent text-text-muted hover:text-text-primary"}`}
              >
                <QrCode size={15} /> QR Badge Scan
              </button>
            </div>

            {scanNotice && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-jpmonitor text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <Scan size={16} className="text-emerald-600 flex-shrink-0" />
                <span>{scanNotice}</span>
              </div>
            )}

            {/* Scanned Employee Profile Card Display */}
            {scannedProfile && (
              <div className="mb-5 p-4 bg-bg-surface border border-emerald-500/30 rounded-jpmonitor-lg shadow-md text-xs space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={18} />
                    <span>စကန်ဖတ်ရရှိသော ဝန်ထမ်း အချက်အလက်</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold">
                    VERIFIED
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {scannedProfile.photoUrl ? (
                    <img
                      src={scannedProfile.photoUrl}
                      alt={scannedProfile.fullName}
                      className="w-12 h-14 object-cover rounded-lg border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-14 bg-bg-elevated border border-border rounded-lg flex items-center justify-center text-text-muted shrink-0">
                      <User size={24} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary text-sm truncate">
                      {scannedProfile.fullName || username}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      @{username} {scannedProfile.employeeId ? `(ID: ${scannedProfile.employeeId})` : ''}
                    </p>
                    <div className="inline-block mt-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold text-[10px] rounded border border-amber-200 dark:border-amber-800">
                      {scannedProfile.position || 'ဝန်ထမ်း'}
                    </div>
                  </div>
                </div>

                {/* Quick Details List */}
                <div className="grid grid-cols-1 gap-1 text-[11px] text-text-muted pt-1 border-t border-border/50">
                  {scannedProfile.phone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone size={12} className="shrink-0 text-text-muted" />
                      <span>ဖုန်း: <strong className="text-text-primary">{scannedProfile.phone}</strong></span>
                    </div>
                  )}
                  {scannedProfile.department && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Briefcase size={12} className="shrink-0 text-text-muted" />
                      <span>ဌာန/Site: <strong className="text-text-primary">{scannedProfile.department} ({scannedProfile.site || '—'})</strong></span>
                    </div>
                  )}
                </div>

                {/* Action Buttons: View Details & Proceed to Standard Login */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className="flex-1 py-1.5 px-2 bg-bg-elevated hover:bg-bg-surface border border-border rounded-jpmonitor text-text-primary font-medium text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>Profile အသေးစိတ်ကြည့်မည်</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectStandardLogin}
                    className="flex-1 py-1.5 px-2 bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white font-medium text-[11px] rounded-jpmonitor flex items-center justify-center gap-1 transition-colors"
                  >
                    <KeyRound size={13} />
                    <span>Standard Login ပြုလုပ်မည်</span>
                  </button>
                </div>
              </div>
            )}

            {loginTab === "qr" ? (
              <div className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-jpmonitor-red-subtle border border-status-success-border rounded-jpmonitor">
                    <AlertCircle size={18} className="text-jpmonitor-red flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-jpmonitor-red">{error}</p>
                  </div>
                )}

                {/* Live Camera Scanner Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-jpmonitor shadow transition-colors flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  <span>WebCam / Camera ဖြင့် တိုက်ရိုက် Scan ဖတ်မည်</span>
                </button>

                {/* File Upload QR Option */}
                <div className="border-2 border-dashed border-border rounded-jpmonitor p-6 text-center hover:border-jpmonitor-red/50 transition-colors bg-bg-surface">
                  <QrCode size={36} className="mx-auto text-jpmonitor-red mb-2" />
                  <p className="text-xs font-medium text-text-primary mb-1">QR Code ID Badge ပုံရိပ် တင်သွင်းရန်</p>
                  <p className="text-[11px] text-text-muted mb-3">PNG, JPG သို့မဟုတ် WebP ပုံရိပ် ဖတ်ရှုနိုင်ပါသည်</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleQrFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-jpmonitor-red text-white rounded-jpmonitor hover:bg-jpmonitor-red-hover transition-colors"
                  >
                    <Upload size={14} /> ပုံရိပ် ရွေးချယ်မည်
                  </button>
                </div>

                {/* QR Hardware Gun / Direct Scan Field */}
                <form onSubmit={handleQrScanSubmit} className="space-y-3">
                  <label htmlFor="qr-hardware-input" className="block text-xs font-medium text-text-secondary">
                    သို့မဟုတ် Hardware QR Scanner ဖြင့် တိုက်ရိုက် ဖတ်ရှုရန်
                  </label>
                  <div className="relative">
                    <input
                      id="qr-hardware-input"
                      type="text"
                      value={qrScanInput}
                      onChange={(e) => setQrScanInput(e.target.value)}
                      placeholder="QR code text သို့မဟုတ် JSON..."
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-jpmonitor bg-bg-surface text-text-primary text-sm focus:border-jpmonitor-red focus:outline-none"
                    />
                    <Scan size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-bg-elevated text-text-primary border border-border hover:bg-bg-surface font-medium text-xs rounded-jpmonitor transition-colors"
                  >
                    Username ဖြည့်သွင်းမည်
                  </button>
                </form>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-jpmonitor-red-subtle border border-status-success-border rounded-jpmonitor">
                  <AlertCircle size={18} className="text-jpmonitor-red flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-jpmonitor-red">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-jpmonitor bg-bg-surface text-text-primary transition-all duration-200 focus:border-jpmonitor-red focus:ring-2 focus:ring-jpmonitor-red/20 focus:outline-none placeholder:text-text-muted"
                  placeholder="အသုံးပြုသူအမည် ရိုက်ထည့်ပါ"
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                  Password
                </label>
                <input
                  id="password"
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-jpmonitor bg-bg-surface text-text-primary transition-all duration-200 focus:border-jpmonitor-red focus:ring-2 focus:ring-jpmonitor-red/20 focus:outline-none placeholder:text-text-muted"
                  placeholder="စကားဝှက် ရိုက်ထည့်ပါ"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white font-medium py-3 px-4 rounded-jpmonitor transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-jpmonitor-red focus:ring-offset-2 dark:focus:ring-offset-bg-page"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>
            )}

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-text-muted text-center">
                &copy; {new Date().getFullYear()} ရွှေတူးဖော်ရေး ERP System. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Employee Profile Modal */}
      {showProfileModal && scannedProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-bg-elevated">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                <UserCheck className="text-emerald-500" size={18} />
                <span>ဝန်ထမ်း အချက်အလက် Profile</span>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center text-center">
              {/* Badge Header Banner */}
              <div className="w-full bg-slate-900 text-white rounded-xl py-2 px-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-left">
                  {cardSettings.logoUrl ? (
                    <img src={cardSettings.logoUrl} alt="Logo" className="w-5 h-5 object-contain" />
                  ) : (
                    <Shield className="text-amber-400 shrink-0" size={16} />
                  )}
                  <span className="text-[11px] font-bold tracking-wide">{cardSettings.companyName}</span>
                </div>
                <span className="text-[9px] bg-amber-400 text-slate-950 font-extrabold px-1.5 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>

              {/* Avatar */}
              <div className="mb-3">
                {scannedProfile.photoUrl ? (
                  <img
                    src={scannedProfile.photoUrl}
                    alt={scannedProfile.fullName}
                    className="w-20 h-24 object-cover rounded-xl border-2 border-border shadow-md"
                  />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-bg-elevated border-2 border-border text-text-muted flex items-center justify-center">
                    <User size={36} />
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-text-primary mb-0.5">
                {scannedProfile.fullName || username}
              </h3>
              <p className="text-xs text-text-muted mb-2">
                @{username} {scannedProfile.employeeId ? `(ID: ${scannedProfile.employeeId})` : ''}
              </p>

              <div className="inline-block px-3 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-full border border-amber-200 dark:border-amber-800 mb-4">
                {scannedProfile.position || 'ဝန်ထမ်း'}
              </div>

              {/* Detailed Grid */}
              <div className="w-full bg-bg-elevated rounded-xl p-3 text-xs border border-border space-y-2 text-left mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase size={13} className="text-text-muted shrink-0" />
                  <span className="text-text-muted font-medium shrink-0">ဌာန/Site:</span>
                  <span className="font-semibold text-text-primary truncate">{scannedProfile.department || '—'} ({scannedProfile.site || '—'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-text-muted shrink-0" />
                  <span className="text-text-muted font-medium shrink-0">ဖုန်း:</span>
                  <span className="font-semibold text-text-primary">{scannedProfile.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={13} className="text-text-muted shrink-0" />
                  <span className="text-text-muted font-medium shrink-0">မှတ်ပုံတင်:</span>
                  <span className="font-semibold text-text-primary">{scannedProfile.nrc || '—'}</span>
                </div>
                {scannedProfile.address && (
                  <div className="flex items-start gap-2 pt-1 border-t border-border">
                    <MapPin size={13} className="text-text-muted shrink-0 mt-0.5" />
                    <span className="text-text-muted font-medium shrink-0">နေရပ်:</span>
                    <span className="font-semibold text-text-primary text-[11px] leading-tight">{scannedProfile.address}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  handleSelectStandardLogin();
                }}
                className="w-full py-2.5 bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white font-medium text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound size={15} />
                <span>Standard Login ပြုလုပ်ရန် Username ယူမည်</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live WebCam Scan Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border rounded-jpmonitor-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-bg-elevated">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                <Camera size={18} className="text-emerald-500" />
                <span>WebCam QR Scanner</span>
              </div>
              <button
                onClick={() => setIsCameraModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-bg-surface"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center">
              {cameraError ? (
                <div className="p-4 bg-jpmonitor-red-subtle border border-red-300 rounded-lg text-jpmonitor-red text-xs text-center my-6">
                  {cameraError}
                </div>
              ) : (
                <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" muted>
                    <track kind="captions" />
                  </video>
                  {/* Scanner Reticle Overlay */}
                  <div className="absolute inset-0 border-[3px] border-emerald-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400 border-dashed rounded-xl animate-pulse flex items-center justify-center">
                      <Scan className="text-emerald-400/80 w-10 h-10 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-text-muted mt-3 text-center">
                ဝန်ထမ်း ID Card QR Code ကို ကင်မရာ၏ ဘောင်အတွင်း တည့်တည့် ထားရှိပါ
              </p>
            </div>

            <div className="p-3 border-t border-border bg-bg-elevated flex justify-end">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(false)}
                className="px-4 py-2 text-xs font-medium border border-border rounded-jpmonitor hover:bg-bg-surface text-text-primary"
              >
                ပိတ်မည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
