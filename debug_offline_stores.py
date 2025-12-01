#!/usr/bin/env python3
"""
오프라인 매장 상세 확인
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

store_summary = data.get('store_summary', {})
EXCLUDED_STORES = {'M08', 'M20', 'M05', 'M12'}

print("=" * 100)
print("오프라인 매장 상세 (현재 Period)")
print("=" * 100)
print(f"{'Store Code':<12} {'Store Name':<40} {'Country':<6} {'Channel':<10} {'Net Sales (1K)':>15}")
print("-" * 100)

current_offline = []
for code, store in sorted(store_summary.items()):
    if (code not in EXCLUDED_STORES 
        and code != 'M10A'
        and store['channel'] != 'Online'
        and store['current']['net_sales'] > 0):
        current_offline.append((code, store))
        net_sales_k = store['current']['net_sales'] / 1000
        print(f"{code:<12} {store['store_name'][:38]:<40} {store.get('country', ''):<6} {store['channel']:<10} {net_sales_k:>15,.2f}")

print(f"\n총 {len(current_offline)}개 매장")

print("\n" + "=" * 100)
print("오프라인 매장 상세 (전년 동월)")
print("=" * 100)
print(f"{'Store Code':<12} {'Store Name':<40} {'Country':<6} {'Channel':<10} {'Net Sales (1K)':>15}")
print("-" * 100)

previous_offline = []
for code, store in sorted(store_summary.items()):
    if (code not in EXCLUDED_STORES 
        and code != 'M10A'
        and store['channel'] != 'Online'
        and store['previous']['net_sales'] > 0):
        previous_offline.append((code, store))
        net_sales_k = store['previous']['net_sales'] / 1000
        print(f"{code:<12} {store['store_name'][:38]:<40} {store.get('country', ''):<6} {store['channel']:<10} {net_sales_k:>15,.2f}")

print(f"\n총 {len(previous_offline)}개 매장")

# 차이점
current_codes = {code for code, _ in current_offline}
previous_codes = {code for code, _ in previous_offline}

only_current = current_codes - previous_codes
only_previous = previous_codes - current_codes

print("\n" + "=" * 100)
print("차이점")
print("=" * 100)
if only_current:
    print(f"현재에만 있는 매장 ({len(only_current)}개): {sorted(only_current)}")
if only_previous:
    print(f"전년에만 있는 매장 ({len(only_previous)}개): {sorted(only_previous)}")





