import { render, screen } from '@testing-library/react';
import DisputesDashboard from './DisputesDashboard';
import React from 'react';

describe('DisputesDashboard Component', () => {
  it('renders the dashboard title', () => {
    render(<DisputesDashboard />);
    expect(screen.getByText('Disputes Dashboard')).toBeInTheDocument();
  });

  it('displays Pending Evidence category', () => {
    render(<DisputesDashboard />);
    expect(screen.getByText('Pending Evidence')).toBeInTheDocument();
  });
});
