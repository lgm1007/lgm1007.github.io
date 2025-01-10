---
layout:	post
title: 옵시디언 데일리 투두리스트로 일감 관리하기
date: 2025-01-09 09:00:12 +0900
sitemap: 
image: worktool-1.jpg
author: GyuMyung
tags: worktool
comments: true
---

# 옵시디언 데일리 투두리스트로 일감 관리하기
### 1. 데일리 노트 (Daily notes) 설정하기
옵시디언에서 기본적으로 제공하는 코어 플러그인 (Core plugins)에 데일리 노트가 있다. 옵시디언 설정에 들어가 코어 플러그인에서 데일리 노트를 활성화한다.

![](https://github.com/user-attachments/assets/25acf4d5-3f3b-4b23-b597-d568998be75e)

그 다음 코어 플러그인 설정에서 데일리 노트 파일에 대한 설정을 해줘야 한다. 우선 해당 포스트에서는 TODO 리스트를 만드는 게 목표이기 때문에 우선 템플릿 파일을 만들어 줄 것이다.

폴더 template를 만들고 그 안에 `daily_note_template` 라는 이름의 파일을 만들어 다음과 같이 작성해줄 것이다. 아래 템플릿 파일 내용은 임시로 작성한 것이기 때문에 개인의 필요에 맞게 수정해서 작성해도 된다.

`````text
---
created: {% raw %}{{date}} {{time}}{% endraw %}
---

tags: #daily_note

# {% raw %}{{date}}{% endraw %}
- [ ] #todo TBU


[[{% raw %}{{yesterday}}{% endraw %} | < yesterday]] | [[{% raw %}{{tomorrow}}{% endraw %} | tomorrow >]]

---

### 일감 감옥
{% raw %}
```tasks
path includes TODO
not done
short mode
```
{% endraw %}
`````

위 템플릿 내용은 파일의 생성 일자와 현재 날짜, 현재 날짜에 따른 일감, 어제 날짜와 내일 날짜로 이동할 수 있는 버튼, 아직 완료되지 않았거나 미래에 진행할 일감을 관리할 수 있는 일감 감옥이라는 카테고리를 추가했다.

여기서 자유롭게 커스텀하는 부분은 `tags: #daily_note` 이 부분과 `- [ ] #todo`, 그리고 `path includes TODO` 이 부분이 있겠다. 위 템플릿에서는 데일리 노트용 태그 값으로 `#daily_note`, 일감용 태그로는 `#todo`, 그리고 이러한 TODO 리스트 파일이 저장될 경로로 `TODO` 라는 폴더를 사용한다.

만약 다른 태그값이나 다른 폴더명을 사용한다면 그에 따라 변경해주면 되겠다.

![](https://github.com/user-attachments/assets/0498af80-06da-4f76-81fb-92b71a34c198)

템플릿 파일을 만든 후 옵시디언 설정 → 코어 플러그인 → 데일리 노트에서 새 파일 경로와 템플릿 파일 경로 설정을 입력해줄 것이다.

새 파일 경로는 데일리 노트 파일을 만들 경로가 된다. 나는 데일리 노트를 TODO 리스트로 사용할 것이기 때문에 TODO 라는 폴더를 생성하여 해당 경로에 `TODO`라고 입력했다.

템플릿 파일 경로는 앞에서 생성해 준 `template/daily_note_template` 경로를 입력해준다.

![](https://github.com/user-attachments/assets/c2c36e48-9027-4921-87bd-8fec3b52443e)

### 2. Calendar 플러그인
데일리 노트를 날짜별로 보다 쉽게 접근하고 조회하기 위해 `Calendar` 라는 커뮤니티 플러그인 (Community plugins) 을 활용할 것이다. 먼저 옵시디언 설정에서 커뮤니티 플러그인 메뉴로 들어간 다음 커뮤니티 플러그인 탐색 기능을 들어간다.

![](https://github.com/user-attachments/assets/e767060a-bfc1-4c78-9ae4-9fad03571776)

검색창에 Calendar 라고 검색하여 Calendar 플러그인을 설치 및 활성화해준다.

![](https://github.com/user-attachments/assets/75a51e1f-f5cd-4f9d-b4f5-e3b81d1739a8)

활성화하면 옵시디언의 우측 확장 패널에 달력 아이콘이 보일 것이다. (만약 안 보이면 패널 길이를 조정하면 볼 수 있다.) 아이콘을 클릭하면 우측에 달력이 표시될 것이다. 달력 날짜를 클릭하여 해당 날짜의 데일리 노트에 접근할 수 있다. 또한 아직 데일리 노트를 작성하지 않은 날짜를 클릭하면 바로 데일리 노트가 생성된다.

![](https://github.com/user-attachments/assets/e3fa063b-90d0-4502-851a-e3cc64e5bd84)

### 3. Tasks 플러그인

이제 본격적으로 일감을 관리할 것이다.

일감을 관리하기 위해서는 일감 감옥에 아직 처리하지 못한, 남은 일감들이 보여져야 관리하기 용이할 것이다. 이를 위해 커뮤니티 플러그인에서 `Tasks` 라는 플러그인을 설치하자.

앞서 Calendar 플러그인을 설치한 것과 마찬가지로 커뮤니티 플러그인에서 탐색 → 검색창에 Tasks 검색 → Tasks 플러그인 설치 및 활성화해준다.

![](https://github.com/user-attachments/assets/d34913b2-821c-4f3d-8e51-3912e69d25bd)

활성화했다면 옵시디언 설정에서 커뮤니티 플러그인 설정 → Tasks에서 일감으로 여기도록 할 글로벌 태그 필터값을 설정해준다. 나는 앞서 템플릿에서 작성했던 `#todo` 값을 입력했다.

![](https://github.com/user-attachments/assets/89997e4f-1490-4b3d-8896-24fceef1bfa4)

이렇게 설정하면 이제 데일리 노트에서 `- [ ] #todo ~~~` 이렇게 작성한 리스트는 앞의 `#todo` 태그로 인해 일감으로 분류해 아직 완료되지 않아 체크하지 않은 리스트가 일감 감옥에 표시된다.

##### 참고
[Medium - Obsidian 으로 밀려오는 일감 관리하기](https://medium.com/@totuworld/obisidian%EC%9C%BC%EB%A1%9C-%EB%B0%80%EB%A0%A4%EC%98%A4%EB%8A%94-%EC%9D%BC%EA%B0%90-%EA%B4%80%EB%A6%AC%ED%95%98%EA%B8%B0-119b51536e73)
