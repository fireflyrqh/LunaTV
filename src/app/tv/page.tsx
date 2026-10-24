import TVLayout from '@/components/tv/TVLayout';
import TVRow from '@/components/tv/TVRow';
import { TVItem, TVSection } from '@/components/tv/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchDoubanSection(kind: 'movie' | 'tv', tag: string, type: TVItem['type']): Promise<TVItem[]> {
  try {
    const url = `https://movie.douban.com/j/search_subjects?type=${kind}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=12&page_start=0`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36',
        Referer: 'https://movie.douban.com/',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.subjects || []).map((s: { id: string; title: string; cover: string; rate: string }) => ({
      id: s.id,
      title: s.title,
      poster: s.cover,
      rate: s.rate,
      type,
    }));
  } catch (e) {
    return [];
  }
}

export default async function TVHomePage() {
  const [hotMovies, hotSeries, anime, variety] = await Promise.all([
    fetchDoubanSection('movie', '热门', 'movie'),
    fetchDoubanSection('tv', '热门', 'tv'),
    fetchDoubanSection('tv', '动画', 'tv'),
    fetchDoubanSection('tv', '综艺', 'tv'),
  ]);

  const sections: TVSection[] = [
    { title: '热门电影', subtitle: '今晚就看这些高热影片', href: '/tv/movie', items: hotMovies },
    { title: '热门剧集', subtitle: '连续播放更适合电视', href: '/tv/series', items: hotSeries },
    { title: '动漫推荐', subtitle: '新番与经典动画', href: '/tv/anime', items: anime },
    { title: '综艺推荐', subtitle: '轻松下饭大屏看', href: '/tv/variety', items: variety },
  ].filter((s) => s.items.length > 0);

  return (
    <TVLayout>
      {sections.length === 0 ? (
        <div className='rounded-[36px] border border-white/10 bg-white/[0.04] p-10 text-2xl text-slate-300'>
          暂无首页内容
        </div>
      ) : (
        sections.map((section) => (
          <TVRow key={section.title} section={section} />
        ))
      )}
    </TVLayout>
  );
}
