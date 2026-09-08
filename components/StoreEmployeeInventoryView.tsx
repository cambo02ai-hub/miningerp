import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { inventoryAPI, equipmentAPI, locationsAPI } from '../services/api';
import { SparePart, InventoryTransaction, InventoryTxType } from '../types';
import {
  Search,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  QrCode,
  SlidersHorizontal,
  Printer,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Store,
  Layers,
  X,
  ChevronRight,
  User,
  History,
  Box,
  Building
} from 'lucide-react';
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
  const [_error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeNavTab, setActiveNavTab] = useState<'catalog' | 'history'>('catalog');

  // POS Issue Cart State & Drawer Modal Toggle
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [issueMetadata, setIssueMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    equipmentId: '',
    referenceId: '',
    notes: '',
  });
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Modal States for QR & Stock Adjustments
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

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

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
      setIsCartOpen(false);
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
    <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col pb-24 shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
      {/* Mobile Top App Header */}
      <div className="bg-slate-900 text-white p-4 pt-5 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Store size={20} />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                Store Employee App
              </h1>
              <p className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                <User size={10} className="text-emerald-400" />
                {currentUser?.fullName || currentUser?.username || 'Store Staff'}
              </p>
            </div>
          </div>

          <button
            onClick={refreshData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            aria-label="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>

        {/* Store Selector Filter Bar */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <Building className="text-emerald-400 flex-shrink-0" size={16} />
          <div className="flex-1 min-w-0">
            <label htmlFor="mobile-store-select" className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              Store Location
            </label>
            <select
              id="mobile-store-select"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent text-white text-xs font-bold w-full outline-none cursor-pointer truncate"
            >
              <option value="ALL" className="bg-slate-900 text-white">ဂိုဒေါင် အားလုံး (All Stores)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                  {loc.name} ({loc.code || loc.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeNavTab === 'catalog' ? (
        <div className="flex-1 p-3.5 space-y-3.5">
          {/* Low Stock Warning Card */}
          {lowStockParts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-xs">
                <span className="font-extrabold text-amber-900 dark:text-amber-300">
                  စတော့ လျော့နည်းနေသည် ({lowStockParts.length} မျိုး)
                </span>
                <p className="text-amber-800/80 dark:text-amber-400 text-[11px] mt-0.5 line-clamp-2">
                  {lowStockParts.map((p) => `${p.name} (${p.currentStock})`).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ပစ္စည်းအမည်၊ Part #၊ ရှာရနျ..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'အားလုံး' : cat}
              </button>
            ))}
          </div>

          {/* Spare Parts Cards Catalog */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin text-emerald-500" size={24} />
              <span>စတော့ဒေတာများ ရယူနေပါသည်...</span>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs shadow-sm">
              <Box size={32} className="mx-auto mb-2 text-slate-300" />
              ရှာဖွေမှုနှင့် ကိုက်ညီသော အပိုပစ္စည်း မတွေ့ရှိပါ။
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParts.map((part) => {
                const isLow = part.currentStock <= part.minStockLevel;
                const inCart = cart.find((item) => item.part.id === part.id);
                const storeLoc = locations.find((l) => l.id === part.locationId)?.name || part.location || 'Default Store';

                return (
                  <div
                    key={part.id}
                    className={`bg-white rounded-2xl p-3.5 border shadow-sm transition-all relative overflow-hidden ${
                      isLow ? 'border-amber-300/80 bg-amber-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {part.category}
                        </span>
                        {part.brand && (
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                            {part.brand}
                          </span>
                        )}
                      </div>

                      {isLow && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <AlertTriangle size={10} /> Low
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{part.name}</h3>
                    <p className="font-mono text-[11px] text-blue-700 font-bold mt-0.5">{part.partNumber}</p>

                    <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">လက်ရှိစတော့</span>
                        <span className={`font-black text-sm ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                          {part.currentStock} <span className="text-[10px] font-semibold text-slate-500">{part.unit}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">တည်နေရာ</span>
                        <span className="font-bold text-slate-700 text-[11px] truncate max-w-[110px] inline-block">{storeLoc}</span>
                      </div>
                    </div>

                    {/* Quick Action Button Strip */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      <button
                        onClick={() => addToCart(part)}
                        disabled={part.currentStock <= 0}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                          inCart
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40'
                        }`}
                      >
                        <Plus size={14} />
                        {inCart ? `ခြင်းတောင်းထဲတွင် (${inCart.quantity})` : 'Cart သို့ထည့်မည်'}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedPart(part);
                          setIsQrModalOpen(true);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs active:scale-95 transition-all"
                        aria-label="QR Label"
                      >
                        <QrCode size={16} />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedPart(part);
                          setAdjustmentForm({ reason: 'PHYSICAL_COUNT_AUDIT', adjustedQty: part.currentStock, notes: '' });
                          setIsAdjustmentModalOpen(true);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs active:scale-95 transition-all"
                        aria-label="Adjust Stock"
                      >
                        <SlidersHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* History View Tab */
        <div className="flex-1 p-3.5 space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <History size={16} className="text-emerald-600" /> မကြာသေးမီက ထုတ်ပေးမှုများ
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {transactions.length} Records
            </span>
          </div>

          <div className="space-y-2.5">
            {transactions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
                ထုတ်ပေးထားသော မှတ်တမ်းများ မရှိသေးပါ။
              </div>
            ) : (
              transactions.slice(0, 30).map((tx) => {
                const part = parts.find((p) => p.id === tx.partId);
                const isIssue = tx.type === InventoryTxType.USAGE || tx.type === InventoryTxType.RETURN_VENDOR;
                return (
                  <div key={tx.id} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isIssue ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{tx.date}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs truncate">{part?.name || 'Unknown Part'}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {tx.referenceId ? `Ref: ${tx.referenceId}` : tx.equipmentId ? `Equipment ID: ${tx.equipmentId}` : 'Direct Store Issue'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-black text-sm text-slate-900 block">
                        {tx.quantity} {part?.unit || 'Pcs'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {tx.performedBy || 'Store Staff'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Badge Button */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 z-40 animate-bounce-short">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-5 rounded-2xl shadow-xl shadow-emerald-900/30 flex items-center justify-between transition-all active:scale-95"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 bg-emerald-700 rounded-xl">
                <ShoppingCart size={18} />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              </div>
              <span className="text-xs tracking-tight">ထုတ်ပေးရန် ပြင်ဆင်နေသည် ({cart.length} Items)</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-3 py-1 rounded-xl">
              <span>Checkout</span>
              <ChevronRight size={14} />
            </div>
          </button>
        </div>
      )}

      {/* Bottom App Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 z-30 px-6 py-2.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveNavTab('catalog')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeNavTab === 'catalog' ? 'text-emerald-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers size={20} />
          <span className="text-[10px]">Catalog</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 relative"
        >
          <ShoppingCart size={20} />
          {totalCartCount > 0 && (
            <span className="absolute -top-1 right-2 bg-emerald-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
              {totalCartCount}
            </span>
          )}
          <span className="text-[10px]">Cart Issue</span>
        </button>

        <button
          onClick={() => setActiveNavTab('history')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeNavTab === 'history' ? 'text-emerald-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <History size={20} />
          <span className="text-[10px]">History</span>
        </button>
      </div>

      {/* POS Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-0 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-4 px-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-emerald-400" size={20} />
                <h3 className="font-extrabold text-sm">ထုတ်ပေးမည့် ခြင်းတောင်း (Issue Cart)</h3>
              </div>

              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-rose-300 hover:text-rose-100 bg-rose-900/50 px-2 py-1 rounded-lg"
                  >
                    ရှင်းထုတ်မည်
                  </button>
                )}
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-4 space-y-2.5 overflow-y-auto flex-1 bg-slate-50 border-b border-slate-200 max-h-60">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  ခြင်းတောင်းထဲတွင် ပစ္စည်း မရှိသေးပါ။
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.part.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{item.part.name}</h4>
                      <p className="font-mono text-[10px] text-blue-700 font-semibold">{item.part.partNumber}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50">
                        <button
                          onClick={() => updateCartQuantity(item.part.id, -1)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-l-xl"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2.5 font-bold text-xs text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.part.id, 1)}
                          className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-r-xl"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.part.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleCheckout} className="p-4 space-y-3.5 bg-white">
              <div>
                <label htmlFor="drawer-issue-date" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  ထုတ်ပေးသည့် ရက်စွဲ *
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  value={issueMetadata.date}
                  onChange={(e) => setIssueMetadata({ ...issueMetadata, date: e.target.value })}
                  id="drawer-issue-date"
                />
              </div>

              <div>
                <SearchableSelect
                  label="ထုတ်ပေးမည့် စက်/ယာဉ် (မဖြစ်မနေ မဟုတ်ပါ)"
                  options={equipmentOptions}
                  value={issueMetadata.equipmentId}
                  onChange={(val) => setIssueMetadata({ ...issueMetadata, equipmentId: val })}
                  id="drawer-equipment-select"
                />
              </div>

              <div>
                <label htmlFor="drawer-issue-ref" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  ကိုးကားနံပါတ် / Work Order #
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. WO-2026-08"
                  value={issueMetadata.referenceId}
                  onChange={(e) => setIssueMetadata({ ...issueMetadata, referenceId: e.target.value })}
                  id="drawer-issue-ref"
                />
              </div>

              <div>
                <label htmlFor="drawer-issue-notes" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  မှတ်ချက်
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ထုတ်ပေးသည့် အကြောင်းအရာ..."
                  value={issueMetadata.notes}
                  onChange={(e) => setIssueMetadata({ ...issueMetadata, notes: e.target.value })}
                  id="drawer-issue-notes"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cart.length === 0 || isSubmittingIssue}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                >
                  <CheckCircle size={18} />
                  {isSubmittingIssue ? 'ထုတ်ပေးနေပါသည်...' : `အတည်ပြု ထုတ်ပေးမည် (${totalCartCount} Items)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR LABEL MODAL */}
      {isQrModalOpen && selectedPart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden text-center p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <QrCode className="text-emerald-600" size={16} /> QR / Barcode Label
              </h3>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <div className="border-2 border-dashed border-slate-300 p-4 rounded-2xl bg-slate-50 space-y-2">
              <div className="w-28 h-28 bg-white border-2 border-slate-900 mx-auto flex items-center justify-center font-mono text-[10px] p-2 shadow-inner">
                <div className="text-slate-800 font-extrabold flex flex-col items-center">
                  <div className="text-[7px] bg-slate-900 text-white px-1 py-0.5 rounded mb-1">JPM-ERP</div>
                  <div className="w-14 h-14 bg-slate-900 flex items-center justify-center text-white text-[8px] font-bold p-1 text-center">
                    [QR CODE]
                  </div>
                  <span className="text-[8px] mt-1">{selectedPart.partNumber}</span>
                </div>
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{selectedPart.name}</h4>
                <p className="font-mono text-xs text-blue-600 font-bold">{selectedPart.partNumber}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Rack Location: <span className="font-bold text-slate-700">{selectedPart.location || 'N/A'}</span></p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setIsQrModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl">
                ပိတ်မည်
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && selectedPart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs flex items-center gap-1.5">
                <SlidersHorizontal size={16} /> Stock Adjustment
              </h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-white/80 hover:text-white p-1">✕</button>
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
              className="p-4 space-y-3 text-xs"
            >
              <div>
                <span className="text-slate-400 block mb-0.5 text-[10px]">ပစ္စည်းအမည်</span>
                <p className="font-bold text-slate-800 text-xs">{selectedPart.name} ({selectedPart.partNumber})</p>
                <p className="text-slate-500 text-[11px]">လက်ရှိစတော့: <span className="font-extrabold text-blue-600">{selectedPart.currentStock} {selectedPart.unit}</span></p>
              </div>

              <div>
                <label htmlFor="mobile-adjust-reason" className="block font-bold text-slate-600 mb-1 text-[10px]">အကြောင်းအရင်း</label>
                <select
                  id="mobile-adjust-reason"
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none"
                  value={adjustmentForm.reason}
                  onChange={(e: any) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                >
                  <option value="PHYSICAL_COUNT_AUDIT">Stock Count Audit (စတော့စစ်ဆေးခြင်း)</option>
                  <option value="DAMAGED">Damaged (ပျက်စီး/ကျိုးပဲ့)</option>
                  <option value="EXPIRED">Expired (သက်တမ်းလွန်)</option>
                  <option value="WRITE_OFF">Write-off (ပယ်ဖျက်/ပျောက်ဆုံး)</option>
                </select>
              </div>

              <div>
                <label htmlFor="mobile-adjust-qty" className="block font-bold text-slate-600 mb-1 text-[10px]">စတော့ အသစ် (Adjusted Qty)</label>
                <input
                  id="mobile-adjust-qty"
                  type="number"
                  min="0"
                  required
                  className="w-full border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-xs outline-none focus:ring-2 focus:ring-slate-900"
                  value={adjustmentForm.adjustedQty}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustedQty: Number(e.target.value) })}
                />
              </div>

              <div>
                <label htmlFor="mobile-adjust-notes" className="block font-bold text-slate-600 mb-1 text-[10px]">မှတ်ချက်</label>
                <input
                  id="mobile-adjust-notes"
                  type="text"
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs outline-none"
                  placeholder="မှတ်ချက်..."
                  value={adjustmentForm.notes}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold">
                  မလုပ်တော့ပါ
                </button>
                <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-xl shadow hover:bg-slate-800">
                  Save
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
