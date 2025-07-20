export default function ExtractLinks({ links }) {
  if (!links || links.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 mb-4">Links</h2>
      <ul className="space-y-2">
        {links.map(link => (
          <li key={link.url}>
            <a
              href={link.url}
              className="text-blue-400 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}