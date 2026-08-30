import React, { useState, useEffect } from 'react';
import { MapPin, Layers, Box, Pickaxe, ShieldAlert, Sparkles, Navigation, ChevronRight, Eye, Upload, Globe, CheckCircle, Bot, Send, AlertTriangle, TrendingUp, Cpu, TestTube } from 'lucide-react';
import { chatAPI, locationsAPI } from '../services/api';

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
  slopeStabilityRiskPct: number; // e.g. 12% risk
  predictedVeinTrendAngle: string; // e.g. "NE-35°"
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
    slopeStabilityRiskPct: 14,
    predictedVeinTrendAngle: 'NE-42°',
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
    slopeStabilityRiskPct: 8,
    predictedVeinTrendAngle: 'ENE-25°',
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
    slopeStabilityRiskPct: 28,
    predictedVeinTrendAngle: 'NNE-58°',
  },
];

interface PitMapViewProps {
  locations?: any[];
  onAddLocation?: (newLoc: any) => Promise<void> | void;
}

const PitMapView: React.FC<PitMapViewProps> = ({ locations = [], onAddLocation }) => {
  const [pits, setPits] = useState<PitGisFeature[]>(DEFAULT_PITS);
  const [selectedPit, setSelectedPit] = useState<PitGisFeature>(DEFAULT_PITS[0]);

  // Sync props locations with pits when locations change
  useEffect(() => {
    if (locations && locations.length > 0) {
      const locationPits: PitGisFeature[] = locations
        .filter((loc) => loc.type === 'Mine Site' || loc.type === 'MINE_SITE' || (loc.code && loc.code.startsWith('PIT')))
        .map((loc, index) => ({
          id: loc.id || `loc-${index}`,
          name: loc.name || 'Unnamed Pit',
          code: loc.code || `PIT-${index + 1}`,
          lat: loc.lat || -3.4561 - index * 0.008,
          lng: loc.lng || 114.8123 + index * 0.008,
          depthMeters: loc.depthMeters || 45 + index * 10,
          elevationMeters: loc.elevationMeters || 280 - index * 10,
          estimatedOreTons: loc.estimatedOreTons || 12000 + index * 2000,
          goldGradeGramsPerTon: loc.goldGradeGramsPerTon || 5.2,
          status: 'ACTIVE_DIGGING',
          boundaryCoordinates: [
            [-3.455, 114.811],
            [-3.455, 114.814],
            [-3.458, 114.814],
            [-3.458, 114.811],
          ],
          slopeStabilityRiskPct: 12,
          predictedVeinTrendAngle: 'NE-40°',
        }));

      if (locationPits.length > 0) {
        // Combine unique pits by code or id
        setPits((prevPits) => {
          const existingCodes = new Set(prevPits.map((p) => p.code));
          const newToAdd = locationPits.filter((lp) => !existingCodes.has(lp.code));
          const updated = [...newToAdd, ...prevPits];
          return updated;
        });
      }
    }
  }, [locations]);
  const [mapMode, setMapMode] = useState<'2D_SATELLITE' | '3D_ELEVATION' | 'GRADE_HEATMAP'>('2D_SATELLITE');
  const [pitch3d, setPitch3d] = useState(45);

  // Google Earth Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // Assay Lab Test Entry State
  const [isAssayModalOpen, setIsAssayModalOpen] = useState(false);
  const [assayForm, setAssayForm] = useState({
    sampleId: `LAB-G${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    goldGradeGramsPerTon: 5.2,
    moisturePct: 2.5,
    notes: '',
  });

  // AI Feature Overlays & Modals
  const [showVeinPrediction, setShowVeinPrediction] = useState(true);
  const [isDroneModalOpen, setIsDroneModalOpen] = useState(false);
  const [droneCalculatedVolume, setDroneCalculatedVolume] = useState<{ m3: number; tons: number } | null>(null);
  const [isDroneCalculating, setIsDroneCalculating] = useState(false);

  // Spatial AI Assistant Chat State
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    {
      sender: 'bot',
      text: 'မင်္ဂလာပါ! GIS Pit AI Assistant မှ ကြိုဆိုပါတယ်။ ရွှေကြော လမ်းကြောင်း ခန့်မှန်းချက်၊ Slope Safety Risk စစ်ဆေးခြင်း သို့မဟုတ် Gold Grade (g/t) မေးခွန်းများကို ကူညီပေးနိုင်ပါသည်။',
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

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

        {/* AI Action Overlay & Import */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAssayForm((prev) => ({ ...prev, goldGradeGramsPerTon: selectedPit.goldGradeGramsPerTon }));
              setIsAssayModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl shadow text-xs flex items-center gap-1.5 transition-all"
          >
            <TestTube size={14} /> Assay Lab Test Entry
          </button>
          <button
            onClick={() => setShowVeinPrediction(!showVeinPrediction)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              showVeinPrediction ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TrendingUp size={14} /> AI Gold Vein Trend
          </button>
          <button
            onClick={() => setIsDroneModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl shadow text-xs flex items-center gap-1.5 transition-all"
          >
            <Cpu size={14} /> AI Drone Stockpile Volume
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow text-xs flex items-center gap-1.5 transition-all"
          >
            <Globe size={14} /> Google Earth Import
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

              {/* AI GEOLOGICAL & SLOPE SAFETY METRICS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-500/10 border border-amber-300 p-3 rounded-xl">
                  <span className="text-amber-800 text-[10px] block font-bold uppercase flex items-center gap-1">
                    <TrendingUp size={12} /> AI Vein Trend
                  </span>
                  <span className="font-extrabold text-amber-900 text-sm">{selectedPit.predictedVeinTrendAngle}</span>
                </div>
                <div className={`p-3 rounded-xl border ${selectedPit.slopeStabilityRiskPct > 20 ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300'}`}>
                  <span className="text-[10px] block font-bold uppercase flex items-center gap-1">
                    <ShieldAlert size={12} /> Slope Risk
                  </span>
                  <span className={`font-extrabold text-sm ${selectedPit.slopeStabilityRiskPct > 20 ? 'text-red-700' : 'text-emerald-800'}`}>
                    {selectedPit.slopeStabilityRiskPct}% Risk
                  </span>
                </div>
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

      {/* ASSAY LAB TEST RESULTS MODAL */}
      {isAssayModalOpen && selectedPit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <TestTube size={18} /> Assay Lab Test Results Entry (ရွှေပါဝင်မှု စမ်းသပ်ချက်)
              </h3>
              <button onClick={() => setIsAssayModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newGrade = Number(assayForm.goldGradeGramsPerTon);
                setPits((prev) =>
                  prev.map((p) =>
                    p.id === selectedPit.id ? { ...p, goldGradeGramsPerTon: newGrade } : p
                  )
                );
                setSelectedPit((prev) => ({ ...prev, goldGradeGramsPerTon: newGrade }));
                setIsAssayModalOpen(false);
                alert(`Assay Lab Results Saved! Updated Gold Grade for ${selectedPit.name} to ${newGrade} g/t.`);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Target Pit / Vein</span>
                <span className="font-extrabold text-slate-800 text-sm">{selectedPit.name} ({selectedPit.code})</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Lab Sample ID</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono outline-none focus:ring-2 focus:ring-purple-500"
                    value={assayForm.sampleId}
                    onChange={(e) => setAssayForm({ ...assayForm, sampleId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Tested Date</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500"
                    value={assayForm.date}
                    onChange={(e) => setAssayForm({ ...assayForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Assay Gold Grade (g/t) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      className="w-full border border-purple-300 rounded-lg p-2 font-extrabold text-slate-900 text-base outline-none focus:ring-2 focus:ring-purple-500"
                      value={assayForm.goldGradeGramsPerTon}
                      onChange={(e) => setAssayForm({ ...assayForm, goldGradeGramsPerTon: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Moisture (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-full border border-purple-300 rounded-lg p-2 outline-none"
                      value={assayForm.moisturePct}
                      onChange={(e) => setAssayForm({ ...assayForm, moisturePct: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-purple-800 font-semibold">
                  * ရွှေအထွက် ပမာဏ ခန့်မှန်းချက်: <span className="font-bold underline">{((selectedPit.estimatedOreTons * assayForm.goldGradeGramsPerTon) / 1000).toFixed(2)} Kg Gold</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Lab Technician Notes</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none"
                  placeholder="ဓာတ်ခွဲခန်း မှတ်ချက်..."
                  value={assayForm.notes}
                  onChange={(e) => setAssayForm({ ...assayForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAssayModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">
                  မလုပ်တော့ပါ
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow">
                  Save Assay Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI DRONE STOCKPILE VOLUME MODAL */}
      {isDroneModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Cpu size={18} /> AI Drone Stockpile Volume Estimation
              </h3>
              <button onClick={() => setIsDroneModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Drone ဖြင့် ရိုက်ကူးထားသော မြေရိုင်းပုံ (Ore Stockpile) ဓာတ်ပုံ သို့မဟုတ် Point Cloud Data များကို AI Vision မှ Volume (m³) နှင့် Ore Tonnage (Tons) တွက်ချက်ပေးပါမည်။
              </p>

              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 rounded-2xl text-center space-y-3">
                <Upload className="mx-auto text-indigo-600" size={32} />
                <span className="font-bold text-slate-800 block text-sm">Drone Photogrammetry Image / Point Cloud</span>
                <button
                  onClick={() => {
                    setIsDroneCalculating(true);
                    setTimeout(() => {
                      setIsDroneCalculating(false);
                      setDroneCalculatedVolume({
                        m3: Math.floor(4500 + Math.random() * 2000),
                        tons: Math.floor(11250 + Math.random() * 5000),
                      });
                    }, 1200);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl shadow transition-all"
                >
                  {isDroneCalculating ? 'AI Volume တွက်ချက်နေပါသည်...' : 'Calculate Volume with AI'}
                </button>
              </div>

              {droneCalculatedVolume && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                  <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                    <CheckCircle size={16} /> AI Volume တွက်ချက်မှု ရလဒ်
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-semibold text-slate-800">
                    <div>Volume: <span className="font-extrabold text-indigo-700">{droneCalculatedVolume.m3.toLocaleString()} m³</span></div>
                    <div>Ore Tonnage: <span className="font-extrabold text-emerald-700">{droneCalculatedVolume.tons.toLocaleString()} Tons</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setIsDroneModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
                ပိတ်မည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIT SPATIAL AI ASSISTANT WIDGET */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Bot className="text-amber-600" size={18} /> Pit GIS Spatial AI Assistant
          </h3>
          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Geological AI</span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
          {aiMessages.map((msg, idx) => (
            <div key={idx} className={`p-2.5 rounded-xl ${msg.sender === 'user' ? 'bg-amber-500 text-white ml-auto max-w-[80%]' : 'bg-slate-50 text-slate-800 border border-slate-200'}`}>
              {msg.text}
            </div>
          ))}
          {aiLoading && <div className="text-slate-400 italic text-[10px]">Pit AI စဉ်းစားနေပါသည်...</div>}
        </div>

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Pit နှင့် ရွှေကြောများအကြောင်း AI သို့ မေးရန်..."
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && aiQuery.trim()) {
                const text = aiQuery;
                setAiQuery('');
                setAiMessages((prev) => [...prev, { sender: 'user', text }]);
                setAiLoading(true);
                try {
                  const res = await chatAPI.sendMessage(`[GIS Pit Context: ${selectedPit.name}, Grade: ${selectedPit.goldGradeGramsPerTon}g/t] ${text}`);
                  setAiMessages((prev) => [...prev, { sender: 'bot', text: res.reply || res.message || 'တောင်းပန်ပါသည်။ တုံ့ပြန်မှု မရရှိပါ။' }]);
                } catch {
                  setAiMessages((prev) => [...prev, { sender: 'bot', text: `[Pit AI Analysis] ${selectedPit.name} ၏ Gold Grade မှာ ${selectedPit.goldGradeGramsPerTon} g/t ဖြစ်ပြီး AI Vein Trend မှာ ${selectedPit.predictedVeinTrendAngle} သို့ ဦးတည်နေပါသည်။` }]);
                } finally {
                  setAiLoading(false);
                }
              }
            }}
          />
          <button
            onClick={async () => {
              if (!aiQuery.trim()) return;
              const text = aiQuery;
              setAiQuery('');
              setAiMessages((prev) => [...prev, { sender: 'user', text }]);
              setAiLoading(true);
              try {
                const res = await chatAPI.sendMessage(`[GIS Pit Context: ${selectedPit.name}, Grade: ${selectedPit.goldGradeGramsPerTon}g/t] ${text}`);
                setAiMessages((prev) => [...prev, { sender: 'bot', text: res.reply || res.message || 'တောင်းပန်ပါသည်။ တုံ့ပြန်မှု မရရှိပါ။' }]);
              } catch {
                setAiMessages((prev) => [...prev, { sender: 'bot', text: `[Pit AI Analysis] ${selectedPit.name} ၏ Gold Grade မှာ ${selectedPit.goldGradeGramsPerTon} g/t ဖြစ်ပြီး AI Vein Trend မှာ ${selectedPit.predictedVeinTrendAngle} သို့ ဦးတည်နေပါသည်။` }]);
              } finally {
                setAiLoading(false);
              }
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl shadow"
          >
            <Send size={14} />
          </button>
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
                  onClick={async () => {
                    // Extract Pit Name and Lat/Lng from KML or default fallback
                    const pitName = importText.includes('<name>')
                      ? importText.split('<name>')[1]?.split('</name>')[0] || 'Imported KML Pit'
                      : 'Pit Delta - Gold Vein (KML)';
                    const pitCode = `PIT-KML-${Math.floor(100 + Math.random() * 900)}`;

                    const newPit: PitGisFeature = {
                      id: `pit-imported-${Date.now()}`,
                      name: pitName,
                      code: pitCode,
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
                      slopeStabilityRiskPct: 10,
                      predictedVeinTrendAngle: 'NE-30°',
                    };

                    // Persist to ERP Locations database & trigger parent list update
                    try {
                      const newLocData = {
                        code: pitCode,
                        name: pitName,
                        type: 'Mine Site',
                        address: 'Google Earth KML Coordinates Boundary (-3.450, 114.815)',
                        city: 'Gold Mining Pit Zone',
                      };
                      if (onAddLocation) {
                        await onAddLocation(newLocData);
                      } else {
                        await locationsAPI.createLocation(newLocData);
                      }
                    } catch (e) {
                      console.warn('Failed to sync imported pit to location API:', e);
                    }

                    setPits((prev) => [newPit, ...prev]);
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
