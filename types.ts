

// Domain Types for Mining ERP

export enum ModuleType {
  PRODUCTION = 'PRODUCTION',
  MAINTENANCE = 'MAINTENANCE',
  LOGISTICS = 'LOGISTICS',
  HSE = 'HSE',
  INVENTORY = 'INVENTORY',
  SYSTEM = 'SYSTEM',
  ASSET_MUTATION = 'ASSET_MUTATION',
  EMPLOYEE = 'EMPLOYEE',
  SUPPLIER = 'SUPPLIER',
  LOCATION = 'LOCATION',
  TIMESHEET = 'TIMESHEET',
  FINANCE = 'FINANCE'
}

export enum ActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE'
}

// Specific Transaction Types for Inventory
export enum InventoryTxType {
  PURCHASE = 'PURCHASE',             // Pembelian (In)
  USAGE = 'USAGE',                   // Pemakaian (Out to Asset)
  CANNIBAL_HARVEST = 'CANNIBAL_HARVEST', // Canibalisasi (In from Asset)
  RETURN_VENDOR = 'RETURN_VENDOR',   // Retur (Out to Vendor)
  RESTOCK_UNUSED = 'RESTOCK_UNUSED',  // Tidak jadi pakai (In from Site)
  TRANSFER_OUT = 'TRANSFER_OUT'      // Shipment to other site
}

export enum MutationType {
  ACQUISITION = 'ACQUISITION', // New Purchase / Rental In
  TRANSFER = 'TRANSFER',       // Relocation
  DISPOSAL = 'DISPOSAL'        // Sale / Scrap / Return Rental
}

export interface ProjectLocation {
  id: string;
  code: string; // e.g. KJS, JKT, PORT
  name: string; // e.g. Site Satui, Jakarta HO
  type: 'Mine Site' | 'Head Office' | 'Port' | 'Workshop' | 'Camp';
  address: string;
  city: string;
}

export interface User {
  id: string;
  name: string;
  role: 'Admin' | 'Engineer' | 'Manager' | 'Operator';
}

// The core unit of the Audit Trail
export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  module: ModuleType;
  action: ActionType;
  entityId: string;
  description: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface PitLocation {
  id: string;
  locationId: string; // Linked to ProjectLocation (Mine Site)
  name: string;
  block: string;
  strippingRatioTarget: number;
}

export interface ProductionRecord {
  id: string;
  date: string;
  pitId: string;
  shift: 'Day' | 'Night';
  overburdenBcm: number; // Bank Cubic Meters
  coalMt: number; // Metric Tonnes
  strippingRatio: number; // Calculated
  status: 'Draft' | 'Approved';
}

export interface Equipment {
  id: string;
  code: string; // e.g., EX-001
  type: 'Excavator' | 'Dump Truck' | 'Dozer' | 'Grader' | 'LV' | 'Water Truck' | 'Tower Lamp' | 'Pump';
  model: string;
  manufactureYear?: number; // New Field
  status: 'Operational' | 'Standby' | 'Breakdown' | 'Maintenance' | 'Sold' | 'Scrapped';

  // Meter Reading
  hourMeter: number; // For Heavy Equipment
  kilometer?: number; // For LV / Sarana

  // Identity
  owner?: string; // e.g. JPM, Rental, Subcon
  serialNumber?: string; // Serial No
  engineNumber?: string; // Engine No
  chassisNumber?: string; // Rangka
  plateNumber?: string; // For LV, DT, WT

  locationId?: string; // Linked to ProjectLocation
  location: string; // Display Name (kept for backwards compatibility or quick display)
}

export interface DailyEquipmentLog {
  id: string;
  date: string;
  shift: 'Day' | 'Night';
  equipmentId: string;
  operatorId: string; // Linked to Employee
  locationId: string; // Linked to ProjectLocation

  startHM: number;
  endHM: number;
  totalHours: number; // Calculated

  activityCode?: string; // e.g. OB Removal, Coal Getting, General
  remarks?: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: 'Parts Vendor' | 'Service Workshop' | 'Both';
  contactPerson: string;
  phone: string;
  address: string;
  rating: number; // 1-5
}

export interface MaintenanceRecord {
  id: string;
  woNumber: string; // Generated: WO-YYYY-XXX
  equipmentId: string;

  // Service Provider Type
  serviceProvider: 'INTERNAL' | 'EXTERNAL';

  // External Details (if serviceProvider === EXTERNAL)
  supplierId?: string; // Link to Supplier
  externalInvoiceNumber?: string;
  externalCost?: number; // Total cost from vendor

  // Internal Details (if serviceProvider === INTERNAL)
  technicians: string[];
  mechanicStoringCost?: number; // Minyak Sarana / Fuel for Service Car
  mechanicMealCost?: number; // Uang Makan Mekanik
  driverStoringCost?: number; // Uang Makan Driver / Driver Allowance

  // Type & Classification
  type: 'Preventive' | 'Corrective' | 'Inspection';
  damageType: string; // e.g., 'Engine', 'Hydraulic'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_PART' | 'CANCELLED' | 'CLOSED';

  // Timing for KPI (MTTR)
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  durationHours?: number; // Calculated total downtime

  // Snapshot Data
  hmAtStart: number; // HM when WO was created

  description: string;
  notes?: string; // Extra notes
  partsReplaced?: string; // Text summary
}

export interface Stockpile {
  id: string;
  locationId: string; // Linked to ProjectLocation (Port/Site)
  name: string;
  currentVolumeMt: number;
  capacityMt: number;
  qualityKcal: number; // GAR
}

export interface SafetyIncident {
  id: string;
  date: string;
  type: 'Near Miss' | 'Property Damage' | 'Injury' | 'Environmental';
  description: string;
  status: 'Open' | 'Investigating' | 'Closed';
  locationId: string; // Linked to ProjectLocation
  location: string; // Specific spot (e.g. "Ramp 4")
}

// --- Inventory Types ---

export interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  brand: string; // Manufacturer (e.g., Komatsu, Cat, Parker)
  category: 'Engine' | 'Hydraulic' | 'Undercarriage' | 'Consumable' | 'Electrical';
  currentStock: number;
  minStockLevel: number; // Reorder point
  unit: string; // PCS, LTR, SET

  locationId?: string; // Linked to ProjectLocation (Warehouse Site)
  location: string; // Specific Rack/Bin within that site

  averageCost: number;
  preferredSupplierId?: string; // Link to Supplier Master
}

export type PaymentType = 'CASH' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'UNPAID';

export interface SupplierAgingAnalysis {
  supplierId: string;
  supplierName: string;
  current0To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  totalOutstanding: number;
}

export interface InventoryTransaction {
  id: string;
  date: string;
  type: InventoryTxType;
  partId: string;
  quantity: number;
  pricePerUnit?: number; // Price at the time of Purchase (for History)
  referenceId?: string; // PO Number, Work Order ID
  equipmentId?: string; // Linked Asset (Required for Usage/Cannibalization)
  supplierId?: string; // Linked Vendor (Required for Purchase/Return)
  notes: string;
  performedBy: string;

  // Financial / Debt Tracking
  paymentType?: PaymentType; // Cash or Hutang
  paymentStatus?: PaymentStatus;
  dueDate?: string; // Jatuh Tempo (if Credit)
  paidDate?: string; // Tanggal Lunas
}

export interface ShipmentItem {
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unit: string;
  notes: string;
  unitCode?: string;
}

export type GoodsShipmentStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export const GOODS_SHIPMENT_STATUSES: readonly GoodsShipmentStatus[] = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
export function isGoodsShipmentStatus(v: unknown): v is GoodsShipmentStatus {
	return GOODS_SHIPMENT_STATUSES.includes(v as GoodsShipmentStatus);
}

export interface GoodsShipment {
  id: string;
  doNumber: string; // Generated DO-PART-YYYY-XXX
  date: string;

  sourceLocationId: string;
  sourceLocationName: string;

  targetType: 'LOCATION' | 'VENDOR' | 'OTHER';
  targetId?: string; // LocationID or SupplierID or Custom Name
  targetName: string;
  transportProvider?: string;
  targetAddress?: string;

  driverName?: string;
  transportUnit?: string;
  policeNumber: string;
  notes?: string;

  items: [ShipmentItem, ...ShipmentItem[]];
  // Lifecycle: PENDING → IN_TRANSIT → DELIVERED; any → CANCELLED
  status: GoodsShipmentStatus;
  createdBy: string;
}

export interface UnitMutation {
  id: string;
  type: MutationType;
  equipmentId: string;
  equipmentCode: string; // Snapshot in case of deletion

  // Logistics
  departureDate: string;
  arrivalDate?: string; // Can be null if In Transit
  mutationHM: number; // HM at the time of movement

  sourceLocationId: string; // Linked to ProjectLocation
  sourceLocation: string; // Display Name

  targetLocationId: string; // Linked to ProjectLocation
  targetLocation: string; // Display Name

  referenceDocument: string; // DO Number, PO Number, Sale Deed
  value?: number; // Purchase Price or Sale Price
  notes: string;
  performedBy: string;

  // Logistics Details for Surat Jalan (DO)
  driverName?: string;
  transportUnit?: string; // e.g. Trailer, Lowboy, Self-Drive
  transportPolNumber?: string;

  senderCompany?: string; // Organization sending (Header)
  senderName?: string; // Person sending (Footer Contact)

  recipientCompany?: string; // Organization receiving (Header)
  recipientName?: string; // Person receiving (Footer Contact)
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: 'Production' | 'Maintenance' | 'HSE' | 'Logistics' | 'Office';
  role: 'Operator' | 'Mechanic' | 'Staff' | 'Manager';
  status: 'Active' | 'OnLeave' | 'Resigned';
  joinedDate: string;
  locationId?: string; // Linked to ProjectLocation (Where they are assigned)
}

// --- Gold Mining Finance Types ---

export interface GoldSaleRecord {
  id: string;
  date: string;
  batchId: string; // e.g., GOLD-BATCH-2025-001
  goldWeightKyat: number; // Myanmar Gold weight in Kyat (1 Kyat = 16.6 gram)
  goldWeightGrams: number; // Weight in Grams
  purityPct: number; // Gold Purity (e.g., 99.9% 24K, 95% 22K)
  pricePerKyat: number; // Sale price per Kyat (MMK)
  pricePerGram: number; // Sale price per Gram
  totalRevenueMMK: number; // Total revenue in MMK
  buyerName: string; // Refinery / Buyer name
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  paidAmountMMK: number;
  invoiceRef: string;
  notes?: string;
}

export interface RoyaltyFeeRecord {
  id: string;
  period: string; // e.g. "2025-05"
  goldProductionKyat: number; // Total gold produced in Kyat
  goldProductionGrams: number; // Total gold produced in Grams
  royaltyRatePct: number; // Government mining royalty rate (%)
  royaltyGoldKyat: number; // Royalty payable in physical gold (Kyat)
  cashValueEquivalentMMK: number; // Cash value equivalent (MMK)
  dueDate: string;
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
  paidDate?: string;
  treasuryReceiptRef?: string;
  notes?: string;
}

export interface GoldFinanceSummary {
  totalRevenueMMK: number;
  totalGoldSoldKyat: number;
  totalGoldSoldGrams: number;
  avgPricePerKyat: number;
  totalRoyaltyPaidMMK: number;
  totalOpExMMK: number;
  totalAPDebtMMK: number;
  netIncomeMMK: number;
  aiscPerKyatMMK: number; // All-In Sustaining Cost per Kyat
  aiscPerGramMMK: number; // All-In Sustaining Cost per Gram
}
