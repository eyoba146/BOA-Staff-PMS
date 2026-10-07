import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavCountKey } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import { announcementService } from '@/services/announcement.service';
import { chatService } from '@/services/chat.service';
import { feedbackService } from '@/services/feedback.service';
import { staffService } from '@/services/staff.service';

export type NavCounts = Partial<Record<NavCountKey, number>>;

/**
 * Badge counters for navigation. Refreshes on route change.
 * FUTURE: replace with a single `GET /me/summary` endpoint (or socket push) to reduce requests.
 */
export function useNavCounts(): NavCounts {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [counts, setCounts] = useState<NavCounts>({});

  useEffect(() => {
    if (!user) return;
    let active = true;
    const sumUnread = () => chatService.listConversations().then((c) => c.reduce((s, x) => s + x.unreadCount, 0));

    const load =
      user.role === 'manager'
        ? Promise.all([staffService.listPending(), sumUnread()]).then(([pending, chat]) => ({
            pendingApprovals: pending.length,
            unreadChat: chat,
          }))
        : Promise.all([feedbackService.listMine(), announcementService.list(), sumUnread()]).then(([fb, ann, chat]) => ({
            unreadFeedback: fb.filter((f) => !f.readAt).length,
            unreadAnnouncements: ann.filter((a) => !a.isRead).length,
            unreadChat: chat,
          }));

    load.then((c) => active && setCounts(c)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, pathname]);

  return counts;
}
