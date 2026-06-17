async function loadArticles() {
  const res = await fetch('data/articles.json');
  const articles = await res.json();

  const container = document.getElementById('articles');

  container.innerHTML = articles.map(a => `
    <article class="card">
      <h2>
        <a href="${a.file}">
          ${a.title}
        </a>
      </h2>

      <div class="meta">
        ${a.date} • ${a.category}
      </div>

      <p>${a.summary}</p>
    </article>
  `).join('');
}

loadArticles();
