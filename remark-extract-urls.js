import { visit } from 'unist-util-visit';

export default function remarkExtractUrls() {
  return (tree, file) => {
    const urls = new Set();
    visit(tree, 'link', (node) => {
      if (node.url) urls.add(node.url);
    });
    // 画像や他のノードも抽出したい場合はここに追加可能
    if (!file.data.fm) file.data.fm = {};
    // 既存linksがあればマージ
    const existingLinks = Array.isArray(file.data.fm.links) ? file.data.fm.links : [];
    const urlLinks = Array.from(urls).map(url => ({ title: url, url }));
    file.data.fm.links = [...existingLinks, ...urlLinks];
  };
} 