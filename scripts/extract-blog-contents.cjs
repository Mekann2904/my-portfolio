const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const blogDir = path.join(__dirname, '../src/pages/blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

// テキストからMarkdown、JSX、その他の構文を削除してプレーンテキストにする
function cleanContent(text) {
  if (!text) return '';
  let cleaned = text
    // 1. MDX/JSXのimport文を削除
    .replace(/^import\s+.*?\s+from\s+['"].*['"];?/gm, '')
    // 2. JSXタグを削除 (例: <YouTube ... />, <Image ... />)
    .replace(/<\/?[A-Z][^>]*>/g, '')
    // 3. カスタム構文 `子::[...]` をリンクテキストに置換
    .replace(/子::\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 4. Markdownリンクをテキストに置換 (例: [text](url) -> text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 5. Markdown画像やその他のタグを削除
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // 6. Markdownの見出し、引用、リストマーカーを削除
    .replace(/^[#>\-*]\s*/gm, '')
    // 7. 水平線を削除
    .replace(/^---\s*$/gm, '')
    // 8. コードブロックを削除
    .replace(/```[\s\S]*?```/g, '')
    // 9. インラインコードを削除
    .replace(/`[^`]+`/g, '')
    // 10. 余分な改行を1つにまとめる
    .replace(/\n{2,}/g, '\n')

  return cleaned.trim();
}

const posts = files.map(filename => {
  const filePath = path.join(blogDir, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    slug: filename.replace(/\.(md|mdx)$/, ''),
    ...data,
    // オリジナルのcontentは保持しつつ、検索用にcleanedContentを追加
    // → CommandPalette.jsx の修正も必要になるため、一旦contentを上書きする
    content: cleanContent(content),
  };
});

const outPath = path.join(__dirname, '../src/data/blog-contents.json');
fs.writeFileSync(outPath, JSON.stringify(posts, null, 2));
console.log('Extracted blog contents to', outPath); 