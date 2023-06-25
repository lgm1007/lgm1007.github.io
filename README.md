# 📌 Jekyll 블로그
### ✨ Install
1. Ruby 설치
2. 터미널에서 Ruby 설치 확인
```
$ ruby -v
```
3. 필요한 gem 패키지 설치
```
$ gem install jekyll bundler
```
4. jekyll 프로젝트 클론 후 클론받은 경로에서 Gemfile bundle 설치
    * 단, 에러 발생 시 `Gemfile.lock` 삭제 후 명령어 수행
```
$ bundle install
```
### 🚀 Execute
1. jekyll 프로젝트가 있는 경로에서 해당 명령어로 실행
```
$ bundle exec jekyll serve
```
