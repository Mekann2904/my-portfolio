import React, { useState, useCallback, useEffect } from 'react';
import CommandPalette from './CommandPalette.jsx';

export default function BlogCommandPaletteWrapper() {
  const [showPalette, setShowPalette] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const openPalette = useCallback(() => setShowPalette(true), []);
  const closePalette = useCallback(() => setShowPalette(false), []);

  useEffect(() => {
    // まずインラインJSON（blogHead）を利用
    const headScript = document.getElementById('blogHead');
    if (headScript) {
      try {
        const headData = JSON.parse(headScript.textContent || '[]');
        setPosts(headData);
        setLoading(false);
      } catch (e) {
        // パース失敗時はfetchにフォールバック
      }
    }
    // LCP後に全件fetch
    window.addEventListener('load', () => {
      fetch('/blog-contents.json')
        .then(res => res.json())
        .then(data => {
          setPosts(data);
          setLoading(false);
        })
        .catch(e => {
          setError('記事データの取得に失敗しました');
          setLoading(false);
        });
    }, { once: true });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center ml-2 p-2 rounded-full hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="検索"
        title="検索 (Ctrl+K)"
        onClick={openPalette}
        style={{ verticalAlign: 'middle' }}
      >
        <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      {showPalette && (
        <CommandPalette posts={posts} onClose={closePalette} />
      )}
      {loading && <div className="py-8 text-center text-gray-400">読み込み中...</div>}
      {error && <div className="py-8 text-center text-red-400">{error}</div>}
    </>
  );
} 