---
layout:	post
title:  Greedy Algorithm & 응용문제
date:   2020-04-15 12:31:00 +0900
sitemap: 
image:  algorithm-3.png
author: GyuMyung
tags:   algorithm
comments: true
---

## 그리디 알고리즘

* 현재 상태에서 가장 좋은 선택만을 취하는 알고리즘

* 매 순간 최적이라고 생각하는 답을 선택하는 알고리즘 방식으로 해당 그리디 알고리즘이 잘 동작하는 문제로 `앞 상황에서의 선택이 뒤에 나오는  선택 상황에 영향을 주지 않는다`는 속성과 `문제의 전체에 대한 최적의 선택이 부분적인 문제에서도 최적의 선택이다`라는 속성을 가진 문제들이다. 

    <br/>

#### 대표적인 그리디 알고리즘 예제

* 배낭문제 : 배낭에 담을 수 있는 무게의 최댓값이 있을 경우, 각각의 가치와 무게가 있는 물건들을 가치가 최대가 되도록 배낭에 넣는 문제
  - 분할가능 배낭문제 : 담을 물건을 쪼갤 수 있는 경우
  - 0-1 배낭문제 : 물건을 쪼갤 수 없는 경우

* 최단 루트 문제 : 목적지까지 최단 시간으로 도착할 수 있는 길 찾는 문제
* 집합 덮개 문제 : 전체 집합 U와 그 집합의 부분 집합 S가 주어질 때, 부분집합 중에서 최대한 적은 집합을 골라 그 집합들이 전체 집합 U를 `덮도록` 선택하는 문제 

<br/>

## 그리디 알고리즘 응용 문제

[문제 출처: NWERC 2010](https://commissies.ch.tudelft.nl/chipcie/archief/2010/nwerc/nwerc2010.pdf)

#### 설명

조이스틱으로 알파벳 이름을 완성하세요. 맨 처음엔 A로만 이루어져 있습니다.
ex) 완성해야 하는 이름이 세 글자면 AAA, 네 글자면 AAAA

조이스틱을 각 방향으로 움직이면 아래와 같습니다.

```wiki
▲ - 다음 알파벳
▼ - 이전 알파벳 (A에서 아래쪽으로 이동하면 Z로)
◀ - 커서를 왼쪽으로 이동 (첫 번째 위치에서 왼쪽으로 이동하면 마지막 문자에 커서)
▶ - 커서를 오른쪽으로 이동
```

예를 들어 아래의 방법으로 "JAZ"를 만들 수 있습니다.

``` wiki
- 첫 번째 위치에서 조이스틱을 위로 9번 조작하여 J를 완성합니다.
- 조이스틱을 왼쪽으로 1번 조작하여 커서를 마지막 문자 위치로 이동시킵니다.
- 마지막 위치에서 조이스틱을 아래로 1번 조작하여 Z를 완성합니다.
따라서 11번 이동시켜 "JAZ"를 만들 수 있고, 이때가 최소 이동입니다.
```

만들고자 하는 이름 name이 매개변수로 주어질 때, 이름에 대해 조이스틱 조작 횟수의 최솟값을 return 하도록 solution 함수를 만드세요.

**제한 사항**

- name은 알파벳 대문자로만 이루어져 있습니다.
- name의 길이는 1 이상 20 이하입니다.

**입출력 예**

| name   | return |
| ------ | ------ |
| JEROEN | 56     |
| JAN    | 23     |

  <br/>

#### 접근법

- 조이스틱을 `위`, `아래`, `왼쪽`, `오른쪽` 어느 방향이던 조작을 최소화하는 문제
- 알파벳 진행 순서(A,B,C,D,...)를 고려해보면 `"N"`다음으로 나오는 (Alphabet > N) 알파벳인 경우는 ▼ 방향키로 접근하는 게 빠르다. 나머지 알파벳들(Alphabet <= N)의 경우는 ▲ 방향키로 순서대로 접근한다.
- 이미 처음 값은 "A"이므로 "B"부터 조작 횟수가 증가하게 된다.
- 초기값으로 모두 `"A"`로 되어있으므로 name에서 "A"가 나온 위치는 접근하지 않는게 횟수를 줄일 수 있는 방법이다. 따라서 name에서 "A"가 처음, 끝, 중간 부분에 있는지, 그리고 연속적으로 나오는지를 검사해 ◀, ▶ 방향키 조작 횟수를 계산하는 식을 세운다.

<br/>

#### 소스 코드

``` java
import java.util.Scanner;

public class JoyStick {

	public static void main(String[] args) {
		
		int ans = 0;
		String name;
		Scanner scan = new Scanner(System.in);
		CountClass cClass = new CountClass();
		
		name = scan.nextLine();
		
		ans = cClass.solution(name);
		System.out.println(ans);

	}

}

class CountClass {
	public int solution(String name) {
		/*
		A_max: 가장 긴 연속적으로 나온 A 개수 (ex) JAAAAAY -> 5
		Acon_s: 가장 긴 연속으로 나온 A에서 시작 인덱스 (ex) JAAAAAY -> 1
		Acon_e: 가장 긴 연속으로 나온 A에서 끝부분 인덱스 (ex) JAAAAAY -> 5
		hCount: 위, 아래 방향키 조작 횟수, vCount: 왼,오른쪽 방향키 조작 횟수
		start: 시작 위치임을 알리는 변수, 시작 위치는 조작하지 않아도 접근되어 있음을 나타내줌
		*/
		int res = 0, IsA = 0, A_max = 0, Acon_s = 0, Acon_e = 0, hCount = 0, vCount = 0;
		boolean start = true;
		char ch[] = name.toCharArray();
		int i = 0;
		
		//반복문으로 각 알파벳 검사하여 위,아래 방향키 조작 횟수와 연속으로 나온 A 검사하여 A_max, Acon_e 값도 구함
		for(char alp : ch) {
			int asciiAlp = (int)alp;
			//연속 A 횟수 검사
			if((alp == 'A') && (start == false)) {
				IsA++;
				if(IsA > A_max) {
					A_max = IsA;
					Acon_e = i;
				}
			} else {
				IsA = 0;
			}
			
			// alp > 'N'이면 아래 방향키를 조작하여 접근함
			if(alp > 'N') {
				char z = 'Z';
				int asciiZ = (int)z;
				hCount = asciiZ - asciiAlp + 1;
			} else {
				char a = 'A';
				int asciiA = (int)a;
				hCount = asciiAlp - asciiA;
			}
			res += hCount;
			start = false;
			i++;
		}
		// 가장 긴 연속적인 A의 시작 인덱스
		Acon_s = Acon_e - A_max + 1;
		
		int len = name.length();
		// A가 시작이나 끝부분에 있는 경우
		if((Acon_s == 0) || (Acon_e == len - 1)) {
			res += (len - 1);
			//name의 길이에서 이동 안해도 되는 가장 긴 연속A 부분만큼 빼줌
			res -= A_max; 
		}
		//연속 A가 중간 부분에 나올 경우
		else {
			/*(ex) JXAAASDF 처럼 연속 A의 끝 인덱스와 마지막 문자 인덱스와의 차이가 시작 인덱스보다 클 때
			 * 처음(인덱스 0)부분과 A 시작 인덱스 사이가 더 짧기 때문에
			[F,D,S,D,F,J,X] 보다 [X,J,F,D,S] 순으로 접근하는 게 최소임 */
			if ((len - Acon_e - 1) >= Acon_s)
				/* Acon_s - 1 은 처음 부분(인덱스 0)은 움직이지 않아도 되기 때문에 1 제외하며 
				 2곱하는 게 (처음부분 ~ 연속 A 시작) 부분을 들어갔다 나가기 때문임 */ 
				vCount = (Acon_s - 1) * 2 + (len - Acon_e - 1);
			/*(ex) KQWEAAAXG 처럼 연속 A의 끝 인덱스와 마지막 문자 인덱스와의 차이가 시작 인덱스보다 작을 때
			 * 마지막 문자 인덱스(len-1)와 A의 끝 인덱스 사이가 더 짧으므로
			 [Q,W,E,W,Q,K,G,X] 보다 [G,X,G,K,Q,W,E] 순으로 접근하는 게 최소임 */
			else
				vCount = (Acon_s - 1) + (len - Acon_e - 1) * 2;
			//vCount를 구하더라도 name의 길이보다 더 크면 최소가 아니므로
			res += Math.min(vCount, len);
		}
		return res;
	}
}
```

