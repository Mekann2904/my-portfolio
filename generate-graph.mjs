// generate-graph.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) return walk(res);
    return entry.name === 'index.html' ? res : [];
  }));
  return Array.prototype.concat(...files);
}

async function main() {
  const dist = path.resolve('./dist');
  const htmlFiles = await walk(dist);
  const nodes = [];
  const links = [];

  // Home へのリンクを許可したいページのみを列挙
  const allowHomeLinks = new Set([
    '/portfolio',
    '/my-journey',
    '/blog',
    // 必要があればここに追加
  ]);

  for (const file of htmlFiles) {
    const rel = path.relative(dist, file);
    const pagePath = rel === 'index.html' ? '/' : '/' + path.dirname(rel);
    nodes.push({
      id: pagePath,
      label: pagePath === '/' ? 'Home' : pagePath.slice(1),
      ext: false
    });

    const html = await fs.readFile(file, 'utf8');
    for (const m of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const href = m[1];

      // 1) 外部リンク (http(s) または mailto) は個別ノードとして扱う
      if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
        nodes.push({ id: href, label: href, ext: true });
        links.push({ source: pagePath, target: href });
        continue;
      }

      // 2) アセット類はスキップ
      if (href.match(/\.(css|js|png|jpe?g|svg|ico)$/)) continue;

      // 3) ルートから始まる内部リンクのみを処理
      if (href.startsWith('/')) {
        const tgt = href.replace(/\/$/, '') || '/';

        // Home('/') へのリンクは、許可リストにあるページのみ追加
        if (tgt === '/' && !allowHomeLinks.has(pagePath)) {
          continue;
        }

        links.push({ source: pagePath, target: tgt });
      }
    }
  }

  // ノードの重複排除
  const uniq = Array.from(new Map(nodes.map(n => [n.id, n])).values());

  // public/graph.json に書き出し
  await fs.mkdir(path.resolve('./public'), { recursive: true });
  await fs.writeFile(
    path.resolve('./public/graph.json'),
    JSON.stringify({ nodes: uniq, links }, null, 2),
    'utf8'
  );
  console.log(`✅ public/graph.json generated: ${uniq.length} nodes, ${links.length} links`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
