import React, { useState, useMemo, useEffect } from 'react';

/**
 * posts: Array<{
 *   slug: string;
 *   title: string;
 *   date: string;
 *   description?: string;
 *   content?: string;
 * }>
 * onClose: () => void
 */
export default function CommandPalette({ posts, onClose }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return posts.filter(post => {
      return (
        post.title.toLowerCase().includes(q) ||
        (post.description && post.description.toLowerCase().includes(q)) ||
        (post.content && post.content.toLowerCase().includes(q))
      );
    });
  }, [query, posts]);

  // ESCキーで閉じる
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute left-1/2 top-24 z-20 w-full max-w-2xl min-w-[480px] -translate-x-1/2 mx-auto"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="rounded-3xl bg-gray-900 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] border border-gray-700 p-8 relative text-white">
        {/* 閉じるボタン */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-2xl font-bold"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
        {/* 検索窓 */}
        <div className="flex items-center border-b border-gray-700 pb-3 mb-6">
          <svg className="w-6 h-6 text-gray-400 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="記事を検索..."
            className="w-full bg-transparent outline-none text-white text-lg placeholder-gray-400"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {/* 検索結果リスト */}
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-2">記事一覧</div>
          <ul className="max-h-[70vh] overflow-y-auto scrollbar-hide">
            {filtered.length === 0 && (
              <li className="py-4 text-center text-gray-400">該当する記事がありません</li>
            )}
            {filtered.map(post => (
              <li key={post.slug} className="flex flex-col gap-1 py-3 px-3 rounded hover:bg-gray-800 cursor-pointer">
                <a href={`/blog/${post.slug}/`} className="text-lg font-semibold text-gray-200 hover:underline">
                  {post.title}
                </a>
                <div className="text-xs text-gray-400">
                  <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('ja-JP')}</time>
                </div>
                {post.description && (
                  <div className="text-xs text-gray-300">{post.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
        {/* フッター */}
        <div className="mt-8 flex flex-wrap gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
            <span className="font-mono text-gray-200">#</span> タグ検索
          </span>
          <span className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
            <span className="font-mono text-gray-200">&gt;</span> ユーザー検索
          </span>
          <span className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
            <span className="font-mono text-gray-200">?</span> ヘルプ
          </span>
        </div>
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </div>
  );
} 