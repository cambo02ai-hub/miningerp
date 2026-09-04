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
  it('renders GIS Gold Vein Mapping header and controls', () => {
    render(<PitMapView />);
    expect(screen.getByText('Gold Veins & Mineral Deposits Prediction Map')).toBeInTheDocument();
    expect(screen.getByText('2D GIS Satellite')).toBeInTheDocument();
    expect(screen.getByText('3D Geological Subsurface')).toBeInTheDocument();
    expect(screen.getByText('2D Gold Potential Heatmap')).toBeInTheDocument();
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
