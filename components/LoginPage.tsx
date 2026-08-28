import React, { useState, useEffect } from "react";
import { authAPI } from "../services/api";
import { LogIn, AlertCircle, Shield, Moon, Sun } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex bg-bg-page text-text-secondary transition-colors duration-300">
      {/* Left Panel - JPM Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-jpmonitor-red flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-12 left-12 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-12 right-12 w-72 h-72 bg-black rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="inline-flex items-center justify-center mb-8">
            <span className="text-white font-black text-7xl tracking-tighter leading-none">
              J<span className="text-white/80">P</span>M
            </span>
          </div>
          <h1 className="text-white text-3xl font-light tracking-tight mb-4" style={{ letterSpacing: "-0.02em" }}>
            Enterprise Resource Planning
          </h1>
          <p className="text-white/70 text-lg font-light leading-relaxed">
            JpMonitor
          </p>
          <div className="mt-12 flex items-center justify-center gap-3 text-white/50 text-sm">
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
              <span className="text-jpmonitor-red font-black text-4xl tracking-tighter">
                J<span className="text-text-muted">P</span>M
              </span>
            </div>

            <div className="mb-8">
              <h2 className="text-text-primary text-2xl font-light tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
                Sign in to your account
              </h2>
              <p className="text-text-muted text-sm">
                Enter your credentials to access the dashboard
              </p>
            </div>

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

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-text-muted text-center">
                &copy; {new Date().getFullYear()} JpMonitor. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
