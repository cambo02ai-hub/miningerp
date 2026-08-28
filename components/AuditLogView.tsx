import { formatDateTime } from '../utils/locale';

import React, { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { ShieldCheck, ArrowRight, History, RefreshCw } from 'lucide-react';

const AuditLogView: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await auditAPI.getLogs({ limit: 100 });
            setLogs(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load audit logs:', err);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    if (loading && logs.length === 0) {
        return <div className="p-8 text-center text-slate-500">စစ်ဆေးမှတ်တမ်းများ တင်နေပါသည်...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg text-teal-700">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">စနစ်စစ်ဆေးမှတ်တမ်း</h2>
                        <p className="text-slate-500 text-sm">စည်းမျဉ်းလိုက်နာမှုအတွက် ဒေတာဘေ့စ်လုပ်ဆောင်ချက်အားလုံး၏ ပြောင်းလဲ၍မရသော မှတ်တမ်း။</p>
                    </div>
                </div>
                <button
                    onClick={loadLogs}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="မှတ်တမ်းများ ပြန်တင်ရန်"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={loadLogs} className="text-sm font-bold underline">ထပ်မံကြိုးစားရန်</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-40">အချိန်မှတ်တမ်း</th>
                                <th className="px-6 py-4 w-48">အသုံးပြုသူ</th>
                                <th className="px-6 py-4 w-32">မော်ဂျူး</th>
                                <th className="px-6 py-4 w-24">လုပ်ဆောင်ချက်</th>
                                <th className="px-6 py-4">ဖော်ပြချက်</th>
                                <th className="px-6 py-4 w-1/3">ဒေတာပြောင်းလဲမှု</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-500 text-xs align-top whitespace-nowrap">
                                        {formatDateTime(log.timestamp)}
                                        <div className="font-mono text-[10px] text-slate-300 mt-1 flex items-center gap-1">
                                            <History size={10} />
                                            {log.id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="font-bold text-slate-800 text-xs">{log.user_name || log.userName}</div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{log.user_role || log.userRole}</div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                                            {log.module}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${log.action === 'CREATE' ? 'text-green-700 bg-green-50 border border-green-100' :
                                                log.action === 'UPDATE' ? 'text-blue-700 bg-blue-50 border border-blue-100' : 'text-red-700 bg-red-50 border border-red-100'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 align-top text-xs">
                                        {log.description}
                                        <div className="text-[10px] text-slate-400 mt-1 font-mono">အရာဝတ္ထု ID: {log.entity_id || log.entityId}</div>
                                    </td>
                                    <td className="px-6 py-4 bg-slate-50/50 align-top border-l border-slate-100">
                                        <div className="space-y-1">
                                            {log.changes && (typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes).before ? (
                                                // Handle {before, after} format if that's what backend returns
                                                <div className="text-xs font-mono">
                                                    <div className="mb-1"><span className="font-bold">မပြင်မီ:</span> {JSON.stringify((typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes).before).substring(0, 50)}...</div>
                                                    <div><span className="font-bold">ပြင်ပြီးနောက်:</span> {JSON.stringify((typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes).after).substring(0, 50)}...</div>
                                                </div>
                                            ) : (
                                                // Handle array of changes format if that's what backend returns (as in original code)
                                                Array.isArray(log.changes) ? log.changes.map((change: any, idx: number) => (
                                                    <div key={idx} className="text-xs font-mono flex items-center flex-wrap gap-1">
                                                        <span className="font-bold text-slate-600">{change.field}:</span>
                                                        {change.oldValue !== null && (
                                                            <span className="text-red-500 bg-red-50 px-1 rounded line-through decoration-red-500/50 decoration-2">
                                                                {JSON.stringify(change.oldValue)}
                                                            </span>
                                                        )}
                                                        <ArrowRight size={10} className="text-slate-400" />
                                                        <span className="text-green-600 bg-green-50 px-1 rounded border border-green-100">
                                                            {JSON.stringify(change.newValue)}
                                                        </span>
                                                    </div>
                                                )) : <span className="text-xs text-slate-400 italic">သီးခြား field ပြောင်းလဲမှု မရှိပါ။</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        No audit logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogView;

