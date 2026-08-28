import { formatCurrency, formatDate, translateValue, translateStatus } from '../utils/locale';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { employeesAPI, suppliersAPI, maintenanceAPI, equipmentAPI, inventoryAPI, mutationsAPI } from '../services/api';
import { useQueryClient } from '@tanstack/react-query'
import { Wrench, X, Printer, PieChart } from 'lucide-react';
import { Equipment, MaintenanceRecord, InventoryTransaction, SparePart } from '../types';
import FleetDashboard from './FleetDashboard';
import EquipmentList from './EquipmentList';
import MaintenanceView from './MaintenanceView';
import FuelLogs from './FuelLogs';
import DailyLogs from './DailyLogs';

// Helper Functions defined outside component to be stable
const calculateEquipmentFinancials = (
    equipmentId: string,
    startDate: string,
    endDate: string,
    maintenanceRecords: MaintenanceRecord[],
    partsHistory: InventoryTransaction[]
) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodLogs = maintenanceRecords.filter(log => {
        const d = new Date(log.startDate);
        return log.equipmentId === equipmentId && d >= start && d <= end;
    });

    const periodParts = partsHistory.filter(tx => {
        const d = new Date(tx.date);
        return tx.equipmentId === equipmentId &&
            tx.type === 'USAGE' &&
            d >= start && d <= end;
    });

    let partsCost = 0;
    let storingCost = 0;
    let externalServiceCost = 0;

    const details: any[] = [];

    periodLogs.forEach(log => {
        const mCost = (log.mechanicStoringCost || 0) + (log.mechanicMealCost || 0) + (log.driverStoringCost || 0);
        const eCost = log.externalCost || 0;

        storingCost += mCost;
        externalServiceCost += eCost;

        if (mCost > 0) {
            details.push({
                date: log.startDate,
                type: 'Operational Overhead',
                description: `WO: ${log.woNumber} (Meals/Allowances)`,
                downtime: 0,
                cost: mCost,
                isCash: true
            });
        }

        if (eCost > 0) {
            details.push({
                date: log.startDate,
                type: 'External Service',
                description: `WO: ${log.woNumber} - ${log.description}`,
                downtime: 0,
                cost: eCost,
                isCash: true
            });
        }
    });

    periodParts.forEach(tx => {
        const cost = (tx.quantity || 0) * (tx.pricePerUnit || 0);
        partsCost += cost;

        details.push({
            date: tx.date,
            type: 'Spare Parts',
            description: `Part Usage: ${tx.partId} (Qty: ${tx.quantity})`,
            downtime: 0,
            cost: cost,
            isCash: true
        });
    });

    const totalCashCost = partsCost + storingCost + externalServiceCost;

    return {
        totalCashCost,
        partsCost,
        storingCost,
        externalServiceCost,
        details: details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
};

const calculateAssetReliabilityMetrics = (
    equipmentId: string,
    startDate: string,
    endDate: string,
    maintenanceRecords: MaintenanceRecord[]
) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalPeriodHours = totalDays * 24;

    const periodLogs = maintenanceRecords.filter(log => {
        const d = new Date(log.startDate);
        return log.equipmentId === equipmentId && d >= start && d <= end;
    });

    let totalDowntimeHours = 0;
    let failureCount = 0;

    periodLogs.forEach(log => {
        let duration = log.durationHours || 0;
        if (!duration && log.endDate && log.endTime && log.startTime) {
            const s = new Date(`${log.startDate}T${log.startTime}`);
            const e = new Date(`${log.endDate}T${log.endTime}`);
            duration = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
        }

        totalDowntimeHours += duration;

        if (log.type === 'Corrective') {
            failureCount++;
        }
    });

    const operationalHours = Math.max(0, totalPeriodHours - totalDowntimeHours);
    const pa = totalPeriodHours > 0 ? Math.round((operationalHours / totalPeriodHours) * 100) : 100;
    const mtbf = failureCount > 0 ? Math.round(operationalHours / failureCount) : operationalHours;
    const mttr = failureCount > 0 ? Math.round(totalDowntimeHours / failureCount) : 0;

    return {
        pa,
        mtbf,
        mttr,
        totalDowntimeHours: Math.round(totalDowntimeHours),
        failureCount
    };
};

const FleetView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
    const [spareParts, setSpareParts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [partsHistory, setPartsHistory] = useState<InventoryTransaction[]>([]);
    const [mutationHistory, setMutationHistory] = useState<any[]>([]);
    const [activeModalTab, setActiveModalTab] = useState<'maintenance' | 'parts' | 'finance' | 'mutations'>('maintenance');

    // Filter State
    const [filterType, setFilterType] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [woFilterStatus, setWoFilterStatus] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Reporting State
    const [costStartDate, setCostStartDate] = useState(new Date().getFullYear() + '-01-01');
    const [costEndDate, setCostEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [financialData, setFinancialData] = useState<any>(null);
    const [reliabilityData, setReliabilityData] = useState<any>(null);

    const printRef = useRef<HTMLDivElement>(null);

    // Form State
    interface LogFormState {
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        type: string;
        priority: string;
        damageType: string;
        description: string;
        notes: string;
        status: string;
        serviceProvider: 'INTERNAL' | 'EXTERNAL';
        technicians: string[];
        mechanicStoringCost: number;
        mechanicMealCost: number;
        driverStoringCost: number;
        supplierId: string;
        externalInvoiceNumber: string;
        externalCost: number;
        useDriver: boolean;
    }

    const [logForm, setLogForm] = useState<LogFormState>({
        startDate: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '17:00',
        type: 'Corrective',
        priority: 'HIGH',
        damageType: 'Hydraulic',
        description: '',
        notes: '',
        status: 'OPEN',
        serviceProvider: 'INTERNAL',
        technicians: [],
        mechanicStoringCost: 0,
        mechanicMealCost: 0,
        driverStoringCost: 0,
        supplierId: '',
        externalInvoiceNumber: '',
        externalCost: 0,
        useDriver: false
    });

    const [editingLog, setEditingLog] = useState<MaintenanceRecord | null>(null);
    const [editForm, setEditForm] = useState({
        status: '',
        notes: '',
        endDate: '',
        endTime: '',
        hmAtStart: 0,
        mechanicStoringCost: 0,
        mechanicMealCost: 0,
        driverStoringCost: 0,
        useDriver: false,
        externalInvoiceNumber: '',
        externalCost: 0
    });

    const [prediction, setPrediction] = useState<{ nextHM: number; type: string; isMajor: boolean } | null>(null);
    const [selectedTechToAdd, setSelectedTechToAdd] = useState<string>('');
    const [selectedPartId, setSelectedPartId] = useState<string>('');
    const [selectedPartQty, setSelectedPartQty] = useState<number>(1);
    const [tempUsedParts, setTempUsedParts] = useState<{ part: SparePart, qty: number }[]>([]);

    const qc = useQueryClient();

    const loadReferenceData = useCallback(async () => {
        try {
            setLoading(true);
            const empP = employeesAPI.getEmployees()
            const supP = suppliersAPI.getSuppliers()
            const maintP = maintenanceAPI.getMaintenanceRecords()
            await Promise.all([
                qc.prefetchQuery({ queryKey: ['equipment'], queryFn: () => equipmentAPI.getEquipment() }),
                qc.prefetchQuery({ queryKey: ['inventory', 'parts'], queryFn: () => inventoryAPI.getParts() }),
                empP,
                supP,
                maintP
            ])
            const equipData = qc.getQueryData<any[]>(['equipment']) || []
            const partsData = qc.getQueryData<any[]>(['inventory', 'parts']) || []
            const [empData, supData, maintData] = await Promise.all([empP, supP, maintP])
            setEmployees(empData)
            setSuppliers(supData)
            setMaintenanceRecords(maintData)
            setEquipment(equipData)
            setSpareParts(partsData)
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.error('Failed to load reference data:', err);
        } finally {
            setLoading(false);
        }
    }, [qc]);

    useEffect(() => {
        loadReferenceData();
    }, [loadReferenceData]);

    const filteredEquipment = useMemo(() => {
        return equipment.filter(eq => {
            const typeMatch = filterType === 'All' || eq.type === filterType;
            const statusMatch = filterStatus === 'All' || eq.status === filterStatus;
            const hideSoldDefault = filterStatus === 'All' ? (eq.status !== 'Sold' && eq.status !== 'Scrapped') : true;

            const searchLower = searchTerm.toLowerCase();
            const searchMatch = eq.code.toLowerCase().includes(searchLower) ||
                eq.model.toLowerCase().includes(searchLower) ||
                (eq.owner || '').toLowerCase().includes(searchLower) ||
                (eq.chassisNumber || '').toLowerCase().includes(searchLower) ||
                (eq.serialNumber || '').toLowerCase().includes(searchLower) ||
                (eq.engineNumber || '').toLowerCase().includes(searchLower);

            return typeMatch && statusMatch && searchMatch && (filterStatus !== 'All' ? true : hideSoldDefault);
        });
    }, [equipment, filterType, filterStatus, searchTerm]);

    const filteredLogs = useMemo(() => {
        return maintenanceRecords.filter(log => {
            return log.equipmentId === selectedEquipment?.id && (woFilterStatus === 'ALL' || log.status === woFilterStatus);
        });
    }, [maintenanceRecords, selectedEquipment, woFilterStatus]);

    const reportLogs = useMemo(() => {
        return maintenanceRecords.filter(log => {
            const d = log.endDate || log.startDate;
            return log.equipmentId === selectedEquipment?.id && d >= costStartDate && d <= costEndDate;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [maintenanceRecords, selectedEquipment, costStartDate, costEndDate]);

    useEffect(() => {
        if (selectedEquipment && logForm.type === 'Preventive') {
            const currentHM = selectedEquipment.hourMeter > 0 ? selectedEquipment.hourMeter : (selectedEquipment.kilometer || 0);
            const nextInterval = Math.ceil((currentHM + 1) / 250) * 250;
            let pmType = 'PM250 (General)';
            let isMajor = false;
            if (nextInterval % 2000 === 0) { pmType = 'PM2000 (Major Overhaul)'; isMajor = true; }
            else if (nextInterval % 1000 === 0) { pmType = 'PM1000 (Major)'; isMajor = true; }
            else if (nextInterval % 500 === 0) { pmType = 'PM500 (Medium Service)'; }
            setPrediction({ nextHM: nextInterval, type: pmType, isMajor });
        } else {
            setPrediction(null);
        }
    }, [selectedEquipment, logForm.type]);

    useEffect(() => {
        if (selectedEquipment && activeModalTab === 'finance') {
            const finData = calculateEquipmentFinancials(selectedEquipment.id, costStartDate, costEndDate, maintenanceRecords, partsHistory);
            setFinancialData(finData);
            const relData = calculateAssetReliabilityMetrics(selectedEquipment.id, costStartDate, costEndDate, maintenanceRecords);
            setReliabilityData(relData);
        }
    }, [selectedEquipment, activeModalTab, costStartDate, costEndDate, maintenanceRecords, partsHistory]);

    const toggleStatus = async (id: string, currentStatus: string) => {
        if (currentStatus === 'Sold' || currentStatus === 'Scrapped') return;
        const newStatus = currentStatus === 'Operational' ? 'Breakdown' : 'Operational';
        const reason = newStatus === 'Breakdown' ? 'Reported by operator' : 'Repaired';
        try {
            await equipmentAPI.updateEquipment(id, { status: newStatus, notes: reason });
            await loadReferenceData();
        } catch (err: any) {
            alert('Failed to update status: ' + (err.message || 'Unknown error'));
        }
    };

    const openDetails = async (eq: Equipment) => {
        setSelectedEquipment(eq);
        
        try {
            const partsData = await inventoryAPI.getTransactions();
            const equipmentParts = partsData.filter((tx: any) => tx.equipmentId === eq.id);
            setPartsHistory(equipmentParts);
        } catch (err) {
            console.error('Failed to load parts history:', err);
            setPartsHistory([]);
        }

        try {
            const mutData = await mutationsAPI.getMutations({ equipmentId: eq.id });
            setMutationHistory(mutData.map((m: any) => ({
                ...m,
                departureDate: m.departure_date,
                arrivalDate: m.arrival_date,
                equipmentCode: m.equipment_code,
                mutationHM: m.mutation_hm,
                sourceLocation: m.source_location,
                targetLocation: m.target_location,
                referenceDocument: m.reference_document
            })));
        } catch (err) {
            console.error("Failed to fetch mutations", err);
            setMutationHistory([]);
        }

        setActiveModalTab('maintenance');
        setEditingLog(null);
        setLogForm({
            startDate: new Date().toISOString().split('T')[0],
            startTime: '08:00',
            endDate: new Date().toISOString().split('T')[0],
            endTime: '17:00',
            type: 'Corrective',
            priority: 'HIGH',
            damageType: 'Hydraulic',
            description: '',
            notes: '',
            status: 'OPEN',
            serviceProvider: 'INTERNAL',
            technicians: [],
            mechanicStoringCost: 0,
            mechanicMealCost: 0,
            driverStoringCost: 0,
            supplierId: '',
            externalInvoiceNumber: '',
            externalCost: 0,
            useDriver: false
        });
        setTempUsedParts([]);
    };

    const handleOpenEdit = (log: MaintenanceRecord) => {
        setEditingLog(log);
        setTempUsedParts([]);
        setEditForm({
            status: log.status,
            notes: log.notes || '',
            endDate: log.endDate || new Date().toISOString().split('T')[0],
            endTime: log.endTime || new Date().toLocaleTimeString('my-MM', { hour: '2-digit', minute: '2-digit' }),
            hmAtStart: log.hmAtStart,
            mechanicStoringCost: log.mechanicStoringCost || 0,
            mechanicMealCost: log.mechanicMealCost || 0,
            driverStoringCost: log.driverStoringCost || 0,
            useDriver: (log.driverStoringCost || 0) > 0,
            externalInvoiceNumber: log.externalInvoiceNumber || '',
            externalCost: log.externalCost || 0
        });
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLog) return;
        try {
            await maintenanceAPI.updateMaintenanceRecord(
                editingLog.id,
                {
                    status: editForm.status as any,
                    notes: editForm.notes,
                    endDate: editForm.endDate,
                    endTime: editForm.endTime,
                    mechanicStoringCost: Number(editForm.mechanicStoringCost),
                    mechanicMealCost: Number(editForm.mechanicMealCost),
                    driverStoringCost: editForm.useDriver ? Number(editForm.driverStoringCost) : 0,
                    externalInvoiceNumber: editForm.externalInvoiceNumber,
                    externalCost: Number(editForm.externalCost)
                }
            );

            const updatedMaintData = await maintenanceAPI.getMaintenanceRecords();
            setMaintenanceRecords(updatedMaintData);

            if (selectedEquipment) {
                const partsData = await inventoryAPI.getTransactions();
                setPartsHistory(partsData.filter((tx: any) => tx.equipmentId === selectedEquipment.id));
            }
            setEditingLog(null);
            setTempUsedParts([]);
        } catch (err: any) {
            alert("Error updating WO: " + err.message);
        }
    };

    const handleDeleteLog = async () => {
        if (!editingLog || !selectedEquipment) return;
        if (window.confirm(`Delete Work Order ${editingLog.woNumber}?`)) {
            try {
                await maintenanceAPI.deleteMaintenanceRecord(editingLog.id);
                const updatedMaintData = await maintenanceAPI.getMaintenanceRecords();
                setMaintenanceRecords(updatedMaintData);
                setEditingLog(null);
            } catch (err: any) {
                alert("Error deleting WO: " + err.message);
            }
        }
    };

    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEquipment) return;
        if (logForm.serviceProvider === 'INTERNAL' && logForm.technicians.length === 0) {
            alert("Please assign at least one technician for internal jobs.");
            return;
        }
        if (logForm.serviceProvider === 'EXTERNAL' && !logForm.supplierId) {
            alert("Please select a vendor/supplier for external jobs.");
            return;
        }

        try {
            await maintenanceAPI.createMaintenanceRecord({
                equipmentId: selectedEquipment.id,
                startDate: logForm.startDate,
                startTime: logForm.startTime,
                endDate: logForm.endDate,
                endTime: logForm.endTime,
                hmAtStart: selectedEquipment.hourMeter,
                type: logForm.type as any,
                damageType: logForm.damageType,
                priority: logForm.priority as any,
                status: logForm.status as any,
                description: logForm.description,
                notes: logForm.notes,
                serviceProvider: logForm.serviceProvider as any,
                technicians: logForm.technicians,
                mechanicStoringCost: Number(logForm.mechanicStoringCost),
                mechanicMealCost: Number(logForm.mechanicMealCost),
                driverStoringCost: logForm.useDriver ? Number(logForm.driverStoringCost) : 0,
                supplierId: logForm.supplierId || undefined,
                externalInvoiceNumber: logForm.externalInvoiceNumber,
                externalCost: Number(logForm.externalCost),
                partsReplaced: ''
            });

            const updatedMaintData = await maintenanceAPI.getMaintenanceRecords();
            setMaintenanceRecords(updatedMaintData);
            
            const partsData = await inventoryAPI.getTransactions();
            setPartsHistory(partsData.filter((tx: any) => tx.equipmentId === selectedEquipment.id));
            setLogForm(prev => ({ ...prev, description: '', notes: '', technicians: [], useDriver: false, driverStoringCost: 0 }));
        } catch (e: any) {
            alert(`Failed to save log: ${e.message}`);
        }
    };

    const handlePrint = () => {
        if (printRef.current) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write('<html><head><title>JPM - ပိုင်ဆိုင်မှုစွမ်းဆောင်ရည် အစီရင်ခံစာ</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } .page-break { page-break-before: always; } }</style>');
                printWindow.document.write('</head><body class="bg-white">');
                printWindow.document.write(printRef.current.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
            }
        }
    };

    const handleAddPartToLog = () => {
        if (!selectedPartId) return;
        const part = spareParts.find(p => p.id === selectedPartId);
        if (part && selectedPartQty <= part.currentStock) {
            setTempUsedParts([...tempUsedParts, { part, qty: selectedPartQty }]);
            setSelectedPartId('');
            setSelectedPartQty(1);
        } else {
            alert("Insufficient stock");
        }
    };

    const partOptions = useMemo(() => spareParts.filter(p => !tempUsedParts.some(used => used.part.id === p.id)).map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.currentStock})`, subLabel: p.partNumber })), [tempUsedParts, spareParts]);
    const technicianOptions = useMemo(() => employees.filter((e: any) => (e.department === 'Maintenance' || e.role === 'Mechanic') && !logForm.technicians.includes(e.name)).map((e: any) => ({ value: e.name, label: e.name, subLabel: e.position })), [logForm.technicians, employees]);
    const supplierOptions = useMemo(() => suppliers.map((s: any) => ({ value: s.id, label: s.name, subLabel: s.type })), [suppliers]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'WAITING_PART': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'CLOSED': return 'bg-green-100 text-green-800 border-green-200';
            case 'CANCELLED': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getFinancialRatios = () => {
        if (!financialData || financialData.totalCashCost === 0) return { partsPct: 0, fuelPct: 0, extPct: 0, primaryDriver: 'None' };
        const partsPct = Math.round((financialData.partsCost / financialData.totalCashCost) * 100);
        const fuelPct = Math.round((financialData.storingCost / financialData.totalCashCost) * 100);
        const extPct = Math.round((financialData.externalServiceCost / financialData.totalCashCost) * 100);

        let primaryDriver = 'Balanced';
        if (partsPct > 50) primaryDriver = 'Spare Parts (Aging Unit)';
        if (fuelPct > 50) primaryDriver = 'Operational Overhead';
        if (extPct > 50) primaryDriver = 'External Repairs';

        return { partsPct, fuelPct, extPct, primaryDriver };
    }

    const ratios = getFinancialRatios();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">ယာဉ်/စက်နှင့် စက်ရုံ စီမံခန့်ခွဲမှု</h2>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Analytics Dashboard
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Asset List
                    </button>
                </div>
            </div>

            {loading && !equipment.length ? (
                <div className="flex items-center justify-center h-64"><div className="text-slate-500">တင်နေပါသည်...</div></div>
            ) : (
                viewMode === 'dashboard' ? (
                    <FleetDashboard />
                ) : (
                    <EquipmentList
                        filteredEquipment={filteredEquipment}
                        filterType={filterType}
                        setFilterType={setFilterType}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        openDetails={openDetails}
                        toggleStatus={toggleStatus}
                    />
                )
            )}

            {/* Modal */}
            {selectedEquipment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col animate-fade-in overflow-hidden">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                            <h3 className="font-bold flex items-center gap-2"><Wrench size={20} /> {selectedEquipment.code} Details</h3>
                            <button onClick={() => setSelectedEquipment(null)}><X size={20} className="text-slate-400 hover:text-white" /></button>
                        </div>

                        <div className="flex border-b border-slate-200 bg-slate-50">
                            {['maintenance', 'parts', 'finance', 'mutations'].map(tab => (
                                <button key={tab} onClick={() => setActiveModalTab(tab as any)}
                                    className={`px-6 py-3 text-sm font-medium capitalize border-b-2 ${activeModalTab === tab ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500'}`}>
                                    {tab === 'finance' ? 'Cost & ROI' : tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 flex overflow-hidden bg-white">
                            {activeModalTab === 'maintenance' ? (
                                <MaintenanceView
                                    filteredLogs={filteredLogs}
                                    woFilterStatus={woFilterStatus}
                                    setWoFilterStatus={setWoFilterStatus}
                                    editingLog={editingLog}
                                    setEditingLog={setEditingLog}
                                    editForm={editForm}
                                    setEditForm={setEditForm}
                                    logForm={logForm}
                                    setLogForm={setLogForm}
                                    selectedEquipment={selectedEquipment}
                                    prediction={prediction}
                                    selectedTechToAdd={selectedTechToAdd}
                                    setSelectedTechToAdd={setSelectedTechToAdd}
                                    selectedPartId={selectedPartId}
                                    setSelectedPartId={setSelectedPartId}
                                    selectedPartQty={selectedPartQty}
                                    setSelectedPartQty={setSelectedPartQty}
                                    tempUsedParts={tempUsedParts}
                                    partOptions={partOptions}
                                    technicianOptions={technicianOptions}
                                    supplierOptions={supplierOptions}
                                    handleSubmitEdit={handleSubmitEdit}
                                    handleDeleteLog={handleDeleteLog}
                                    handleAddLog={handleAddLog}
                                    handleAddPartToLog={handleAddPartToLog}
                                    handleOpenEdit={handleOpenEdit}
                                    getStatusColor={getStatusColor}
                                />
                            ) : activeModalTab === 'parts' ? (
                                <FuelLogs
                                    partsHistory={partsHistory}
                                    spareParts={spareParts}
                                />
                            ) : activeModalTab === 'mutations' ? (
                                <DailyLogs
                                    mutationHistory={mutationHistory}
                                />
                            ) : (
                                // FINANCIAL TAB
                                <div className="p-6 overflow-y-auto w-full bg-white">
                                    <div className="flex justify-between mb-6">
                                        <h4 className="font-bold text-lg text-slate-800">ကုန်ကျစရိတ် ခွဲခြမ်းစိတ်ဖြာမှု</h4>
                                        <div className="flex gap-2">
                                            <input type="date" className="border border-slate-300 rounded p-1 text-sm bg-white text-slate-900" value={costStartDate} onChange={e => setCostStartDate(e.target.value)} />
                                            <input type="date" className="border border-slate-300 rounded p-1 text-sm bg-white text-slate-900" value={costEndDate} onChange={e => setCostEndDate(e.target.value)} />
                                            <button onClick={handlePrint} className="bg-slate-800 text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-slate-700 text-sm font-medium"><Printer size={14} /> Export Professional PDF</button>
                                        </div>
                                    </div>

                                    {financialData && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">အမှန်တကယ် ငွေသားအသုံးစရိတ် စုစုပေါင်း</span>
                                                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(financialData.totalCashCost)}</p>
                                                    <span className="text-xs text-green-600 bg-green-50 px-1 rounded">တိုက်ရိုက် လုပ်ငန်းလည်ပတ်စရိတ်</span>
                                                </div>
                                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">ပစ္စည်း (စတော့)</span>
                                                    <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(financialData.partsCost)}</p>
                                                </div>
                                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                                    <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">လုပ်ငန်းလည်ပတ် အထွေထွေစရိတ်</span>
                                                    <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(financialData.storingCost)}</p>
                                                    <span className="text-[10px] text-slate-500">လောင်စာဆီနှင့် အစားအသောက်</span>
                                                </div>
                                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                    <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">ပြင်ပရောင်းချသူ</span>
                                                    <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(financialData.externalServiceCost)}</p>
                                                </div>
                                            </div>

                                            {/* Inferential Stats */}
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex gap-8 items-center">
                                                <div>
                                                    <span className="text-xs text-slate-500 font-bold block">အတွင်းပိုင်း လုပ်သားခ ခန့်မှန်းချက်</span>
                                                    <span className="text-sm font-mono text-slate-700">{formatCurrency(financialData.estimatedManpowerCost)} (Non-Cash)</span>
                                                </div>
                                                <div className="h-8 w-px bg-slate-300"></div>
                                                <div>
                                                    <span className="text-xs text-slate-500 font-bold block">တစ်နာရီကုန်ကျစရိတ် (CPH)</span>
                                                    <span className="text-sm font-mono text-slate-700">{formatCurrency(Math.round(financialData.totalCashCost / (selectedEquipment.hourMeter > 0 ? 100 : 1)))}/hr</span>
                                                </div>
                                            </div>

                                            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                                                <thead className="bg-slate-100 border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-3 text-left text-slate-600 font-bold">ရက်စွဲ</th>
                                                        <th className="p-3 text-left text-slate-600 font-bold">ကိုးကားချက်</th>
                                                        <th className="p-3 text-left text-slate-600 font-bold">အမျိုးအစား</th>
                                                        <th className="p-3 text-left text-slate-600 font-bold">ဖော်ပြချက်</th>
                                                        <th className="p-3 text-right text-slate-600 font-bold">ပမာဏ (ကျပ်)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {financialData.details.map((d: any, i: number) => (
                                                        <tr key={i} className={`hover:bg-slate-50 ${!d.isCash ? 'opacity-60 italic' : ''} `}>
                                                            <td className="p-3 text-slate-600">{d.date}</td>
                                                            <td className="p-3 font-mono text-xs text-slate-500">{d.ref}</td>
                                                            <td className="p-3">
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${d.type === 'Spare Parts' ? 'bg-blue-100 text-blue-700' :
                                                                    d.type === 'Operational OH' ? 'bg-amber-100 text-amber-700' :
                                                                        d.type === 'Vendor Invoice' ? 'bg-purple-100 text-purple-700' :
                                                                            'bg-slate-200 text-slate-600'
                                                                    } `}>
                                                                    {translateValue(d.type)}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-slate-800">{d.description}</td>
                                                            <td className="p-3 text-right font-mono text-slate-800 font-medium">{formatCurrency(d.cost)}</td>
                                                        </tr>
                                                    ))}
                                                    {financialData.details.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400">ရွေးချယ်ထားသောကာလအတွင်း မှတ်တမ်း မရှိပါ။</td></tr>}
                                                </tbody>
                                                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                                                    <tr>
                                                        <td colSpan={4} className="p-3 text-right text-slate-800">ငွေသားအသုံးစရိတ် စုစုပေါင်း</td>
                                                        <td className="p-3 text-right text-slate-900 border-t-2 border-slate-300">{formatCurrency(financialData.totalCashCost)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}

                                    {/* PROFESSIONAL PDF EXPORT TEMPLATE (HIDDEN ON SCREEN) */}
                                    <div className="hidden">
                                        <div ref={printRef}>
                                            <div className="p-8 max-w-[210mm] mx-auto bg-white text-slate-900 font-sans min-h-[297mm] flex flex-col relative" style={{ minHeight: '297mm' }}>

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex flex-col items-center leading-none">
                                                                <div className="flex items-baseline font-black tracking-tighter text-red-600" style={{ fontFamily: 'Arial, sans-serif' }}>
                                                                    <span className="text-6xl">J</span>
                                                                    <span className="text-6xl lowercase -ml-1">p</span>
                                                                    <span className="text-6xl -ml-1">M</span>
                                                                </div>
                                                            </div>

                                                            <div className="h-16 w-px bg-slate-300"></div>

                                                            <div className="flex flex-col justify-center h-full pt-1">
                                                                <h1 className="text-2xl font-extrabold text-red-600 tracking-tight leading-none">PT JAVA PERSADA MANDIRI</h1>
                                                                <p className="text-xs font-bold text-blue-900 tracking-[0.35em] mt-1">အထွေထွေကန်ထရိုက်တာ</p>
                                                            </div>
                                                        </div>

                                                        <div className="text-right text-[9px] text-slate-700 leading-tight font-medium">
                                                            <p className="font-bold text-slate-900 mb-1">ရုံးချုပ်</p>
                                                            <p>Jl.Trikora RT.11 RW.02 No.57</p>
                                                            <p>Kel.Gt Manggis, Banjarbaru</p>
                                                            <p>Kalimantan Selatan 70721</p>
                                                            <div className="mt-1">
                                                                <p>ဖုန်း: 0511-4770113 / 0511-7553662</p>
                                                                <p>ဖက်စ်: 0511-4770112</p>
                                                                <p>အီးမေးလ်: contact@example.com</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="w-full border-t-4 border-slate-900 mb-0.5"></div>
                                                    <div className="w-full border-t border-slate-400 mb-8"></div>

                                                    <div className="mb-6 flex justify-between items-end">
                                                        <div>
                                                            <h2 className="text-xl font-bold uppercase text-slate-900">ပိုင်ဆိုင်မှု ယုံကြည်စိတ်ချရမှုနှင့် ကုန်ကျစရိတ် အစီရင်ခံစာ</h2>
                                                            <p className="text-xs font-bold text-slate-500 uppercase">ဖန်တီးသည့်ရက်: {formatDate(new Date())}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-4xl font-black text-slate-900">{selectedEquipment.code}</div>
                                                            <div className="text-sm font-medium text-slate-500">{selectedEquipment.model} • {selectedEquipment.type}</div>
                                                        </div>
                                                    </div>

                                                    {reliabilityData && (
                                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                                            <div className={`border p-4 rounded ${reliabilityData.pa >= 85 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} `}>
                                                                <span className="text-[10px] font-bold uppercase block mb-1">လက်တွေ့အသုံးပြုနိုင်မှု (PA)</span>
                                                                <div className="text-2xl font-black">{reliabilityData.pa}%</div>
                                                                <span className="text-[10px] font-medium">{reliabilityData.pa >= 85 ? 'ရည်မှန်းချက် ပြည့်မီသည် (>၈၅%)' : 'ရည်မှန်းချက်အောက်'}</span>
                                                            </div>
                                                            <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">MTBF (ပျက်စီးမှုများကြား ပျမ်းမျှအချိန်)</span>
                                                                <div className="text-2xl font-black text-slate-900">{reliabilityData.mtbf} <span className="text-sm font-normal text-slate-500">နာရီ</span></div>
                                                            </div>
                                                            <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">MTTR (ပြုပြင်ရန် ပျမ်းမျှအချိန်)</span>
                                                                <div className="text-2xl font-black text-slate-900">{reliabilityData.mttr} <span className="text-sm font-normal text-slate-500">နာရီ</span></div>
                                                            </div>
                                                            <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ရပ်နားချိန် စုစုပေါင်း</span>
                                                                <div className="text-2xl font-black text-slate-900">{reliabilityData.totalDowntimeHours} <span className="text-sm font-normal text-slate-500">နာရီ</span></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-4 gap-4 mb-8">
                                                        <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ကာလအတွင်း ကုန်ကျစရိတ် စုစုပေါင်း</span>
                                                            <span className="text-xl font-bold text-slate-900">{formatCurrency(financialData?.totalCashCost || 0)}</span>
                                                        </div>
                                                        <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">တစ်နာရီကုန်ကျစရိတ် (CPH)</span>
                                                            <span className="text-xl font-bold text-slate-900">{formatCurrency(Math.round((financialData?.totalCashCost || 0) / (selectedEquipment.hourMeter > 0 ? 100 : 1)))}</span>
                                                        </div>
                                                        <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">လက်ရှိ HM</span>
                                                            <span className="text-xl font-bold text-slate-900">{selectedEquipment.hourMeter.toLocaleString()}</span>
                                                        </div>
                                                        <div className="border border-slate-200 p-4 rounded bg-slate-50">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">အဓိကကုန်ကျစရိတ်ဖြစ်စေသောအချက်</span>
                                                            <span className="text-sm font-bold text-red-600">{ratios.primaryDriver}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mb-8 p-4 border border-slate-200 rounded">
                                                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                                            <PieChart size={14} /> Operational Cost Composition
                                                        </h3>

                                                        <div className="w-full h-8 bg-slate-100 rounded flex overflow-hidden mb-2">
                                                            {ratios.partsPct > 0 && (
                                                                <div style={{ width: `${ratios.partsPct}% ` }} className="bg-blue-600 h-full flex items-center justify-center text-[10px] font-bold text-white relative group">
                                                                    {ratios.partsPct}%
                                                                </div>
                                                            )}
                                                            {ratios.fuelPct > 0 && (
                                                                <div style={{ width: `${ratios.fuelPct}% ` }} className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-bold text-white relative group">
                                                                    {ratios.fuelPct}%
                                                                </div>
                                                            )}
                                                            {ratios.extPct > 0 && (
                                                                <div style={{ width: `${ratios.extPct}% ` }} className="bg-purple-600 h-full flex items-center justify-center text-[10px] font-bold text-white relative group">
                                                                    {ratios.extPct}%
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                                                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-600 rounded-full"></div>အပိုပစ္စည်းများ</div>
                                                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-full"></div>လုပ်ငန်းလည်ပတ် အထွေထွေစရိတ်</div>
                                                            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-600 rounded-full"></div>ပြင်ပဝန်ဆောင်မှု</div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-8 break-inside-avoid">
                                                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">ပြုပြင်ထိန်းသိမ်းမှု လုပ်ဆောင်ချက်မှတ်တမ်း</h3>
                                                        <table className="w-full text-[10px] border-collapse border border-slate-200">
                                                            <thead>
                                                                <tr className="bg-slate-100">
                                                                    <th className="p-2 border border-slate-200 text-left w-24">ရက်စွဲ / WO</th>
                                                                    <th className="p-2 border border-slate-200 text-left w-24">အမျိုးအစား</th>
                                                                    <th className="p-2 border border-slate-200 text-left">ပြဿနာဖော်ပြချက်</th>
                                                                    <th className="p-2 border border-slate-200 text-left">ဆောင်ရွက်ချက် / အသုံးပြုပစ္စည်း</th>
                                                                    <th className="p-2 border border-slate-200 text-left w-20">ဆောင်ရွက်သူ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {reportLogs.length > 0 ? (
                                                                    reportLogs.map(log => (
                                                                        <tr key={log.id} className={`border-b border-slate-200`}>
                                                                            <td className="p-2 border border-slate-200 align-top">
                                                                                <div className="font-bold">{log.startDate}</div>
                                                                                <div className="font-mono text-slate-500">{log.woNumber}</div>
                                                                                <div className={`mt - 1 font - bold ${log.status === 'CLOSED' ? 'text-green-600' : 'text-red-600'} `}>
                                                                                    {translateStatus(log.status)}
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-2 border border-slate-200 align-top">
                                                                                <div className="font-bold">{log.type}</div>
                                                                                <div className="text-slate-500">{log.damageType}</div>
                                                                                <div className="mt-1 text-slate-400">HM: {log.hmAtStart}</div>
                                                                            </td>
                                                                            <td className="p-2 border border-slate-200 align-top">
                                                                                {log.description}
                                                                            </td>
                                                                            <td className="p-2 border border-slate-200 align-top">
                                                                                <div className="italic mb-1">{log.notes || '-'}</div>
                                                                                {log.partsReplaced && (
                                                                                    <div className="bg-slate-50 p-1 border border-slate-100 rounded text-[9px] font-mono text-slate-600">
                                                                                        PARTS: {log.partsReplaced}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="p-2 border border-slate-200 align-top">
                                                                                {log.serviceProvider === 'INTERNAL' ? (
                                                                                    <div className="text-blue-700 font-bold">အတွင်းပိုင်းအဖွဲ့</div>
                                                                                ) : (
                                                                                    <div className="text-purple-700 font-bold">ပြင်ပရောင်းချသူ</div>
                                                                                )}
                                                                                <div className="text-[9px] text-slate-500 mt-1">
                                                                                    {log.technicians && log.technicians.length > 0 ? log.technicians.join(', ') : (suppliers.find((s: any) => s.id === log.supplierId)?.name || '-')}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">ဤကာလအတွင်း ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်း မရှိပါ။</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {financialData && (
                                                        <div className="break-inside-avoid">
                                                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">အသုံးစရိတ် အသေးစိတ်စာရင်း</h3>
                                                            <table className="w-full text-xs border-collapse mb-8">
                                                                <thead>
                                                                    <tr className="bg-slate-100 border-y border-slate-300">
                                                                        <th className="p-2 text-left font-bold uppercase text-slate-700 w-20">ရက်စွဲ</th>
                                                                        <th className="p-2 text-left font-bold uppercase text-slate-700 w-24">အမျိုးအစား</th>
                                                                        <th className="p-2 text-left font-bold uppercase text-slate-700">ဖော်ပြချက်</th>
                                                                        <th className="p-2 text-right font-bold uppercase text-slate-700 w-20">ရပ်နားချိန် (နာရီ)</th>
                                                                        <th className="p-2 text-right font-bold uppercase text-slate-700 w-28">ကုန်ကျစရိတ် (ကျပ်)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {financialData.details.filter((d: any) => d.isCash).map((d: any, i: number) => (
                                                                        <tr key={i} className="border-b border-slate-200">
                                                                            <td className="p-2 text-slate-600 font-mono">{d.date}</td>
                                                                            <td className="p-2 font-bold text-slate-700">{translateValue(d.type)}</td>
                                                                            <td className="p-2 text-slate-600">{d.description}</td>
                                                                            <td className={`p - 2 text - right font - mono font - bold ${d.downtime > 0 ? 'text-red-600' : 'text-slate-300'} `}>{d.downtime > 0 ? d.downtime : '-'}</td>
                                                                            <td className="p-2 text-right font-mono font-medium text-slate-800">{d.cost.toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-800 text-sm">
                                                                        <td colSpan={4} className="p-3 text-right">တိုက်ရိုက်ကုန်ကျစရိတ် စုစုပေါင်း</td>
                                                                        <td className="p-3 text-right">{formatCurrency(financialData.totalCashCost)}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-auto pt-8 break-inside-avoid w-full">
                                                    <div className="grid grid-cols-3 gap-8 text-center">
                                                        <div>
                                                            <div className="h-16 border-b border-slate-400 mb-2"></div>
                                                            <span className="text-xs font-bold uppercase text-slate-500">ပြင်ဆင်သူ</span>
                                                        </div>
                                                        <div>
                                                            <div className="h-16 border-b border-slate-400 mb-2"></div>
                                                            <span className="text-xs font-bold uppercase text-slate-500">စက်ရုံအကြီးအကဲ</span>
                                                        </div>
                                                        <div>
                                                            <div className="h-16 border-b border-slate-400 mb-2"></div>
                                                            <span className="text-xs font-bold uppercase text-slate-500">ကုန်ကျစရိတ် ထိန်းချုပ်ရေး</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] text-slate-400 mt-8 text-center border-t border-slate-100 pt-2">
                                                        jpmonitor မှ ဖန်တီးသည့်ရက်: {formatDate(new Date())} • {costStartDate} to {costEndDate}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetView;
