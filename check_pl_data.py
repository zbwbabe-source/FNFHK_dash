#!/usr/bin/env python3
"""손익 데이터 확인"""
import csv

csv_file = 'components/dashboard/hmd_pl_database.csv'

# 202510 Period의 HK 데이터 확인
with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = [r for r in reader if r['PERIOD'] == '202510' and r['CNTRY_CD'] == 'HK' and r['BRD_CD'] != 'F']

print(f"202510 HK 데이터 (F 제외): {len(rows)}건")
print("\n실매출액 데이터:")
act_sales = [r for r in rows if r['ACCOUNT_NM'] == '실매출액' or r['ACCOUNT_CD'] == 'ACT_SALE_AMT']
print(f"실매출액 건수: {len(act_sales)}")
total_act_sales = sum(float(r['VALUE'] or 0) for r in act_sales)
print(f"실매출액 합계: {total_act_sales:,.2f}")
print("\n매장별 실매출액 (상위 10개):")
for r in sorted(act_sales, key=lambda x: float(x['VALUE'] or 0), reverse=True)[:10]:
    print(f"  {r['SHOP_CD']} {r['SHOP_NM']}: {float(r['VALUE'] or 0):,.2f}")

print("\nTag매출액 데이터:")
tag_sales = [r for r in rows if r['ACCOUNT_NM'] == 'Tag매출액' or r['ACCOUNT_CD'] == 'TAG_SALE_AMT']
print(f"Tag매출액 건수: {len(tag_sales)}")
total_tag_sales = sum(float(r['VALUE'] or 0) for r in tag_sales)
print(f"Tag매출액 합계: {total_tag_sales:,.2f}")





