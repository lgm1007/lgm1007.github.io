---
layout:	post
title:  Strassen Algorithm
date:   2020-04-05 19:02:00 +0900
image:  post-10.png
author: GyuMyung
tags:   algorithm
comments: true
---

## 일반적인 행렬의 곱

#### Naive matrix multiplication

* 일반적인 행렬을 구하는 방식
* m * n 행렬과 n * k 행렬을 곱하면 `O(mnk)` 가 되어 결과적으로 `O(n^3)`의 시간복잡도를  가진다.

![](http://yimoyimo.tk/images/strassen1.png)

```c
for(int i = 0; i < size; i++)
{
    for(int j = 0; j < size; j++) {
        for(int k = 0; k < size; k++) {
            C[i][j] += A[i][k] * B[k][j];
        }
    }
}
```

## 슈트라센 알고리즘

#### 분석 / 풀이

* 슈트라센 알고리즘은 독일의 수학자 슈트라센이 1969년에 만든 `행렬 곱셈 알고리즘`으로 기존 방식에 비해 시간복잡도가 낮은 `O(n^2.807)`의 복잡도를 보여준다.
* 행렬 C는 행렬 A와 B의 연산으로 이루어지며 행렬 A와 B는 `2n * 2n`의 크기를 지닌다. (n은 임의의 정수) 만약 2n * 2n이 아닐 경우 빈 자리를 0으로 채워 2n * 2n꼴로 만들고 슈트라센 행렬 곱을 진행한다.
* 즉 행렬 A, B, C는 서로 크기가 같은 4개의 부분 행렬로 분할 가능하다.

![](http://yimoyimo.tk/images/strassen2.png)

* A, B 행렬을 각각 4개씩 총 8개의 부분행렬로 분할 후 슈트라센 알고리즘 연산을 수행한다. 기존에 행렬곱은 단순히 8번의 곱셈과 4번의 덧셈이 필요했겠지만, 슈트라센 알고리즘은 7번의 곱셈과 18번의 덧셈/뺄셈을 필요로 한다. 컴퓨터 입장에서는 곱셈 연산이 덧셈/뺄셈 연산보다 부담이 크므로 슈트라센 알고리즘이 더 좋은 방식이라 할 수 있다.
* 슈트라센 알고리즘에 따라 다음 7개의 수식으로 C를 표현

![](http://yimoyimo.tk/images/strassen3.png)



#### Java 코드로 구현한 슈트라센 알고리즘

```java
import java.util.Scanner;

public class Strassen
{
    //행렬 곱 함수
    public int[][] multiply(int[][] A, int[][] B)
    {
        int n = A.length;
        int[][] R = new int[n][n];
        
        if(n == 1)
            R[0][0] = A[0][0] * B[0][0];
        else
        {
            int[][] A11 = new int[n/2][n/2];
            int[][] A12 = new int[n/2][n/2];
            int[][] A21 = new int[n/2][n/2];
            int[][] A22 = new int[n/2][n/2];
            int[][] B11 = new int[n/2][n/2];
            int[][] B12 = new int[n/2][n/2];
            int[][] B21 = new int[n/2][n/2];
            int[][] B22 = new int[n/2][n/2];
            
            //A, B를 1/4 분할
            split(A, A11, 0, 0);
            split(A, A12, 0, n/2);
            split(A, A21, n/2, 0);
            split(A, A22, n/2, n/2);
            split(B, B11, 0, 0);
            split(B, B12, 0, n/2);
            split(B, B21, n/2, 0);
            split(B, B22, n/2, n/2);
            
            //M1 ~ M7 7개의 수식
            int[][] M1 = multiply(add(A11, A22), add(B11, B22));
            int[][] M2 = multiply(add(A21, A22), B11);
            int[][] M3 = multiply(A11, sub(B12, B22));
            int[][] M4 = multiply(A22, sub(B21, B11));
            int[][] M5 = multiply(add(A11, A12), B22);
            int[][] M6 = multiply(sub(A21, A11), add(B11, B12));
			int[][] M7 = multiply(sub(A12, A22), add(B21, B22));
            
            /**
            	C11 = M1 + M4 - M5 + M7
            	C12 = M3 + M5
            	C21 = M2 + M4
            	C22 = M1 - M2 + M3 + M6
            **/
            int[][] C11 = add(sub(add(M1, M4), M5), M7);
            int[][] C12 = add(M3, M5);
            int[][] C21 = add(M2, M4);
            int[][] C22 = add(sub(add(M1, M3), M2), M6);
            
            join(C11, R, 0, 0);
            join(C12, R, 0, n/2);
            join(C21, R, n/2, 0);
            join(C22, R, n/2, n/2);
        }
        return R;
    }
    //행렬 덧셈 함수
    public int[][] add(int[][] A, int[][] B)
    {
        int n = A.length;
        int[][] C = new int[n][n];
        for (int i = 0; i < n; i++)
            for(int j = 0; j < n; j++)
                C[i][j] = A[i][j] + B[i][j];
        return C;
    }
    //행렬 뺄셈 함수
    public int[][] sub(int[][] A, int[][] B)
    {
        int n = A.length;
        int[][] C = new int[n][n];
        for (int i = 0; i < n; i++)
            for(int j = 0; j < n; j++)
                C[i][j] = A[i][j] - B[i][j];
        return C;
    }
    //행렬 분할 함수
    public void split(int[][] P, int[][] C, int iB, int jB)
    {
        for(int i1 = 0, i2 = iB; i1 < C.length; i1++, i2++) 
            for(int j1 = 0, j2 = jB; j1 < C.length; j1++, j2++)
                C[i1][j1] = P[i2][j2];
    }
    //행렬 합성 함수
    public void join(int[][] C, int[][] P, int iB, int jB)
    {
        for(int i1 = 0, i2 = iB; i1 < C.length; i1++, i2++)
            for(int j1 = 0, j2 = jB; j1 < C.length; j1++, j2++)
                P[i2][j2] = C[i1][j1];
    }
}
```

### 실행 시간 비교

``` java
public class MaxrixTimeTest {

	public static void main(String[] args) {
		
		//일반 행렬의 곱셈식 실행시간
        //배열의 크기는 500으로 한다.
		int size = 500;
		int[][] basicM, A, B;
		A = new int[size][size];
		B = new int[size][size];
		basicM = new int[size][size];
		
		for(int i = 0; i < size; i++) {
			for(int j  = 0; j < size; j++) {
				A[i][j] = (int)(Math.random() * 9);
				B[i][j] = (int)(Math.random() * 9);
			}
		}
		
		long beforeBasicTime = System.currentTimeMillis();
		for(int i = 0; i < size; i++)
		{
		    for(int j = 0; j < size; j++) {
		        for(int k = 0; k < size; k++) {
		        	basicM[i][j] += A[i][k] * B[k][j];
		        }
		    }
		}
		long afterBasicTime = System.currentTimeMillis();
		System.out.println("일반적인 행렬 곱 연산 시 실행시간: " + ((afterBasicTime - beforeBasicTime) / 1000.0));
	}

}
```

###### 위 코드의 결과값 : 

-일반적인 행렬 곱 연산 시 실행시간: 0.458

``` java
public class StrassenTimeTest {

	public static void main(String[] args) {
		
		//일반 행렬의 곱셈식 실행시간
		int size = 500;
		int[][] strasM, A, B;
		A = new int[size][size];
		B = new int[size][size];
		strasM = new int[size][size];
		
		for(int i = 0; i < size; i++) {
			for(int j  = 0; j < size; j++) {
				A[i][j] = (int)(Math.random() * 9);
				B[i][j] = (int)(Math.random() * 9);
			}
		}
		
		long beforeBasicTime = System.currentTimeMillis();
		
		strasM = new Strassen().multiply(A, B);
		
		long afterBasicTime = System.currentTimeMillis();
		System.out.println("슈트라센 행렬 곱 연산 시 실행시간: " + ((afterBasicTime - beforeBasicTime) / 1000.0));
	}

}
```

###### 위 코드의 결과값 : 

-슈트라센 행렬 곱 연산 시 실행시간: 5.407



- 슈트라센 알고리즘(`O(n^2.807)`)은 복잡도만 보자면 일반적인 행렬 곱셈(`O(n^3)`) 보다 성능이 좋다.
- 하지만 코드로 구현해보면 재귀적으로 실행하게 되어 실행시간이 더 많이 걸리는 것을 볼 수 있다. 그렇다고 슈트라센 알고리즘을 반복문을 이용해 구현하는 것은 매우 어렵다.
- 또한 슈트라센 코드를 보면 M1, M2, ..., M7 나 C11,C12, ..., C22 등 식들의 결과값을 받을 변수들이 많아 메모리의 자리를 많이 차지하게 된다.
- 실험 결과: 슈트라센 알고리즘을 효율적으로 사용하기 위한 경우로는 굉장히 큰 사이즈의 행렬 연산일 경우가 될 것 같다. 즉, 웬만한 크기의 행렬 연산은 오히려 실행시간이 슈트라센 알고리즘이 더 크게 나온다

