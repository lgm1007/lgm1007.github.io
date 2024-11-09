---
layout:	post
title: Github Actions로 브랜치에서 push하면 특정 브랜치에 자동 merge 하기
date: 2024-07-05 21:48:02 +0900
sitemap: 
image: technology-7.jpg
author: GyuMyung
tags: technology
comments: true
---

# Github Actions로 브랜치에서 push하면 특정 브랜치에 자동 merge 하기
팀원들과 깃 브랜치 머지에 대해 이야기하다가 다음과 같은 주제에 대해 이야기를 한 적이 있다. <br/>
현재 깃 플로우가 1. 개별 feature 브랜치에서 커밋 하고, 2. feature 브랜치와 릴리즈 버전 브랜치에 Merge 하고, 3. 버전 브랜치에서 개발 환경 릴리즈 브랜치로 Merge 하여 개발 환경에 변경 사항을 반영하여 기능 테스트를 하고 있다. <br/>
여기서 릴리즈 버전 브랜치로 Merge하는 사항들은 개발 환경 릴리즈 브랜치에 결국 반영이 될 내용이기 때문에, "버전 브랜치에 Push 가 행해지면 개발 환경 릴리즈 브랜치에 자동으로 Merge가 되면 좋겠다." 라는 얘기가 나오게 됐다. <br/>
여기서 문득 Github Actions에서 이런 action을 만들어주면 가능할 것 같은데? 하는 생각이 들었고, 관련 기능을 찾아보았다. <br/>

### 관련 내용
관련 내용을 찾아보니 어떠한 브랜치에 Push가 이루어지면, 특정 브랜치에서 해당 브랜치 내용을 Merge 하는 동작을 하도록 action을 구현하면 가능할 것 같았다. <br/>
```yaml
name: Merge dev to main

on:
  push: # push 이벤트 발생 시
    branches: # 타겟 브랜치
      - dev

jobs:
  merge: # merge 실행
    runs-on: ubuntu-latest
    steps:
      - name: Checkout main branch # main 브랜치로 체크아웃
        uses: actions/checkout@v2
        with:
          ref: 'main'
          fetch-depth: '0'

      - name: Configure Git # commit을 위한 git config 설정
        run: |
          git config user.name example_name
          git config user.email abc@example.com

      - name: Merge target branch # 타겟 브랜치를 merge
        run: |
          git merge origin/dev --no-edit

      - name: Push changes to main branch # merge 내용을 push
        uses: ad-m/github-push-action@master
        with:
          branch: main
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
위 예제 `workflows.yml`은 `dev` 브랜치에 Push 하게 되면, `main` 브랜치에 자동으로 머지하여 Push 하는 action을 구현한 스크립트이다. 이와 유사하게 원하던 기능을 action으로 구현해볼 수 있지 않을까 싶다. <br/>
(버전 브랜치의 포맷인 `*.**`으로 와일드카드가 적용이 되는지는 더 확인이 필요하다)

### 추가
#### Github Token 생성 및 Secrets에 등록
1. Github 프로필 → Settings → Developer Setting → Personal Access Tokens → Tokens (classic) → Generate new token 페이지로 접속
2. Select scopes에서 `repo`, `workflow` 항목 체크 후  (Organization에 있는 레파지토리에 이러한 Action을 추가하려면 `org`에 해당하는 항목도 체크한다.)
3. Action을 적용할 레파지토리에 들어감 → Setting → Secrets and variables → Actions 탭으로 들어가 Repository secrets 항목에서 New Repository secret 들어감
4. Secret 이름과 발급받은 토큰 값을 입력 후 저장
5. 저장한 Secret 이름을 Github Action workflows .yml 파일에서 `${{  secrets.이름  }}` 으로 사용
