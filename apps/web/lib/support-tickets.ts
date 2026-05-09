import type { TicketCategory, TicketStatus, TicketPriority, TicketChannel, SupportTeam } from '@prisma/client';

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  WRONG_ITEM: 'Wrong item delivered',
  MISSING_ITEM: 'Item missing from order',
  QUALITY: 'Quality issue (cold, spoiled, damaged)',
  LATE_DELIVERY: 'Late delivery',
  RIDER_BEHAVIOUR: 'Rider behaviour',
  PAYMENT: 'Payment / billing issue',
  REFUND: 'Refund request',
  ACCOUNT: 'Account / address issue',
  OTHER: 'Something else',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In review',
  AWAITING_CUSTOMER: 'Awaiting your reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const TICKET_CATEGORIES: TicketCategory[] = [
  'WRONG_ITEM', 'MISSING_ITEM', 'QUALITY', 'LATE_DELIVERY',
  'RIDER_BEHAVIOUR', 'PAYMENT', 'REFUND', 'ACCOUNT', 'OTHER',
];

export function isTicketCategory(v: unknown): v is TicketCategory {
  return typeof v === 'string' && (TICKET_CATEGORIES as string[]).includes(v);
}

const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
export function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === 'string' && (TICKET_STATUSES as string[]).includes(v);
}

const TICKET_PRIORITIES: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
export function isTicketPriority(v: unknown): v is TicketPriority {
  return typeof v === 'string' && (TICKET_PRIORITIES as string[]).includes(v);
}

export const TICKET_CHANNEL_LABEL: Record<TicketChannel, string> = {
  IN_APP:   'In-app',
  EMAIL:    'Email',
  WHATSAPP: 'WhatsApp',
  PHONE:    'Phone',
  SOCIAL:   'Social',
};

const TICKET_CHANNELS: TicketChannel[] = ['IN_APP', 'EMAIL', 'WHATSAPP', 'PHONE', 'SOCIAL'];
export function isTicketChannel(v: unknown): v is TicketChannel {
  return typeof v === 'string' && (TICKET_CHANNELS as string[]).includes(v);
}

export const SUPPORT_TEAM_LABEL: Record<SupportTeam, string> = {
  GENERAL:     'General',
  BILLING:     'Billing',
  RIDER_OPS:   'Rider ops',
  VENDOR_OPS:  'Vendor ops',
  ESCALATIONS: 'Escalations',
};

const SUPPORT_TEAMS: SupportTeam[] = ['GENERAL', 'BILLING', 'RIDER_OPS', 'VENDOR_OPS', 'ESCALATIONS'];
export function isSupportTeam(v: unknown): v is SupportTeam {
  return typeof v === 'string' && (SUPPORT_TEAMS as string[]).includes(v);
}
