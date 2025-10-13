---
layout:	post
title:  템플릿 메서드 패턴 이해
date:   2023-07-29 11:15:00 +0900
image:  design-pattern-3.png
author: GyuMyung
tags:   design-pattern
comments: true
---

## 템플릿 메서드 패턴 이해
### 핵심 기능 vs 부가 기능
* 핵심 기능
  * 해당 객체가 제공하는 고유의 기능
* 부가 기능
    * 핵심 기능을 보조하기 위해 제공하는 기능
<br/>
 
좋은 설계는 **핵심 기능과 부가 기능을 분리**하는 것이다. <br/>
템플릿 메서드 패턴(Template Method Pattern)은 이런 문제를 해결해주는 디자인 패턴이다. <br/>

### 템플릿 메서드 패턴

템플릿 메서드 패턴은 핵심 기능과 부가 기능을 분리하여 재사용성과 확장성을 향상시키는 디자인 패턴이다. <br/>

핵심 기능은 추상 클래스에 정의되어 있으며, 부가 기능은 서브 클래스에서 구현된다. 이렇게 구현함으로써 핵심 기능이 변경되지 않고, 부가 기능만 변경하여 다양한 동작을 구현할 수 있게 된다. <br/>

### 템플릿 메서드 패턴 - 예제 1

아래 예제는 템플릿 메서드 패턴을 사용하여 음료 제조 과정을 구현한 예제이다. <br/>


핵심 기능을 정의하는 추상 클래스
```java
public abstract class BeverageMaker {
    
    // 템플릿 메서드 - 핵심 기능
    public final void makeBeverage() {
        boilWater();
        brew();
        pourInCup();
        addCondiments();
    }
    
    // 공통 기능
    private void boilWater() {
        System.out.println("물을 끓입니다.");
    }
    
    // 추상 메서드 - 각 음료 별 다른 기능
    protected abstract void brew();
    
    // 공통 기능
    private void pourInCup() {
        System.out.println("컵에 따릅니다.");
    }
    
    // 추상 메서드 - 각 음료 별 다른 기능
    protected abstract void addCondiments();
}
```
<br/>

서브클래스로 각 음료에 대한 구체적인 기능 구현
```java
public class CoffeeMaker extends BeverageMaker {
    
    @Override
    protected void brew(){
        System.out.println("커피를 우려냅니다.");
    }
    
    @Override
    protected void addCondiments() {
        System.out.println("설탕과 우유를 첨가합니다.");
    }
}

public class TeaMaker extends BeverageMaker {
    
    @Override
    protected void brew() {
        System.out.println("차를 우려냅니다.");
    }
    
    @Override
    protected void addCondiments() {
        System.out.println("레몬을 추가합니다.");
    }
}
```
<br/>

메인 클래스에서 템플릿 메서드를 사용해 음료 제조
```java
public class Main {
    public static void main(String[] args) {
        BeverageMaker coffeeMaker = new CoffeeMaker();
        coffeeMaker.makeBeverage();

        System.out.println();

        BeverageMaker teaMaker = new TeaMaker();
        teaMaker.makeBeverage();
    }
}
```
<br/>

실행 결과
```
물을 끓입니다.
필터를 통해 커피를 우려냅니다.
컵에 따릅니다.
설탕과 우유를 추가합니다.

물을 끓입니다.
차를 우려냅니다.
컵에 따릅니다.
레몬을 추가합니다.
```

위 예제에서 `BeverageMaker` 클래스가 템플릿 메서드인 `makeBeverage()`를 제공하고, 그 안에서 다른 추상 메서드인 `brew()`와 `addCondiments()`가 호출된다. <br/>
이러한 추상 메서드는 각 음료(커피, 차 등)에 따라 서브 클래스에서 다른 구현을 제공한다. <br/>
이러함으로써 핵심 기능(`makeBeverage()`)은 변하지 않고, 부가 기능(`brew()`, `addCondiments()`)만 변경하여 다양한 음료를 만들 수 있다. <br/>

### 템플릿 메서드 패턴 - 예제 2

아래 예제는 템플릿 메서드 패턴을 사용하여 전투 시뮬레이션 게임을 구현한 예제이다. <br/>

핵심 기능을 정의하는 추상 클래스
```java
public abstract class BattleSimulation {
    
    // 템플릿 메서드 - 전투 시뮬레이션
    public final void simulateBattle() {
        prepareUnits();
        startBattle();
        endBattle();
    }
    
    // 추상 클래스 - 각 유닛 별 다른 기능
    protected abstract void prepareUnits();
    
    // 핵심 기능 - 전투 시작
    private void startBattle() {
        System.out.println("전투가 시작됩니다.");
    }
    
    // 핵심 기능 - 전투 종료
    private void endBattle() {
        System.out.println("전투가 종료되었습니다.");
    }
}
```
<br/>

서브클래스로 각 유닛에 대한 구체적인 기능 구현
```java
public class InfantryBattle extends BattleSimulation {
    
    @Override
    protected void prepareUnits() {
        System.out.println("보병들이 전투 준비가 되었습니다.");
    }
}

public class TankBattle extends BattleSimulation {
    
    @Override
    protected void prepareUnits() {
        System.out.println("탱크가 전투 준비가 되었습니다.");
    }
}
```
<br/>

메인 클래스에서 템플릿 메서드를 사용하여 전투 시뮬레이션
```java
public class Main {
    public static void main(String[] args) {
        BattleSimulation infantryBattle = new InfantryBattle();
        infantryBattle.simulateBattle();

        System.out.println();

        BattleSimulation tankBattle = new TankBattle();
        tankBattle.simulateBattle();
    }
}
```
<br/>

실행 결과
```
보병들이 전투 준비를 합니다.
전투가 시작됩니다.
전투가 종료되었습니다.

탱크들이 전투 준비를 합니다.
전투가 시작됩니다.
전투가 종료되었습니다.
```

위 예제에서 `BattleSimulation` 클래스가 템플릿 메서드인 `simulateBattle()`을 제공하고, 그 안에서 추상 메서드인 `prepareUnits()`가 호출된다. <br/>
이러한 추상 메서드는 각 유닛(보병, 탱크 등)에 따라 서브클래스에서 다른 기능을 제공한다. <br/>
이러함으로써 핵심 기능(`simulateBattle()`)은 변하지 않고, 부가 기능(`prepareUnits()`)만 변경하여 다양한 전투 시뮬레이션을 만들 수 있다. <br/>

