import { formatCurrency } from '../utils/locale';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { suppliersAPI, inventoryAPI, goldFinanceAPI } from '../services/api';
import { Landmark, AlertTriangle, Banknote, CalendarClock, CheckCircle, Filter, Search, DollarSign, Clock, Coins, Scale, ShieldCheck, Plus, Layers, Receipt, TrendingUp, Sparkles, Building2 } from 'lucide-react';
import { InventoryTransaction, GoldSaleRecord, RoyaltyFeeRecord } from '../types';

const DebtView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'AP_DEBT' | 'GOLD_SALES' | 'ROYALTIES' | 'OVERVIEW'>('AP_DEBT');
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [goldSales, setGoldSales] = useState<GoldSaleRecord[]>([]);
    const [royalties, setRoyalties] = useState<RoyaltyFeeRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InventoryTransaction | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterText, setFilterText] = useState('');

    // Gold Sale Modal State
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [saleForm, setSaleForm] = useState({
        date: new Date().toISOString().split('T')[0],
        batchId: `GOLD-BATCH-2025-${Math.floor(100 + Math.random() * 900)}`,
        goldWeightKyat: 10,
        goldWeightGrams: 166,
        purityPct: 99.9,
        pricePerKyat: 4500000,
        buyerName: 'Myanmar Gold Refinery Co., Ltd.',
        paymentStatus: 'PAID' as 'PAID' | 'PENDING' | 'PARTIAL',
        paidAmountMMK: 45000000,
        invoiceRef: `INV-GOLD-2025-${Math.floor(100 + Math.random() * 900)}`,
        notes: ''
    });

    // Royalty Settlement Modal State
    const [isRoyaltyModalOpen, setIsRoyaltyModalOpen] = useState(false);
    const [selectedRoyalty, setSelectedRoyalty] = useState<RoyaltyFeeRecord | null>(null);
    const [royaltyPaymentForm, setRoyaltyPaymentForm] = useState({
        paidDate: new Date().toISOString().split('T')[0],
        treasuryReceiptRef: `TR-MINING-2025-${Math.floor(1000 + Math.random() * 9000)}`
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [txData, supData, salesData, royaltyData] = await Promise.all([
                inventoryAPI.getTransactions(),
                suppliersAPI.getSuppliers(),
                goldFinanceAPI.getGoldSales(),
                goldFinanceAPI.getRoyaltyFees()
            ]);
            setTransactions(txData || []);
            setSuppliers(supData || []);
            setGoldSales(salesData || []);
            setRoyalties(royaltyData || []);
        } catch (err) {
            console.error('Failed to load financial data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate outstanding invoices from inventory purchase transactions
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

    // AP Debt Analytics
    const analytics = useMemo(() => {
        const totalDebt = outstandingInvoices.reduce((sum, inv) =>
            sum + (inv.quantity * (inv.pricePerUnit || 0)), 0
        );

        const today = new Date().toISOString().split('T')[0];
        const totalOverdue = outstandingInvoices
            .filter(inv => (inv.dueDate || '') < today)
            .reduce((sum, inv) => sum + (inv.quantity * (inv.pricePerUnit || 0)), 0);

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

    // Gold Sales Summary Metrics
    const goldSalesSummary = useMemo(() => {
        const totalRevenue = goldSales.reduce((sum, s) => sum + s.totalRevenueMMK, 0);
        const totalWeightKyat = goldSales.reduce((sum, s) => sum + s.goldWeightKyat, 0);
        const totalWeightGrams = goldSales.reduce((sum, s) => sum + s.goldWeightGrams, 0);
        const avgPricePerKyat = totalWeightKyat > 0 ? totalRevenue / totalWeightKyat : 0;
        const pendingPayments = goldSales
            .filter(s => s.paymentStatus !== 'PAID')
            .reduce((sum, s) => sum + (s.totalRevenueMMK - s.paidAmountMMK), 0);

        return {
            totalRevenue,
            totalWeightKyat,
            totalWeightGrams,
            avgPricePerKyat,
            pendingPayments,
            count: goldSales.length
        };
    }, [goldSales]);

    // Royalty Summary Metrics
    const royaltySummary = useMemo(() => {
        const totalRoyaltyGoldKyat = royalties.reduce((sum, r) => sum + r.royaltyGoldKyat, 0);
        const totalRoyaltyCashMMK = royalties.reduce((sum, r) => sum + r.cashValueEquivalentMMK, 0);
        const unpaidRoyaltyMMK = royalties
            .filter(r => r.status !== 'PAID')
            .reduce((sum, r) => sum + r.cashValueEquivalentMMK, 0);

        return {
            totalRoyaltyGoldKyat,
            totalRoyaltyCashMMK,
            unpaidRoyaltyMMK,
            count: royalties.length
        };
    }, [royalties]);

    // All-In Sustaining Cost (AISC) Unit Cost Calculation
    const aiscSummary = useMemo(() => {
        const totalRevenue = goldSalesSummary.totalRevenue;
        const totalGoldSoldKyat = goldSalesSummary.totalWeightKyat;
        const totalGoldSoldGrams = goldSalesSummary.totalWeightGrams;
        const apDebt = analytics.totalDebt;
        const royaltyPaid = royalties
            .filter(r => r.status === 'PAID')
            .reduce((sum, r) => sum + r.cashValueEquivalentMMK, 0);

        // Approximate OpEx (AP Debt + Paid Royalties + Fuel/Maintenance costs)
        const totalOpEx = apDebt + royaltyPaid;
        const netIncome = totalRevenue - totalOpEx;

        const aiscPerKyat = totalGoldSoldKyat > 0 ? totalOpEx / totalGoldSoldKyat : 0;
        const aiscPerGram = totalGoldSoldGrams > 0 ? totalOpEx / totalGoldSoldGrams : 0;

        return {
            totalRevenue,
            totalOpEx,
            apDebt,
            royaltyPaid,
            netIncome,
            aiscPerKyat,
            aiscPerGram
        };
    }, [goldSalesSummary, analytics, royalties]);

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
                paymentMethod: 'BANK_TRANSFER',
                notes: `Payment confirmed on ${paymentDate}`
            });

            loadData();
            setPaymentModalOpen(false);
            setSelectedInvoice(null);
        } catch (e: any) {
            alert("Error processing payment: " + e.message);
        }
    };

    const handleCreateGoldSale = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const grams = saleForm.goldWeightKyat * 16.6;
            const priceGram = saleForm.pricePerKyat / 16.6;
            const totalRev = saleForm.goldWeightKyat * saleForm.pricePerKyat;

            await goldFinanceAPI.createGoldSale({
                date: saleForm.date,
                batchId: saleForm.batchId,
                goldWeightKyat: Number(saleForm.goldWeightKyat),
                goldWeightGrams: Number(grams.toFixed(2)),
                purityPct: Number(saleForm.purityPct),
                pricePerKyat: Number(saleForm.pricePerKyat),
                pricePerGram: Number(priceGram.toFixed(2)),
                totalRevenueMMK: Number(totalRev),
                buyerName: saleForm.buyerName,
                paymentStatus: saleForm.paymentStatus,
                paidAmountMMK: saleForm.paymentStatus === 'PAID' ? totalRev : (saleForm.paymentStatus === 'PARTIAL' ? Number(saleForm.paidAmountMMK) : 0),
                invoiceRef: saleForm.invoiceRef,
                notes: saleForm.notes
            });

            loadData();
            setIsSaleModalOpen(false);
            alert("ရွှေရောင်းရငွေ စာရင်း တင်သွင်းပြီးပါပြီ!");
        } catch (e: any) {
            alert("ရွှေရောင်းရငွေ တင်သွင်းရာတွင် အမှားအယွင်းရှိပါသည်: " + e.message);
        }
    };

    const handleConfirmRoyaltyPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoyalty) return;
        try {
            await goldFinanceAPI.updateRoyaltyStatus(selectedRoyalty.id, {
                status: 'PAID',
                paidDate: royaltyPaymentForm.paidDate,
                treasuryReceiptRef: royaltyPaymentForm.treasuryReceiptRef
            });

            loadData();
            setIsRoyaltyModalOpen(false);
            setSelectedRoyalty(null);
            alert("တော်ဝင်ကြေး (Royalty Fee) ပေးချေမှု အတည်ပြုပြီးပါပြီ!");
        } catch (e: any) {
            alert("တော်ဝင်ကြေး အတည်ပြုရာတွင် အမှားရှိပါသည်: " + e.message);
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
            {/* Main Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="bg-amber-500/20 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <Coins size={12} /> Gold Mining Financial Workspace
                        </span>
                        <h2 className="text-2xl font-bold text-slate-800">ရွှေတူးဖော်ရေး ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု</h2>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        ပေးရန်ရှိအကြွေးများ၊ ရွှေရောင်းရငွေ၊ တော်ဝင်ကြေး (Royalty Tax) နှင့် All-In Sustaining Cost (AISC) ဘဏ္ဍာရေး စာရင်းများ။
                    </p>
                </div>

                {/* Tab Navigation Controls */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('AP_DEBT')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            activeTab === 'AP_DEBT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Landmark size={14} /> ပေးရန်ရှိ အကြွေးများ (AP)
                    </button>
                    <button
                        onClick={() => setActiveTab('GOLD_SALES')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            activeTab === 'GOLD_SALES' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Coins size={14} /> ရွှေရောင်းရငွေ (Gold Sales)
                    </button>
                    <button
                        onClick={() => setActiveTab('ROYALTIES')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            activeTab === 'ROYALTIES' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Building2 size={14} /> တော်ဝင်ကြေး (Royalties)
                    </button>
                    <button
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            activeTab === 'OVERVIEW' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <TrendingUp size={14} /> AISC & အနှစ်ချုပ်
                    </button>
                </div>
            </div>

            {/* TAB 1: SUPPLIER ACCOUNTS PAYABLE (AP) & AGING */}
            {activeTab === 'AP_DEBT' && (
                <div className="space-y-6 animate-fade-in">
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
                </div>
            )}

            {/* TAB 2: GOLD SALES & REVENUE TRACKING */}
            {activeTab === 'GOLD_SALES' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Controls & KPI Summary */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Coins size={20} className="text-amber-500" /> ရွှေရောင်းရငွေ မှတ်တမ်းများ (Gold Bar Sales)
                        </h3>
                        <button
                            onClick={() => setIsSaleModalOpen(true)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow"
                        >
                            <Plus size={16} /> ရွှေရောင်းရငွေ အသစ်ထည့်မည်
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                            <span className="text-xs font-bold text-amber-800 block uppercase">စုစုပေါင်း ရွှေရောင်းရငွေ (Revenue)</span>
                            <span className="text-xl font-black text-amber-950">{formatCurrency(goldSalesSummary.totalRevenue)}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                            <span className="text-xs font-bold text-amber-800 block uppercase">ရောင်းချပြီး ရွှေအလေးချိန်</span>
                            <span className="text-xl font-black text-slate-900">{goldSalesSummary.totalWeightKyat} <span className="text-xs font-normal">ကျပ် ({goldSalesSummary.totalWeightGrams} g)</span></span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <span className="text-xs font-bold text-slate-600 block uppercase">ပျမ်းမျှ ၁ ကျပ်စျေး</span>
                            <span className="text-xl font-black text-slate-900">{formatCurrency(goldSalesSummary.avgPricePerKyat)}</span>
                        </div>
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                            <span className="text-xs font-bold text-red-800 block uppercase">မရသေးသော ရွှေဖိုးငွေ</span>
                            <span className="text-xl font-black text-red-700">{formatCurrency(goldSalesSummary.pendingPayments)}</span>
                        </div>
                    </div>

                    {/* Gold Sales Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">ရက်စွဲ / Batch ID</th>
                                    <th className="px-6 py-3">ရွှေဝယ်ယူသူ / Refinery</th>
                                    <th className="px-6 py-3 text-right">အလေးချိန် (ကျပ် / g)</th>
                                    <th className="px-6 py-3 text-right">သန့်စင်မှု %</th>
                                    <th className="px-6 py-3 text-right">၁ ကျပ်စျေးနှုန်း</th>
                                    <th className="px-6 py-3 text-right">စုစုပေါင်း ငွေပမာဏ</th>
                                    <th className="px-6 py-3 text-center">အခြေအနေ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {goldSales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-800">{sale.date}</div>
                                            <div className="font-mono text-xs text-amber-700">{sale.batchId}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-slate-800">{sale.buyerName}</div>
                                            <div className="text-xs text-slate-400 font-mono">{sale.invoiceRef}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="font-extrabold text-slate-900">{sale.goldWeightKyat} ကျပ်</span>
                                            <span className="text-xs text-slate-400 block">({sale.goldWeightGrams} g)</span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs">{sale.purityPct}%</span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-700">{formatCurrency(sale.pricePerKyat)}</td>
                                        <td className="px-6 py-3 text-right font-extrabold text-emerald-700">{formatCurrency(sale.totalRevenueMMK)}</td>
                                        <td className="px-6 py-3 text-center">
                                            {sale.paymentStatus === 'PAID' ? (
                                                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 justify-center w-fit mx-auto">
                                                    <CheckCircle size={12} /> PAID
                                                </span>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full justify-center w-fit mx-auto block">
                                                    PENDING
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {goldSales.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">ရွှေရောင်းရငွေ မှတ်တမ်း မရှိသေးပါ။</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: GOVERNMENT ROYALTIES & MINING TAX */}
            {activeTab === 'ROYALTIES' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="bg-purple-800 text-purple-200 border border-purple-700 px-3 py-1 rounded-full text-xs font-bold inline-block mb-2">
                                Mining Law Compliance
                            </span>
                            <h3 className="text-xl font-black">ရွှေတူးဖော်ရေး တော်ဝင်ကြေး အခွန် (Government Royalties)</h3>
                            <p className="text-purple-200 text-xs mt-1">
                                နိုင်ငံတော်သို့ ပေးဆောင်ရမည့် ၅% တော်ဝင်ကြေး (Physical Gold Royalty / MMK Equivalent Value)။
                            </p>
                        </div>
                        <div className="bg-purple-800/80 p-4 rounded-xl border border-purple-700 text-right">
                            <span className="text-xs text-purple-300 uppercase block font-bold">မပေးရသေးသော တော်ဝင်ကြေး</span>
                            <span className="text-2xl font-black text-amber-300">{formatCurrency(royaltySummary.unpaidRoyaltyMMK)}</span>
                        </div>
                    </div>

                    {/* Royalties Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">ကာလ (Period)</th>
                                    <th className="px-6 py-3 text-right">စုစုပေါင်း ရွှေအထွက်</th>
                                    <th className="px-6 py-3 text-right">တော်ဝင်ကြေး %</th>
                                    <th className="px-6 py-3 text-right">ရွှေအလေးချိန် (ကျပ်)</th>
                                    <th className="px-6 py-3 text-right">MMK တန်ဖိုး</th>
                                    <th className="px-6 py-3">ပေးရန် သတ်မှတ်ရက်</th>
                                    <th className="px-6 py-3 text-center">အခြေအနေ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {royalties.map(royalty => (
                                    <tr key={royalty.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 font-bold text-purple-900">{royalty.period}</td>
                                        <td className="px-6 py-3 text-right font-medium">{royalty.goldProductionKyat} ကျပ်</td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-700">{royalty.royaltyRatePct}%</td>
                                        <td className="px-6 py-3 text-right font-extrabold text-amber-700">{royalty.royaltyGoldKyat} ကျပ်</td>
                                        <td className="px-6 py-3 text-right font-extrabold text-slate-900">{formatCurrency(royalty.cashValueEquivalentMMK)}</td>
                                        <td className="px-6 py-3 font-mono text-xs">{royalty.dueDate}</td>
                                        <td className="px-6 py-3 text-center">
                                            {royalty.status === 'PAID' ? (
                                                <div className="space-y-0.5">
                                                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 justify-center w-fit mx-auto">
                                                        <CheckCircle size={12} /> PAID
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono block">{royalty.treasuryReceiptRef}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedRoyalty(royalty);
                                                        setIsRoyaltyModalOpen(true);
                                                    }}
                                                    className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Confirm Payment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {royalties.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">တော်ဝင်ကြေး မှတ်တမ်း မရှိသေးပါ။</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: FINANCIAL OVERVIEW & AISC UNIT COST METRICS */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-fade-in">
                    {/* AISC Gold Mining Unit Cost Highlight */}
                    <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl space-y-4 border border-slate-800">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <div>
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    World Gold Council Standard
                                </span>
                                <h3 className="text-xl font-extrabold mt-1 text-slate-100">All-In Sustaining Cost (AISC) ရွှေ ၁ ကျပ် တူးဖော်မှု ကုန်ကျစရိတ်</h3>
                            </div>
                            <Sparkles size={32} className="text-amber-400" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs text-amber-400 font-bold block uppercase">AISC / ရွှေ ၁ ကျပ် ကုန်ကျစရိတ်</span>
                                <span className="text-2xl font-black text-slate-100">{formatCurrency(aiscSummary.aiscPerKyat)}</span>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs text-amber-400 font-bold block uppercase">AISC / ရွှေ ၁ ဂရမ် ကုန်ကျစရိတ်</span>
                                <span className="text-2xl font-black text-slate-100">{formatCurrency(aiscSummary.aiscPerGram)}</span>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs text-emerald-400 font-bold block uppercase">စုစုပေါင်း ရရှိငွေ (Gross Revenue)</span>
                                <span className="text-2xl font-black text-emerald-400">{formatCurrency(aiscSummary.totalRevenue)}</span>
                            </div>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <span className="text-xs text-amber-300 font-bold block uppercase">အသားတင် အမြတ် (Net Income)</span>
                                <span className="text-2xl font-black text-amber-400">{formatCurrency(aiscSummary.netIncome)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Expense & Revenue Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2 flex items-center gap-2">
                                <Receipt className="text-amber-600" size={18} /> Financial P&L Statement Summary
                            </h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-1 border-b border-slate-200">
                                    <span className="text-slate-700 font-medium">Gold Sales Revenue (ရွှေရောင်းရငွေ):</span>
                                    <span className="font-bold text-emerald-700">{formatCurrency(aiscSummary.totalRevenue)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200">
                                    <span className="text-slate-700 font-medium">Supplier AP Debt (ပစ္စည်း/စက်သုံးဆီ စရိတ်):</span>
                                    <span className="font-bold text-red-600">({formatCurrency(aiscSummary.apDebt)})</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-200">
                                    <span className="text-slate-700 font-medium">Government Royalties Paid (တော်ဝင်ကြေး):</span>
                                    <span className="font-bold text-purple-700">({formatCurrency(aiscSummary.royaltyPaid)})</span>
                                </div>
                                <div className="flex justify-between py-2 bg-slate-100 px-3 rounded-lg font-extrabold text-base border border-slate-300">
                                    <span className="text-slate-900">Net Mining Margin:</span>
                                    <span className={aiscSummary.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                                        {formatCurrency(aiscSummary.netIncome)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2 flex items-center gap-2">
                                <Scale className="text-purple-600" size={18} /> Mining Operational Ratios
                            </h4>
                            <div className="space-y-3 text-xs">
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                                    <span className="font-bold text-purple-900 block">Royalty Tax Ratio:</span>
                                    <span className="text-slate-800">
                                        ရွှေအထွက်၏ ၅.၀% ကို တော်ဝင်ကြေးအဖြစ် နိုင်ငံတော်သို့ ပေးဆောင်ရပါသည် (အထွက်ရွှေ သို့မဟုတ် ပြင်ပပေါက်စျေး)။
                                    </span>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                    <span className="font-bold text-blue-900 block">AP Coverage Ratio:</span>
                                    <span className="text-slate-800">
                                        လက်ရှိ ရွှေရောင်းရငွေသည် ပေးရန်ရှိအကြွေးများထက် {aiscSummary.apDebt > 0 ? (aiscSummary.totalRevenue / aiscSummary.apDebt).toFixed(2) : '10.0'}x ပိုမိုများပြားပါသည်။
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: INVENTORY AP PAYMENT CONFIRMATION */}
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
                            <button onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-xs">ပယ်ဖျက်ရန်</button>
                            <button onClick={confirmPayment} className="px-4 py-2 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-600/20">
                                <DollarSign size={16} /> Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: NEW GOLD SALE ENTRY MODAL */}
            {isSaleModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in flex flex-col">
                        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Coins size={18} /> ရွှေရောင်းရငွေ စာရင်း ထည့်သွင်းရန် (New Gold Sale Record)
                            </h3>
                            <button onClick={() => setIsSaleModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleCreateGoldSale} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">ရောင်းချသည့် ရက်စွဲ *</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-amber-500"
                                        value={saleForm.date}
                                        onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Batch / Lot ID *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-slate-300 rounded-lg p-2 font-mono outline-none focus:ring-2 focus:ring-amber-500"
                                        value={saleForm.batchId}
                                        onChange={e => setSaleForm({ ...saleForm, batchId: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block font-bold text-amber-900 mb-1">အလေးချိန် (ကျပ်) *</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            required
                                            className="w-full border border-amber-300 rounded-lg p-2 font-black text-slate-900 text-base outline-none focus:ring-2 focus:ring-amber-500"
                                            value={saleForm.goldWeightKyat}
                                            onChange={e => {
                                                const kyat = Number(e.target.value);
                                                setSaleForm({
                                                    ...saleForm,
                                                    goldWeightKyat: kyat,
                                                    goldWeightGrams: Number((kyat * 16.6).toFixed(2))
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-amber-900 mb-1">သန့်စင်မှု (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="50"
                                            max="100"
                                            className="w-full border border-amber-300 rounded-lg p-2 outline-none font-bold text-slate-800"
                                            value={saleForm.purityPct}
                                            onChange={e => setSaleForm({ ...saleForm, purityPct: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-amber-900 mb-1">၁ ကျပ်စျေး (MMK) *</label>
                                        <input
                                            type="number"
                                            step="10000"
                                            min="100000"
                                            required
                                            className="w-full border border-amber-300 rounded-lg p-2 font-bold text-slate-900 outline-none"
                                            value={saleForm.pricePerKyat}
                                            onChange={e => setSaleForm({ ...saleForm, pricePerKyat: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="text-[11px] font-semibold text-amber-900 flex justify-between pt-1">
                                    <span>Grams Equiv: {saleForm.goldWeightKyat * 16.6} g</span>
                                    <span>Est Total Revenue: <span className="font-extrabold text-emerald-800">{formatCurrency(saleForm.goldWeightKyat * saleForm.pricePerKyat)}</span></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">ဝယ်ယူသည့် ရွှေဆိုင် / Refinery *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-slate-300 rounded-lg p-2 outline-none"
                                        value={saleForm.buyerName}
                                        onChange={e => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">Invoice / Ref No.</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg p-2 outline-none font-mono"
                                        value={saleForm.invoiceRef}
                                        onChange={e => setSaleForm({ ...saleForm, invoiceRef: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">မှတ်ချက်</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg p-2 outline-none"
                                    placeholder="မှတ်ချက်များ..."
                                    value={saleForm.notes}
                                    onChange={e => setSaleForm({ ...saleForm, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button type="button" onClick={() => setIsSaleModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">
                                    မလုပ်တော့ပါ
                                </button>
                                <button type="submit" className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow">
                                    Save Gold Sale
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: ROYALTY SETTLEMENT CONFIRMATION MODAL */}
            {isRoyaltyModalOpen && selectedRoyalty && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col">
                        <div className="bg-purple-900 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Building2 size={18} /> တော်ဝင်ကြေး ပေးချေမှု အတည်ပြုရန်
                            </h3>
                            <button onClick={() => setIsRoyaltyModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleConfirmRoyaltyPayment} className="p-6 space-y-4 text-xs">
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Period:</span>
                                    <span className="font-bold text-purple-900">{selectedRoyalty.period}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Royalty Gold Weight:</span>
                                    <span className="font-bold text-amber-800">{selectedRoyalty.royaltyGoldKyat} ကျပ်</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">MMK Cash Equivalent:</span>
                                    <span className="font-extrabold text-slate-900">{formatCurrency(selectedRoyalty.cashValueEquivalentMMK)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">ပေးချေသည့် ရက်စွဲ</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500"
                                    value={royaltyPaymentForm.paidDate}
                                    onChange={e => setRoyaltyPaymentForm({ ...royaltyPaymentForm, paidDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Treasury Receipt / Challan Ref No.</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-slate-300 rounded-lg p-2 font-mono outline-none focus:ring-2 focus:ring-purple-500"
                                    value={royaltyPaymentForm.treasuryReceiptRef}
                                    onChange={e => setRoyaltyPaymentForm({ ...royaltyPaymentForm, treasuryReceiptRef: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button type="button" onClick={() => setIsRoyaltyModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">
                                    မလုပ်တော့ပါ
                                </button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow">
                                    Confirm Royalty Paid
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtView;