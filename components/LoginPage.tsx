import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { authAPI } from "../services/api";
import { LogIn, AlertCircle, Shield, Moon, Sun, QrCode, Upload, Scan, KeyRound } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginTab, setLoginTab] = useState<"standard" | "qr">("standard");
  const [qrScanInput, setQrScanInput] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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
            const scannedVal = code.data.trim();
            setUsername(scannedVal);
            setScanNotice(`QR Code မှ အကောင့်အမည်/ID (${scannedVal}) ကို ရယူပြီးပါပြီ။`);
            setLoginTab("standard");
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
    const scannedVal = qrScanInput.trim();
    setUsername(scannedVal);
    setScanNotice(`Scanned Username/ID: ${scannedVal}`);
    setQrScanInput("");
    setLoginTab("standard");
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

            {loginTab === "qr" ? (
              <div className="space-y-5">
                {error && (
                  <div className="flex items-start gap-3 p-4 bg-jpmonitor-red-subtle border border-status-success-border rounded-jpmonitor">
                    <AlertCircle size={18} className="text-jpmonitor-red flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-jpmonitor-red">{error}</p>
                  </div>
                )}

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
                      placeholder="QR code text သို့မဟုတ် barcode..."
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
    </div>
  );
};

export default LoginPage;
