#!/usr/bin/env python3
"""
실판매출 요약 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sales_summary = data.get('sales_summary', {})
country_channel = data.get('country_channel_summary', {})

print("=" * 80)
print("실판매출 요약")
print("=" * 80)
print(f"실판매출 (1K HKD): {sales_summary.get('total_net_sales', 0):,.0f}")
print(f"YOY: {sales_summary.get('total_yoy', 0):.1f}% (△{sales_summary.get('total_change', 0):,.0f})")
print()
print("채널별 상세보기")
print()

# Country별로 그룹화
hk_data = {}
mc_data = {}

for key, value in country_channel.items():
    country = value['country']
    channel = value['channel']
    current = value['current']['net_sales'] / 1000  # 1K HKD
    yoy = value.get('yoy', 0)
    
    if country == 'HK':
        hk_data[channel] = {'net_sales': current, 'yoy': yoy}
    elif country == 'MO':  # 마카오는 MO로 표시됨
        mc_data[channel] = {'net_sales': current, 'yoy': yoy}

# HK 출력
print("HK (홍콩)")
hk_total = sum(v['net_sales'] for v in hk_data.values())
for channel in ['Retail', 'Outlet', 'Online']:
    if channel in hk_data:
        net_sales = hk_data[channel]['net_sales']
        yoy = hk_data[channel]['yoy']
        pct = (net_sales / hk_total * 100) if hk_total > 0 else 0
        print(f"  - {channel}: {net_sales:,.0f} ({yoy:.0f}%)")
    else:
        print(f"  - {channel}: 0 (0%)")
print(f"  총계: {hk_total:,.0f} (100%)")
print()

# MC 출력
print("MC (마카오)")
mc_total = sum(v['net_sales'] for v in mc_data.values())
for channel in ['Retail', 'Outlet', 'Online']:
    if channel in mc_data:
        net_sales = mc_data[channel]['net_sales']
        yoy = mc_data[channel]['yoy']
        pct = (net_sales / mc_total * 100) if mc_total > 0 else 0
        print(f"  - {channel}: {net_sales:,.0f} ({yoy:.0f}%)")
    else:
        print(f"  - {channel}: 0 (0%)")
print(f"  총계: {mc_total:,.0f} (100%)")
print()

print("=" * 80)
print("전년 동일매장 기준")
print("=" * 80)
print(f"실판매출 YOY (종료매장 제외): {sales_summary.get('same_store_yoy', 0):.1f}%")
print(f"* 종료매장 제외 (온라인 포함 {sales_summary.get('same_store_count', 0)}개 매장 기준)")

