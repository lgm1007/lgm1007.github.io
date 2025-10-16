$(document).ready(function() {
    var toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    console.log('toggleBtn: ', toggleBtn);

    // 테마별 색상 적용
    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.classList.add('theme-light');
            toggleBtn.setAttribute('aria-pressed', 'true');
            toggleBtn.querySelector('.icon').textContent = '☀️';
            toggleBtn.querySelector('.label').textContent = '다크 모드';
        } else {
            document.documentElement.classList.remove('theme-light');
            toggleBtn.setAttribute('aria-pressed', 'false');
            toggleBtn.querySelector('.icon').textContent = '🌙';
            toggleBtn.querySelector('.label').textContent = '라이트 모드';
        }
    }

    // 초기 토글 라벨/아이콘 동기화
    var savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // 토글 버튼 이벤트
    toggleBtn.addEventListener('click', function() {
        console.log('toggleBtn Click Event');
        var isLight = document.documentElement.classList.contains('theme-light');
        var switchTheme = isLight ? 'dark' : 'light';
        applyTheme(switchTheme);
        try {
            localStorage.setItem('theme', switchTheme);
        } catch (e) {console.log("localStorage 테마 저장 Exception", e)}
    });
});