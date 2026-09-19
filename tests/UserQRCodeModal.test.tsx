import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserQRCodeModal from '../components/UserQRCodeModal';
import LoginPage from '../components/LoginPage';
import { ManagedUser } from '../services/rbac';
import { processEmployeePhotoWithGemini } from '../services/aiPhotoEditor';

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
  default: vi.fn(() => ({
    data: JSON.stringify({
      fullName: 'ဦးအေးမောင်',
      username: 'ayemaung',
      phone: '0912345678',
      nrc: '၁၂/ဥက္တ(နိုင်)၉၉၉၉၉၉',
      position: 'မိုင်းမန်နေဂျာ',
      address: 'ရန်ကုန်မြို့',
    }),
  })),
}));

describe('UserQRCodeModal Component with Extra Profile Fields', () => {
  const mockUser: ManagedUser = {
    id: 'user-1',
    fullName: 'မောင်မောင်',
    username: 'maungmaung',
    email: 'maung@example.com',
    employeeId: 'EMP-001',
    department: 'သတ္တုထုတ်လုပ်ရေး',
    site: 'Satui Mine',
    phone: '09987654321',
    nrc: '၁၂/လမန(နိုင်)၁၂၃၄၅၆',
    address: 'မန္တလေးမြို့',
    position: 'အင်ဂျင်နီယာ',
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

  it('renders extended profile details (Phone, NRC, Address, Position) on ID Card', () => {
    render(<UserQRCodeModal user={mockUser} onClose={mockOnClose} />);

    expect(screen.getByText('ဝန်ထမ်း ID Card & QR Code')).toBeInTheDocument();
    expect(screen.getByText('မောင်မောင်')).toBeInTheDocument();
    expect(screen.getByText(/@maungmaung/)).toBeInTheDocument();
    expect(screen.getByText('09987654321')).toBeInTheDocument();
    expect(screen.getByText('၁၂/လမန(နိုင်)၁၂၃၄၅၆')).toBeInTheDocument();
    expect(screen.getByText('မန္တလေးမြို့')).toBeInTheDocument();
  });

  it('triggers window.print when ID Card Print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<UserQRCodeModal user={mockUser} onClose={mockOnClose} />);

    const printButton = screen.getByText('ID Card Print ထုတ်ရန်');
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});

describe('Gemini AI Photo Editor Service', () => {
  it('returns fallback photoUrl when VITE_COMET_API_KEY is not configured', async () => {
    const rawPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await processEmployeePhotoWithGemini(rawPhoto);

    expect(result.editedPhotoUrl).toBe(rawPhoto);
    expect(result.processedByAi).toBe(false);
  });
});

describe('LoginPage JSON QR Badge Scan functionality', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses JSON QR payload and displays full employee profile fields', () => {
    render(<LoginPage onLoginSuccess={mockOnLoginSuccess} />);

    const qrTabBtn = screen.getByRole('button', { name: /QR Badge Scan/i });
    fireEvent.click(qrTabBtn);

    const jsonText = JSON.stringify({
      fullName: 'ဦးအေးမောင်',
      username: 'ayemaung',
      phone: '0912345678',
      nrc: '၁၂/ဥက္တ(နိုင်)၉၉၉၉၉၉',
      position: 'မိုင်းမန်နေဂျာ',
      address: 'ရန်ကုန်မြို့',
    });

    const hardwareInput = screen.getByPlaceholderText('QR code text သို့မဟုတ် JSON...');
    fireEvent.change(hardwareInput, { target: { value: jsonText } });

    const submitBtn = screen.getByRole('button', { name: 'Username ဖြည့်သွင်းမည်' });
    fireEvent.click(submitBtn);

    expect(screen.getAllByText(/ဦးအေးမောင်/)[0]).toBeInTheDocument();
    expect(screen.getByText(/0912345678/)).toBeInTheDocument();

    const viewDetailsBtn = screen.getByRole('button', { name: /Profile အသေးစိတ်ကြည့်မည်/i });
    fireEvent.click(viewDetailsBtn);

    expect(screen.getByText('ဝန်ထမ်း အချက်အလက် Profile')).toBeInTheDocument();
    expect(screen.getAllByText('မိုင်းမန်နေဂျာ').length).toBeGreaterThan(0);
  });

  it('opens and closes Live WebCam Scanner modal', () => {
    render(<LoginPage onLoginSuccess={mockOnLoginSuccess} />);

    const qrTabBtn = screen.getByRole('button', { name: /QR Badge Scan/i });
    fireEvent.click(qrTabBtn);

    const webcamBtn = screen.getByRole('button', { name: /WebCam \/ Camera ဖြင့် တိုက်ရိုက် Scan ဖတ်မည်/i });
    fireEvent.click(webcamBtn);

    expect(screen.getByText('WebCam QR Scanner')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'ပိတ်မည်' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('WebCam QR Scanner')).not.toBeInTheDocument();
  });
});
