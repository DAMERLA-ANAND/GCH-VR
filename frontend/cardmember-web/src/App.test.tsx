import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

describe('Cardmember Web App Component', () => {
  it('renders the Cardmember Web navigation bar', () => {
    render(<App />);
    expect(screen.getByText('Cardmember Web')).toBeInTheDocument();
  });

  it('renders the transaction history view by default', () => {
    render(<App />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
    expect(screen.getByText('Select a charge to dispute.')).toBeInTheDocument();
  });
});
