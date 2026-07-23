import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DisputesDashboard from './DisputesDashboard';

describe('DisputesDashboard Component', () => {
  it('renders the dashboard title', () => {
    render(<DisputesDashboard />);
    expect(screen.getByText('Disputes Dashboard')).toBeInTheDocument();
  });
});

