import { SparePart, InventoryTransaction } from '../types';
import { translateValue } from '../utils/locale';

interface FuelLogsProps {
    partsHistory: InventoryTransaction[];
    spareParts: SparePart[];
}

const FuelLogs = ({ partsHistory, spareParts }: FuelLogsProps) => {
    return (
        <div className="p-6 overflow-y-auto bg-white">
            <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><th className="p-3 text-slate-600 font-bold">ရက်စွဲ</th><th className="p-3 text-slate-600 font-bold">အမျိုးအစား</th><th className="p-3 text-slate-600 font-bold">ပစ္စည်း</th><th className="p-3 text-slate-600 font-bold">အရေအတွက်</th></tr>
                </thead>
                <tbody>
                    {partsHistory.map(tx => (
                        <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 text-slate-600">{tx.date}</td>
                            <td className="p-3"><span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{translateValue(tx.type)}</span></td>
                            <td className="p-3 font-medium text-slate-800">{spareParts.find(p => p.id === tx.partId)?.name || 'မသိရှိရသေးသော ပစ္စည်း'}</td>
                            <td className="p-3 font-bold text-slate-700">{tx.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FuelLogs;
