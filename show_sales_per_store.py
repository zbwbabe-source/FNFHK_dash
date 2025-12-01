#!/usr/bin/env python3
"""
점당매출 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sales_summary = data.get('sales_summary', {})
sales_per_store = sales_summary.get('sales_per_store', {})

print("=" * 80)
print("점당매출 요약")
print("=" * 80)

current = sales_per_store.get('current', 0)
previous = sales_per_store.get('previous', 0)
yoy = sales_per_store.get('yoy', 0)
change = sales_per_store.get('change', 0)
store_count_current = sales_per_store.get('store_count_current', 0)
store_count_previous = sales_per_store.get('store_count_previous', 0)

print(f"점당매출 (1K HKD): {current:,.2f}")
print(f"전년 동월: {previous:,.2f}")
print(f"전년비: {yoy:.1f}%")
print(f"변화: △{change:+,.2f}")
print()
print(f"매장수:")
print(f"  현재 Period: {store_count_current}개")
print(f"  전년 동월: {store_count_previous}개")
print()
print(f"총 실판매출:")
print(f"  현재: {sales_summary.get('total_net_sales', 0):,.0f} (1K HKD)")
print(f"  전년: {sales_summary.get('total_net_sales', 0) / (yoy/100) if yoy > 0 else 0:,.0f} (1K HKD)")





