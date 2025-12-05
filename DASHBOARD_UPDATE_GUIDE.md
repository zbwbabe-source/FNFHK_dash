# 대시보드 월별 업데이트 가이드

## 📋 목차
1. [사전 준비](#-사전-준비)
2. [CSV 데이터 품질 검증](#-csv-데이터-품질-검증-중요)
3. [업데이트 절차](#-업데이트-절차)
4. [검증 및 배포](#-검증-및-배포)
5. [문제 해결](#-문제-해결)

---

## 🎯 개요

매월 새로운 Period 데이터를 추가할 때 따라야 할 단계별 가이드입니다.
**예시: 2511 (2025년 11월) 데이터 추가**

---

## 📦 사전 준비

### 1. 필요한 파일 준비

#### ✅ 사용자가 직접 준비해야 할 파일

1. **대만 환율 파일 업데이트**
   ```
   components/dashboard/exchange_rate_data.json
   ```
   - 2025년 11월 환율 추가

2. **홍콩 재고수불 CSV**
   ```
   ../Dashboard_Raw_Data/홍콩재고수불_2511.csv
   ```
   또는
   ```
   ../Dashboard_Raw_Data/24012511 홍콩재고수불.csv
   ```

3. **대만 재고수불 CSV**
   ```
   ../Dashboard_Raw_Data/대만재고수불_2511.csv
   ```
   또는
   ```
   ../Dashboard_Raw_Data/대만재고수불.csv (누적 파일)
   ```

4. **PL 데이터베이스 CSV**
   ```
   ../Dashboard_Raw_Data/hmd_pl_database.csv
   ```
   - 2025년 11월 (202511) 데이터 포함

---

## 🔍 CSV 데이터 품질 검증 (⚠️ 중요!)

> **2509 실패 교훈**: CSV 파일에 데이터는 있지만 대부분의 컬럼이 비어있어 실패했습니다.
> 반드시 데이터 품질을 먼저 검증하세요!

### CSV 검증 스크립트 생성

파일명: `validate_csv_data.py`

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 데이터 품질 검증 스크립트
새로운 Period 추가 전 반드시 실행!

사용법:
    python validate_csv_data.py 2511
"""

import pandas as pd
import sys
import os

def validate_hongkong_csv(period):
    """홍콩 CSV 데이터 검증"""
    print(f"\n{'='*80}")
    print(f"[홍콩] {period} 데이터 검증 중...")
    print(f"{'='*80}\n")
    
    # CSV 파일 찾기
    possible_paths = [
        f'../Dashboard_Raw_Data/홍콩재고수불_{period}.csv',
        f'../Dashboard_Raw_Data/24012{period} 홍콩재고수불.csv'
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        print(f"❌ CSV 파일을 찾을 수 없습니다.")
        print(f"   확인 경로:")
        for path in possible_paths:
            print(f"   - {path}")
        return False
    
    print(f"✅ CSV 파일 발견: {csv_path}\n")
    
    # CSV 읽기
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        print(f"❌ CSV 파일 읽기 실패: {str(e)}")
        return False
    
    # Period 필터링
    period_int = int(period)
    df_period = df[df['Period'] == period_int]
    
    # 검증 1: 데이터 존재
    print(f"📊 데이터 행 수: {len(df_period):,}개")
    if len(df_period) == 0:
        print(f"❌ {period} Period 데이터가 없습니다!")
        print(f"   CSV에 존재하는 Period: {sorted(df['Period'].unique())}")
        return False
    print(f"✅ 검증 1 통과: 데이터 존재\n")
    
    # 검증 2: 주요 컬럼 NULL/Zero 비율
    critical_cols = ['Net_Sales', 'Gross_Sales', 'Stock_Price', 'Stock_Cost']
    print(f"📋 주요 컬럼 데이터 품질:")
    
    failed = False
    for col in critical_cols:
        if col not in df_period.columns:
            print(f"❌ {col} 컬럼이 없습니다!")
            failed = True
            continue
        
        null_count = df_period[col].isnull().sum()
        null_ratio = null_count / len(df_period) * 100
        zero_count = (df_period[col] == 0).sum()
        zero_ratio = zero_count / len(df_period) * 100
        
        status = "✅" if null_ratio < 50 else "❌"
        print(f"  {status} {col:20s}: NULL {null_ratio:5.1f}% ({null_count:,}개), Zero {zero_ratio:5.1f}% ({zero_count:,}개)")
        
        if null_ratio >= 50:
            print(f"     ⚠️  경고: NULL 비율이 너무 높습니다!")
            failed = True
    
    if failed:
        print(f"\n❌ 검증 2 실패: 데이터 품질 불량\n")
        return False
    print(f"\n✅ 검증 2 통과: 데이터 품질 양호\n")
    
    # 검증 3: 총 매출 합리성
    total_sales = df_period['Net_Sales'].sum()
    print(f"💰 총 실판매출: {total_sales:,.0f} HKD")
    
    if total_sales < 1000000:  # 100만 미만이면 이상
        print(f"❌ 총 매출이 너무 낮습니다! (최소 1,000,000 HKD 필요)")
        return False
    print(f"✅ 검증 3 통과: 총 매출 합리적\n")
    
    # 검증 4: 전월 대비 비교 (있으면)
    prev_period = period_int - 1
    df_prev = df[df['Period'] == prev_period]
    if len(df_prev) > 0:
        prev_sales = df_prev['Net_Sales'].sum()
        yoy_ratio = (total_sales / prev_sales) * 100 if prev_sales > 0 else 0
        
        print(f"📈 전월 대비:")
        print(f"   전월 ({prev_period}) 매출: {prev_sales:,.0f} HKD")
        print(f"   당월 ({period}) 매출: {total_sales:,.0f} HKD")
        print(f"   비율: {yoy_ratio:.1f}%")
        
        if yoy_ratio < 50 or yoy_ratio > 200:
            print(f"   ⚠️  경고: 전월 대비 변동이 큽니다. 데이터를 확인하세요.")
        else:
            print(f"   ✅ 전월 대비 합리적 범위")
    
    print(f"\n{'='*80}")
    print(f"✅ [홍콩] {period} 데이터 검증 완료 - 모든 테스트 통과!")
    print(f"{'='*80}\n")
    return True


def validate_taiwan_csv(period):
    """대만 CSV 데이터 검증"""
    print(f"\n{'='*80}")
    print(f"[대만] {period} 데이터 검증 중...")
    print(f"{'='*80}\n")
    
    # CSV 파일 찾기
    possible_paths = [
        f'../Dashboard_Raw_Data/대만재고수불_{period}.csv',
        '../Dashboard_Raw_Data/대만재고수불.csv'
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        print(f"❌ CSV 파일을 찾을 수 없습니다.")
        return False
    
    print(f"✅ CSV 파일 발견: {csv_path}\n")
    
    # CSV 읽기
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        print(f"❌ CSV 파일 읽기 실패: {str(e)}")
        return False
    
    # Period 필터링
    period_int = int(period)
    df_period = df[df['Period'] == period_int]
    
    # 검증
    print(f"📊 데이터 행 수: {len(df_period):,}개")
    if len(df_period) == 0:
        print(f"❌ {period} Period 데이터가 없습니다!")
        return False
    
    total_sales = df_period['Net_Sales'].sum()
    print(f"💰 총 실판매출: {total_sales:,.0f} TWD")
    
    if total_sales < 10000000:  # 1000만 미만이면 이상
        print(f"❌ 총 매출이 너무 낮습니다!")
        return False
    
    print(f"\n{'='*80}")
    print(f"✅ [대만] {period} 데이터 검증 완료!")
    print(f"{'='*80}\n")
    return True


def validate_pl_database(period):
    """PL 데이터베이스 검증"""
    print(f"\n{'='*80}")
    print(f"[PL Database] {period} 데이터 검증 중...")
    print(f"{'='*80}\n")
    
    csv_path = '../Dashboard_Raw_Data/hmd_pl_database.csv'
    
    if not os.path.exists(csv_path):
        print(f"❌ PL 데이터베이스 파일을 찾을 수 없습니다: {csv_path}")
        return False
    
    print(f"✅ 파일 발견: {csv_path}\n")
    
    # CSV 읽기
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {str(e)}")
        return False
    
    # Period 필터링 (202511 형식)
    period_full = int(f"20{period}")
    df_period = df[df['PERIOD'] == period_full]
    
    print(f"📊 데이터 행 수: {len(df_period):,}개")
    if len(df_period) == 0:
        print(f"❌ {period_full} Period 데이터가 없습니다!")
        print(f"   CSV에 존재하는 Period: {sorted(df['PERIOD'].unique())}")
        return False
    
    # 국가별 분포
    print(f"\n📋 국가별 데이터 분포:")
    country_counts = df_period['CNTRY_CD'].value_counts()
    for country, count in country_counts.items():
        print(f"   {country}: {count:,}개")
    
    print(f"\n{'='*80}")
    print(f"✅ [PL Database] {period} 데이터 검증 완료!")
    print(f"{'='*80}\n")
    return True


def main():
    if len(sys.argv) < 2:
        print("사용법: python validate_csv_data.py <period>")
        print("예시: python validate_csv_data.py 2511")
        sys.exit(1)
    
    period = sys.argv[1]
    
    print("\n" + "="*80)
    print("CSV 데이터 품질 검증 시작")
    print("="*80)
    print(f"Period: {period}")
    print("="*80)
    
    results = {
        '홍콩': validate_hongkong_csv(period),
        '대만': validate_taiwan_csv(period),
        'PL': validate_pl_database(period)
    }
    
    # 최종 결과
    print("\n" + "="*80)
    print("최종 검증 결과")
    print("="*80)
    
    all_passed = True
    for name, passed in results.items():
        status = "✅ 통과" if passed else "❌ 실패"
        print(f"{name:10s}: {status}")
        if not passed:
            all_passed = False
    
    print("="*80)
    
    if all_passed:
        print("\n🎉 모든 검증 통과! 대시보드 업데이트를 진행하세요.")
        sys.exit(0)
    else:
        print("\n⚠️  일부 검증 실패! CSV 데이터를 확인하고 수정한 후 다시 시도하세요.")
        sys.exit(1)


if __name__ == '__main__':
    main()
```

### 검증 실행

```bash
# 가상환경 활성화
.\venv\Scripts\Activate.ps1

# 검증 스크립트 실행
python validate_csv_data.py 2511
```

### 검증 통과 기준

✅ **통과 조건**:
- CSV 파일 존재
- 데이터 행 수 > 0
- 주요 컬럼 NULL 비율 < 50%
- 총 매출이 합리적 범위
- 전월 대비 변동이 합리적 범위 (50% ~ 200%)

❌ **실패 시 조치**:
1. 원본 데이터 소스 확인
2. CSV 추출 프로세스 점검
3. 파일 전송 중 손상 여부 확인
4. 데이터 담당자에게 문의

---

## 🔄 업데이트 절차

### 1단계: Python 데이터 생성 스크립트 실행

```bash
# 홍콩마카오 대시보드 데이터 생성
python update_hongkong_dashboard.py

# 대만 대시보드 데이터 생성
python generate_taiwan_dashboard_data.py

# 대만 PL 데이터 생성
python generate_taiwan_pl_summary.py
```

### 2단계: JSON 파일 검증

각 스크립트 실행 후 생성된 JSON 파일을 확인합니다.

#### 홍콩 데이터 검증
```bash
# metadata 확인
grep -A 5 "metadata" components/dashboard/hongkong-dashboard-data.json
```

**확인 사항**:
```json
{
  "metadata": {
    "last_period": "2511",      // ✅ 올바른 Period
    "previous_period": "2411",  // ✅ 전년 동월
    "last_year": 2025,
    "last_month": 11,
    "generated_at": "2025-12-XX..."
  }
}
```

#### 대만 데이터 검증
```bash
# metadata 확인
grep -A 5 "metadata" components/dashboard/taiwan-dashboard-data.json

# PL metadata 확인
grep -A 5 "metadata" components/dashboard/taiwan-pl-data.json
```

#### 주요 데이터 확인
```bash
# 홍콩 총 매출 확인
grep "total_net_sales" components/dashboard/hongkong-dashboard-data.json

# 대만 총 매출 확인
grep "total_net_sales" components/dashboard/taiwan-dashboard-data.json
```

**경고 신호** ❌:
- `total_net_sales: 0` 또는 매우 낮은 값
- `last_period`가 잘못된 값
- `generated_at`가 업데이트되지 않음

### 3단계: 빌드 테스트

```bash
# TypeScript 및 빌드 에러 확인
npm run build
```

**성공 시**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

**실패 시**:
- 에러 메시지 확인
- JSON 문법 오류 점검
- TypeScript 타입 에러 수정

### 4단계: 로컬 테스트

```bash
npm run dev
```

브라우저에서 확인:
- http://localhost:3000/hongkong
- http://localhost:3000/taiwan

**확인 체크리스트**:

#### 홍콩 대시보드
- [ ] 손익요약 숫자 업데이트 확인
- [ ] 매출 YOY가 합리적 범위
- [ ] 재고 현황 표시
- [ ] 정체재고 분석 작동
- [ ] 과시즌F 상세 데이터 표시
- [ ] 비율 계산이 정상 (할인율, 직접이익율 등)

#### 대만 대시보드
- [ ] 손익요약 숫자 업데이트 확인
- [ ] 당월 전년비 합계가 오프라인+온라인 합계와 일치
- [ ] 누적 전년비 합계가 오프라인+온라인 합계와 일치
- [ ] 온라인 채널별 현황 표시
- [ ] 매장별 현황 표시
- [ ] 비율 변화가 합리적

---

## ✅ 검증 및 배포

### Git 커밋 & 푸시

```bash
# 변경사항 확인
git status

# JSON 파일 스테이징
git add components/dashboard/*.json

# 환율 파일도 변경되었다면
git add components/dashboard/exchange_rate_data.json

# 커밋
git commit -m "2511 대시보드 데이터 추가"

# 푸시
git push
```

### Vercel 자동 배포 확인

1. GitHub에 푸시하면 Vercel이 자동으로 배포 시작
2. Vercel 대시보드에서 배포 상태 확인
3. 배포 완료 후 프로덕션 사이트 확인

### 프로덕션 확인

프로덕션 URL에서 최종 확인:
- [ ] 홍콩 대시보드 숫자 정상
- [ ] 대만 대시보드 숫자 정상
- [ ] 모바일 뷰 확인
- [ ] 차트 렌더링 확인

---

## 🚨 문제 해결

### Python 스크립트 에러

**문제**: `ModuleNotFoundError: No module named 'pandas'`

**해결**:
```bash
.\venv\Scripts\Activate.ps1
pip install pandas numpy
```

**문제**: `FileNotFoundError: CSV 파일을 찾을 수 없습니다`

**해결**:
1. CSV 파일 경로 확인
2. 파일명이 정확한지 확인
3. 상대 경로가 올바른지 확인

### JSON 생성 실패

**문제**: JSON 파일은 생성되었지만 데이터가 0

**해결**:
1. CSV 데이터 품질 재검증
2. Period 필터링이 올바른지 확인
3. Python 스크립트 로그 확인

### 빌드 에러

**문제**: `Type error: Property does not exist`

**해결**:
1. JSON 구조가 기존과 동일한지 확인
2. TypeScript 타입 정의 확인
3. 필수 필드가 누락되지 않았는지 확인

### 비율 계산 이상

**문제**: 할인율, 직접이익율 등의 변화가 비정상

**원인**: `prev_month.total` 또는 `prev_cumulative.total`에 비율 필드 누락

**해결**: 이미 수정됨 (비율 필드 없으면 자동 계산)

### 전년비 합계 불일치

**문제**: 당월/누적 전년비 합계가 오프라인+온라인 합계와 다름

**원인**: `plChange` 또는 `cumulative.change` 값 사용

**해결**: 이미 수정됨 (오프라인+온라인 직접 합산)

---

## 📊 데이터 흐름도

```
CSV 파일 (홍콩/대만/PL)
    ↓
[검증 단계] ← validate_csv_data.py
    ↓
Python 스크립트 실행
    ├─ update_hongkong_dashboard.py
    ├─ generate_taiwan_dashboard_data.py
    └─ generate_taiwan_pl_summary.py
    ↓
JSON 파일 생성
    ├─ hongkong-dashboard-data.json
    ├─ taiwan-dashboard-data.json
    └─ taiwan-pl-data.json
    ↓
[검증 단계] ← metadata, 주요 숫자 확인
    ↓
npm run build
    ↓
[검증 단계] ← 로컬 테스트
    ↓
Git 커밋 & 푸시
    ↓
Vercel 자동 배포
    ↓
[검증 단계] ← 프로덕션 확인
```

---

## ⏱️ 예상 소요 시간

| 단계 | 작업 | 시간 |
|------|------|------|
| 1 | CSV 파일 준비 | 5분 |
| 2 | 환율 파일 업데이트 | 2분 |
| 3 | **CSV 데이터 검증** | 5분 |
| 4 | Python 스크립트 실행 | 5분 |
| 5 | JSON 파일 검증 | 3분 |
| 6 | 빌드 테스트 | 2분 |
| 7 | 로컬 테스트 | 5분 |
| 8 | Git 커밋 & 푸시 | 2분 |
| 9 | 프로덕션 확인 | 3분 |
| **합계** | | **32분** |

---

## 📝 체크리스트

### 사전 준비
- [ ] 대만 환율 파일 업데이트
- [ ] 홍콩 재고수불 CSV 준비
- [ ] 대만 재고수불 CSV 준비
- [ ] PL 데이터베이스 CSV 준비

### CSV 검증
- [ ] `python validate_csv_data.py 2511` 실행
- [ ] 모든 검증 통과 확인
- [ ] NULL/Zero 비율 확인
- [ ] 총 매출 합리성 확인

### 데이터 생성
- [ ] `python update_hongkong_dashboard.py` 실행
- [ ] `python generate_taiwan_dashboard_data.py` 실행
- [ ] `python generate_taiwan_pl_summary.py` 실행
- [ ] 모든 JSON 파일 생성 확인

### JSON 검증
- [ ] metadata.last_period = "2511"
- [ ] metadata.previous_period = "2411"
- [ ] total_net_sales > 0
- [ ] generated_at 날짜 최신

### 빌드 & 테스트
- [ ] `npm run build` 성공
- [ ] 로컬 서버 실행
- [ ] 홍콩 대시보드 확인
- [ ] 대만 대시보드 확인
- [ ] 비율 계산 정상 확인

### 배포
- [ ] Git 커밋
- [ ] Git 푸시
- [ ] Vercel 배포 확인
- [ ] 프로덕션 사이트 확인

---

## 🎓 교훈: 2509 실패 사례

### 무엇이 잘못되었나?

2509 Period 추가 시:
1. CSV 파일에 2509 행은 있었음
2. **하지만 대부분의 컬럼이 비어있거나 0**
3. Python 스크립트는 에러 없이 실행됨
4. JSON 파일이 생성되었지만 값이 0 또는 이상함
5. 빌드는 성공했지만 대시보드 숫자가 이상함

### 예방 방법

1. **항상 CSV 데이터 품질을 먼저 검증**
2. NULL/Zero 비율 확인
3. 총 매출이 합리적 범위인지 확인
4. 전월 대비 변동이 너무 크지 않은지 확인
5. 단계별로 결과 확인하고 넘어가기

### 핵심 원칙

> **"데이터가 있다 ≠ 데이터가 올바르다"**
>
> 반드시 검증 스크립트를 실행하고 통과한 후에만 진행하세요!

---

## 📞 문제 발생 시

1. 이 가이드의 문제 해결 섹션 확인
2. CSV 데이터 품질 재검증
3. Python 스크립트 로그 확인
4. JSON 파일 구조 확인
5. 브라우저 개발자 도구 콘솔 확인 (F12)

---

**마지막 업데이트**: 2025-12-04




