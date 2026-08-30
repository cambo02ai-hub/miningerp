import React, { useState, useEffect, useCallback } from 'react';
import { locationsAPI } from '../services/api';
import { MapPin, Plus, Building2, Trash2, Search, Map } from 'lucide-react'; // Removed RefreshCw
import SearchableSelect from './SearchableSelect';
import PitMapView from './PitMapView';

const LocationView: React.FC = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewTab, setViewTab] = useState<'LIST' | 'GIS_MAP'>('LIST');

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'Mine Site',
        address: '',
        city: ''
    });

    const loadLocations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await locationsAPI.getLocations();
            setLocations(data);
            setError(null);
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.error('Failed to load locations:', err);
            setError('Failed to load locations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await locationsAPI.createLocation(formData);
            await loadLocations(); // Reload list
            setIsModalOpen(false);
            setFormData({ code: '', name: '', type: 'Mine Site', address: '', city: '' });
        } catch (err: any) {
            alert('Failed to create location: ' + err.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete location: ${name}? This action is audited.`)) {
            try {
                await locationsAPI.deleteLocation(id);
                await loadLocations(); // Reload list
            } catch (e: any) {
                alert("Error deleting location: " + e.message);
            }
        }
    };

    const filteredLocations = locations.filter(loc =>
        (loc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loc.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loc.city || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const typeOptions = [
        { value: 'Mine Site', label: 'သတ္တုတွင်းနေရာ' },
        { value: 'Head Office', label: 'ရုံးချုပ်' },
        { value: 'Port', label: 'ဆိပ်ကမ်း' },
        { value: 'Workshop', label: 'အလုပ်ရုံ / စက်ရုံ' },
        { value: 'Camp', label: 'စခန်း / စားရိပ်သာ' },
        { value: 'WAREHOUSE', label: 'ဂိုဒေါင်' },
        { value: 'EXTERNAL', label: 'ပြင်ပ / ရောင်းချသူ' }
    ];

    if (loading && locations.length === 0) {
        return <div className="p-8 text-center text-slate-500">တည်နေရာများ တင်နေပါသည်...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">လုပ်ငန်းခွင် တည်နေရာများ</h2>
                    <p className="text-slate-500 text-sm">အခြေခံဒေတာ - လုပ်ငန်းခွင်၊ ဆိပ်ကမ်းနှင့် ရုံးများ</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setViewTab('LIST')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewTab === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                        >
                            တည်နေရာ စာရင်း
                        </button>
                        <button
                            onClick={() => setViewTab('GIS_MAP')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${viewTab === 'GIS_MAP' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'}`}
                        >
                            <Map size={14} /> GIS & 3D Pit Map
                        </button>
                    </div>

                    {viewTab === 'LIST' && (
                        <>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <label htmlFor="location-search-input" className="sr-only">တည်နေရာများ ရှာရန်...</label>
                                <input
                                    id="location-search-input"
                                    type="text"
                                    placeholder="တည်နေရာများ ရှာရန်..."
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
                                Add Location
                            </button>
                        </>
                    )}
                </div>
            </div>

            {viewTab === 'GIS_MAP' && (
                <PitMapView
                    locations={locations}
                    onAddLocation={async (newLoc) => {
                        await locationsAPI.createLocation(newLoc);
                        await loadLocations();
                    }}
                />
            )}

            {viewTab === 'LIST' && (
                <>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={loadLocations} className="text-sm font-bold underline">ထပ်မံကြိုးစားရန်</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredLocations.map(loc => (
                    <div key={loc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative">
                        {/* Delete Button - Fixed Z-Index, added background for hit area, and strict propagation stopping */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(loc.id, loc.name);
                            }}
                            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all z-50 cursor-pointer"
                            title="တည်နေရာဖျက်ရန်"
                        >
                            <Trash2 size={18} />
                        </button>

                        <div className="flex justify-between items-start mb-4 pr-10">
                            <div className="p-3 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Building2 size={24} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${loc.type === 'Mine Site' || loc.type === 'MINE_SITE' ? 'bg-amber-100 text-amber-700' :
                                    loc.type === 'Head Office' ? 'bg-purple-100 text-purple-700' :
                                        'bg-blue-100 text-blue-700'
                                }`}>
                                {loc.type}
                            </span>
                        </div>

                        <h3 className="font-bold text-lg text-slate-900">{loc.name}</h3>
                        <p className="text-sm text-slate-500 font-mono mb-4">{loc.code}</p>

                        <div className="space-y-2 border-t border-slate-100 pt-4">
                            <div className="flex items-start gap-2 text-sm text-slate-600">
                                <MapPin size={16} className="text-slate-400 mt-0.5" />
                                <span>{loc.address || 'No Address'}, {loc.city || ''}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && filteredLocations.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <p>No locations found matching &quot;{searchTerm}&quot;</p>
                </div>
            )}
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">တည်နေရာအသစ် ထည့်ရန်</h3>
                                <p className="text-xs text-slate-500 mt-1">လုပ်ငန်းခွင်တည်နေရာအသစ် မှတ်ပုံတင်ရန်</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="location-code" className="block text-xs font-bold text-slate-500 mb-1 uppercase">တည်နေရာကုဒ်</label>
                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="ဥပမာ - KJS" id="location-code" />
                                </div>
                                <div>
                                    <SearchableSelect label="အမျိုးအစား" options={typeOptions} value={formData.type} onChange={v => setFormData({ ...formData, type: v })} id="location-type" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="location-name" className="block text-xs font-bold text-slate-500 mb-1 uppercase">တည်နေရာအမည်</label>
                                <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="ဥပမာ - Satui သတ္တုတွင်းလုပ်ငန်းခွင်" id="location-name" />
                            </div>

                            <div>
                                <label htmlFor="location-city" className="block text-xs font-bold text-slate-500 mb-1 uppercase">မြို့ / ဧရိယာ</label>
                                <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} id="location-city" />
                            </div>

                            <div>
                                <label htmlFor="location-address" className="block text-xs font-bold text-slate-500 mb-1 uppercase">လိပ်စာအပြည့်အစုံ</label>
                                <textarea rows={2} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} id="location-address" />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">ပယ်ဖျက်ရန်</button>
                                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 flex items-center gap-2">
                                    <Plus size={16} /> Save Location
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationView;