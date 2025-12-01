# 경영실적 대시보드

경영실적 분석을 위한 대시보드 프로젝트입니다.

## 기술 스택

- **Next.js**: 웹사이트 + API
- **Tailwind CSS**: UI 스타일링
- **shadcn/ui**: UI 컴포넌트
- **Pandas**: 데이터 분석
- **Snowflake**: 데이터베이스 연결
- **OpenAPI**: API 스펙 정의 및 자동 코드 생성

## 사전 요구사항

- Node.js 18.x 이상
- Python 3.8 이상 (일반 Python 설치 권장, Anaconda/Miniconda 제거 후 설치)
- npm 또는 yarn

> **참고**: Anaconda/Miniconda를 사용 중이라면 일반 Python으로 전환하는 것을 권장합니다. 
> 자세한 내용은 `PYTHON_SETUP_GUIDE.md`를 참고하세요.

## 설치 방법

### 1. Node.js 패키지 설치

```bash
npm install
```

설치되는 주요 패키지:
- Next.js 14
- Tailwind CSS
- shadcn/ui 관련 패키지
- Recharts (차트 라이브러리)

### 2. Python 가상환경 설정 및 패키지 설치

#### 가상환경 생성 및 활성화
```bash
# 가상환경 생성
python -m venv venv

# 가상환경 활성화 (PowerShell)
.\venv\Scripts\Activate.ps1

# 가상환경 활성화 (CMD)
venv\Scripts\activate.bat
```

#### 패키지 설치
```bash
pip install -r requirements.txt
```

> **팁**: 자동 설정 스크립트를 사용하려면 `.\setup_python.ps1` 실행

설치되는 주요 패키지:
- pandas: 데이터 분석
- snowflake-connector-python: Snowflake 연결
- fastapi: Python API 서버
- openapi-generator-cli: OpenAPI 코드 생성

### 3. shadcn/ui 컴포넌트 추가 (선택사항)

필요한 UI 컴포넌트를 추가하려면:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add chart
```

### 4. OpenAPI 코드 생성

API 스펙이 변경되면 자동으로 코드를 생성:

```bash
npx @openapitools/openapi-generator-cli generate -i api/openapi.yaml -g typescript-fetch -o lib/generated
```

## 개발 서버 실행

### Next.js 개발 서버

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### Python API 서버 (선택사항)

별도의 Python API 서버를 실행하려면:

```bash
cd api
python server.py
```

API 서버는 [http://localhost:8000](http://localhost:8000)에서 실행됩니다.

## 프로젝트 구조

```
.
├── app/                      # Next.js App Router
│   ├── layout.tsx           # 루트 레이아웃
│   ├── page.tsx             # 메인 페이지
│   └── globals.css          # 전역 스타일
├── components/               # React 컴포넌트
│   └── ui/                  # shadcn/ui 컴포넌트
├── lib/                     # 유틸리티 함수
│   ├── utils.ts             # 공통 유틸리티
│   ├── snowflake.ts         # Snowflake 연결
│   └── generated/           # OpenAPI로 생성된 코드
├── api/                     # API 관련
│   ├── server.py            # FastAPI 서버
│   └── openapi.yaml         # OpenAPI 스펙
├── package.json             # Node.js 의존성
├── requirements.txt         # Python 패키지 목록
├── tailwind.config.ts       # Tailwind 설정
├── components.json          # shadcn/ui 설정
└── tsconfig.json            # TypeScript 설정
```

## 다음 단계

1. **Snowflake 연결 설정**: `lib/snowflake.ts`와 `api/server.py`에서 실제 연결 정보 입력
2. **shadcn/ui 컴포넌트 추가**: 필요한 UI 컴포넌트 설치
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   npx shadcn-ui@latest add table
   npx shadcn-ui@latest add chart
   ```
3. **데이터 시각화**: Recharts를 사용하여 차트 컴포넌트 생성
4. **API 엔드포인트 구현**: Next.js API Routes에서 Snowflake 데이터 조회

