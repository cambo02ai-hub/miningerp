import { formatDate } from '../utils/locale';
import React, { useState, useEffect, useCallback } from 'react';
import { hseAPI, locationsAPI } from '../services/api';
import { ShieldAlert, Activity, Plus, MapPin, AlertTriangle } from 'lucide-react'; // Removed RefreshCw
import SearchableSelect from './SearchableSelect';

const HSEView: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Near Miss',
    locationDetail: '',
    description: '',
    status: 'Open',
    locationId: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [incidentsData, locationsData] = await Promise.all([
        hseAPI.getIncidents(),
        locationsAPI.getLocations()
      ]);

      setIncidents(incidentsData);
      setLocations(locationsData);

      // Set default location if available
      if (locationsData.length > 0 && !formData.locationId) {
        setFormData(prev => ({ ...prev, locationId: locationsData[0].id }));
      }

      setError(null);
    } catch (err: any) {
      console.error('Failed to load HSE data:', err);
      setError('Failed to load HSE data');
    } finally {
      setLoading(false);
    }
  }, [formData.locationId]); // Added formData.locationId to dependencies

  useEffect(() => {
    loadData();
  }, [loadData]); // Added loadData to dependencies

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hseAPI.reportIncident({
        date: formData.date,
        type: formData.type,
        locationId: formData.locationId,
        locationDetail: formData.locationDetail,
        description: formData.description,
        status: formData.status
      });

      await loadData(); // Refresh data
      setIsModalOpen(false);
      // Reset form (keep date)
      setFormData(prev => ({ ...prev, description: '', locationDetail: '' }));
    } catch (err: any) {
      alert("Failed to report incident: " + err.message);
    }
  };

  const typeOptions = [
    { value: 'Near Miss', label: 'အနီးကပ်ဘေးအန္တရာယ်' },
    { value: 'Property Damage', label: 'ပိုင်ဆိုင်မှုပျက်စီးမှု' },
    { value: 'Injury', label: 'ထိခိုက်ဒဏ်ရာ' },
    { value: 'Environmental', label: 'ပတ်ဝန်းကျင်' }
  ];

  const locationOptions = locations.map(l => ({
    value: l.id,
    label: l.name,
    subLabel: l.type
  }));

  if (loading && incidents.length === 0) {
    return <div className="p-8 text-center text-slate-500">HSE ဒေတာ တင်နေပါသည်...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">HSE စီမံခန့်ခွဲမှု</h2>
          <p className="text-slate-500 text-sm">ကျန်းမာရေး၊ ဘေးကင်းရေးနှင့် ပတ်ဝန်းကျင်ဖြစ်ရပ်များ မှတ်တမ်းတင်ခြင်း</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-colors"
        >
          <Plus size={18} />
          Report Incident
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadData} className="text-sm font-bold underline">ထပ်မံကြိုးစားရန်</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{incidents.length}</div>
            <div className="text-sm text-slate-500">ယခုနှစ် ဖြစ်ရပ်စုစုပေါင်း</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {incidents.filter(i => i.status !== 'Closed').length}
            </div>
            <div className="text-sm text-slate-500">စုံစမ်းစစ်ဆေးဆဲ ဖြစ်ရပ်များ</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">၁၄၅ ရက်</div>
            <div className="text-sm text-slate-500">အလုပ်ပျက်ရက်ဖြစ်စေသော ထိခိုက်မှုမရှိသည့်ရက်</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">ရက်စွဲ</th>
              <th className="px-6 py-4">အမျိုးအစား</th>
              <th className="px-6 py-4">တည်နေရာ</th>
              <th className="px-6 py-4">ဖော်ပြချက်</th>
              <th className="px-6 py-4">အခြေအနေ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-800 font-medium">{formatDate(inc.date)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${inc.type === 'Near Miss' ? 'bg-blue-100 text-blue-700' :
                      inc.type === 'Injury' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                    }`}>
                    {inc.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 flex items-center gap-1">
                  <MapPin size={14} className="text-slate-400" />
                  {inc.location_name}
                  {inc.location_detail && <span className="text-xs text-slate-400">({inc.location_detail})</span>}
                </td>
                <td className="px-6 py-4 text-slate-700">{inc.description}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${inc.status === 'Closed' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                    {inc.status}
                  </span>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No incidents reported.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-visible">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in overflow-visible">
            <h3 className="text-xl font-bold text-slate-900 mb-4">HSE ဖြစ်ရပ် တင်ပြရန်</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="hse-date" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ရက်စွဲ</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    id="hse-date"
                  />
                </div>
                <div>
                  <SearchableSelect
                    label="ဖြစ်ရပ်အမျိုးအစား"
                    options={typeOptions}
                    value={formData.type}
                    onChange={(val) => setFormData({ ...formData, type: val })}
                    id="hse-incident-type"
                  />
                </div>
              </div>

              <div>
                <SearchableSelect
                  label="လုပ်ငန်းခွင်တည်နေရာ"
                  options={locationOptions}
                  value={formData.locationId}
                  onChange={(val) => setFormData({ ...formData, locationId: val })}
                  required
                  id="hse-project-location"
                />
              </div>

              <div>
                <label htmlFor="hse-location-detail" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ဖြစ်ရပ်နေရာ အသေးစိတ်</label>
                <input
                  type="text"
                  required
                  placeholder="ဥပမာ - Pit A Ramp 4"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
                  value={formData.locationDetail}
                  onChange={e => setFormData({ ...formData, locationDetail: e.target.value })}
                  id="hse-location-detail"
                />
              </div>

              <div>
                <label htmlFor="hse-description" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ဖော်ပြချက်</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  id="hse-description"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HSEView;