// 검색엔진용 사이트맵. 페이지가 늘면 PATHS 에 더한다.
import type { APIRoute } from 'astro';
import { localePath, type Lang } from '../site';

const PATHS = ['/', '/privacy', '/support'] as const;
const LANGS: Lang[] = ['ko', 'en'];

export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(p, site).href;
  const urls = PATHS.flatMap((path) =>
    LANGS.map((lang) => {
      const alternates = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(localePath(l, path))}"/>`,
      ).join('\n');
      return `  <url>\n    <loc>${abs(localePath(lang, path))}</loc>\n${alternates}\n  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
