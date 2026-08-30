import React, { useState, useEffect, useCallback } from 'react';
import { financeAPI } from '../services/api';
import { formatCurrency } from '../utils/locale';
import {
    DollarSign,
    TrendingUp,
    Gauge,
    Scale,
    PieChart,
    Wallet,
    FileSpreadsheet,
    Plus,
    CheckCircle,
    Clock,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Truck,
    Layers
} from 'lucide-react';

const FinanceView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ar' | 'cpt' | 'depreciation' | 'royalty' | 'budget' | 'cashflow' | 'reports'>('ar');
    const [loading, setLoading] = useState(false);

    // Data states
    const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
    const [costPerTon, setCostPerTon] = useState<any>(null);
    const [depreciation, setDepreciation] = useState<any[]>([]);
    const [royalties, setRoyalties] = useState<any[]>([]);
    const [budgetVariance, setBudgetVariance] = useState<any[]>([]);
    const [cashflowForecast, setCashflowForecast] = useState<any[]>([]);
    const [financialReport, setFinancialReport] = useState<any>(null);

    // Modal state for AR invoice creation
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        invoiceNumber: '',
        customerName: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        totalTonnage: 1000,
        pricePerTon: 85,
        coalGrade: 'CV 5000 kcal/kg',
        paymentTerms: 'NET 30',
        notes: ''
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [invoices, cpt, dep, roy, bgt, cf, report] = await Promise.all([
                financeAPI.getSalesInvoices().catch(() => []),
                financeAPI.getCostPerTon().catch(() => null),
                financeAPI.getEquipmentDepreciation().catch(() => []),
                financeAPI.getRoyalties().catch(() => []),
                financeAPI.getBudgetVariance(2025).catch(() => []),
                financeAPI.getCashFlowForecast().catch(() => []),
                financeAPI.getFinancialReport().catch(() => null)
            ]);

            setSalesInvoices(invoices);
            setCostPerTon(cpt);
            setDepreciation(dep);
            setRoyalties(roy);
            setBudgetVariance(bgt);
            setCashflowForecast(cf);
            setFinancialReport(report);
        } catch (error) {
            console.error('Failed to load finance data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const subtotal = newInvoice.totalTonnage * newInvoice.pricePerTon;
            const royaltyTax = subtotal * 0.05; // 5% estimate
            const totalAmount = subtotal + royaltyTax;

            await financeAPI.createSalesInvoice({
                ...newInvoice,
                subtotal,
                royaltyTax,
                totalAmount,
                status: 'UNPAID'
            });

            setInvoiceModalOpen(false);
            loadData();
        } catch (err: any) {
            alert('အဆင်မပြေပါ: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" />
                        ဘဏ္ဍာရေးနှင့် စာရင်းကိုင် စီမံခန့်ခွဲမှု (Mining Finance & ERP)
                    </h2>
                    <p className="text-slate-500 text-sm">
                        ရောင်းရငွေ (AR)၊ ၁တန်ကုန်ကျစရိတ် (CPT)၊ ယန္တရားတန်ဖိုးလျော့၊ အခွန်စာရင်း နှင့် ငွေသားစီမံခန့်ခွဲမှု Dashboard
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2">
                <button
                    onClick={() => setActiveTab('ar')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'ar' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <DollarSign size={16} /> 1. Accounts Receivable (AR)
                </button>
                <button
                    onClick={() => setActiveTab('cpt')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'cpt' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Gauge size={16} /> 2. Cost-Per-Ton (CPT)
                </button>
                <button
                    onClick={() => setActiveTab('depreciation')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'depreciation' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Clock size={16} /> 3. Hours Depreciation
                </button>
                <button
                    onClick={() => setActiveTab('royalty')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'royalty' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Scale size={16} /> 4. Royalty & Tax
                </button>
                <button
                    onClick={() => setActiveTab('budget')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'budget' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <PieChart size={16} /> 5. Budget & Variance
                </button>
                <button
                    onClick={() => setActiveTab('cashflow')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'cashflow' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Wallet size={16} /> 6. Cash Flow Forecast
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        activeTab === 'reports' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FileSpreadsheet size={16} /> 7. P&L & GL Report
                </button>
            </div>

            {loading && (
                <div className="p-8 text-center text-slate-400">ဘဏ္ဍာရေး အချက်အလက်များ တင်ယူနေပါသည်...</div>
            )}

            {!loading && (
                <div>
                    {/* TAB 1: Accounts Receivable */}
                    {activeTab === 'ar' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div>
                                    <h3 className="font-bold text-slate-800">ရောင်းရငွေ/ ရရန်ရှိအကြွေး စာရင်းများ (Sales Invoices & AR)</h3>
                                    <p className="text-xs text-slate-500">ကျောက်မီးသွေး ရောင်းချမှုအလိုက် Buyer များထံမှ ရရန်ရှိသော Invoices</p>
                                </div>
                                <button
                                    onClick={() => setInvoiceModalOpen(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700"
                                >
                                    <Plus size={16} /> Create Sales Invoice
                                </button>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                                        <tr>
                                            <th className="p-4">Invoice No</th>
                                            <th className="p-4">ဝယ်ယူသူ (Buyer)</th>
                                            <th className="p-4">ရက်စွဲ</th>
                                            <th className="p-4 text-right">တန်ချိန် (Tons)</th>
                                            <th className="p-4 text-right">၁ တန် ဈေးနှုန်း</th>
                                            <th className="p-4 text-right">စုစုပေါင်း ပမာဏ</th>
                                            <th className="p-4 text-center">အခြေအနေ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {salesInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                <td className="p-4 font-mono font-medium text-blue-600">{inv.invoiceNumber}</td>
                                                <td className="p-4 font-semibold text-slate-800">{inv.customerName}</td>
                                                <td className="p-4 text-slate-600">{inv.issueDate}</td>
                                                <td className="p-4 text-right font-medium">{inv.totalTonnage?.toLocaleString()} T</td>
                                                <td className="p-4 text-right">{formatCurrency(inv.pricePerTon)}</td>
                                                <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {salesInvoices.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-6 text-center text-slate-400">Sales Invoice မှတ်တမ်း မရှိသေးပါ။</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Cost Per Ton (CPT) */}
                    {activeTab === 'cpt' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-xs text-slate-500 font-semibold block uppercase">၁ တန် ထုတ်လုပ်မှု စရိတ် (Cost / Ton)</span>
                                    <span className="text-3xl font-extrabold text-blue-600">{formatCurrency(costPerTon?.costPerTon || 0)}</span>
                                    <span className="text-xs text-slate-400 block mt-1">Total Mining CPT</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-xs text-slate-500 font-semibold block uppercase">မြေစာ ၁ BCM ဖယ်ရှားစရိတ် (Cost / BCM)</span>
                                    <span className="text-3xl font-extrabold text-purple-600">{formatCurrency(costPerTon?.costPerBcm || 0)}</span>
                                    <span className="text-xs text-slate-400 block mt-1">OB Removal CPT</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-xs text-slate-500 font-semibold block uppercase">စုစုပေါင်း ထွက်ရှိတန်ချိန်</span>
                                    <span className="text-3xl font-extrabold text-slate-900">{costPerTon?.totalProductionTons?.toLocaleString() || 0} T</span>
                                    <span className="text-xs text-emerald-600 block mt-1 font-semibold">Active Month</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-xs text-slate-500 font-semibold block uppercase">စုစုပေါင်း ကုန်ကျစရိတ်</span>
                                    <span className="text-3xl font-extrabold text-slate-900">{formatCurrency(costPerTon?.totalCost || 0)}</span>
                                    <span className="text-xs text-slate-400 block mt-1">All Operational Expenses</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <PieChart className="text-blue-600" size={18} />
                                    Cost Breakdown per Activity (လုပ်ငန်းအလိုက် ကုန်ကျစရိတ် ခွဲခြမ်းစိတ်ဖြာမှု)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                        <span className="text-xs font-bold text-amber-800 uppercase block">Fuel & Fuel Logs</span>
                                        <span className="text-xl font-bold text-slate-900">{formatCurrency(costPerTon?.fuelCost || 0)}</span>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <span className="text-xs font-bold text-blue-800 uppercase block">Spare Parts & Maintenance</span>
                                        <span className="text-xl font-bold text-slate-900">{formatCurrency(costPerTon?.maintenanceCost || 0)}</span>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                        <span className="text-xs font-bold text-purple-800 uppercase block">Contractor Mining Services</span>
                                        <span className="text-xl font-bold text-slate-900">{formatCurrency(costPerTon?.contractorCost || 0)}</span>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <span className="text-xs font-bold text-emerald-800 uppercase block">Government Royalty</span>
                                        <span className="text-xl font-bold text-slate-900">{formatCurrency(costPerTon?.royaltyCost || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Hours-based Depreciation */}
                    {activeTab === 'depreciation' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Truck className="text-purple-600" size={18} />
                                    Equipment Operating Hours Depreciation (စက်ယန္တရားများ၏ မောင်းနှင်ချိန်အလိုက် တန်ဖိုးလျော့တွက်ချက်မှု)
                                </h3>
                                <p className="text-xs text-slate-500">Excavator, Dump Truck စသည်တို့၏ Engine Hours (HM) အပေါ် အခြေခံထားသော Depreciation Report</p>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                                    <tr>
                                        <th className="p-3">Equipment Code</th>
                                        <th className="p-3">Model</th>
                                        <th className="p-3 text-right">ဝယ်ယူသည့် တန်ဖိုး</th>
                                        <th className="p-3 text-right">မောင်းနှင်ချိန် (Hours/HM)</th>
                                        <th className="p-3 text-right">၁ နာရီ တန်ဖိုးလျော့နှုန်း</th>
                                        <th className="p-3 text-right">စုစုပေါင်း တန်ဖိုးလျော့ပမာဏ</th>
                                        <th className="p-3 text-right">လက်ရှိ စာရင်းကျန် တန်ဖိုး (NBV)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {depreciation.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold text-blue-600">{d.equipmentCode}</td>
                                            <td className="p-3 text-slate-700">{d.model}</td>
                                            <td className="p-3 text-right">{formatCurrency(d.purchasePrice)}</td>
                                            <td className="p-3 text-right font-medium text-amber-700">{d.totalEngineHours} hrs</td>
                                            <td className="p-3 text-right">{formatCurrency(d.hourlyDepreciationRate)}/hr</td>
                                            <td className="p-3 text-right font-medium text-red-600">{formatCurrency(d.accumulatedDepreciation)}</td>
                                            <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(d.netBookValue)}</td>
                                        </tr>
                                    ))}
                                    {depreciation.length === 0 && (
                                        <tr><td colSpan={7} className="p-6 text-center text-slate-400">စက်ယန္တရား စာရင်း မရှိသေးပါ။</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB 4: Royalty & Tax */}
                    {activeTab === 'royalty' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800">Mining Royalty & State Environmental Tax (သယံဇာတအခွန် နှင့် ပတ်ဝန်းကျင်ထိန်းသိမ်းရေး အခကြေးငွေ)</h3>
                                <p className="text-xs text-slate-500">အစိုးရ သယံဇာတ ဝန်ကြီးဌာနသို့ ပေးဆောင်ရန်ရှိသော အခွန်စာရင်းများ</p>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                                    <tr>
                                        <th className="p-3">ကာလ (Period)</th>
                                        <th className="p-3 text-right">တူးဖော်ထုတ်လုပ် တန်ချိန်</th>
                                        <th className="p-3 text-right">Royalty Rate (%)</th>
                                        <th className="p-3 text-right">Royalty Amount</th>
                                        <th className="p-3 text-right">Environmental Tax</th>
                                        <th className="p-3 text-right">စုစုပေါင်း ပေးဆောင်ရန်</th>
                                        <th className="p-3 text-center">အခြေအနေ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {royalties.map((r, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-semibold">{r.periodName}</td>
                                            <td className="p-3 text-right">{r.productionVolumeTons?.toLocaleString()} T</td>
                                            <td className="p-3 text-right font-bold text-purple-600">{r.royaltyRatePercent}%</td>
                                            <td className="p-3 text-right">{formatCurrency(r.royaltyAmount)}</td>
                                            <td className="p-3 text-right">{formatCurrency(r.environmentalTax)}</td>
                                            <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(r.totalTaxDue)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    r.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {royalties.length === 0 && (
                                        <tr><td colSpan={7} className="p-6 text-center text-slate-400">Royalty မှတ်တမ်း မရှိသေးပါ။</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB 5: Budget & Variance */}
                    {activeTab === 'budget' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800">Budgeting & Variance Analysis (ဘတ်ဂျက်နှင့် အမှန်တကယ် ကုန်ကျစရိတ် နှိုင်းယှဉ်မှု)</h3>
                                <p className="text-xs text-slate-500">သတ်မှတ်ထားသော ဘတ်ဂျက်ထက် ကျော်လွန်နေသော ကဏ္ဍများကို စောင့်ကြည့်ခြင်း</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {budgetVariance.map((b, i) => (
                                    <div key={i} className={`p-4 rounded-xl border ${b.status === 'OVER_BUDGET' ? 'bg-red-50/50 border-red-200' : 'bg-emerald-50/50 border-emerald-200'} space-y-2`}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-800">{b.categoryName}</span>
                                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${b.status === 'OVER_BUDGET' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {b.status === 'OVER_BUDGET' ? 'Over Budget' : 'Within Budget'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Allocated Budget:</span>
                                            <span className="font-semibold">{formatCurrency(b.allocatedBudget)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Actual Spent:</span>
                                            <span className="font-semibold">{formatCurrency(b.actualSpent)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t">
                                            <span className="font-bold text-slate-700">Variance:</span>
                                            <span className={`font-bold ${b.varianceAmount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {formatCurrency(b.varianceAmount)} ({b.variancePercentage}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 6: Cash Flow Forecast */}
                    {activeTab === 'cashflow' && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800">Weekly Cash Flow Forecast (အပတ်စဉ် ငွေသားစီးဆင်းမှု ကြိုတင်ခန့်မှန်းချက်)</h3>
                                <p className="text-xs text-slate-500">ဝင်ရန်ရှိ (AR) နှင့် ထွက်ရန်ရှိ (AP) စာရင်းများအပေါ် အခြေခံထားသော Cash Projection</p>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                                    <tr>
                                        <th className="p-3">အပတ်စဉ် (Week Period)</th>
                                        <th className="p-3 text-right">ဝင်ရန်ရှိ (Expected Inflows AR)</th>
                                        <th className="p-3 text-right">ထွက်ရန်ရှိ (Expected Outflows AP)</th>
                                        <th className="p-3 text-right">အသားတင် ငွေသား (Net Cash)</th>
                                        <th className="p-3 text-right">ခန့်မှန်း လက်ကျန်ငွေ (Ending Balance)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cashflowForecast.map((cf, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-bold text-slate-800">{cf.weekPeriod}</td>
                                            <td className="p-3 text-right text-emerald-600 font-semibold">+{formatCurrency(cf.expectedInflowsAR)}</td>
                                            <td className="p-3 text-right text-red-600 font-semibold">-{formatCurrency(cf.expectedOutflowsAP)}</td>
                                            <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(cf.netCashFlow)}</td>
                                            <td className="p-3 text-right font-extrabold text-slate-900">{formatCurrency(cf.endingCashBalance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB 7: Financial Reports (P&L & GL) */}
                    {activeTab === 'reports' && (
                        financialReport ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                    <span className="text-xs font-semibold text-slate-500 block uppercase">Total Revenue (ရောင်းရငွေ)</span>
                                    <span className="text-3xl font-extrabold text-emerald-600">{formatCurrency(financialReport.totalRevenue)}</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                    <span className="text-xs font-semibold text-slate-500 block uppercase">Cost of Goods Sold (COGS)</span>
                                    <span className="text-3xl font-extrabold text-amber-600">{formatCurrency(financialReport.costOfGoodsSold)}</span>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                    <span className="text-xs font-semibold text-slate-500 block uppercase">Net Profit (အသားတင် အမြတ်)</span>
                                    <span className="text-3xl font-extrabold text-blue-600">{formatCurrency(financialReport.netProfit)}</span>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="font-bold text-slate-800">Profit & Loss Summary (အမြတ်/အရှုံး စာရင်းချုပ်)</h3>
                                <div className="divide-y divide-slate-100 text-sm">
                                    <div className="py-2.5 flex justify-between">
                                        <span className="text-slate-600">Gross Sales Revenue:</span>
                                        <span className="font-bold">{formatCurrency(financialReport.totalRevenue)}</span>
                                    </div>
                                    <div className="py-2.5 flex justify-between">
                                        <span className="text-slate-600">Cost of Mining Production (COGS):</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(financialReport.costOfGoodsSold)}</span>
                                    </div>
                                    <div className="py-2.5 flex justify-between font-bold text-slate-900 bg-slate-50 px-2 rounded">
                                        <span>Gross Profit:</span>
                                        <span>{formatCurrency(financialReport.grossProfit)}</span>
                                    </div>
                                    <div className="py-2.5 flex justify-between">
                                        <span className="text-slate-600">Operating Expenses (OPEX):</span>
                                        <span className="font-bold text-red-600">-{formatCurrency(financialReport.operatingExpenses)}</span>
                                    </div>
                                    <div className="py-3 flex justify-between font-extrabold text-lg text-emerald-600 bg-emerald-50/50 px-2 rounded">
                                        <span>Net Operating Income:</span>
                                        <span>{formatCurrency(financialReport.netProfit)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">P&L အစီရင်ခံစာ အချက်အလက်များ မရှိသေးပါ။</div>
                        )
                    )}
                </div>
            )}

            {/* Create Sales Invoice Modal */}
            {invoiceModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <form onSubmit={handleCreateInvoice} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-900">Sales Invoice အသစ် ဖန်တီးရန်</h3>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Invoice Number</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. INV-2025-001"
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                value={newInvoice.invoiceNumber}
                                onChange={e => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">ဝယ်ယူသူ (Customer / Buyer Name)</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Energy Power Co., Ltd."
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                value={newInvoice.customerName}
                                onChange={e => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">တန်ချိန် (Tonnage)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    value={newInvoice.totalTonnage}
                                    onChange={e => setNewInvoice({ ...newInvoice, totalTonnage: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">၁ တန် ဈေးနှုန်း ($/Ton)</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    value={newInvoice.pricePerTon}
                                    onChange={e => setNewInvoice({ ...newInvoice, pricePerTon: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setInvoiceModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-semibold text-sm"
                            >
                                ပယ်ဖျက်ရန်
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700"
                            >
                                သိမ်းဆည်းမည်
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FinanceView;
