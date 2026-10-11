import { useEffect, useState, useCallback } from 'react';
import type { NavCountKey } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import { announcementService } from '@/services/announcement.service';
import { chatService } from '@/services/chat.service';
import { feedbackService } from '@/services/feedback.service';
import { staffService } from '@/services/staff.service';
import { realtimeService } from '@/services/realtime.service';

export type NavCounts = Partial<Record<NavCountKey, number>>;

let lastFetchTime = 0;
let cachedCounts: NavCounts = {};

/**
 * Programmatically invalidate cached navigation counters so they refresh immediately.
 */
export function invalidateNavCounts() {
  lastFetchTime = 0;
  window.dispatchEvent(new CustomEvent('pms:nav-counts-invalidate'));
}

export function useNavCounts(): NavCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NavCounts>(cachedCounts);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const fetchLatestCounts = useCallback(async () => {
    if (!user) return;
    const sumUnread = () =>
      chatService
        .listConversations()
        .then((c) => c.reduce((s, x) => s + x.unreadCount, 0))
        .catch(() => 0);

    try {
      const c =
        user.role === 'manager'
          ? await Promise.all([staffService.listPending(), sumUnread()]).then(
              ([pending, chat]) => ({
                pendingApprovals: pending.length,
                unreadChat: chat,
              }),
            )
          : await Promise.all([
              feedbackService.listMine(),
              announcementService.list(),
              sumUnread(),
            ]).then(([fb, ann, chat]) => ({
              unreadFeedback: fb.filter((f) => !f.readAt).length,
              unreadAnnouncements: ann.filter((a) => !a.isRead).length,
              unreadChat: chat,
            }));

      lastFetchTime = Date.now();
      cachedCounts = c;
      setCounts(c);
    } catch {
      // ignore transient failures
    }
  }, [user]);

  // Fetch on mount or when refreshed via real-time invalidation
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastFetchTime < 30000 && Object.keys(cachedCounts).length > 0) {
      setCounts(cachedCounts);
      return;
    }
    void fetchLatestCounts();
  }, [user, fetchLatestCounts, refreshVersion]);

  // Listen to local invalidation events and real-time push events
  useEffect(() => {
    const handleInvalidate = () => {
      lastFetchTime = 0;
      setRefreshVersion((v) => v + 1);
    };

    window.addEventListener('pms:nav-counts-invalidate', handleInvalidate);

    // Real-time SSE push subscriptions
    const unsubChat = realtimeService.on('chat_message', handleInvalidate);
    const unsubAnn = realtimeService.on('announcement_created', handleInvalidate);
    const unsubFb = realtimeService.on('feedback_created', handleInvalidate);
    const unsubNav = realtimeService.on('nav_counts_invalidated', handleInvalidate);

    return () => {
      window.removeEventListener('pms:nav-counts-invalidate', handleInvalidate);
      unsubChat();
      unsubAnn();
      unsubFb();
      unsubNav();
    };
  }, []);

  return counts;
}
