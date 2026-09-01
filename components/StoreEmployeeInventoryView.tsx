import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { inventoryAPI, equipmentAPI, locationsAPI } from '../services/api';
import { SparePart, InventoryTransaction, InventoryTxType } from '../types';
import { Search, PackageCheck, AlertTriangle, RefreshCw, Layers, CheckCircle, FileText, Wrench, QrCode, SlidersHorizontal, Printer, ShoppingCart, Plus, Minus, Trash2, Store } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

interface StoreEmployeeInventoryViewProps {
  currentUser?: any;
}

interface CartItem {
  part: SparePart;
  quantity: number;
}

const StoreEmployeeInventoryView: React.FC<StoreEmployeeInventoryViewProps> = ({ currentUser }) => {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-Store & Category Filtering
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // POS Issue Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [issueMetadata, setIssueMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    equipmentId: '',
    referenceId: '',
    notes: '',
  });
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Modal State for QR Label & Stock Adjustment
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);

  // Stock Adjustment Form
  const [adjustmentForm, setAdjustmentForm] = useState({
    reason: 'PHYSICAL_COUNT_AUDIT' as 'PHYSICAL_COUNT_AUDIT' | 'DAMAGED' | 'EXPIRED' | 'WRITE_OFF',
    adjustedQty: 0,
    notes: '',
  });

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [partsData, txData, eqData, locData] = await Promise.all([
        inventoryAPI.getParts(),
        inventoryAPI.getTransactions(),
        equipmentAPI.getEquipment(),
        locationsAPI.getLocations(),
      ]);
      setParts(partsData || []);
      setTransactions(txData || []);
      setEquipment(eqData || []);
      setLocations(locData || []);
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
      const matchStore = selectedStore === 'ALL' || p.locationId === selectedStore;
      return matchSearch && matchCat && matchStore;
    });
  }, [parts, searchTerm, selectedCategory, selectedStore]);

  const lowStockParts = useMemo(() => {
    return parts.filter((p) => p.currentStock <= p.minStockLevel);
  }, [parts]);

  const equipmentOptions = equipment.map((eq) => ({
    value: eq.id,
    label: `${eq.code} - ${eq.model || eq.name}`,
    subLabel: `Status: ${eq.status}`,
  }));

  // POS Cart Handlers
  const addToCart = (part: SparePart) => {
    if (part.currentStock <= 0) {
      alert('ဤပစ္စည်းသည် စတော့ မရှိတော့ပါ။');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.part.id === part.id);
      if (existing) {
        if (existing.quantity >= part.currentStock) {
          alert(`စတော့ မလုံလောက်ပါ။ လက်ရှိစတော့: ${part.currentStock} ${part.unit}`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.part.id === part.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { part, quantity: 1 }];
    });
  };

  const updateCartQuantity = (partId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.part.id === partId) {
            const newQty = item.quantity + delta;
            if (newQty > item.part.currentStock) {
              alert(`စတော့ မလုံလောက်ပါ။ လက်ရှိစတော့: ${item.part.currentStock} ${item.part.unit}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (partId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.part.id !== partId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('ကျေးဇူးပြု၍ ထုတ်ပေးမည့် ပစ္စည်းများကို Cart ထဲသို့ ထည့်ပါ။');
      return;
    }

    setIsSubmittingIssue(true);
    try {
      for (const item of cart) {
        await inventoryAPI.createTransaction({
          date: issueMetadata.date,
          type: InventoryTxType.USAGE,
          partId: item.part.id,
          quantity: item.quantity,
          pricePerUnit: item.part.averageCost,
          equipmentId: issueMetadata.equipmentId || undefined,
          referenceId: issueMetadata.referenceId || undefined,
          notes: issueMetadata.notes || undefined,
        });
      }

      await refreshData();
      clearCart();
      setIssueMetadata({
        date: new Date().toISOString().split('T')[0],
        equipmentId: '',
        referenceId: '',
        notes: '',
      });
      alert('ပစ္စည်း ထုတ်ပေးမှု အောင်မြင်ပါသည်။');
    } catch (err: any) {
      alert(`အမှားအယွင်း: ${err.message || 'ပစ္စည်းထုတ်ပေးရန် မအောင်မြင်ပါ'}`);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner for Store POS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-8 pointer-events-none">
          <PackageCheck size={180} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-3 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Wrench size={12} /> POS Store Dispatch Mode
              </span>
              <span className="text-slate-300 text-xs">
                မင်္ဂလာပါ, {currentUser?.fullName || currentUser?.username || 'Store Keeper'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">ဂိုဒေါင် ပစ္စည်း ထုတ်ပေးခြင်း (POS Dispatch)</h1>
            <p className="text-slate-300 text-sm mt-1">
              ပစ္စည်းများ လျင်မြန်စွာ ရွေးချယ်၍ လုပ်ငန်းခွင်/စက်များသို့ ပစ္စည်းထုတ်ပေးမှု စာရင်း စာရင်းသွင်းပါ။
            </p>
          </div>

          {/* Store Selector Component */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center gap-3">
            <Store className="text-emerald-400 flex-shrink-0" size={20} />
            <div>
              <label htmlFor="store-select-dropdown" className="text-[10px] text-slate-300 font-bold uppercase block">
                ဂိုဒေါင် / စတိုး ရွေးချယ်ရန်:
              </label>
              <select
                id="store-select-dropdown"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">ဂိုဒေါင် အားလုံး (All Stores)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code || loc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockParts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                စတော့ နည်းနေသော ပစ္စည်း ({lowStockParts.length}) မျိုး ရှိနေပါသည်!
              </h4>
              <p className="text-amber-700 text-xs mt-0.5">
                {lowStockParts.slice(0, 4).map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(', ')}
                {lowStockParts.length > 4 ? ` နှင့် အခြား ${lowStockParts.length - 4} ခု...` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 font-bold text-sm rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'pos'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart size={16} />
            POS ထုတ်ပေး မုဒ် (POS Dispatch)
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
            ယနေ့ ထုတ်ပေးမှု မှတ်တမ်း
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

      {/* POS DISPATCH INTERFACE */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLUMNS: Parts Catalog Grid */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="ပစ္စည်းအမည်၊ Part #၊ ဘင်နေရာ ဖြင့် ရှာရန်..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Category:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'အားလုံး' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            {loading ? (
              <div className="text-center py-12 text-slate-500">စတော့ဒေတာ ရယူနေပါသည်...</div>
            ) : filteredParts.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500">
                ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ရှိပါ။
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredParts.map((part) => {
                  const isLow = part.currentStock <= part.minStockLevel;
                  const inCart = cart.find((item) => item.part.id === part.id);
                  const storeLoc = locations.find((l) => l.id === part.locationId)?.name || part.location || 'Default Store';

                  return (
                    <div
                      key={part.id}
                      className={`bg-white rounded-xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                        isLow ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {part.brand || 'Generic'} • {part.category}
                          </span>
                          {isLow && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle size={10} /> Low
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-800 text-sm leading-snug">{part.name}</h3>
                        <p className="font-mono text-xs text-blue-700 font-bold mt-0.5">{part.partNumber}</p>

                        <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">လက်ရှိစတော့</span>
                            <span className={`font-extrabold text-sm ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                              {part.currentStock} <span className="text-xs font-normal text-slate-500">{part.unit}</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[10px]">စတိုး တည်နေရာ</span>
                            <span className="font-bold text-slate-700 text-[11px] truncate max-w-[120px] inline-block">{storeLoc}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-3">
                        <button
                          onClick={() => addToCart(part)}
                          disabled={part.currentStock <= 0}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            inCart
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40'
                          }`}
                        >
                          <Plus size={14} />
                          {inCart ? `ထည့်ပြီး (${inCart.quantity})` : 'Cart ထဲထည့်မည်'}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedPart(part);
                            setIsQrModalOpen(true);
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="QR Label"
                          aria-label="QR Label"
                        >
                          <QrCode size={14} />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedPart(part);
                            setAdjustmentForm({ reason: 'PHYSICAL_COUNT_AUDIT', adjustedQty: part.currentStock, notes: '' });
                            setIsAdjustmentModalOpen(true);
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="Adjust Stock"
                          aria-label="Adjust Stock"
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 5 COLUMNS: POS Cart & Checkout Panel */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden sticky top-6">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-emerald-400" size={20} />
                <h3 className="font-bold text-base">ထုတ်ပေးမည့် ခြင်းတောင်း (Issue Cart)</h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-300 hover:text-white flex items-center gap-1 bg-rose-900/40 px-2 py-1 rounded"
                >
                  <Trash2 size={12} /> ရှင်းထုတ်မည်
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto border-b border-slate-200 bg-slate-50/50">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  ထုတ်ပေးမည့် ပစ္စည်း ကတ်ထဲသို့ မထည့်ရသေးပါ။
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.part.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs truncate">{item.part.name}</h4>
                      <p className="font-mono text-[10px] text-blue-700 font-semibold">{item.part.partNumber}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50">
                        <button
                          onClick={() => updateCartQuantity(item.part.id, -1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded-l-lg"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 font-bold text-xs text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.part.id, 1)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded-r-lg"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.part.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Metadata Form */}
            <form onSubmit={handleCheckout} className="p-4 space-y-4">
              <div>
                <label htmlFor="issue-date" className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                  ထုတ်ပေးသည့် ရက်စွဲ *
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  value={issueMetadata.date}
                  onChange={(e) => setIssueMetadata({ ...issueMetadata, date: e.target.value })}
                  id="issue-date"
                />
              </div>

              <div>
                <SearchableSelect
                  label="ထုတ်ပေးမည့် စက်/ယာဉ် (မဖြစ်မနေ မဟုတ်ပါ)"
                  options={equipmentOptions}
                  value={issueMetadata.equipmentId}
                  onChange={(val) => setIssueMetadata({ ...issueMetadata, equipmentId: val })}
                  id="issue-equipment-select"
                />
              </div>

              <div>
                <label htmlFor="issue-ref" className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                  ကိုးကားနံပါတ် / Work Order #
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. WO-2026-08"
                  value={issueMetadata.referenceId}
                  onChange={(e) => setIssueMetadata({ ...issueMetadata, referenceId: e.target.value })}
                  id="issue-ref"
                />
              </div>

              <div>
                <label htmlFor="issue-notes" className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                  မှတ်ချက်
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ထုတ်ပေးသည့် အကြောင်းအရာ..."
                  value={issueMetadata.notes}
                  onChange={(e) => setIssueMetadata({ ...issueMetadata, notes: e.target.value })}
                  id="issue-notes"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={cart.length === 0 || isSubmittingIssue}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                >
                  <CheckCircle size={18} />
                  {isSubmittingIssue ? 'ထုတ်ပေးနေပါသည်...' : `အတည်ပြု ထုတ်ပေးမည် (${cart.reduce((a, b) => a + b.quantity, 0)} Items)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">
            မကြာသေးမီက ထုတ်ပေးမှု မှတ်တမ်းများ ({transactions.length})
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

      {/* QR LABEL MODAL */}
      {isQrModalOpen && selectedPart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in text-center p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <QrCode className="text-blue-600" size={18} /> QR / Barcode Label
              </h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="border-2 border-dashed border-slate-300 p-6 rounded-xl bg-slate-50 space-y-3">
              <div className="w-32 h-32 bg-white border-2 border-slate-900 mx-auto flex items-center justify-center font-mono text-[10px] p-2 shadow-inner">
                <div className="text-slate-800 font-extrabold flex flex-col items-center">
                  <div className="text-[8px] bg-slate-900 text-white px-1 py-0.5 rounded mb-1">JPM-ERP</div>
                  <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white text-[9px] font-bold p-1 text-center">
                    [QR CODE]
                  </div>
                  <span className="text-[9px] mt-1">{selectedPart.partNumber}</span>
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">{selectedPart.name}</h4>
                <p className="font-mono text-xs text-blue-600 font-bold">{selectedPart.partNumber}</p>
                <p className="text-xs text-slate-500 mt-1">Rack Location: <span className="font-bold text-slate-700">{selectedPart.location || 'N/A'}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsQrModalOpen(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">
                ပိတ်မည်
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Printer size={14} /> Label ပုံနှိပ်မည် (Print Label)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && selectedPart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <SlidersHorizontal size={18} /> Stock Adjustment / Write-off
              </h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const diff = adjustmentForm.adjustedQty - selectedPart.currentStock;
                if (diff === 0) {
                  alert('စတော့ အရေအတွက် မပြောင်းလဲပါ။');
                  return;
                }
                try {
                  await inventoryAPI.createTransaction({
                    date: new Date().toISOString().split('T')[0],
                    type: diff > 0 ? InventoryTxType.RESTOCK_UNUSED : InventoryTxType.USAGE,
                    partId: selectedPart.id,
                    quantity: Math.abs(diff),
                    notes: `[Stock Adjustment: ${adjustmentForm.reason}] ${adjustmentForm.notes}`,
                  });
                  await refreshData();
                  setIsAdjustmentModalOpen(false);
                  alert('စတော့ ပြင်ဆင်ညှိနှိုင်းမှု အောင်မြင်ပါသည်။');
                } catch (err: any) {
                  alert(`အမှားအယွင်း: ${err.message || 'စတော့ ပြင်ဆင်ရန် မအောင်မြင်ပါ'}`);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <span className="text-slate-400 block mb-0.5">ပစ္စည်းအမည်</span>
                <p className="font-bold text-slate-800 text-sm">{selectedPart.name} ({selectedPart.partNumber})</p>
                <p className="text-slate-500">လက်ရှိစတော့: <span className="font-extrabold text-blue-600">{selectedPart.currentStock} {selectedPart.unit}</span></p>
              </div>

              <div>
                <label htmlFor="adjust-reason-select" className="block font-bold text-slate-600 mb-1">ပြင်ဆင်လိုသည့် အကြောင်းအရင်း (Reason)</label>
                <select
                  id="adjust-reason-select"
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none"
                  value={adjustmentForm.reason}
                  onChange={(e: any) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                >
                  <option value="PHYSICAL_COUNT_AUDIT">Physical Stock Count Audit (စတော့စစ်ဆေးတွေ့ရှိချက်)</option>
                  <option value="DAMAGED">Damaged / Broken (ပျက်စီး/ကျိုးပဲ့)</option>
                  <option value="EXPIRED">Expired / Quality Issue (သက်တမ်းလွန်/အရည်အသွေးမမီ)</option>
                  <option value="WRITE_OFF">Write-off / Lost (ပယ်ဖျက်/ပျောက်ဆုံး)</option>
                </select>
              </div>

              <div>
                <label htmlFor="adjust-qty-input" className="block font-bold text-slate-600 mb-1">စတော့ ပမာဏ အသစ် (Adjusted Stock Qty)</label>
                <input
                  id="adjust-qty-input"
                  type="number"
                  min="0"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  value={adjustmentForm.adjustedQty}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustedQty: Number(e.target.value) })}
                />
              </div>

              <div>
                <label htmlFor="adjust-notes-input" className="block font-bold text-slate-600 mb-1">မှတ်ချက် (Notes)</label>
                <input
                  id="adjust-notes-input"
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none"
                  placeholder="စတော့ ညှိနှိုင်းမှု မှတ်ချက်..."
                  value={adjustmentForm.notes}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">
                  မလုပ်တော့ပါ
                </button>
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg shadow hover:bg-slate-800">
                  Save Adjustment
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
