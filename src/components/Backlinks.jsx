import { useEffect, useState } from 'react';

/**
 * Backlinks（被リンク）コンポーネント
 * @param {Object} props
 * @param {string} props.slug - 現在の記事のslug（例: 'astro-image-optimization'）
 */
export default function Backlinks({ slug }) {
  const [backlinks, setBacklinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchBacklinks() {
      setLoading(true);
      try {
        const res = await fetch('/blog-contents.json');
        const posts = await res.json();
        // 現在記事のパス候補
        const candidates = [
          `../blog/${slug}`,
          `./${slug}`,
          `/blog/${slug}`,
          `${slug}`,
        ];
        // 被リンク元を抽出
        const result = posts.filter(post => {
          if (!post.content) return false;
          // すべての [テキスト](パス) 記法のパス部分を抽出
          const matches = Array.from(post.content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g));
          return matches.some(m => {
            // パス末尾の/や拡張子を無視して比較
            const linkPath = m[1].replace(/\.(md|mdx)$/, '').replace(/\/$/, '');
            return candidates.some(c => linkPath.endsWith(c));
          });
        });
        if (!ignore) setBacklinks(result);
      } catch (e) {
        if (!ignore) setBacklinks([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchBacklinks();
    return () => { ignore = true; };
  }, [slug]);

  if (loading) return null;
  if (!backlinks.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 mb-4">Backlinks</h2>
      <ul className="space-y-2">
        {backlinks.map(post => (
          <li key={post.slug}>
            <a
              href={`/blog/${post.slug}/`}
              className="text-blue-400 hover:underline break-all"
            >
              {post.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
} 