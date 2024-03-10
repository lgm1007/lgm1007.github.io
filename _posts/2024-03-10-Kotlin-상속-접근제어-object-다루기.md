---
layout:	post
title: Kotlin - 5.상속, 접근제어, object 다루기
date: 2024-03-10 13:13:33 +0900
image: language-kotlin.png
author: GyuMyung
tags: language
comments: true
---
# Kotlin 문법 배우기
### 코틀린에서 상속, 접근제어 및 object 다루기
#### 1. 상속
##### 추상 클래스
Animal이라는 추상클래스를 구현한 예제를 먼저 살펴보자. 자바로 먼저 살펴보면 다음과 같은 형태일 것이다. <br/>
```java
public abstract class Animal {
    protected final String species;
    protected final int legCount;
    
    public Animal(String species, int legCount) {
        this.species = species;
        this.legCount = legCount;
    }
    
    abstract public void cry();
    
    public String getSpecies() {
        return species;
    }
    
    public int getLegCount() {
        return legCount;
    }
}
```

형태는 Animal이라는 추상클래스 안에 `cry()`라는 추상메서드가 존재하는 형태이다. 위와 같은 예제 코드를 코틀린으로 변환해보자면 다음과 같다. <br/>
코틀린에서도 추상클래스 및 추상메서드를 작성할 때는 `abstract` 키워드를 사용하여 작성한다. <br/>
```kotlin
abstract class Animal(
    protected val species: String, 
    protected val legCount: int) {
    
    abstract fun cry()
}
```

그리고 위 Animal 추상클래스를 상속받은 하위 클래스를 작성해보겠다. 먼저 자바로는 다음과 같을 것이다. <br/>
```java
public class Dog extends Animal {
    public Dog(String species) {
        super(species, 4);
    }
    
    @Override
    public void cry() {
        System.out.println("멍멍!");
    }
}
```

코틀린으로 추상클래스를 상속받는 하위 클래스를 작성해보면 다음과 같다. <br/>
코틀린에서 상속을 받을 때는 **extends 키워드를 사용하지 않고 `class 클래스명(프로퍼티) : 상위클래스` 와 같은 형태로 작성**해준다. 또한 자바의 super 와 같이 상위클래스의 생성자에 접근하고자 할 때는, **상속받은 부분에서 클래스의 프로퍼티를 작성하는 것처럼 소괄호 안에 `(상위클래스 생성자에 넘겨줄 값)`을 작성**해준다. 또한 코틀린에서는 어떤 클래스를 상속받으면 **무조건 상위 클래스의 생성자를 바로 호출해줘야 한다.** <br/>
그리고 상위클래스에 있는 메서드를 상속받아 사용할 때는 자바처럼 `@Override` 어노테이션을 사용하는 게 아닌 **`override` 키워드를 따로 사용해야 한다.** 이 `override` 는 코틀린의 예약어이다. <br/>
```kotlin
class Dog(species: String) : Animal(species, 4) {
    
    override fun cry() {
        println("멍멍!")
    }
}
```

그럼 다음과 같은 자바의 Animal 하위 클래스가 있다고 해보자. 해당 하위 클래스만 가지고 있는 필드값인 `wingCount`가 있고, `getLegCount()`를 호출할 때 `legCount`와 `wingCount`를 더한 값을 반환한다고 해보자. <br/>
```java
public class Duck extends Animal {
    private final int wingCount;
    
    public Duck(String species) {
        super(species, 2);
        this.wingCount = 2;
    }
    
    @Override
    public void cry() {
        System.out.println("꽥꽥");
    }
    
    @Override
    public int getLegCount() {
        return super.legCount + this.wingCount;
    }
}
```

위의 클래스를 코틀린으로 변환해보겠다. <br/>
```kotlin
abstract class Animal(
    protected val species: String,
    protected open val legCount: int) {     // legCount 프로퍼티를 override해주게 하기 위해 open 추가

    abstract fun cry()
}

class Duck(species: String) : Animal(species, 2) {
    
    private val wingCount: Int = 2
    
    override fun cry() {
        println("꽥꽥")
    }
    
    override val legCount: Int                      // legCount는 프로퍼티처럼 보여져야 함
        get() = super.legCount + this.wingCount     // 커스텀 getter() 로 getLegCount 재정의
}
```

주의할 점으로는 코틀린에서는 **상위 클래스의 프로퍼티를 override하기 위해서는 추상 프로퍼티가 아니라면 상위 클래스에서 해당 프로퍼티에 대해 override 할 수 있다는 의미로 `open` 을 붙여줘야 한다.** 또한 상위클래스의 프로퍼티에서 자동으로 만들어진 getter와 같은 메서드를 override할 때는 하위 클래스에서 **override 키워드와 커스텀 getter를 사용하여 재정의한다.**<br/>
자바와 코틀린 모두 동일한 점은 추상클래스를 인스턴스화 할 수 없다는 점이다. <br/>

##### 인터페이스
먼저 Flyable이라는 인터페이스와 Swimmable이라는 인터페이스를 예제로 구현해 볼 것이다. 자바로 구현한 형태는 다음과 같다. <br/>
자바는 JDK8부터 default 메서드를 인터페이스에 추가할 수 있다. <br/>
```java
public interface Flyable {
    default void act() {
        System.out.println("파닥 파닥");
    }
    
    void fly();
}

public interface Swimmable {
    default void act() {
        System.out.println("첨벙 첨벙");
    }
    
    void swim();
}
```

위 인터페이스들을 코틀린으로 변환해보겠다. <br/>
```kotlin
interface Flyable {
    fun act() {
        println("파닥 파닥")
    }
    
    fun fly()
}

interface Swimmable {
    fun act() {
        println("첨벙 첨벙")
    }
    
    fun swim()
}
```

그러면 위 인터페이스를 구현한 구현체를 작성해보자. 먼저 자바로 작성한 구현체인 Duck 클래스는 다음과 같을 것이다. <br/>
```java
public class Duck extends Animal implements Flyable, Swimmable {
    @Override
    public void act() {
        Flyable.super.act();
        Swimmable.super.act();
    }
    
    @Override
    public void fly() {
        System.out.println("파닥 파닥");
    }
    
    @Override
    public void swim() {
        System.out.println("첨벙 첨벙");
    }
}
```

위 인터페이스 구현체 클래스를 코틀린으로 변환해보겠다. 코틀린에서 인터페이스를 구현할 때는 상속과 동일하게 `클래스명() : 인터페이스` 형태로 작성한다. 만약 해당 클래스가 어떠한 상위 클래스를 상속받는 하위 클래스라면 `콤마(,)`로 구분하여 상위클래스 뒤에 인터페이스를 작성해도 된다. <br/>
```kotlin
class Duck(species: String) : Animal(species, 2), Flyable, Swimmable {
    
    private val wingCount: Int = 2
    
    override fun cry() {
        println("꽥꽥")
    }
    
    override val legCount: Int
        get() = super.legCount + this.wingCount
    
    override fun act() {
        super<Flyable>.act()
        super<Swimmable>.act()
    }
    
    override fun fly() {
        println("파닥 파닥")
    }
    
    override fun swim() {
        println("첨벙 첨벙")
    }
}
```

자바와 문법적으로 다른 점은 코틀린에서는 **인터페이스의 중복되는 메서드명을 특정할 때는 `super<인터페이스 타입>.함수`와 같이 작성한다.** <br/>
자바와 코틀린 모두 동일한 점은 인터페이스를 인스턴스화 할 수 없다는 점이다. <br/><br/>
코틀린에서의 인터페이스 특징으로는 **backing field가 없는 프로퍼티를 인터페이스에 만들 수 있다는 점**이다. 이에 대해 자세히 살펴보자면 이런 것이다. <br/>
```kotlin
interface Flyable {
    val flyAbility: Int     // 인터페이스에 val로 선언한 프로퍼티 생성
    
    fun act() {
        println("파닥 파닥")
    }
    
    fun fly()
}

class Duck(species: String) : Animal(species, 2), Flyable, Swimmable {

    // 생략
    
    override val flyAbility: Int
        get() = 10          // 인터페이스에서 생성한 프로퍼티의 getter 재정의
}
```

이렇게 생성한 인터페이스의 프로퍼티는 인터페이스 내에서 자유롭게 쓰일 수 있다. 구현체에서 override 해줄 것이라 생각하고 사용하는 것이다. <br/>
아니면 다음과 같이 인터페이스에서 커스텀 getter로 직접 정의해줄 수도 있다. <br/>

```kotlin
interface Flyable {
    val flyAbility: Int
        get() = 10
    
    fun act() {
        println("파닥 파닥")
    }
    
    fun fly()
}
```

##### ※ 클래스 상속 시 주의점
먼저 다음 코틀린 코드를 살펴보자. 해당 예제에서의 Base클래스와 Derived 클래스는 추상클래스도 인터페이스도 아니다. <br/>
```kotlin
open class Base(open val number: Int = 100) {
    init {
        println("Base Class")
        println(number)
    }
}

class Derived(
    override val number: Int
) : Base(number) {
    init {
        println("Derived Class")
    }
}
```

우선 Base 클래스 자체와 `number`라는 프로퍼티도 다른 클래스에서 상속이 가능하도록 `open`을 추가해주었다. 그래서 Derived 클래스에서 Base 클래스와 `number` 프로퍼티를 상속 및 override할 수 있었다. <br/>
각 클래스의 init 블록을 보면, Base 클래스에서는 Base Class 라는 문구와 number 값을 출력하도록 되어 있고, Derived 클래스에서는 Derived Class 라는 문구를 출력하도록 되어 있다. 그러면 만약 Derived 클래스를 인스턴스화하면 어떻게 될까? <br/>
```kotlin
fun main() {
    Derived(300)
}

open class Base(open val number: Int = 100) {
    init {
        println("Base Class")
        println(number)
    }
}

class Derived(
    override val number: Int
) : Base(number) {
    init {
        println("Derived Class")
    }
}
```

이와 같이 `Derived(300)`으로 Derived 클래스를 인스턴스화하면 콘솔에는 다음과 같이 출력된다. <br/>
```
Base Class
0
Derived Class
```

실행 순서는 상위 클래스의 init 블록 먼저 실행된 것을 볼 수 있다. 그런데 **number 값이 0이 들어간 부분**이 이상하지 않은가? Derived 클래스를 인스턴스화할 때 설정해 준 300 값도 아니고 Base 클래스에서 초기화해준 100 값도 아니다. 왜 그럴까? <br/>
Derived 클래스를 인스턴스화한다는 말은 Derived에 있는 `number`에 값을 설정해준다는 의미인데, 이 때 상위클래스인 Base 클래스에서 **`open`키워드로 상속을 열어놓은 `number`를 호출하게 되면 하위 클래스에 있는 `number`를 getter로 가져오려고 한다.** 이렇게 하위 클래스에서 `number`를 get 해오려 하지만 아직 하위 클래스의 `number`에 대한 초기화가 이루어지기 전 시점이라서 Int의 기초값인 0 값을 가져오게 되는 것이다. <br/>
따라서 **상위클래스의 생성자와 init 블록에서는 `open`으로 override를 열어놓은 프로퍼티에 접근하면 안 된다.** 그래서 상위클래스를 설계할 때 생성자나 init 블록에서 사용되는 프로퍼티는 `open`을 하지 않도록 주의해야 한다. <br/>

##### 상속 관련 지시어 정리
1. **final**: override를 할 수 없게 한다. default로 보이지 않게 한다.
2. **open**: override를 열어준다.
3. **abstract**: 반드시 override 해야 한다.
4. **override**: 상위 타입을 override 하고 있다.

#### 2. 접근 제어
코틀린에서도 자바와 비슷하게 접근 제어를 다루기 위한 지시어가 존재하는데 이러한 부분에 대해 자세히 알아보자. <br/>

##### 자바와 코틀린의 가시성 제어
먼저 자바에서의 접근 제어를 살펴보자. <br/>

|public|protected|default|private|
|---|---|---|---|
|모든 곳에서 접근 가능|같은 패키지 또는 하위 클래스에서만 접근 가능|같은 패키지에서만 접근 가능|선언된 클래스 내에서만 접근 가능|
<br/>
이러한 접근 제어가 코틀린에서는 조금 바뀐 점이 있는데, 다음은 코틀린에서의 접근 제어 및 설명이다. <br/>

|public|protected|internal|private|
|---|---|---|---|
|모든 곳에서 접근 가능|선언된 클래스 또는 하위 클래스에서만 접근 가능|같은 모듈에서만 접근 가능|선언된 클래스 내에서만 접근 가능|


코틀린에서의 **protected는 같은 패키지가 아니라 선언된 클래스에서만 접근 가능하도록 변경**되었다. 즉, 같은 패키지가 빠졌다고 보면 된다. 또한 default가 사라지고 **internal**이라는 새로운 접근 제어가 생겼는데, 이는 default 처럼 같은 패키지가 아닌 같은 모듈에서만 접근 가능하다는 의미이다. 여기서 **모듈이라 하면 한 번에 컴파일되는 코틀린 코드를 의미**하며 예시로는 IDEA Module, Maven Project, Gradle Source Set 등이다. <br/>
왜냐하면 코틀린에서는 **패키지를 namespace를 관리하기 위한 용도로만 사용하지 가시성 제어에는 사용되지 않기 때문**이다. <br/>
그리고 자바에서는 접근 지시어를 아무것도 붙이지 않으면 기본으로 default 접근 지시어가 되었는데, 코틀린에서는 **public**이 기본 접근 지시어라는 점도 다른 점이다. <br/>

##### 코틀린 파일의 접근 제어
코틀린은 `.kt` 파일에 변수, 함수, 클래스 여러 개를 바로 만들 수 있다. <br/>
```kotlin
// 하나의 .kt 파일 내부

val num = 3

fun square(num: Int): Int {
    return num * num
}

class NumberHandler(val num: Int)
```

접근 제어 중 protected 접근 지시어는 파일(최상단)에는 사용할 수 없다. 즉 위 예제에서 `protected val num = 3` 과 같이는 사용할 수 없다는 것이다. 그 이유는 protected는 선언된 클래스나 하위 클래스에서 작동하는 지시어이므로 파일은 클래스가 아니기 때문이다. <br/>

##### 다양한 구성요소의 접근 제어
먼저 생성자에서의 접근 제어를 알아보자. <br/>
생성자도 가시성 범위는 동일하다. 단 생성자에 접근 지시어를 붙이려면 `constructor` 키워드는 꼭 붙여줘야 한다. <br/>
```kotlin
class NumberHandler private constructor(val num: Int)
```

그리고 자바에서 주로 유틸성 코드를 만들 때 abstract class + private constructor를 사용해서 인스턴스화를 막았는데, 코틀린에서도 똑같이 가능하나, 파일 최상단에 유틸 함수를 만들면 이와 동일한 효과를 낼 수 있다. <br/>
예를 들어 자바의 유틸성 코드가 다음과 같이 있다고 해보자. <br/>
```java
public abstract class StringUtils {
    private StringUtils() {}
    
    public boolean isDirectoryPath(String path) {
        return path.endWith("/");
    }
}
```

이를 코틀린에서는 그냥 파일의 최상단에 유틸성 함수를 작성해주는 것으로 작성할 수 있는 것이다. <br/>
이렇게 파일 최상단에 함수로 작성하면 자바 코드로 변환해보면 파일명이 클래스 이름이 되고 그 클래스 안에 static 함수로 작성되어진다. <br/>
```kotlin
fun isDirectoryPath(path: String): Boolean {
    return path.endsWith("/")
}
```

다음으로 프로퍼티에서의 접근 제어를 알아보겠다. 프로퍼티의 가시성을 제어하는 방법으로는 **2 가지**가 있다. <br/>
첫 번째로는 getter, setter 한 번에 접근 지시어를 정하는 방법으로, 프로퍼티의 val 또는 var 앞에 바로 접근 지시어롤 붙이는 방법이다. <br/>
```kotlin
class Dog(
    internal val species: String
)
```

두 번째는 getter나 setter 각각에 가시성을 부여해주는 방법이다. 예를 들어 getter는 public으로 두고 setter는 private으로 두고자 한다면 다음과 같이 접근 지시어를 추가해줄 수 있다. <br/>
```kotlin
class Dog(
    val name: String,
    _age: Int
) {
    
    var age = _age      // var age는 public으로 age의 getter는 public
        private set     // setter는 private
}
```

##### Java와 Kotlin을 함께 사용할 경우 주의할 점
먼저 코틀린에서는 internal 이라는 접근 제어가 새로 생겼는데 이는 자바 코드로 변환하게 되면 public이 된다. 그래서 자바에서는 코틀린의 internal 지시어를 가져올 수 있다. <br/><br/>
그리고 코틀린에서의 protected는 자바에서의 protected와 의미가 다르다. 따라서 자바는 같은 패키지의 코틀린 proteced 멤버에 접근 가능하다. <br/>

#### 3. object
##### static 함수와 변수
먼저 자바에서 static 함수와 변수를 사용한 예제 클래스를 살펴보자. <br/>
다음 예제를 살펴보면 static 변수 하나, 그리고 **정적 팩토리 메서드**라고 불리는 static 함수가 존재한다. <br/>
```java
public class Person {
    private static final int MIN_AGE = 0;
    
    public static Person newBaby(String name) {
        return new Person(name, MIN_AGE);
    }
    
    private String name;
    private int age;
    
    private Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
}
```

이러한 클래스를 코틀린으로 변환해보겠다. <br/>
```kotlin
class Person private constructor(var name: String, var age: Int) {
    
    companion object {
        const val MIN_AGE = 0
        fun newBaby(name: String) {
            return Person(name, MIN_AGE)
        }
    }
}
```

코틀린에서는 static이라는 지시어가 없기 때문에 **companion object**, 즉 동행 객체라는 것을 사용해서 static과 비슷하게 사용한다. <br/>
이는 static은 클래스에 고정적인 필드 또는 메서드를 선언할 때 사용하는 키워드로, 클래스 로더가 클래스를 로딩하여 메서드 메모리 영역에 적재할 때 클래스별로 관리하게 된다. 그래서 클래스의 로딩이 끝나는 즉시 바로 사용이 가능하다. <br/>
companion object (동행 객체) 또한 **클래스와 동행하는 유일한 오브젝트** 라는 의미로 자바의 정적 필드와 정적 메서드처럼 **클래스와 함께 관리되는 오브젝트**라고 이해하면 된다. 따라서 정적 필드나 정적 메서드처럼 사용 가능하다. <br/>
또한 `val MIN_AGE` 변수 앞에 `const`라는 처음보는 키워드가 붙어있는 걸 볼 수 있는데, 이 `const`라는 키워드를 붙이지 않고 그냥 `val MIN_AGE = 0`이라고 하면 런타임 시 변수가 할당된다. 하지만 **`const` 키워드를 앞에 붙이게 되면 컴파일 시 변수가 할당된다.** 즉 const는 진짜 상수에 붙이기 위한 용도이며, 기본 타입과 String 타입에 붙일 수 있다. <br/><br/>
companion object는 하나의 객체로 간주한다. 그래서 이름을 붙일 수도 있고, interface를 구현할 수도 있다. 아래는 companion object에 Factory라는 이름을 붙여주고, Log 라는 인터페이스를 구현한 모습이다. <br/>
```kotlin
interface Log {
    fun log()
}

class Person private constructor(var name: String, var age: Int) {
    
    companion object Factory : Log {
        const val MIN_AGE = 0
        fun newBaby(name: String) {
            return Person(name, MIN_AGE)
        }
        
        override fun log() {
            println("Person 클래스의 동행 객체 Factory")
        }
    }
}
```

코틀린에서 companion object 값을 가져올 때는 그냥 `클래스명.필드명` 또는 `클래스명.함수명` 과 같이 선언하여 가져오면 된다. 위 예제에서 본다면 `Person.newBaby("홍길동")`이 될 것이다. <br/>
그러면 자바에서 코틀린의 companion object 내 값을 호출하고자 할 때는 어떻게 사용할까? companion object에 이름이 없을 때와 있을 때의 예제로 살펴보면 다음과 같다. <br/>
```java
public static void main(String[] args) {
    Person person = Person.Companion.newBaby("홍길동");    // companion object 이름이 없을 때
    Person person = Person.Factory.newBaby("홍길동");      // companion object 이름이 있을 때
}
```

그리고 만약 companion object 내 필드나 메서드에 `@JvmStatic` 어노테이션을 붙여준다면 자바에서 정적 변수나 정적 메서드를 호출하는 것처럼 바로 호출도 가능하다. <br/>
```kotlin
class Person private constructor(var name: String, var age: Int) {
    
    companion object {
        const val MIN_AGE = 0
        
        @JvmStatic
        fun newBaby(name: String) {
            return Person(name, MIN_AGE)
        }
    }
}
```
```java
public static void main(String[] args) {
    Person person = Person.newBaby("홍길동");
}
```

##### 싱글톤
싱글톤은 단 하나의 인스턴스만을 가지는 클래스이다. 코틀린에서 싱글톤은 object 만을 붙여주면 간단하게 만들 수 있다. <br/>
```kotlin
object Singleton {
    var a: Int = 0
}
```

이렇게 만들어주면 Singleton은 하나의 인스턴스만을 가지는 클래스가 되며, 사용할 때는 다음과 같이 사용할 수 있다. <br/>
애당초 하나의 인스턴스만을 가지므로 Singleton에 대해 인스턴스화를 하는 게 아니라 바로 내부 구성요소에 접근하는 것이다. <br/>
```kotlin
fun main() {
    println(Singleton.a)
    Singleton.a += 10
    println(Singleton.a)
}
```

##### 익명 클래스
익명 클래스는 특정 인터페이스나 클래스를 상속받은 구현체를 일회성으로 사용하고자 할 때 쓰는 클래스를 의미한다. 먼저 자바의 예시를 보면 다음과 같다. <br/>
```java
public static void main(String[]args){
    moveSomething(new Movable() {
        @Override
        public void move() {
            System.out.println("움직이다.");
        }
        
        @Override
        public void fly() {
            System.out.println("난다.");
        }
    });
}

private static void moveSomething(Movable movable) {
    movable.move();
    movable.fly();
}
```

코드를 살펴보면 Movable 이라는 인터페이스를 구현한 클래스를 인스턴스화해서 사용하는 게 아니라 `new Movable()` 하고 중괄호 쳐서 그 안에 인터페이스를 구현하는 식으로 일회성 익명클래스를 사용하고 있다. <br/>
그럼 이 코드를 코틀린으로 변환해보겠다. <br/>
```kotlin
fun main() {
    moveSomething(object : Movable {
        override fun move() {
            println("움직이다.")
        }
        
        override fun fly() {
            println("난다.")
        }
    })
}

private fun moveSomething(movable: Movable) {
    movable.move()
    movable.fly()
}
```

코틀린에서 익명클래스를 구현할 때는 **인터페이스 또는 클래스를 구현 또는 상속한 object**를 사용해서, 해당 object 안에서 메서드를 override 하는 식으로 작성한다. <br/>
즉 자바에서는 `new 타입이름() {}`, 코틀린에서는 `object : 타입이름 {}` 으로 익명클래스를 작성한다는 차이점이 있다.
