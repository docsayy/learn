const fs = require("fs");
const path = require("path");

const POSTS_DIR = "./posts";
const OUTPUT_DIR = "./data";
const OUTPUT_FILE = "./data/articles.json";

const files = fs.readdirSync(POSTS_DIR);
const articles = [];

function extractMeta(content, name){
  const regex = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`,
    "i"
  );

  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function stripHTML(html){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateReadingTime(content){
  const text = stripHTML(content);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function normalizeTags(tags){
  if(!tags) return [];

  return tags
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

for(const file of files){
  if(!file.endsWith(".html")) continue;

  const filePath = path.join(POSTS_DIR, file);
  const content = fs.readFileSync(filePath, "utf8");

  const title = extractMeta(content, "title");
  const date = extractMeta(content, "date");
  const category = extractMeta(content, "category");
  const summary = extractMeta(content, "summary");
  const tags = normalizeTags(extractMeta(content, "tags"));
  const featured = extractMeta(content, "featured").toLowerCase() === "true";
  const draft = extractMeta(content, "draft").toLowerCase() === "true";

  if(draft) continue;
  if(!title || !date || !category || !summary) continue;

  articles.push({
    title,
    date,
    category,
    tags,
    summary,
    featured,
    readingTime: calculateReadingTime(content),
    file: `posts/${file}`
  });
}

articles.sort((a,b) => new Date(b.date) - new Date(a.date));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(articles, null, 2)
);

console.log(`Generated ${articles.length} articles`);
