#!/usr/bin/env python3
"""
점당매출 계산에 포함된 매장 목록 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

store_summary = data.get('store_summary', {})
sales_per_store = data.get('sales_summary', {}).get('sales_per_store', {})

print("=" * 100)
print("점당매출 계산 기준 매장 목록")
print("=" * 100)

# 현재 Period (Net Sales > 0인 매장)
print("\n[현재 Period - 24개 매장]")
print("-" * 100)
print(f"{'Store Code':<12} {'Store Name':<40} {'Category':<15} {'Net Sales (1K)':>15} {'할인율':>10}")
print("-" * 100)

current_stores = []
for store_code, store in sorted(store_summary.items()):
    if store['current']['net_sales'] > 0:
        current_stores.append((store_code, store))
        net_sales_k = store['current']['net_sales'] / 1000
        discount = store['current']['discount_rate']
        print(f"{store_code:<12} {store['store_name'][:38]:<40} {store['category']:<15} {net_sales_k:>15,.2f} {discount:>9.2f}%")

print(f"\n총 {len(current_stores)}개 매장")
print(f"총 Net Sales: {sum(s['current']['net_sales'] for s in store_summary.values() if s['current']['net_sales'] > 0) / 1000:,.2f} (1K HKD)")

# 전년 동월 (Net Sales > 0인 매장)
print("\n\n[전년 동월 - 25개 매장]")
print("-" * 100)
print(f"{'Store Code':<12} {'Store Name':<40} {'Category':<15} {'Net Sales (1K)':>15} {'할인율':>10}")
print("-" * 100)

previous_stores = []
for store_code, store in sorted(store_summary.items()):
    if store['previous']['net_sales'] > 0:
        previous_stores.append((store_code, store))
        net_sales_k = store['previous']['net_sales'] / 1000
        discount = store['previous']['discount_rate']
        print(f"{store_code:<12} {store['store_name'][:38]:<40} {store['category']:<15} {net_sales_k:>15,.2f} {discount:>9.2f}%")

print(f"\n총 {len(previous_stores)}개 매장")
print(f"총 Net Sales: {sum(s['previous']['net_sales'] for s in store_summary.values() if s['previous']['net_sales'] > 0) / 1000:,.2f} (1K HKD)")

# 차이점 분석
print("\n\n[차이점 분석]")
print("-" * 100)
current_store_codes = {code for code, _ in current_stores}
previous_store_codes = {code for code, _ in previous_stores}

# 현재에만 있는 매장
only_current = current_store_codes - previous_store_codes
if only_current:
    print(f"현재에만 있는 매장 ({len(only_current)}개):")
    for code in sorted(only_current):
        store = store_summary[code]
        print(f"  - {code}: {store['store_name']} (Net Sales: {store['current']['net_sales']/1000:,.2f} 1K HKD)")

# 전년에만 있는 매장
only_previous = previous_store_codes - current_store_codes
if only_previous:
    print(f"\n전년에만 있는 매장 ({len(only_previous)}개):")
    for code in sorted(only_previous):
        store = store_summary[code]
        print(f"  - {code}: {store['store_name']} (Net Sales: {store['previous']['net_sales']/1000:,.2f} 1K HKD)")

# 공통 매장
common_stores = current_store_codes & previous_store_codes
print(f"\n공통 매장: {len(common_stores)}개")





