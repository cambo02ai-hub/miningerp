import { apiRequest } from './api';
import {
  AssignmentStatus,
  ContractorMiningState,
  DailyMiningReportInput,
  HaulageReceiptInput,
  QualityStatus,
  SettlementStatus,
} from '../types/contractorMining';

const STORAGE_KEY = 'jpmonitor_contractor_mining_workflow';

const initialState: ContractorMiningState = {
  blocks: [
    { id: 'block-01', code: 'MB-01', name: 'North Ridge Block', location: 'Kachin Site A', reserveMt: 185000, active: true },
    { id: 'block-02', code: 'MB-02', name: 'River Bend Block', location: 'Kachin Site B', reserveMt: 92000, active: true },
    { id: 'block-03', code: 'MB-03', name: 'South Cut Block', location: 'Kachin Site C', reserveMt: 64000, active: false },
  ],
  contractors: [
    { id: 'contractor-01', code: 'CTR-001', name: 'Golden Ridge Mining Co.', contact: '+95 9 770 123 456', license: 'LIC-KC-2026-014', capacityMtPerDay: 120, equipmentCount: 14, status: 'ACTIVE' },
    { id: 'contractor-02', code: 'CTR-002', name: 'Ayeyar Quarry Services', contact: '+95 9 420 880 211', license: 'LIC-KC-2026-021', capacityMtPerDay: 90, equipmentCount: 9, status: 'SUSPENDED' },
  ],
  contracts: [
    { id: 'contract-01', contractNo: 'PSC-2026-001', blockId: 'block-01', contractorId: 'contractor-01', startDate: '2026-07-01', endDate: '2026-12-31', companySharePct: 33.33, contractorSharePct: 66.67, ratePerMt: 180000, deductionsPct: 5, status: 'ACTIVE' },
    { id: 'contract-02', contractNo: 'PSC-2026-002', blockId: 'block-02', contractorId: 'contractor-02', startDate: '2026-06-15', endDate: '2026-11-30', companySharePct: 40, contractorSharePct: 60, ratePerMt: 165000, deductionsPct: 3, status: 'ACTIVE' },
  ],
  assignments: [
    { id: 'assignment-01', referenceId: 'REF-2026-08-001', contractorId: 'contractor-01', blockId: 'block-01', contractId: 'contract-01', startDate: '2026-07-01', endDate: '2026-12-31', expectedProductionMt: 18000, status: 'ACTIVE_MINING', hseCompliant: true, siteAccess: 'Gate A / Weighbridge 01' },
    { id: 'assignment-02', referenceId: 'REF-2026-08-002', contractorId: 'contractor-02', blockId: 'block-02', contractId: 'contract-02', startDate: '2026-06-15', endDate: '2026-11-30', expectedProductionMt: 12000, status: 'SUSPENDED', hseCompliant: false, siteAccess: 'Gate B / Weighbridge 02' },
  ],
  dailyReports: [
    { id: 'report-01', referenceId: 'REF-2026-08-001', date: '2026-08-28', shift: 'Day', assignmentId: 'assignment-01', contractorId: 'contractor-01', blockId: 'block-01', quantityMt: 420, trips: 28, equipmentHours: 96, supervisor: 'U Kyaw Min', status: 'SITE_VERIFIED', hsePassed: true, notes: 'Pit face and checkpoint verified.' },
    { id: 'report-02', referenceId: 'REF-2026-08-001', date: '2026-08-28', shift: 'Night', assignmentId: 'assignment-01', contractorId: 'contractor-01', blockId: 'block-01', quantityMt: 480, trips: 32, equipmentHours: 104, supervisor: 'Daw Ei Ei', status: 'SUBMITTED', hsePassed: true, notes: 'Pending supervisor verification.' },
    { id: 'report-03', referenceId: 'REF-2026-08-002', date: '2026-08-27', shift: 'Day', assignmentId: 'assignment-02', contractorId: 'contractor-02', blockId: 'block-02', quantityMt: 260, trips: 19, equipmentHours: 58, supervisor: 'U Htet Aung', status: 'SITE_VERIFIED', hsePassed: false, notes: 'HSE checkpoint exception reported.' },
  ],
  receipts: [
    { id: 'receipt-01', ticketNo: 'HT-2026-0828-001', referenceId: 'REF-2026-08-001', date: '2026-08-28', assignmentId: 'assignment-01', contractorId: 'contractor-01', blockId: 'block-01', truckNo: '9H-2187', grossWeightMt: 34.8, tareWeightMt: 12.3, netWeightMt: 22.5, destination: 'Company Stockpile A', status: 'RECEIVED', qualityStatus: 'PASS', assayGrade: 92.4, receivingOfficer: 'U Maung Maung' },
    { id: 'receipt-02', ticketNo: 'HT-2026-0828-002', referenceId: 'REF-2026-08-001', date: '2026-08-28', assignmentId: 'assignment-01', contractorId: 'contractor-01', blockId: 'block-01', truckNo: '9H-3321', grossWeightMt: 35.2, tareWeightMt: 12.1, netWeightMt: 23.1, destination: 'Company Stockpile A', status: 'HOLD', qualityStatus: 'HOLD', assayGrade: 88.7 },
    { id: 'receipt-03', ticketNo: 'HT-2026-0827-001', referenceId: 'REF-2026-08-002', date: '2026-08-27', assignmentId: 'assignment-02', contractorId: 'contractor-02', blockId: 'block-02', truckNo: '7K-9982', grossWeightMt: 31.6, tareWeightMt: 11.5, netWeightMt: 20.1, destination: 'Company Stockpile B', status: 'RECEIVED', qualityStatus: 'PASS', assayGrade: 90.2, receivingOfficer: 'Daw May Zin' },
  ],
  settlements: [
    { id: 'settlement-01', settlementNo: 'SET-2026-008', referenceId: 'REF-2026-08-001', contractId: 'contract-01', period: '2026-08-16 – 2026-08-28', receivedQuantityMt: 640, companyShareMt: 213.31, contractorShareMt: 426.69, deductionsMt: 21.33, payableAmount: 72816000, status: 'CONFIRMED', qualityStatus: 'PASS' },
    { id: 'settlement-02', settlementNo: 'SET-2026-007', referenceId: 'REF-2026-08-002', contractId: 'contract-02', period: '2026-08-16 – 2026-08-27', receivedQuantityMt: 20.1, companyShareMt: 8.04, contractorShareMt: 12.06, deductionsMt: 0.36, payableAmount: 1935450, status: 'DRAFT', qualityStatus: 'PASS' },
  ],
};

function cloneState(state: ContractorMiningState): ContractorMiningState {
  return JSON.parse(JSON.stringify(state)) as ContractorMiningState;
}

function readLocalState(): ContractorMiningState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...cloneState(initialState), ...JSON.parse(raw) };
  } catch {
    // Use seeded data when browser storage is unavailable or corrupted.
  }
  return cloneState(initialState);
}

function writeLocalState(state: ContractorMiningState): ContractorMiningState {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The workflow remains usable for the current session without persistence.
  }
  return state;
}

function createReferenceId(prefix: string, index: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(index + 1).padStart(3, '0')}`;
}

export const contractorMiningAPI = {
  async getState(): Promise<ContractorMiningState> {
    try {
      const remote = await apiRequest<ContractorMiningState>('/contractor-mining/state');
      if (remote?.blocks && remote?.assignments) return remote;
    } catch {
      // The current backend does not expose this domain yet; use the local workflow store.
    }
    return readLocalState();
  },

  async createDailyReport(input: DailyMiningReportInput): Promise<ContractorMiningState> {
    const state = readLocalState();
    const assignment = state.assignments.find(item => item.id === input.assignmentId);
    if (!assignment) throw new Error('Assignment not found.');
    if (assignment.status === 'SUSPENDED' || assignment.status === 'CLOSED') throw new Error('Suspended or closed assignments cannot receive daily reports.');
    const report = {
      id: `report-${Date.now()}`,
      referenceId: assignment.referenceId,
      date: input.date,
      shift: input.shift,
      assignmentId: input.assignmentId,
      contractorId: assignment.contractorId,
      blockId: assignment.blockId,
      quantityMt: input.quantityMt,
      trips: input.trips,
      equipmentHours: input.equipmentHours,
      supervisor: input.supervisor,
      status: 'SUBMITTED' as const,
      hsePassed: assignment.hseCompliant,
      notes: input.notes,
    };
    state.dailyReports.unshift(report);
    return writeLocalState(state);
  },

  async createReceipt(input: HaulageReceiptInput): Promise<ContractorMiningState> {
    const state = readLocalState();
    const assignment = state.assignments.find(item => item.id === input.assignmentId);
    if (!assignment) throw new Error('Assignment not found.');
    if (assignment.status === 'SUSPENDED' || assignment.status === 'CLOSED') throw new Error('Suspended or closed assignments cannot dispatch haulage.');
    if (input.grossWeightMt <= input.tareWeightMt) throw new Error('Gross weight must be greater than tare weight.');
    const receipt = {
      id: `receipt-${Date.now()}`,
      ticketNo: `HT-${input.date.replace(/-/g, '')}-${String(state.receipts.length + 1).padStart(3, '0')}`,
      referenceId: assignment.referenceId,
      date: input.date,
      assignmentId: input.assignmentId,
      contractorId: assignment.contractorId,
      blockId: assignment.blockId,
      truckNo: input.truckNo,
      grossWeightMt: input.grossWeightMt,
      tareWeightMt: input.tareWeightMt,
      netWeightMt: Number((input.grossWeightMt - input.tareWeightMt).toFixed(2)),
      destination: input.destination,
      status: 'DISPATCHED' as const,
      qualityStatus: 'PENDING' as const,
    };
    state.receipts.unshift(receipt);
    return writeLocalState(state);
  },

  async updateAssignmentStatus(id: string, status: AssignmentStatus): Promise<ContractorMiningState> {
    const state = readLocalState();
    const assignment = state.assignments.find(item => item.id === id);
    if (!assignment) throw new Error('Assignment not found.');
    if (status === 'ACTIVE_MINING' && !assignment.hseCompliant) throw new Error('HSE compliance is required before activating mining.');
    assignment.status = status;
    if (status === 'SUSPENDED') assignment.hseCompliant = false;
    return writeLocalState(state);
  },

  async updateReceiptStatus(id: string, status: 'RECEIVED' | 'REJECTED' | 'HOLD', qualityStatus?: QualityStatus): Promise<ContractorMiningState> {
    const state = readLocalState();
    const receipt = state.receipts.find(item => item.id === id);
    if (!receipt) throw new Error('Receipt not found.');
    receipt.status = status;
    if (qualityStatus) receipt.qualityStatus = qualityStatus;
    return writeLocalState(state);
  },

  async calculateSettlement(contractId: string): Promise<ContractorMiningState> {
    const state = readLocalState();
    const contract = state.contracts.find(item => item.id === contractId);
    if (!contract) throw new Error('Contract not found.');
    const assignment = state.assignments.find(item => item.contractId === contractId);
    if (assignment?.status === 'SUSPENDED') throw new Error('Settlement is blocked while the assignment is suspended.');
    const eligibleReceipts = state.receipts.filter(item => item.contractorId === contract.contractorId && item.status === 'RECEIVED' && item.qualityStatus === 'PASS');
    const receivedQuantityMt = Number(eligibleReceipts.reduce((sum, item) => sum + item.netWeightMt, 0).toFixed(2));
    const companyShareMt = Number((receivedQuantityMt * contract.companySharePct / 100).toFixed(2));
    const contractorShareMt = Number((receivedQuantityMt * contract.contractorSharePct / 100).toFixed(2));
    const deductionsMt = Number((contractorShareMt * contract.deductionsPct / 100).toFixed(2));
    const payableAmount = Math.round((contractorShareMt - deductionsMt) * contract.ratePerMt);
    const existing = state.settlements.find(item => item.contractId === contractId && item.status !== 'CLOSED');
    if (existing) {
      existing.receivedQuantityMt = receivedQuantityMt;
      existing.companyShareMt = companyShareMt;
      existing.contractorShareMt = contractorShareMt;
      existing.deductionsMt = deductionsMt;
      existing.payableAmount = payableAmount;
      existing.qualityStatus = eligibleReceipts.length > 0 ? 'PASS' : 'PENDING';
      existing.status = 'CALCULATED';
    } else {
      state.settlements.unshift({
        id: `settlement-${Date.now()}`,
        settlementNo: createReferenceId('SET', state.settlements.length),
        referenceId: assignment?.referenceId || createReferenceId('REF', state.settlements.length),
        contractId,
        period: new Date().toISOString().slice(0, 10),
        receivedQuantityMt,
        companyShareMt,
        contractorShareMt,
        deductionsMt,
        payableAmount,
        status: 'CALCULATED',
        qualityStatus: eligibleReceipts.length > 0 ? 'PASS' : 'PENDING',
      });
    }
    return writeLocalState(state);
  },

  async updateSettlementStatus(id: string, status: SettlementStatus): Promise<ContractorMiningState> {
    const state = readLocalState();
    const settlement = state.settlements.find(item => item.id === id);
    if (!settlement) throw new Error('Settlement not found.');
    if (status === 'APPROVED' || status === 'SETTLED') {
      const assignment = state.assignments.find(item => item.referenceId === settlement.referenceId);
      if (assignment?.status === 'SUSPENDED') throw new Error('Settlement cannot be approved while the assignment is suspended.');
      if (settlement.qualityStatus !== 'PASS') throw new Error('Settlement requires QA-approved material.');
    }
    settlement.status = status;
    return writeLocalState(state);
  },
};
