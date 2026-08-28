import { formatCurrency, translateValue } from '../utils/locale';
import React, { useState, useEffect, useCallback } from 'react';
import { suppliersAPI, equipmentAPI, maintenanceAPI, inventoryAPI } from '../services/api';
import { ShoppingBag, Phone, MapPin, Star, Plus, ClipboardList, Package, Receipt, Trash2, Search } from 'lucide-react'; // Removed unused InventoryTxType import, Wrench is used in detail tab
import SearchableSelect from './SearchableSelect';
import { Supplier } from '../types'; // Removed unused InventoryTxType

const SupplierView: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [detailTab, setDetailTab] = useState<'service' | 'parts'>('service');
    const [searchTerm, setSearchTerm] = useState('');
    const [serviceHistory, setServiceHistory] = useState<any[]>([]);
    const [supplyHistory, setSupplyHistory] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        type: 'Both',
        contactPerson: '',
        phone: '',
        address: '',
        rating: 5
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [supData, eqData] = await Promise.all([
                suppliersAPI.getSuppliers(),
                equipmentAPI.getEquipment()
            ]);
            setSuppliers(supData);
            setEquipment(eqData);
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data from API
    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await suppliersAPI.createSupplier(formData);
            await loadData();
            setIsModalOpen(false);
            setFormData({ name: '', type: 'Both', contactPerson: '', phone: '', address: '', rating: 5 });
        } catch (err: any) {
            alert(err.message || 'Failed to create supplier');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete supplier: ${name}? This action is audited.`)) {
            try {
                await suppliersAPI.deleteSupplier(id);
                await loadData();
            } catch (e: any) {
                alert("Error deleting supplier: " + e.message);
            }
        }
    };

    const openDetail = async (s: Supplier) => {
        setSelectedSupplier(s);
        setDetailTab(s.type === 'Parts Vendor' ? 'parts' : 'service'); // Default tab based on type

        // Load history
        try {
            const [maintData, invData] = await Promise.all([
                maintenanceAPI.getMaintenanceRecords({ supplierId: s.id }),
                inventoryAPI.getTransactions({ supplier_id: s.id, type: 'IN' })
            ]);
            setServiceHistory(maintData);
            setSupplyHistory(invData);
        } catch (err) {
            console.error("Failed to load supplier history", err);
            setServiceHistory([]);
            setSupplyHistory([]);
        }
    };

    const filteredSuppliers = suppliers.filter(sup =>
        sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sup.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sup.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const typeOptions = [
        { value: 'Parts Vendor', label: 'အပိုပစ္စည်းရောင်းချသူ' },
        { value: 'Service Workshop', label: 'ပြင်ပဝန်ဆောင်မှုအလုပ်ရုံ' },
        { value: 'Both', label: 'ပစ္စည်းနှင့် ဝန်ဆောင်မှု နှစ်မျိုးလုံး' },
    ];

    // Total Spend Calculations
    const totalServiceSpend = serviceHistory.reduce((acc, curr) => acc + (curr.externalCost || 0), 0);
    const totalPartsSpend = supplyHistory.reduce((acc, tx) => {
        const price = tx.pricePerUnit || 0;
        return acc + (tx.quantity * price);
    }, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-500">ရောင်းချသူဒေတာ တင်နေပါသည်...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <p className="font-bold">ရောင်းချသူဒေတာ တင်ရာတွင် အမှားရှိပါသည်</p>
                <p className="text-sm">{error}</p>
                <button onClick={loadData} className="mt-2 text-sm underline">ထပ်မံကြိုးစားရန်</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ပစ္စည်းရောင်းချသူ စီမံခန့်ခွဲမှု</h2>
                    <p className="text-slate-500 text-sm">ပြင်ပအလုပ်ရုံ၊ အပိုပစ္စည်းရောင်းချသူနှင့် ကန်ထရိုက်တာများ</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <label htmlFor="supplier-search-input" className="sr-only">ရောင်းချသူများ ရှာရန်...</label>
                        <input
                            id="supplier-search-input"
                            type="text"
                            placeholder="ရောင်းချသူများ ရှာရန်..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={18} />
                        ရောင်းချသူ မှတ်ပုံတင်ရန်
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map(sup => (
                    <div key={sup.id} role="button" tabIndex={0} onClick={() => openDetail(sup)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetail(sup) }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow cursor-pointer group relative">

                        {/* Delete Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(sup.id, sup.name);
                            }}
                            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all z-50"
                            title="ရောင်းချသူဖျက်ရန်"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="flex justify-between items-start mb-4 pr-8">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{sup.name}</h3>
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 inline-block ${sup.type === 'Service Workshop' ? 'bg-purple-100 text-purple-600' :
                                    sup.type === 'Parts Vendor' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {translateValue(sup.type)}
                                </span>
                            </div>
                            <div className="flex items-center bg-amber-50 text-amber-500 px-2 py-1 rounded font-bold text-sm">
                                <Star size={14} className="fill-amber-500 mr-1" />
                                {sup.rating}
                            </div>
                        </div>

                        <div className="space-y-2 mt-2 flex-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <ShoppingBag size={14} className="text-slate-400" />
                                {sup.contactPerson}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={14} className="text-slate-400" />
                                {sup.phone}
                            </div>
                            <div className="flex items-start gap-2 text-sm text-slate-600">
                                <MapPin size={14} className="text-slate-400 mt-0.5" />
                                {sup.address}
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            အသေးစိတ်မှတ်တမ်းကြည့်ရန် နှိပ်ပါ
                        </div>
                    </div>
                ))}
            </div>

            {filteredSuppliers.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <p>ကိုက်ညီသော ရောင်းချသူ မတွေ့ပါ။ ရှာဖွေမှု: &quot;{searchTerm}&quot;</p>
                </div>
            )}

            {/* Register Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">ရောင်းချသူအသစ် ထည့်ရန်</h3>
                                <p className="text-xs text-slate-500 mt-1">ရောင်းချသူ အခြေခံဒေတာ</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="supplier-name" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ကုမ္ပဏီအမည်</label>
                                <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} id="supplier-name" />
                            </div>

                            <div>
                                <SearchableSelect label="ရောင်းချသူအမျိုးအစား" options={typeOptions} value={formData.type} onChange={v => setFormData({ ...formData, type: v })} id="supplier-type" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="supplier-contact" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ဆက်သွယ်ရန်ပုဂ္ဂိုလ်</label>
                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} id="supplier-contact" />
                                </div>
                                <div>
                                    <label htmlFor="supplier-phone" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ဖုန်း</label>
                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} id="supplier-phone" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="supplier-address" className="block text-xs font-bold text-slate-500 mb-1 uppercase">လိပ်စာ</label>
                                <textarea rows={2} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} id="supplier-address" />
                            </div>

                            <div>
                                <label htmlFor="supplier-rating" className="block text-xs font-bold text-slate-500 mb-1 uppercase">အဆင့်သတ်မှတ်ချက် (၁-၅)</label>
                                <input type="number" min="1" max="5" required className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.rating} onChange={e => setFormData({ ...formData, rating: Number(e.target.value) })} id="supplier-rating" />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">ပယ်ဖျက်ရန်</button>
                                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 flex items-center gap-2">
                                    <Plus size={16} /> Save Supplier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL (Service/Supply History) */}
            {selectedSupplier && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-fade-in overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{selectedSupplier.name}</h2>
                                <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                    <span className="flex items-center gap-1"><Star size={14} className="fill-amber-500 text-amber-500" /> {selectedSupplier.rating} Rating</span>
                                    <span className="flex items-center gap-1"><Phone size={14} /> {selectedSupplier.phone}</span>
                                    <span className="flex items-center gap-1"><MapPin size={14} /> {selectedSupplier.address}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedSupplier(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setDetailTab('service')}
                                className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 border-b-2 transition-colors ${detailTab === 'service' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="flex items-center gap-2">ဝန်ဆောင်မှုမှတ်တမ်း (Work Order များ)</span> {/* Replaced Wrench with span/text if icon import is tricky or just text */}
                            </button>
                            <button
                                onClick={() => setDetailTab('parts')}
                                className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 border-b-2 transition-colors ${detailTab === 'parts' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                <Package size={16} /> Parts Supplied
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {detailTab === 'service' ? (
                                <div className="space-y-4">
                                    {serviceHistory.length === 0 ? (
                                        <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                                            <ClipboardList size={40} className="mb-2 opacity-50" />
                                            <p>ဤရောင်းချသူအတွက် ပြင်ပဝန်ဆောင်မှုမှတ်တမ်း မတွေ့ပါ။</p>
                                            <p className="text-xs">Work Order များကို EXTERNAL ဟု သတ်မှတ်ပြီး ဤရောင်းချသူနှင့် ချိတ်ဆက်ထားကြောင်း သေချာပါစေ။</p>
                                        </div>
                                    ) : (
                                        serviceHistory.map(log => (
                                            <div key={log.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{log.woNumber}</span>
                                                    <span className="text-sm font-bold text-slate-900">{formatCurrency(log.externalCost || 0)}</span>
                                                </div>
                                                <div className="flex gap-4 text-sm text-slate-600 mb-2">
                                                    <span className="font-bold flex items-center gap-1"><Receipt size={14} /> Inv: {log.externalInvoiceNumber || 'N/A'}</span>
                                                    <span>ရက်စွဲ: {log.endDate}</span>
                                                    <span>ယူနစ်: <strong>{equipment.find((e: any) => e.id === log.equipmentId)?.code}</strong></span>
                                                </div>
                                                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded italic">&quot;{log.description}&quot;</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <table className="w-full text-sm text-left bg-white rounded-lg overflow-hidden border border-slate-200">
                                        <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">ရက်စွဲ</th>
                                                <th className="px-4 py-3">ကိုးကား (PO)</th>
                                                <th className="px-4 py-3">ပစ္စည်း</th>
                                                <th className="px-4 py-3 text-right">အရေအတွက်</th>
                                                <th className="px-4 py-3 text-right">တစ်ယူနစ်စျေးနှုန်း</th>
                                                <th className="px-4 py-3 text-right">စုစုပေါင်း</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {supplyHistory.map(tx => {
                                                // const part = db.spareParts.find(p => p.id === tx.partId);
                                                // TODO: Load parts from API when supply history is enabled
                                                const part = tx.part || { name: 'မသိရှိရသေးသော ပစ္စည်း', partNumber: '', brand: '' };
                                                const unitPrice = tx.pricePerUnit || 0;
                                                const quantity = tx.quantity || 0;
                                                const total = quantity * unitPrice;
                                                return (
                                                    <tr key={tx.id}>
                                                        <td className="px-4 py-3 text-slate-600">{tx.date}</td>
                                                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{tx.referenceId || '-'}</td>
                                                        <td className="px-4 py-3 font-medium text-slate-800">
                                                            {part?.name}
                                                            <div className="text-[10px] text-slate-400 font-mono">{part?.partNumber} ({part?.brand})</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-700">{quantity}</td>
                                                        <td className="px-4 py-3 text-right text-slate-600">
                                                            {unitPrice > 0 ? formatCurrency(unitPrice) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                            {total > 0 ? formatCurrency(total) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {supplyHistory.length === 0 && (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">ဤရောင်းချသူ ID အတွက် ဝယ်ယူမှုမှတ်တမ်း မတွေ့ပါ။</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer Summary */}
                        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-sm">
                            <span className="text-slate-500">စုစုပေါင်းအသုံးစရိတ် (ဝန်ဆောင်မှု + ပစ္စည်း):</span>
                            <div className="text-right">
                                <span className="font-bold text-slate-900 text-lg block">
                                    {formatCurrency(totalServiceSpend + totalPartsSpend)}
                                </span>
                                <span className="text-xs text-slate-400">
                                    (ဝန်ဆောင်မှု: {formatCurrency(totalServiceSpend)} + ပစ္စည်း: {formatCurrency(totalPartsSpend)})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierView;