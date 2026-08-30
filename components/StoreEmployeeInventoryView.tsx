import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { inventoryAPI, equipmentAPI, suppliersAPI, chatAPI } from '../services/api';
import { SparePart, InventoryTransaction, InventoryTxType } from '../types';
import { Search, PackageCheck, ArrowUpRight, ArrowDownLeft, AlertTriangle, Bot, Send, Sparkles, RefreshCw, Layers, CheckCircle, FileText, Wrench } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface StoreEmployeeInventoryViewProps {
  currentUser?: any;
}

const StoreEmployeeInventoryView: React.FC<StoreEmployeeInventoryViewProps> = ({ currentUser }) => {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'catalog' | 'history' | 'ai-assistant'>('catalog');

  // Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);

  // Issue Form State (Product Output for Equipment/Work)
  const [issueForm, setIssueForm] = useState({
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    equipmentId: '',
    referenceId: '',
    notes: '',
  });

  // Inward Form State (Product Input / Purchase / Restock)
  const [inwardForm, setInwardForm] = useState({
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    supplierId: '',
    pricePerUnit: 0,
    referenceId: '',
    notes: '',
  });

  // AI Assistant State
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'မင်္ဂလာပါ Store ဝန်ထမ်းမင်္ဂလာပါ။ စတော့ပစ္စည်း ရှာဖွေခြင်း၊ နည်းနေသောပစ္စည်းစစ်ဆေးခြင်း သို့မဟုတ် အော်ဒါခန့်မှန်းချက်များကို ကူညီပေးနိုင်ပါသည်။',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [partsData, txData, eqData, supData] = await Promise.all([
        inventoryAPI.getParts(),
        inventoryAPI.getTransactions(),
        equipmentAPI.getEquipment(),
        suppliersAPI.getSuppliers(),
      ]);
      setParts(partsData || []);
      setTransactions(txData || []);
      setEquipment(eqData || []);
      setSuppliers(supData || []);
    } catch (err: any) {
      console.error('Store inventory data error:', err);
      setError(err.message || 'ဒေတာများ ရယူရာတွင် အမှားအယွင်းရှိနေပါသည်။');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const categories = useMemo(() => {
    const cats = new Set(parts.map((p) => p.category).filter(Boolean));
    return ['ALL', ...Array.from(cats)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return parts.filter((p) => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(term) ||
        (p.partNumber || '').toLowerCase().includes(term) ||
        (p.brand || '').toLowerCase().includes(term) ||
        (p.location || '').toLowerCase().includes(term);
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [parts, searchTerm, selectedCategory]);

  const lowStockParts = useMemo(() => {
    return parts.filter((p) => p.currentStock <= p.minStockLevel);
  }, [parts]);

  // Options
  const partOptions = parts.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.currentStock} ${p.unit})`,
    subLabel: `Part #: ${p.partNumber} | Location: ${p.location || 'N/A'}`,
  }));

  const equipmentOptions = equipment.map((eq) => ({
    value: eq.id,
    label: `${eq.code} - ${eq.model || eq.name}`,
    subLabel: `Status: ${eq.status}`,
  }));

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
    subLabel: s.type || 'Supplier',
  }));

  const handleOpenIssue = (part?: SparePart) => {
    setSelectedPart(part || null);
    setIssueForm({
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
      equipmentId: '',
      referenceId: '',
      notes: '',
    });
    setIsIssueModalOpen(true);
  };

  const handleOpenInward = (part?: SparePart) => {
    setSelectedPart(part || null);
    setInwardForm({
      date: new Date().toISOString().split('T')[0],
      quantity: 1,
      supplierId: part?.preferredSupplierId || '',
      pricePerUnit: part ? part.averageCost : 0,
      referenceId: '',
      notes: '',
    });
    setIsInwardModalOpen(true);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) {
      alert('ကျေးဇူးပြု၍ ထုတ်ပေးမည့် ပစ္စည်းကို ရွေးချယ်ပါ။');
      return;
    }
    if (selectedPart.currentStock < issueForm.quantity) {
      alert(`စတော့ မလုံလောက်ပါ။ လက်ရှိစတော့: ${selectedPart.currentStock} ${selectedPart.unit}`);
      return;
    }
    try {
      await inventoryAPI.createTransaction({
        date: issueForm.date,
        type: InventoryTxType.USAGE,
        partId: selectedPart.id,
        quantity: Number(issueForm.quantity),
        pricePerUnit: selectedPart.averageCost,
        equipmentId: issueForm.equipmentId || undefined,
        referenceId: issueForm.referenceId || undefined,
        notes: issueForm.notes || undefined,
      });
      await refreshData();
      setIsIssueModalOpen(false);
      alert('ပစ္စည်းထုတ်ပေးမှု အောင်မြင်ပါသည်။');
    } catch (err: any) {
      alert(`အမှားအယွင်း: ${err.message || 'ပစ္စည်းထုတ်ပေးရန် မအောင်မြင်ပါ'}`);
    }
  };

  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) {
      alert('ကျေးဇူးပြု၍ လက်ခံမည့် ပစ္စည်းကို ရွေးချယ်ပါ။');
      return;
    }
    try {
      await inventoryAPI.createTransaction({
        date: inwardForm.date,
        type: InventoryTxType.PURCHASE,
        partId: selectedPart.id,
        quantity: Number(inwardForm.quantity),
        pricePerUnit: Number(inwardForm.pricePerUnit),
        supplierId: inwardForm.supplierId || undefined,
        referenceId: inwardForm.referenceId || undefined,
        notes: inwardForm.notes || undefined,
        paymentType: 'CASH',
      });
      await refreshData();
      setIsInwardModalOpen(false);
      alert('စတော့အဝင် စာရင်းသွင်းမှု အောင်မြင်ပါသည်။');
    } catch (err: any) {
      alert(`အမှားအယွင်း: ${err.message || 'စတော့အဝင်သွင်းရန် မအောင်မြင်ပါ'}`);
    }
  };

  // AI Prompt Helpers
  const handleAiSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || aiQuery;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setAiQuery('');
    setAiLoading(true);

    try {
      // Local smart response formatting for common Store queries
      let responseText = '';

      if (textToSend.includes('စတော့နည်း') || textToSend.includes('low stock')) {
        if (lowStockParts.length === 0) {
          responseText = 'လက်ရှိတွင် အနည်းဆုံးစတော့အဆင့်အောက် ရောက်နေသော ပစ္စည်းများ မရှိပါ။ စတော့အခြေအနေ ကောင်းမွန်ပါသည်။';
        } else {
          responseText = `လက်ရှိစတော့ နည်းနေသော ပစ္စည်း (${lowStockParts.length}) မျိုး ရှိပါသည်:\n` +
            lowStockParts.map((p) => `- ${p.name} (${p.partNumber}): လက်ရှိ ${p.currentStock} ${p.unit} (အနည်းဆုံးထားရမည်: ${p.minStockLevel}) [Location: ${p.location || 'N/A'}]`).join('\n');
        }
      } else if (textToSend.includes('ဒီနေ့') || textToSend.includes('ယနေ့') || textToSend.includes('ထုတ်ပေး')) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayTx = transactions.filter((t) => t.date === todayStr);
        if (todayTx.length === 0) {
          responseText = 'ယနေ့အတွက် စတော့လှုပ်ရှားမှု စာရင်း မရှိသေးပါ။';
        } else {
          responseText = `ယနေ့ လှုပ်ရှားမှု စာရင်း (${todayTx.length} ခု):\n` +
            todayTx.map((t) => {
              const p = parts.find((x) => x.id === t.partId);
              return `- [${t.type}] ${p?.name || 'Item'} (${t.quantity} ${p?.unit || 'Pcs'}) - ${t.performedBy || 'Store Staff'}`;
            }).join('\n');
        }
      } else {
        // Fallback to API / Gemini
        const res = await chatAPI.sendMessage(textToSend);
        responseText = res.reply || res.message || 'တောင်းပန်ပါသည်။ တုံ့ပြန်မှု မရရှိပါ။';
      }

      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'AI ဝန်ဆောင်မှုကို ချိတ်ဆက်ရာတွင် အဆင်မပြေပါ။ ကျေးဇူးပြု၍ ပြန်လည်ကြိုးစားပါ။',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner for Store Employees */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <PackageCheck size={180} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 px-3 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Wrench size={12} /> Store Staff Mode
              </span>
              <span className="text-slate-300 text-xs">
                မင်္ဂလာပါ, {currentUser?.fullName || currentUser?.username || 'Store Keeper'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">ဂိုဒေါင် နှင့် စတော့ စီမံခန့်ခွဲမှု</h1>
            <p className="text-slate-300 text-sm mt-1">
              ပစ္စည်း ထုတ်ပေးခြင်း၊ စတော့အဝင် စာရင်းသွင်းခြင်း နှင့် စတော့အခြေအနေ စစ်ဆေးခြင်း။
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenIssue()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all active:scale-95 text-sm"
            >
              <ArrowUpRight size={18} />
              ပစ္စည်း ထုတ်ပေးမည်
            </button>
            <button
              onClick={() => handleOpenInward()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 transition-all active:scale-95 text-sm"
            >
              <ArrowDownLeft size={18} />
              စတော့အဝင် သွင်းမည်
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockParts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                စတော့ နည်းနေသော ပစ္စည်း ({lowStockParts.length}) မျိုး ရှိနေပါသည်!
              </h4>
              <p className="text-amber-700 text-xs mt-0.5">
                {lowStockParts.slice(0, 3).map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(', ')}
                {lowStockParts.length > 3 ? ` နှင့် အခြား ${lowStockParts.length - 3} ခု...` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('ai-assistant');
              handleAiSend('စတော့နည်းနေသော ပစ္စည်းများ စာရင်း ပြပေးပါ။');
            }}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Sparkles size={14} /> AI ဖြင့် စစ်ဆေးမည်
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 font-bold text-sm rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'catalog'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers size={16} />
            စတော့ ပစ္စည်းများ ({filteredParts.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-bold text-sm rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={16} />
            ယနေ့ ထုတ်/သွင်း မှတ်တမ်း
          </button>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={`px-4 py-2 font-bold text-sm rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'ai-assistant'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            <Bot size={16} />
            Store AI Assistant
          </button>
        </div>

        <button
          onClick={refreshData}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Quick Search & Category Filter */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="ပစ္စည်းအမည်၊ Part #၊ ဘင်နေရာ ဖြင့်ရှာရန်..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">အမျိုးအစား:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'အားလုံး' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Inventory Cards / Grid for Store Staff */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">စတော့ဒေတာ ရယူနေပါသည်...</div>
          ) : filteredParts.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500">
              ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ရှိပါ။
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParts.map((part) => {
                const isLow = part.currentStock <= part.minStockLevel;
                return (
                  <div
                    key={part.id}
                    className={`bg-white rounded-xl p-5 border transition-all hover:shadow-md flex flex-col justify-between ${
                      isLow ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {part.brand || 'Generic'} • {part.category}
                          </span>
                          <h3 className="font-bold text-slate-800 text-base leading-snug">{part.name}</h3>
                          <p className="font-mono text-xs text-blue-700 font-semibold mt-0.5">{part.partNumber}</p>
                        </div>
                        {isLow && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> Low
                          </span>
                        )}
                      </div>

                      <div className="my-3 bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">လက်ရှိစတော့</span>
                          <span className={`font-extrabold text-base ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {part.currentStock} <span className="text-xs font-normal text-slate-500">{part.unit}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ဘင် / တည်နေရာ</span>
                          <span className="font-bold text-slate-700">{part.location || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons for Store Staff */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => handleOpenIssue(part)}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <ArrowUpRight size={14} /> ထုတ်ပေးမည်
                      </button>
                      <button
                        onClick={() => handleOpenInward(part)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <ArrowDownLeft size={14} /> အဝင်သွင်းမည်
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Transactions History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">
            မကြာသေးမီက စတော့လှုပ်ရှားမှုများ ({transactions.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">ရက်စွဲ</th>
                  <th className="px-4 py-3">အမျိုးအစား</th>
                  <th className="px-4 py-3">ပစ္စည်းအမည်</th>
                  <th className="px-4 py-3 text-center">အရေအတွက်</th>
                  <th className="px-4 py-3">စက် / ကိုးကား</th>
                  <th className="px-4 py-3">လုပ်ဆောင်သူ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      မှတ်တမ်းများ မရှိသေးပါ။
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 20).map((tx) => {
                    const part = parts.find((p) => p.id === tx.partId);
                    const isIssue = tx.type === InventoryTxType.USAGE || tx.type === InventoryTxType.RETURN_VENDOR;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600 font-medium">{tx.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              isIssue ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{part?.name || 'Unknown Part'}</div>
                          <div className="text-xs text-slate-400 font-mono">{part?.partNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-extrabold text-slate-900">
                          {tx.quantity} {part?.unit || 'Pcs'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {tx.referenceId ? `Ref: ${tx.referenceId}` : tx.equipmentId ? `Equipment` : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{tx.performedBy || 'Store Staff'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'ai-assistant' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          {/* AI Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center">
                <Bot className="text-indigo-300" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  Store AI Inventory Assistant <Sparkles size={16} className="text-amber-400" />
                </h3>
                <p className="text-xs text-slate-300">ဂိုဒေါင်ဝန်ထမ်းများအတွက် စတော့အချက်အလက် ကူညီပေးသူ</p>
              </div>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <Sparkles size={12} /> အမြန်မေးခွန်းများ:
            </span>
            <button
              onClick={() => handleAiSend('စတော့နည်းနေသော ပစ္စည်းများ စာရင်း ပြပေးပါ။')}
              className="text-xs bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors"
            >
              ⚠️ စတော့နည်းနေသော ပစ္စည်းများ
            </button>
            <button
              onClick={() => handleAiSend('ယနေ့ ပစ္စည်းထုတ်ပေးမှု စာရင်း အကျဉ်းချုပ် ပြပေးပါ။')}
              className="text-xs bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors"
            >
              📋 ယနေ့ ထုတ်ပေးမှု စာရင်း
            </button>
            <button
              onClick={() => handleAiSend('Filter စတော့ပစ္စည်း ရရှိနိုင်မှုကို စစ်ဆေးပေးပါ။')}
              className="text-xs bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors"
            >
              🔍 Filters စတော့ စစ်ဆေးမည်
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {aiMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm whitespace-pre-line shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic p-2">
                <Bot size={16} className="animate-spin text-indigo-600" /> AI စဉ်းစားနေပါသည်...
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="စတော့နှင့် ပတ်သက်သည့် မေးခွန်းများ ရိုက်ထည့်ပါ..."
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
            />
            <button
              onClick={() => handleAiSend()}
              disabled={!aiQuery.trim() || aiLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ISSUE MODAL */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ArrowUpRight /> ပစ္စည်း ထုတ်ပေးခြင်း (Issue Item)
              </h3>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              <div>
                <SearchableSelect
                  label="ထုတ်ပေးမည့် ပစ္စည်း"
                  options={partOptions}
                  value={selectedPart?.id || ''}
                  onChange={(val) => {
                    const p = parts.find((x) => x.id === val);
                    setSelectedPart(p || null);
                  }}
                  required
                  id="issue-select-part"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="issue-date" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    ထုတ်ပေးသည့် ရက်စွဲ
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={issueForm.date}
                    onChange={(e) => setIssueForm({ ...issueForm, date: e.target.value })}
                    id="issue-date"
                  />
                </div>
                <div>
                  <label htmlFor="issue-qty" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    အရေအတွက်
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
                    id="issue-qty"
                  />
                </div>
              </div>

              <div>
                <SearchableSelect
                  label="ထုတ်ပေးမည့် စက်/ယာဉ် (မဖြစ်မနေ မဟုတ်ပါ)"
                  options={equipmentOptions}
                  value={issueForm.equipmentId}
                  onChange={(val) => setIssueForm({ ...issueForm, equipmentId: val })}
                  id="issue-equipment-select"
                />
              </div>

              <div>
                <label htmlFor="issue-ref" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                  ကိုးကားနံပါတ် / Work Order #
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. WO-2026-08"
                  value={issueForm.referenceId}
                  onChange={(e) => setIssueForm({ ...issueForm, referenceId: e.target.value })}
                  id="issue-ref"
                />
              </div>

              <div>
                <label htmlFor="issue-notes" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                  မှတ်ချက်
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ထုတ်ပေးသည့် အကြောင်းအရာ..."
                  value={issueForm.notes}
                  onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                  id="issue-notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle size={16} /> အတည်ပြု ထုတ်ပေးမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INWARD MODAL */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ArrowDownLeft /> စတော့အဝင် သွင်းခြင်း (Inward Stock)
              </h3>
              <button onClick={() => setIsInwardModalOpen(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="p-6 space-y-4">
              <div>
                <SearchableSelect
                  label="လက်ခံမည့် ပစ္စည်း"
                  options={partOptions}
                  value={selectedPart?.id || ''}
                  onChange={(val) => {
                    const p = parts.find((x) => x.id === val);
                    setSelectedPart(p || null);
                    if (p) setInwardForm((prev) => ({ ...prev, pricePerUnit: p.averageCost }));
                  }}
                  required
                  id="inward-select-part"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inward-date" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    လက်ခံသည့် ရက်စွဲ
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={inwardForm.date}
                    onChange={(e) => setInwardForm({ ...inwardForm, date: e.target.value })}
                    id="inward-date"
                  />
                </div>
                <div>
                  <label htmlFor="inward-qty" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    အရေအတွက်
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    value={inwardForm.quantity}
                    onChange={(e) => setInwardForm({ ...inwardForm, quantity: Number(e.target.value) })}
                    id="inward-qty"
                  />
                </div>
              </div>

              <div>
                <SearchableSelect
                  label="ရောင်းချသူ / ပေးပို့သူ Supplier"
                  options={supplierOptions}
                  value={inwardForm.supplierId}
                  onChange={(val) => setInwardForm({ ...inwardForm, supplierId: val })}
                  id="inward-supplier-select"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inward-price" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    တစ်ယူနစ် စျေးနှုန်း (ကျပ်)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={inwardForm.pricePerUnit}
                    onChange={(e) => setInwardForm({ ...inwardForm, pricePerUnit: Number(e.target.value) })}
                    id="inward-price"
                  />
                </div>
                <div>
                  <label htmlFor="inward-ref" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                    PO / DO / Invoice #
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. PO-9988"
                    value={inwardForm.referenceId}
                    onChange={(e) => setInwardForm({ ...inwardForm, referenceId: e.target.value })}
                    id="inward-ref"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inward-notes" className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                  မှတ်ချက်
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="စတော့အဝင် မှတ်ချက်..."
                  value={inwardForm.notes}
                  onChange={(e) => setInwardForm({ ...inwardForm, notes: e.target.value })}
                  id="inward-notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle size={16} /> အတည်ပြု အဝင်သွင်းမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreEmployeeInventoryView;
