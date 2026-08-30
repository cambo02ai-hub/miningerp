import React, { useState, useEffect } from 'react';
import { MapPin, Layers, Box, Pickaxe, ShieldAlert, Sparkles, Navigation, ChevronRight, Eye, Upload, Globe, CheckCircle } from 'lucide-react';

export interface PitGisFeature {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  depthMeters: number;
  elevationMeters: number;
  estimatedOreTons: number;
  goldGradeGramsPerTon: number; // e.g. 4.8 g/t
  status: 'ACTIVE_DIGGING' | 'EXPLORATION' | 'MAINTENANCE' | 'COMPLETED';
  boundaryCoordinates: Array<[number, number]>;
}

const DEFAULT_PITS: PitGisFeature[] = [
  {
    id: 'pit-01',
    name: 'Pit Alpha - Main Vein',
    code: 'PIT-A1',
    lat: -3.4561,
    lng: 114.8123,
    depthMeters: 45,
    elevationMeters: 280,
    estimatedOreTons: 12500,
    goldGradeGramsPerTon: 5.2,
    status: 'ACTIVE_DIGGING',
    boundaryCoordinates: [
      [-3.455, 114.811],
      [-3.455, 114.814],
      [-3.458, 114.814],
      [-3.458, 114.811],
    ],
  },
  {
    id: 'pit-02',
    name: 'Pit Beta - Quartz Vein',
    code: 'PIT-B2',
    lat: -3.462,
    lng: 114.821,
    depthMeters: 30,
    elevationMeters: 310,
    estimatedOreTons: 8200,
    goldGradeGramsPerTon: 3.8,
    status: 'EXPLORATION',
    boundaryCoordinates: [
      [-3.461, 114.82],
      [-3.461, 114.822],
      [-3.463, 114.822],
      [-3.463, 114.82],
    ],
  },
  {
    id: 'pit-03',
    name: 'Pit Gamma - Deep Deposit',
    code: 'PIT-G3',
    lat: -3.471,
    lng: 114.805,
    depthMeters: 75,
    elevationMeters: 240,
    estimatedOreTons: 22000,
    goldGradeGramsPerTon: 6.5,
    status: 'ACTIVE_DIGGING',
    boundaryCoordinates: [
      [-3.47, 114.804],
      [-3.47, 114.807],
      [-3.473, 114.807],
      [-3.473, 114.804],
    ],
  },
];

const PitMapView: React.FC = () => {
  const [pits, setPits] = useState<PitGisFeature[]>(DEFAULT_PITS);
  const [selectedPit, setSelectedPit] = useState<PitGisFeature>(DEFAULT_PITS[0]);
  const [mapMode, setMapMode] = useState<'2D_SATELLITE' | '3D_ELEVATION' | 'GRADE_HEATMAP'>('2D_SATELLITE');
  const [pitch3d, setPitch3d] = useState(45);

  // Google Earth Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE_DIGGING':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Active Mining</span>;
      case 'EXPLORATION':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Exploration</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
              <Sparkles size={12} /> GIS Gold Mining Module
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">GIS & 3D Interactive Pit Mapping</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            ရွှေတူးဖော်သည့် Pit ကျင်းများ၏ GPS Coordinates၊ တူးဖော်ပြီးစီးမှု အနက် နှင့် ရွှေပါဝင်မှု အဆင့် (Gold Grade) များ။
          </p>
        </div>

        {/* View Mode Switcher & Import */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow text-xs flex items-center gap-1.5 transition-all"
          >
            <Globe size={14} /> Google Earth Import (KML/GeoJSON)
          </button>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMapMode('2D_SATELLITE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                mapMode === '2D_SATELLITE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} /> 2D GIS Satellite
            </button>
            <button
              onClick={() => setMapMode('3D_ELEVATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                mapMode === '3D_ELEVATION' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box size={14} /> 3D Depth Model
            </button>
            <button
              onClick={() => setMapMode('GRADE_HEATMAP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                mapMode === 'GRADE_HEATMAP' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={14} /> Gold Grade (g/t) Heatmap
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Viewer Canvas */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 flex flex-col relative h-[520px]">
          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-3 rounded-xl text-white text-xs space-y-1">
            <div className="font-bold flex items-center gap-2 text-amber-400">
              <Navigation size={14} /> GPS Mine Boundary Coordinates
            </div>
            <p className="font-mono text-[11px] text-slate-300">
              Lat: {selectedPit.lat.toFixed(4)}, Lng: {selectedPit.lng.toFixed(4)}
            </p>
            <div className="text-[10px] text-slate-400">Elevation: {selectedPit.elevationMeters}m AMSL</div>
          </div>

          {/* Interactive Simulated Map Canvas */}
          <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* 3D Depth Pitch Simulation Controls */}
            {mapMode === '3D_ELEVATION' && (
              <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-white text-xs space-y-2">
                <span className="font-bold text-amber-400 block">3D Tilt Angle: {pitch3d}°</span>
                <input
                  type="range"
                  min="0"
                  max="75"
                  value={pitch3d}
                  onChange={(e) => setPitch3d(Number(e.target.value))}
                  className="w-32 accent-amber-500"
                />
              </div>
            )}

            {/* Map Canvas Graphic */}
            <div
              className="relative w-full h-full max-w-xl max-h-96 flex items-center justify-center transition-all duration-500"
              style={{
                transform: mapMode === '3D_ELEVATION' ? `rotateX(${pitch3d}deg) rotateZ(-15deg)` : 'none',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Pit Contour Layers Simulation */}
              {pits.map((pit) => {
                const isSelected = pit.id === selectedPit.id;
                return (
                  <div
                    key={pit.id}
                    onClick={() => setSelectedPit(pit)}
                    className={`absolute rounded-2xl cursor-pointer transition-all duration-300 border-2 p-4 flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-2xl shadow-amber-500/20 scale-105 z-20'
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 z-10'
                    }`}
                    style={{
                      top: `${(pit.lat + 3.48) * 3000}%`,
                      left: `${(pit.lng - 114.8) * 3000}%`,
                      width: '180px',
                      height: '140px',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/30">
                        {pit.code}
                      </span>
                      <span className="text-[10px] font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded">
                        -{pit.depthMeters}m
                      </span>
                    </div>

                    <div className="my-1">
                      <div className="font-bold text-white text-xs truncate">{pit.name}</div>
                      <div className="text-[11px] font-extrabold text-amber-400 mt-0.5">
                        Grade: {pit.goldGradeGramsPerTon} g/t Gold
                      </div>
                    </div>

                    {/* 3D Depth Rings / Contours */}
                    <div className="w-full bg-slate-900/60 rounded-lg p-1.5 border border-slate-700 text-[10px] text-slate-300 flex justify-between">
                      <span>Ore: {pit.estimatedOreTons.toLocaleString()} Tons</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map Footer Legend */}
          <div className="bg-slate-950 p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Active Pit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Exploration
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> High Grade Ore (&gt; 5.0 g/t)
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Projection: WGS84 / UT-Zone 50S</span>
          </div>
        </div>

        {/* Selected Pit Details Side Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pit Location Details</span>
                <h3 className="font-extrabold text-lg text-slate-900">{selectedPit.name}</h3>
                <span className="font-mono text-xs font-bold text-blue-700">{selectedPit.code}</span>
              </div>
              {getStatusBadge(selectedPit.status)}
            </div>

            {/* Mining & Geology Metrics */}
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase block">Gold Grade (ရွှေပါဝင်မှု အဆင့်)</span>
                  <span className="text-2xl font-black text-amber-900">{selectedPit.goldGradeGramsPerTon} <span className="text-xs font-normal">g/t (Grams/Ton)</span></span>
                </div>
                <Sparkles className="text-amber-600" size={28} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">တူးဖော်ပြီး အနက် (Depth)</span>
                  <span className="font-extrabold text-slate-900 text-lg">-{selectedPit.depthMeters} <span className="text-xs font-normal text-slate-500">Meters</span></span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">အမြင့် (AMSL Elevation)</span>
                  <span className="font-extrabold text-slate-900 text-lg">+{selectedPit.elevationMeters} <span className="text-xs font-normal text-slate-500">Meters</span></span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>ခန့်မှန်း မြေရိုင်း တန်ချိန် (Ore Tonnage):</span>
                  <span className="font-extrabold text-slate-900">{selectedPit.estimatedOreTons.toLocaleString()} Tons</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ခန့်မှန်း ရွှေအထွက် ပမာဏ (Est. Gold Yield):</span>
                  <span className="font-extrabold text-emerald-700">
                    {((selectedPit.estimatedOreTons * selectedPit.goldGradeGramsPerTon) / 1000).toFixed(2)} Kg Gold
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => alert(`Centering map on ${selectedPit.name} Coordinates (${selectedPit.lat}, ${selectedPit.lng})`)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow"
            >
              <MapPin size={16} /> GPS တည်နေရာသို့ Zoom ဆွဲမည်
            </button>
          </div>
        </div>
      </div>

      {/* GOOGLE EARTH DATA IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-slate-900 to-emerald-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Globe size={18} /> Google Earth Spatial Data Import (KML / GeoJSON)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <p className="text-slate-600">
                Google Earth Pro မှ ထုတ်ယူထားသော **.KML** သို့မဟုတ် **GeoJSON** Spatial Polygons/Coordinates ဒေတာများကို တင်သွင်းပါက GIS Map ပေါ်တွင် ရွှေတူးဖော်မည့် Pit Boundary အဖြစ် အလိုအလျောက် သတ်မှတ်ပေးပါမည်။
              </p>

              {importSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-center font-bold text-sm space-y-2">
                  <CheckCircle className="mx-auto text-emerald-600" size={32} />
                  <div>Google Earth KML/GeoJSON Import အောင်မြင်ပါသည်!</div>
                  <p className="text-xs text-emerald-600 font-normal">Pit သစ်ကို GIS Map ပေါ်တွင် ထည့်သွင်းပြီးပါပြီ။</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-xl p-6 text-center space-y-2">
                    <Upload className="mx-auto text-emerald-600" size={28} />
                    <span className="font-bold text-slate-800 block text-sm">KML / GeoJSON File တင်ရန် (Upload)</span>
                    <label className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow">
                      <span>Browse KML File</span>
                      <input
                        type="file"
                        accept=".kml,.xml,.json,.geojson"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const content = evt.target?.result as string;
                              setImportText(content);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">သို့မဟုတ် KML / GeoJSON XML Content ကို တိုက်ရိုက် Paste လုပ်ပါ:</label>
                    <textarea
                      rows={5}
                      className="w-full border border-slate-300 rounded-xl p-3 font-mono text-[11px] outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={`<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Placemark>\n    <name>Pit Delta - Gold Vein</name>\n    <Polygon><outerBoundaryIs><LinearRing><coordinates>114.815,-3.450 114.818,-3.450 114.818,-3.453 114.815,-3.453</coordinates></LinearRing></outerBoundaryIs></Polygon>\n  </Placemark>\n</kml>`}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText('');
                  setImportSuccess(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                ပိတ်မည်
              </button>
              {!importSuccess && (
                <button
                  type="button"
                  onClick={() => {
                    // Extract Pit Name and Lat/Lng from KML or default fallback
                    const newPit: PitGisFeature = {
                      id: `pit-imported-${Date.now()}`,
                      name: importText.includes('<name>')
                        ? importText.split('<name>')[1]?.split('</name>')[0] || 'Imported KML Pit'
                        : 'Pit Delta - Gold Vein (KML)',
                      code: `PIT-KML-${Math.floor(100 + Math.random() * 900)}`,
                      lat: -3.450,
                      lng: 114.815,
                      depthMeters: 50,
                      elevationMeters: 290,
                      estimatedOreTons: 18000,
                      goldGradeGramsPerTon: 5.8,
                      status: 'ACTIVE_DIGGING',
                      boundaryCoordinates: [
                        [-3.450, 114.815],
                        [-3.450, 114.818],
                        [-3.453, 114.818],
                        [-3.453, 114.815],
                      ],
                    };
                    setPits((prev) => [...prev, newPit]);
                    setSelectedPit(newPit);
                    setImportSuccess(true);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5"
                >
                  <Globe size={14} /> Import Google Earth Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitMapView;
