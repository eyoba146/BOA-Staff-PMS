import type { ISODateTime, PerformancePeriod, RuleStatus } from './common';

// ---------- Feedback ----------
export interface Feedback {
  id: string;
  staffId: string;
  staffName: string;
  managerId: string;
  managerName: string;
  subject: string;
  message: string;
  period?: PerformancePeriod | null;
  periodLabel?: string | null;
  kpiId?: string | null;
  kpiName?: string | null;
  createdAt: ISODateTime;
  readAt: ISODateTime | null;
}

export interface FeedbackInput {
  staffId: string;
  subject: string;
  message: string;
  period?: PerformancePeriod | null;
  periodLabel?: string | null;
  kpiId?: string | null;
}

// ---------- Announcements ----------
/** Derived from the kickoff objective: "meetings, holidays, and other notices". */
export type AnnouncementCategory = 'meeting' | 'holiday' | 'notice' | 'general';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  status: AnnouncementStatus;
  pinned: boolean;
  authorName: string;
  createdAt: ISODateTime;
  publishedAt: ISODateTime | null;
  isRead: boolean;
}

export interface AnnouncementInput {
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  publish: boolean;
}

// ---------- Chat ----------
export interface ChatParticipant {
  id: string;
  fullName: string;
  position: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  sentAt: ISODateTime;
  editedAt?: ISODateTime | null;
  isDeleted?: boolean;
}

export interface Conversation {
  id: string;
  type: 'branch' | 'direct';
  title: string;
  participants: ChatParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: ISODateTime;
}

// ---------- Settings ----------
export interface SystemSettings {
  branchName: string;
  branchCode: string;
  thresholds: {
    /** Minimum % considered "On target". */
    onTargetMin: number;
    /** Minimum % considered "Needs attention"; below is "Below target". */
    needsAttentionMin: number;
    status: RuleStatus;
  };
  entryPolicy: {
    allowEditSubmitted: boolean;
    /** How many past days staff may record entries for. */
    backdateDays: number;
    status: RuleStatus;
  };
  weightingEnabled: boolean;
}
