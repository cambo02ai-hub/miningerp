import { formatCurrency } from '../utils/locale';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { suppliersAPI, inventoryAPI } from '../services/api';
import { Landmark, AlertTriangle, Banknote, CalendarClock, CheckCircle, Filter, Search, DollarSign, Clock } from 'lucide-react';
import { InventoryTransaction } from '../types';

const DebtView: React.FC = () => {
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InventoryTransaction | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterText, setFilterText] = useState('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [txData, supData] = await Promise.all([
                inventoryAPI.getTransactions(),
                suppliersAPI.getSuppliers()
            ]);
            setTransactions(txData);
            setSuppliers(supData);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate outstanding invoices from transactions
    const outstandingInvoices = useMemo(() => {
        return transactions.filter(tx =>
            tx.type === 'PURCHASE' &&
            tx.paymentType === 'CREDIT' &&
            tx.paymentStatus !== 'PAID'
        );
    }, [transactions]);

    // AP Aging Calculation (0-30, 31-60, 61-90, 90+ days)
    const agingBuckets = useMemo(() => {
        const now = new Date();
        let bucket0To30 = 0;
        let bucket31To60 = 0;
        let bucket61To90 = 0;
        let bucket90Plus = 0;

        outstandingInvoices.forEach((inv) => {
            const amount = inv.quantity * (inv.pricePerUnit || 0);
            const invDate = new Date(inv.date || inv.dueDate || new Date());
            const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 3600 * 24));

            if (diffDays <= 30) bucket0To30 += amount;
            else if (diffDays <= 60) bucket31To60 += amount;
            else if (diffDays <= 90) bucket61To90 += amount;
            else bucket90Plus += amount;
        });

        return { bucket0To30, bucket31To60, bucket61To90, bucket90Plus };
    }, [outstandingInvoices]);

    // Calculate analytics
    const analytics = useMemo(() => {
        const totalDebt = outstandingInvoices.reduce((sum, inv) =>
            sum + (inv.quantity * (inv.pricePerUnit || 0)), 0
        );

        const today = new Date().toISOString().split('T')[0];
        const totalOverdue = outstandingInvoices
            .filter(inv => (inv.dueDate || '') < today)
            .reduce((sum, inv) => sum + (inv.quantity * (inv.pricePerUnit || 0)), 0);

        // Group by supplier
        const debtBySupplierMap: Record<string, number> = {};
        outstandingInvoices.forEach(inv => {
            const supplierId = inv.supplierId || 'Unknown';
            const amount = inv.quantity * (inv.pricePerUnit || 0);
            debtBySupplierMap[supplierId] = (debtBySupplierMap[supplierId] || 0) + amount;
        });

        const debtBySupplier = Object.entries(debtBySupplierMap).map(([supplierId, amount]) => ({
            name: suppliers.find(s => s.id === supplierId)?.name || 'Unknown',
            amount
        })).sort((a, b) => b.amount - a.amount);

        return {
            totalDebt,
            totalOverdue,
            count: outstandingInvoices.length,
            debtBySupplier
        };
    }, [outstandingInvoices, suppliers]);

    const handlePayClick = (tx: InventoryTransaction) => {
        setSelectedInvoice(tx);
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!selectedInvoice) return;
        try {
            await inventoryAPI.updateTransaction(selectedInvoice.id, {
                paymentStatus: 'PAID',
                paymentDate: paymentDate,
                paymentMethod: 'BANK_TRANSFER', // Default or add UI selector
                notes: `Payment confirmed on ${paymentDate}`
            });

            // Refresh data
            loadData();
            setPaymentModalOpen(false);
            setSelectedInvoice(null);
        } catch (e: any) {
            alert("Error processing payment: " + e.message);
        }
    };

    const filteredInvoices = useMemo(() => {
        return outstandingInvoices.filter(inv => {
            const supplierName = suppliers.find(s => s.id === inv.supplierId)?.name || '';
            const searchStr = `${supplierName} ${inv.referenceId}`.toLowerCase();
            return searchStr.includes(filterText.toLowerCase());
        });
    }, [outstandingInvoices, filterText, suppliers]);

    const today = new Date().toISOString().split('T')[0];

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="text-slate-500">တင်နေပါသည်...</div></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ပေးရန်ရှိသော အကြွေးစာရင်း</h2>
                    <p className="text-slate-500 text-sm">ပေးချေရန်ကျန်ရှိသော ပစ္စည်းရောင်းချသူ ငွေတောင်းခံလွှာများကို စောင့်ကြည့်ပြီး ရှင်းလင်းပါ။</p>
                </div>
            </div>

            {/* AP AGING ANALYSIS BUCKETS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Clock size={16} className="text-purple-600" />
                        Supplier Accounts Payable (AP) Aging Analysis
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">0 - 90+ Days Aging Breakdown</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase block">0 - 30 ရက် (Current)</span>
                        <span className="font-extrabold text-slate-900 text-base">{formatCurrency(agingBuckets.bucket0To30)}</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <span className="text-[11px] font-bold text-blue-800 uppercase block">31 - 60 ရက်</span>
                        <span className="font-extrabold text-slate-900 text-base">{formatCurrency(agingBuckets.bucket31To60)}</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg">
                        <span className="text-[11px] font-bold text-amber-800 uppercase block">61 - 90 ရက်</span>
                        <span className="font-extrabold text-slate-900 text-base">{formatCurrency(agingBuckets.bucket61To90)}</span>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg">
                        <span className="text-[11px] font-bold text-red-800 uppercase block">90+ ရက် (High Overdue)</span>
                        <span className="font-extrabold text-red-700 text-base">{formatCurrency(agingBuckets.bucket90Plus)}</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(analytics.totalDebt)}</div>
                        <div className="text-sm text-slate-500">စုစုပေါင်း ပေးရန်ရှိအကြွေး</div>
                    </div>
                </div>
                <div className={`bg-white p-5 rounded-xl shadow-sm border ${analytics.totalOverdue > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'} flex items-center gap-4`}>
                    <div className={`p-3 rounded-full ${analytics.totalOverdue > 0 ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-600'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(analytics.totalOverdue)}</div>
                        <div className="text-sm text-slate-500">သတ်မှတ်ရက်ကျော် ပမာဏ</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <Banknote size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{analytics.count}</div>
                        <div className="text-sm text-slate-500">မပေးချေရသေးသော ငွေတောင်းခံလွှာများ</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Invoice List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Filter size={18} className="text-slate-400" /> Outstanding Invoices
                        </h3>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <label htmlFor="debt-filter-input" className="sr-only">ရောင်းချသူ / PO ရှာရန်...</label>
                            <input
                                id="debt-filter-input"
                                type="text"
                                placeholder="ရောင်းချသူ / PO ရှာရန်..."
                                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[500px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">ပေးချေရမည့်ရက်</th>
                                    <th className="px-6 py-3">ပစ္စည်းရောင်းချသူ</th>
                                    <th className="px-6 py-3">PO ကိုးကားချက်</th>
                                    <th className="px-6 py-3 text-right">ပမာဏ</th>
                                    <th className="px-6 py-3 text-center">လုပ်ဆောင်ချက်</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInvoices.map(inv => {
                                    const isOverdue = (inv.dueDate || '') < today;
                                    const supplierName = suppliers.find(s => s.id === inv.supplierId)?.name || 'Unknown';
                                    const amount = inv.quantity * (inv.pricePerUnit || 0);
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className={`flex items-center gap-2 font-medium ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                                    <CalendarClock size={14} />
                                                    {inv.dueDate}
                                                </div>
                                                {isOverdue && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 rounded font-bold ml-6">ရက်ကျော်နေသည်</span>}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-800">{supplierName}</td>
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">{inv.referenceId}</td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-800">{formatCurrency(amount)}</td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={() => handlePayClick(inv)}
                                                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded hover:bg-green-100 font-bold flex items-center gap-1 mx-auto transition-colors"
                                                >
                                                    <CheckCircle size={12} /> Pay
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredInvoices.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">ပေးရန်ကျန် ငွေတောင်းခံလွှာ မတွေ့ပါ။</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Supplier Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-bold text-slate-800">ရောင်းချသူအလိုက် အကြွေး</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {analytics.debtBySupplier.map((s, idx) => (
                            <div key={idx} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50">
                                <span className="font-medium text-slate-700">{s.name}</span>
                                <span className="font-bold text-slate-900">{formatCurrency(s.amount)}</span>
                            </div>
                        ))}
                        {analytics.debtBySupplier.length === 0 && (
                            <div className="p-6 text-center text-slate-400 italic">အကြွေးမှတ်တမ်း မရှိပါ။</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">ငွေပေးချေမှု အတည်ပြုရန်</h3>
                        <p className="text-sm text-slate-500 mb-4">Mark Invoice {selectedInvoice.referenceId} as PAID</p>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Supplier:</span>
                                <span className="font-bold">{suppliers.find(s => s.id === selectedInvoice.supplierId)?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Amount:</span>
                                <span className="font-bold">{formatCurrency(selectedInvoice.quantity * (selectedInvoice.pricePerUnit || 0))}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Due Date:</span>
                                <span className="text-red-600 font-medium">{selectedInvoice.dueDate}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label htmlFor="payment-date-input" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ငွေပေးချေသည့်ရက်</label>
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                value={paymentDate}
                                onChange={e => setPaymentDate(e.target.value)}
                                id="payment-date-input"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">ပယ်ဖျက်ရန်</button>
                            <button onClick={confirmPayment} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-600/20">
                                <DollarSign size={16} /> Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtView;