import { render, screen } from '@testing-library/react';
import AdminRules from './AdminRules';
import React from 'react';

describe('AdminRules Component', () => {
  it('renders the Rule Authoring Console header', () => {
    render(<AdminRules />);
    expect(screen.getByText('Rule Authoring Console')).toBeInTheDocument();
  });

  it('renders the add new rule button', () => {
    render(<AdminRules />);
    expect(screen.getByText('+ Add New Rule Condition')).toBeInTheDocument();
  });
});
