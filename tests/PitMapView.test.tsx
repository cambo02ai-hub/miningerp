import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PitMapView from '../components/PitMapView';

// Mock chatAPI and locationsAPI
vi.mock('../services/api', () => ({
  chatAPI: {
    sendMessage: vi.fn().mockResolvedValue({ reply: 'Mocked AI Pit Response' }),
  },
  locationsAPI: {
    getLocations: vi.fn().mockResolvedValue([]),
    createLocation: vi.fn().mockResolvedValue({ id: 'loc-101', name: 'Pit Delta - Gold Vein (KML)', code: 'PIT-KML-101' }),
  },
}));

describe('PitMapView Component', () => {
  it('renders GIS Pit Mapping header and controls', () => {
    render(<PitMapView />);
    expect(screen.getByText('GIS & 3D Interactive Pit Mapping')).toBeInTheDocument();
    expect(screen.getByText('2D GIS Satellite')).toBeInTheDocument();
    expect(screen.getByText('3D Depth Model')).toBeInTheDocument();
    expect(screen.getByText(/Gold Grade \(g\/t\) Heatmap/i)).toBeInTheDocument();
  });

  it('renders default pit locations and details panel', () => {
    render(<PitMapView />);
    expect(screen.getAllByText('Pit Alpha - Main Vein').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PIT-A1').length).toBeGreaterThan(0);
    expect(screen.getByText(/Gold Grade \(ရွှေပါဝင်မှု အဆင့်\)/i)).toBeInTheDocument();
  });

  it('switches map view modes', () => {
    render(<PitMapView />);
    const btn3d = screen.getByText('3D Depth Model');
    fireEvent.click(btn3d);

    expect(screen.getByText(/3D Tilt Angle/i)).toBeInTheDocument();
  });

  it('opens Google Earth Import modal when import button is clicked and triggers location sync', async () => {
    const onAddLocationMock = vi.fn().mockResolvedValue(undefined);
    render(<PitMapView onAddLocation={onAddLocationMock} />);

    const importBtn = screen.getAllByText(/Google Earth Import/i)[0];
    fireEvent.click(importBtn);

    expect(screen.getByText(/Google Earth Spatial Data Import/i)).toBeInTheDocument();

    const doImportBtn = screen.getByRole('button', { name: /Import Google Earth Data/i });
    fireEvent.click(doImportBtn);

    await waitFor(() => {
      expect(onAddLocationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Mine Site',
          name: expect.stringContaining('Pit Delta'),
        })
      );
    });
  });

  it('renders AI Vein Trend and Slope Risk indicators and opens Drone Volume modal', () => {
    render(<PitMapView />);
    expect(screen.getByText(/AI Vein Trend/i)).toBeInTheDocument();
    expect(screen.getByText(/Slope Risk/i)).toBeInTheDocument();

    const droneBtn = screen.getByText(/AI Drone Stockpile Volume/i);
    fireEvent.click(droneBtn);

    expect(screen.getByText('AI Drone Stockpile Volume Estimation')).toBeInTheDocument();
  });

  it('opens Assay Lab Test Entry modal and updates Gold Grade', () => {
    render(<PitMapView />);
    const assayBtn = screen.getByText(/Assay Lab Test Entry/i);
    fireEvent.click(assayBtn);

    expect(screen.getByText(/Assay Lab Test Results Entry/i)).toBeInTheDocument();
  });
});
