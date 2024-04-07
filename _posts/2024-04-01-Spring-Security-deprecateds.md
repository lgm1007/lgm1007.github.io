---
layout:	post
title: Spring Security 6.1.0 버전 이상부터 메서드 체이닝 사용 지양 이슈
date: 2024-04-01 21:30:51 +0900
image: troubleshooting-3.jpg
author: GyuMyung
tags: troubleshooting
comments: true
---

# Spring Security 6.1.0 버전 이상에서의 메서드 체이닝 사용 지양 이슈
### 배경 설명
Spring Security 6.1.0 버전부터는 메서드 체이닝을 사용하는 방법은 지양하고 대신 람다식을 통해 함수형으로 사용하도록 변경되었다.

### 해결 방안과 예제
먼저 아래는 6.1.0 이전 버전에서 메서드 체이닝을 사용하여 SecurityFilterChain을 설정해주던 코드이다. <br/>
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
    httpSecurity
        .csrf().disable()
        .headers().frameOptions().disable()
        .and()
        .authorizeHttpRequests()
        .requestMatchers("/", "/login/**", "/signup/**").permitAll()
        .requestMatchers(PathRequest.toH2Console()).permitAll()
        .anyRequest().authenticated();
    
    return httpSecurity.build();
}
```

하지만 Spring Security 6.1.0 버전 이상부터 위와 같이 작성하면 IDE에서 에러로 판단할 것이다. 아래 에러 메시지와 함께 말이다. <br/>
`...is deprecated and marked for removal` <br/>
Spring Security 6.1.0 이상 버전부터는 다음과 같이 함수형으로 작성해주도록 한다는 점을 유념하자. <br/>
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception{
    httpSecurity
        .csrf(CsrfConfigurer<HttpSecurity>::disable)
        .headers(headersConfig -> headersConfig.frameOptions(
                HeadersConfigurer.FrameOptionsConfig::disable
            )
        )
        .authorizeHttpRequests(authorizeRequests ->
            authorizeRequests
                .requestMatchers("/", "/login/**", "/signup/**").permitAll()
                .requestMatchers(PathRequest.toH2Console()).permitAll()
                .anyRequest().authenticated()
        );
    
    return httpSecurity.build();
}
```
