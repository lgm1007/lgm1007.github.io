---
layout:	post
title: NextJS 서비스를 Cloudflare Workers로 배포하기
date: 2026-03-11 10:11:17 +0900
sitemap:
  changefreq: weekly
image: programming-17.png
author: GyuMyung
tags: programming
comments: true
---

개발한 NextJS 서비스를 Cloudflare Workers로 배포하는 과정을 정리한 포스팅이다.

### 1. opennextjs cloudflare 패키지 설치
NextJS 프로젝트에서 아래 패키지를 설치한다.

```
npm install --save-dev @opennextjs/cloudflare
```

(본 포스팅에서의 opennextjs cloudflare 패키지는 `1.17.1` 버전이다.)

### 2. `wrangler.toml` 설정파일 추가
NextJS 프로젝트의 루트 패키지에 `wrangler.toml` 파일을 추가하고, 아래와 같이 내용을 작성한다.  
`wrangler.toml` 파일은 Cloudflare 배포의 핵심 설정 파일이다.

```toml
name = "프로젝트명"
main = ".open-next/worker.js"
compatibility_date = "2026-03-05" # 배포 날짜 기준
compatibility_flags = ["nodejs_compat"]
workers_dev = true

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

### 3. OpenNextConfig 설정 작성
NextJS 프로젝트의 루트 패키지에 `open-next.config.ts` 파일을 추가하고, 아래와 같이 내용을 작성한다.  
설치해 준 OpenNext 패키지가 실제로 Cloudflare에서 빌드를 진행할 때 필요한 빌드 설정들을 정의해주는 파일이다.   

(본 설정은 2026 Cloudflare 기준이다.)

```ts
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
    default: {
        override: {
            wrapper: "cloudflare-node",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: "dummy",
            tagCache: "dummy",
            queue: "dummy",
        },
    },
    edgeExternals: ["node:crypto"],
    middleware: {
        external: true,
        override: {
            wrapper: "cloudflare-edge",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: "dummy",
            tagCache: "dummy",
            queue: "dummy",
        },
    },
};

export default config;
```

### 4. Cloudflare 대시보드 설정
이제 웹 브라우저에서 [Cloudflare 대시보드](https://dash.cloudflare.com)에 접속한다.  
로그인한 후 **Create application** 버튼을 클릭하여 Workers를 생성하는 페이지로 들어간다.  
아래 이미지와 같이 NextJS 프로젝트가 올라가있는 GitHub 레포지토리를 연결한다.  
그리고 **Build command**와 **Deploy command**엔 다음과 같이 작성한다.

- **Build command**: `npx @opennextjs/cloudflare build`
- **Deploy command**: `npx wrangler deploy`

![cloudflare-setup-application](https://i.imgur.com/qqp6qs5.png)

또한 아래 **Advanced settings** 메뉴를 펼쳐보면 환경 변수를 추가할 수 있는 입력폼을 볼 수 있다.  
다음 입력폼에 외부 서비스 API Key 등 `.env` 파일 등에 작성했던 환경 변수를 작성해주면 된다.

![cloudflare-variable-input](https://i.imgur.com/dcF1LvS.png)

아래 **Encrypt** 버튼은 서버에서만 쓰는 비밀 키를 등록할 경우에는 체크해주는 것을 추천한다.  
하지만 클라이언트에서 사용할 키 값은 체크하지 않아도 무방하다.

### 5. Deploy 및 Build
Cloudflare 대시보드 설정들을 작성하고 **Deploy** 버튼을 클릭해 최종 배포를 진행해준다.  
이 때 Cloudflare Workers 측에서 빌드를 진행하는데, `Success! Build completed.` 라는 로그가 뜬다면 빌드에 성공한 것이다.  
만약 빌드 실패가 뜬다면 주요 원인은 앞에서 작성해 준 `wrangler.toml` 설정 파일이나 `open-next.config.ts` 파일 중 잘못된 부분이 있는 경우이다. 로그에서 출력된 실패 로그를 보며 디버깅한다면 성공할 수 있을 것이다.  
