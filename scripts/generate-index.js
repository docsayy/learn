const fs = require('fs');
const path = require('path');

const POSTS_DIR = './posts';

const files = fs.readdirSync(POSTS_DIR);

const articles = [];

for (const file of files) {
  if (!file.endsWith('.html')) continue;

  const content = fs.readFileSync(
    path.join(POSTS_DIR, file),
    'utf8'
  );

  const extract = (name) => {
    const regex = new RegExp(
      `<meta\\s+name="${name}"\\s+content="([^"]*)"`
    );
    const match = content.match(regex);
    return match ? match[1] : '';
  };

  articles.push({
    title: extract('title'),
    date: extract('date'),
    category: extract('category'),
    summary: extract('summary'),
    file: `posts/${file}`
  });
}

articles.sort(
  (a, b) => new Date(b.date) - new Date(a.date)
);

fs.mkdirSync('./data', { recursive: true });

fs.writeFileSync(
  './data/articles.json',
  JSON.stringify(articles, null, 2)
);

console.log(`Generated ${articles.length} articles`);
