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
        // 除外する外部ドメイン
        const excludedDomains = [
          'fonts.gstatic.com',
          'static.cloudflareinsights.com',
          'fonts.googleapis.com',
          'cdn.jsdelivr.net'
        ];
        if (excludedDomains.some(domain => href.includes(domain))) continue;
        
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

// blog専用のグラフ生成機能
async function generateBlogGraph() {
  const dist = path.resolve('./dist');
  // blogディレクトリ内のHTMLファイルのみを取得
  const blogHtmlFiles = await fg('blog/**/index.html', { cwd: dist, absolute: true });
  const blogNodes = [];
  const blogLinks = [];

  // blog専用の除外対象
  const blogNavPaths = new Set(['/blog']);
  const blogAssetPrefixes = ['/_astro/', '/public/', '/model/', '/images/'];

  for (const file of blogHtmlFiles) {
    const rel = path.relative(dist, file);
    let pagePath;
    if (rel.endsWith('index.html')) {
      pagePath = '/' + path.dirname(rel).replace(/\\/g, '/');
      if (pagePath === '/.') pagePath = '/';
    } else {
      pagePath = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '');
    }

    // blogノードを除外（すべての記事とつながるため）
    if (pagePath === '/blog') continue;

    // blog記事ノードを追加
    blogNodes.push({
      id: pagePath,
      label: pagePath.slice(6), // '/blog/'を除去
      ext: false,
    });

    // 参照リンクを解析
    const html = await fs.readFile(file, 'utf8');
    // href="..." または href='...' または href=...（クオートなし）に対応
    for (const m of html.matchAll(/href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)) {
      const href = m[1] || m[2] || m[3];

      // 外部リンク
      if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
        // 除外する外部ドメイン
        const excludedDomains = [
          'fonts.gstatic.com',
          'static.cloudflareinsights.com',
          'fonts.googleapis.com',
          'cdn.jsdelivr.net'
        ];
        if (excludedDomains.some(domain => href.includes(domain))) continue;
        
        blogNodes.push({ id: href, label: href, ext: true });
        blogLinks.push({ source: pagePath, target: href, type: 'external' });
        continue;
      }

      // アセット類の除外強化
      if (
        href.match(/\.(css|js|png|jpe?g|svg|ico|webp|woff2?|ttf|mp4|webm)$/) ||
        blogAssetPrefixes.some(prefix => href.startsWith(prefix))
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
        // blogナビゲーションリンクの除外
        if (blogNavPaths.has(tgt)) continue;
        // アセット類の除外強化
        if (blogAssetPrefixes.some(prefix => tgt.startsWith(prefix))) continue;
        // リンク種別の記録
        let type = 'normal';
        if (tgt.startsWith('/tags/')) type = 'tag';
        else if (blogNavPaths.has(tgt)) type = 'nav';
        else if (blogAssetPrefixes.some(prefix => tgt.startsWith(prefix))) type = 'asset';
        // blogノードへのリンクも除外
        if (tgt === '/blog') continue;
        blogLinks.push({ source: pagePath, target: tgt, type });
      }
    }
  }

  /* ---------- blogノードの重複排除 ---------- */
  const uniqBlogNodes = Array.from(new Map(blogNodes.map(n => [n.id, n])).values());

  /* ---------- blog-graph.json 書き出し ---------- */
  await fs.mkdir(path.resolve('./public'), { recursive: true });
  await fs.writeFile(
    path.resolve('./public/blog-graph.json'),
    JSON.stringify({ nodes: uniqBlogNodes, links: blogLinks }, null, 2),
    'utf8'
  );

  console.log(
    `✅ public/blog-graph.json generated: ${uniqBlogNodes.length} nodes, ${blogLinks.length} links`
  );
}

// メイン実行
async function runAll() {
  await main();
  await generateBlogGraph();
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
