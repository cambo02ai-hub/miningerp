import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DebtView from '../components/DebtView';

vi.mock('../services/api', () => ({
    inventoryAPI: {
        getTransactions: vi.fn().mockResolvedValue([
            {
                id: 'tx-001',
                type: 'PURCHASE',
                paymentType: 'CREDIT',
                paymentStatus: 'UNPAID',
                quantity: 10,
                pricePerUnit: 50000,
                dueDate: '2025-05-01',
                referenceId: 'PO-TEST-101',
                supplierId: 'sup-001'
            }
        ]),
        updateTransaction: vi.fn().mockResolvedValue({ status: 'PAID' })
    },
    suppliersAPI: {
        getSuppliers: vi.fn().mockResolvedValue([
            { id: 'sup-001', name: 'Shwe Diesel Supplier' }
        ])
    },
    goldFinanceAPI: {
        getGoldSales: vi.fn().mockResolvedValue([
            {
                id: 'gs-001',
                date: '2025-05-10',
                batchId: 'GOLD-BATCH-2025-001',
                goldWeightKyat: 10.0,
                goldWeightGrams: 166.0,
                purityPct: 99.9,
                pricePerKyat: 4500000,
                pricePerGram: 271084,
                totalRevenueMMK: 45000000,
                buyerName: 'Myanmar Gold Refinery',
                paymentStatus: 'PAID',
                paidAmountMMK: 45000000,
                invoiceRef: 'INV-GOLD-2025-001'
            }
        ]),
        createGoldSale: vi.fn().mockImplementation((saleData: any) => Promise.resolve({ ...saleData, id: 'gs-new' })),
        getRoyaltyFees: vi.fn().mockResolvedValue([
            {
                id: 'rf-001',
                period: '2025-04',
                goldProductionKyat: 20.0,
                goldProductionGrams: 332.0,
                royaltyRatePct: 5.0,
                royaltyGoldKyat: 1.0,
                cashValueEquivalentMMK: 4500000,
                dueDate: '2025-05-15',
                status: 'UNPAID'
            }
        ]),
        updateRoyaltyStatus: vi.fn().mockResolvedValue({ id: 'rf-001', status: 'PAID' })
    }
}));

describe('Gold Mining Finance Workspace (DebtView Component)', () => {
    it('renders Gold Mining Financial Workspace title and tab navigation', async () => {
        render(<DebtView />);

        await waitFor(() => {
            expect(screen.getByText(/ရွှေတူးဖော်ရေး ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု/i)).toBeInTheDocument();
        });
        expect(screen.getByText(/ပေးရန်ရှိ အကြွေးများ \(AP\)/i)).toBeInTheDocument();
        expect(screen.getByText(/ရွှေရောင်းရငွေ \(Gold Sales\)/i)).toBeInTheDocument();
        expect(screen.getByText(/တော်ဝင်ကြေး \(Royalties\)/i)).toBeInTheDocument();
        expect(screen.getByText(/AISC & အနှစ်ချုပ်/i)).toBeInTheDocument();
    });

    it('displays AP Aging breakdown buckets and outstanding invoices', async () => {
        render(<DebtView />);

        await waitFor(() => {
            expect(screen.getByText('Supplier Accounts Payable (AP) Aging Analysis')).toBeInTheDocument();
        });
        expect(screen.getAllByText('Shwe Diesel Supplier').length).toBeGreaterThan(0);
        expect(screen.getByText('PO-TEST-101')).toBeInTheDocument();
    });

    it('switches to Gold Sales tab and displays sales records and summary', async () => {
        render(<DebtView />);

        await waitFor(() => {
            expect(screen.getByText(/ရွှေတူးဖော်ရေး ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု/i)).toBeInTheDocument();
        });

        const goldSalesTab = screen.getByText(/ရွှေရောင်းရငွေ \(Gold Sales\)/i);
        fireEvent.click(goldSalesTab);

        expect(screen.getByText(/ရွှေရောင်းရငွေ မှတ်တမ်းများ \(Gold Bar Sales\)/i)).toBeInTheDocument();
        expect(screen.getByText('Myanmar Gold Refinery')).toBeInTheDocument();
        expect(screen.getByText('GOLD-BATCH-2025-001')).toBeInTheDocument();
    });

    it('opens New Gold Sale Modal and submits sale record', async () => {
        render(<DebtView />);

        await waitFor(() => {
            expect(screen.getByText(/ရွှေတူးဖော်ရေး ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု/i)).toBeInTheDocument();
        });

        const goldSalesTab = screen.getByText(/ရွှေရောင်းရငွေ \(Gold Sales\)/i);
        fireEvent.click(goldSalesTab);

        const addSaleBtn = screen.getByText(/ရွှေရောင်းရငွေ အသစ်ထည့်မည်/i);
        fireEvent.click(addSaleBtn);

        expect(screen.getByText(/ရွှေရောင်းရငွေ စာရင်း ထည့်သွင်းရန်/i)).toBeInTheDocument();

        const submitBtn = screen.getByRole('button', { name: /Save Gold Sale/i });
        fireEvent.click(submitBtn);
    });

    it('switches to Royalties tab and renders Government Mining Royalty details', async () => {
        render(<DebtView />);

        await waitFor(() => {
            expect(screen.getByText(/ရွှေတူးဖော်ရေး ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု/i)).toBeInTheDocument();
        });

        const royaltiesTab = screen.getByText(/တော်ဝင်ကြေး \(Royalties\)/i);
        fireEvent.click(royaltiesTab);

        expect(screen.getByText(/ရွှေတူးဖော်ရေး တော်ဝင်ကြေး အခွန် \(Government Royalties\)/i)).toBeInTheDocument();
        expect(screen.getByText('2025-04')).toBeInTheDocument();
        expect(screen.getByText('Confirm Payment')).toBeInTheDocument();
    });

    it('switches to Overview tab and displays AISC unit cost metrics', async () => {
        render(<DebtView />);

        await waitFor(() => {
            expect(screen.getByText(/ရွှေတူးဖော်ရေး ဘဏ္ဍာရေး စီမံခန့်ခွဲမှု/i)).toBeInTheDocument();
        });

        const overviewTab = screen.getByText(/AISC & အနှစ်ချုပ်/i);
        fireEvent.click(overviewTab);

        expect(screen.getByText(/All-In Sustaining Cost \(AISC\) ရွှေ ၁ ကျပ် တူးဖော်မှု ကုန်ကျစရိတ်/i)).toBeInTheDocument();
        expect(screen.getByText(/AISC \/ ရွှေ ၁ ကျပ် ကုန်ကျစရိတ်/i)).toBeInTheDocument();
        expect(screen.getByText(/Financial P&L Statement Summary/i)).toBeInTheDocument();
    });
});
