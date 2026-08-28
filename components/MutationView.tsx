import { formatDate, formatNumber, translateValue } from '../utils/locale';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { equipmentAPI, locationsAPI, mutationsAPI } from '../services/api';
import { MutationType } from '../types';
import { ArrowRightLeft, BadgeDollarSign, History, PlusCircle, Truck, FileText, CheckCircle, Printer, FileOutput, MapPin, Edit, XCircle } from 'lucide-react'; // Removed unused icons
import SearchableSelect from './SearchableSelect';

const MutationView: React.FC = () => {
    const [mutations, setMutations] = useState<any[]>([]);
    const [equipment, setEquipment] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<MutationType>(MutationType.TRANSFER);
    const historyPrintRef = useRef<HTMLDivElement>(null);
    const doPrintRef = useRef<HTMLDivElement>(null);
    const [printingMutation, setPrintingMutation] = useState<any | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMutation, setEditingMutation] = useState<any | null>(null);
    const [editStatus, setEditStatus] = useState('');
    const [editArrivalDate, setEditArrivalDate] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0], // Departure Date
        arrivalDate: '', // Optional initially
        mutationHM: 0,
        equipmentId: '',
        sourceLocationId: '',
        targetLocationId: '',
        referenceDocument: '', // DO Number
        value: 0,
        notes: '',

        // New Unit Specifics (Acquisition)
        newCode: '',
        newModel: '',
        newType: 'Excavator',
        newHourMeter: 0,
        newKilometer: 0,
        newOwner: '',
        newChassisNumber: '',
        newPlateNumber: '',
        newManufactureYear: new Date().getFullYear(),
        newSerialNumber: '', // Added
        newEngineNumber: '', // Added

        // Logistics Details (Surat Jalan)
        driverName: '',
        transportUnit: 'Trailer',
        transportPolNumber: '',

        senderCompany: '',
        senderName: '',

        recipientCompany: '',
        recipientName: ''
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [eqData, locData, mutData] = await Promise.all([
                equipmentAPI.getEquipment(),
                locationsAPI.getLocations(),
                mutationsAPI.getMutations()
            ]);
            setEquipment(eqData);
            setLocations(locData);
            setMutations(mutData.map(m => ({
                ...m,
                departureDate: m.departure_date,
                arrivalDate: m.arrival_date,
                equipmentCode: m.equipment_code,
                mutationHM: m.mutation_hm,
                sourceLocation: m.source_location,
                targetLocation: m.target_location,
                referenceDocument: m.reference_document,
                driverName: m.driver_name,
                transportUnit: m.transport_unit,
                transportPolNumber: m.transport_pol_number,
                senderCompany: m.sender_company,
                senderName: m.sender_name,
                recipientCompany: m.recipient_company,
                recipientName: m.recipient_name
            })));
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data from APIs
    useEffect(() => {
        loadData();
    }, [loadData]);

    const openModal = (type: MutationType) => {
        setModalType(type);
        // Generate DO number client-side (simple incremental based on mutations count)
        const doNumber = type === MutationType.TRANSFER
            ? `DO-JPM-${new Date().getFullYear()}-${String(mutations.length + 1).padStart(4, '0')}`
            : '';

        setFormData({
            date: new Date().toISOString().split('T')[0],
            arrivalDate: '',
            mutationHM: 0,
            equipmentId: '',
            sourceLocationId: '',
            targetLocationId: '',
            referenceDocument: doNumber,
            value: 0,
            notes: '',
            newCode: '',
            newModel: '',
            newType: 'Excavator',
            newHourMeter: 0,
            newKilometer: 0,
            newOwner: '',
            newChassisNumber: '',
            newPlateNumber: '',
            newManufactureYear: new Date().getFullYear(),
            newSerialNumber: '',
            newEngineNumber: '',
            driverName: '',
            transportUnit: 'Trailer',
            transportPolNumber: '',
            senderCompany: '',
            senderName: '',
            recipientCompany: '',
            recipientName: ''
        });
        setIsModalOpen(true);
    };

    const handleConfirmArrival = async (id: string) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            await mutationsAPI.updateMutation(id, { arrivalDate: today, status: 'COMPLETED' });
            const updatedMutations = await mutationsAPI.getMutations();
            setMutations(updatedMutations.map(m => ({
                ...m,
                departureDate: m.departure_date,
                arrivalDate: m.arrival_date,
                equipmentCode: m.equipment_code,
                mutationHM: m.mutation_hm,
                sourceLocation: m.source_location,
                targetLocation: m.target_location,
                referenceDocument: m.reference_document,
                driverName: m.driver_name,
                transportUnit: m.transport_unit,
                transportPolNumber: m.transport_pol_number,
                senderCompany: m.sender_company,
                senderName: m.sender_name,
                recipientCompany: m.recipient_company,
                recipientName: m.recipient_name
            })));
        } catch (err: any) {
            alert('Failed to confirm arrival: ' + err.message);
        }
    };

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            arrivalDate: '',
            mutationHM: 0,
            equipmentId: '',
            sourceLocationId: '',
            targetLocationId: '',
            referenceDocument: '',
            value: 0,
            notes: '',
            newCode: '',
            newModel: '',
            newType: 'Excavator',
            newHourMeter: 0,
            newKilometer: 0,
            newOwner: '',
            newChassisNumber: '',
            newPlateNumber: '',
            newManufactureYear: new Date().getFullYear(),
            newSerialNumber: '',
            newEngineNumber: '',
            driverName: '',
            transportUnit: 'Trailer',
            transportPolNumber: '',
            senderCompany: '',
            senderName: '',
            recipientCompany: '',
            recipientName: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const eq = equipment.find(e => e.id === formData.equipmentId);
            const eqCode = eq ? eq.code : formData.newCode;

            const mutationData = {
                type: modalType,
                equipmentId: formData.equipmentId,
                equipmentCode: eqCode,
                sourceLocationId: eq ? (eq.location_id || eq.locationId || '') : 'VENDOR',
                targetLocationId: modalType === 'DISPOSAL' ? 'SOLD/SCRAPPED' : formData.targetLocationId,
                referenceDocument: formData.referenceDocument,
                value: Number(formData.value),
                notes: formData.notes,
                departureDate: formData.date,
                mutationHM: Number(formData.mutationHM),
                arrivalDate: modalType === 'DISPOSAL' ? formData.date : (formData.arrivalDate || undefined),
                driverName: formData.driverName,
                transportUnit: formData.transportUnit,
                transportPolNumber: formData.transportPolNumber,
                senderCompany: formData.senderCompany,
                senderName: formData.senderName,
                recipientCompany: formData.recipientCompany,
                recipientName: formData.recipientName,
                performedBy: '' // Will be set by backend from req.user
            };

            const newUnitDetails = modalType === 'ACQUISITION' ? {
                code: formData.newCode,
                model: formData.newModel,
                type: formData.newType as any,
                hourMeter: Number(formData.newHourMeter),
                newManufactureYear: Number(formData.newManufactureYear),
                newKilometer: Number(formData.newKilometer || 0),
                newOwner: formData.newOwner,
                newChassisNumber: formData.newChassisNumber,
                newPlateNumber: formData.newPlateNumber,
                newSerialNumber: formData.newSerialNumber,
                newEngineNumber: formData.newEngineNumber
            } : undefined;

            // Call API instead of LocalStorage
            await mutationsAPI.createMutation({
                ...mutationData,
                newUnitDetails
            });

            // Reload mutations and equipment from API
            const [mutData, eqData] = await Promise.all([
                mutationsAPI.getMutations(),
                equipmentAPI.getEquipment()
            ]);
            setMutations(mutData.map(m => ({
                ...m,
                departureDate: m.departure_date,
                arrivalDate: m.arrival_date,
                equipmentCode: m.equipment_code,
                mutationHM: m.mutation_hm,
                sourceLocation: m.source_location,
                targetLocation: m.target_location,
                referenceDocument: m.reference_document,
                driverName: m.driver_name,
                transportUnit: m.transport_unit,
                transportPolNumber: m.transport_pol_number,
                senderCompany: m.sender_company,
                senderName: m.sender_name,
                recipientCompany: m.recipient_company,
                recipientName: m.recipient_name
            })));
            setEquipment(eqData);

            setIsModalOpen(false);
            resetForm();
        } catch (err: any) {
            alert(`Transaction Failed: ${err.message}`);
        }
    };

    const handlePrintHistory = () => {
        if (historyPrintRef.current) {
            openPrintWindow(historyPrintRef.current.innerHTML);
        }
    };

    const handleEdit = (mutation: any) => {
        setEditingMutation(mutation);
        setEditStatus(mutation.status || (mutation.arrivalDate ? 'COMPLETED' : 'IN_TRANSIT'));
        setEditArrivalDate(mutation.arrivalDate || new Date().toISOString().split('T')[0]);
        setIsEditModalOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!editingMutation) return;
        try {
            await mutationsAPI.updateMutation(editingMutation.id, {
                status: editStatus,
                arrivalDate: editStatus === 'COMPLETED' ? editArrivalDate : undefined
            });

            // Reload data
            const [mutData] = await Promise.all([mutationsAPI.getMutations()]);
            setMutations(mutData.map(m => ({
                ...m,
                departureDate: m.departure_date,
                arrivalDate: m.arrival_date,
                equipmentCode: m.equipment_code,
                mutationHM: m.mutation_hm,
                sourceLocation: m.source_location,
                targetLocation: m.target_location,
                referenceDocument: m.reference_document,
                driverName: m.driver_name,
                transportUnit: m.transport_unit,
                transportPolNumber: m.transport_pol_number,
                senderCompany: m.sender_company,
                senderName: m.sender_name,
                recipientCompany: m.recipient_company,
                recipientName: m.recipient_name
            })));

            setIsEditModalOpen(false);
            setEditingMutation(null);
        } catch (err: any) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const handlePrintDO = (mutation: any) => {
        setPrintingMutation(mutation);
        // Allow state to update and render the hidden DO template before printing
        setTimeout(() => {
            if (doPrintRef.current) {
                openPrintWindow(doPrintRef.current.innerHTML);
            }
        }, 100);
    };

    const openPrintWindow = (content: string) => {
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (printWindow) {
            printWindow.document.write('<html><head><title>ပုံနှိပ်ရန်</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            // STRICT CSS: Only apply borders to table cells INSIDE .main-table
            printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } table { border-collapse: collapse; } .main-table td, .main-table th { border: 1px solid black; } }</style>');
            printWindow.document.write('</head><body class="bg-white">');
            printWindow.document.write(content);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 1000);
        }
    };

    // Options - Use API data
    const equipmentOptions = equipment
        .filter((e: any) => e.status !== 'Sold' && e.status !== 'Scrapped')
        .map((e: any) => ({
            value: e.id,
            label: `${e.code} - ${e.model} `,
            subLabel: `Loc: ${e.location || ''} | ${(e.hour_meter || e.hourMeter || 0) > 0 ? `${e.hour_meter || e.hourMeter} HM` : `${e.kilometer || 0} KM`} `
        }));

    const locationOptions = locations.map(l => ({
        value: l.id,
        label: l.name,
        subLabel: l.type
    }));

    const typeOptions = [
        { value: 'Excavator', label: 'Excavator' },
        { value: 'Dump Truck', label: 'Dump Truck' },
        { value: 'Dozer', label: 'Dozer' },
        { value: 'Grader', label: 'Grader' },
        { value: 'LV', label: 'LV (Sarana)' },
        { value: 'Water Truck', label: 'ရေသယ်ယာဉ်' },
        { value: 'Tower Lamp', label: 'မီးတိုင်' },
        { value: 'Pump', label: 'ပန့်' },
    ];

    // Helper to find Full Equipment details for the print view
    const getEquipmentDetailsForPrint = (eqCode: string) => {
        return equipment.find((e: any) => e.code === eqCode);
    };

    // Format Date to Indonesian
    const formatDateID = (dateStr: string) => {
        if (!dateStr) return '-';
        return formatDate(dateStr, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
    };

    const isSmallUnit = (type: string) => {
        return type === 'LV' || type === 'Sarana';
    }

    const requiresPlate = (type: string) => {
        return type === 'LV' || type === 'Dump Truck' || type === 'Water Truck';
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="text-slate-500">တင်နေပါသည်...</div></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ယူနစ် ပြောင်းရွှေ့မှု</h2>
                    <p className="text-slate-500 text-sm">ပို့ဆောင်ရေး၊ ပိုင်ဆိုင်မှုရွှေ့ပြောင်းမှုနှင့် အသုံးပြုသက်တမ်း ထိန်းချုပ်ရေး</p>
                </div>
                <button onClick={handlePrintHistory} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-700 transition-colors">
                    <Printer size={18} /> Print History Log
                </button>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => openModal(MutationType.TRANSFER)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all group"
                >
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <ArrowRightLeft size={32} />
                    </div>
                    <h3 className="font-bold text-slate-800">ပြောင်းရွှေ့မည့်တည်နေရာ</h3>
                    <p className="text-xs text-slate-500 mt-1 text-center">Pit၊ အလုပ်ရုံ သို့မဟုတ် လုပ်ငန်းခွင်များအကြား ယူနစ်ပြောင်းရွှေ့ရန်</p>
                </button>

                <button
                    onClick={() => openModal(MutationType.ACQUISITION)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center hover:bg-green-50 hover:border-green-200 transition-all group"
                >
                    <div className="p-3 bg-green-100 text-green-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <PlusCircle size={32} />
                    </div>
                    <h3 className="font-bold text-slate-800">အသစ်ဝယ်ယူခြင်း</h3>
                    <p className="text-xs text-slate-500 mt-1 text-center">ဝယ်ယူထားသော သို့မဟုတ် ငှားရမ်းထားသော ယူနစ်အသစ် မှတ်ပုံတင်ရန်</p>
                </button>

                <button
                    onClick={() => openModal(MutationType.DISPOSAL)}
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all group"
                >
                    <div className="p-3 bg-red-100 text-red-600 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <BadgeDollarSign size={32} />
                    </div>
                    <h3 className="font-bold text-slate-800">ဖျက်သိမ်း / ရောင်းချခြင်း</h3>
                    <p className="text-xs text-slate-500 mt-1 text-center">ပိုင်ဆိုင်မှုဖျက်သိမ်း၊ ရောင်းချ သို့မဟုတ် အစိတ်အပိုင်းဖျက်ရန်</p>
                </button>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <History size={18} className="text-slate-400" /> Logistics History
                    </h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3">ရွှေ့ပြောင်းသည့်ရက်များ</th>
                            <th className="px-6 py-3">အမျိုးအစား</th>
                            <th className="px-6 py-3">ယူနစ်အချက်အလက်</th>
                            <th className="px-6 py-3">ပို့ဆောင်ရေးလမ်းကြောင်း</th>
                            <th className="px-6 py-3">အခြေအနေ</th>
                            <th className="px-6 py-3 text-right">လုပ်ဆောင်ချက်</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {mutations.map((mut) => (
                            <tr key={mut.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-slate-600">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 uppercase">ထွက်ခွာရန်:</span>
                                        <span className="font-medium">{mut.departureDate}</span>
                                        {mut.arrivalDate ? (
                                            <>
                                                <span className="text-xs text-slate-400 uppercase mt-1">ရောက်ရှိရန်:</span>
                                                <span className="font-medium text-green-600">{mut.arrivalDate}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-amber-500 font-bold mt-1">ပို့ဆောင်နေသည်</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${mut.type === MutationType.ACQUISITION ? 'bg-green-100 text-green-700' :
                                        mut.type === MutationType.TRANSFER ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                        } `}>
                                        {translateValue(mut.type)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">{mut.equipmentCode}</div>
                                    <div className="text-xs text-slate-500">HM: {mut.mutationHM.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-slate-500 bg-slate-100 px-1.5 rounded">{mut.sourceLocation}</span>
                                        <span className="text-slate-300">➝</span>
                                        <span className="font-bold text-slate-700">{mut.targetLocation}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <FileText size={10} /> Ref: {mut.referenceDocument}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {mut.status === 'CANCELLED' ? (
                                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                                            <XCircle size={14} /> Cancelled
                                        </span>
                                    ) : (mut.arrivalDate || mut.status === 'COMPLETED' || mut.type === MutationType.DISPOSAL) ? (
                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                            <CheckCircle size={14} /> Arrived
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-amber-600 text-xs font-bold animate-pulse">
                                            <Truck size={14} /> Moving
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handlePrintDO(mut)}
                                            className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 font-bold border border-slate-200 flex items-center gap-1"
                                        >
                                            <FileOutput size={12} /> Surat Jalan
                                        </button>
                                        {!mut.arrivalDate && mut.type === MutationType.TRANSFER && (
                                            <button
                                                onClick={() => handleConfirmArrival(mut.id)}
                                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold border border-blue-200"
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(mut)}
                                            className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 font-bold border border-slate-200 flex items-center gap-1"
                                        >
                                            <Edit size={12} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {mutations.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">ယူနစ်ပြောင်းရွှေ့မှတ်တမ်း မတွေ့ပါ။</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Dynamic Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
                        {/* Modal Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${modalType === MutationType.ACQUISITION ? 'bg-green-50 border-green-100' :
                            modalType === MutationType.TRANSFER ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'
                            }`}>
                            <div>
                                <h3 className={`text-lg font-bold flex items-center gap-2 ${modalType === MutationType.ACQUISITION ? 'text-green-700' :
                                    modalType === MutationType.TRANSFER ? 'text-blue-700' : 'text-red-700'
                                    }`}>
                                    {modalType === MutationType.ACQUISITION && <PlusCircle size={20} />}
                                    {modalType === MutationType.TRANSFER && <ArrowRightLeft size={20} />}
                                    {modalType === MutationType.DISPOSAL && <BadgeDollarSign size={20} />}
                                    {modalType === MutationType.ACQUISITION ? 'Acquire New Asset' : modalType === MutationType.TRANSFER ? 'Transfer Unit' : 'Asset Disposal'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">ပို့ဆောင်ရေးနှင့် ပိုင်ဆိုင်မှု ထိန်းချုပ်မှု လှုပ်ရှားမှု</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-full p-1 transition-colors">✕</button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Section 1: Transaction Basics */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="mutation-do-number" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">ကိုးကားနံပါတ် / DO နံပါတ်</label>
                                        <div className="relative">
                                            <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="mutation-do-number"
                                                type="text" required
                                                placeholder="DO-JPM-2023-..."
                                                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                                value={formData.referenceDocument}
                                                onChange={e => setFormData({ ...formData, referenceDocument: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="mutation-date" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">လှုပ်ရှားသည့်ရက်</label>
                                        <input
                                            id="mutation-date"
                                            type="date" required
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Section 2: Asset Selection */}
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                                        <Truck size={14} /> Asset Information
                                    </h4>

                                    {modalType !== MutationType.ACQUISITION ? (
                                        <div className="space-y-4">
                                            <SearchableSelect
                                                label="ယူနစ် ရွေးရန်"
                                                placeholder="ယူနစ်ကုဒ် ရှာရန်..."
                                                options={equipmentOptions}
                                                value={formData.equipmentId}
                                                onChange={(val) => {
                                                    const eq = equipment.find((e: any) => e.id === val);
                                                    setFormData({
                                                        ...formData,
                                                        equipmentId: val,
                                                        mutationHM: eq ? ((eq.hour_meter || eq.hourMeter || 0) > 0 ? (eq.hour_meter || eq.hourMeter) : eq.kilometer || 0) : 0
                                                    })
                                                }}
                                                required
                                                id="mutation-equipment-select"
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="mutation-hm" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">လက်ရှိမီတာ (HM/KM)</label>
                                                    <input
                                                        id="mutation-hm"
                                                        type="number" required min="0"
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                        value={formData.mutationHM}
                                                        onChange={e => setFormData({ ...formData, mutationHM: Number(e.target.value) })}
                                                    />
                                                </div>
                                                {modalType === MutationType.DISPOSAL && (
                                                    <div>
                                                        <label htmlFor="mutation-value" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">ရောင်းချ / ဖျက်သိမ်းတန်ဖိုး (ကျပ်)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2 text-slate-500 text-sm font-medium">ကျပ်</span>
                                                            <input
                                                                id="mutation-value"
                                                                type="number" min="0"
                                                                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                                value={formData.value}
                                                                onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* New Acquisition Form */
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="new-unit-code" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ယူနစ်ကုဒ်</label>
                                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newCode} onChange={e => setFormData({ ...formData, newCode: e.target.value })} placeholder="ဥပမာ - EX-2005" id="new-unit-code" />
                                                </div>
                                                <div>
                                                    <label htmlFor="new-unit-owner" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ပိုင်ရှင်</label>
                                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newOwner} onChange={e => setFormData({ ...formData, newOwner: e.target.value })} placeholder="PT JPM / Rental" id="new-unit-owner" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="new-unit-model" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">မော်ဒယ်</label>
                                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newModel} onChange={e => setFormData({ ...formData, newModel: e.target.value })} placeholder="ဥပမာ - PC2000" id="new-unit-model" />
                                                </div>
                                                <div>
                                                    <SearchableSelect label="အမျိုးအစား" options={typeOptions} value={formData.newType} onChange={v => setFormData({ ...formData, newType: v })} id="new-unit-category" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label htmlFor="new-unit-year" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">နှစ်</label>
                                                    <input type="number" min="1990" max="2030" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newManufactureYear} onChange={e => setFormData({ ...formData, newManufactureYear: Number(e.target.value) })} placeholder="နှစ်" id="new-unit-year" />
                                                </div>
                                                <div>
                                                    <label htmlFor="new-unit-serial" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Serial နံပါတ်</label>
                                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newSerialNumber} onChange={e => setFormData({ ...formData, newSerialNumber: e.target.value })} id="new-unit-serial" />
                                                </div>
                                                <div>
                                                    <label htmlFor="new-unit-engine" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">အင်ဂျင်နံပါတ်</label>
                                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newEngineNumber} onChange={e => setFormData({ ...formData, newEngineNumber: e.target.value })} id="new-unit-engine" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="new-unit-chassis" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ကိုယ်ထည်နံပါတ်</label>
                                                    <input type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newChassisNumber} onChange={e => setFormData({ ...formData, newChassisNumber: e.target.value })} id="new-unit-chassis" />
                                                </div>
                                                <div>
                                                    <label htmlFor="new-unit-price" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ဝယ်ယူစျေးနှုန်း</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2 text-slate-500 text-sm">ကျပ်</span>
                                                        <input type="number" min="0" className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                                                            value={formData.value} onChange={e => setFormData({ ...formData, value: Number(e.target.value) })} id="new-unit-price" />
                                                    </div>
                                                </div>
                                            </div>
                                            {requiresPlate(formData.newType) && (
                                                <div>
                                                    <label htmlFor="new-unit-plate" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ယာဉ်နံပါတ်ပြား</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        value={formData.newPlateNumber} onChange={e => setFormData({ ...formData, newPlateNumber: e.target.value })} id="new-unit-plate" />
                                                </div>
                                            )}
                                            <div className="bg-white p-3 rounded border border-slate-200">
                                                {isSmallUnit(formData.newType) ? (
                                                    <div>
                                                        <label htmlFor="new-unit-km" className="block text-[10px] font-bold text-green-700 mb-1 uppercase">အစပိုင်း ကီလိုမီတာ (KM)</label>
                                                        <input type="number" className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm font-bold"
                                                            value={formData.newKilometer} onChange={e => setFormData({ ...formData, newKilometer: Number(e.target.value) })} id="new-unit-km" />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label htmlFor="new-unit-hm" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">အစပိုင်း နာရီမီတာ (HM)</label>
                                                        <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                            value={formData.newHourMeter} onChange={e => setFormData({ ...formData, newHourMeter: Number(e.target.value) })} id="new-unit-hm" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Section 3: Movement Logic */}
                                {(modalType === MutationType.TRANSFER || modalType === MutationType.ACQUISITION) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 opacity-70">
                                            <span className="block text-xs font-bold text-slate-500 mb-2 uppercase">မူလတည်နေရာ</span>
                                            <div className="flex items-center gap-2 text-slate-700 font-medium p-2 bg-white rounded border border-slate-200">
                                                <MapPin size={16} className="text-slate-400" />
                                                {modalType === MutationType.ACQUISITION ? 'VENDOR / NEW' :
                                                    (equipment.find(e => e.id === formData.equipmentId)?.location || 'Current Location')}
                                            </div>
                                        </div>
                                        <div>
                                            <SearchableSelect
                                                label={modalType === MutationType.ACQUISITION ? "Initial Location" : "Target Location"}
                                                options={locationOptions}
                                                value={formData.targetLocationId}
                                                onChange={(val) => setFormData({ ...formData, targetLocationId: val })}
                                                required
                                                id="mutation-target-location"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Section 4: Logistics Details (Only for Transfers) */}
                                {modalType === MutationType.TRANSFER && (
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                                                <Truck size={14} /> Logistics Manifest (Surat Jalan)
                                            </h4>
                                            <span className="text-[10px] text-slate-400">ပို့ဆောင်ရေးအတွက် မဖြစ်မနေလိုအပ်သည်</span>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="mutation-sender-company" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ပေးပို့သူ (မှ)</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"
                                                        placeholder="ကုမ္ပဏီ / လုပ်ငန်းခွင်" value={formData.senderCompany} onChange={e => setFormData({ ...formData, senderCompany: e.target.value })} id="mutation-sender-company" />
                                                    <label htmlFor="mutation-sender-name" className="sr-only">ပေးပို့သူအမည်</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        placeholder="တာဝန်ခံပုဂ္ဂိုလ်" value={formData.senderName} onChange={e => setFormData({ ...formData, senderName: e.target.value })} id="mutation-sender-name" />
                                                </div>
                                                <div>
                                                    <label htmlFor="mutation-recipient-company" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">လက်ခံသူ (သို့)</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"
                                                        placeholder="ကုမ္ပဏီ / လုပ်ငန်းခွင်" value={formData.recipientCompany} onChange={e => setFormData({ ...formData, recipientCompany: e.target.value })} id="mutation-recipient-company" />
                                                    <label htmlFor="mutation-recipient-name" className="sr-only">လက်ခံသူအမည်</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        placeholder="လက်ခံသူ" value={formData.recipientName} onChange={e => setFormData({ ...formData, recipientName: e.target.value })} id="mutation-recipient-name" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label htmlFor="mutation-transport-unit" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">သယ်ယူယာဉ်</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        placeholder="ဥပမာ - Trailer" value={formData.transportUnit} onChange={e => setFormData({ ...formData, transportUnit: e.target.value })} id="mutation-transport-unit" />
                                                </div>
                                                <div>
                                                    <label htmlFor="mutation-police-number" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ယာဉ်မှတ်ပုံတင်နံပါတ်</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        placeholder="DA 1234 XX" value={formData.transportPolNumber} onChange={e => setFormData({ ...formData, transportPolNumber: e.target.value })} id="mutation-police-number" />
                                                </div>
                                                <div>
                                                    <label htmlFor="mutation-driver-name" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ယာဉ်မောင်း</label>
                                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                        placeholder="ယာဉ်မောင်းအမည်" value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} id="mutation-driver-name" />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="mutation-arrival-date" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">ရောက်ရှိမည့်ရက် (ခန့်မှန်း)</label>
                                                <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                                                    value={formData.arrivalDate} onChange={e => setFormData({ ...formData, arrivalDate: e.target.value })} id="mutation-arrival-date" />
                                                <p className="text-[10px] text-slate-400 mt-1">လက်ရှိ ပို့ဆောင်နေပါက ဗလာထားပါ။</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Section 5: Notes */}
                                <div>
                                    <label className="block w-full">
                                        <span className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">ထပ်ဆောင်းမှတ်ချက်များ</span>
                                        <textarea
                                            rows={2}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="ထပ်ဆောင်းအသေးစိတ်၊ ခွင့်ပြုချက်အချက်အလက် သို့မဟုတ် အခြေအနေမှတ်ချက်များကို ရိုက်ထည့်ပါ..."
                                            id="mutation-notes"
                                        />
                                    </label>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">ပယ်ဖျက်ရန်</button>
                                    <button
                                        type="submit"
                                        className={`px-4 py-2 text-white font-medium rounded-lg shadow-lg flex items-center gap-2 transition-all ${modalType === MutationType.ACQUISITION ? 'bg-green-600 hover:bg-green-700' :
                                            modalType === MutationType.TRANSFER ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                                            }`}
                                    >
                                        <CheckCircle size={18} />
                                        Confirm {modalType}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Status Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <Edit size={20} /> Update Status
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-700 p-1 rounded-full transition-colors">
                                <ArrowRightLeft size={20} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="edit-status-select" className="block text-sm font-bold text-slate-700 mb-1">အခြေအနေ</label>
                                <select
                                    id="edit-status-select"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value)}
                                >
                                    <option value="IN_TRANSIT">ပို့ဆောင်နေသည်</option>
                                    <option value="COMPLETED">ရောက်ရှိပြီး</option>
                                    <option value="CANCELLED">ပယ်ဖျက်ပြီး</option>
                                </select>
                            </div>

                            {editStatus === 'COMPLETED' && (
                                <div>
                                    <label htmlFor="edit-arrival-date" className="block text-sm font-bold text-slate-700 mb-1">ရောက်ရှိသည့်ရက်</label>
                                    <input
                                        id="edit-arrival-date"
                                        type="date"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                        value={editArrivalDate}
                                        onChange={e => setEditArrivalDate(e.target.value)}
                                    />
                                </div>
                            )}

                            {editStatus === 'CANCELLED' && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs">
                                    <strong>သတိပေးချက်:</strong> Cancelling this mutation will attempt to revert equipment location/status changes. Please verify equipment status manually after cancellation.
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">ပယ်ဖျက်ရန်</button>
                                <button
                                    onClick={handleUpdateStatus}
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                                >
                                    Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden PDF History Report */}
            <div className="hidden">
                <div ref={historyPrintRef} className="p-8 max-w-[210mm] mx-auto bg-white text-slate-900 font-sans bordered-table">
                    {/* JPM Header Inline */}
                    <div className="flex justify-between items-start mb-6 border-b-4 border-slate-900 pb-2">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center leading-none">
                                <div className="flex items-baseline font-black tracking-tighter text-red-600" style={{ fontFamily: 'Arial, sans-serif' }}>
                                    <span className="text-6xl">J</span><span className="text-6xl lowercase -ml-1">p</span><span className="text-6xl -ml-1">M</span>
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
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-center uppercase mb-1">ပို့ဆောင်ရေးနှင့် ယူနစ်ပြောင်းရွှေ့မှု အစီရင်ခံစာ</h2>
                        <p className="text-center text-xs text-slate-500">ဖန်တီးသည့်ရက်: {formatDate(new Date())}</p>
                    </div>

                    <table className="w-full text-xs border-collapse border border-slate-300 main-table">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-2 text-left">ရက်စွဲ</th>
                                <th className="p-2 text-left">ကိုးကား / DO နံပါတ်</th>
                                <th className="p-2 text-left">အမျိုးအစား</th>
                                <th className="p-2 text-left">ယူနစ်ကုဒ်</th>
                                <th className="p-2 text-right">HM</th>
                                <th className="p-2 text-left">လမ်းကြောင်း (မူလ - ရောက်ရာ)</th>
                                <th className="p-2 text-left">အခြေအနေ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mutations.map(m => (
                                <tr key={m.id}>
                                    <td className="p-2">{m.departureDate}</td>
                                    <td className="p-2 font-mono">{m.referenceDocument}</td>
                                    <td className="p-2">{translateValue(m.type)}</td>
                                    <td className="p-2 font-bold">{m.equipmentCode}</td>
                                    <td className="p-2 text-right">{m.mutationHM.toLocaleString()}</td>
                                    <td className="p-2">{m.sourceLocation} → {m.targetLocation}</td>
                                    <td className="p-2">
                                        {m.arrivalDate ? `Arrived: ${m.arrivalDate} ` : 'In Transit'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="h-16 border-b border-slate-400 mb-2"></div>
                            <span className="text-xs font-bold">ပို့ဆောင်ရေးမန်နေဂျာ</span>
                        </div>
                        <div>
                            <div className="h-16 border-b border-slate-400 mb-2"></div>
                            <span className="text-xs font-bold">စက်ရုံအကြီးအကဲ</span>
                        </div>
                        <div>
                            <div className="h-16 border-b border-slate-400 mb-2"></div>
                            <span className="text-xs font-bold">ပရောဂျက်မန်နေဂျာ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden SINGLE SURAT JALAN (DO) Template */}
            <div className="hidden">
                {printingMutation && (
                    <div ref={doPrintRef} className="p-8 max-w-[210mm] mx-auto bg-white text-black font-sans text-xs">
                        {/* Title */}
                        <div className="text-center font-bold text-lg underline mb-6">ပို့ဆောင်လွှာ</div>

                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-6">
                            {/* Left Box (Recipient) */}
                            <div className="border border-black p-4 w-[45%] min-h-[140px]">
                                <div className="font-bold mb-2">Kepada :</div>
                                <div className="font-bold text-base uppercase">{printingMutation.recipientCompany || printingMutation.targetLocation}</div>
                                <div className="uppercase mt-1 italic">
                                    {locations.find(l => l.name === printingMutation.targetLocation)?.city || 'KALIMANTAN SELATAN'}
                                </div>
                            </div>

                            {/* Right Info - NO GRID (borderless table) */}
                            <div className="w-[50%] pt-1">
                                {/* Note: CSS scoping ensures this table has no borders */}
                                <table className="w-full text-xs">
                                    <tbody>
                                        <tr>
                                            <td className="w-28 py-1">ပေးပို့သူ</td>
                                            <td className="w-4">:</td>
                                            <td className="uppercase font-bold">{printingMutation.senderCompany || printingMutation.sourceLocation}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1">စာရွက်စာတမ်းရက်စွဲ</td>
                                            <td>:</td>
                                            <td className="uppercase">{formatDateID(printingMutation.departureDate)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1">ပို့ဆောင်သည့်ရက်</td>
                                            <td>:</td>
                                            <td className="uppercase">{formatDateID(printingMutation.departureDate)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1">စဉ် / ပို့ဆောင်လွှာ</td>
                                            <td>:</td>
                                            <td className="uppercase font-bold">{printingMutation.referenceDocument}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1">ပို့ဆောင်ယာဉ်</td>
                                            <td>:</td>
                                            <td className="uppercase">{printingMutation.transportUnit || 'TRAILER'}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1">စဉ် / ယူနစ်ကုဒ်</td>
                                            <td>:</td>
                                            <td className="uppercase">{printingMutation.transportPolNumber || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Main Table - HAS GRID (class main-table) */}
                        <table className="w-full border-collapse border border-black mb-4 main-table">
                            <thead>
                                <tr className="bg-white text-center font-bold">
                                    <th className="p-2 w-10">နံပါတ်</th>
                                    <th className="p-2">စက်ယာဉ်အမည်</th>
                                    <th className="p-2 w-24">KODE UNIT</th>
                                    <th className="p-2 w-20">မီတာ</th>
                                    <th className="p-2 w-12">အရေအတွက်</th>
                                    <th className="p-2 w-32">Serial နံပါတ်</th>
                                    <th className="p-2">KETERANGAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="text-center align-top h-[300px]">
                                    <td className="p-2">1</td>
                                    <td className="p-2 text-left uppercase">
                                        {getEquipmentDetailsForPrint(printingMutation.equipmentCode)?.type} {getEquipmentDetailsForPrint(printingMutation.equipmentCode)?.model}
                                    </td>
                                    <td className="p-2 font-bold uppercase">{printingMutation.equipmentCode}</td>
                                    <td className="p-2">{formatNumber(printingMutation.mutationHM)}</td>
                                    <td className="p-2">1</td>
                                    <td className="p-2 uppercase">
                                        {getEquipmentDetailsForPrint(printingMutation.equipmentCode)?.id}
                                    </td>
                                    <td className="p-2 uppercase">
                                        {printingMutation.notes || 'RFU'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Footer Boxes */}
                        <div className="flex border border-black mb-6">
                            <div className="w-1/2 p-2 border-r border-black min-h-[100px]">
                                <div className="font-bold mb-1">မှတ်ချက်:</div>
                            </div>
                            <div className="w-1/2 p-2">
                                <div className="font-bold mb-1">PERHATIAN :</div>
                                <ol className="list-decimal list-inside text-[10px] space-y-0.5">
                                    <li>ဤပို့ဆောင်လွှာသည် ကုန်ပစ္စည်းပို့ဆောင်မှု၏ တရားဝင်အထောက်အထား ဖြစ်သည်။</li>
                                    <li>ဤပို့ဆောင်လွှာသည် အရောင်းအထောက်အထား မဟုတ်ပါ။</li>
                                    <li>ဤပို့ဆောင်လွှာတွင် အရောင်းအထောက်အထားအဖြစ် ငွေတောင်းခံလွှာ ပါဝင်မည်။</li>
                                </ol>
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="mb-2 italic text-[10px]">
                            Barang Sudah di Serahkan dan Diterima Dalam Keadaan Baik dan Cukup Oleh :
                            <br />
                            (Tanda Tangan dan Cap (Stampel) Perusahaan)
                        </div>

                        <div className="border border-black p-4 flex justify-between">
                            {/* Left Contact Info */}
                            <div className="w-1/3 space-y-4 text-[11px]">
                                <div>
                                    <div className="font-bold">Kontak Pengirim :</div>
                                    <div className="uppercase">{printingMutation.senderName || 'GUDANG'}</div>
                                </div>
                                <div>
                                    <div className="font-bold">Kontak Penerima :</div>
                                    <div className="uppercase">{printingMutation.recipientName}</div>
                                </div>
                                <div>
                                    <div className="font-bold">Kontak Sopir :</div>
                                    <div className="uppercase">{printingMutation.driverName}</div>
                                </div>
                            </div>

                            {/* Right Signatures */}
                            <div className="w-2/3 flex justify-between px-4">
                                <div className="text-center flex flex-col justify-between">
                                    <div className="font-bold mb-12">ပေးပို့သူ</div>
                                    <div className="border-b border-black border-dotted w-32 mx-auto"></div>
                                    <div className="text-left mt-1">ရက်စွဲ:</div>
                                </div>
                                <div className="text-center flex flex-col justify-between">
                                    <div className="font-bold mb-12">ယာဉ်မောင်း</div>
                                    <div className="border-b border-black border-dotted w-32 mx-auto"></div>
                                    <div className="text-left mt-1">ရက်စွဲ:</div>
                                </div>
                                <div className="text-center flex flex-col justify-between">
                                    <div className="font-bold mb-12">လက်ခံသူ</div>
                                    <div className="border-b border-black border-dotted w-32 mx-auto"></div>
                                    <div className="text-left mt-1">ရက်စွဲ:</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MutationView;