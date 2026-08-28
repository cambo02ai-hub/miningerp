import { translateValue } from '../utils/locale';
import { InventoryTransaction, SparePart } from '../types';
import { InventoryTxType } from '../types';
import { Search, History } from 'lucide-react';

interface InventoryTransactionsProps {
    transactions: InventoryTransaction[];
    filteredTransactions: InventoryTransaction[];
    parts: SparePart[];
    equipment: any[];
    filterText: string;
    filterType: string;
    onFilterTextChange: (text: string) => void;
    onFilterTypeChange: (type: string) => void;
}

const InventoryTransactions: React.FC<InventoryTransactionsProps> = ({
    filteredTransactions,
    parts,
    equipment,
    filterText,
    filterType,
    onFilterTextChange,
    onFilterTypeChange
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History size={18} className="text-slate-400" /> Transaction History Log
                </h3>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <label htmlFor="tx-search-input" className="sr-only">လှုပ်ရှားမှုများ ရှာရန်...</label>
                        <input
                            id="tx-search-input"
                            type="text"
                            placeholder="လှုပ်ရှားမှုများ ရှာရန်..."
                            className="text-xs border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-48"
                            value={filterText}
                            onChange={(e) => onFilterTextChange(e.target.value)}
                        />
                    </div>
                    <label htmlFor="tx-type-filter" className="sr-only">လှုပ်ရှားမှုအမျိုးအစား စစ်ထုတ်ရန်</label>
                    <select
                        id="tx-type-filter"
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={filterType}
                        onChange={(e) => onFilterTypeChange(e.target.value)}
                    >
                        <option value="ALL">အမျိုးအစားအားလုံး</option>
                        <option value={InventoryTxType.USAGE}>သုံးစွဲခြင်း</option>
                        <option value={InventoryTxType.PURCHASE}>ဝယ်ယူခြင်း</option>
                        <option value={InventoryTxType.CANNIBAL_HARVEST}>အစိတ်အပိုင်းခွဲယူခြင်း</option>
                        <option value={InventoryTxType.RETURN_VENDOR}>ပြန်အပ်ခြင်း</option>
                        <option value={InventoryTxType.RESTOCK_UNUSED}>စတော့ပြန်ဖြည့်ခြင်း</option>
                        <option value={InventoryTxType.TRANSFER_OUT}>ပြောင်းရွှေ့ထုတ်ခြင်း</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">ရက်စွဲ</th>
                            <th className="px-6 py-3">ပစ္စည်း</th>
                            <th className="px-6 py-3">အမျိုးအစား</th>
                            <th className="px-6 py-3 text-right">အရေအတွက်</th>
                            <th className="px-6 py-3">ကိုးကား / စက်ယာဉ်</th>
                            <th className="px-6 py-3">မှတ်ချက်များ</th>
                            <th className="px-6 py-3">ဆောင်ရွက်သူ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map((tx) => {
                            const part = parts.find(p => p.id === tx.partId);
                            const equipmentCode = equipment.find((e: any) => e.id === tx.equipmentId)?.code || tx.equipmentId;

                            // Color coding based on transaction type
                            let typeBadgeClass = 'bg-slate-100 text-slate-600';
                            let qtyClass = 'text-slate-900';
                            let icon = '';

                            switch (tx.type) {
                                case InventoryTxType.PURCHASE:
                                    typeBadgeClass = 'bg-green-100 text-green-700';
                                    qtyClass = 'text-green-600';
                                    icon = '⬆';
                                    break;
                                case InventoryTxType.USAGE:
                                    typeBadgeClass = 'bg-blue-100 text-blue-700';
                                    qtyClass = 'text-blue-600';
                                    icon = '⬇';
                                    break;
                                case InventoryTxType.CANNIBAL_HARVEST:
                                    typeBadgeClass = 'bg-amber-100 text-amber-700';
                                    qtyClass = 'text-amber-600';
                                    icon = '♻';
                                    break;
                                case InventoryTxType.RETURN_VENDOR:
                                    typeBadgeClass = 'bg-red-100 text-red-700';
                                    qtyClass = 'text-red-600';
                                    icon = '↩';
                                    break;
                                case InventoryTxType.RESTOCK_UNUSED:
                                    typeBadgeClass = 'bg-purple-100 text-purple-700';
                                    qtyClass = 'text-purple-600';
                                    icon = '↪';
                                    break;
                                case InventoryTxType.TRANSFER_OUT:
                                    typeBadgeClass = 'bg-indigo-100 text-indigo-700';
                                    qtyClass = 'text-indigo-600';
                                    icon = '📤';
                                    break;
                            }

                            return (
                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-slate-600 font-medium">{tx.date}</td>
                                    <td className="px-6 py-3">
                                        <div className="font-medium text-slate-800">{part?.name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-400 font-mono">{part?.partNumber}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${typeBadgeClass}`}>
                                            <span>{icon}</span> {translateValue(tx.type)}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-3 text-right font-bold ${qtyClass}`}>
                                        {tx.type === InventoryTxType.USAGE || tx.type === InventoryTxType.RETURN_VENDOR || tx.type === InventoryTxType.TRANSFER_OUT ? '-' : '+'}{tx.quantity} <span className="text-xs font-normal text-slate-500">{part?.unit}</span>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="text-slate-700 font-mono text-xs">{tx.referenceId || '-'}</div>
                                        {equipmentCode && <div className="text-xs text-slate-500">ယူနစ်: {String(equipmentCode)}</div>}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600 text-xs max-w-xs truncate">{tx.notes || '-'}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">{tx.performedBy}</td>
                                </tr>
                            );
                        })}
                        {filteredTransactions.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">သင့်စစ်ထုတ်မှုနှင့် ကိုက်ညီသော လှုပ်ရှားမှု မတွေ့ပါ။</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryTransactions;
