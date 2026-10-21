(function () {
  var title = document.getElementById('tag_title');
  if (!title) return;

  function normalizeTag(value) {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
  }

  var selectedTag = new URLSearchParams(window.location.search).get('tag');
  selectedTag = selectedTag ? normalizeTag(selectedTag) : '';
  if (selectedTag) title.textContent = '주제: ' + selectedTag;

  var articles = document.querySelectorAll('.tag_article');
  var visibleCount = 0;

  articles.forEach(function (article) {
    var tags = Array.from(article.querySelectorAll('.article__tag'));
    var matches = !selectedTag || tags.some(function (tag) {
      return normalizeTag(tag.textContent) === selectedTag;
    });

    article.hidden = !matches;
    article.style.display = matches ? '' : 'none';
    if (matches) visibleCount += 1;
  });

  if (!visibleCount) {
    var container = document.querySelector('.tag_content_wrapper');
    if (!container) return;

    var message = document.createElement('p');
    message.className = 'tag-empty';
    message.textContent = '이 주제에 해당하는 글이 없습니다. ';

    var archiveLink = document.createElement('a');
    archiveLink.href = window.location.pathname;
    archiveLink.textContent = '모든 주제의 글 보기';
    message.appendChild(archiveLink);
    container.appendChild(message);
  }
})();
