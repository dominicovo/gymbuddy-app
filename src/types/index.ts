import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export const ALL_DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface Schedule {
  days: DayOfWeek[];
  windowStart: string; // "HH:mm", 24h
  windowEnd: string; // "HH:mm", 24h
}

export type LockState = 'inactive' | 'locked' | 'unlocked';
