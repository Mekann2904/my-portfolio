// generate-graph.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

async function main() {
  const dist = path.resolve('./dist');
  // fast-globで全index.htmlを取得
  const htmlFiles = await fg('**/index.html', { cwd: dist, absolute: true });
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

  // 除外対象のナビゲーションパス
  const navPaths = new Set([
    '/', '/blog', '/tags', '/portfolio', '/anime', '/my-journey',
  ]);
  const navPrefixes = ['/test/', '/tailwind/'];
  const assetPrefixes = ['/_astro/', '/public/', '/model/', '/images/'];

  for (const file of htmlFiles) {
    const rel = path.relative(dist, file);
    let pagePath;
    if (rel.endsWith('index.html')) {
      pagePath = '/' + path.dirname(rel).replace(/\\/g, '/');
      if (pagePath === '/.') pagePath = '/';
    } else {
      pagePath = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '');
    }

    // ノードを追加
    nodes.push({
      id: pagePath,
      label: pagePath === '/' ? 'Home' : pagePath.slice(1),
      ext: false,
    });

    // 参照リンクを解析
    const html = await fs.readFile(file, 'utf8');
    // href="..." または href='...' または href=...（クオートなし）に対応
    for (const m of html.matchAll(/href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)) {
      const href = m[1] || m[2] || m[3];

      // 外部リンク
      if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
        nodes.push({ id: href, label: href, ext: true });
        links.push({ source: pagePath, target: href, type: 'external' });
        continue;
      }

      // アセット類の除外強化
      if (
        href.match(/\.(css|js|png|jpe?g|svg|ico|webp|woff2?|ttf|mp4|webm)$/) ||
        assetPrefixes.some(prefix => href.startsWith(prefix))
      ) continue;

      // 内部リンク
      let tgt = null;
      if (href.startsWith('/')) {
        tgt = href.replace(/\/$/, '') || '/';
      } else if (href.startsWith('./') || href.startsWith('../')) {
        // 相対パスを絶対パスに解決
        const abs = path.posix.normalize(path.posix.join(pagePath, href));
        tgt = abs.replace(/\/$/, '') || '/';
      }
      if (tgt) {
        // 自己ループ除外
        if (pagePath === tgt) continue;
        // Homeやナビゲーションリンクの除外
        if (
          navPaths.has(tgt) ||
          navPrefixes.some(prefix => tgt.startsWith(prefix))
        ) continue;
        // アセット類の除外強化
        if (assetPrefixes.some(prefix => tgt.startsWith(prefix))) continue;
        // リンク種別の記録
        let type = 'normal';
        if (tgt.startsWith('/tags/')) type = 'tag';
        else if (navPaths.has(tgt) || navPrefixes.some(prefix => tgt.startsWith(prefix))) type = 'nav';
        else if (assetPrefixes.some(prefix => tgt.startsWith(prefix))) type = 'asset';
        links.push({ source: pagePath, target: tgt, type });
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
