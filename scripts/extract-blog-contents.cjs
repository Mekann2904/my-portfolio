const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const blogDir = path.join(__dirname, '../src/pages/blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

const posts = files.map(filename => {
  const filePath = path.join(blogDir, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    slug: filename.replace(/\.(md|mdx)$/, ''),
    ...data,
    content,
  };
});

const outPath = path.join(__dirname, '../src/data/blog-contents.json');
fs.writeFileSync(outPath, JSON.stringify(posts, null, 2));
console.log('Extracted blog contents to', outPath); 