import { useEffect, useState } from 'react';

export default function ExtractLinks() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const article = document.querySelector('article');
    if (!article) return;
    const anchors = Array.from(article.querySelectorAll('a'));
    const urls = anchors
      .map(a => ({ title: a.textContent, url: a.href }))
      .filter(link => /^https?:/.test(link.url));
    setLinks(urls);
  }, []);

  if (links.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 mb-4">Links</h2>
      <ul className="space-y-2">
        {links.map(link => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
} 