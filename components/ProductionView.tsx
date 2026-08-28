import { formatDate, formatNumber, translateStatus } from '../utils/locale';
import React, { useState, useEffect, useCallback } from 'react';
import { productionAPI } from '../services/api';
import { Plus, FileText } from 'lucide-react'; // Removed FileCheck, AlertCircle
import SearchableSelect from './SearchableSelect';

const ProductionView: React.FC = () => {
  const [productionData, setProductionData] = useState<any[]>([]);
  const [pits, setPits] = useState<any[]>([]);
  const [stockpiles, setStockpiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    pitId: '',
    shift: 'Day',
    overburdenBcm: 0,
    coalMt: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [records, pitsData, stockpilesData] = await Promise.all([
        productionAPI.getRecords(),
        productionAPI.getPits(),
        productionAPI.getStockpiles()
      ]);

      setProductionData(records);
      setPits(pitsData);
      setStockpiles(stockpilesData);

      // Set default pit if available
      if (pitsData.length > 0 && !formData.pitId) { // Dependency for formData.pitId
        setFormData(prev => ({ ...prev, pitId: pitsData[0].id }));
      }

      setError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to load production data:', err);
      setError('Failed to load production data');
    } finally {
      setLoading(false);
    }
  }, [formData.pitId]); // Added formData.pitId as dependency for loadData

  useEffect(() => {
    loadData();
  }, [loadData]); // Added loadData to dependencies

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productionAPI.createRecord({
        date: formData.date,
        pitId: formData.pitId,
        shift: formData.shift as 'Day' | 'Night',
        overburdenBcm: Number(formData.overburdenBcm),
        coalMt: Number(formData.coalMt),
      });

      await loadData(); // Refresh data
      setIsModalOpen(false);
      // Reset form (keep date and shift)
      setFormData(prev => ({ ...prev, overburdenBcm: 0, coalMt: 0 }));
    } catch (err: any) {
      alert("Transaction Failed: " + err.message);
    }
  };

  const pitOptions = pits.map(p => ({
    value: p.id,
    label: p.name,
    subLabel: p.block
  }));

  if (loading && productionData.length === 0) {
    return <div className="p-8 text-center text-slate-500">ထုတ်လုပ်မှုဒေတာ တင်နေပါသည်...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ထုတ်လုပ်မှု ထိန်းချုပ်ရေး</h2>
          <p className="text-sm text-slate-500">အလုပ်ချိန်မှတ်တမ်းနှင့် ထုတ်လုပ်မှုစစ်ဆေးခြင်း</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800 transition-colors"
        >
          <Plus size={18} />
          New Production Record
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadData} className="text-sm font-bold underline">ထပ်မံကြိုးစားရန်</button>
        </div>
      )}

      {/* Stockpile Overview Mini-View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {stockpiles.map(sp => (
          <div key={sp.id} className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{sp.name}</h4>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-900">{formatNumber(Number(sp.current_volume_mt))}</p>
                <span className="text-sm text-slate-500 font-medium">MT</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">ဆံ့ပမာဏ: {formatNumber(Number(sp.capacity_mt))} MT</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {Math.round((Number(sp.current_volume_mt) / Number(sp.capacity_mt)) * 100)}%
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">အသုံးချမှု</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">လှုပ်ရှားမှု ID</th>
              <th className="px-6 py-4">ရက်စွဲ / အလုပ်ချိန်</th>
              <th className="px-6 py-4">တည်နေရာ</th>
              <th className="px-6 py-4 text-right">မြေဖုံးလွှာ (BCM)</th>
              <th className="px-6 py-4 text-right">ကျောက်မီးသွေး (MT)</th>
              <th className="px-6 py-4 text-right">S/R</th>
              <th className="px-6 py-4 text-center">အခြေအနေ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productionData.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-mono text-slate-400 text-xs group-hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2">
                  <FileText size={14} />
                  {record.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 text-slate-800">
                  <div className="font-medium">{formatDate(record.date)}</div>
                  <div className="text-xs text-slate-500 bg-slate-100 inline-block px-1.5 rounded mt-0.5">{record.shift}</div>
                </td>
                <td className="px-6 py-4 text-slate-800">
                  {record.pit_name}
                  <div className="text-xs text-slate-400">{record.pit_block}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-700">{formatNumber(Number(record.overburden_bcm))}</td>
                <td className="px-6 py-4 text-right font-mono text-slate-900 font-bold">{formatNumber(Number(record.coal_mt))}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-bold ${Number(record.stripping_ratio) > 6 ? 'text-red-500' : 'text-green-600'}`}>
                    {Number(record.stripping_ratio).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${record.status === 'Approved' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                    {translateStatus(record.status)}
                  </span>
                </td>
              </tr>
            ))}
            {productionData.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  No production records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in overflow-visible">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">ထုတ်လုပ်မှု မှတ်တမ်းတင်ရန်</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transaction affects: <span className="font-mono bg-slate-100 px-1">သိုလှောင်စတော့</span>
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="production-date" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ရက်စွဲ</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    id="production-date"
                  />
                </div>
                <div>
                  <label htmlFor="production-shift" className="block text-xs font-bold text-slate-500 mb-1 uppercase">အလုပ်ချိန်</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={formData.shift}
                    onChange={e => setFormData({ ...formData, shift: e.target.value as 'Day' | 'Night' })}
                    id="production-shift"
                  >
                    <option value="Day">နေ့ပိုင်းအလုပ်ချိန်</option>
                    <option value="Night">ညပိုင်းအလုပ်ချိန်</option>
                  </select>
                </div>
              </div>

              <div>
                <SearchableSelect
                  label="တည်နေရာ (Pit)"
                  options={pitOptions}
                  value={formData.pitId}
                  onChange={(val) => setFormData({ ...formData, pitId: val })}
                  id="production-pit-location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <label htmlFor="production-ob-bcm" className="block text-xs font-bold text-blue-800 mb-1.5 uppercase">မြေဖုံးလွှာ (BCM)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.overburdenBcm}
                    onChange={e => setFormData({ ...formData, overburdenBcm: Number(e.target.value) })}
                    id="production-ob-bcm"
                  />
                </div>
                <div>
                  <label htmlFor="production-coal-mt" className="block text-xs font-bold text-green-800 mb-1.5 uppercase">ကျောက်မီးသွေး (MT)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.coalMt}
                    onChange={e => setFormData({ ...formData, coalMt: Number(e.target.value) })}
                    id="production-coal-mt"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Commit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionView;