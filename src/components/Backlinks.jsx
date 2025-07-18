/**
 * Backlinks（被リンク）コンポーネント
 * @param {Object} props
 * @param {{slug: string, title: string}[]} props.backlinks - このページへのリンクがある記事の配列
 */
export default function Backlinks({ backlinks }) {
  if (!backlinks || !backlinks.length) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 mb-4">Backlinks</h2>
      <ul className="space-y-2">
        {backlinks.map(post => (
          <li key={post.slug}>
            <a
              href={`/blog/${post.slug}/`}
              className="text-blue-400 hover:underline break-all"
            >
              {post.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}