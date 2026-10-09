'use client';
import { useEffect } from 'react';

/** Keep local Markdown iframe embeds sized to their contents without nested vertical scrolling. */
export default function PagingArticleEmbeds() {
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'paging-height') return;
      const height = event.data.height;
      if (!Number.isFinite(height) || height < 100 || height > 10000) return;
      for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[data-paging]')) {
        if (event.source === frame.contentWindow) frame.style.height = `${Math.ceil(height)}px`;
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return null;
}
