import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DebtView from '../components/DebtView';
import { suppliersAPI, inventoryAPI } from '../services/api';

vi.mock('../services/api', () => ({
  suppliersAPI: {
    getSuppliers: vi.fn(),
  },
  inventoryAPI: {
    getTransactions: vi.fn(),
    updateTransaction: vi.fn(),
  },
  goldFinanceAPI: {
    getGoldSales: vi.fn().mockResolvedValue([]),
    createGoldSale: vi.fn(),
    getRoyaltyFees: vi.fn().mockResolvedValue([]),
    updateRoyaltyStatus: vi.fn(),
  },
}));

describe('Inventory Valuation & AP Aging Analysis Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (suppliersAPI.getSuppliers as any).mockResolvedValue([
      { id: 'sup-1', name: 'PT Utama Spareparts' },
    ]);
  });

  it('renders Supplier AP Aging Analysis breakdown buckets (0-30, 31-60, 61-90, 90+ days)', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    (inventoryAPI.getTransactions as any).mockResolvedValue([
      {
        id: 'tx-1',
        type: 'PURCHASE',
        paymentType: 'CREDIT',
        paymentStatus: 'UNPAID',
        quantity: 10,
        pricePerUnit: 10000,
        supplierId: 'sup-1',
        dueDate: todayStr,
        referenceId: 'PO-1001',
      },
    ]);

    render(<DebtView />);

    await waitFor(() => {
      expect(screen.getByText('Supplier Accounts Payable (AP) Aging Analysis')).toBeInTheDocument();
      expect(screen.getByText(/0 - 30 ရက်/i)).toBeInTheDocument();
      expect(screen.getByText(/90\+ ရက်/i)).toBeInTheDocument();
    });
  });
});
