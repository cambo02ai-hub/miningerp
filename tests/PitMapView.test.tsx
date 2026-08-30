import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PitMapView from '../components/PitMapView';

describe('PitMapView Component', () => {
  beforeEach(() => {
    render(<PitMapView />);
  });

  it('renders GIS Pit Mapping header and controls', () => {
    expect(screen.getByText('GIS & 3D Interactive Pit Mapping')).toBeInTheDocument();
    expect(screen.getByText('2D GIS Satellite')).toBeInTheDocument();
    expect(screen.getByText('3D Depth Model')).toBeInTheDocument();
    expect(screen.getByText(/Gold Grade \(g\/t\) Heatmap/i)).toBeInTheDocument();
  });

  it('renders default pit locations and details panel', () => {
    expect(screen.getAllByText('Pit Alpha - Main Vein').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PIT-A1').length).toBeGreaterThan(0);
    expect(screen.getByText(/Gold Grade \(ရွှေပါဝင်မှု အဆင့်\)/i)).toBeInTheDocument();
  });

  it('switches map view modes', () => {
    const btn3d = screen.getByText('3D Depth Model');
    fireEvent.click(btn3d);

    expect(screen.getByText(/3D Tilt Angle/i)).toBeInTheDocument();
  });

  it('opens Google Earth Import modal when import button is clicked', () => {
    const importBtn = screen.getByText(/Google Earth Import/i);
    fireEvent.click(importBtn);

    expect(screen.getByText(/Google Earth Spatial Data Import/i)).toBeInTheDocument();
    expect(screen.getByText(/KML \/ GeoJSON File တင်ရန်/i)).toBeInTheDocument();
  });
});
