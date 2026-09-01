import { formatDate, formatDateTime, formatCurrency } from '../utils/locale';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { inventoryAPI, equipmentAPI, suppliersAPI, employeesAPI, shipmentsAPI, locationsAPI } from '../services/api';
import { getCurrentUser } from '../services/authStorage';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryTxType, SparePart, GoodsShipment, ShipmentItem, InventoryTransaction } from '../types';
import { AlertTriangle, RefreshCw, Plus, Save, BarChart3, PieChart as PieIcon, Trash2, Truck, Printer, DollarSign, CalendarClock } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import InventoryDashboard from './InventoryDashboard';
import PartList from './PartList';
import InventoryTransactions from './InventoryTransactions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const InventoryView: React.FC = () => {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [shipments, setShipments] = useState<GoodsShipment[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Analytics state
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [advancedAnalytics, setAdvancedAnalytics] = useState<any>({ pieData: [] });
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
    const [viewingShipment, setViewingShipment] = useState<GoodsShipment | null>(null);
    const [printingShipment, setPrintingShipment] = useState<GoodsShipment | null>(null);
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [activeTab, setActiveTab] = useState<'inventory' | 'analytics' | 'logistics'>('inventory');

    const doPrintRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [masterSearchTerm, setMasterSearchTerm] = useState('');
    const [selectedStoreLocation, setSelectedStoreLocation] = useState<string>('ALL');

    // New Item Form State
    const [newItemForm, setNewItemForm] = useState({
        partNumber: '',
        name: '',
        brand: '',
        category: 'Consumable',
        currentStock: 0,
        minStockLevel: 0,
        unit: 'PCS',
        locationId: '',
        location: '',
        averageCost: 0,
        preferredSupplierId: ''
    });

    // Transaction Form State
    const [txForm, setTxForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: InventoryTxType.USAGE,
        quantity: 1,
        referenceId: '',
        equipmentId: '',
        supplierId: '',
        notes: '',
        pricePerUnit: 0,
        paymentType: 'CASH',
        dueDate: ''
    });

    // Shipment Form State
    const [shipmentForm, setShipmentForm] = useState({
        date: new Date().toISOString().split('T')[0],
        sourceLocationId: 'LOC-WS',
        targetType: 'LOCATION',
        targetId: '',
        driverId: '',
        vehicleId: '',
        equipmentId: '',
        policeNumber: '',
        doNumber: '',
        notes: '',
        transportProvider: 'INTERNAL',
        driverName: '',
        transportUnit: ''
    });
    const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
    const [tempShipmentItem, setTempShipmentItem] = useState({ partId: '', qty: 1, notes: '', unitCode: '' });

    const queryClient = useQueryClient();

    const refreshData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const txP = inventoryAPI.getTransactions();
            const shipP = shipmentsAPI.getShipments();
            const supP = suppliersAPI.getSuppliers();
            const empP = employeesAPI.getEmployees();
            const locP = locationsAPI.getLocations();

            await Promise.all([
                queryClient.prefetchQuery({ queryKey: ['inventory', 'parts'], queryFn: () => inventoryAPI.getParts() }),
                queryClient.prefetchQuery({ queryKey: ['equipment'], queryFn: () => equipmentAPI.getEquipment() }),
                txP,
                shipP,
                supP,
                empP,
                locP
            ]);

            const partsData = queryClient.getQueryData<SparePart[]>(['inventory', 'parts']) || [];
            const equipmentData = queryClient.getQueryData<any[]>(['equipment']) || [];
            const [txData, shipmentsData, suppliersData, employeesData, locationsData] = await Promise.all([txP, shipP, supP, empP, locP]);
            
            setParts(partsData);
            setTransactions(txData);
            setShipments(shipmentsData);
            setEquipment(equipmentData);
            setSuppliers(suppliersData);
            setEmployees(employeesData);
            setLocations(locationsData);
        } catch (err: any) {
            console.error('Failed to load inventory data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [queryClient]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const getLocationName = useCallback((locationId?: string): string => {
        if (!locationId) return 'Unknown Location';
        const loc = locations.find(l => l.id === locationId);
        return loc ? loc.name : locationId;
    }, [locations]);

    const openTxModal = (part: SparePart | null = null) => {
        setSelectedPart(part);
        setTxForm({
            date: new Date().toISOString().split('T')[0],
            type: InventoryTxType.USAGE,
            quantity: 1,
            referenceId: '',
            equipmentId: '',
            supplierId: part?.preferredSupplierId || '',
            notes: '',
            pricePerUnit: part ? part.averageCost : 0,
            paymentType: 'CASH',
            dueDate: ''
        });
        setIsTxModalOpen(true);
    };

    const handleDelete = async (id: string, partNumber: string) => {
        if (window.confirm(`Are you sure you want to delete Item ${partNumber}? This action is audited.`)) {
            try {
                await inventoryAPI.deletePart(id);
                await refreshData();
            } catch (e: any) {
                alert("Error deleting item: " + (e.message || 'Failed to delete'));
            }
        }
    };

    const handleNewItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemForm.locationId) {
            alert("Please select a Warehouse Site.");
            return;
        }
        try {
            await inventoryAPI.createPart({
                partNumber: newItemForm.partNumber,
                name: newItemForm.name,
                brand: newItemForm.brand,
                category: newItemForm.category as any,
                currentStock: Number(newItemForm.currentStock),
                minStockLevel: Number(newItemForm.minStockLevel),
                unit: newItemForm.unit,
                locationId: newItemForm.locationId,
                location: newItemForm.location,
                averageCost: Number(newItemForm.averageCost),
                preferredSupplierId: newItemForm.preferredSupplierId || undefined
            });
            await refreshData();
            setIsMasterModalOpen(false);
            setNewItemForm({
                partNumber: '', name: '', brand: '', category: 'Consumable', currentStock: 0, minStockLevel: 0, unit: 'PCS', locationId: '', location: '', averageCost: 0, preferredSupplierId: ''
            });
        } catch (e: any) {
            alert("Failed to add item: " + (e.message || 'Unknown error'));
        }
    };

    const handleTxSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPart) {
            alert("Please select a part.");
            return;
        }

        if ((txForm.type === InventoryTxType.PURCHASE || txForm.type === InventoryTxType.RETURN_VENDOR) && !txForm.supplierId) {
            alert("Please select a Supplier for this transaction type.");
            return;
        }

        if (txForm.type === InventoryTxType.PURCHASE && txForm.paymentType === 'CREDIT' && !txForm.dueDate) {
            alert("Please specify Due Date (Jatuh Tempo) for Credit transactions.");
            return;
        }

        try {
            await inventoryAPI.createTransaction({
                date: txForm.date,
                type: txForm.type,
                partId: selectedPart.id,
                quantity: Number(txForm.quantity),
                pricePerUnit: Number(txForm.pricePerUnit),
                referenceId: txForm.referenceId || undefined,
                equipmentId: txForm.equipmentId || undefined,
                supplierId: txForm.supplierId || undefined,
                notes: txForm.notes || undefined,
                paymentType: txForm.paymentType,
                dueDate: txForm.dueDate,
            });

            await refreshData();
            setIsTxModalOpen(false);
        } catch (err: any) {
            alert(`Error: ${err.message || 'Failed to process transaction'}`);
        }
    };

    const handleAddShipmentItem = () => {
        if (!tempShipmentItem.partId) return;
        const part = parts.find(p => p.id === tempShipmentItem.partId);
        if (!part) return;

        if (part.currentStock < tempShipmentItem.qty) {
            alert(`Insufficient Stock! Available: ${part.currentStock}`);
            return;
        }

        setShipmentItems([...shipmentItems, {
            partId: part.id,
            partName: part.name,
            partNumber: part.partNumber,
            unit: part.unit,
            quantity: tempShipmentItem.qty,
            notes: tempShipmentItem.notes,
            unitCode: tempShipmentItem.unitCode
        }]);
        setTempShipmentItem({ partId: '', qty: 1, notes: '', unitCode: '' });
    };

    const handleShipmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (shipmentItems.length === 0) {
            alert("Please add items to shipment.");
            return;
        }
        try {
            let targetName = '';
            if (shipmentForm.targetType === 'LOCATION') {
                targetName = getLocationName(shipmentForm.targetId);
            } else {
                targetName = suppliers.find(s => s.id === shipmentForm.targetId)?.name || 'Unknown Vendor';
            }

            const sourceLocationName = getLocationName(shipmentForm.sourceLocationId);

            const payload = {
                date: shipmentForm.date,
                sourceLocationId: shipmentForm.sourceLocationId,
                sourceLocationName: sourceLocationName,
                targetType: shipmentForm.targetType,
                targetId: shipmentForm.targetId,
                targetName: targetName,
                transportProvider: shipmentForm.transportProvider,
                driverName: shipmentForm.transportProvider === 'INTERNAL' ? shipmentForm.driverId : shipmentForm.driverName,
                transportUnit: shipmentForm.transportProvider === 'INTERNAL' ? shipmentForm.vehicleId : shipmentForm.transportUnit,
                policeNumber: shipmentForm.policeNumber,
                doNumber: shipmentForm.doNumber || undefined,
                status: 'PENDING',
                notes: shipmentForm.notes || '',
                items: shipmentItems.map(item => ({
                    partId: item.partId,
                    partName: item.partName,
                    partNumber: item.partNumber,
                    unit: item.unit,
                    quantity: item.quantity,
                    notes: item.notes,
                    unitCode: item.unitCode
                }))
            };

            await shipmentsAPI.createShipment(payload);
            setIsShipmentModalOpen(false);
            setShipmentForm({
                date: new Date().toISOString().split('T')[0],
                sourceLocationId: 'LOC-WS',
                targetType: 'LOCATION',
                targetId: '',
                driverId: '',
                vehicleId: '',
                equipmentId: '',
                policeNumber: '',
                doNumber: '',
                notes: '',
                transportProvider: 'INTERNAL',
                driverName: '',
                transportUnit: ''
            });
            setShipmentItems([]);
            refreshData();
            alert('Shipment created successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to create shipment');
        }
    };

    const handlePrintDO = (shipment: GoodsShipment) => {
        setPrintingShipment(shipment);
        setTimeout(() => {
            if (doPrintRef.current) {
                const printWindow = window.open('', '', 'height=800,width=1000');
                if (printWindow) {
                    printWindow.document.write('<html><head><title>DO ပုံနှိပ်ရန်</title>');
                    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                    printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } table { border-collapse: collapse; } .main-table td, .main-table th { border: 1px solid black; } }</style>');
                    printWindow.document.write('</head><body class="bg-white">');
                    printWindow.document.write(doPrintRef.current.innerHTML);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
                }
            }
        }, 100);
    };

    const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
        if (!window.confirm(`Are you sure you want to update status to ${newStatus}?`)) return;

        try {
            await shipmentsAPI.updateShipmentStatus(shipmentId, newStatus);
            await refreshData();
        } catch (err: any) {
            console.error('Status update failed:', err);
            alert(`Failed to update status: ${err.message || 'Unknown error'}`);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ဆိုင်းငံ့ထားသည်' },
            'IN_TRANSIT': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ပို့ဆောင်နေသည်' },
            'DELIVERED': { bg: 'bg-green-100', text: 'text-green-800', label: 'ပို့ဆောင်ပြီး' },
            'CANCELLED': { bg: 'bg-red-100', text: 'text-red-800', label: 'ပယ်ဖျက်ပြီး' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['PENDING'];
        return (
            <span className={`${config.bg} ${config.text} px-2 py-1 rounded text-xs font-bold`}>
                {config.label}
            </span>
        );
    };

    // Store-Filtered Parts Base
    const storeFilteredPartsBase = useMemo(() => {
        if (selectedStoreLocation === 'ALL') return parts;
        return parts.filter(p => p.locationId === selectedStoreLocation);
    }, [parts, selectedStoreLocation]);

    // Stats calculated dynamically based on Multi-Store filter
    const totalItems = storeFilteredPartsBase.length;
    const lowStockItems = storeFilteredPartsBase.filter(p => p.currentStock <= p.minStockLevel).length;
    const totalValue = storeFilteredPartsBase.reduce((acc, curr) => acc + (curr.currentStock * curr.averageCost), 0);

    // Analytics Data
    const loadAnalytics = useCallback(async () => {
        try {
            setAnalyticsLoading(true);
            const data = await inventoryAPI.getAnalytics();
            setAnalyticsData(data.monthlyData || []);
            setAdvancedAnalytics({
                pieData: data.categoryDistribution || []
            });
        } catch (err: any) {
            console.error('Failed to load analytics:', err);
            setAnalyticsData([]);
            setAdvancedAnalytics({ pieData: [] });
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'analytics' && !analyticsLoading && analyticsData.length === 0) {
            loadAnalytics();
        }
    }, [activeTab, analyticsLoading, analyticsData.length, loadAnalytics]);

    // Filtered Parts (Master List) with Search and Multi-Store filter
    const filteredParts = useMemo(() => {
        const term = masterSearchTerm.toLowerCase();
        return parts.filter(p => {
            const matchSearch =
                (p.name || '').toLowerCase().includes(term) ||
                (p.partNumber || '').toLowerCase().includes(term) ||
                (p.location || '').toLowerCase().includes(term);
            const matchStore = selectedStoreLocation === 'ALL' || p.locationId === selectedStoreLocation;
            return matchSearch && matchStore;
        });
    }, [parts, masterSearchTerm, selectedStoreLocation]);

    // Filtered Transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesType = filterType === 'ALL' || tx.type === filterType;
            const part = parts.find(p => p.id === tx.partId);
            const searchString = `${part?.name} ${part?.partNumber} ${tx.referenceId} ${tx.performedBy}`.toLowerCase();
            const matchesText = searchString.includes(filterText.toLowerCase());
            return matchesType && matchesText;
        });
    }, [transactions, filterText, filterType, parts]);

    // Options for Selects
    const partOptions = parts.map(p => ({
        value: p.id,
        label: `${p.name} (${p.currentStock} ${p.unit})`,
        subLabel: p.partNumber
    }));

    const equipmentOptions = equipment.map(eq => ({
        value: eq.id,
        label: `${eq.code} - ${eq.model}`,
        subLabel: eq.status
    }));

    const categoryOptions = [
        { value: 'Engine', label: 'Engine' },
        { value: 'Hydraulic', label: 'Hydraulic' },
        { value: 'Undercarriage', label: 'အောက်ပိုင်းစနစ်' },
        { value: 'Consumable', label: 'Consumable' },
        { value: 'Electrical', label: 'Electrical' }
    ];

    const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name, subLabel: s.type }));

    const locationOptions = locations.map((loc: any) => ({
        value: loc.id,
        label: loc.name,
        subLabel: loc.address
    }));

    const driverOptions = employees
        .filter((emp: any) => emp.position?.toLowerCase().includes('driver') || emp.department?.toLowerCase().includes('driver'))
        .map((emp: any) => ({
            value: emp.id,
            label: emp.name,
            subLabel: emp.phone || emp.position
        }));

    const vehicleOptions = equipment
        .filter((eq: any) => eq.type === 'Vehicle' || eq.category === 'Vehicle')
        .map((eq: any) => ({
            value: eq.id,
            label: `${eq.name} (${eq.code || ''})`,
            subLabel: `${eq.model || ''} - ${eq.status || ''}`
        }));

    const txTypeOptions = [
        { value: InventoryTxType.USAGE, label: 'သုံးစွဲခြင်း' },
        { value: InventoryTxType.PURCHASE, label: 'ဝယ်ယူခြင်း' },
        { value: InventoryTxType.CANNIBAL_HARVEST, label: 'အစိတ်အပိုင်းခွဲယူခြင်း' },
        { value: InventoryTxType.RETURN_VENDOR, label: 'ရောင်းချသူထံ ပြန်အပ်ခြင်း' },
        { value: InventoryTxType.RESTOCK_UNUSED, label: 'မသုံးဖြစ်သေး၍ စတော့ပြန်ဖြည့်ခြင်း' }
    ];

    const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">စတော့နှင့် အပိုပစ္စည်းများ</h2>
                    <p className="text-slate-500 text-sm">ဝယ်ယူခြင်း၊ သုံးစွဲခြင်းနှင့် ပိုင်ဆိုင်မှုခွဲဝေခြင်း</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white border rounded-lg p-1 flex mr-2">
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'inventory' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
                        >
                            Stock &quot; Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('logistics')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'logistics' ? 'bg-purple-100 text-purple-700' : 'text-slate-500'}`}
                        >
                            Logistics / DO
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'analytics' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}
                        >
                            Advanced Analytics
                        </button>
                    </div>
                    <button
                        onClick={() => setIsMasterModalOpen(true)}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <Plus size={18} />
                        Add New Item
                    </button>
                    {getCurrentUser()?.role !== 'MANAGER' && (
                        <button
                            onClick={() => openTxModal(null)}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Process Transaction
                        </button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading && !error && (
                <div className="flex justify-center items-center py-12">
                    <div className="text-slate-600 flex items-center gap-3">
                        <RefreshCw size={24} className="animate-spin" />
                        <span>စတော့ဒေတာ တင်နေပါသည်...</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                    <div>
                        <div className="font-semibold text-red-800">ဒေတာတင်ရာတွင် မအောင်မြင်ပါ</div>
                        <div className="text-red-600 text-sm">{error}</div>
                        <button
                            onClick={() => refreshData()}
                            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Existing Content Rendered Here Based on Tab (Same as before) */}
            {!loading && !error && activeTab === 'inventory' && (
                <>
                    {/* KPI Cards */}
                    <InventoryDashboard
                        totalItems={totalItems}
                        lowStockItems={lowStockItems}
                        totalValue={totalValue}
                    />

                    {/* Inventory Table */}
                    <PartList
                        parts={parts}
                        filteredParts={filteredParts}
                        masterSearchTerm={masterSearchTerm}
                        onMasterSearchTermChange={setMasterSearchTerm}
                        selectedStoreLocation={selectedStoreLocation}
                        onStoreLocationChange={setSelectedStoreLocation}
                        locations={locations}
                        onTransaction={openTxModal}
                        onDelete={handleDelete}
                        getLocationName={getLocationName}
                    />

                    {/* Transaction History Log */}
                    <InventoryTransactions
                        transactions={transactions}
                        filteredTransactions={filteredTransactions}
                        parts={parts}
                        equipment={equipment}
                        filterText={filterText}
                        filterType={filterType}
                        onFilterTextChange={setFilterText}
                        onFilterTypeChange={setFilterType}
                    />
                </>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Chart 1: Ratio Analysis (Bar) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-blue-500" />
                                    Purchase Request vs. Usage
                                </h3>
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Legend />
                                        <Bar dataKey="purchase" name="Procurement (In)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="usage" name="Actual Usage (Out)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Inventory Value by Category (Pie) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <PieIcon size={20} className="text-purple-500" />
                                    Inventory Value Distribution (ABC)
                                </h3>
                            </div>
                            <div className="h-72 flex">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={advancedAnalytics.pieData}
                                            cx="50%" cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {advancedAnalytics.pieData.map((entry: any, index: number) => ( // Added type any and index
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logistics' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <div>
                            <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2"><Truck size={20} /> Goods Shipment Control</h3>
                            <p className="text-xs text-purple-600">အပိုပစ္စည်းနှင့် ပစ္စည်းများအတွက် ပို့ဆောင်လွှာများကို စီမံပါ။</p>
                        </div>
                        <button onClick={() => setIsShipmentModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            <Plus size={16} /> Create New Shipment
                        </button>
                    </div>

                    {/* Shipment List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">ရက်စွဲ</th>
                                    <th className="px-6 py-3">DO နံပါတ်</th>
                                    <th className="px-6 py-3">ပို့ဆောင်မည့်နေရာ</th>
                                    <th className="px-6 py-3">ယာဉ်မောင်း / ယာဉ်</th>
                                    <th className="px-6 py-3">ပစ္စည်းများ</th>
                                    <th className="px-6 py-3">အခြေအနေ</th>
                                    <th className="px-6 py-3 text-right">လုပ်ဆောင်ချက်</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shipments.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-700">{s.date}</td>
                                        <td className="px-6 py-3 font-mono font-bold text-blue-700">{s.doNumber}</td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-800">{s.targetName}</div>
                                            <div className="text-xs text-slate-500">From: {s.sourceLocationName}</div>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-600">
                                            <div>{s.driverName || 'N/A'}</div>
                                            <div className="font-mono text-[10px]">{s.policeNumber || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{s.items.length} Lines</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(s.status)}
                                                {s.status !== 'DELIVERED' && s.status !== 'CANCELLED' && (
                                                    <select
                                                        className="text-xs border border-slate-300 rounded px-2 py-1 outline-none"
                                                        value={s.status}
                                                        onChange={(e) => handleStatusUpdate(s.id, e.target.value)}
                                                    >
                                                        <option value="PENDING">ဆိုင်းငံ့ထားသည်</option>
                                                        <option value="IN_TRANSIT">ပို့ဆောင်နေသည်</option>
                                                        <option value="DELIVERED">ပို့ဆောင်ပြီး</option>
                                                        <option value="CANCELLED">ပယ်ဖျက်ရန်</option>
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => setViewingShipment(s)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
                                                    Details
                                                </button>
                                                <button onClick={() => handlePrintDO(s)} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-slate-700">
                                                    <Printer size={12} /> Print
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Transaction Modal */}
            {isTxModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in">
                        {/* Header - Fixed */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">စတော့ လှုပ်ရှားမှု</h3>
                                <p className="text-xs text-slate-500 mt-1">အဝင် / အထွက် လှုပ်ရှားမှု မှတ်တမ်းတင်ရန်</p>
                            </div>
                            <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        {/* Form - Flex Column */}
                        <form onSubmit={handleTxSubmit} className="flex flex-col flex-1 min-h-0">
                            {/* Scrollable Content */}
                            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <SearchableSelect
                                        label="ပစ္စည်းရွေးရန်"
                                        options={partOptions}
                                        value={selectedPart?.id || ''}
                                        onChange={(val) => {
                                            const p = parts.find(x => x.id === val);
                                            setSelectedPart(p || null);
                                            // Auto-set price if exists
                                            if (p) setTxForm(prev => ({ ...prev, pricePerUnit: p.averageCost, supplierId: p.preferredSupplierId || '' }));
                                        }}
                                        required
                                        id="tx-select-item" // Added ID for accessibility
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="tx-date-input" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ရက်စွဲ</label>
                                        <input
                                            type="date" required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={txForm.date}
                                            onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                                            id="tx-date-input" // Added ID for accessibility
                                        />
                                    </div>
                                    <div>
                                        <SearchableSelect label="လှုပ်ရှားမှုအမျိုးအစား" options={txTypeOptions} value={txForm.type} onChange={v => setTxForm({ ...txForm, type: v })} id="tx-type-select" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div>
                                        <label htmlFor="tx-quantity-input" className="block text-xs font-bold text-slate-500 mb-1 uppercase">အရေအတွက်</label>
                                        <input
                                            type="number" required min="1"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                            value={txForm.quantity}
                                            onChange={e => setTxForm({ ...txForm, quantity: Number(e.target.value) })}
                                            id="tx-quantity-input" // Added ID for accessibility
                                        />
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <span className="text-sm text-slate-500 font-medium">{selectedPart?.unit || 'Units'}</span>
                                    </div>
                                </div>

                                {/* Conditional Fields based on Type */}
                                {(txForm.type === InventoryTxType.USAGE || txForm.type === InventoryTxType.CANNIBAL_HARVEST) && (
                                    <div>
                                        <SearchableSelect
                                            label="သက်ဆိုင်ရာ စက်/ယာဉ် (ပိုင်ဆိုင်မှု)"
                                            options={equipmentOptions}
                                            value={txForm.equipmentId}
                                            onChange={(val) => setTxForm({ ...txForm, equipmentId: val })}
                                            id="tx-equipment-select" // Added ID for accessibility
                                        />
                                    </div>
                                )}

                                {(txForm.type === InventoryTxType.PURCHASE || txForm.type === InventoryTxType.RETURN_VENDOR) && (
                                    <div className="space-y-4 bg-green-50 p-3 rounded border border-green-100">
                                        <div>
                                            <SearchableSelect
                                                label="ပစ္စည်းရောင်းချသူ / ဝန်ဆောင်မှုပေးသူ"
                                                options={supplierOptions}
                                                value={txForm.supplierId}
                                                onChange={(val) => setTxForm({ ...txForm, supplierId: val })}
                                                required
                                                id="tx-supplier-select" // Added ID for accessibility
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="tx-unit-price-input" className="block text-xs font-bold text-slate-500 mb-1 uppercase">တစ်ယူနစ်စျေးနှုန်း (ကျပ်)</label>
                                            <input
                                                type="number" min="0"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                value={txForm.pricePerUnit}
                                                onChange={e => setTxForm({ ...txForm, pricePerUnit: Number(e.target.value) })}
                                                placeholder="တစ်ခုချင်းစျေးနှုန်း"
                                                id="tx-unit-price-input" // Added ID for accessibility
                                            />
                                        </div>

                                        {/* PAYMENT TERMS - ONLY FOR PURCHASE */}
                                        {txForm.type === InventoryTxType.PURCHASE && (
                                            <div className="pt-2 border-t border-green-200">
                                                <span className="block text-xs font-bold text-slate-500 mb-1 uppercase">ငွေပေးချေမှုနည်းလမ်း</span>
                                                <div className="flex gap-2 mb-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTxForm({ ...txForm, paymentType: 'CASH' })}
                                                        className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${txForm.paymentType === 'CASH' ? 'bg-white text-green-700 shadow' : 'bg-green-100 text-green-600 opacity-60'}`}
                                                        id="tx-payment-cash-button" // Added ID for accessibility
                                                    >
                                                        <DollarSign size={14} /> CASH / PAID
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTxForm({ ...txForm, paymentType: 'CREDIT' })}
                                                        className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-1 ${txForm.paymentType === 'CREDIT' ? 'bg-white text-amber-700 shadow' : 'bg-green-100 text-green-600 opacity-60'}`}
                                                        id="tx-payment-credit-button" // Added ID for accessibility
                                                    >
                                                        <CalendarClock size={14} /> CREDIT / HUTANG
                                                    </button>
                                                </div>

                                                {txForm.paymentType === 'CREDIT' && (
                                                    <div>
                                                        <label htmlFor="tx-due-date-input" className="block text-xs font-bold text-amber-800 mb-1 uppercase">ပေးချေရမည့်ရက်</label>
                                                        <input
                                                            type="date" required
                                                            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50"
                                                            value={txForm.dueDate}
                                                            onChange={e => setTxForm({ ...txForm, dueDate: e.target.value })}
                                                            id="tx-due-date-input" // Added ID for accessibility
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <label htmlFor="tx-reference-input" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ကိုးကားနံပါတ် (PO/WO/DO)</label>
                                    </div>
                                )}

                                <div>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={txForm.referenceId}
                                        onChange={e => setTxForm({ ...txForm, referenceId: e.target.value })}
                                        placeholder="e.g. PO-2023-001"
                                        id="tx-reference-input" // Added ID for accessibility
                                    />
                                </div>

                                <div>
                                    <label htmlFor="tx-notes-input" className="block text-xs font-bold text-slate-500 mb-1 uppercase">မှတ်ချက်များ</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={txForm.notes}
                                        onChange={e => setTxForm({ ...txForm, notes: e.target.value })}
                                        placeholder="e.g. PO-2023-001"
                                        id="tx-notes-input" // Added ID for accessibility
                                    />
                                </div>
                            </div>

                            {/* Button Footer - Fixed */}
                            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setIsTxModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <RefreshCw size={16} /> Commit Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Master Data Modal (Hidden for brevity, same as before) */}
            {/* New Item Modal */}
            {isMasterModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">အပိုပစ္စည်းအသစ် မှတ်ပုံတင်ရန်</h3>
                                <p className="text-xs text-slate-500 mt-1">အခြေခံဒေတာ စီမံခန့်ခွဲမှု (MDM)</p>
                            </div>
                            <button onClick={() => setIsMasterModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleNewItemSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="new-item-part-number" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ပစ္စည်းနံပါတ် *</label>
                                    <input
                                        type="text" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.partNumber}
                                        onChange={e => setNewItemForm({ ...newItemForm, partNumber: e.target.value })}
                                        id="new-item-part-number" // Added ID for accessibility
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Unique alphanumeric code from OEM catalog.</p>
                                </div>
                                <div>
                                    <label htmlFor="new-item-name" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ပစ္စည်းအမည် *</label>
                                    <input
                                        type="text" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.name}
                                        onChange={e => setNewItemForm({ ...newItemForm, name: e.target.value })}
                                        id="new-item-name" // Added ID for accessibility
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">ရှင်းလင်းသော ပစ္စည်းအမည် (ဥပမာ - Fuel Filter D375)။</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="new-item-brand" className="block text-xs font-bold text-slate-500 mb-1 uppercase">အမှတ်တံဆိပ် / ထုတ်လုပ်သူ</label>
                                    <input
                                        type="text" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.brand}
                                        onChange={e => setNewItemForm({ ...newItemForm, brand: e.target.value })}
                                        placeholder="Komatsu, Cat, etc."
                                        id="new-item-brand" // Added ID for accessibility
                                    />
                                </div>
                                <div className="col-span-1">
                                    <SearchableSelect
                                        label="အမျိုးအစား"
                                        options={categoryOptions}
                                        value={newItemForm.category}
                                        onChange={(val) => setNewItemForm({ ...newItemForm, category: val })}
                                        id="new-item-category-select" // Added ID for accessibility
                                    />
                                </div>
                                <div>
                                    <label htmlFor="new-item-unit" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ယူနစ်</label>
                                    <input
                                        type="text" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.unit}
                                        onChange={e => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                                        placeholder="PCS, SET, MTR"
                                        id="new-item-unit" // Added ID for accessibility
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div>
                                    <label htmlFor="new-item-opening-stock" className="block text-xs font-bold text-slate-500 mb-1 uppercase">အစပိုင်း စတော့</label>
                                    <input
                                        type="number" min="0" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.currentStock}
                                        onChange={e => setNewItemForm({ ...newItemForm, currentStock: Number(e.target.value) })}
                                        id="new-item-opening-stock" // Added ID for accessibility
                                    />
                                </div>
                                <div>
                                    <label htmlFor="new-item-min-stock" className="block text-xs font-bold text-slate-500 mb-1 uppercase">အနည်းဆုံး စတော့အဆင့်</label>
                                    <input
                                        type="number" min="0" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.minStockLevel}
                                        onChange={e => setNewItemForm({ ...newItemForm, minStockLevel: Number(e.target.value) })}
                                        id="new-item-min-stock" // Added ID for accessibility
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">ဒက်ရှ်ဘုတ်သတိပေးချက်ကို ဖွင့်ပေးသည်။</p>
                                </div>
                                <div>
                                    <label htmlFor="new-item-est-price" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ခန့်မှန်းစျေးနှုန်း (ကျပ်)</label>
                                    <input
                                        type="number" min="0" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.averageCost}
                                        onChange={e => setNewItemForm({ ...newItemForm, averageCost: Number(e.target.value) })}
                                        id="new-item-est-price" // Added ID for accessibility
                                    />
                                </div>
                                <div>
                                    <SearchableSelect
                                        label="လုပ်ငန်းခွင် / တည်နေရာ"
                                        options={locationOptions}
                                        value={newItemForm.locationId}
                                        onChange={(val) => setNewItemForm({ ...newItemForm, locationId: val })}
                                        required
                                        id="new-item-site-location" // Added ID for accessibility
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label htmlFor="new-item-rack-code" className="block text-xs font-bold text-slate-500 mb-1 uppercase">စင် / ဘင်ကုဒ်</label>
                                    <input
                                        type="text" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemForm.location}
                                        onChange={e => setNewItemForm({ ...newItemForm, location: e.target.value })}
                                        placeholder="A-01-01"
                                        id="new-item-rack-code" // Added ID for accessibility
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">ဂိုဒေါင်အတွင်းရှိ သီးခြားဘင်နေရာ။</p>
                                </div>
                            </div>

                            <div>
                                <SearchableSelect
                                    label="ဦးစားပေး ရောင်းချသူ"
                                    placeholder="ရောင်းချသူ ရွေးရန်..."
                                    options={supplierOptions}
                                    value={newItemForm.preferredSupplierId}
                                    onChange={(val) => setNewItemForm({ ...newItemForm, preferredSupplierId: val })}
                                    id="new-item-preferred-supplier" // Added ID for accessibility
                                />
                                <p className="text-[10px] text-slate-400 mt-1">ဝယ်ယူရန်တောင်းဆိုမှုများအတွက် မူလရောင်းချသူ။</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsMasterModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Save size={16} /> Save Master Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shipment Modal (DO / Surat Jalan) */}
            {isShipmentModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Truck className="text-purple-600" />
                                    Create Goods Shipment (DO)
                                </h2>
                                <p className="text-sm text-slate-500">ပစ္စည်းပြောင်းရွှေ့ရန် ပို့ဆောင်လွှာ ဖန်တီးပါ။</p>
                            </div>
                            <button onClick={() => setIsShipmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleShipmentSubmit} className="p-6 space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <div>
                                    <label htmlFor="shipment-date" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ရက်စွဲ</label>
                                    <input
                                        type="date" required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={shipmentForm.date}
                                        onChange={e => setShipmentForm({ ...shipmentForm, date: e.target.value })}
                                        id="shipment-date" // Added ID for accessibility
                                    />
                                </div>
                                <div>
                                    <label htmlFor="shipment-do-number" className="block text-xs font-bold text-slate-500 mb-1 uppercase">DO နံပါတ် (မဖြစ်မနေမဟုတ်)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={shipmentForm.doNumber}
                                        onChange={e => setShipmentForm({ ...shipmentForm, doNumber: e.target.value })}
                                        placeholder="ဗလာဖြစ်ပါက အလိုအလျောက်ဖန်တီးမည်"
                                        id="shipment-do-number" // Added ID for accessibility
                                    />
                                </div>
                                <div>
                                    <SearchableSelect
                                        label="မူလတည်နေရာ"
                                        options={locationOptions}
                                        value={shipmentForm.sourceLocationId}
                                        onChange={(val) => setShipmentForm({ ...shipmentForm, sourceLocationId: val })}
                                        required
                                        id="shipment-source-location" // Added ID for accessibility
                                    />
                                </div>
                                <div>
                                    <label htmlFor="shipment-destination-type" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ပို့ဆောင်မည့်နေရာ အမျိုးအစား</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        value={shipmentForm.targetType}
                                        onChange={e => setShipmentForm({ ...shipmentForm, targetType: e.target.value as 'LOCATION' | 'VENDOR' })}
                                        id="shipment-destination-type" // Added ID for accessibility
                                    >
                                        <option value="LOCATION">လုပ်ငန်းခွင်အချင်းချင်း ပြောင်းရွှေ့ခြင်း</option>
                                        <option value="VENDOR">ရောင်းချသူထံ ပြန်အပ်ခြင်း</option>
                                    </select>
                                </div>
                            </div>

                            {/* Target & Transport */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <SearchableSelect
                                        label={shipmentForm.targetType === 'LOCATION' ? "Destination Site" : "Vendor / Supplier"}
                                        options={shipmentForm.targetType === 'LOCATION' ? locationOptions : supplierOptions}
                                        value={shipmentForm.targetId}
                                        onChange={(val) => setShipmentForm({ ...shipmentForm, targetId: val })}
                                        required
                                        id="shipment-destination-target" // Added ID for accessibility
                                    />
                                </div>

                                {/* Transport Provider Selection */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <span className="block text-xs font-bold text-slate-500 mb-3 uppercase">သယ်ယူပို့ဆောင်သူ</span>
                                    <div className="flex gap-4 mb-4" role="radiogroup" aria-labelledby="transport-provider-label">
                                        <label htmlFor="internal-fleet-radio" className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="transportProvider"
                                                checked={shipmentForm.transportProvider === 'INTERNAL'}
                                                onChange={() => setShipmentForm({ ...shipmentForm, transportProvider: 'INTERNAL' })}
                                                className="w-4 h-4 text-purple-600"
                                                id="internal-fleet-radio" // Added ID for accessibility
                                            />
                                            <span className="text-sm font-medium text-slate-700">အတွင်းပိုင်း ယာဉ်အုပ်စု</span>
                                        </label>
                                        <label htmlFor="external-provider-radio" className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="transportProvider"
                                                checked={shipmentForm.transportProvider === 'EXTERNAL'}
                                                onChange={() => setShipmentForm({ ...shipmentForm, transportProvider: 'EXTERNAL' })}
                                                className="w-4 h-4 text-purple-600"
                                                id="external-provider-radio" // Added ID for accessibility
                                            />
                                            <span className="text-sm font-medium text-slate-700">ပြင်ပအဖွဲ့ / ပြင်ပဝန်ဆောင်မှု</span>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {shipmentForm.transportProvider === 'INTERNAL' ? (
                                            <>
                                                <div>
                                                    <SearchableSelect
                                                        label="ယာဉ်မောင်း (အတွင်းပိုင်း)"
                                                        options={driverOptions}
                                                        value={shipmentForm.driverId}
                                                        onChange={(val) => setShipmentForm({ ...shipmentForm, driverId: val })}
                                                        id="shipment-driver-internal" // Added ID for accessibility
                                                    />
                                                </div>
                                                <div>
                                                    <SearchableSelect
                                                        label="အတွင်းပိုင်း ယာဉ် / ယူနစ်"
                                                        options={vehicleOptions}
                                                        value={shipmentForm.vehicleId}
                                                        onChange={(val) => setShipmentForm({ ...shipmentForm, vehicleId: val })}
                                                        id="shipment-vehicle-internal" // Added ID for accessibility
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label htmlFor="shipment-driver-name" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ယာဉ်မောင်းအမည်</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                        value={shipmentForm.driverName}
                                                        onChange={e => setShipmentForm({ ...shipmentForm, driverName: e.target.value })}
                                                        placeholder="ပြင်ပယာဉ်မောင်းအမည်"
                                                        id="shipment-driver-name" // Added ID for accessibility
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="shipment-transport-unit" className="block text-xs font-bold text-slate-500 mb-1 uppercase">သယ်ယူယာဉ် / ရောင်းချသူ</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                        value={shipmentForm.transportUnit}
                                                        onChange={e => setShipmentForm({ ...shipmentForm, transportUnit: e.target.value })}
                                                        placeholder="Trailer၊ Cargo စသည်"
                                                        id="shipment-transport-unit" // Added ID for accessibility
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <label htmlFor="shipment-police-number" className="block text-xs font-bold text-slate-500 mb-1 uppercase">ယာဉ်မှတ်ပုံတင်နံပါတ်</label>
                                            <input
                                                type="text"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                value={shipmentForm.policeNumber}
                                                onChange={e => setShipmentForm({ ...shipmentForm, policeNumber: e.target.value })}
                                                placeholder="B 1234 XX"
                                                id="shipment-police-number" // Added ID for accessibility
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="shipment-notes" className="block text-xs font-bold text-slate-500 mb-1 uppercase">မှတ်ချက်များ (မဖြစ်မနေမဟုတ်)</label>
                                    <textarea
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                        value={shipmentForm.notes}
                                        onChange={e => setShipmentForm({ ...shipmentForm, notes: e.target.value })}
                                        placeholder="ဤပို့ဆောင်မှုအတွက် ထပ်ဆောင်းမှတ်ချက်များ..."
                                        rows={2}
                                        id="shipment-notes" // Added ID for accessibility
                                    />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="border rounded-xl overflow-hidden">
                                <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700 text-sm">ပို့ဆောင်သည့် ပစ္စည်းများ</h4>
                                    <span className="text-xs text-slate-500">{shipmentItems.length} items added</span>
                                </div>

                                {/* Add Item Form */}
                                <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-4">
                                        <label className="block w-full">
                                            <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ပစ္စည်း ရွေးရန်</span>
                                            <select
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                value={tempShipmentItem.partId}
                                                onChange={e => {
                                                    const part = parts.find(p => p.id === e.target.value);
                                                    if (part) {
                                                        setTempShipmentItem({ ...tempShipmentItem, partId: part.id });
                                                    }
                                                }}
                                                id="temp-shipment-part-select"
                                            >
                                                <option value="">ပစ္စည်းရွေးရန်...</option>
                                                {parts.map(p => (
                                                    <option key={p.id} value={p.id}>{p.partNumber} - {p.name} (Stock: {p.currentStock})</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block w-full">
                                            <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ယူနစ်ကုဒ်</span>
                                            <input
                                                type="text"
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                value={tempShipmentItem.unitCode}
                                                onChange={e => setTempShipmentItem({ ...tempShipmentItem, unitCode: e.target.value })}
                                                placeholder="e.g. D 08"
                                                id="temp-shipment-unit-code"
                                            />
                                        </label>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block w-full">
                                            <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">အရေအတွက်</span>
                                            <input
                                                type="number" min="1"
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                value={tempShipmentItem.qty}
                                                onChange={e => setTempShipmentItem({ ...tempShipmentItem, qty: Number(e.target.value) })}
                                                id="temp-shipment-qty"
                                            />
                                        </label>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block w-full">
                                            <span className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">မှတ်ချက်များ</span>
                                            <input
                                                type="text"
                                                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                value={tempShipmentItem.notes}
                                                onChange={e => setTempShipmentItem({ ...tempShipmentItem, notes: e.target.value })}
                                                placeholder="ပစ္စည်းအခြေအနေ..."
                                                id="temp-shipment-notes"
                                            />
                                        </label>
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            type="button"
                                            onClick={handleAddShipmentItem}
                                            disabled={!tempShipmentItem.partId}
                                            className="w-full bg-purple-600 text-white rounded-lg py-1.5 flex justify-center items-center hover:bg-purple-700 disabled:opacity-50"
                                            aria-label="ပစ္စည်းထည့်ရန်"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="max-h-48 overflow-y-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2">ပစ္စည်းနံပါတ်</th>
                                                <th className="px-4 py-2">ပစ္စည်းအမည်</th>
                                                <th className="px-4 py-2">ယူနစ်ကုဒ်</th>
                                                <th className="px-4 py-2 text-center">အရေအတွက်</th>
                                                <th className="px-4 py-2">မှတ်ချက်များ</th>
                                                <th className="px-4 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {shipmentItems.length === 0 ? (
                                                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">ပစ္စည်း မထည့်ရသေးပါ။</td></tr>
                                            ) : (
                                                shipmentItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2 font-mono text-xs">{item.partNumber}</td>
                                                        <td className="px-4 py-2">{item.partName}</td>
                                                        <td className="px-4 py-2 text-xs font-mono text-slate-600">{item.unitCode || '-'}</td>
                                                        <td className="px-4 py-2 text-center font-bold">{item.quantity} {item.unit}</td>
                                                        <td className="px-4 py-2 text-slate-500 text-xs">{item.notes}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShipmentItems(shipmentItems.filter((_, i) => i !== idx))}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsShipmentModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={shipmentItems.length === 0}
                                    className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    Generate DO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shipment Detail Modal */}
            {viewingShipment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">ပို့ဆောင်မှု အသေးစိတ်</h3>
                                <p className="text-sm text-slate-500 mt-1">DO: {viewingShipment.doNumber}</p>
                            </div>
                            <button onClick={() => setViewingShipment(null)} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-slate-600">အခြေအနေ:</span>
                                {getStatusBadge(viewingShipment.status)}
                            </div>

                            {/* General Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 mb-1">ရက်စွဲ</span>
                                    <p className="text-sm font-semibold">{viewingShipment.date}</p>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 mb-1">DO နံပါတ်</span>
                                    <p className="text-sm font-mono font-bold text-blue-600">{viewingShipment.doNumber}</p>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 mb-1">မှ</span>
                                    <p className="text-sm font-semibold">{viewingShipment.sourceLocationName}</p>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 mb-1">သို့</span>
                                    <p className="text-sm font-semibold">{viewingShipment.targetName}</p>
                                    <p className="text-xs text-slate-500">{viewingShipment.targetType}</p>
                                </div>
                            </div>

                            {/* Transport Info */}
                            <div className="border-t pt-4">
                                <h4 className="font-bold text-slate-700 mb-3">သယ်ယူပို့ဆောင်ရေး အချက်အလက်</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">သယ်ယူပို့ဆောင်သူ / ယာဉ်မောင်း</p>
                                        <p className="font-semibold text-sm">{viewingShipment.driverName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">ယာဉ်အမျိုးအစား</p>
                                        <p className="font-semibold text-sm">{viewingShipment.transportUnit}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">ယာဉ်နံပါတ်ပြား</p>
                                        <p className="font-mono font-bold text-sm">{viewingShipment.policeNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">ပို့ဆောင်သည့်ရက်</p>
                                        <p className="font-semibold text-sm">{formatDate(viewingShipment.date)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="border-t pt-4">
                                <h4 className="font-bold text-slate-700 mb-3">ပစ္စည်းများ ({viewingShipment.items.length})</h4>
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-bold">ပစ္စည်းနံပါတ်</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold">ဖော်ပြချက်</th>
                                            <th className="px-3 py-2 text-center text-xs font-bold">အရေအတွက်</th>
                                            <th className="px-3 py-2 text-center text-xs font-bold">ယူနစ်ကုဒ်</th>
                                            <th className="px-3 py-2 text-left w-32 text-xs font-bold">မှတ်ချက်များ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {viewingShipment.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 font-mono text-xs">{item.partNumber}</td>
                                                <td className="px-3 py-2">{item.partName}</td>
                                                <td className="px-3 py-2 text-xs font-mono text-slate-600">{item.unitCode || '-'}</td>
                                                <td className="px-3 py-2 text-center font-bold">{item.quantity} {item.unit}</td>
                                                <td className="px-3 py-2 text-xs italic text-slate-600">{item.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Notes */}
                            {viewingShipment.notes && (
                                <div className="border-t pt-4">
                                    <span className="block text-xs font-bold text-slate-500 mb-2">မှတ်ချက်များ</span>
                                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{viewingShipment.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setViewingShipment(null)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
                                Close
                            </button>
                            <button onClick={() => { handlePrintDO(viewingShipment); setViewingShipment(null); }} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
                                <Printer size={16} /> Print DO
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Hidden Print Template */}
            <div className="hidden">
                <div ref={doPrintRef} className="p-8 max-w-[210mm] mx-auto bg-white text-black font-sans">
                    {printingShipment && (
                        <div className="space-y-6">
                            {/* Professional Header */}
                            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                                {/* Company Logo & Info */}
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex font-black text-4xl tracking-tighter leading-none">
                                            <span className="text-red-600">J</span>
                                            <span className="text-red-600 transform translate-y-1.5">P</span>
                                            <span className="text-red-600">M</span>
                                        </div>
                                        <div className="border-l-2 border-slate-300 pl-3">
                                            <h1 className="text-xl font-bold text-slate-900 leading-tight">PT. JAVA PERSADA MANDIRI</h1>
                                            <p className="text-xs text-slate-600 uppercase tracking-wide">သတ္တုတွင်းကန်ထရိုက်တာနှင့် အကြီးစားစက်ယာဉ် ငှားရမ်းမှု</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600 space-y-0.5 ml-1">
                                        <p>Jl. Ahmad Yani No. 123, Banjarmasin, Kalimantan Selatan 70249</p>
                                        <p>ဖုန်း: +62 511 1234567 | ဖက်စ်: +62 511 1234568</p>
                                        <p>Email: contact@example.com | www.example.com</p>
                                    </div>
                                </div>

                                {/* Document Title & Number */}
                                <div className="text-right">
                                    <h2 className="text-3xl font-bold text-slate-900 mb-2">ပို့ဆောင်လွှာ</h2>
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-lg inline-block">
                                        <p className="text-xs font-semibold mb-0.5">DO နံပါတ်</p>
                                        <p className="text-lg font-mono font-bold tracking-wider">{printingShipment.doNumber}</p>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2">ရက်စွဲ: {formatDate(printingShipment.date)}</p>
                                </div>
                            </div>

                            {/* Ship From / Ship To Grid */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Ship From */}
                                <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-300">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">ပေးပို့ရာနေရာ (ပေးပို့သူ)</h3>
                                    </div>
                                    <p className="font-bold text-lg text-slate-900 mb-1">{printingShipment.sourceLocationName}</p>
                                    <p className="text-sm text-slate-600">လုပ်ငန်းခွင် / ဂိုဒေါင်တည်နေရာ</p>
                                    <p className="text-xs text-slate-500 mt-2">JpMonitor</p>
                                </div>

                                {/* Ship To */}
                                <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-300">
                                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">လက်ခံရာနေရာ (လက်ခံသူ)</h3>
                                    </div>
                                    <p className="font-bold text-lg text-slate-900 mb-1">{printingShipment.targetName}</p>
                                    <p className="text-sm text-slate-600">{printingShipment.targetType === 'LOCATION' ? 'Site Location' : 'Vendor / Supplier'}</p>
                                    <p className="text-xs text-slate-500 mt-2">{printingShipment.targetAddress || 'Kalimantan Selatan, Indonesia'}</p>
                                </div>
                            </div>

                            {/* Transport Details */}
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 rounded-lg p-4 mb-6">
                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Transport Information
                                </h3>
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">သယ်ယူပို့ဆောင်သူ / ယာဉ်မောင်း</p>
                                        <p className="font-semibold text-sm">{printingShipment.driverName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">ယာဉ်အမျိုးအစား</p>
                                        <p className="font-semibold text-sm">{printingShipment.transportUnit}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">ယာဉ်နံပါတ်ပြား</p>
                                        <p className="font-mono font-bold text-sm">{printingShipment.policeNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 uppercase">ပို့ဆောင်သည့်ရက်</p>
                                        <p className="font-semibold text-sm">{formatDate(printingShipment.date)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mb-6">
                                <h3 className="text-sm font-bold uppercase mb-3 text-slate-700">ပို့ဆောင်သည့် ပစ္စည်းများ</h3>
                                <table className="w-full border-collapse border-2 border-slate-300">
                                    <thead>
                                        <tr className="bg-slate-800 text-white text-xs uppercase">
                                            <th className="border border-slate-600 px-3 py-2.5 text-center w-12">စဉ်</th>
                                            <th className="border border-slate-600 px-3 py-2.5 text-left">ပစ္စည်းနံပါတ်</th>
                                            <th className="border border-slate-600 px-3 py-2.5 text-left">ဖော်ပြချက်</th>
                                            <th className="border border-slate-600 px-3 py-2.5 text-center w-20">အရေအတွက်</th>
                                            <th className="border border-slate-600 px-3 py-2.5 text-center w-16">ယူနစ်</th>
                                            <th className="border border-slate-600 px-3 py-2.5 text-center w-24">ယူနစ်ကုဒ်</th>
                                            <th className="border border-slate-600 px-3 py-2.5 text-left w-32">မှတ်ချက်များ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {printingShipment.items.map((item, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="border border-slate-300 px-3 py-2.5 text-center text-slate-700">{idx + 1}</td>
                                                <td className="border border-slate-300 px-3 py-2.5 font-mono text-xs text-slate-900">{item.partNumber}</td>
                                                <td className="border border-slate-300 px-3 py-2.5 text-slate-900">{item.partName}</td>
                                                <td className="border border-slate-300 px-3 py-2.5 text-center font-bold text-slate-900">{item.quantity}</td>
                                                <td className="border border-slate-300 px-3 py-2.5 text-center text-xs uppercase text-slate-700">{item.unit}</td>
                                                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-xs text-slate-700">{item.unitCode || '-'}</td>
                                                <td className="border border-slate-300 px-3 py-2.5 text-xs italic text-slate-600">{item.notes || '-'}</td>
                                            </tr>
                                        ))}
                                        {/* Fill empty rows */}
                                        {Array.from({ length: Math.max(0, 6 - printingShipment.items.length) }).map((_, i) => (
                                            <tr key={`empty-${i}`} className={(printingShipment.items.length + i) % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="border border-slate-300 px-3 py-3.5 text-center text-slate-300">&nbsp;</td>
                                                <td className="border border-slate-300 px-3 py-3.5"></td>
                                                <td className="border border-slate-300 px-3 py-3.5"></td>
                                                <td className="border border-slate-300 px-3 py-3.5"></td>
                                                <td className="border border-slate-300 px-3 py-3.5"></td>
                                                <td className="border border-slate-300 px-3 py-3.5"></td>
                                                <td className="border border-slate-300 px-3 py-3.5"></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Terms & Conditions */}
                            <div className="border-2 border-slate-300 rounded-lg p-4 bg-slate-50 mb-6">
                                <h3 className="text-xs font-bold uppercase mb-2 text-slate-700">စည်းကမ်းချက်များ</h3>
                                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                                    <li>This Delivery Order is an official proof of shipment from JpMonitor.</li>
                                    <li>မှတ်ချက်တွင် အခြားဖော်ပြထားခြင်းမရှိပါက ပစ္စည်းအားလုံးကို ကောင်းမွန်သောအခြေအနေဖြင့် ပို့ဆောင်ထားပါသည်။</li>
                                    <li>လက်ခံသူသည် ပစ္စည်းအားလုံးကို လက်ခံရရှိချိန်တွင် စစ်ဆေးအတည်ပြုရမည်။</li>
                                    <li>ဤစာရွက်စာတမ်းသည် အရောင်းငွေတောင်းခံလွှာ မဟုတ်ဘဲ တရားဝင်ငွေတောင်းခံလွှာဖြင့် ဆက်လက်ပေးပို့မည်။</li>
                                    <li>ပစ္စည်းလျော့နည်းမှု သို့မဟုတ် ပျက်စီးမှုများကို လက်ခံရရှိပြီး ၂၄ နာရီအတွင်း တင်ပြရမည်။</li>
                                </ul>
                                {printingShipment.notes && (
                                    <div className="mt-3 pt-3 border-t border-slate-300">
                                        <p className="text-xs font-semibold text-slate-700">အထူးမှတ်ချက်များ:</p>
                                        <p className="text-xs text-slate-600 italic">{printingShipment.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-3 gap-6 pt-4">
                                <div className="text-center">
                                    <p className="text-xs font-bold mb-1 uppercase text-slate-700">ခွင့်ပြုသူ</p>
                                    <p className="text-xs text-slate-500 mb-12">(Consignor)</p>
                                    <div className="border-t-2 border-slate-800 w-40 mx-auto mb-1"></div>
                                    <p className="text-xs font-semibold text-slate-900">{printingShipment.createdBy || 'Warehouse Manager'}</p>
                                    <p className="text-xs text-slate-500">ရက်စွဲ: _____________</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold mb-1 uppercase text-slate-700">သယ်ယူပို့ဆောင်သူ / ယာဉ်မောင်း</p>
                                    <p className="text-xs text-slate-500 mb-12">(Transport)</p>
                                    <div className="border-t-2 border-slate-800 w-40 mx-auto mb-1"></div>
                                    <p className="text-xs font-semibold text-slate-900">{printingShipment.driverName}</p>
                                    <p className="text-xs text-slate-500">ရက်စွဲ: _____________</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold mb-1 uppercase text-slate-700">လက်ခံသူ</p>
                                    <p className="text-xs text-slate-500 mb-12">(Consignee)</p>
                                    <div className="border-t-2 border-slate-800 w-40 mx-auto mb-1"></div>
                                    <p className="text-xs font-semibold text-slate-900">အမည် / ကုမ္ပဏီတံဆိပ်</p>
                                    <p className="text-xs text-slate-500">ရက်စွဲ: _____________</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-300 pt-4 mt-6 text-center">
                                <p className="text-xs text-slate-400">Generated by jpmonitor System on {formatDateTime(new Date())}</p>
                                <p className="text-xs text-slate-400 mt-1">ဤစာရွက်စာတမ်းကို ကွန်ပျူတာဖြင့် ဖန်တီးထားပြီး လက်မှတ်မပါဘဲ အကျုံးဝင်သည်။</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default InventoryView;