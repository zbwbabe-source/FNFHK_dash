# CSV 자동 업데이트 테스트 가이드

## 🎯 목적
CSV 파일만 교체하면 대시보드가 자동으로 업데이트되는지 확인

---

## 📝 테스트 절차

### **1단계: 현재 상태 확인**

브라우저에서 접속:
```
http://localhost:3000/hongkong-test
```

**현재 표시되는 데이터:**
- Period: **2510** (2025년 10월)
- 총매출: **20,486K**
- 총재고: **396,982K**

---

### **2단계: Python 스크립트 수정**

`generate_sales_inventory.py` 파일 열기:

#### **9월 데이터로 변경:**
```python
# 8번째 줄
TARGET_PERIOD = 2509  # 2510 → 2509로 변경
PREV_PERIOD = 2409    # 2410 → 2409로 변경

# 11번째 줄 (CSV 파일명)
csv_path = 'components/dashboard/24012509 홍콩재고수불.csv'  # 파일명 변경
```

**주의:** 실제로 `24012509 홍콩재고수불.csv` 파일이 있어야 합니다!

---

### **3단계: Python 실행**

터미널에서:
```bash
.\venv\Scripts\python.exe generate_sales_inventory.py
```

**예상 출력:**
```
홍콩 대시보드 - 매출/재고 데이터 자동 생성
================================================================================
CSV 로드 중: components/dashboard/24012509 홍콩재고수불.csv
...
components/dashboard/hongkong-sales-inventory.json 생성 완료!
```

---

### **4단계: 대시보드 새로고침**

브라우저에서:
```
http://localhost:3000/hongkong-test
```

**Ctrl + Shift + R** (강력 새로고침)

**확인 사항:**
- [ ] Period가 **2509**로 변경됨
- [ ] 총매출 숫자가 변경됨
- [ ] 총재고 숫자가 변경됨
- [ ] 채널별 매출이 변경됨
- [ ] 매장 TOP 10이 변경됨
- [ ] 차트 데이터가 변경됨

---

### **5단계: 다시 10월로 복구**

`generate_sales_inventory.py`:
```python
TARGET_PERIOD = 2510
PREV_PERIOD = 2410
csv_path = 'components/dashboard/24012510 홍콩재고수불.csv'
```

Python 재실행:
```bash
.\venv\Scripts\python.exe generate_sales_inventory.py
```

브라우저 새로고침 → 다시 2510 데이터로 돌아와야 함

---

## ✅ 성공 기준

### **테스트 성공 시:**
```
✅ CSV만 교체 → Python 실행 → 대시보드 자동 업데이트
✅ 모든 매출/재고 데이터가 자동으로 변경됨
✅ 손익 데이터는 그대로 유지됨 (수동 관리)
```

### **이렇게 되면:**
```
11월 CSV 추가 시:
1. CSV 파일 교체 (24012511 홍콩재고수불.csv)
2. Python 스크립트 수정 (2줄)
3. Python 실행
4. 손익 JSON 수동 업데이트
5. 완료! (15분 소요)
```

---

## 🔍 트러블슈팅

### CSV 파일이 없을 때:
```
FileNotFoundError: components/dashboard/24012509 홍콩재고수불.csv
```
→ CSV 파일 경로 확인

### 대시보드에 변경 안 보일 때:
1. 브라우저 캐시 삭제 (Ctrl + Shift + R)
2. 개발 서버 재시작
3. JSON 파일 생성 확인

### JSON 파일 확인:
```
components/dashboard/hongkong-sales-inventory.json
```
파일 열어서 "period": 2509 확인

---

## 📊 비교표

| 방법 | Before | After (CSV 자동) |
|------|--------|------------------|
| **매출 업데이트** | 수동 입력 | ✅ 자동 |
| **재고 업데이트** | 수동 입력 | ✅ 자동 |
| **채널별 데이터** | 수동 입력 | ✅ 자동 |
| **매장별 데이터** | 수동 입력 | ✅ 자동 |
| **손익 데이터** | 하드코딩 | ⚠️ 수동 (JSON) |
| **소요 시간** | 2-3시간 | ✅ 5분 + 손익 10분 |

---

## 🎊 테스트 성공 시 다음 단계

1. **기존 대시보드 교체**
   - `hongkong-report.tsx` → 백업
   - `hongkong-report-v2.tsx` → 메인으로

2. **라우팅 변경**
   - `/hongkong` → 새 대시보드
   - `/hongkong-old` → 기존 대시보드

3. **11월 데이터 준비**
   - CSV 파일 확보
   - 손익 데이터 준비




