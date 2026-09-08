import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FleetView from '../components/FleetView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../services/api', () => {
    const today = new Date().toISOString().split('T')[0];
    const mockEquipment = [
        {
            id: 'eq-1',
            code: 'EXC-01',
            type: 'Excavator',
            model: 'CAT 320D',
            status: 'Operational',
            hourMeter: 1200,
            kilometer: 0,
            location: 'Pit A',
            owner: 'JPM',
            chassisNumber: 'CH-1001',
            serialNumber: 'SN-1001',
            engineNumber: 'ENG-1001',
        },
        {
            id: 'eq-2',
            code: 'DT-01',
            type: 'Dump Truck',
            model: 'Volvo FMX',
            status: 'Breakdown',
            hourMeter: 850,
            kilometer: 15000,
            location: 'Workshop',
            owner: 'Subcontractor',
            plateNumber: 'B 1234 ABC',
        }
    ];

    const mockMaintenance = [
        {
            id: 'maint-1',
            woNumber: 'WO-2025-001',
            equipmentId: 'eq-1',
            startDate: today,
            startTime: '08:00',
            endDate: today,
            endTime: '12:00',
            durationHours: 4,
            type: 'Corrective',
            damageType: 'Hydraulic',
            priority: 'HIGH',
            status: 'CLOSED',
            description: 'Main pump seal leakage repair',
            serviceProvider: 'INTERNAL',
            technicians: ['Technician A', 'Technician B'],
            mechanicStoringCost: 50000,
            mechanicMealCost: 20000,
            driverStoringCost: 0,
            externalCost: 0
        }
    ];

    return {
        equipmentAPI: {
            getEquipment: vi.fn().mockResolvedValue(mockEquipment),
            updateEquipment: vi.fn().mockResolvedValue({ success: true }),
        },
        employeesAPI: {
            getEmployees: vi.fn().mockResolvedValue([
                { id: 'emp-1', name: 'Technician A', department: 'Maintenance', position: 'Mechanic' },
                { id: 'emp-2', name: 'Technician B', department: 'Maintenance', position: 'Mechanic' }
            ]),
        },
        suppliersAPI: {
            getSuppliers: vi.fn().mockResolvedValue([
                { id: 'sup-1', name: 'PT Heavy Parts', type: 'Parts Vendor' }
            ]),
        },
        maintenanceAPI: {
            getMaintenanceRecords: vi.fn().mockResolvedValue(mockMaintenance),
            createMaintenanceRecord: vi.fn().mockResolvedValue({ id: 'maint-2', woNumber: 'WO-2025-002' }),
            updateMaintenanceRecord: vi.fn().mockResolvedValue({ success: true }),
            deleteMaintenanceRecord: vi.fn().mockResolvedValue({ success: true }),
        },
        inventoryAPI: {
            getParts: vi.fn().mockResolvedValue([
                { id: 'part-1', name: 'Hydraulic Oil Filter', partNumber: 'HF-100', currentStock: 10, pricePerUnit: 150000 }
            ]),
            getTransactions: vi.fn().mockResolvedValue([
                { id: 'tx-1', equipmentId: 'eq-1', partId: 'part-1', type: 'USAGE', quantity: 2, pricePerUnit: 150000, date: today }
            ]),
        },
        mutationsAPI: {
            getMutations: vi.fn().mockResolvedValue([]),
        },
        dashboardAPI: {
            getFleetStats: vi.fn().mockResolvedValue({
                analytics: { totalUnits: 2, pa: 92, breakdownUnits: 1, statusDistribution: [{ name: 'Operational', value: 1 }, { name: 'Breakdown', value: 1 }] },
                predictiveMaint: [
                    { id: 'eq-1', code: 'EXC-01', model: 'CAT 320D', currentHM: 1200, nextServiceHM: 1250, urgency: 'Warning', serviceType: 'PM250', hoursRemaining: 50, color: 'bg-amber-500' }
                ]
            }),
        }
    };
});

describe('FleetView Component', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
    });

    it('renders Fleet & Plant Management title and switches between Dashboard and Asset List', async () => {
        await act(async () => {
            render(
                <QueryClientProvider client={queryClient}>
                    <FleetView />
                </QueryClientProvider>
            );
        });

        expect(screen.getByText('ယာဉ်/စက်နှင့် စက်ရုံ စီမံခန့်ခွဲမှု')).toBeInTheDocument();
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Asset List')).toBeInTheDocument();

        // Switch to Asset List
        const assetListBtn = screen.getByRole('button', { name: 'Asset List' });
        await act(async () => {
            fireEvent.click(assetListBtn);
        });

        await waitFor(() => {
            expect(screen.getByText('EXC-01')).toBeInTheDocument();
            expect(screen.getByText('DT-01')).toBeInTheDocument();
        });
    });

    it('opens Equipment Details modal and interacts with Maintenance tab', async () => {
        await act(async () => {
            render(
                <QueryClientProvider client={queryClient}>
                    <FleetView />
                </QueryClientProvider>
            );
        });

        // Switch to Asset List
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Asset List' }));
        });

        await waitFor(() => {
            expect(screen.getByText('EXC-01')).toBeInTheDocument();
        });

        // Click "View History" for EXC-01
        const viewHistoryBtns = screen.getAllByText('View History');
        await act(async () => {
            fireEvent.click(viewHistoryBtns[0]);
        });

        await waitFor(() => {
            expect(screen.getByText('EXC-01 Details')).toBeInTheDocument();
            expect(screen.getByText('WO-2025-001')).toBeInTheDocument();
        });
    });
});
