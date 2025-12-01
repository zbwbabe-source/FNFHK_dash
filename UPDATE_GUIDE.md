# 홍콩 대시보드 11월 업데이트 가이드

## 📋 개요

대시보드 데이터는 **2개의 JSON 파일**로 관리됩니다:
1. **hongkong-sales-inventory.json** - CSV에서 자동 생성 (매출/재고)
2. **hongkong-financial.json** - 수동 관리 (손익/영업비)

---

## 🔄 11월 업데이트 절차

### **1단계: CSV 파일 교체** (1분)

```
components/dashboard/24012511 홍콩재고수불.csv
```

새로운 CSV 파일을 위 경로에 저장하세요.

---

### **2단계: Python 스크립트 수정** (1분)

`generate_sales_inventory.py` 파일을 열고 **2줄만 수정**:

```python
# 8번째 줄 부근
TARGET_PERIOD = 2511  # 2510 → 2511로 변경
PREV_PERIOD = 2411    # 2410 → 2411로 변경
```

**11번째 줄 - CSV 파일명 수정**:

```python
csv_path = 'components/dashboard/24012511 홍콩재고수불.csv'  # 파일명 변경
```

---

### **3단계: 매출/재고 데이터 자동 생성** (3분)

터미널에서 실행:

```bash
.\venv\Scripts\python.exe generate_sales_inventory.py
```

**생성 결과 확인:**
```
✅ hongkong-sales-inventory.json 생성 완료!
   총매출: XX,XXX,XXX HKD (YOY XX%)
   총재고: XXX,XXX,XXX HKD (YOY XX%)
   채널수: 8개
   매장수: 36개
```

---

### **4단계: 손익 데이터 수동 입력** (10분)

`components/dashboard/hongkong-financial.json` 파일을 열고 수정:

#### **4-1. 메타 정보 업데이트**
```json
{
  "meta": {
    "period": 2511,  // 변경
    "period_name": "2025년 11월",  // 변경
    "last_updated": "2025-12-XX"  // 변경
  }
}
```

#### **4-2. 영업비 (당월) 업데이트**
```json
{
  "opex": {
    "monthly": {
      "total": 1500,  // 실제 값 입력
      "total_prev": 1451,  // 전년 값
      "yoy": 103,  // 계산: (1500/1451*100)
      "breakdown": {
        "marketing": { "amount": 700, "yoy": 106 },
        "salary": { "amount": 620, "yoy": 102 },
        "commission": { "amount": 140, "yoy": 107 },
        // ... 각 항목 입력
      }
    }
  }
}
```

#### **4-3. 영업비 (누적) 업데이트**
```json
{
  "opex": {
    "ytd": {
      "total": 14900,  // 1-11월 누적
      "total_prev": 13385,
      "yoy": 111,
      "breakdown": {
        // ... 각 항목 입력
      }
    }
  }
}
```

#### **4-4. 손익 데이터 업데이트**
```json
{
  "profit": {
    "monthly": {
      "operating_profit": -980,  // 영업이익
      "operating_profit_prev": -925,
      "operating_margin": -4.5,
      "direct_profit": 550,  // 직접이익
      "direct_profit_prev": 526,
      "direct_margin": 2.8
    },
    "ytd": {
      // ... 누적 손익 입력
    }
  }
}
```

#### **4-5. 원가 데이터 업데이트**
```json
{
  "cost": {
    "monthly": {
      "cogs": 8000,  // 매출원가
      "cogs_prev": 7865,
      "cogs_rate": 32.0
    }
  }
}
```

---

### **5단계: 대시보드 확인** (1분)

브라우저에서 확인:

```
http://localhost:3000/hongkong
```

**확인 사항:**
- ✅ 실판매출 숫자 업데이트 확인
- ✅ 총재고 숫자 업데이트 확인
- ✅ 영업비 숫자 업데이트 확인
- ✅ 채널별 매출 차트 확인
- ✅ 매장별 데이터 확인

---

## ⏱️ 소요 시간 요약

| 단계 | 작업 | 시간 |
|------|------|------|
| 1 | CSV 파일 교체 | 1분 |
| 2 | Python 스크립트 수정 | 1분 |
| 3 | Python 실행 (자동 생성) | 3분 |
| 4 | 손익 데이터 수동 입력 | 10분 |
| 5 | 대시보드 확인 | 1분 |
| **합계** | | **16분** ✅ |

---

## 📁 파일 구조

```
D:\cursor\
├── generate_sales_inventory.py  (매출/재고 자동 생성)
├── components\dashboard\
│   ├── 24012511 홍콩재고수불.csv  (새 CSV)
│   ├── hongkong-sales-inventory.json  (자동 생성)
│   ├── hongkong-financial.json  (수동 관리)
│   └── hongkong-report.tsx  (대시보드)
```

---

## 🔧 문제 해결

### Python 실행 오류
```bash
# 가상환경 확인
.\venv\Scripts\python.exe --version

# pandas 설치 확인
.\venv\Scripts\pip.exe list | findstr pandas
```

### JSON 문법 오류
- 온라인 JSON Validator 사용: https://jsonlint.com/
- 쉼표(,) 위치 확인
- 중괄호 {} 짝 확인

### 대시보드에 데이터 안 나옴
1. 브라우저 캐시 삭제 (Ctrl + Shift + R)
2. 개발 서버 재시작
3. JSON 파일 경로 확인

---

## 📊 데이터 흐름

```
CSV 파일
   ↓ (자동)
Python 스크립트
   ↓
hongkong-sales-inventory.json
   ↓ (자동)
React 대시보드 ← (수동) hongkong-financial.json
   ↓
브라우저 표시
```

---

## ✅ 체크리스트

매월 업데이트 시:

- [ ] CSV 파일 교체
- [ ] Python 스크립트 수정 (기준월)
- [ ] Python 실행
- [ ] 매출/재고 JSON 생성 확인
- [ ] 손익 JSON 수동 업데이트
- [ ] 대시보드 숫자 확인
- [ ] 차트 데이터 확인
- [ ] 매장 데이터 확인

---

## 📞 도움말

문제 발생 시:
1. 이 가이드 재확인
2. JSON 문법 검증
3. Python 에러 메시지 확인
4. 개발자 도구 콘솔 확인 (F12)

