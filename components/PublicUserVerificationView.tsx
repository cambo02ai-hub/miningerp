import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Phone, CreditCard, Briefcase, MapPin, ArrowRight, Shield, Award } from 'lucide-react';
import { getIdCardDesignSettings } from '../services/idCardSettings';

export const PublicUserVerificationView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawData = searchParams.get('data');

  const cardSettings = getIdCardDesignSettings();

  const userProfile = useMemo(() => {
    if (!rawData) return null;
    try {
      const decoded = decodeURIComponent(rawData);
      return JSON.parse(decoded);
    } catch {
      try {
        return JSON.parse(rawData);
      } catch {
        return null;
      }
    }
  }, [rawData]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="mb-6 flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
        <ShieldCheck size={16} className="text-emerald-400" />
        <span>တရားဝင် စိစစ်ပြီးသော ဝန်ထမ်း Digital ID Badge</span>
      </div>

      {userProfile ? (
        <div className="w-full max-w-sm bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300 relative">
          {/* Top Brand Banner */}
          <div className="w-full bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              {cardSettings.logoUrl ? (
                <img src={cardSettings.logoUrl} alt="Logo" className="w-7 h-7 object-contain" />
              ) : (
                <Shield className="text-amber-400 shrink-0" size={22} />
              )}
              <div>
                <h1 className="text-xs font-bold tracking-wide uppercase leading-tight">{cardSettings.companyName}</h1>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{cardSettings.companySubTitle}</p>
              </div>
            </div>
            <span className="text-[9px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
              VERIFIED
            </span>
          </div>

          {/* Verification Status Notice */}
          <div className="bg-emerald-50 text-emerald-800 px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-emerald-100">
            <div className="flex items-center gap-1.5">
              <Award size={15} className="text-emerald-600 shrink-0" />
              <span>အသုံးပြုခွင့် တရားဝင် အတည်ပြုပြီး</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded">
              Active Employee
            </span>
          </div>

          {/* User Profile Info Body */}
          <div className="p-6 flex flex-col items-center text-center">
            {/* Avatar Photo */}
            <div className="mb-3 relative">
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.fullName}
                  className="w-24 h-28 object-cover rounded-xl border-2 border-slate-300 shadow-md"
                />
              ) : (
                <div className="w-24 h-28 rounded-xl bg-slate-100 border-2 border-slate-300 text-slate-500 flex items-center justify-center shadow-inner">
                  <UserCheck size={44} />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow border-2 border-white">
                <ShieldCheck size={14} />
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {userProfile.fullName}
            </h2>
            <p className="text-xs font-medium text-slate-500 mb-2">
              @{userProfile.username} {userProfile.employeeId ? `(ID: ${userProfile.employeeId})` : ''}
            </p>

            <div className="inline-block px-3.5 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200 mb-4">
              {userProfile.position || userProfile.role || 'ဝန်ထမ်း'}
            </div>

            {/* Profile Grid Details */}
            <div className="w-full bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-left mb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium shrink-0">ဌာန/Site:</span>
                <span className="font-semibold text-slate-800 truncate">{userProfile.department || '—'} ({userProfile.site || '—'})</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium shrink-0">ဖုန်းနံပါတ်:</span>
                <span className="font-semibold text-slate-800">{userProfile.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium shrink-0">မှတ်ပုံတင်:</span>
                <span className="font-semibold text-slate-800">{userProfile.nrc || '—'}</span>
              </div>
              {userProfile.address && (
                <div className="flex items-start gap-2 pt-1 border-t border-slate-200">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-500 font-medium shrink-0">နေရပ်:</span>
                  <span className="font-semibold text-slate-800 text-[11px] leading-tight">{userProfile.address}</span>
                </div>
              )}
            </div>

            {/* Direct Login Action Button */}
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              <span>ERP System သို့ Login ဝင်မည်</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-slate-800 text-slate-200 p-6 rounded-2xl border border-slate-700 text-center shadow-xl">
          <Shield className="mx-auto text-amber-400 mb-3" size={40} />
          <h2 className="text-base font-semibold mb-2">မမှန်ကန်သော သို့မဟုတ် သက်တမ်းကုန် QR Code</h2>
          <p className="text-xs text-slate-400 mb-4">
            စိစစ်၍ မရနိုင်သော ဝန်ထမ်း အချက်အလက် ဖြစ်ပါသည်။ ကျေးဇူးပြု၍ တရားဝင် ID Badge QR Code ကို ပြန်လည် စကန်ဖတ်ပါ။
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors"
          >
            ပင်မစာမျက်နှာသို့ သွားမည်
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 text-center text-slate-500 text-[11px]">
        &copy; {new Date().getFullYear()} {cardSettings.companyName}. Official Employee QR Verification System.
      </footer>
    </div>
  );
};

export default PublicUserVerificationView;
