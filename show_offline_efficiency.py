#!/usr/bin/env python3
"""
오프라인 매장 효율성 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

offline_eff = data.get('offline_store_efficiency', {})
total = offline_eff.get('total', {})
by_channel = offline_eff.get('by_channel', {})

print("=" * 100)
print("매장 효율성 (오프라인)")
print("=" * 100)

current_total = total.get('current', {})
previous_total = total.get('previous', {})
yoy = total.get('yoy', 0)

print(f"\n계산근거:")
print(f"전년 {previous_total.get('store_count', 0)}개, 점당 {previous_total.get('sales_per_store', 0):,.0f} | "
      f"당월 {current_total.get('store_count', 0)}개, 점당 {current_total.get('sales_per_store', 0):,.0f} "
      f"(YOY {yoy:.0f}%)")

print(f"\n채널별 매장수 & 점당매출 (1K HKD)")
print("-" * 100)

# HK Retail, HK Outlet, MC Retail, MC Outlet 순서로 출력
channels = [
    ('HK', 'Retail'),
    ('HK', 'Outlet'),
    ('MO', 'Retail'),
    ('MO', 'Outlet'),
]

for country, channel in channels:
    key = f"{country}_{channel}"
    if key in by_channel:
        cc = by_channel[key]
        current = cc.get('current', {})
        previous = cc.get('previous', {})
        store_count_curr = current.get('store_count', 0)
        store_count_prev = previous.get('store_count', 0)
        store_count_change = cc.get('store_count_change', 0)
        sales_per_store = current.get('sales_per_store', 0) / 1000  # 1K HKD
        yoy_pct = cc.get('yoy', 0)
        
        country_name = 'HK (홍콩)' if country == 'HK' else 'MC (마카오)'
        change_str = f"△{store_count_change:+d}개" if store_count_change != 0 else f"±0개"
        
        print(f"{country_name} {channel} {store_count_curr}개({change_str})")
        print(f"  {sales_per_store:,.0f} ({yoy_pct:.0f}%)")

print(f"\n오프라인 TOTAL {current_total.get('store_count', 0)}개")
print(f"점당 {current_total.get('sales_per_store', 0):,.0f} ({yoy:.0f}%)")
print(f"\n전년 오프라인 {previous_total.get('store_count', 0)}개")
print(f"점당 {previous_total.get('sales_per_store', 0):,.0f}")





