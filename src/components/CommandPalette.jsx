import React, { useState, useMemo, useEffect, useRef } from 'react';

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]); // サジェスト候補
  const [suggestIndex, setSuggestIndex] = useState(-1); // サジェスト選択中
  const inputRef = useRef(null);

  // fetch blog-contents.json
  useEffect(() => {
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
  }, []);

  // クエリ解析
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const tagTokens = tokens.filter(t => t.startsWith('#')).map(t => t.slice(1).toLowerCase());
  const userTokens = tokens.filter(t => t.startsWith('>')).map(t => t.slice(1).toLowerCase());
  const keywordTokens = tokens.filter(t => !t.startsWith('#') && !t.startsWith('>') && t !== '?').map(t => t.toLowerCase());
  const isHelp = tokens.length === 1 && tokens[0] === '?';

  // タグ・ユーザー一覧
  const allTags = useMemo(() => {
    const tags = new Set();
    posts.forEach(post => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [posts]);
  const allUsers = useMemo(() => {
    const users = new Set();
    posts.forEach(post => {
      if (post.author) users.add(post.author);
    });
    return Array.from(users);
  }, [posts]);

  // サジェストロジック
  useEffect(() => {
    // 入力中のトークンを特定
    const match = query.match(/(?:^|\s)([#>][^\s]*)$/);
    if (!match) {
      setSuggestions([]);
      setSuggestIndex(-1);
      return;
    }
    const partial = match[1];
    if (partial.startsWith('#')) {
      const q = partial.slice(1).toLowerCase();
      const filtered = allTags.filter(tag => tag.toLowerCase().includes(q) && !tagTokens.includes(tag.toLowerCase()));
      setSuggestions(filtered.map(tag => ({ type: 'tag', value: tag })));
      setSuggestIndex(filtered.length > 0 ? 0 : -1);
    } else if (partial.startsWith('>')) {
      const q = partial.slice(1).toLowerCase();
      const filtered = allUsers.filter(user => user.toLowerCase().includes(q) && !userTokens.includes(user.toLowerCase()));
      setSuggestions(filtered.map(user => ({ type: 'user', value: user })));
      setSuggestIndex(filtered.length > 0 ? 0 : -1);
    } else {
      setSuggestions([]);
      setSuggestIndex(-1);
    }
  }, [query, allTags, allUsers, tagTokens, userTokens]);

  // サジェスト選択・補完
  const handleInputKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        handleSuggestSelect(suggestions[suggestIndex >= 0 ? suggestIndex : 0]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex(i => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex(i => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        if (suggestIndex >= 0) {
          e.preventDefault();
          handleSuggestSelect(suggestions[suggestIndex]);
        }
      }
    }
  };

  const handleSuggestSelect = (item) => {
    // 入力中のトークンを置換
    const match = query.match(/(?:^|\s)([#>][^\s]*)$/);
    if (!match) return;
    const before = query.slice(0, match.index + match[0].length - match[1].length);
    const insert = item.type === 'tag' ? `#${item.value}` : `>${item.value}`;
    const after = query.slice(match.index + match[0].length);
    setQuery((before + insert + ' ' + after).replace(/\s+$/, ' '));
    setSuggestions([]);
    setSuggestIndex(-1);
    // フォーカスを戻す
    setTimeout(() => {
      inputRef.current && inputRef.current.focus();
    }, 0);
  };

  // AND検索ロジック
  const filtered = useMemo(() => {
    if (isHelp) {
      return [
        'スペース区切りで複数条件AND検索',
        '例: #foo #bar >user1 キーワード',
        '「#タグ名」でタグ検索、「>ユーザー名」でユーザー検索',
        '何も付けずにキーワードで記事タイトル・本文全文検索',
        '「?」のみでこのヘルプを表示'
      ];
    }
    return posts.filter(post => {
      // タグ条件
      if (tagTokens.length > 0) {
        const postTags = (post.tags || []).map(t => t.toLowerCase());
        if (!tagTokens.every(tag => postTags.includes(tag))) return false;
      }
      // ユーザー条件
      if (userTokens.length > 0) {
        const author = (post.author || '').toLowerCase();
        if (!userTokens.every(user => author.includes(user))) return false;
      }
      // キーワード条件
      if (keywordTokens.length > 0) {
        const haystack = [post.title, post.description, post.content].map(x => (x || '').toLowerCase()).join(' ');
        if (!keywordTokens.every(kw => haystack.includes(kw))) return false;
      }
      return true;
    });
  }, [isHelp, posts, tagTokens, userTokens, keywordTokens]);

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
      className="absolute left-1/2 top-4 sm:top-24 z-20 w-full max-w-2xl -translate-x-1/2 mx-auto px-2"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="rounded-xl sm:rounded-3xl bg-gray-900 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] border border-gray-700 p-4 sm:p-8 relative text-white">
        {/* 閉じるボタン */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-2xl font-bold"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
        {/* 検索窓 */}
        <div className="flex items-center border-b border-gray-700 pb-3 mb-2 relative">
          <svg className="w-6 h-6 text-gray-400 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="記事を検索... #タグ >ユーザー ?ヘルプ"
            className="w-full bg-transparent outline-none text-white text-lg placeholder-gray-400"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
        </div>
        {/* サジェストリスト（インライン表示） */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((item, i) => (
              <button
                key={item.type + ':' + item.value}
                className={
                  'px-3 py-1 rounded text-sm transition ' +
                  (i === suggestIndex ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')
                }
                onMouseDown={e => {
                  e.preventDefault();
                  handleSuggestSelect(item);
                }}
              >
                {item.type === 'tag' ? `#${item.value}` : `>${item.value}`}
              </button>
            ))}
          </div>
        )}
        {/* 検索結果リスト */}
        <div>
          {loading && <div className="py-8 text-center text-gray-400">読み込み中...</div>}
          {error && <div className="py-8 text-center text-red-400">{error}</div>}
          {!loading && !error && (
            <>
              {isHelp ? (
                <>
                  <div className="text-xs font-semibold text-gray-400 mb-2">ヘルプ</div>
                  <ul className="max-h-[70vh] overflow-y-auto scrollbar-hide">
                    {filtered.map((help, i) => (
                      <li key={i} className="py-2 px-3 text-gray-200">{help}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div className="text-xs font-semibold text-gray-400 mb-2">記事一覧</div>
                  <ul className="max-h-[70vh] overflow-y-auto scrollbar-hide">
                    {filtered.length === 0 && <li className="py-4 text-center text-gray-400">該当する記事がありません</li>}
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
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.tags.map(tag => (
                              <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">#{tag}</span>
                            ))}
                          </div>
                        )}
                        {post.author && (
                          <div className="text-xs text-gray-500 mt-1">by {post.author}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
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