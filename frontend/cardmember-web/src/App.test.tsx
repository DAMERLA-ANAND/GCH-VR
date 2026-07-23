import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Cardmember Web App Component', () => {
  it('renders the Cardmember Web navigation bar', () => {
    render(<App />);
    expect(screen.getByText('DisputeHub')).toBeInTheDocument();
  });

  it('renders the transaction history view by default', () => {
    render(<App />);
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });
});

