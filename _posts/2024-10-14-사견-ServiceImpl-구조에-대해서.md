---
layout:	post
title: 인터페이스가 Even하게 익지 않았어요 (ServiceImpl 구조에 대한 사견)
date: 2024-10-14 19:49:57 +0900
image: not_even_interface.jpg
author: GyuMyung
tags: architect
comments: true
---

## 사견) Service를 추상화하는 것은 좋은 구조는 아니라고 생각한다.
### 1. 추상화를 하는 이유가 모호하다.
우리가 추상화를 사용하는 이유는 이를 의존하는 대상을 보호하기 위해 한다고 생각한다. 이 관점에서 볼 때 Service 인터페이스를 의존하는 Controller를 보호하는 느낌이 든다. 하지만 “Controller가 애플리케이션에서 보호해야 할 대상인가?” 라고 생각해봤을 때 개인적으로 “글쎄…”라고 생각한다. <br/>

흔한 Controller는 Service에서 수행하는 비즈니스 로직의 결과에 대해 응답을 반환해주고, 비즈니스 로직에서 발생하는 예외에 대해 에러 응답을 내려주는 정도의 역할을 수행한다. 즉 Controller가 주체적으로 하는 업무는 Service에게 동작을 수행하라고 요청하는 정도의 작업을 한다고 볼 수 있다. <br/>

따라서 애플리케이션에서 Controller는 보호해야 할 대상이 아니라고 판단되어 Service 추상화의 의미가 없다고 생각한다. <br/>


### 2. Service : ServiceImpl 은 보통 1:1 관계이며, 이 관계가 변할 가능성이 적다.
인터페이스를 사용하는 또 다른 이유로 다형성 효과를 주기 위함도 있다. 하지만 인터페이스 하나에 구현체 하나인 구조는 다형성을 제공하는 효과도 없다. 그렇다고 하나의 구현체를 가지는 인터페이스는 필요가 없다고 하는 것은 아니다. 앞으로 구현체가 추가될 가능성이 큰 경우에는 당장 구현체가 하나이더라도 해당 인터페이스는 필요하다. <br/>

대표적인 예시로 메신저와 연동하는 시스템이 있다. 당장 연동이 필요한 메신저가 카카오톡이라 카카오톡과 연동하는 구현체를 두었지만, 추후 다른 메신저와 연동하는 구현체가 추가될 가능성이 높은 경우이다. <br/>

일반적으로 Service 인터페이스는 ServiceImpl 구현체와 1:1 관계이며, 이 관계가 변할 가능성이 매우 적다. 그리고 설령 구현체가 두 개 이상이라고 하더라도 Service는 인터페이스로서 사용하기 힘든데, 그 이유는 아래와 같다. <br/>


### 3. 인터페이스의 책임이 너무 많다.
개인적으로 가장 중요하다고 생각하는 이유이다. 기본적으로 어떤 도메인의 Service 인터페이스는 그 책임이 너무 많다. 다음과 같은 예제를 보자. <br/>

```java
public interface BoardService {
    Board getBoardById(Long boardId);

    Board getBoardByUserId(Long userId);

    List<Board> getBoardTopView(int limit);

    Board postBoard(BoardDto boardDto);

    Board updateBoardContent(BoardDto boardDto);

    void deleteBoard(Long boardId);
}
```

예제인 BoardService 인터페이스는 Board라는 도메인에 대한 전반적인 CRUD의 책임을 하고 있다. 만약 해당 인터페이스의 구현체가 2개 이상이 있다고 해서 각 구현체에서 `getBoardById` 라던가 `getBoardTopView` 등 이러한 메서드들이 다른 기능을 수행할까? 이 메서드들을 다른 구현체에서 구현한다고 해도 결국 동일한 동작을 수행할 것이다. `getBoardById`는 Board의 Id 값으로 Board를 찾는 동작이 될 것이고, `getBoardTopView`는 가장 조회수가 많은 게시물 목록을 찾는 동작을 할 것이다. <br/>

이는 SOLID 원칙 중 인터페이스 분리 원칙 (ISP)에 어긋나는 방식이기도 하다. 인터페이스는 더 중요하게 다뤄야 한다는 게 내 생각이다.
