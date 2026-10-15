import type { ISODateTime } from './common';

export type CampaignStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  name: string;
  type: string;
  target: number;
  actual: number | null;
  achievement: number | null;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  description?: string | null;
  managerId: string;
  manager?: {
    fullName: string;
    branchName: string;
  };
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CampaignInput {
  name: string;
  type: string;
  target: number;
  actual?: number | null;
  startDate: string;
  endDate: string;
  status?: CampaignStatus;
  description?: string;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  summary: {
    total: number;
    inProgress: number;
    completed: number;
    planned: number;
    averageAchievement: number | null;
  };
}
