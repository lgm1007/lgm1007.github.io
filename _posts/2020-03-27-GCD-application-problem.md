---
layout:	post
title:  Greatest common measure depth problem
date:   2020-03-27 12:02:15 +0900
sitemap: 
image:  algorithm-2.png
author: GyuMyung
tags:   algorithm
comments: true
---



# 최대공약수 응용 문제

## 원하는 개수의 정수들의 최대공약수

#### 3개 이상 정수의 최대공약수 구하기

- 예를 들어 24, 15, 48 세 수의 최대공약수를 구한다고 가정한다면 먼저 **최소값**을 구해준다. (예제는 15)
- 최소값으로 각 정수를 나눈 **나머지값**을 비교해서 그 수가 **모두 0**일 경우 최소값이 최대공약수가 된다.
- 만약 나머지값이 모두 0이 아니라면 **최소값을 1씩 감소**시켜가며 계속 나머지값을 비교해가며 모두 0이 나올때까지 반복한다.



#### Java 코드로 구현한 문제

```java
// 받은 정수들 중 최소값을 구하기 위한 순차정렬
//number = 사용자에게 받은 정수들의 개수
static void sort(int arr[], int number) {
    
    int least, tmp, i;
    for(i = 0;i < number - 1; i++) {
        least = arr[i];
        for(int j = i + 1;j < number; j++) {
            if(least > arr[j]) {
                tmp = arr[j];
                arr[j] = least;
                least = tmp;
            }
            arr[i] = least;
        }
    }
    
}
```

```java
public class getGCD {
    
    Scanner sc = new Scanner(System.in);
    System.out.print("최대공약수를 구할 숫자들의 개수를 입력해주세요: ");
    int number = sc.nextInt();
    
    int[] arr = new int[number];
    System.out.print("정수들을 입력해주세요: ");
    for(int i = 0; i < number; i++) {
        arr[i] = sc.nextInt();
    }
    
    sort(arr, number);
    
    //정수들 중 최소값 = arr[0]
    int min = arr[0], result;
    for(int i = 1; i < number; i++) {
        //최소값으로 나누어지면 다음 정수로 넘어감
        if((arr[i] % min) == 0)
            continue;
        else {
            //나누어떨어지지 않으면 -1 감소 후 i = 0으로 하여 처음 정수부터 반복 다시 실행
            min--;
            i = 0;
            continue;
        }
    }
    //최종적으로 생성되는 min값이 최대공약수
    result = min;
    System.out.println("입력한 정수들의 최대공약수는 "+result+" 입니다.");
    
}
```

- 코딩을 짜면서 중요하게 여겨야 할 점은 **모든 나머지값이 0일 때 나누었던 값**을 구해야 한다는 점이다.
- 즉 정수 중 하나라도 나누어 떨어지지 않으면 다시 `인덱스 i`를 처음으로 되돌려 값들을 재반복하며 비교해야 하는 점을 주의하자

