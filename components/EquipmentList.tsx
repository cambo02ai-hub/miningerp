import { formatNumber } from '../utils/locale';
import { Filter, Search, ClipboardList, Gauge } from 'lucide-react';
import { Equipment } from '../types';

interface EquipmentListProps {
    filteredEquipment: Equipment[];
    filterType: string;
    setFilterType: (v: string) => void;
    filterStatus: string;
    setFilterStatus: (v: string) => void;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    openDetails: (eq: Equipment) => void;
    toggleStatus: (id: string, currentStatus: string) => void;
}

const EquipmentList: React.FC<EquipmentListProps> = ({
    filteredEquipment,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    openDetails,
    toggleStatus,
}) => {
    return (
        <>
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 flex gap-4 items-center shadow-sm justify-between">
                <div className="flex gap-4 items-center">
                    <Filter size={16} className="text-slate-500" />
                    <label htmlFor="fleet-filter-type" className="sr-only">အမျိုးအစား စစ်ထုတ်ရန်</label>
                    <select id="fleet-filter-type" className="border rounded px-2 py-1 text-sm bg-white text-slate-800 outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="All">အမျိုးအစားအားလုံး</option>
                        {['Excavator', 'Dump Truck', 'Dozer', 'Grader', 'LV', 'Water Truck', 'Tower Lamp', 'Pump'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label htmlFor="fleet-filter-status" className="sr-only">အခြေအနေ စစ်ထုတ်ရန်</label>
                    <select id="fleet-filter-status" className="border rounded px-2 py-1 text-sm bg-white text-slate-800 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="All">လက်ရှိအခြေအနေ</option>
                        {['Operational', 'Breakdown', 'Maintenance', 'Sold', 'Scrapped'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <label htmlFor="fleet-search-input" className="sr-only">ယူနစ်ရှာရန်</label>
                    <input
                        id="fleet-search-input"
                        type="text"
                        placeholder="ယူနစ်၊ ပိုင်ရှင်၊ Serial ရှာရန်..."
                        className="text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {filteredEquipment.map(eq => (
                    <div key={eq.id} className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 ${eq.status === 'Sold' ? 'opacity-75 bg-slate-50' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">{eq.code}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-500 text-sm">{eq.model} • {eq.manufactureYear || 'N/A'}</p>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded font-bold uppercase">{eq.type}</span>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${eq.status === 'Operational' ? 'bg-green-100 text-green-800 border-green-200' :
                                eq.status === 'Breakdown' ? 'bg-red-100 text-red-800 border-red-200' :
                                    'bg-slate-100 text-slate-800'
                                }`}>{eq.status}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4 border-t border-b border-slate-50 py-2">
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase">ပိုင်ရှင်</span>
                                <span className="font-bold">{eq.owner || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase">ကိုယ်ထည်နံပါတ်</span>
                                <span className="font-mono">{eq.chassisNumber || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase">Serial နံပါတ်</span>
                                <span className="font-mono">{eq.serialNumber || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-slate-400 uppercase">အင်ဂျင်နံပါတ်</span>
                                <span className="font-mono">{eq.engineNumber || '-'}</span>
                            </div>
                            {(eq.type === 'LV' || eq.type === 'Dump Truck' || eq.type === 'Water Truck') && (
                                <div className="col-span-2">
                                    <span className="block text-[10px] text-slate-400 uppercase">ယာဉ်နံပါတ်ပြား</span>
                                    <span className="bg-slate-100 px-1 rounded font-mono font-bold">{eq.plateNumber || '-'}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center text-sm text-slate-600 mb-4">
                            <span className="flex items-center font-bold text-slate-800">
                                <Gauge size={16} className="inline mr-1 text-blue-500" />
                                {eq.hourMeter > 0 ? `${formatNumber(eq.hourMeter)} HM` : `${formatNumber(eq.kilometer || 0)} KM`}
                            </span>
                            <span className="text-xs bg-slate-50 px-2 py-1 rounded">{eq.location}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-slate-100">
                            <button onClick={() => openDetails(eq)} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                                <ClipboardList size={14} /> View History
                            </button>
                            {eq.status !== 'Sold' && eq.status !== 'Scrapped' && (
                                <button onClick={() => toggleStatus(eq.id, eq.status)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                                    Change Status
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {filteredEquipment.length === 0 && (
                    <div className="col-span-full text-center py-10 text-slate-400">
                        No units found matching your filters.
                    </div>
                )}
            </div>
        </>
    );
};

export default EquipmentList;
