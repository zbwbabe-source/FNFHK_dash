#!/usr/bin/env python3
"""디스커버리 데이터 확인"""
import csv
from collections import defaultdict

csv_file = 'components/dashboard/hmd_pl_database.csv'

# 디스커버리 HK 202510 데이터
with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    rows = [r for r in reader if r['PERIOD'] == '202510' and r['CNTRY_CD'] == 'HK' and r['BRD_CD'] == 'X']

result = defaultdict(float)
for r in rows:
    account_nm = r['ACCOUNT_NM'].strip()
    value = float(r['VALUE'] or 0)
    result[account_nm] += value

print('디스커버리 HK 202510:')
print(f"판매관리비: {result.get('판매관리비', 0):,.2f}")
print(f"직접비 합계 계산:")

direct_cost_items = ['1. 급 여', '4. 임차료', '11. 운반비', '12. 기타 수수료(매장관리비 외)', 
                      '13. 보험료', '14. 감가상각비', '15. 면세점 직접비', '2. TRAVEL & MEAL',
                      '3. 피복비(유니폼)', '5. 유지보수비', '6. 수도광열비', '7. 소모품비',
                      '8. 통신비', '9. 광고선전비', '10. 지급수수료',
                      ' - Base Rent', ' - Payroll', ' - EMPLOYEE BENEFIT PROGRAMS']

direct_cost_total = 0
for item in direct_cost_items:
    if item in result:
        print(f"  {item}: {result[item]:,.2f}")
        direct_cost_total += result[item]

print(f"직접비 합계: {direct_cost_total:,.2f}")
print(f"영업비 (판매관리비 - 직접비): {result.get('판매관리비', 0) - direct_cost_total:,.2f}")

print(f"\n마케팅비 관련:")
print(f"  9. 광고선전비: {result.get('9. 광고선전비', 0):,.2f}")
print(f"  - KOL / other: {result.get(' - KOL / other', 0):,.2f}")
print(f"  합계: {result.get('9. 광고선전비', 0) + result.get(' - KOL / other', 0):,.2f}")

print(f"\n여비교통비:")
print(f"  2. TRAVEL & MEAL: {result.get('2. TRAVEL & MEAL', 0):,.2f}")

print(f"\n전체 계정 항목:")
for k, v in sorted(result.items()):
    if v != 0:
        print(f"  {k}: {v:,.2f}")





