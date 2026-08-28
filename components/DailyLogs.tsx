import { formatNumber, translateValue } from '../utils/locale';
import { ArrowRightLeft, X, CheckCircle, Truck } from 'lucide-react';

interface DailyLogsProps {
    mutationHistory: any[];
}

const DailyLogs = ({ mutationHistory }: DailyLogsProps) => {
    return (
        <div className="p-6 overflow-y-auto h-full w-full">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowRightLeft size={18} /> Mutation History
            </h4>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                        <tr>
                            <th className="px-4 py-3">ရက်စွဲ</th>
                            <th className="px-4 py-3">အမျိုးအစား</th>
                            <th className="px-4 py-3">လမ်းကြောင်း</th>
                            <th className="px-4 py-3">ကိုးကားနံပါတ်</th>
                            <th className="px-4 py-3">HM</th>
                            <th className="px-4 py-3">အခြေအနေ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {mutationHistory.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">ယူနစ်ပြောင်းရွှေ့မှတ်တမ်း မတွေ့ပါ။</td>
                            </tr>
                        ) : (
                            mutationHistory.map((mut: any) => (
                                <tr key={mut.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-mono text-slate-600">{mut.departureDate}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${mut.type === 'ACQUISITION' ? 'bg-green-100 text-green-700' :
                                            mut.type === 'TRANSFER' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {translateValue(mut.type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-500 bg-slate-100 px-1.5 rounded">{mut.sourceLocation || '-'}</span>
                                            <span className="text-slate-300">➝</span>
                                            <span className="font-bold text-slate-700">{mut.targetLocation || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{mut.referenceDocument}</td>
                                    <td className="px-4 py-3 font-mono">{formatNumber(mut.mutationHM)}</td>
                                    <td className="px-4 py-3">
                                        {mut.status === 'CANCELLED' ? (
                                            <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                                                <X size={14} /> Cancelled
                                            </span>
                                        ) : (mut.arrivalDate || mut.status === 'COMPLETED') ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                                <CheckCircle size={14} /> Arrived
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-amber-600 text-xs font-bold">
                                                <Truck size={14} /> In Transit
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DailyLogs;
