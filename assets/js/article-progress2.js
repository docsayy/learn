(function(){
  const articleKey = "article-progress:" + window.location.pathname;

  function ensureIndicator(){
    let indicator = document.getElementById("reading-progress");

    if(!indicator){
      indicator = document.createElement("div");
      indicator.id = "reading-progress";
      indicator.className = "reading-progress";
      indicator.textContent = "0%";
      document.body.appendChild(indicator);
    }

    return indicator;
  }

  function saveProgress(){
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    const percent = maxScroll > 0
      ? Math.max(0, Math.min(100, Math.round((scrollTop / maxScroll) * 100)))
      : 0;

    localStorage.setItem(articleKey, JSON.stringify({
      path: window.location.pathname,
      title: document.title,
      percentRead: percent,
      scrollY: scrollTop,
      completed: percent >= 90,
      lastRead: new Date().toISOString()
    }));

    const indicator = ensureIndicator();
    indicator.textContent = percent + "%";
  }

  function restoreProgress(){
    const saved = JSON.parse(localStorage.getItem(articleKey) || "null");
    const indicator = ensureIndicator();

    if(saved){
      indicator.textContent = (saved.percentRead || 0) + "%";

      if(saved.scrollY > 200 && !saved.completed){
        setTimeout(() => {
          window.scrollTo({
            top: saved.scrollY,
            behavior: "smooth"
          });
        }, 300);
      }
    }

    saveProgress();
  }

  window.addEventListener("scroll", () => {
    clearTimeout(window.progressTimer);
    window.progressTimer = setTimeout(saveProgress, 150);
  });

  window.addEventListener("load", restoreProgress);
})();
