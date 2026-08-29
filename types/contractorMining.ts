export type ContractorStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CLOSED';
export type AssignmentStatus = 'DRAFT' | 'APPROVED' | 'ACTIVE_MINING' | 'SUSPENDED' | 'CLOSED';
export type MiningReportStatus = 'DRAFT' | 'SUBMITTED' | 'SITE_VERIFIED' | 'CLOSED';
export type ReceiptStatus = 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'HOLD';
export type QualityStatus = 'PENDING' | 'PASS' | 'HOLD' | 'FAIL';
export type SettlementStatus = 'DRAFT' | 'RECEIVED' | 'CALCULATED' | 'CONFIRMED' | 'APPROVED' | 'SETTLED' | 'CLOSED';

export interface MineBlock {
  id: string;
  code: string;
  name: string;
  location: string;
  reserveMt: number;
  active: boolean;
}

export interface MiningContractor {
  id: string;
  code: string;
  name: string;
  contact: string;
  license: string;
  capacityMtPerDay: number;
  equipmentCount: number;
  status: ContractorStatus;
}

export interface ProductionContract {
  id: string;
  contractNo: string;
  blockId: string;
  contractorId: string;
  startDate: string;
  endDate: string;
  companySharePct: number;
  contractorSharePct: number;
  ratePerMt: number;
  deductionsPct: number;
  status: ContractStatus;
}

export interface MiningAssignment {
  id: string;
  referenceId: string;
  contractorId: string;
  blockId: string;
  contractId: string;
  startDate: string;
  endDate: string;
  expectedProductionMt: number;
  status: AssignmentStatus;
  hseCompliant: boolean;
  siteAccess: string;
}

export interface DailyMiningReport {
  id: string;
  referenceId: string;
  date: string;
  shift: 'Day' | 'Night';
  assignmentId: string;
  contractorId: string;
  blockId: string;
  quantityMt: number;
  trips: number;
  equipmentHours: number;
  supervisor: string;
  status: MiningReportStatus;
  hsePassed: boolean;
  notes: string;
}

export interface HaulageReceipt {
  id: string;
  ticketNo: string;
  referenceId: string;
  date: string;
  assignmentId: string;
  contractorId: string;
  blockId: string;
  truckNo: string;
  grossWeightMt: number;
  tareWeightMt: number;
  netWeightMt: number;
  destination: string;
  status: ReceiptStatus;
  qualityStatus: QualityStatus;
  assayGrade?: number;
  receivingOfficer?: string;
}

export interface Settlement {
  id: string;
  settlementNo: string;
  referenceId: string;
  contractId: string;
  period: string;
  receivedQuantityMt: number;
  companyShareMt: number;
  contractorShareMt: number;
  deductionsMt: number;
  payableAmount: number;
  status: SettlementStatus;
  qualityStatus: QualityStatus;
}

export interface ContractorMiningState {
  blocks: MineBlock[];
  contractors: MiningContractor[];
  contracts: ProductionContract[];
  assignments: MiningAssignment[];
  dailyReports: DailyMiningReport[];
  receipts: HaulageReceipt[];
  settlements: Settlement[];
}

export interface DailyMiningReportInput {
  assignmentId: string;
  date: string;
  shift: 'Day' | 'Night';
  quantityMt: number;
  trips: number;
  equipmentHours: number;
  supervisor: string;
  notes: string;
}

export interface HaulageReceiptInput {
  assignmentId: string;
  date: string;
  truckNo: string;
  grossWeightMt: number;
  tareWeightMt: number;
  destination: string;
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  ACTIVE_MINING: 'Active Mining',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
};

export const REPORT_STATUS_LABELS: Record<MiningReportStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  SITE_VERIFIED: 'Site Verified',
  CLOSED: 'Closed',
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
  HOLD: 'Hold',
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT: 'Draft',
  RECEIVED: 'Received',
  CALCULATED: 'Calculated',
  CONFIRMED: 'Confirmed',
  APPROVED: 'Approved',
  SETTLED: 'Settled',
  CLOSED: 'Closed',
};
