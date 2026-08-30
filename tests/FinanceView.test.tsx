import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import FinanceView from '../components/FinanceView';

vi.mock('../services/api', () => ({
    financeAPI: {
        getSalesInvoices: vi.fn().mockResolvedValue([
            {
                id: 'inv-1',
                invoiceNumber: 'INV-2025-001',
                customerName: 'Energy Corp',
                issueDate: '2025-05-01',
                totalTonnage: 5000,
                pricePerTon: 80,
                totalAmount: 400000,
                status: 'UNPAID'
            }
        ]),
        getCostPerTon: vi.fn().mockResolvedValue({
            costPerTon: 15.5,
            costPerBcm: 2.3,
            totalProductionTons: 45000,
            totalCost: 697500,
            fuelCost: 200000,
            maintenanceCost: 150000,
            contractorCost: 240000,
            royaltyCost: 107500
        }),
        getEquipmentDepreciation: vi.fn().mockResolvedValue([]),
        getRoyalties: vi.fn().mockResolvedValue([]),
        getBudgetVariance: vi.fn().mockResolvedValue([]),
        getCashFlowForecast: vi.fn().mockResolvedValue([]),
        getFinancialReport: vi.fn().mockResolvedValue({
            totalRevenue: 2000000,
            costOfGoodsSold: 1000000,
            grossProfit: 1000000,
            operatingExpenses: 400000,
            netProfit: 600000
        })
    }
}));

describe('FinanceView Component', () => {
    it('renders Finance & ERP header and default AR tab', async () => {
        render(<FinanceView />);
        expect(await screen.findByText(/Mining Finance & ERP/i)).toBeInTheDocument();
        expect(await screen.findByText('INV-2025-001')).toBeInTheDocument();
        expect(await screen.findByText('Energy Corp')).toBeInTheDocument();
    });

    it('switches between CPT tab and Sales Invoice tabs', async () => {
        render(<FinanceView />);
        const cptTabBtn = await screen.findByText(/2. Cost-Per-Ton/i);
        fireEvent.click(cptTabBtn);

        expect(await screen.findByText(/Cost Breakdown per Activity/i)).toBeInTheDocument();
    });
});
