import type { ISODateTime, PerformancePeriod, RuleStatus } from './common';

// ---------- Feedback / Communication ----------
export type CommunicationType = 'feedback' | 'reminder' | 'warning' | 'appreciation';
export type CommunicationAudience = 'recipient_only' | 'recipient_and_manager';

export interface Feedback {
  id: string;
  staffId: string;
  staffName: string;
  employeeId?: string | null;
  position?: string | null;
  recipientEmail?: string | null;
  managerId: string;
  managerName: string;
  type?: CommunicationType;
  audience?: CommunicationAudience;
  subject: string;
  message: string;
  suggestedAction?: string | null;
  followUpDate?: string | null;
  status?: 'pending' | 'acknowledged' | 'in_progress' | 'completed';
  acknowledgedAt?: ISODateTime | null;
  staffReply?: string | null;
  staffRepliedAt?: ISODateTime | null;
  period?: PerformancePeriod | null;
  periodLabel?: string | null;
  kpiId?: string | null;
  kpiName?: string | null;
  emailStatus?: 'queued' | 'sent' | 'delivered' | 'failed';
  emailDeliveredAt?: ISODateTime | null;
  emailError?: string | null;
  batchId?: string | null;
  createdAt: ISODateTime;
  readAt: ISODateTime | null;
}

export interface FeedbackInput {
  staffId: string;
  recipientType?: 'individual' | 'all';
  type?: CommunicationType;
  audience?: CommunicationAudience;
  subject: string;
  message: string;
  suggestedAction?: string | null;
  followUpDate?: string | null;
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
  role?: 'staff' | 'manager' | 'customer_experience_manager';
  participantRole?: 'owner' | 'moderator' | 'member';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: 'staff' | 'manager' | 'customer_experience_manager';
  senderPosition?: string;
  body: string;
  sentAt: ISODateTime;
  editedAt?: ISODateTime | null;
  isDeleted?: boolean;
  isPinned?: boolean;
  pinnedAt?: ISODateTime | null;
  isModerated?: boolean;
  moderatedAt?: ISODateTime | null;
  moderationReason?: string | null;
}

export interface Conversation {
  id: string;
  type: 'branch' | 'direct' | 'group';
  title: string;
  description?: string | null;
  createdById?: string | null;
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
