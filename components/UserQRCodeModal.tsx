import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode, X, Shield, UserCheck, Phone, MapPin, CreditCard, Briefcase } from 'lucide-react';
import { ManagedUser, ROLE_LABELS } from '../services/rbac';
import { getIdCardDesignSettings } from '../services/idCardSettings';

interface UserQRCodeModalProps {
  user: ManagedUser;
  onClose: () => void;
}

export const UserQRCodeModal: React.FC<UserQRCodeModalProps> = ({ user, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const cardSettings = getIdCardDesignSettings();

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Keep the QR payload small and tamper-resistant. The verification page
  // fetches the current public profile from the backend by username.
  const qrPayload = `${origin}/verify-user?username=${encodeURIComponent(user.username)}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrPayload, {
        width: 160,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [qrPayload]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `ID_Card_QR_${user.username}_${user.employeeId || 'card'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-id-card, #printable-id-card * {
            visibility: visible;
          }
          #printable-id-card {
            position: absolute;
            left: 50%;
            top: 15%;
            transform: translate(-50%, 0);
            width: 350px !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <div className="bg-bg-surface border border-border rounded-jpmonitor-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-bg-elevated">
          <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
            <QrCode className="text-jpmonitor-red" size={20} />
            <span>ဝန်ထမ်း ID Card & QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-jpmonitor hover:bg-bg-surface transition-colors"
            aria-label="ပိတ်ရန်"
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable ID Badge Area */}
        <div className="p-5 flex flex-col items-center max-h-[80vh] overflow-y-auto">
          <div
            id="printable-id-card"
            ref={cardRef}
            className="w-full max-w-[340px] bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-xl p-5 flex flex-col items-center text-center relative overflow-hidden font-sans"
          >
            {/* Top Brand Banner */}
            <div className="w-full bg-slate-900 text-white rounded-xl py-2.5 px-3 mb-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-left">
                {cardSettings.logoUrl ? (
                  <img src={cardSettings.logoUrl} alt="Company Logo" className="w-6 h-6 object-contain" />
                ) : (
                  <Shield className="text-amber-400 shrink-0" size={18} />
                )}
                <div>
                  <span className="text-xs font-bold tracking-wide block leading-tight">{cardSettings.companyName}</span>
                  <span className="text-[9px] text-slate-300 block">{cardSettings.companySubTitle}</span>
                </div>
              </div>
              <span className="text-[9px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded uppercase shrink-0">
                {cardSettings.badgeTitle || 'ID BADGE'}
              </span>
            </div>

            {/* Photo / Avatar */}
            <div className="mb-2 relative">
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.fullName}
                  className="w-20 h-24 object-cover rounded-xl border-2 border-slate-300 shadow-md"
                />
              ) : (
                <div className="w-20 h-24 rounded-xl bg-slate-100 border-2 border-slate-300 text-slate-600 flex items-center justify-center shadow-inner">
                  <UserCheck size={36} />
                </div>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-tight mb-0.5">
              {user.fullName}
            </h3>
            {user.fatherName && (
              <p className="text-xs text-slate-500 font-medium mb-0.5">
                အဖ - {user.fatherName}
              </p>
            )}
            <p className="text-xs font-semibold text-slate-600 mb-1">
              @{user.username} {user.employeeId ? `(ID: ${user.employeeId})` : ''}
            </p>

            <div className="inline-block px-3 py-0.5 bg-red-50 text-red-700 font-bold text-[11px] rounded-full border border-red-200 mb-3">
              {user.position || ROLE_LABELS[user.role] || user.role}
            </div>

            {/* Comprehensive Employee Details Grid */}
            <div className="w-full bg-slate-50 rounded-xl p-3 mb-3 text-xs border border-slate-200 space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <Briefcase size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium">ဌာန/Site:</span>
                <span className="font-semibold text-slate-800 truncate">{user.department || '—'} ({user.site || '—'})</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium">ဖုန်း:</span>
                <span className="font-semibold text-slate-800">{user.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium">မှတ်ပုံတင်:</span>
                <span className="font-semibold text-slate-800">{user.nrc || '—'}</span>
              </div>
              {user.address && (
                <div className="flex items-start gap-2 pt-0.5 border-t border-slate-200">
                  <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-500 font-medium shrink-0">နေရပ်:</span>
                  <span className="font-semibold text-slate-800 text-[11px] leading-tight">{user.address}</span>
                </div>
              )}
            </div>

            {/* QR Code Canvas Container */}
            <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm mb-1 flex flex-col items-center">
              <canvas ref={canvasRef} className="max-w-full" />
              <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                SCAN FOR FULL PROFILE & LOGIN
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-border bg-bg-elevated flex items-center justify-end gap-3">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-border rounded-jpmonitor hover:bg-bg-surface text-text-primary transition-colors"
          >
            <Download size={15} /> QR Code (PNG)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white rounded-jpmonitor transition-colors"
          >
            <Printer size={15} /> ID Card Print ထုတ်ရန်
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserQRCodeModal;
