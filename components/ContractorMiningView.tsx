import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  Gauge,
  HardHat,
  Landmark,
  PackageCheck,
  PauseCircle,
  Pickaxe,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
  Weight,
} from 'lucide-react';
import { Badge, Card, SectionHeader, StatCard } from './ui/Card';
import { contractorMiningAPI } from '../services/contractorMining';
import {
  ASSIGNMENT_STATUS_LABELS,
  AssignmentStatus,
  ContractorMiningState,
  DailyMiningReport,
  HaulageReceipt,
  MiningAssignment,
  REPORT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
  SettlementStatus,
  SETTLEMENT_STATUS_LABELS,
} from '../types/contractorMining';
import { formatCurrency, formatDate, formatNumber } from '../utils/locale';

type WorkflowTab = 'overview' | 'master' | 'daily' | 'haulage' | 'settlement';

const today = new Date().toISOString().slice(0, 10);

const tabs: Array<{ id: WorkflowTab; label: string; sublabel: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', sublabel: 'Control tower', icon: Gauge },
  { id: 'master', label: 'Master Data', sublabel: 'Blocks & contracts', icon: FileText },
  { id: 'daily', label: 'Daily Report', sublabel: 'Plan → Mine', icon: ClipboardList },
  { id: 'haulage', label: 'Haulage & Receipt', sublabel: 'Haul → Receive', icon: Truck },
  { id: 'settlement', label: 'Settlement', sublabel: 'Share → Settle', icon: Landmark },
];

const assignmentTransitions: Partial<Record<AssignmentStatus, AssignmentStatus>> = {
  DRAFT: 'APPROVED',
  APPROVED: 'ACTIVE_MINING',
  ACTIVE_MINING: 'SUSPENDED',
};

const assignmentActionLabels: Partial<Record<AssignmentStatus, string>> = {
  DRAFT: 'Approve assignment',
  APPROVED: 'Start mining',
  ACTIVE_MINING: 'Suspend',
};

function assignmentStatusVariant(status: AssignmentStatus): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'ACTIVE_MINING' || status === 'APPROVED') return 'success';
  if (status === 'SUSPENDED') return 'error';
  if (status === 'DRAFT') return 'warning';
  return 'neutral';
}

function receiptStatusVariant(status: HaulageReceipt['status']): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'RECEIVED') return 'success';
  if (status === 'HOLD' || status === 'DISPATCHED' || status === 'IN_TRANSIT') return 'warning';
  return 'error';
}

function qualityVariant(status: HaulageReceipt['qualityStatus']): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'PASS') return 'success';
  if (status === 'PENDING' || status === 'HOLD') return 'warning';
  return 'error';
}

function reportStatusVariant(status: DailyMiningReport['status']): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'SITE_VERIFIED' || status === 'CLOSED') return 'success';
  if (status === 'SUBMITTED') return 'warning';
  return 'neutral';
}

function settlementStatusVariant(status: SettlementStatus): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'APPROVED' || status === 'SETTLED' || status === 'CLOSED') return 'success';
  if (status === 'CALCULATED' || status === 'CONFIRMED' || status === 'RECEIVED') return 'warning';
  return 'neutral';
}

function dateLabel(value: string): string {
  return formatDate(value, { year: 'numeric', month: 'short', day: 'numeric' });
}

const inputClass = 'w-full rounded-jpmonitor-md border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-jpmonitor-red focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted';

const ContractorMiningView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [state, setState] = useState<ContractorMiningState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [haulageOpen, setHaulageOpen] = useState(false);
  const [dailyForm, setDailyForm] = useState({ assignmentId: '', date: today, shift: 'Day' as 'Day' | 'Night', quantityMt: '', trips: '', equipmentHours: '', supervisor: '', notes: '' });
  const [haulageForm, setHaulageForm] = useState({ assignmentId: '', date: today, truckNo: '', grossWeightMt: '', tareWeightMt: '', destination: 'Company Stockpile A' });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setState(await contractorMiningAPI.getState());
    } catch {
      setError('Contractor Mining workflow ဒေတာ တင်၍ မရပါ။');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!state) return;
    const firstActive = state.assignments.find(item => item.status === 'ACTIVE_MINING')?.id || state.assignments[0]?.id || '';
    setDailyForm(current => ({ ...current, assignmentId: current.assignmentId || firstActive }));
    setHaulageForm(current => ({ ...current, assignmentId: current.assignmentId || firstActive }));
  }, [state]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3600);
  };

  const getBlock = (id: string) => state?.blocks.find(item => item.id === id);
  const getContractor = (id: string) => state?.contractors.find(item => item.id === id);

  const activeAssignments = useMemo(() => state?.assignments.filter(item => item.status !== 'CLOSED') || [], [state]);
  const activeReports = useMemo(() => state?.dailyReports.reduce((total, item) => total + item.quantityMt, 0) || 0, [state]);
  const eligibleReceipts = useMemo(() => state?.receipts.filter(item => item.status === 'RECEIVED' && item.qualityStatus === 'PASS') || [], [state]);
  const eligibleReceived = useMemo(() => eligibleReceipts.reduce((total, item) => total + item.netWeightMt, 0), [eligibleReceipts]);
  const holdCount = state?.receipts.filter(item => item.status === 'HOLD' || item.qualityStatus === 'HOLD').length || 0;
  const pendingReports = state?.dailyReports.filter(item => item.status === 'SUBMITTED').length || 0;
  const pendingSettlements = state?.settlements.filter(item => !['SETTLED', 'CLOSED'].includes(item.status)).length || 0;

  const refreshAfter = (nextState: ContractorMiningState, message: string) => {
    setState(nextState);
    setSaving(false);
    notify(message);
  };

  const handleAssignmentStatus = async (assignment: MiningAssignment) => {
    const nextStatus = assignmentTransitions[assignment.status];
    if (!nextStatus) return;
    try {
      setSaving(true);
      const nextState = await contractorMiningAPI.updateAssignmentStatus(assignment.id, nextStatus);
      refreshAfter(nextState, `Assignment ${ASSIGNMENT_STATUS_LABELS[nextStatus]} အဖြစ် ပြောင်းလဲပြီးပါပြီ။`);
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Assignment status ပြောင်း၍ မရပါ။');
    }
  };

  const handleDailySubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const nextState = await contractorMiningAPI.createDailyReport({
        assignmentId: dailyForm.assignmentId,
        date: dailyForm.date,
        shift: dailyForm.shift,
        quantityMt: Number(dailyForm.quantityMt),
        trips: Number(dailyForm.trips),
        equipmentHours: Number(dailyForm.equipmentHours),
        supervisor: dailyForm.supervisor,
        notes: dailyForm.notes,
      });
      setState(nextState);
      setDailyOpen(false);
      setDailyForm(current => ({ ...current, quantityMt: '', trips: '', equipmentHours: '', supervisor: '', notes: '' }));
      setSaving(false);
      notify('Daily Mining Report ကို Submitted အဖြစ် သိမ်းပြီးပါပြီ။');
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Daily report သိမ်း၍ မရပါ။');
    }
  };

  const handleHaulageSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const nextState = await contractorMiningAPI.createReceipt({
        assignmentId: haulageForm.assignmentId,
        date: haulageForm.date,
        truckNo: haulageForm.truckNo,
        grossWeightMt: Number(haulageForm.grossWeightMt),
        tareWeightMt: Number(haulageForm.tareWeightMt),
        destination: haulageForm.destination,
      });
      setState(nextState);
      setHaulageOpen(false);
      setHaulageForm(current => ({ ...current, truckNo: '', grossWeightMt: '', tareWeightMt: '' }));
      setSaving(false);
      notify('Haulage Ticket ကို Dispatch အဖြစ် သိမ်းပြီးပါပြီ။');
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Haulage ticket သိမ်း၍ မရပါ။');
    }
  };

  const handleReceiptAction = async (receipt: HaulageReceipt, action: 'received' | 'hold' | 'rejected') => {
    try {
      setSaving(true);
      const nextState = await contractorMiningAPI.updateReceiptStatus(
        receipt.id,
        action === 'received' ? 'RECEIVED' : action === 'hold' ? 'HOLD' : 'REJECTED',
        action === 'received' ? 'PASS' : action === 'hold' ? 'HOLD' : 'FAIL',
      );
      refreshAfter(nextState, action === 'received' ? 'Receipt ကို QA Approved / Received အဖြစ် အတည်ပြုပြီးပါပြီ။' : `Receipt ကို ${RECEIPT_STATUS_LABELS[action === 'hold' ? 'HOLD' : 'REJECTED']} အဖြစ် ပြောင်းပြီးပါပြီ။`);
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Receipt status ပြောင်း၍ မရပါ။');
    }
  };

  const handleCalculateSettlement = async (contractId: string) => {
    try {
      setSaving(true);
      const nextState = await contractorMiningAPI.calculateSettlement(contractId);
      refreshAfter(nextState, 'Share Calculation ပြီးပါပြီ။ Settlement ကို ပြန်စစ်ဆေးနိုင်ပါပြီ။');
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Settlement တွက်ချက်၍ မရပါ။');
    }
  };

  const handleSettlementStatus = async (id: string, status: SettlementStatus) => {
    try {
      setSaving(true);
      const nextState = await contractorMiningAPI.updateSettlementStatus(id, status);
      refreshAfter(nextState, `Settlement ${SETTLEMENT_STATUS_LABELS[status]} အဖြစ် ပြောင်းလဲပြီးပါပြီ။`);
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Settlement status ပြောင်း၍ မရပါ။');
    }
  };

  const renderAssignment = (assignment: MiningAssignment) => {
    const contractor = getContractor(assignment.contractorId);
    const block = getBlock(assignment.blockId);
    const nextStatus = assignmentTransitions[assignment.status];
    return (
      <div key={assignment.id} className="rounded-jpmonitor-lg border border-border bg-bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-jpmonitor-red">{assignment.referenceId}</span>
              <Badge variant={assignmentStatusVariant(assignment.status)}>{ASSIGNMENT_STATUS_LABELS[assignment.status]}</Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold text-text-primary">{contractor?.name || 'Unknown contractor'}</h3>
            <p className="mt-1 text-sm text-text-muted">{block?.code} · {block?.name} · {block?.location}</p>
          </div>
          {nextStatus && (
            <button disabled={saving} onClick={() => handleAssignmentStatus(assignment)} className={`inline-flex items-center gap-2 rounded-jpmonitor-md px-3 py-2 text-xs font-semibold transition-colors ${assignment.status === 'ACTIVE_MINING' ? 'bg-jpmonitor-red text-white hover:bg-jpmonitor-red-hover' : 'border border-border bg-bg-surface text-text-primary hover:bg-bg-elevated'}`}>
              {assignment.status === 'ACTIVE_MINING' ? <PauseCircle size={14} /> : <CheckCircle2 size={14} />}
              {assignmentActionLabels[assignment.status]}
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3 text-xs sm:grid-cols-4">
          <div><p className="text-text-muted">Expected production</p><p className="mt-1 font-semibold text-text-primary">{formatNumber(assignment.expectedProductionMt, 0)} MT</p></div>
          <div><p className="text-text-muted">Assignment period</p><p className="mt-1 font-semibold text-text-primary">{dateLabel(assignment.startDate)} – {dateLabel(assignment.endDate)}</p></div>
          <div><p className="text-text-muted">Site access</p><p className="mt-1 font-semibold text-text-primary">{assignment.siteAccess}</p></div>
          <div><p className="text-text-muted">HSE gate</p><p className={`mt-1 font-semibold ${assignment.hseCompliant ? 'text-status-success' : 'text-jpmonitor-red'}`}>{assignment.hseCompliant ? 'Compliant' : 'Exception / blocked'}</p></div>
        </div>
      </div>
    );
  };

  if (loading && !state) return <div className="p-8 text-center text-text-muted">Contractor Mining workflow တင်နေပါသည်...</div>;
  if (!state) return <div className="p-8 text-center text-jpmonitor-red">{error || 'Workflow data မတွေ့ပါ။'}</div>;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contractor Mining & Production Sharing"
        subtitle="Plan → Mine → Haul → Receive → Share → Settle · Reference ID ဖြင့် transaction တစ်ကြောင်းတည်း ချိတ်ဆက်ထားသော control workspace"
        action={<button onClick={loadData} className="inline-flex items-center gap-2 rounded-jpmonitor-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated" title="ပြန်တင်ရန်"><RefreshCw size={15} /> Refresh</button>}
      />

      {notice && <div className="flex items-center gap-2 rounded-jpmonitor-md border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success"><CheckCircle2 size={16} />{notice}</div>}
      {error && <div className="flex items-start gap-2 rounded-jpmonitor-md border border-jpmonitor-red/30 bg-jpmonitor-red-subtle px-4 py-3 text-sm text-jpmonitor-red"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><div className="flex-1">{error}</div><button onClick={() => setError(null)} className="font-semibold">ပိတ်ရန်</button></div>}

      <Card className="overflow-hidden bg-[#f1f4f0] dark:bg-bg-surface" hover={false}>
        <div className="border-b border-[#cad4ca] px-5 py-4 dark:border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-jpmonitor-red">Core system lifecycle</p>
              <p className="mt-1 text-sm text-text-secondary">Contractor → Site → Haulage Ticket → Company Receipt → 3-way Share Settlement</p>
            </div>
            <div className="rounded-pill bg-[#173d27] px-3 py-1.5 text-xs font-semibold text-white">{state.assignments.filter(item => item.status === 'ACTIVE_MINING').length} active assignment(s)</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-[#cad4ca] sm:grid-cols-4 lg:grid-cols-7 lg:divide-y-0 dark:divide-border">
          {['Plan', 'Mine', 'Haul', 'Receive', 'Share', 'Settle', 'Report'].map((step, index) => (
            <div key={step} className="flex items-center gap-3 px-4 py-4">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 5 ? 'bg-jpmonitor-red text-white' : 'bg-[#173d27] text-white'}`}>{String(index + 1).padStart(2, '0')}</div>
              <div><p className="text-sm font-semibold text-text-primary">{step}</p><p className="text-[10px] text-text-muted">{index === 0 ? 'Block / contract' : index === 1 ? 'Daily mining' : index === 2 ? 'Dispatch' : index === 3 ? 'Weighbridge' : index === 4 ? 'Quantity rule' : index === 5 ? 'Approval gate' : 'Audit trail'}</p></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Received & QA approved" value={`${formatNumber(eligibleReceived, 1)} MT`} icon={<Weight size={20} />} />
        <StatCard label="Daily mining reported" value={`${formatNumber(activeReports, 0)} MT`} icon={<Pickaxe size={20} />} />
        <StatCard label="Quality / receipt hold" value={holdCount} icon={<PackageCheck size={20} />} trend={holdCount > 0 ? { value: holdCount, positive: false } : undefined} />
        <StatCard label="Settlement pending action" value={pendingSettlements} icon={<Landmark size={20} />} trend={pendingSettlements > 0 ? { value: pendingSettlements, positive: false } : undefined} />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-jpmonitor-lg border border-border bg-bg-surface p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex min-w-max items-center gap-2 rounded-jpmonitor-md px-3 py-2.5 text-left transition-colors ${active ? 'bg-[#173d27] text-white shadow-sm' : 'text-text-secondary hover:bg-bg-elevated'}`}><Icon size={15} /><span><span className="block text-xs font-semibold">{tab.label}</span><span className={`block text-[10px] ${active ? 'text-white/70' : 'text-text-muted'}`}>{tab.sublabel}</span></span></button>;
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="p-6 xl:col-span-3" hover={false}>
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-text-primary">Assignment control</h2><p className="mt-1 text-sm text-text-muted">Draft → Approved → Active Mining → Suspended → Closed</p></div><HardHat className="text-jpmonitor-red" size={22} /></div>
            <div className="space-y-3">{activeAssignments.map(renderAssignment)}</div>
          </Card>
          <Card className="p-6 xl:col-span-2" hover={false}>
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-text-primary">Control queue</h2><p className="mt-1 text-sm text-text-muted">Workflow exceptions that need action</p></div><ShieldCheck className="text-jpmonitor-red" size={22} /></div>
            <div className="space-y-3">
              <button onClick={() => setActiveTab('daily')} className="flex w-full items-center gap-3 rounded-jpmonitor-md border border-border p-3 text-left hover:bg-bg-elevated"><ClipboardCheck size={17} className="text-warning" /><span className="flex-1"><span className="block text-sm font-semibold text-text-primary">{pendingReports} daily report(s) pending verification</span><span className="block text-xs text-text-muted">Supervisor must verify pit, quantity, and HSE checkpoint.</span></span><ArrowRight size={15} className="text-text-muted" /></button>
              <button onClick={() => setActiveTab('haulage')} className="flex w-full items-center gap-3 rounded-jpmonitor-md border border-border p-3 text-left hover:bg-bg-elevated"><Weight size={17} className="text-warning" /><span className="flex-1"><span className="block text-sm font-semibold text-text-primary">{holdCount} receipt / quality hold(s)</span><span className="block text-xs text-text-muted">Unreleased material cannot proceed to settlement.</span></span><ArrowRight size={15} className="text-text-muted" /></button>
              <button onClick={() => setActiveTab('settlement')} className="flex w-full items-center gap-3 rounded-jpmonitor-md border border-border p-3 text-left hover:bg-bg-elevated"><FileCheck2 size={17} className="text-jpmonitor-red" /><span className="flex-1"><span className="block text-sm font-semibold text-text-primary">{pendingSettlements} settlement(s) awaiting approval</span><span className="block text-xs text-text-muted">Approve only after quantity and quality reconciliation.</span></span><ArrowRight size={15} className="text-text-muted" /></button>
            </div>
            <div className="mt-5 rounded-jpmonitor-md bg-jpmonitor-red-subtle p-4"><p className="text-xs font-semibold uppercase tracking-wide text-jpmonitor-red">HSE suspension control</p><p className="mt-1 text-sm text-text-secondary">Suspended assignments block new mining, haulage dispatch, and settlement approval until the HSE gate is cleared.</p></div>
          </Card>
        </div>
      )}

      {activeTab === 'master' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6" hover={false}><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-text-primary">Mine Blocks</h2><p className="text-sm text-text-muted">Block code, location, and estimated reserve</p></div><Pickaxe size={20} className="text-jpmonitor-red" /></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><tr><th className="pb-3">Block</th><th className="pb-3">Location</th><th className="pb-3 text-right">Reserve</th><th className="pb-3">State</th></tr></thead><tbody className="divide-y divide-border-subtle">{state.blocks.map(block => <tr key={block.id}><td className="py-3"><p className="font-mono text-xs font-semibold text-jpmonitor-red">{block.code}</p><p className="mt-1 text-text-primary">{block.name}</p></td><td className="py-3 text-text-secondary">{block.location}</td><td className="py-3 text-right font-semibold text-text-primary">{formatNumber(block.reserveMt, 0)} MT</td><td className="py-3"><Badge variant={block.active ? 'success' : 'neutral'}>{block.active ? 'Active' : 'Inactive'}</Badge></td></tr>)}</tbody></table></div></Card>
            <Card className="p-6" hover={false}><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-text-primary">Contractors</h2><p className="text-sm text-text-muted">Identity, license, equipment capacity</p></div><Users size={20} className="text-jpmonitor-red" /></div><div className="space-y-3">{state.contractors.map(contractor => <div key={contractor.id} className="rounded-jpmonitor-md border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-jpmonitor-red">{contractor.code}</p><h3 className="mt-1 font-semibold text-text-primary">{contractor.name}</h3><p className="mt-1 text-xs text-text-muted">{contractor.contact} · License {contractor.license}</p></div><Badge variant={contractor.status === 'ACTIVE' ? 'success' : 'error'}>{contractor.status}</Badge></div><div className="mt-3 flex gap-5 text-xs"><span className="text-text-muted">Daily capacity <strong className="ml-1 text-text-primary">{formatNumber(contractor.capacityMtPerDay, 0)} MT</strong></span><span className="text-text-muted">Equipment <strong className="ml-1 text-text-primary">{contractor.equipmentCount}</strong></span></div></div>)}</div></Card>
          </div>
          <Card className="p-6" hover={false}><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-text-primary">Production-sharing contracts & rules</h2><p className="text-sm text-text-muted">Contract period, rate, share ratio, deductions, and linked assignment</p></div><FileCheck2 size={20} className="text-jpmonitor-red" /></div><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{state.contracts.map(contract => { const block = getBlock(contract.blockId); const contractor = getContractor(contract.contractorId); return <div key={contract.id} className="rounded-jpmonitor-lg border border-border bg-bg-elevated/50 p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-xs font-semibold text-jpmonitor-red">{contract.contractNo}</p><h3 className="mt-1 font-semibold text-text-primary">{contractor?.name} · {block?.code}</h3></div><Badge variant={contract.status === 'ACTIVE' ? 'success' : 'neutral'}>{contract.status}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-text-muted">Contract period</p><p className="mt-1 text-text-primary">{dateLabel(contract.startDate)} – {dateLabel(contract.endDate)}</p></div><div><p className="text-xs text-text-muted">Rate / MT</p><p className="mt-1 font-semibold text-text-primary">{formatCurrency(contract.ratePerMt)}</p></div><div><p className="text-xs text-text-muted">Company share</p><p className="mt-1 font-semibold text-text-primary">{formatNumber(contract.companySharePct, 2)}%</p></div><div><p className="text-xs text-text-muted">Contractor share</p><p className="mt-1 font-semibold text-text-primary">{formatNumber(contract.contractorSharePct, 2)}%</p></div><div><p className="text-xs text-text-muted">Deductions</p><p className="mt-1 font-semibold text-text-primary">{formatNumber(contract.deductionsPct, 2)}%</p></div><div><p className="text-xs text-text-muted">Share basis</p><p className="mt-1 font-semibold text-text-primary">Received quantity / assay</p></div></div></div>; })}</div></Card>
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">Daily Mining Report</h2><p className="mt-1 text-sm text-text-muted">Contractor capture → Supervisor site verification → Closed</p></div><button onClick={() => setDailyOpen(current => !current)} className="inline-flex items-center gap-2 rounded-jpmonitor-md bg-jpmonitor-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-jpmonitor-red-hover"><Plus size={16} /> New daily report</button></div>
          {dailyOpen && <Card className="p-6" hover={false}><form onSubmit={handleDailySubmit} className="space-y-5"><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div><label htmlFor="daily-assignment" className={labelClass}>Assignment / Reference ID</label><select id="daily-assignment" required className={inputClass} value={dailyForm.assignmentId} onChange={event => setDailyForm({ ...dailyForm, assignmentId: event.target.value })}>{activeAssignments.map(item => <option key={item.id} value={item.id}>{item.referenceId} · {getBlock(item.blockId)?.code}</option>)}</select></div><div><label htmlFor="daily-date" className={labelClass}>Report date</label><input id="daily-date" required type="date" className={inputClass} value={dailyForm.date} onChange={event => setDailyForm({ ...dailyForm, date: event.target.value })} /></div><div><label htmlFor="daily-shift" className={labelClass}>Shift</label><select id="daily-shift" className={inputClass} value={dailyForm.shift} onChange={event => setDailyForm({ ...dailyForm, shift: event.target.value as 'Day' | 'Night' })}><option value="Day">Day</option><option value="Night">Night</option></select></div><div><label htmlFor="daily-quantity" className={labelClass}>Actual quantity (MT)</label><input id="daily-quantity" required min="0.01" step="0.01" type="number" className={inputClass} value={dailyForm.quantityMt} onChange={event => setDailyForm({ ...dailyForm, quantityMt: event.target.value })} /></div><div><label htmlFor="daily-trips" className={labelClass}>Trip count</label><input id="daily-trips" required min="1" step="1" type="number" className={inputClass} value={dailyForm.trips} onChange={event => setDailyForm({ ...dailyForm, trips: event.target.value })} /></div><div><label htmlFor="daily-hours" className={labelClass}>Equipment hours</label><input id="daily-hours" required min="0" step="0.5" type="number" className={inputClass} value={dailyForm.equipmentHours} onChange={event => setDailyForm({ ...dailyForm, equipmentHours: event.target.value })} /></div><div className="md:col-span-3"><label htmlFor="daily-supervisor" className={labelClass}>Company site supervisor</label><input id="daily-supervisor" required className={inputClass} placeholder="Supervisor name" value={dailyForm.supervisor} onChange={event => setDailyForm({ ...dailyForm, supervisor: event.target.value })} /></div><div className="md:col-span-3"><label htmlFor="daily-notes" className={labelClass}>Notes / checkpoint exception</label><textarea id="daily-notes" className={`${inputClass} min-h-20`} value={dailyForm.notes} onChange={event => setDailyForm({ ...dailyForm, notes: event.target.value })} /></div></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setDailyOpen(false)} className="rounded-jpmonitor-md px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated">Cancel</button><button disabled={saving} type="submit" className="rounded-jpmonitor-md bg-jpmonitor-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Submit report'}</button></div></form></Card>}
          <Card className="overflow-hidden" hover={false}><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-5 py-3">Reference / date</th><th className="px-5 py-3">Contractor / block</th><th className="px-5 py-3 text-right">Quantity</th><th className="px-5 py-3 text-right">Trips</th><th className="px-5 py-3">Supervisor</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">HSE</th></tr></thead><tbody className="divide-y divide-border-subtle">{state.dailyReports.map(report => <tr key={report.id} className="hover:bg-bg-elevated/50"><td className="px-5 py-4"><p className="font-mono text-xs font-semibold text-jpmonitor-red">{report.referenceId}</p><p className="mt-1 text-text-secondary">{dateLabel(report.date)} · {report.shift}</p></td><td className="px-5 py-4"><p className="font-medium text-text-primary">{getContractor(report.contractorId)?.name}</p><p className="mt-1 text-xs text-text-muted">{getBlock(report.blockId)?.code}</p></td><td className="px-5 py-4 text-right font-semibold text-text-primary">{formatNumber(report.quantityMt, 1)} MT</td><td className="px-5 py-4 text-right text-text-primary">{formatNumber(report.trips, 0)}</td><td className="px-5 py-4 text-text-secondary">{report.supervisor}</td><td className="px-5 py-4"><Badge variant={reportStatusVariant(report.status)}>{REPORT_STATUS_LABELS[report.status]}</Badge></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1 text-xs font-semibold ${report.hsePassed ? 'text-status-success' : 'text-jpmonitor-red'}`}>{report.hsePassed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{report.hsePassed ? 'Passed' : 'Exception'}</span></td></tr>)}</tbody></table></div></Card>
        </div>
      )}

      {activeTab === 'haulage' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">Site Haulage & Company Receipt</h2><p className="mt-1 text-sm text-text-muted">Dispatch ticket → Gate entry → Weighbridge → Received / Rejected / Hold</p></div><button onClick={() => setHaulageOpen(current => !current)} className="inline-flex items-center gap-2 rounded-jpmonitor-md bg-jpmonitor-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-jpmonitor-red-hover"><Plus size={16} /> New haulage ticket</button></div>
          {haulageOpen && <Card className="p-6" hover={false}><form onSubmit={handleHaulageSubmit} className="space-y-5"><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div><label htmlFor="haulage-assignment" className={labelClass}>Assignment / Reference ID</label><select id="haulage-assignment" required className={inputClass} value={haulageForm.assignmentId} onChange={event => setHaulageForm({ ...haulageForm, assignmentId: event.target.value })}>{activeAssignments.map(item => <option key={item.id} value={item.id}>{item.referenceId} · {getBlock(item.blockId)?.code}</option>)}</select></div><div><label htmlFor="haulage-date" className={labelClass}>Dispatch date</label><input id="haulage-date" required type="date" className={inputClass} value={haulageForm.date} onChange={event => setHaulageForm({ ...haulageForm, date: event.target.value })} /></div><div><label htmlFor="haulage-truck" className={labelClass}>Truck / vehicle no.</label><input id="haulage-truck" required className={inputClass} placeholder="9H-0000" value={haulageForm.truckNo} onChange={event => setHaulageForm({ ...haulageForm, truckNo: event.target.value })} /></div><div><label htmlFor="haulage-gross" className={labelClass}>Gross weight (MT)</label><input id="haulage-gross" required min="0.01" step="0.01" type="number" className={inputClass} value={haulageForm.grossWeightMt} onChange={event => setHaulageForm({ ...haulageForm, grossWeightMt: event.target.value })} /></div><div><label htmlFor="haulage-tare" className={labelClass}>Tare weight (MT)</label><input id="haulage-tare" required min="0" step="0.01" type="number" className={inputClass} value={haulageForm.tareWeightMt} onChange={event => setHaulageForm({ ...haulageForm, tareWeightMt: event.target.value })} /></div><div><label htmlFor="haulage-destination" className={labelClass}>Company receiving point</label><select id="haulage-destination" className={inputClass} value={haulageForm.destination} onChange={event => setHaulageForm({ ...haulageForm, destination: event.target.value })}><option>Company Stockpile A</option><option>Company Stockpile B</option><option>Weighbridge 01</option><option>Weighbridge 02</option></select></div></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setHaulageOpen(false)} className="rounded-jpmonitor-md px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated">Cancel</button><button disabled={saving} type="submit" className="rounded-jpmonitor-md bg-jpmonitor-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Create dispatch ticket'}</button></div></form></Card>}
          <Card className="overflow-hidden" hover={false}><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-5 py-3">Ticket / reference</th><th className="px-5 py-3">Source / truck</th><th className="px-5 py-3 text-right">Gross</th><th className="px-5 py-3 text-right">Tare</th><th className="px-5 py-3 text-right">Net quantity</th><th className="px-5 py-3">Receipt / quality</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-border-subtle">{state.receipts.map(receipt => <tr key={receipt.id} className="hover:bg-bg-elevated/50"><td className="px-5 py-4"><p className="font-mono text-xs font-semibold text-jpmonitor-red">{receipt.ticketNo}</p><p className="mt-1 text-xs text-text-muted">{receipt.referenceId} · {dateLabel(receipt.date)}</p></td><td className="px-5 py-4"><p className="font-medium text-text-primary">{getContractor(receipt.contractorId)?.name}</p><p className="mt-1 text-xs text-text-muted">{getBlock(receipt.blockId)?.code} · {receipt.truckNo}</p></td><td className="px-5 py-4 text-right text-text-primary">{formatNumber(receipt.grossWeightMt, 2)}</td><td className="px-5 py-4 text-right text-text-primary">{formatNumber(receipt.tareWeightMt, 2)}</td><td className="px-5 py-4 text-right font-semibold text-text-primary">{formatNumber(receipt.netWeightMt, 2)} MT</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5"><Badge variant={receiptStatusVariant(receipt.status)}>{RECEIPT_STATUS_LABELS[receipt.status]}</Badge><Badge variant={qualityVariant(receipt.qualityStatus)}>QA {receipt.qualityStatus}</Badge></div><p className="mt-1 text-xs text-text-muted">{receipt.assayGrade ? `Assay ${formatNumber(receipt.assayGrade, 1)}%` : 'Assay pending'}</p></td><td className="px-5 py-4"><div className="flex gap-2">{receipt.status !== 'RECEIVED' && <button disabled={saving} onClick={() => handleReceiptAction(receipt, 'received')} className="rounded-jpmonitor-md bg-status-success-bg px-2.5 py-1.5 text-xs font-semibold text-status-success hover:opacity-80">Receive / QA pass</button>}{receipt.status !== 'HOLD' && receipt.status !== 'RECEIVED' && <button disabled={saving} onClick={() => handleReceiptAction(receipt, 'hold')} className="rounded-jpmonitor-md bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning hover:opacity-80">Hold</button>}{receipt.status !== 'REJECTED' && receipt.status !== 'RECEIVED' && <button disabled={saving} onClick={() => handleReceiptAction(receipt, 'rejected')} className="rounded-jpmonitor-md bg-jpmonitor-red-subtle px-2.5 py-1.5 text-xs font-semibold text-jpmonitor-red hover:opacity-80">Reject</button>}</div></td></tr>)}</tbody></table></div></Card>
        </div>
      )}

      {activeTab === 'settlement' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-text-primary">3-way Share Settlement</h2><p className="mt-1 text-sm text-text-muted">Received quantity + assay → share rule → contractor entitlement → approval → settle</p></div><div className="rounded-jpmonitor-md border border-border bg-bg-surface px-3 py-2 text-xs text-text-muted">Only Received + QA PASS receipts are eligible</div></div>
          <Card className="overflow-hidden" hover={false}><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead className="bg-bg-elevated text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-5 py-3">Settlement</th><th className="px-5 py-3">Contract / reference</th><th className="px-5 py-3 text-right">Received</th><th className="px-5 py-3 text-right">Company share</th><th className="px-5 py-3 text-right">Contractor share</th><th className="px-5 py-3 text-right">Deduction</th><th className="px-5 py-3 text-right">Payable</th><th className="px-5 py-3">Status / action</th></tr></thead><tbody className="divide-y divide-border-subtle">{state.settlements.map(settlement => { const contract = state.contracts.find(item => item.id === settlement.contractId); const contractor = contract ? getContractor(contract.contractorId) : undefined; const nextStatus: Partial<Record<SettlementStatus, SettlementStatus>> = { DRAFT: 'CONFIRMED', CALCULATED: 'CONFIRMED', CONFIRMED: 'APPROVED', APPROVED: 'SETTLED', SETTLED: 'CLOSED' }; const next = nextStatus[settlement.status]; return <tr key={settlement.id} className="hover:bg-bg-elevated/50"><td className="px-5 py-4"><p className="font-mono text-xs font-semibold text-jpmonitor-red">{settlement.settlementNo}</p><p className="mt-1 text-xs text-text-muted">{settlement.period}</p></td><td className="px-5 py-4"><p className="font-medium text-text-primary">{contract?.contractNo} · {contractor?.name}</p><p className="mt-1 text-xs text-text-muted">{settlement.referenceId}</p></td><td className="px-5 py-4 text-right font-semibold text-text-primary">{formatNumber(settlement.receivedQuantityMt, 2)} MT</td><td className="px-5 py-4 text-right text-text-primary">{formatNumber(settlement.companyShareMt, 2)} MT</td><td className="px-5 py-4 text-right text-text-primary">{formatNumber(settlement.contractorShareMt, 2)} MT</td><td className="px-5 py-4 text-right text-text-primary">{formatNumber(settlement.deductionsMt, 2)} MT</td><td className="px-5 py-4 text-right font-semibold text-text-primary">{formatCurrency(settlement.payableAmount)}</td><td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><Badge variant={settlementStatusVariant(settlement.status)}>{SETTLEMENT_STATUS_LABELS[settlement.status]}</Badge>{settlement.status !== 'SETTLED' && settlement.status !== 'CLOSED' && <button disabled={saving} onClick={() => handleCalculateSettlement(settlement.contractId)} className="rounded-jpmonitor-md border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-elevated">Recalculate</button>}{next && <button disabled={saving} onClick={() => handleSettlementStatus(settlement.id, next)} className="rounded-jpmonitor-md bg-jpmonitor-red px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-jpmonitor-red-hover">{next === 'CONFIRMED' ? 'Confirm' : next === 'APPROVED' ? 'Approve' : next === 'SETTLED' ? 'Settle' : 'Close'}</button>}</div></td></tr>; })}</tbody></table></div></Card>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><Card className="p-5" hover={false}><div className="flex items-center gap-2"><Weight size={18} className="text-jpmonitor-red" /><p className="text-sm font-semibold text-text-primary">Quantity basis</p></div><p className="mt-3 text-2xl font-light text-text-primary">{formatNumber(eligibleReceived, 2)} MT</p><p className="mt-1 text-xs text-text-muted">{eligibleReceipts.length} received ticket(s) with QA PASS</p></Card><Card className="p-5" hover={false}><div className="flex items-center gap-2"><PackageCheck size={18} className="text-jpmonitor-red" /><p className="text-sm font-semibold text-text-primary">Company share ledger</p></div><p className="mt-3 text-2xl font-light text-text-primary">{formatNumber(state.settlements.reduce((sum, item) => sum + item.companyShareMt, 0), 2)} MT</p><p className="mt-1 text-xs text-text-muted">Posts after settlement confirmation</p></Card><Card className="p-5" hover={false}><div className="flex items-center gap-2"><Landmark size={18} className="text-jpmonitor-red" /><p className="text-sm font-semibold text-text-primary">Contractor payable</p></div><p className="mt-3 text-2xl font-light text-text-primary">{formatCurrency(state.settlements.reduce((sum, item) => sum + item.payableAmount, 0))}</p><p className="mt-1 text-xs text-text-muted">After deductions and approval gates</p></Card></div>
        </div>
      )}
    </div>
  );
};

export default ContractorMiningView;
