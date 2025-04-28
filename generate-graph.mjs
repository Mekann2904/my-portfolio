// generate-graph.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) return walk(res);
      return entry.name === 'index.html' ? res : [];
    })
  );
  return Array.prototype.concat(...files);
}

async function main() {
  const dist = path.resolve('./dist');
  const htmlFiles = await walk(dist);
  const nodes = [];
  const links = [];

  /* ---------------------------- 許可リスト ---------------------------- */
  // Home ('/') へのリンクを許可するページ
  const allowHomeLinks = new Set([
    '/portfolio',
    '/blog',
    '/my-journey',
  ]);

  // Blog ('/blog') へのリンクを許可するページ ★
  const allowBlogLinks = new Set([
    '/tags',
    // 例: '/portfolio', '/about' など
  ]);
  /* ------------------------------------------------------------------- */

  for (const file of htmlFiles) {
    const rel = path.relative(dist, file);
    const pagePath = rel === 'index.html' ? '/' : '/' + path.dirname(rel);

    // ノードを追加
    nodes.push({
      id: pagePath,
      label: pagePath === '/' ? 'Home' : pagePath.slice(1),
      ext: false,
    });

    // 参照リンクを解析
    const html = await fs.readFile(file, 'utf8');
    for (const m of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const href = m[1];

      /* ---------- 1) 外部リンクは個別ノードに ---------- */
      if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
        nodes.push({ id: href, label: href, ext: true });
        links.push({ source: pagePath, target: href });
        continue;
      }

      /* ---------- 2) アセット類はスキップ ---------- */
      if (href.match(/\.(css|js|png|jpe?g|svg|ico)$/)) continue;

      /* ---------- 3) 内部リンクのみを処理 ---------- */
      if (href.startsWith('/')) {
        const tgt = href.replace(/\/$/, '') || '/'; // 末尾スラッシュ除去

        // Home ('/') へのリンクを制御
        if (tgt === '/' && !allowHomeLinks.has(pagePath)) {
          continue;
        }

        // Blog ('/blog') へのリンクを制御 ★
        if (tgt === '/blog' && !allowBlogLinks.has(pagePath)) {
          continue;
        }

        links.push({ source: pagePath, target: tgt });
      }
    }
  }

  /* ---------- ノードの重複排除 ---------- */
  const uniqNodes = Array.from(new Map(nodes.map(n => [n.id, n])).values());

  /* ---------- JSON 書き出し ---------- */
  await fs.mkdir(path.resolve('./public'), { recursive: true });
  await fs.writeFile(
    path.resolve('./public/graph.json'),
    JSON.stringify({ nodes: uniqNodes, links }, null, 2),
    'utf8'
  );

  console.log(
    `✅ public/graph.json generated: ${uniqNodes.length} nodes, ${links.length} links`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
