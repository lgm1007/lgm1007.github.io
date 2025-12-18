---
layout:	post
title: RAG 실습하기
date: 2025-12-16 15:33:07 +0900
sitemap: 
image: technology-21.png
author: GyuMyung
tags: technology
comments: true
---

**RAG**(Retrieval-Augmented Generation)란 대규모 언어 모델(LLM)이 답변을 생성하기 전, 신뢰할 수 있는 지식 베이스를 검색하여 그 정보를 바탕으로 답변을 생성하는 기술이다. 즉 모델 자신의 기억에만 의존하지 않고 외부 데이터베이스를 찾아본 후 그 내용을 기반으로 답변하는 기술이라고 볼 수 있다.

RAG의 주요 작동 순서는 `검색 → 증강 → 생성`이다.  
검색은 사용자의 질문과 관련된 문서를 외부의 지식 베이스에서 찾는 과정이다.  
증강은 검색된 핵심 정보를 사용자 질문과 결합하여 모델에게 전달할 프롬프트를 보강하는 과정이다.  
생성은 보강된 정보를 바탕으로 답변을 만들어내는 과정이다.

이번 포스팅에서는 RAG의 주요 작동을 로컬 환경에서 실습해보고자 한다.

[프로젝트 GitHub 링크](https://github.com/lgm1007/rag-study-simple)

## 기술 스택
- Python
- Langchain
- FAISS
- OpenAI API
- Ollama (로컬 LLM)

## 실습 준비
Python 프로젝트 생성 (venv 가상 환경) 후 필요한 파이썬 패키지 설치
```
pip install \
  langchain \
  langchain-community \
  langchain-openai \
  faiss-cpu \
  openai \
  tiktoken
```

- langchain: RAG 전체 파이프라인 프레임워크
- langchain-community: FAISS, 로컬 로더 등 커뮤니티 통합 기능
- langchain-openai: OpenAI LLM / 임베디드 연동
- faiss-cpu: 로컬 벡터 DB 대용 (검색 시 핵심)
- openai: OpenAI API 클라이언트
- tiktoken: 토큰 계산 (chunk 분할, 비용 관리)

만약 로컬 임베딩 모델을 사용하는 경우엔 OpenAI 대신 아래 패키지 설치 (본 예제에서는 RAG 최소 동작만 실습해볼 예정으로 로컬 임베딩 모델 사용)
```
pip install sentence-transformers
```

사용 예시
```python
from langchain.embeddings import HuggingFaceEmbeddings

# FAISS에서 벡터로 유사 문서 검색 역할
embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3"
)
```

로컬 임베딩 모델 추천 목록

| 모델                                      | 설명                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| BAAI/bge-m3                             | 다국어 검색을 위해 설계된 모델.<br>한국어 포함한 다국어 환경에서 좋은 성능                                                                    |
| intfloat/multilingual-e5-large-instruct | 다국어 데이터로 학습된 E5 계열 모델.<br>E5 계열은 임베딩 시 prefix 규칙에 따라 성능 차이 있음<br>- 쿼리: `"query: ..."`<br>- 문서: `"passage: ..."` |
| jhgan/ko-sroberta-multitask             | 한국어 문장 임베딩을 위해 만들어진 모델.<br>다국어가 섞이지 않고 한국어 문서만 다룬다면 좋은 선택지                                                      |

본 실습에서는 로컬용 LLM을 사용할 예정으로 로컬 LLM인 `ollama`를 설치하여 사용한다.

```
# 로컬 LLM 설치
pip install langchain-ollama ollama
```

https://ollama.com 사이트에서 OS별 앱 설치

| 모델           | 설명              |
| ------------ | --------------- |
| `llama3:8b`  | 기본 성능 좋고 안정적    |
| `qwen2.5:7b` | 한글 질문에 상대적으로 강함 |
| `phi-3`      | 매우 가볍고 빠름       |

예시에서는 기본적인 모델 설치
```
ollama run llama3
```

모델 설치 끝나면 설치 확인

![](https://i.imgur.com/bOmIvu0.png)

설치 완료 확인되면 로컬 LLM 모델 준비 완료. `Ctrl + D` 로 종료.


만약 PDF나 HTML 문서를 읽을 필요가 있다면 아래 패키지도 추가로 설치
```
pip install \
  pypdf \
  pymupdf (선택사항) \
  beautifulsoup4 \
  lxml \
```

- pypdf: PDF 로딩
- pymupdf: pypdf가 이상하게 동작하는 경우 추천
- beautifulsoup4: HTML 파싱
- lxml: HTML/XML 파서

나중에 환경변수를 관리할 때 필요한 패키지도 설치해주면 좋음
```
pip install python-dotenv rich
```

## 실습
실습에 앞서 예제 프로젝트 구조는 다음과 같다.

```
.
├── data
│   ├── processed
│   └── raw
│       └── company.txt
├── src
│   ├── main
│   │   ├── ingest.py
│   │   └── qa.py
│   └── test
└── vector_db
```

`data/raw` 경로에 있는 `company.txt` 문서 내용은 아래와 같이 준비했다.

```
우리 회사는 2020년에 설립되었고, 주요 제품은 RAG 플랫폼이다.  
제품명은 Raggy이며, 고객 지원 이메일은 support@example.com 이다.  
EOF
```

### 1. 문서 내용 기반으로 벡터 DB 생성
먼저 `프로젝트 루트/data/raw` 경로에 있는 문서를 읽어 벡터 DB를 생성하는 작업을 먼저 진행해야 한다.
해당 예제에서는 `.txt` 파일만 읽도록 작성되었으나, 추후 PDF 또는 HTML 문서도 읽도록 개선할 수 있겠다.

`ingest.py`

```python
import os

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

# src/main/ingest.py 기준: 프로젝트 루트는 3단계 위
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
DB_DIR = os.path.join(PROJECT_ROOT, "vector_db")

def main():
    # 1. 문서 로딩 (data/raw 하위 문서 전부)
    loader = DirectoryLoader(
        DATA_DIR,
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=True
    )
    docs = loader.load()
    
    # 2. 청크 분할
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=80)
    splits = splitter.split_documents(docs)

    # 3. 로컬 임베딩
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")

    # 4. FAISS 생성 + 저장
    db = FAISS.from_documents(splits, embeddings)
    os.makedirs(DB_DIR, exist_ok=True)
    db.save_local(DB_DIR)

    print(f"Ingest 완료: 문서 {len(docs)} 개, 청크 {len(splits)} 개, 저장: {DB_DIR}")

if __name__ == "__main__":
    main()
```

해당 프로젝트에서는 `ingest.py` 파일의 경로가 `프로젝트 루트/src/main/ingest.py` 에 위치해 있어 `os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))` 와 같이 `dirname()`을 세 번 진행해줘야 프로젝트 루트 경로가 잡힌다. 이 부분은 프로젝트 구조에 맞게 작성하도록 한다.

위 로직이 정상적으로 실행되었다면 `vector_db` 경로에 벡터 DB 파일이 생성된다.
```
프로젝트 루트 경로> python src/main/ingest.py
```

![](https://i.imgur.com/aC2ePf5.png)

### 2. 벡터 DB에서 검색한 내용 기반으로 답변 생성
벡터 DB가 정상적으로 생성되면, 다음으로 LLM이 벡터 DB에서 사용자가 질문한 내용을 검색하고, 검색 내용을 기반으로 답변을 생성하도록 하는 단계를 진행한다.

`qa.py`

```python
import os 

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_ollama import ChatOllama

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(PROJECT_ROOT, "vector_db")

SYSTEM_PROMPT = """
    너는 RAG 기반 한국어 어시스턴트다.
    규칙:
    1) 반드시 한국어로만 답한다.
    2) 주어진 [컨텍스트]에 근거해서만 답한다.
    3) 컨텍스트에 답이 없으면 "제공된 문서에는 해당 정보가 없습니다." 라고 답한다.
    4) 추측하거나 지어내지 않는다.
"""

def build_prompt(context: str, question: str) -> str:
    return f"""[컨텍스트]
    {context}
        [질문]
    {question}
        [답변]
"""

def main():
    # 1) 임베딩 모델/벡터 DB 로드
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    db = FAISS.load_local(DB_DIR, embeddings, allow_dangerous_deserialization=True)

    # 2) LLM (Ollama)
    llm = ChatOllama(model="llama3", temperature=0)

    # 3) 질문 입력 루프
    print("RAG QA 시작. 종료하려면 'exit' 입력\n")
    while True:
        try:
            raw = input("Q> ")
        except EOFError:
            print("\nEOF 감지: 종료합니다.")
            break

        q = str(raw).strip()
        if not q:
            continue
        if q.lower() in ("exit", "quit"):
            break

        # 4) 검색
        retrieved = db.similarity_search(q, k=4)
        context = "\n\n".join([f"- {d.page_content}" for d in retrieved])

        # 5) 생성
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=build_prompt(context, q))
        ]
        answer = llm.invoke(messages).content

        print("\nA> ", answer)
        print("\n--- (검색된 컨텍스트) ---")
        for i, d in enumerate(retrieved, 1):
            print(f"[{i}] {d.page_content}")
        print("------------------------\n")

if __name__ == "__main__":
    main()
```

본 프로젝트에서는 Ollama의 Llama3 LLM 모델을 사용했지만, OpenAI 등 상황에 맞게 LLM 모델을 사용하면 된다.

답변 생성의 핵심은 질문에 대한 답변을 벡터 DB에서 검색한 내용을 기반으로 답변해야 한다는 점이다. 따라서 벡터 DB에서 검색한 내용이 없다면 `"제공된 문서에는 해당 정보가 없습니다."` 라고 답하도록 시스템 프롬프트에 정의해놓았다.

정상적으로 실행된다면, 사용자에게 질문을 입력받도록 뜨고, 질문을 입력하면 문서 내용을 기반으로 LLM이 답변하는 것을 확인할 수 있다.

![](https://i.imgur.com/NUSeM4J.png)
