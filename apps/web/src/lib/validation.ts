import { Actionability, ItemType } from '@bin/shared';
import { z } from 'zod';

const itemTypeValues = Object.values(ItemType) as [ItemType, ...ItemType[]];
const actionabilityValues = Object.values(Actionability) as [
  Actionability,
  ...Actionability[],
];

export const createItemSchema = z
  .object({
    raw_input: z.string().trim().min(1).max(10_000).optional(),
    text: z.string().trim().min(1).max(10_000).optional(),
  })
  .transform((value) => ({
    rawInput: (value.raw_input ?? value.text ?? '').trim(),
  }))
  .refine((value) => value.rawInput.length > 0, {
    message: 'Text is required',
    path: ['raw_input'],
  });

export const listItemsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  type: z.enum(itemTypeValues).optional(),
  actionability: z.enum(actionabilityValues).optional(),
});

export const updateItemSchema = z
  .object({
    cleaned_text: z.string().trim().max(10_000).nullable().optional(),
    type: z.enum(itemTypeValues).nullable().optional(),
    actionability: z.enum(actionabilityValues).nullable().optional(),
    reminder_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateProfileSchema = z
  .object({
    timezone: z.string().trim().min(1).max(100).optional(),
    auto_create_reminders: z.boolean().optional(),
    auto_create_events: z.boolean().optional(),
    push_token: z.string().trim().max(512).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
