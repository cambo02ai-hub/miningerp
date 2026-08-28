import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import { formatNumber } from '../utils/locale';
import { Card, StatCard, Badge, SectionHeader } from './ui/Card';
import { Pickaxe, Database, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError('ဒက်ရှ်ဘုတ်ဒေတာ တင်ရာတွင် မအောင်မြင်ပါ');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return <div className="p-8 text-center text-text-muted">ဒက်ရှ်ဘုတ်ဒေတာ တင်နေပါသည်...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-jpmonitor-red mb-2">{error}</div>
        <button onClick={loadData} className="text-jpmonitor-red underline">ထပ်မံကြိုးစားရန်</button>
      </div>
    );
  }

  const totalCoal = stats?.production?.totalCoal ?? 0;
  const totalOB = stats?.production?.totalOB ?? 0;
  const avgSR = stats?.production?.avgSR ?? 0;
  const chartData = stats?.production?.chartData ?? [];
  const fleetAvail = stats?.fleet?.availability ?? 0;
  const fleetTotal = stats?.fleet?.total ?? 0;
  const fleetOps = stats?.fleet?.operational ?? 0;
  const lowStockCount = stats?.inventory?.lowStockCount ?? 0;
  const lowStockItems = stats?.inventory?.lowStockItems ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="အုပ်ချုပ်မှု ဒက်ရှ်ဘုတ်"
        subtitle="လက်ရှိလုပ်ငန်းအခြေအနေနှင့် KPI များ"
        action={
          <button onClick={loadData} className="p-2 border border-border rounded-jpmonitor hover:bg-bg-elevated transition-colors text-text-muted" title="ပြန်တင်ရန်">
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="စုစုပေါင်း ကျောက်မီးသွေး (MT)"
          value={formatNumber(totalCoal, 0)}
          icon={<Pickaxe size={20} />}
          trend={{ value: 4.5, positive: true }}
        />
        <StatCard
          label="စုစုပေါင်း မြေဖုံးလွှာ (BCM)"
          value={formatNumber(totalOB, 0)}
          icon={<Database size={20} />}
        />
        <StatCard
          label="ပျမ်းမျှ မြေသားအချိုး"
          value={avgSR}
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="ယာဉ်/စက် လည်ပတ်နိုင်မှု"
          value={`${formatNumber(fleetAvail, 0)}%`}
          icon={<AlertTriangle size={20} />}
          trend={{ value: Math.max(fleetTotal - fleetOps, 0), positive: fleetTotal - fleetOps === 0 }}
        />
      </div>

      {/* Charts & Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Chart */}
        <Card className="lg:col-span-2 p-6" hover={false}>
          <h3 className="text-lg font-light text-text-primary tracking-tight mb-4" style={{ letterSpacing: '-0.01em' }}>ထုတ်လုပ်မှုပမာဏ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: 'var(--shadow-elevated)' }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 500 }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }} />
              <Bar yAxisId="left" dataKey="OB" fill="#3b82f6" name="Overburden (BCM)" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar yAxisId="right" dataKey="Coal" fill="#16a34a" name="Coal (MT)" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Inventory Health */}
        <Card className="p-6" hover={false}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-light text-text-primary tracking-tight" style={{ letterSpacing: '-0.01em' }}>စတော့အခြေအနေ</h3>
            {lowStockCount > 0 && <Badge variant="error">{formatNumber(lowStockCount, 0)} သတိပေးချက်</Badge>}
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {lowStockCount === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted py-8">
                <CheckCircle size={32} className="text-status-success mb-2" />
                <p className="text-sm font-medium">စတော့အဆင့် ကောင်းမွန်သည်</p>
              </div>
            ) : (
              lowStockItems.map((item: any) => (
                <div key={item.id} className="bg-jpmonitor-red-subtle border border-jpmonitor-red/30 p-3 rounded-jpmonitor">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <span className="text-xs font-mono text-jpmonitor-red font-bold">{formatNumber(item.currentStock, 0)} {item.unit}</span>
                  </div>
                  <p className="text-xs text-text-muted mb-2">အနည်းဆုံး: {formatNumber(item.minStockLevel, 0)} - {item.partNumber}</p>
                  <div className="w-full bg-jpmonitor-red/20 rounded-full h-1.5">
                    <div className="bg-jpmonitor-red h-1.5 rounded-full" style={{ width: Math.min((item.currentStock / item.minStockLevel) * 100, 100) + '%' }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;
