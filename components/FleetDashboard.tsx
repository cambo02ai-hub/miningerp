import { formatNumber } from '../utils/locale';

import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Truck, Activity, Wrench, Clock, RefreshCw } from 'lucide-react';

const FleetDashboard: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pie Chart Colors
    const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const stats = await dashboardAPI.getFleetStats();
            setData(stats);
            setError(null);
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.error('Failed to load fleet stats:', err);
            setError('Failed to load fleet dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return <div className="p-8 text-center text-slate-500">ယာဉ်/စက် ဒက်ရှ်ဘုတ် တင်နေပါသည်...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-2">{error}</div>
                <button onClick={loadData} className="text-blue-600 underline">ထပ်မံကြိုးစားရန်</button>
            </div>
        );
    }

    const analytics = data?.analytics || { totalUnits: 0, pa: 0, breakdownUnits: 0, statusDistribution: [] };
    const predictiveMaint = data?.predictiveMaint || [];
    const statusDistribution = analytics.statusDistribution || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">ယာဉ်/စက် အနှစ်ချုပ်</h2>
                <button
                    onClick={loadData}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="ဒေတာ ပြန်တင်ရန်"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                        <Truck size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{analytics.totalUnits}</div>
                        <div className="text-sm text-slate-500">ယာဉ်/စက် စုစုပေါင်း</div>
                    </div>
                </div>
                <div className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 ${analytics.pa < 85 ? 'border-red-200 bg-red-50' : ''}`}>
                    <div className={`p-3 rounded-full ${analytics.pa < 85 ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-600'}`}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{analytics.pa}%</div>
                        <div className="text-sm text-slate-500">လက်တွေ့အသုံးပြုနိုင်မှု</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{analytics.breakdownUnits}</div>
                        <div className="text-sm text-slate-500">ပျက်စီးနေသော ယူနစ်များ</div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">
                            {predictiveMaint.filter((p: any) => p.urgency === 'Critical' || p.urgency === 'Overdue').length}
                        </div>
                        <div className="text-sm text-slate-500">ပြုပြင်ထိန်းသိမ်းရန် ရောက်ရှိနေသော ယူနစ်များ</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fleet Status Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-slate-400" /> Fleet Status Distribution
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Predictive Maintenance List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[26rem]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-blue-500" /> Upcoming Service Monitor
                        </h3>
                        <div className="text-xs font-mono text-slate-400">နာရီ ၂၅၀ ကြားကာလအပေါ် အခြေခံထားသည်</div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {predictiveMaint.map((unit: any) => (
                            <div key={unit.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${unit.color.replace('bg-', 'text-').replace('500', '600')}`}></span>
                                        <span className="font-bold text-slate-900">{unit.code}</span>
                                        <span className="text-xs text-slate-500">{unit.model}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${unit.urgency === 'Overdue' ? 'bg-red-100 text-red-700 animate-pulse' :
                                            unit.urgency === 'Critical' ? 'bg-red-50 text-red-600' :
                                                unit.urgency === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                                        }`}>
                                        {unit.urgency}
                                    </span>
                                </div>

                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>နောက်တစ်ကြိမ်: <strong>{unit.serviceType}</strong></span>
                                    <span>ပြုပြင်ရမည့် HM: {formatNumber(unit.nextServiceHM)} HM</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                                    <div
                                        className={`h-2 rounded-full ${unit.color}`}
                                        style={{ width: `${Math.min(100, (unit.currentHM / unit.nextServiceHM) * 100)}%` }}
                                    ></div>
                                </div>

                                <div className="text-right text-[10px] text-slate-400">
                                    {unit.hoursRemaining} hours remaining
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetDashboard;