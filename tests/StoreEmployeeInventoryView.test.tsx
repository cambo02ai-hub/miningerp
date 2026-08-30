import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoreEmployeeInventoryView from '../components/StoreEmployeeInventoryView';
import { inventoryAPI, equipmentAPI, suppliersAPI, chatAPI } from '../services/api';

vi.mock('../services/api', () => ({
  inventoryAPI: {
    getParts: vi.fn(),
    getTransactions: vi.fn(),
    createTransaction: vi.fn(),
  },
  equipmentAPI: {
    getEquipment: vi.fn(),
  },
  suppliersAPI: {
    getSuppliers: vi.fn(),
  },
  chatAPI: {
    sendMessage: vi.fn(),
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
    (suppliersAPI.getSuppliers as any).mockResolvedValue([]);
  });

  it('renders store employee header and parts catalog', async () => {
    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw', role: 'OPERATOR' }} />);

    await waitFor(() => {
      expect(screen.getByText('ဂိုဒေါင် နှင့် စတော့ စီမံခန့်ခွဲမှု')).toBeInTheDocument();
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

  it('opens issue item modal when issue button is clicked', async () => {
    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw' }} />);

    await waitFor(() => {
      expect(screen.getByText('Fuel Filter D375')).toBeInTheDocument();
    });

    const issueBtns = screen.getAllByText('ထုတ်ပေးမည်');
    fireEvent.click(issueBtns[0]);

    expect(screen.getByText('ပစ္စည်း ထုတ်ပေးခြင်း (Issue Item)')).toBeInTheDocument();
  });

  it('switches to Store AI Assistant tab and sends prompt', async () => {
    (chatAPI.sendMessage as any).mockResolvedValue({ reply: 'Filter stock is ready.' });

    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw' }} />);

    await waitFor(() => {
      expect(screen.getByText('Store AI Assistant')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Store AI Assistant'));

    expect(screen.getByText('Store AI Inventory Assistant')).toBeInTheDocument();

    const lowStockChip = screen.getByText('⚠️ စတော့နည်းနေသော ပစ္စည်းများ');
    fireEvent.click(lowStockChip);

    await waitFor(() => {
      expect(screen.getByText(/လက်ရှိစတော့ နည်းနေသော ပစ္စည်း/i)).toBeInTheDocument();
    });
  });

  it('opens AI Vision Invoice Scan modal when scanner button is clicked', async () => {
    render(<StoreEmployeeInventoryView currentUser={{ fullName: 'Kyaw Kyaw' }} />);

    await waitFor(() => {
      expect(screen.getByText('AI Invoice Scan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('AI Invoice Scan'));

    expect(screen.getByText('AI Vision Invoice / Receipt Scanner')).toBeInTheDocument();
    expect(screen.getByText('အင်ဗွိုက် သို့မဟုတ် စတော့အဝင် ဘာောင်ချာ ဓာတ်ပုံတင်ပါ')).toBeInTheDocument();
  });
});
