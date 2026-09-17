import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserQRCodeModal from '../components/UserQRCodeModal';
import LoginPage from '../components/LoginPage';
import { ManagedUser } from '../services/rbac';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock qrcode library
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn((canvas, text, options, callback) => {
      if (callback) callback(null);
    }),
  },
}));

// Mock jsQR library
vi.mock('jsqr', () => ({
  default: vi.fn(() => ({ data: 'testuser123' })),
}));

describe('UserQRCodeModal Component', () => {
  const mockUser: ManagedUser = {
    id: 'user-1',
    fullName: 'မောင်မောင်',
    username: 'maungmaung',
    email: 'maung@example.com',
    employeeId: 'EMP-001',
    department: 'သတ္တုထုတ်လုပ်ရေး',
    site: 'Satui Mine',
    role: 'OPERATOR',
    status: 'ACTIVE',
    permissionOverrides: [],
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user details and ID Badge header correctly', () => {
    render(<UserQRCodeModal user={mockUser} onClose={mockOnClose} />);

    expect(screen.getByText('ဝန်ထမ်း ID Badge & QR Code')).toBeInTheDocument();
    expect(screen.getByText('မောင်မောင်')).toBeInTheDocument();
    expect(screen.getByText(/@maungmaung/)).toBeInTheDocument();
    expect(screen.getByText(/EMP-001/)).toBeInTheDocument();
    expect(screen.getByText('သတ္တုထုတ်လုပ်ရေး')).toBeInTheDocument();
    expect(screen.getByText('Satui Mine')).toBeInTheDocument();
  });

  it('triggers window.print when Badge Print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<UserQRCodeModal user={mockUser} onClose={mockOnClose} />);

    const printButton = screen.getByText('Badge Print ထုတ်ရန်');
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('calls onClose when close button is clicked', () => {
    render(<UserQRCodeModal user={mockUser} onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button', { name: 'ပိတ်ရန်' });
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe('LoginPage QR Badge Scan functionality', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches to QR Badge Scan tab and accepts hardware QR input', () => {
    render(<LoginPage onLoginSuccess={mockOnLoginSuccess} />);

    const qrTabBtn = screen.getByRole('button', { name: /QR Badge Scan/i });
    fireEvent.click(qrTabBtn);

    expect(screen.getByText('QR Code ID Badge ပုံရိပ် တင်သွင်းရန်')).toBeInTheDocument();

    const hardwareInput = screen.getByPlaceholderText('QR code text သို့မဟုတ် barcode...');
    fireEvent.change(hardwareInput, { target: { value: 'scanned_user_55' } });

    const submitBtn = screen.getByRole('button', { name: 'Username ဖြည့်သွင်းမည်' });
    fireEvent.click(submitBtn);

    expect(screen.getByDisplayValue('scanned_user_55')).toBeInTheDocument();
    expect(screen.getByText(/Scanned Username\/ID: scanned_user_55/i)).toBeInTheDocument();
  });
});
