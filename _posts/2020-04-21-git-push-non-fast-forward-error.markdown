---
layout: post
title:  git push (non-fast-forward) error
date:   2020-04-21 10:05:55 +0900
image:  post-4.jpg
author: GyuMyung
tags:   Troubleshooting
comments: true
---
### git push origin master 후 non-fast-forward 문제

<br/>

#### 원인

파일을 올리려고 하는 깃허브 내 레파지토리와 git init한 로컬 내 저장소와 관련이 없는`(unrelated)` 상태에서 두 저장소를 병합`(merge)` 시도함

<br/>

#### 해결책

git pull 명령 시 `--allow-unrelated-histories` 옵션 추가하여 관련없는 두 저장소의 병합 허용

