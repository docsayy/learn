let allArticles = [];
let currentCategory = "all";

const articlesContainer = document.getElementById("articles");
const searchInput = document.getElementById("search");
const categoryButtons = document.querySelectorAll(".categories button");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");

async function loadArticles(){
  try{
    const res = await fetch("data/articles.json");
    allArticles = await res.json();

    allArticles = allArticles.filter(article =>
      article.title && article.date && article.file
    );

    allArticles.sort((a,b) => new Date(b.date) - new Date(a.date));

    setupSearch();
    setupCategoryFilters();
    renderArticles();

  }catch(error){
    articlesContainer.innerHTML = `
      <div class="empty-state">
        Could not load articles.
      </div>
    `;
    console.error(error);
  }
}

function setupSearch(){
  if(!searchInput) return;
  searchInput.addEventListener("input", renderArticles);
}

function setupCategoryFilters(){
  categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
      categoryButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      currentCategory = button.dataset.cat || "all";
      renderArticles();
    });
  });
}

function renderArticles(){
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const filtered = allArticles.filter(article => {
    const title = article.title || "";
    const summary = article.summary || "";
    const category = article.category || "";
    const tags = normalizeTags(article.tags).join(" ");
    const date = article.date || "";
    const file = article.file || "";

    const progress = getArticleProgress(file);
    const progressText = progress
      ? `${progress.percentRead || 0}% read ${progress.completed ? "read completed" : ""}`
      : "unread";

    const searchableText = `
      ${title}
      ${summary}
      ${category}
      ${tags}
      ${date}
      ${file}
      ${progressText}
    `.toLowerCase();

    const matchesSearch =
      query === "" || searchableText.includes(query);

    const matchesCategory =
      currentCategory === "all" ||
      category.toLowerCase().includes(currentCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  updateResultCount(filtered.length);
  renderCards(filtered);
}

function renderCards(articles){
  if(!articles.length){
    articlesContainer.innerHTML = "";
    if(emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if(emptyState) emptyState.classList.add("hidden");

  articlesContainer.innerHTML = articles.map(article => {
    const title = article.title || "Untitled Article";
    const summary = article.summary || "";
    const category = article.category || "Uncategorized";
    const date = formatDate(article.date);
    const tags = normalizeTags(article.tags);
    const file = article.file || "#";
    const progress = getArticleProgress(file);
    const progressBadge = renderProgressBadge(progress);

    return `
      <article class="card ${progress?.completed ? "is-read" : ""}">
        <div class="card-topline">
          ${progressBadge}
        </div>

        <h2>
          <a href="${escapeHTML(file)}">
            ${escapeHTML(title)}
          </a>
        </h2>

        <div class="meta">
          ${escapeHTML(category)}${date ? " • " + date : ""}
          ${progress?.lastRead ? ` • Last read ${formatRelativeDate(progress.lastRead)}` : ""}
        </div>

        ${
          summary
          ? `<p class="summary">${escapeHTML(summary)}</p>`
          : ""
        }

        ${
          progress && !progress.completed
          ? `
            <div class="progress-bar">
              <div style="width:${Math.min(progress.percentRead || 0, 100)}%"></div>
            </div>
          `
          : ""
        }

        ${
          tags.length
          ? `
            <div class="tag-row">
              ${tags.map(tag => `
                <button class="tag-chip" data-tag="${escapeHTML(tag)}">
                  ${escapeHTML(tag)}
                </button>
              `).join("")}
            </div>
          `
          : ""
        }
      </article>
    `;
  }).join("");

  setupTagClicks();
}

function getArticleProgress(file){
  const key = "article-progress:" + normalizePath(file);
  return JSON.parse(localStorage.getItem(key) || "null");
}

function renderProgressBadge(progress){
  if(!progress){
    return `<span class="article-status unread">Unread</span>`;
  }

  if(progress.completed){
    return `<span class="article-status read">✓ Read</span>`;
  }

  if(progress.percentRead > 0){
    return `<span class="article-status progress">${progress.percentRead}% read</span>`;
  }

  return `<span class="article-status unread">Unread</span>`;
}

function normalizePath(path){
  const a = document.createElement("a");
  a.href = path;
  return a.pathname;
}

function setupTagClicks(){
  document.querySelectorAll(".tag-chip").forEach(button => {
    button.addEventListener("click", () => {
      searchInput.value = button.dataset.tag;
      currentCategory = "all";

      categoryButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.cat === "all");
      });

      renderArticles();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function updateResultCount(count){
  if(!resultCount) return;

  const query = searchInput ? searchInput.value.trim() : "";

  if(query || currentCategory !== "all"){
    resultCount.textContent = `${count} result${count === 1 ? "" : "s"}`;
  }else{
    resultCount.textContent = `${count} article${count === 1 ? "" : "s"}`;
  }
}

function normalizeTags(tags){
  if(!tags) return [];

  if(Array.isArray(tags)){
    return tags.map(t => String(t).trim()).filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
}

function formatDate(dateString){
  if(!dateString) return "";

  const date = new Date(dateString + "T00:00:00");

  if(isNaN(date.getTime())){
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    year:"numeric",
    month:"short",
    day:"numeric"
  });
}

function formatRelativeDate(dateString){
  const date = new Date(dateString);

  if(isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month:"short",
    day:"numeric"
  });
}

function escapeHTML(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

loadArticles();
