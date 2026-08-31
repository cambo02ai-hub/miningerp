import { fetchJson } from '../lib/http'
import { setAuthData, clearAuthData } from './authStorage'
export { getCurrentUser } from './authStorage'

import { transformSparePart, transformSparePartToAPI, transformInventoryTransaction, transformInventoryTransactionToAPI, transformEquipment, transformEquipmentToAPI, transformDashboardStats, transformGoodsShipment, transformShipmentToAPI } from './apiTransformers'
import { GoldSaleRecord, RoyaltyFeeRecord, GoldFinanceSummary } from '../types'

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return fetchJson<T>(endpoint, options)
}


// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authAPI = {
    async login(username: string, password: string) {
        const data = await apiRequest<any>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
        const user = {
            ...(data.user || {}),
            username: data.username || data.user?.username,
            fullName: data.fullName || data.full_name || data.user?.fullName || data.user?.full_name,
            email: data.email || data.user?.email,
            role: data.role || data.user?.role,
            status: data.status || data.user?.status || 'ACTIVE',
            permissions: data.permissions || data.user?.permissions,
            permissionOverrides: data.permissionOverrides || data.user?.permissionOverrides,
        };
        setAuthData(data.token, user);
        return { token: data.token, user };
    },

    async logout() {
        await apiRequest('/auth/logout', { method: 'POST' });
        clearAuthData();
    },

    async getMe() {
        return apiRequest<any>('/auth/me');
    },

    async register(userData: any) {
        return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) })
    },
};

// ============================================================================
// INVENTORY API
// ============================================================================

export const inventoryAPI = {
    // Spare Parts
    async getParts(filters?: { category?: string; low_stock?: boolean }) {
        const params = new URLSearchParams();
        if (filters?.category) params.append('category', filters.category);
        if (filters?.low_stock) params.append('low_stock', 'true');

        const query = params.toString()
        const data = await apiRequest<any[]>(`/inventory/parts${query ? `?${query}` : ''}`)
        return data.map(transformSparePart)
    },

    async getPart(id: string) {
        const data = await apiRequest<any>(`/inventory/parts/${id}`)
        return transformSparePart(data)
    },

    async createPart(partData: any) {
        const apiData = transformSparePartToAPI(partData)
        const result = await apiRequest(`/inventory/parts`, { method: 'POST', body: JSON.stringify(apiData) })
        return transformSparePart(result)
    },

    async updatePart(id: string, partData: any) {
        const apiData = transformSparePartToAPI(partData)
        const result = await apiRequest(`/inventory/parts/${id}`, { method: 'PUT', body: JSON.stringify(apiData) })
        return transformSparePart(result)
    },

    async deletePart(id: string) {
        return apiRequest(`/inventory/parts/${id}`, { method: 'DELETE' })
    },

    // Transactions
    async getTransactions(filters?: {
        type?: string;
        part_id?: string;
        supplier_id?: string;
        from_date?: string;
        to_date?: string;
    }) {
        const params = new URLSearchParams()
        if (filters?.type) params.append('type', filters.type);
        if (filters?.part_id) params.append('part_id', filters.part_id);
        if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
        if (filters?.from_date) params.append('from_date', filters.from_date);
        if (filters?.to_date) params.append('to_date', filters.to_date);

        const query = params.toString()
        const data = await apiRequest<any[]>(`/inventory/transactions${query ? `?${query}` : ''}`)
        return data.map(transformInventoryTransaction)
    },

    async createTransaction(txData: any) {
        const apiData = transformInventoryTransactionToAPI(txData)
        const result = await apiRequest(`/inventory/transactions`, { method: 'POST', body: JSON.stringify(apiData) })
        return transformInventoryTransaction(result)
    },

    async updateTransaction(id: string, updates: {
        paymentStatus?: string;
        paymentDate?: string;
        paymentMethod?: string;
        notes?: string;
    }) {
        return apiRequest<any>(`/inventory/transactions/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    },
    async getStockLevels() {
        return apiRequest<any[]>('/inventory/stock-levels')
    },

    async getAnalytics() {
        return apiRequest<any>('/inventory/analytics')
    },
};

// ============================================================================
// EQUIPMENT API
// ============================================================================

export const equipmentAPI = {
    async getEquipment(filters?: { status?: string; type?: string; location_id?: string }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.location_id) params.append('location_id', filters.location_id);

        const query = params.toString();
        return apiRequest<any[]>(`/equipment${query ? `?${query}` : ''}`);
    },

    async getEquipmentById(id: string): Promise<any> {
        return apiRequest<any>(`/equipment/${id}`);
    },

    async createEquipment(data: {
        code: string;
        model: string;
        type: string;
        manufactureYear?: number;
        status?: string;
        hourMeter?: number;
        kilometer?: number;
        locationId?: string;
        owner?: string;
        chassisNumber?: string;
        plateNumber?: string;
        serialNumber?: string;
        engineNumber?: string;
    }): Promise<any> {
        return apiRequest<any>('/equipment', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateEquipment(id: string, equipData: any) {
        const apiData = transformEquipmentToAPI(equipData);
        const result = await apiRequest(`/equipment/${id}`, {
            method: 'PUT',
            body: JSON.stringify(apiData)
        });
        return transformEquipment(result);
    },

    async updateEquipmentLocation(id: string, locationId: string): Promise<any> {
        return apiRequest<any>(`/equipment/${id}/location`, {
            method: 'PUT',
            body: JSON.stringify({ locationId })
        });
    },

    async updateEquipmentStatus(id: string, status: string): Promise<any> {
        return apiRequest<any>(`/equipment/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async updateEquipmentHourMeter(id: string, hourMeter: number): Promise<any> {
        return apiRequest<any>(`/equipment/${id}/hourmeter`, {
            method: 'PUT',
            body: JSON.stringify({ hourMeter })
        });
    },

    async deleteEquipment(id: string) {
        return apiRequest(`/equipment/${id}`, {
            method: 'DELETE'
        });
    },
};

// ============================================================================
// SUPPLIERS API
// ============================================================================

export const suppliersAPI = {
    async getSuppliers(activeOnly?: boolean) {
        const params = activeOnly ? '?active_only=true' : '';
        return apiRequest<any[]>(`/suppliers${params}`);
    },

    async getSupplier(id: string) {
        return apiRequest<any>(`/suppliers/${id}`);
    },

    async createSupplier(supplierData: any) {
        return apiRequest(`/suppliers`, {
            method: 'POST',
            body: JSON.stringify(supplierData),
        });
    },

    async updateSupplier(id: string, supplierData: any) {
        return apiRequest(`/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(supplierData),
        });
    },

    async deleteSupplier(id: string) {
        return apiRequest(`/suppliers/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================================================
// EMPLOYEES API
// ============================================================================

export const employeesAPI = {
    async getEmployees(filters?: { department?: string; status?: string }) {
        const params = new URLSearchParams();
        if (filters?.department) params.append('department', filters.department);
        if (filters?.status) params.append('status', filters.status);

        const query = params.toString();
        return apiRequest<any[]>(`/employees${query ? `?${query}` : ''}`);
    },

    async getEmployee(id: string) {
        return apiRequest<any>(`/employees/${id}`);
    },

    async createEmployee(empData: any) {
        return apiRequest(`/employees`, {
            method: 'POST',
            body: JSON.stringify(empData),
        });
    },

    async updateEmployee(id: string, empData: any) {
        return apiRequest(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(empData),
        });
    },

    async deleteEmployee(id: string) {
        return apiRequest(`/employees/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================================================
// LOCATIONS API
// ============================================================================

export const locationsAPI = {
    async getLocations() {
        return apiRequest<any[]>('/locations');
    },

    async getLocation(id: string) {
        return apiRequest<any>(`/locations/${id}`);
    },

    async createLocation(locData: any) {
        return apiRequest('/locations', {
            method: 'POST',
            body: JSON.stringify(locData),
        });
    },

    async updateLocation(id: string, locData: any) {
        return apiRequest(`/locations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(locData),
        });
    },

    async deleteLocation(id: string) {
        return apiRequest(`/locations/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================================================
// SHIPMENTS API (Goods Shipments / Delivery Orders / Surat Jalan)
// ============================================================================

export const shipmentsAPI = {
    async getShipments(filters?: { status?: string; from_date?: string; to_date?: string }) {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.from_date) params.append('from_date', filters.from_date);
        if (filters?.to_date) params.append('to_date', filters.to_date);

        const query = params.toString();
        const data = await apiRequest<any[]>(`/shipments${query ? `?${query}` : ''}`);
        return (data || []).map(transformGoodsShipment);
    },

    async getShipment(id: string) {
        const data = await apiRequest<any>(`/shipments/${id}`);
        return transformGoodsShipment(data);
    },

    async createShipment(shipmentData: any) {
        const apiData = transformShipmentToAPI(shipmentData);
        return apiRequest(`/shipments`, {
            method: 'POST',
            body: JSON.stringify(apiData),
        });
    },

    async deleteShipment(id: string) {
        return apiRequest(`/shipments/${id}`, {
            method: 'DELETE',
        });
    },

    async updateShipmentStatus(id: string, status: string) {
        return apiRequest(`/shipments/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },
};

// =============================================================================
// Production API
// =============================================================================
export const productionAPI = {
    async getRecords(filters?: {
        date?: string;
        pitId?: string;
        shift?: string;
    }) {
        const params = new URLSearchParams();
        if (filters?.date) params.append('date', filters.date);
        if (filters?.pitId) params.append('pitId', filters.pitId);
        if (filters?.shift) params.append('shift', filters.shift);
        return apiRequest<any[]>(`/production/records?${params.toString()}`);
    },

    async createRecord(data: {
        date: string;
        shift: 'Day' | 'Night';
        pitId: string;
        overburdenBcm: number;
        coalMt: number;
    }) {
        return apiRequest<any>('/production/records', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async getPits() {
        return apiRequest<any[]>('/production/pits');
    },

    async getStockpiles() {
        return apiRequest<any[]>('/production/stockpiles');
    }
};

// =============================================================================
// HSE API
// =============================================================================
export const hseAPI = {
    async getIncidents(filters?: {
        status?: string;
        type?: string;
    }) {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);
        return apiRequest<any[]>(`/hse/incidents?${params.toString()}`);
    },

    async reportIncident(data: {
        date: string;
        type: string;
        locationId: string;
        locationDetail?: string;
        description: string;
        status?: string;
    }) {
        return apiRequest<any>('/hse/incidents', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// =============================================================================
// Dashboard API
// =============================================================================
export const dashboardAPI = {
    async getStats() {
        const data = await apiRequest<any>('/dashboard/stats');
        return transformDashboardStats(data);
    },

    async getFleetStats() {
        return apiRequest<any>('/dashboard/fleet');
    }
};

// =============================================================================
// Audit API
// =============================================================================
export const auditAPI = {
    async getLogs(filters?: {
        module?: string;
        action?: string;
        userId?: string;
        entityId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }) {
        const params = new URLSearchParams();
        if (filters?.module) params.append('module', filters.module);
        if (filters?.action) params.append('action', filters.action);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.entityId) params.append('entityId', filters.entityId);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.limit) params.append('limit', filters.limit.toString());

        return apiRequest<any[]>('/audit?' + params.toString());
    },

    async getEntityTrail(entityId: string, module?: string) {
        const params = new URLSearchParams();
        if (module) params.append('module', module);
        return apiRequest<any[]>(`/audit/entity/${entityId}?` + params.toString());
    },

    async getStats() {
        return apiRequest<any>('/audit/stats');
    }
};

// =============================================================================
// Chat API (AI Assistant Bridge)
// =============================================================================
export const chatAPI = {
    async sendMessage(message: string, context?: any) {
        return apiRequest<any>('/chat', {
            method: 'POST',
            body: JSON.stringify({ message, context }),
        });
    },
};

// =============================================================================
// Gold Mining Finance API
// =============================================================================

const INITIAL_GOLD_SALES: GoldSaleRecord[] = [
    {
        id: 'gs-001',
        date: '2025-05-10',
        batchId: 'GOLD-BATCH-2025-001',
        goldWeightKyat: 10.5,
        goldWeightGrams: 174.3,
        purityPct: 99.9,
        pricePerKyat: 4500000,
        pricePerGram: 271084,
        totalRevenueMMK: 47250000,
        buyerName: 'Myanmar Gold Refinery Co., Ltd.',
        paymentStatus: 'PAID',
        paidAmountMMK: 47250000,
        invoiceRef: 'INV-GOLD-2025-001',
        notes: '24K High Purity Gold Bar'
    },
    {
        id: 'gs-002',
        date: '2025-05-18',
        batchId: 'GOLD-BATCH-2025-002',
        goldWeightKyat: 8.0,
        goldWeightGrams: 132.8,
        purityPct: 95.0,
        pricePerKyat: 4400000,
        pricePerGram: 265060,
        totalRevenueMMK: 35200000,
        buyerName: 'Golden Shwe Diamond & Gold Trading',
        paymentStatus: 'PENDING',
        paidAmountMMK: 0,
        invoiceRef: 'INV-GOLD-2025-002',
        notes: '22K Shwe Dory Bar'
    }
];

const INITIAL_ROYALTIES: RoyaltyFeeRecord[] = [
    {
        id: 'rf-001',
        period: '2025-04',
        goldProductionKyat: 25.0,
        goldProductionGrams: 415.0,
        royaltyRatePct: 5.0,
        royaltyGoldKyat: 1.25,
        cashValueEquivalentMMK: 5625000,
        dueDate: '2025-05-15',
        status: 'PAID',
        paidDate: '2025-05-14',
        treasuryReceiptRef: 'TR-MINING-2025-0491',
        notes: 'Paid via Ministry of Mines Account'
    },
    {
        id: 'rf-002',
        period: '2025-05',
        goldProductionKyat: 32.0,
        goldProductionGrams: 531.2,
        royaltyRatePct: 5.0,
        royaltyGoldKyat: 1.6,
        cashValueEquivalentMMK: 7200000,
        dueDate: '2025-06-15',
        status: 'UNPAID',
        notes: 'Pending end of month settlement'
    }
];

export const goldFinanceAPI = {
    async getGoldSales(): Promise<GoldSaleRecord[]> {
        try {
            return await apiRequest<GoldSaleRecord[]>('/finance/gold-sales');
        } catch {
            const stored = localStorage.getItem('jpmonitor_gold_sales');
            if (stored) return JSON.parse(stored);
            localStorage.setItem('jpmonitor_gold_sales', JSON.stringify(INITIAL_GOLD_SALES));
            return INITIAL_GOLD_SALES;
        }
    },

    async createGoldSale(saleData: Omit<GoldSaleRecord, 'id'>): Promise<GoldSaleRecord> {
        try {
            return await apiRequest<GoldSaleRecord>('/finance/gold-sales', {
                method: 'POST',
                body: JSON.stringify(saleData)
            });
        } catch {
            const newRecord: GoldSaleRecord = {
                ...saleData,
                id: `gs-${Date.now()}`
            };
            const current = await this.getGoldSales();
            const updated = [newRecord, ...current];
            localStorage.setItem('jpmonitor_gold_sales', JSON.stringify(updated));
            return newRecord;
        }
    },

    async getRoyaltyFees(): Promise<RoyaltyFeeRecord[]> {
        try {
            return await apiRequest<RoyaltyFeeRecord[]>('/finance/royalties');
        } catch {
            const stored = localStorage.getItem('jpmonitor_royalty_fees');
            if (stored) return JSON.parse(stored);
            localStorage.setItem('jpmonitor_royalty_fees', JSON.stringify(INITIAL_ROYALTIES));
            return INITIAL_ROYALTIES;
        }
    },

    async updateRoyaltyStatus(id: string, updates: { status: 'PAID' | 'UNPAID' | 'OVERDUE'; paidDate?: string; treasuryReceiptRef?: string }): Promise<RoyaltyFeeRecord> {
        try {
            return await apiRequest<RoyaltyFeeRecord>(`/finance/royalties/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        } catch {
            const current = await this.getRoyaltyFees();
            let updatedRecord: RoyaltyFeeRecord | null = null;
            const updated = current.map(item => {
                if (item.id === id) {
                    updatedRecord = { ...item, ...updates };
                    return updatedRecord;
                }
                return item;
            });
            localStorage.setItem('jpmonitor_royalty_fees', JSON.stringify(updated));
            if (!updatedRecord) throw new Error('Royalty record not found');
            return updatedRecord;
        }
    }
};

// Export all APIs
export default {
    auth: authAPI,
    inventory: inventoryAPI,
    equipment: equipmentAPI,
    suppliers: suppliersAPI,
    employees: employeesAPI,
    shipments: shipmentsAPI,
    production: productionAPI,
    hse: hseAPI,
    dashboard: dashboardAPI,
    audit: auditAPI,
    chat: chatAPI,
    goldFinance: goldFinanceAPI,
};

// =============================================================================
// Daily Logs API (Timesheets)
// =============================================================================
export const dailyLogsAPI = {
    async getDailyLogs(filters?: {
        equipmentId?: string;
        startDate?: string;
        endDate?: string;
        locationId?: string;
    }) {
        const params = new URLSearchParams();
        if (filters?.equipmentId) params.append('equipmentId', filters.equipmentId);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.locationId) params.append('locationId', filters.locationId);

        return apiRequest<any[]>(`/dailylogs?${params.toString()}`);
    },

    async createDailyLog(data: {
        date: string;
        equipmentId: string;
        operatorName?: string;
        locationId?: string;
        pitId?: string;
        startHM: number;
        endHM: number;
        shift?: string;
        activity?: string;
        notes?: string;
    }) {
        return apiRequest<any>('/dailylogs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async deleteDailyLog(id: string) {
        return apiRequest<any>(`/dailylogs/${id}`, {
            method: 'DELETE'
        });
    }
};

// =============================================================================
// Maintenance Records API (Work Orders)
// =============================================================================
export const maintenanceAPI = {
    async getMaintenanceRecords(filters?: {
        equipmentId?: string;
        status?: string;
        type?: string;
        supplierId?: string;
    }) {
        const params = new URLSearchParams();
        if (filters?.equipmentId) params.append('equipmentId', filters.equipmentId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.supplierId) params.append('supplierId', filters.supplierId);

        return apiRequest<any[]>(`/maintenance?${params.toString()}`);
    },

    async getMaintenanceRecord(id: string) {
        return apiRequest<any>(`/maintenance/${id}`);
    },

    async createMaintenanceRecord(data: {
        equipmentId: string;
        startDate: string;
        startTime?: string;
        endDate?: string;
        endTime?: string;
        hmAtStart?: number;
        type: string;
        damageType?: string;
        priority: string;
        status: string;
        description?: string;
        serviceProvider: 'INTERNAL' | 'EXTERNAL';
        technicians?: string[];
        supplierId?: string;
        mechanicStoringCost?: number;
        mechanicMealCost?: number;
        driverStoringCost?: number;
        externalInvoiceNumber?: string;
        externalCost?: number;
        partsReplaced?: string;
        notes?: string;
    }) {
        return apiRequest<any>('/maintenance', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateMaintenanceRecord(id: string, updates: {
        endDate?: string;
        endTime?: string;
        status?: string;
        description?: string;
        notes?: string;
        mechanicStoringCost?: number;
        mechanicMealCost?: number;
        driverStoringCost?: number;
        externalInvoiceNumber?: string;
        externalCost?: number;
        partsReplaced?: string;
    }) {
        return apiRequest<any>(`/maintenance/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async deleteMaintenanceRecord(id: string) {
        return apiRequest<any>(`/maintenance/${id}`, {
            method: 'DELETE'
        });
    }
};

// =============================================================================
// Unit Mutations API (Asset Movements)
// =============================================================================
export const mutationsAPI = {
    async getMutations(filters?: {
        equipmentId?: string;
        type?: string;
    }) {
        const params = new URLSearchParams();
        if (filters?.equipmentId) params.append('equipmentId', filters.equipmentId);
        if (filters?.type) params.append('type', filters.type);

        return apiRequest<any[]>(`/mutations?${params.toString()}`);
    },

    async createMutation(data: {
        type: 'ACQUISITION' | 'TRANSFER' | 'DISPOSAL';
        equipmentId?: string;
        equipmentCode: string;
        sourceLocationId?: string;
        sourceLocation?: string;
        targetLocationId?: string;
        targetLocation?: string;
        departureDate: string;
        arrivalDate?: string;
        mutationHM?: number;
        referenceDocument?: string;
        value?: number;
        notes?: string;
        driverName?: string;
        transportUnit?: string;
        transportPolNumber?: string;
        senderCompany?: string;
        senderName?: string;
        recipientCompany?: string;
        recipientName?: string;
        performedBy?: string;
        newUnitDetails?: {
            code: string;
            model: string;
            type: string;
            hourMeter: number;
            newManufactureYear: number;
            newKilometer: number;
            newOwner: string;
            newChassisNumber: string;
            newPlateNumber: string;
            newSerialNumber: string;
            newEngineNumber: string;
        };
    }) {
        return apiRequest<any>('/mutations', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateMutation(id: string, updates: { arrivalDate?: string; status?: string }) {
        return apiRequest<any>(`/mutations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }
};
