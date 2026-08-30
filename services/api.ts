import { fetchJson } from '../lib/http'
import { setAuthData, clearAuthData } from './authStorage'
export { getCurrentUser } from './authStorage'

import { transformSparePart, transformSparePartToAPI, transformInventoryTransaction, transformInventoryTransactionToAPI, transformEquipment, transformEquipmentToAPI, transformDashboardStats, transformGoodsShipment, transformShipmentToAPI } from './apiTransformers'

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
// FINANCE EXTENSIONS API
// ============================================================================

export const financeAPI = {
    async getSalesInvoices() {
        return apiRequest<any[]>('/finance/sales-invoices');
    },
    async createSalesInvoice(data: any) {
        return apiRequest<any>('/finance/sales-invoices', { method: 'POST', body: JSON.stringify(data) });
    },
    async getCostPerTon() {
        return apiRequest<any>('/finance/cost-per-ton');
    },
    async getEquipmentDepreciation() {
        return apiRequest<any[]>('/finance/equipment-depreciation');
    },
    async getRoyalties() {
        return apiRequest<any[]>('/finance/royalties');
    },
    async createRoyalty(data: any) {
        return apiRequest<any>('/finance/royalties', { method: 'POST', body: JSON.stringify(data) });
    },
    async getBudgetVariance(year?: number) {
        const query = year ? `?year=${year}` : '';
        return apiRequest<any[]>(`/finance/budget-variance${query}`);
    },
    async getCashFlowForecast() {
        return apiRequest<any[]>('/finance/cashflow-forecast');
    },
    async getFinancialReport() {
        return apiRequest<any>('/finance/financial-report');
    }
};

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
