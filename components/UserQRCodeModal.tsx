import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode, X, Shield, UserCheck } from 'lucide-react';
import { ManagedUser, ROLE_LABELS } from '../services/rbac';

interface UserQRCodeModalProps {
  user: ManagedUser;
  onClose: () => void;
}

export const UserQRCodeModal: React.FC<UserQRCodeModalProps> = ({ user, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const qrText = user.employeeId || user.username;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrText, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [qrText]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${user.username}_${user.employeeId || 'card'}.png`;
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
            top: 20%;
            transform: translate(-50%, 0);
            width: 340px !important;
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
          <div className="flex items-center gap-2 text-text-primary font-semibold">
            <QrCode className="text-jpmonitor-red" size={20} />
            <span>ဝန်ထမ်း ID Badge & QR Code</span>
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
        <div className="p-6 flex flex-col items-center">
          <div
            id="printable-id-card"
            ref={cardRef}
            className="w-full max-w-[320px] bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-lg p-5 flex flex-col items-center text-center relative overflow-hidden font-sans"
          >
            {/* Top Brand Banner */}
            <div className="w-full bg-slate-900 text-white rounded-xl py-2.5 px-3 mb-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5">
                <Shield className="text-amber-400" size={16} />
                <span className="text-xs font-bold tracking-wide">ရွှေတူးဖော်ရေး ERP</span>
              </div>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-md uppercase">
                ID BADGE
              </span>
            </div>

            {/* Avatar & Basic Info */}
            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-700 flex items-center justify-center mb-2 shadow-inner">
              <UserCheck size={32} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 leading-tight mb-0.5">
              {user.fullName}
            </h3>
            <p className="text-xs font-medium text-slate-500 mb-2">
              @{user.username} {user.employeeId ? `(ID: ${user.employeeId})` : ''}
            </p>

            <div className="inline-block px-3 py-1 bg-red-50 text-red-700 font-semibold text-xs rounded-full border border-red-200 mb-3">
              {ROLE_LABELS[user.role] || user.role}
            </div>

            {/* Department & Site details */}
            <div className="w-full bg-slate-50 rounded-xl p-2.5 mb-4 text-xs border border-slate-200 grid grid-cols-2 gap-1 text-left">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">ဌာန</span>
                <span className="font-semibold text-slate-700 truncate block">
                  {user.department || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">လုပ်ငန်းခွင်</span>
                <span className="font-semibold text-slate-700 truncate block">
                  {user.site || '—'}
                </span>
              </div>
            </div>

            {/* QR Code Canvas Container */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm mb-2 flex flex-col items-center">
              <canvas ref={canvasRef} className="max-w-full" />
              <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                SCAN FOR QUICK LOGIN
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-border bg-bg-elevated flex items-center justify-end gap-3">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-jpmonitor hover:bg-bg-surface text-text-primary transition-colors"
          >
            <Download size={16} /> QR Code (PNG)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white rounded-jpmonitor transition-colors"
          >
            <Printer size={16} /> Badge Print ထုတ်ရန်
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserQRCodeModal;
