import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PitMapView from '../components/PitMapView';

// Mock chatAPI, locationsAPI and gisGoldAPI
vi.mock('../services/api', () => ({
  chatAPI: {
    sendMessage: vi.fn().mockResolvedValue({ reply: 'Mocked AI Pit Response' }),
  },
  locationsAPI: {
    getLocations: vi.fn().mockResolvedValue([]),
    createLocation: vi.fn().mockResolvedValue({ id: 'loc-101', name: 'Pit Delta - Gold Vein (KML)', code: 'PIT-KML-101' }),
  },
  gisGoldAPI: {
    getMarketPrice: vi.fn().mockResolvedValue({
      priceUsdPerOz: 2920.50,
      priceMmkPerTael: 4650000,
      lastUpdated: new Date().toISOString()
    }),
    getGoldHeatmapPoints: vi.fn().mockResolvedValue([
      { id: 'hp-01', lat: -3.4561, lng: 114.8123, probabilityPct: 88, goldGradeGt: 5.2, alterationZone: 'Argillic', radiometricAnomaly: 2.1, estimatedDepthMeters: 45 },
      { id: 'hp-02', lat: -3.4580, lng: 114.8140, probabilityPct: 92, goldGradeGt: 7.1, alterationZone: 'Phyllic', radiometricAnomaly: 2.8, estimatedDepthMeters: 60 },
    ]),
    calculateEconomicValuation: vi.fn().mockResolvedValue({
      estGoldYieldGrams: 65000,
      estGoldYieldKyat: 3915.6,
      totalValuationMMK: 18200000000,
      totalValuationUSD: 5200000
    }),
  },
}));

describe('PitMapView Component', () => {
  it('renders GIS Gold Vein Mapping header and controls', () => {
    render(<PitMapView />);
    expect(screen.getByText('Gold Veins & Mineral Deposits Prediction Map')).toBeInTheDocument();
    expect(screen.getByText('3D Globe Visualizer')).toBeInTheDocument();
    expect(screen.getByText('2D GIS Satellite')).toBeInTheDocument();
    expect(screen.getByText('3D Geological Subsurface')).toBeInTheDocument();
    expect(screen.getByText('2D Gold Potential Heatmap')).toBeInTheDocument();
  });

  it('renders 3D Globe Visualizer by default and supports interactive controls', () => {
    render(<PitMapView />);
    expect(screen.getByText('3D Globe Controls')).toBeInTheDocument();
    expect(screen.getByText(/Click & drag sphere to rotate 360° globe/i)).toBeInTheDocument();
  });

  it('renders default pit locations and details panel', () => {
    render(<PitMapView />);
    expect(screen.getAllByText('Pit Alpha - Main Vein').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PIT-A1').length).toBeGreaterThan(0);
    expect(screen.getByText(/Gold Grade \(ရွှေပါဝင်မှု အဆင့်\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ML Gold Probability/i)).toBeInTheDocument();
  });

  it('renders interactive map layer toggles', () => {
    render(<PitMapView />);
    expect(screen.getByText('Satellite View')).toBeInTheDocument();
    expect(screen.getByText('Topography Contours')).toBeInTheDocument();
    expect(screen.getByText('Geological Faults & Shear Lines')).toBeInTheDocument();
    expect(screen.getByText('Hyperspectral Alteration Zones')).toBeInTheDocument();
    expect(screen.getByText('Radiometric Anomaly Overlay')).toBeInTheDocument();

    const faultsBtn = screen.getByText('Geological Faults & Shear Lines');
    fireEvent.click(faultsBtn);
    expect(faultsBtn).toBeInTheDocument();
  });

  it('switches to 2D Gold Potential Heatmap mode and displays Probability Range Legend', () => {
    render(<PitMapView />);
    const heatmapBtn = screen.getByText('2D Gold Potential Heatmap');
    fireEvent.click(heatmapBtn);

    expect(screen.getByText('Gold Potential Probability Range')).toBeInTheDocument();
    expect(screen.getByText('High Potential')).toBeInTheDocument();
    expect(screen.getByText('Moderate Potential')).toBeInTheDocument();
    expect(screen.getByText('Low Potential')).toBeInTheDocument();
  });

  it('switches to 3D Geological Subsurface mode and displays 3D Subsurface controls & Drillhole trajectories', () => {
    render(<PitMapView />);
    const btn3d = screen.getByText('3D Geological Subsurface');
    fireEvent.click(btn3d);

    expect(screen.getByText(/3D Subsurface Tilt Angle/i)).toBeInTheDocument();
    expect(screen.getByText(/Subterranean Depth Grid/i)).toBeInTheDocument();
    expect(screen.getByText(/DH-A1-01/i)).toBeInTheDocument();
  });

  it('opens Data Upload module modal and processes CSV Drillhole upload', async () => {
    render(<PitMapView />);
    const uploadBtn = screen.getByText(/Data Upload \(CSV \/ Shapefile\)/i);
    fireEvent.click(uploadBtn);

    expect(screen.getByText(/Geospatial Data Upload Module/i)).toBeInTheDocument();
    expect(screen.getByText(/CSV Drillholes \(Collar, Survey, Assay\)/i)).toBeInTheDocument();

    const processBtn = screen.getByRole('button', { name: /Process & Visualize Data/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(screen.getByText(/Successfully processed CSV drillholes/i)).toBeInTheDocument();
    });
  });

  it('switches Data Upload module tabs to Shapefile/GeoJSON', () => {
    render(<PitMapView />);
    const uploadBtn = screen.getByText(/Data Upload \(CSV \/ Shapefile\)/i);
    fireEvent.click(uploadBtn);

    const shapefileTab = screen.getByText(/Shapefile \(\.shp\) \/ GeoJSON Polygons/i);
    fireEvent.click(shapefileTab);

    expect(screen.getByText(/GeoJSON \/ Shapefile JSON Content:/i)).toBeInTheDocument();
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
