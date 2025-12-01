#!/usr/bin/env python3
"""
제외 매장이 제대로 제외되었는지 확인
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

store_summary = data.get('store_summary', {})
sales_summary = data.get('sales_summary', {})

EXCLUDED_STORES = {'M08', 'M20', 'M05', 'M12'}

print("=" * 100)
print("제외 매장 검증")
print("=" * 100)

# 제외 매장의 Net Sales 확인
print("\n[제외 매장의 Net Sales]")
print("-" * 100)
excluded_current_total = 0
excluded_previous_total = 0
for code in EXCLUDED_STORES:
    if code in store_summary:
        store = store_summary[code]
        current = store['current']['net_sales'] / 1000
        previous = store['previous']['net_sales'] / 1000
        excluded_current_total += store['current']['net_sales']
        excluded_previous_total += store['previous']['net_sales']
        print(f"{code}: 현재 {current:,.2f} (1K HKD), 전년 {previous:,.2f} (1K HKD)")

print(f"\n제외 매장 총 Net Sales: 현재 {excluded_current_total/1000:,.2f}, 전년 {excluded_previous_total/1000:,.2f} (1K HKD)")

# 전체 Net Sales 확인
print("\n[전체 Net Sales 비교]")
print("-" * 100)

# 모든 매장의 Net Sales 합계
all_stores_current = sum(store['current']['net_sales'] for store in store_summary.values())
all_stores_previous = sum(store['previous']['net_sales'] for store in store_summary.values())

# 제외 매장을 제외한 Net Sales (M10A도 제외)
included_stores_current = sum(
    store['current']['net_sales'] 
    for code, store in store_summary.items() 
    if code not in EXCLUDED_STORES and code != 'M10A'
)
included_stores_previous = sum(
    store['previous']['net_sales'] 
    for code, store in store_summary.items() 
    if code not in EXCLUDED_STORES and code != 'M10A'
)

print(f"모든 매장 Net Sales 합계:")
print(f"  현재: {all_stores_current/1000:,.2f} (1K HKD)")
print(f"  전년: {all_stores_previous/1000:,.2f} (1K HKD)")

print(f"\n제외 매장 제외 후 Net Sales:")
print(f"  현재: {included_stores_current/1000:,.2f} (1K HKD)")
print(f"  전년: {included_stores_previous/1000:,.2f} (1K HKD)")

print(f"\nJSON 파일의 total_net_sales:")
print(f"  현재: {sales_summary.get('total_net_sales', 0):,.2f} (1K HKD)")
print(f"  전년: {sales_summary.get('total_net_sales', 0) / (sales_summary.get('total_yoy', 0)/100 + 1) if sales_summary.get('total_yoy', 0) != -100 else 0:,.2f} (1K HKD)")

# 매장수 확인
print("\n[매장수 비교]")
print("-" * 100)
all_active_current = len([s for s in store_summary.values() if s['current']['net_sales'] > 0])
all_active_previous = len([s for s in store_summary.values() if s['previous']['net_sales'] > 0])

included_active_current = len([
    store for code, store in store_summary.items() 
    if code not in EXCLUDED_STORES 
    and code != 'M10A'
    and store['current']['net_sales'] > 0
])
included_active_previous = len([
    store for code, store in store_summary.items() 
    if code not in EXCLUDED_STORES 
    and code != 'M10A'
    and store['previous']['net_sales'] > 0
])

print(f"모든 매장 중 Net Sales > 0인 매장:")
print(f"  현재: {all_active_current}개")
print(f"  전년: {all_active_previous}개")

print(f"\n제외 매장 제외 후 Net Sales > 0인 매장:")
print(f"  현재: {included_active_current}개")
print(f"  전년: {included_active_previous}개")

print(f"\nJSON 파일의 매장수:")
sps = sales_summary.get('sales_per_store', {})
print(f"  현재: {sps.get('store_count_current', 0)}개")
print(f"  전년: {sps.get('store_count_previous', 0)}개")

# 검증
print("\n[검증 결과]")
print("-" * 100)
if abs(included_stores_current/1000 - sales_summary.get('total_net_sales', 0)) < 0.01:
    print("✓ Net Sales 계산이 올바릅니다")
else:
    print("✗ Net Sales 계산에 오류가 있습니다")
    print(f"  차이: {abs(included_stores_current/1000 - sales_summary.get('total_net_sales', 0)):,.2f}")

if included_active_current == sps.get('store_count_current', 0):
    print("✓ 매장수 계산이 올바릅니다")
else:
    print("✗ 매장수 계산에 오류가 있습니다")
    print(f"  차이: {abs(included_active_current - sps.get('store_count_current', 0))}")





