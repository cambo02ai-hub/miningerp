import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoreEmployeeInventoryView from '../components/StoreEmployeeInventoryView';
import { inventoryAPI, equipmentAPI, locationsAPI } from '../services/api';

vi.mock('../services/api', () => ({
  inventoryAPI: {
    getParts: vi.fn(),
    getTransactions: vi.fn(),
    createTransaction: vi.fn(),
  },
  equipmentAPI: {
    getEquipment: vi.fn(),
  },
  locationsAPI: {
    getLocations: vi.fn(),
  },
}));

describe('StoreEmployeeInventoryView Component', () => {
  const mockParts = [
    {
      id: 'p-1',
      partNumber: 'FLT-001',
      name: 'Fuel Filter D375',
      brand: 'Komatsu',
      category: 'Consumable',
      currentStock: 2,
      minStockLevel: 5,
      unit: 'PCS',
      location: 'Rack A-01',
      averageCost: 50000,
    },
    {
      id: 'p-2',
      partNumber: 'HYD-002',
      name: 'Hydraulic Hose 1/2',
      brand: 'Cat',
      category: 'Hydraulic',
      currentStock: 20,
      minStockLevel: 5,
      unit: 'MTR',
      location: 'Rack B-04',
      averageCost: 120000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (inventoryAPI.getParts as any).mockResolvedValue(mockParts);
    (inventoryAPI.getTransactions as any).mockResolvedValue([]);
    (equipmentAPI.getEquipment as any).mockResolvedValue([]);
    (locationsAPI.getLocations as any).mockResolvedValue([
      { id: 'loc-1', name: 'Main Store Workshop', code: 'MSW' },
    ]);
  });

  it('renders store employee header and parts catalog', async () => {
    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw', role: 'OPERATOR' }} />);

    await waitFor(() => {
      expect(screen.getByText('ဂိုဒေါင် ပစ္စည်း ထုတ်ပေးခြင်း (POS Dispatch)')).toBeInTheDocument();
      expect(screen.getByText('Fuel Filter D375')).toBeInTheDocument();
      expect(screen.getByText('Hydraulic Hose 1/2')).toBeInTheDocument();
    });
  });

  it('shows low stock warning banner when currentStock <= minStockLevel', async () => {
    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw' }} />);

    await waitFor(() => {
      expect(screen.getByText(/စတော့ နည်းနေသော ပစ္စည်း/i)).toBeInTheDocument();
    });
  });

  it('adds item to issue cart when Add button is clicked', async () => {
    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw' }} />);

    await waitFor(() => {
      expect(screen.getByText('Fuel Filter D375')).toBeInTheDocument();
    });

    const addBtns = screen.getAllByText('Cart ထဲထည့်မည်');
    fireEvent.click(addBtns[0]);

    expect(screen.getByText('ထည့်ပြီး (1)')).toBeInTheDocument();
  });
});
