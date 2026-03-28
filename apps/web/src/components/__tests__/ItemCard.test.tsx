import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ItemCard } from '@/components/ItemCard';

describe('ItemCard', () => {
  it('renders item content and triggers delete', () => {
    const onDelete = vi.fn(async () => {});

    render(
      React.createElement(ItemCard, {
        item: {
          id: 'item-1',
          userId: 'user-1',
          rawInput: 'Call Sam',
          cleanedText: null,
          source: 'manual',
          type: null,
          actionability: null,
          entities: {},
          clusterIds: [],
          subClusterId: null,
          resurfacingScore: 1,
          processed: false,
          reminderStatus: null,
          reminderAt: null,
          createdAt: '2026-03-28T12:00:00.000Z',
          lastSurfacedAt: null,
        },
        onDelete,
      }),
    );

    expect(screen.getByText('Call Sam')).toBeInTheDocument();
    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('item-1');
  });
});
