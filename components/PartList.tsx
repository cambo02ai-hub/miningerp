import { formatNumber, translateValue } from '../utils/locale';
import { SparePart } from '../types';
import { Search, Filter, Trash2 } from 'lucide-react';

interface PartListProps {
    parts: SparePart[];
    filteredParts: SparePart[];
    masterSearchTerm: string;
    onMasterSearchTermChange: (term: string) => void;
    selectedStoreLocation: string;
    onStoreLocationChange: (storeId: string) => void;
    locations: any[];
    onTransaction: (part: SparePart) => void;
    onDelete: (id: string, partNumber: string) => void;
    getLocationName: (locationId?: string) => string;
}

const PartList: React.FC<PartListProps> = ({
    filteredParts,
    masterSearchTerm,
    onMasterSearchTermChange,
    selectedStoreLocation,
    onStoreLocationChange,
    locations,
    onTransaction,
    onDelete,
    getLocationName
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" /> Master Stock List
                    </h3>
                    {/* Multi-Store Location Filter Dropdown */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <label htmlFor="admin-store-location-filter" className="text-xs font-bold text-slate-500 uppercase">
                            Store / Site:
                        </label>
                        <select
                            id="admin-store-location-filter"
                            value={selectedStoreLocation}
                            onChange={(e) => onStoreLocationChange(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">ဂိုဒေါင် အားလုံး (All Stores)</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} ({loc.code || loc.type})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <label htmlFor="part-list-search-input" className="sr-only">ပစ္စည်းနံပါတ်၊ အမည်၊ တည်နေရာ ရှာရန်...</label>
                    <input
                        id="part-list-search-input"
                        type="text"
                        placeholder="ပစ္စည်းနံပါတ်၊ အမည်၊ တည်နေရာ ရှာရန်..."
                        className="text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        value={masterSearchTerm}
                        onChange={(e) => onMasterSearchTermChange(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                            <th className="px-6 py-4">ပစ္စည်းနံပါတ်</th>
                            <th className="px-6 py-4">ဖော်ပြချက်</th>
                            <th className="px-6 py-4">အမျိုးအစား</th>
                            <th className="px-6 py-4 text-right">စတော့</th>
                            <th className="px-6 py-4">တည်နေရာ</th>
                            <th className="px-6 py-4 text-center">လုပ်ဆောင်ချက်</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredParts.map((part) => (
                            <tr key={part.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-mono text-slate-700 font-medium">{part.partNumber}</td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-800 font-medium">{part.name}</div>
                                    <div className="text-xs text-slate-400">Brand: {part.brand || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                        {translateValue(part.category)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={`font-bold text-lg ${part.currentStock <= part.minStockLevel ? 'text-red-600' : 'text-slate-800'}`}>
                                        {formatNumber(part.currentStock)}
                                        <span className="text-xs font-normal text-slate-500 ml-1">{part.unit}</span>
                                    </div>
                                    {part.currentStock <= part.minStockLevel && (
                                        <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">ပြန်မှာယူရန် လိုအပ်သည်</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    <div className="font-medium">{getLocationName(part.locationId)}</div>
                                    <div className="text-xs font-mono text-slate-400">{part.location}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onTransaction(part)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            Transaction
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onDelete(part.id, part.partNumber);
                                            }}
                                            className="text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 hover:text-red-700 p-1.5 rounded transition-all cursor-pointer"
                                            title="ပစ္စည်းဖျက်ရန်"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredParts.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">သင့်ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ပါ။</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PartList;
