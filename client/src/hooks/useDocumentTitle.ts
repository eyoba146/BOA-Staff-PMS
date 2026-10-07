import { useEffect } from 'react';
import { env } from '@/config/env';

/** Sets `document.title` as "<page> · Staff Performance — Bank of Abyssinia". */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${env.appName} — Bank of Abyssinia`;
  }, [title]);
}
