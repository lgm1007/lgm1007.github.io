---
layout:	post
title: Github Actions 와 AWS Elastic Beanstalk 으로 지속적인 배포
date: 2025-08-19 11:42:37 +0900
sitemap: 
image: technology-20.png
author: GyuMyung
tags: technology
comments: true
---

## 0. AWS Beanstalk 란?
AWS Beanstalk는 AWS에서 알아서 인프라 설정을 구성해주어, 쉽게 배포할 수 있게 도와주는 PaaS 서비스이다. 애플리케이션의 배포와 관리를 AWS에서 자동화하여 개발자의 부담을 크게 줄여준다.<br>

Beanstalk의 특징은 다음과 같다.
- Beanstalk 서비스 자체는 무료이고, 실제로 사용하는 인스턴스들의 값만 지불하면 된다.
- 여러 가지 환경을 제공한다. (Java, Node, Docker 등)
- 여러 가지 CD 방법을 제공한다. (Github Actions, CodePipeline)
- AWS 콘솔의 Elastic Beanstalk 콘솔에서 다양한 서비스를 다룰 수 있다. (모니터링, 오토스케일링, 네트워크 태그 등)
- AWS 서비스로만 제한된다는 아쉬운 점은 있다.
  <br>

AWS Beanstalk의 구성과 동작 원리는 다음과 같다.

![AWS_Beanstalk](https://docs.aws.amazon.com/ko_kr/elasticbeanstalk/latest/dg/images/aeb-overview.png)

### 구성 요소
1. **애플리케이션**: 소스 업로드마다 애플리케이션 버전이 생기고, Elastic Beanstalk가 이를 배포 단위로 관리 (버전 소스 번들은 S3 버킷에 보관)
2. **환경** (Environment): 하나의 애플리케이션에 여러 환경을 둘 수 있다. 대표적으로 Web Service 환경, Worker 환경 (SQS 큐의 메시지를 받아 비동기 작업 처리하는 역할) 이 있다.
3. **공통 관리 리소스**
    - S3 버킷: 애플리케이션 버전, 로그, 아티팩트 저장
    - CloudWatch: 메트릭/알람 및 로그 연동
    - CloudFormation 스택: 환경 생성/변경 시 실제 AWS 리소스를 갱신하는 오케스트레이터

### 동작 과정
1. **인터넷 → Elastic Load Balancer → Security Group → Web Server 환경**: 사용자가 기본 도메인 (위 그림에선 `subdomain.region.elasticbeanstalk.com`) 으로 접속하면 로드 밸런서가 Auto Scaling 그룹의 EC2 인스턴스로 트래픽을 분산한다.
2. **동기 처리 + 비동기 분리**: Web Server가 즉시 처리하기 어려운 작업은 SQS 큐 메시지로 넣는다. Worker 환경의 sqsd가 큐에서 메시지를 꺼내 POST로 앱에 전달하고, 성공 시 큐에서 삭제한다.
3. **운영·모니터링·형상**: 애플리케이션 버전과 로그는 S3에 저장되고, 상태 및 이상 징후는 CloudWatch로 모니터링한다. 환경의 생성·업데이트는 백그라운드에서 CloudFormation 스택이 수행한다.

## 1. AWS Beanstalk 생성
먼저 Beanstalk 에 애플리케이션을 생성해줘야 한다.<br>
Elastic Beanstalk 대시보드에서 애플리케이션 메뉴로 들어가면 다음과 같이 애플리케이션 생성 버튼이 보인다.

![Beanstalk_애플리케이션_생성](https://i.imgur.com/Rn08Wec.png)

그리고 원하는 이름을 작성하여 생성해주면 애플리케이션은 간단하게 생성할 수 있다.

다음으로 만든 애플리케이션 내 환경을 생성해줘야 한다.<br>
생성한 애플리케이션 이름에 걸린 하이퍼링크를 클릭하여 접속한 후 새 환경 생성 버튼을 클릭한다.<br>
그리고 애플리케이션 생성 때와 마찬가지로 환경 이름을 작성해주고 나면, 다음으로 플랫폼 정보를 설정해줘야 한다. 여기서는 Spring Boot 프로젝트를 배포할 것임으로 `Java` 플랫폼으로 선택해준다.

![Beanstalk_환경_플랫폼설정](https://i.imgur.com/NAv4A2w.png)

다음으로 애플리케이션 코드와 사전 설정 항목이 있다.<br>
애플리케이션 코드는 우선 `샘플 애플리케이션`을, 사전 설정 항목으로는 무중단 배포를 구성해주기 위해 `사용자 지정 구성`을 선택해준다.

![Beanstalk_환경_애플리케이션_코드설정](https://i.imgur.com/xHFzE9p.png)

![Beanstalk_사전설정](https://i.imgur.com/wU5s9kH.png)

다음 단계는 서비스 액세스 구성 단계인데, 여기에서는 이전에 생성한 IAM 역할이 없다면 `새 서비스 역할 생성 및 사용`을 선택해주고, 기존에 생성한 IAM 역할을 그대로 사용하고자 한다면 `기존 서비스 역할 사용`을 선택해준다.

![Beanstalk_서비스_액세스_구성](https://i.imgur.com/3Y5k7pZ.png)

만약 새 서비스 역할 생성 및 사용을 하고자 하는 경우에는 EC2 인스턴스 프로파일과 선택 사항인 EC2 키 페어를 생성해줘야 한다. EC2 키 페어는 다른 포스팅에서 다루도록 하고, 여기서는 EC2 인스턴스 프로파일을 생성하는 내용을 설명하겠다.

IAM 콘솔에서 좌측 액세스 관리 → 역할 메뉴로 들어간 다음 역할 생성 버튼을 클릭한다.

![IAM_콘솔_화면](https://i.imgur.com/os8Xwhb.png)

![IAM_액세스관리_역할](https://i.imgur.com/RCggUsK.png)

역할 생성 페이지에 들어간 후 신뢰할 수 있는 엔티티 유형으로 `AWS 서비스`를 선택하고, 사용 사례는 `EC2` 선택해준다.

![IAM_역할_엔티티_유형_및_정책추가](https://i.imgur.com/j5PYXt9.png)

이후 정책을 추가해줄 건데, 아래 세 가지 정책을 추가해줘야 한다.

- **AWSElasticBeanstalkMulticontainerDocker**
- **AWSElasticBeanstalkWebTier**
- **AWSElasticBeanstalkWorkerTier**

![역할_정책_추가항목](https://i.imgur.com/NEJJQzA.png)

위 권한을 추가한 후 원하는 이름을 정해주고 역할을 생성해주면 된다.

이렇게 생성해 준 역할을 다시 Elastic Beanstalk 환경 생성 단계에서 서비스 액세스 구성 → EC2 인스턴스 프로파일에서 사용한다.

다음 환경 생성 단계는 네트워크 및 데이터베이스 구성 단계인데, 사실 Beanstalk 생성 전에 VPC 및 서브넷 환경을 미리 구성해야 한다. 해당 포스팅에서는 Beanstalk 생성하는 부분에 대해 다루고 있기 때문에 네트워크 구성은 다음에 다뤄보도록 하겠다. 따라서 서비스 액세스 구성 단계 이후 검토 단계 건너뛰기를 클릭해, 나머지 구성은 다음에 차근차근 추가해도 좋다.

한 가지 팁이라고 한다면, 구성 설정 중 오토 스케일링 그룹 설정이 있는데, 여기서 인스턴스의 최대값을 1개 초과해서 설정하면 많은 트래픽이 들어올 때 자동으로 서버가 증설되어 추가 비용이 부담될 수 있어 주의해야 한다.

![Beanstalk_오토_스케일링_그룹_설정](https://i.imgur.com/YSAUawX.png)

Beanstalk 환경을 생성하고 난 후, EC2 인스턴스에 대해 포트를 개방하여 누구든 접속 가능하게끔 설정하는 부분도 알아보겠다. 이를 위해 EC2의 `보안 그룹`을 설정해줘야 한다.<br>
EC2 콘솔에서 `보안 그룹`을 선택해준다. 그리고 Beanstalk 환경을 생성해준 후 생성된 인스턴스 (설명을 보면 식별할 수 있다.) 중에서 데이터베이스가 아닌 것을 선택해준다.<br>
이후 `인바운드 규칙 편집 버튼`을 클릭한다.

![보안_그룹_인바운드_규칙](https://i.imgur.com/23rc0fk.png)

`SSH`는 사내라면 사내 내부망 혹은 개인이라면 본인 IP로 설정해주고, `HTTP`, `HTTPS`는 `Anywhere-IPv4`로 설정해준다.

![보안_그룹_HTTPS_설정](https://i.imgur.com/P4lMJQ3.png)

## 2. Github Actions 에서 사용할 IAM 인증키 발급
외부 서비스인 Github Actions에서 AWS 서비스에 명령을 줄 수 있는 권한을 받아야 한다.

![IAM대시보드_사용자](https://i.imgur.com/HfcwTnh.png)

AWS 콘솔에서 IAM 대시보드 → 사용자 메뉴에 들어가면 위 이미지처럼 나온다.<br>
여기서 사용자 생성 버튼을 클릭해 들어간다.

![사용자생성_권한설정](https://i.imgur.com/2wkaECP.png)

사용자 생성에서 생성할 이름을 입력하고, 다음 단계로 넘어가면 위 이미지처럼 권한 옵션과 권한 정책을 선택하는 페이지가 나온다.<br>
권한 옵션에서는 **직접 정책 연결**을 선택하고, 권한 정책에서는 `AdministratorAccess-AWSElasticBeanstalk` 을 선택해준다.

![사용자_액세스키만들기](https://i.imgur.com/AAAfk9E.png)

생성된 사용자 이름으로 들어가면, 위 이미지처럼 보안 자격 증명이라는 탭이 있다.<br>
해당 탭으로 이동하면 아래 **액세스 키 만들기** 버튼이 보인다. 해당 버튼을 클릭하여 액세스 키를 만들어주자.<br>

액세스 키를 만들면 **액세스 키 ID**와 **Secret 액세스 키** 두 값을 얻을 수 있다. 이 키들은 한번 확인하면 두 번 다시 확인하지 못하기 때문에 꼭 다른 저장소에 저장해 보관해두어야 한다.<br>

그 다음 해당 키들을 Github Actions의 Secret 값으로 추가해준다.

![github_repository_secret_추가](https://i.imgur.com/SQCAFtC.png)

배포하고자 하는 프로젝트의 Repository → Settings → Secrets and variables → Actions 메뉴로 접속하여 Repository secrets → New repository secret 버튼으로 액세스 키 값들을 추가한다.<br>
이것으로 Github Actions에서 AWS Beanstalk에 대한 권한 얻게 되었다.

## 3. Github Actions 스크립트 및 애플리케이션 구성
Github Actions 플러그인 중 [Beanstalk Deploy](https://github.com/marketplace/actions/beanstalk-deploy) 라는 플러그인이 있다.<br>
해당 플러그인을 사용하면 설정 값만 입력해주면 쉽게 AWS Beanstalk 배포 코드를 작성할 수 있다. 아래는 Beanstalk Deploy 플러그인 예제 코드이다.

```yaml
- name: Deploy to EB
    uses: einaregilsson/beanstalk-deploy@v21
    with:
    aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    application_name: MyApplicationName
    environment_name: MyApplication-Environment
    version_label: 12345 # 임의 버전 라벨값
    region: ap-northeast-2 # AWS에서 사용하는 리전
    deployment_package: deploy/deploy.zip # 이전 Actions 스텝에서 만들어 준 deploy.zip 경로
```

해당 플러그인을 적용한 대략적인 스크립트는 다음과 같이 되겠다.<br>
Spring Boot 진영에서 사용할 경우 참고 정도하면 좋겠다. (도커 방식으로도 배포가 가능하나, 해당 예제에서는 jar 패키지로 빌드하여 배포하는 방식에 대해 다룬다.)

```yaml
name: my-springboot-api
  
on:  
  push:  
    branches:  
      - develop  
  workflow_dispatch: # 수동으로 실행 가능  
  
jobs:  
  build:  
    runs-on: ubuntu-latest  
    timeout-minutes: 30  
  
    steps:  
      - name: Checkout  
        uses: actions/checkout@v3 # 프로젝트 코드 체크아웃
  
      - name: Set up JDK 17  
        uses: actions/setup-java@v3 # java 17 설치
        with:  
          distribution: 'zulu'  
          java-version: 17  
  
      - name: Grant execute permission for gradlew  
        run: chmod +x ./gradlew # gradle wrapper 실행 권한
        shell: bash  
  
      - name: Build with Gradle  
        run: ./gradlew clean build
        shell: bash  
  
      - name: Get current time # 참고 안해도 됨, 버전에 현재 시간 값 입력을 위해 추가한 작업
        uses: josStorer/get-current-time@v2.0.0
        id: current-time  
        with:  
          format: YYYY-MM-DDTHH-mm-ss  
          utcOffset: "+09:00"  
  
      - name: Generate deployment package # deploy.zip 파일 만들기
        run: |  
          mkdir -p deploy  
          cp api/build/libs/*.jar deploy/application.jar  
          cp api/Procfile deploy/Procfile  
          cp -r api/.ebextensions deploy/.ebextensions  
          cp -r api/.platform deploy/.platform  
          cd deploy && zip -r deploy.zip .  
  
      - name: Deploy to EB  
        uses: einaregilsson/beanstalk-deploy@v21  
        with:  
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}  
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}  
          application_name: my-springboot-webservice # Beanstalk 애플리케이션 이름
          environment_name: my-springboot-api # Beanstalk 환경 이름
          version_label: github-action-${{steps.current-time.outputs.formattedTime}} # 참고 안해도 됨, 버전 라벨 값에 현재 시간 값으로 입력
          region: ap-northeast-2  
          deployment_package: deploy/deploy.zip # 앞에서 만든 deploy.zip 파일 사용
```

Github Actions 스크립트를 보면 추가로 필요한 구성들이 있다는 것을 눈치챌 수 있다.<br>
바로 3가지 구성인 `Procfile`, `.ebextensions`, `.platform` 가 애플리케이션 프로젝트 내에 있어야 한다.
`my-springboot-api`가 프로젝트의 루트 디렉토리라고 할 경우 다음 구성들은 이렇게 위치해있어야 한다.
- `my-springboot-api/Procfile`
- `my-springboot-api/.ebextensions/00-makeFiles.config`
- `my-springboot-api/.ebextensions/00-set-timezone.config`
- `my-springboot-api/.platform/nginx/nginx.conf`

차례로 구성 파일들을 생성해보자.<br>

첫 번째로 Procfile 파일이다.<br>
Beanstalk이 애플리케이션 실행 단계 때 수행하는 행동이 Procfile을 실행하는 것이다. 보통 다음에 만들어 볼 `.ebextensions` 구성 파일들로 인해 만들어진 `/sbin/appstart` 스크립트를 실행하는 역할을 많이 한다. 따라서 다음과 같이 파일을 만들면 된다.<br>
**Procfile**

```
web: appstart
```

두 번째로 `.ebextensions` 구성 파일을 만들어보자.<br>
Beanstalk은 시스템의 대부분을 AWS에서 자동으로 구성해준다. 그래서 사용자가 직접 커스텀하게 할 수 있도록 설정할 수 있는 방법이 바로 `.ebextensions` 디렉토리이다.<br>
해당 디렉토리에 `.config` 파일 확장자명을 가진 yaml 파일이나 json 형태의 파일을 두면 그에 맞게 Beanstalk 배포 및 환경 구성 시 사용하게 된다.<br>
`.ebextensions` 설정 파일 중 처음으로 만들어 줄 것은 Github Actions 으로 전달받은 deploy.zip 파일을 압축 풀고 어느 파일을 어떤 파라미터로 실행할 지 설정하는 파일이다. `java -jar application.jar` 하는 코드를 만든다고 이해하면 된다.<br>
**.ebextensions/00-makeFiles.config**

```
files:
    "/sbin/appstart" :
        mode: "000755"
        owner: webapp
        group: webapp
        content: |
            #!/usr/bin/env bash
            JAR_PATH=/var/app/current/application.jar

            # run app
            killall java
            java -Dfile.encoding=UTF-8 -jar $JAR_PATH
```

`.ebextensions` 구성 파일 중 두 번째로 만들 것은 time zone을 대한민국 서울 로컬 시간으로 설정하는 구성 파일이다. 반드시 필요한 구성은 아니기 때문에, 필요하다면 따라 만드는 것을 추천한다.<br>
**.ebextensions/00-set-timezone.config**

```
commands:  
  set_time_zone:  
    command: ln -f -s /usr/share/zoneinfo/Asia/Seoul /etc/localtime
```

마지막으로 `.platform` 디렉토리 내 `nginx` 구성 파일을 만들어보자.<br>
여기서 `nginx`는 리버스 프록시를 담당하여, 임베디드 톰캣으로 요청을 보내는 역할을 수행하게 된다.<br>
**.platform/nginx/nginx.conf**

```
user                    nginx;
error_log               /var/log/nginx/error.log warn;
pid                     /var/run/nginx.pid;
worker_processes        auto;
worker_rlimit_nofile    33282;

events {
    use epoll;
    worker_connections  1024;
}

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;

  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

  include       conf.d/*.conf;

  map $http_upgrade $connection_upgrade {
      default     "upgrade";
  }

  upstream springboot {
    server 127.0.0.1:8080;
    keepalive 1024;
  }

  server {
      listen        80 default_server;

      location / {
          proxy_pass          http://springboot;
          proxy_http_version  1.1;
          proxy_set_header    Connection          $connection_upgrade;
          proxy_set_header    Upgrade             $http_upgrade;

          proxy_set_header    Host                $host;
          proxy_set_header    X-Real-IP           $remote_addr;
          proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
      }

      access_log    /var/log/nginx/access.log main;

      client_header_timeout 60;
      client_body_timeout   60;
      keepalive_timeout     60;
      gzip                  off;
      gzip_comp_level       4;

      # Include the Elastic Beanstalk generated locations
      include conf.d/elasticbeanstalk/healthd.conf;
  }
}
```

Beanstalk 필수 구성 파일은 아니지만 한 가지 더 확인하면 좋은 부분은, 프로젝트 루트 폴더에서 `gradle/wrapper/gradle-wrapper.jar` 파일이 정상적으로 커밋이 되었는지도 확인해주면 좋다. Github Actions 에서 gradlew 명령어로 빌드할 때 필요하다.<br>

이것으로 Github Actions 및 애플리케이션 구성이 완료되었다.

## 4. AWS Beanstalk 배포 확인
위 프로젝트에서 Github Actions에 설정한 브랜치에 Push를 하게 되면 Github Repository > Actions 에서 배포 진행상황을 확인할 수 있다.

![Github_Actions_로그](https://i.imgur.com/49wMzvp.png)

Actions 진행이 완료되고, AWS Elastic Beanstalk 대시보드에 접속해보면 배포 변경 사항이 적용된 점도 확인할 수 있다.
