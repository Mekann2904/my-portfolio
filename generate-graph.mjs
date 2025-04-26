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
  const extId = '/external';

  for (const file of htmlFiles) {
    const rel = path.relative(dist, file);
    const pagePath = rel === 'index.html' ? '/' : '/' + path.dirname(rel);
    nodes.push({ id: pagePath, label: pagePath === '/' ? 'Home' : pagePath.slice(1), ext: false });

    const html = await fs.readFile(file, 'utf8');
    for (const m of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const href = m[1];
      // 1) 外部の http もしくは mailto はすべて external ノードへ
      if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
        links.push({ source: pagePath, target: extId });
        continue;
      }
      // 2) 拡張子でアセットを除外
      if (href.match(/\.(css|js|png|jpe?g|svg|ico)$/)) continue;
      // 3) ルートから始まる内部リンクのみ
      if (href.startsWith('/')) {
        const tgt = href.replace(/\/$/, '') || '/';
        links.push({ source: pagePath, target: tgt });
      }
    }
  }

  // external ノード
  nodes.push({ id: extId, label: 'External', ext: true });

  // 重複排除
  const uniq = Array.from(new Map(nodes.map(n => [n.id, n])).values());

  await fs.mkdir(path.resolve('./public'), { recursive: true });
  await fs.writeFile(
    path.resolve('./public/graph.json'),
    JSON.stringify({ nodes: uniq, links }, null, 2),
    'utf8'
  );
  console.log(`✅ public/graph.json generated: ${uniq.length} nodes, ${links.length} links`);
}

main().catch(e=>{
  console.error(e);
  process.exit(1);
});
