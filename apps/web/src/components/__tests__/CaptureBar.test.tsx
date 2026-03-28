import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CaptureBar } from '@/components/CaptureBar';

describe('CaptureBar', () => {
  it('renders and submits via button', async () => {
    const onCapture = vi.fn(async () => {});
    const user = userEvent.setup();

    render(React.createElement(CaptureBar, { onCapture }));

    const textarea = screen.getByPlaceholderText('Throw something into Bin...');
    await user.type(textarea, 'Buy milk');
    await user.click(screen.getByRole('button', { name: 'Capture' }));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith('Buy milk');
    });

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('submits via cmd/ctrl enter', async () => {
    const onCapture = vi.fn(async () => {});

    render(React.createElement(CaptureBar, { onCapture }));

    const textarea = screen.getByPlaceholderText('Throw something into Bin...');
    fireEvent.change(textarea, { target: { value: 'Send invoice' } });
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
    });

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith('Send invoice');
    });
  });
});
