#!/usr/bin/env python3
"""
매장별 손익 데이터베이스 분석
"""
import csv
from collections import defaultdict

csv_file = '../Dashboard_Raw_Data/hmd_pl_database (1).csv'

print("=" * 100)
print("매장별 손익 데이터베이스 분석")
print("=" * 100)

# 파일 읽기
with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"\n총 행 수: {len(rows):,}")

# 컬럼 확인
print(f"\n컬럼명:")
for i, col in enumerate(reader.fieldnames):
    print(f"  {i+1}. {col}")

# Period 범위 확인
periods = sorted(set(row['PERIOD'] for row in rows))
print(f"\nPeriod 범위: {periods[0]} ~ {periods[-1]} (총 {len(periods)}개 기간)")

# 브랜드 확인
brands = sorted(set(row['BRD_CD'] for row in rows))
print(f"\n브랜드: {', '.join(brands)}")

# 국가 확인
countries = sorted(set(row['CNTRY_CD'] for row in rows))
print(f"\n국가: {', '.join(countries)}")

# 매장 수 확인
shops = set((row['CNTRY_CD'], row['SHOP_CD'], row['SHOP_NM']) for row in rows)
print(f"\n매장 수: {len(shops)}개")
print("\n매장 샘플 (최대 10개):")
for i, (country, code, name) in enumerate(sorted(shops)[:10]):
    print(f"  {country} {code}: {name}")

# 계정 항목 확인
accounts = sorted(set((row['ACCOUNT_NM'], row['ACCOUNT_CD']) for row in rows))
print(f"\n계정 항목 수: {len(accounts)}개")
print("\n계정 항목 샘플 (최대 20개):")
for i, (name, code) in enumerate(accounts[:20]):
    print(f"  {name} ({code})")

# 최신 Period 확인
latest_period = max(periods)
print(f"\n최신 Period: {latest_period}")

# 최신 Period의 HK 매장별 주요 항목 확인
print(f"\n최신 Period ({latest_period}) HK 매장별 주요 항목 샘플:")
hk_shops = set(row['SHOP_CD'] for row in rows if row['PERIOD'] == latest_period and row['CNTRY_CD'] == 'HK')
for shop_code in sorted(list(hk_shops))[:5]:
    shop_data = [row for row in rows if row['PERIOD'] == latest_period and row['CNTRY_CD'] == 'HK' and row['SHOP_CD'] == shop_code]
    shop_name = shop_data[0]['SHOP_NM'] if shop_data else ''
    print(f"\n  매장: {shop_code} ({shop_name})")
    # 주요 항목만 표시
    key_accounts = ['실매출액', 'Tag매출액', '매출원가', '매출총이익', '판매관리비', '영업이익']
    for account_name in key_accounts:
        account_rows = [r for r in shop_data if r['ACCOUNT_NM'] == account_name]
        if account_rows:
            value = float(account_rows[0]['VALUE'] or 0)
            print(f"    {account_name}: {value:,.2f}")





