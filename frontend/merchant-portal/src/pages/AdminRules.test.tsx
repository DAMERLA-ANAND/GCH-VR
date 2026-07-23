import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminRules from './AdminRules';

describe('AdminRules Component', () => {
  it('renders the Rule Authoring Console header', () => {
    render(<AdminRules />);
    expect(screen.getByText('Visual Rule Authoring Console')).toBeInTheDocument();
  });
});

