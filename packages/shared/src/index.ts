export enum ItemType {
  Task = 'task',
  Reminder = 'reminder',
  Idea = 'idea',
  Person = 'person',
  Event = 'event',
  Reference = 'reference',
  Note = 'note',
}

export enum Actionability {
  Now = 'now',
  Soon = 'soon',
  Eventually = 'eventually',
  Never = 'never',
}

export enum ReminderStatus {
  Pending = 'pending',
  Sent = 'sent',
  Dismissed = 'dismissed',
  Snoozed = 'snoozed',
}

export enum QuestionStatus {
  Pending = 'pending',
  Answered = 'answered',
  Dismissed = 'dismissed',
}

export interface EntityMap {
  people?: string[];
  dates?: string[];
  times?: string[];
  places?: string[];
  urls?: string[];
  companies?: string[];
}

export interface Item {
  id: string;
  userId: string;
  rawInput: string;
  cleanedText?: string | null;
  source: string;
  type?: ItemType | null;
  actionability?: Actionability | null;
  entities: EntityMap;
  clusterIds: string[];
  subClusterId?: string | null;
  resurfacingScore: number;
  processed: boolean;
  reminderStatus?: ReminderStatus | null;
  reminderAt?: string | null;
  createdAt: string;
  lastSurfacedAt?: string | null;
}

export interface Cluster {
  id: string;
  userId: string;
  label: string;
  typeScope?: ItemType | null;
  memberCount: number;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface Question {
  id: string;
  itemId: string;
  question: string;
  confidenceScore: number;
  status: QuestionStatus;
  answer?: string | null;
  createdAt: string;
  answeredAt?: string | null;
}

export interface UserMemory {
  id: string;
  userId: string;
  statement: string;
  confidenceScore: number;
  source: 'onboarding' | 'inferred';
  createdAt: string;
  lastReinforcedAt: string;
}

export interface UserCorrection {
  id: string;
  userId: string;
  itemId: string;
  originalClassification: Record<string, unknown>;
  correctedClassification: Record<string, unknown>;
  createdAt: string;
}

export const API_BASE_URL = {
  local: 'http://localhost:3000',
  production: 'https://bin.app',
} as const;
