# Python 설치 및 Anaconda 제거 가이드

## 1단계: Anaconda/Miniconda 제거

### 방법 1: Windows 설정에서 제거
1. **설정** → **앱** → **앱 및 기능** 열기
2. "Anaconda" 또는 "Miniconda" 검색
3. 선택 후 **제거** 클릭

### 방법 2: Anaconda 제거 프로그램 사용
1. Anaconda Prompt를 관리자 권한으로 실행
2. 다음 명령어 실행:
```bash
conda install anaconda-clean
anaconda-clean --yes
```

### 방법 3: 수동 제거
1. Anaconda/Miniconda 설치 폴더 삭제 (보통 `C:\Users\사용자명\anaconda3` 또는 `C:\Users\사용자명\miniconda3`)
2. 환경 변수에서 Anaconda 경로 제거:
   - **시스템 속성** → **고급** → **환경 변수**
   - **Path**에서 Anaconda 관련 경로 모두 제거
   - 예: `C:\Users\사용자명\anaconda3`, `C:\Users\사용자명\anaconda3\Scripts`, `C:\Users\사용자명\anaconda3\Library\bin`

## 2단계: 일반 Python 설치

### Python 다운로드 및 설치
1. **Python 공식 사이트** 방문: https://www.python.org/downloads/
2. **Python 3.12.x** (최신 안정 버전) 다운로드
3. 설치 시 **중요 옵션**:
   - ✅ **"Add Python to PATH"** - 반드시 체크! (필수)
   - ❌ **"Install for all users" (관리자 권한)** - 체크 안 함 권장 (선택)
     - 개인 PC: 체크 안 함 (권한 문제 적음)
     - 회사/공용 PC: 체크 (모든 사용자 사용 가능)
4. **"Install Now"** 클릭

### 설치 확인 (Python이 제대로 설치되었는지 체크)

**방법**:
1. **PowerShell 열기**
   - `Windows 키` → "PowerShell" 검색 → 클릭

2. **확인 명령어 입력**:
```powershell
python --version
```
**결과 예시**: `Python 3.12.0` ✅ (버전 번호가 나오면 성공!)

```powershell
pip --version
```
**결과 예시**: `pip 23.3.1 from ...` ✅ (버전 번호가 나오면 성공!)

## 3단계: 가상환경 설정

### 가상환경이란? (왜 필요한가?)

**비유**: 각 프로젝트마다 독립된 "방"을 만드는 것
- 다른 프로젝트와 패키지 버전 충돌 방지
- 이 프로젝트만의 깨끗한 환경

**예시**:
- ❌ 없으면: 모든 프로젝트가 같은 pandas 버전 공유 → 충돌 가능
- ✅ 있으면: 각 프로젝트가 자기만의 pandas 버전 사용 → 독립적

### 가상환경 만들기

> **📁 프로젝트 루트 디렉토리**: `D:\cursor` (현재 작업 폴더)

**1. PowerShell을 프로젝트 폴더에서 열기**

방법 A (Cursor에서):
   - Cursor 상단 메뉴: `Terminal` → `New Terminal`
   - 자동으로 `D:\cursor`에서 열림

방법 B (파일 탐색기에서):
   - `D:\cursor` 폴더 열기
   - 주소창에 `powershell` 타이핑 후 Enter
   
방법 C (직접 이동):
   - PowerShell 열고 `cd D:\cursor` 입력

**2. 현재 위치 확인**
PowerShell 창에서 다음처럼 표시되는지 확인:
```
PS D:\cursor>
```
만약 다른 경로면 `cd D:\cursor` 입력

**3. 가상환경 생성 명령어 입력**
PowerShell 창에 다음을 **타이핑**하고 **Enter**:
```bash
python -m venv venv
```
**의미**: 
- "Python아, `venv`라는 폴더에 가상환경 만들어줘"

**결과**: 
- `D:\cursor\venv` 폴더 생성됨 (왼쪽 파일 트리에서 확인 가능)
- 몇 초~1분 정도 소요됨

### 가상환경 활성화 (켜기) ⚡

> **비유**: 가상환경이라는 "방"에 들어가기

**명령어** (PowerShell 창에 입력):
```bash
.\venv\Scripts\Activate.ps1
```

**성공하면 이렇게 변함**:
```
입력 전: PS D:\cursor>
입력 후: (venv) PS D:\cursor>  ← (venv)가 붙으면 성공! ✅
```

**⚠️ 에러가 나면** ("스크립트 실행할 수 없음" 에러):
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
위 명령어 입력 후 다시 `.\venv\Scripts\Activate.ps1` 실행

---

## 4단계: 패키지 설치

> **중요**: 가상환경이 **켜진 상태**에서 진행!
> 터미널에 `(venv)`가 보여야 함!

**명령어** (PowerShell 창에 입력):
```bash
pip install -r requirements.txt
```

**의미**: 
- `requirements.txt`에 적힌 모든 패키지 자동 설치
- pandas, snowflake-connector-python, fastapi 설치됨

**진행 화면**:
```
(venv) PS D:\cursor> pip install -r requirements.txt
Collecting pandas...
Installing collected packages: pandas, snowflake-connector-python, fastapi...
Successfully installed ✅
```

---

### 가상환경 비활성화 (끄기) 🔌

**언제?**: 작업 끝나고 가상환경에서 나올 때

**명령어**:
```bash
deactivate
```

**화면 변화**:
```
(venv) PS D:\cursor> deactivate
PS D:\cursor>  ← (venv) 사라짐
```

## 문제 해결

### Python이 인식되지 않는 경우
1. 환경 변수 확인:
   - `C:\Users\사용자명\AppData\Local\Programs\Python\Python312`
   - `C:\Users\사용자명\AppData\Local\Programs\Python\Python312\Scripts`
2. PowerShell 재시작
3. 여전히 안 되면 Python 재설치 (PATH 체크 확인)

### pip 업그레이드
```bash
python -m pip install --upgrade pip
```

