# 2512 (12월) 대시보드 업데이트 준비 완료

## ✅ 완료된 작업

### 1. 요약 페이지 업데이트
- ✅ `app/page.tsx`: 기본 Period를 2512로 변경
- ✅ 드롭다운에 "25년 12월" 추가

### 2. 대만 당월 대시보드 스크립트 생성
- ✅ `generate_taiwan_2512.py` - 대만 메인 데이터
  - 환율: **4.02** (TWD → HKD)
  - CSV: `TW_Inventory_2312_2512_v5.2.csv`
  
- ✅ `generate_taiwan_ceo_insights_2512.py` - 대만 CEO 인사이트

- ✅ `generate_taiwan_cumulative_2512.py` - 대만 누적 데이터

### 3. 홍콩 당월 대시보드 스크립트 생성
- ✅ `generate_hk_2512.py` - 홍콩 메인 데이터
  - CSV: `HKMC_Inventory_2512.csv`
  
- ✅ `generate_ceo_insights_2512.py` - 홍콩 CEO 인사이트

- ✅ `generate_hongkong_cumulative_2512.py` - 홍콩 누적 데이터

- ✅ `generate_store_status_2512.py` - 홍콩 매장 현황

---

## 📋 실행 준비된 스크립트 목록

### 대만 대시보드 (실행 순서)

```bash
# 1. 대만 메인 데이터 생성
python generate_taiwan_2512.py

# 2. 대만 손익 데이터 생성
python generate_taiwan_pl_summary.py 2512

# 3. 대만 누적 데이터 생성
python generate_taiwan_cumulative_2512.py

# 4. 대만 CEO 인사이트 생성
python generate_taiwan_ceo_insights_2512.py
```

### 홍콩 대시보드 (나중에 실행)

```bash
# 1. 홍콩 메인 데이터 생성
python generate_hk_2512.py

# 2. 홍콩 손익 데이터 생성
python generate_pl_summary.py 2512

# 3. 홍콩 누적 데이터 생성
python generate_hongkong_cumulative_2512.py

# 4. 홍콩 CEO 인사이트 생성
python generate_ceo_insights_2512.py

# 5. 홍콩 매장 현황 생성
python generate_store_status_2512.py
```

---

## 📊 CSV 파일 확인

### 홍콩마카오
```
Dashboard_Raw_Data/HKMC/2512/
  ✅ HKMC_Inventory_2512.csv
  ✅ HKMC PL 2512.csv
```

### 대만
```
Dashboard_Raw_Data/TW/2512/
  ✅ TW_Inventory_2312_2512_v5.2.csv
  ✅ TWPL_2512.csv
  ✅ TW_Exchange Rate 2512.csv (환율: 4.02)
```

---

## 🎯 환율 정보

- **2512 (2025년 12월)**: `4.02` TWD → HKD
- 2511 (2025년 11월): `4.03`
- 2510 (2025년 10월): `3.957010153`

---

## 📝 생성될 JSON 파일

### 대만
1. `components/dashboard/taiwan-dashboard-data-2512.json`
2. `public/dashboard/taiwan-dashboard-data-2512.json`
3. `components/dashboard/taiwan-pl-data-2512.json`
4. `public/dashboard/taiwan-pl-data-2512.json`
5. `public/dashboard/taiwan-dashboard-cumulative-2512.json`
6. `public/dashboard/taiwan-ceo-insights-2512.json`

### 홍콩
1. `components/dashboard/hongkong-dashboard-data-2512.json`
2. `public/dashboard/hongkong-dashboard-data-2512.json`
3. `components/dashboard/hongkong-pl-data-2512.json`
4. `public/dashboard/hongkong-pl-data-2512.json`
5. `public/dashboard/hongkong-dashboard-cumulative-2512.json`
6. `public/dashboard/hongkong-ceo-insights-2512.json`
7. `public/dashboard/hongkong-store-status-2512.json`

---

## ⚠️ 주의사항

1. **대만 스크립트 실행 전**: Python 가상환경 활성화 필요
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. **CSV 파일 위치**: 반드시 위의 경로에 있어야 함

3. **실행 순서**: 메인 데이터 → PL 데이터 → 누적 → CEO 인사이트 순으로

4. **BS와 현금흐름**: 나중에 별도 업데이트 예정

---

## 🚀 다음 단계

1. **대만 당월 대시보드 스크립트 실행** (위의 대만 순서대로)
2. 생성된 JSON 파일 확인
3. 로컬 테스트 (`npm run dev`)
4. 문제 없으면 Git commit & push
5. 홍콩 대시보드는 추후 실행

---

## ✨ 준비 완료!

모든 스크립트가 생성되었으며, 대만 당월 대시보드 업데이트를 실행할 준비가 완료되었습니다.
