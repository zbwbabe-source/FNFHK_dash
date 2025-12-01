#!/usr/bin/env python3
"""
점당매출 계산에 포함된 매장 목록 표시 (수정된 기준)
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

store_summary = data.get('store_summary', {})
sales_per_store = data.get('sales_summary', {}).get('sales_per_store', {})

# 제외 매장
EXCLUDED_STORES = {'M08', 'M20', 'M05', 'M12'}

print("=" * 100)
print("점당매출 계산 기준 매장 목록 (수정된 기준)")
print("=" * 100)
print("\n[제외 매장]")
print("  - M08, M20: 폐점 매장")
print("  - M05: 리뉴얼공사로 비정상운영")
print("  - M12: 10월 11일 폐점")
print("\n[M10과 M10A는 같은 매장으로 합산]")
print("-" * 100)

# 현재 Period (Net Sales > 0인 매장, 제외 매장 제외, M10A 제외)
print("\n[현재 Period]")
print("-" * 100)
print(f"{'Store Code':<12} {'Store Name':<40} {'Category':<15} {'Net Sales (1K)':>15} {'할인율':>10}")
print("-" * 100)

current_stores = []
total_net_sales_current = 0
for store_code, store in sorted(store_summary.items()):
    if (store_code not in EXCLUDED_STORES 
        and store_code != 'M10A'  # M10A는 M10에 합쳐짐
        and store['current']['net_sales'] > 0):
        current_stores.append((store_code, store))
        net_sales_k = store['current']['net_sales'] / 1000
        total_net_sales_current += store['current']['net_sales']
        discount = store['current']['discount_rate']
        store_name = store['store_name']
        if store_code == 'M10':
            store_name += ' (M10+M10A 합산)'
        print(f"{store_code:<12} {store_name[:38]:<40} {store['category']:<15} {net_sales_k:>15,.2f} {discount:>9.2f}%")

print(f"\n총 {len(current_stores)}개 매장")
print(f"총 Net Sales: {total_net_sales_current / 1000:,.2f} (1K HKD)")

# 전년 동월 (Net Sales > 0인 매장, 제외 매장 제외, M10A 제외)
print("\n\n[전년 동월]")
print("-" * 100)
print(f"{'Store Code':<12} {'Store Name':<40} {'Category':<15} {'Net Sales (1K)':>15} {'할인율':>10}")
print("-" * 100)

previous_stores = []
total_net_sales_previous = 0
for store_code, store in sorted(store_summary.items()):
    if (store_code not in EXCLUDED_STORES 
        and store_code != 'M10A'  # M10A는 M10에 합쳐짐
        and store['previous']['net_sales'] > 0):
        previous_stores.append((store_code, store))
        net_sales_k = store['previous']['net_sales'] / 1000
        total_net_sales_previous += store['previous']['net_sales']
        discount = store['previous']['discount_rate']
        store_name = store['store_name']
        if store_code == 'M10':
            store_name += ' (M10+M10A 합산)'
        print(f"{store_code:<12} {store_name[:38]:<40} {store['category']:<15} {net_sales_k:>15,.2f} {discount:>9.2f}%")

print(f"\n총 {len(previous_stores)}개 매장")
print(f"총 Net Sales: {total_net_sales_previous / 1000:,.2f} (1K HKD)")

# 점당매출
print("\n\n[점당매출 계산]")
print("-" * 100)
current_sps = total_net_sales_current / len(current_stores) if len(current_stores) > 0 else 0
previous_sps = total_net_sales_previous / len(previous_stores) if len(previous_stores) > 0 else 0
yoy = (current_sps / previous_sps * 100) if previous_sps > 0 else 0
change = current_sps - previous_sps

print(f"현재 점당매출: {current_sps / 1000:,.2f} (1K HKD)")
print(f"전년 동월 점당매출: {previous_sps / 1000:,.2f} (1K HKD)")
print(f"전년비: {yoy:.1f}%")
print(f"변화: △{change / 1000:+,.2f} (1K HKD)")





