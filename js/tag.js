// tag.html

// URL 뒤 ? 이후 파라미터 값을 가져오는 함수
function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2]);
}

let tagValue = getParameterByName('tag');
let tagArticles = document.getElementsByClassName('tag_article');

// 태그 페이지 제목 내용 처리
document.getElementById('tag_title').innerText = 'Tag: ' + tagValue.toUpperCase();

for (const tagArticle of tagArticles) {
	let articleTagBox = tagArticle.querySelector('.article-tags__box');
	let articleTag = articleTagBox.querySelector('.article__tag');

	// 현재 파라미터로 받아온 태그와 같지 않은 태그인 포스트는 보이지 않게 처리
	if (articleTag.innerHTML != tagValue) {
		tagArticle.style.display = 'none';
	}
}

// /tag.html