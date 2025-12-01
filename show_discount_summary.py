#!/usr/bin/env python3
"""
할인율 요약 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sales_summary = data.get('sales_summary', {})
country_channel = data.get('country_channel_summary', {})

print("=" * 80)
print("할인율 요약")
print("=" * 80)

# 전체 할인율
total_discount = sales_summary.get('total_discount_rate', 0)
total_discount_prev = sales_summary.get('total_discount_rate_previous', 0)
total_discount_change = sales_summary.get('total_discount_rate_change', 0)

print(f"할인율: {total_discount:.1f}%")
print(f"YOY △{total_discount_change:+.1f}%p")
print()
print("지역/채널별 할인율")
print()

# Country별로 그룹화
hk_data = {}
mc_data = {}

for key, value in country_channel.items():
    country = value['country']
    channel = value['channel']
    current_discount = value['current']['discount_rate']
    previous_discount = value['previous']['discount_rate']
    
    if country == 'HK':
        hk_data[channel] = {
            'current': current_discount,
            'previous': previous_discount
        }
    elif country == 'MO':  # 마카오는 MO로 표시됨
        mc_data[channel] = {
            'current': current_discount,
            'previous': previous_discount
        }

# HK 전체 할인율 계산
hk_total_gross = sum(v['current']['gross_sales'] for v in country_channel.values() if v['country'] == 'HK')
hk_total_net = sum(v['current']['net_sales'] for v in country_channel.values() if v['country'] == 'HK')
hk_total_discount = ((hk_total_gross - hk_total_net) / hk_total_gross * 100) if hk_total_gross > 0 else 0

hk_total_gross_prev = sum(v['previous']['gross_sales'] for v in country_channel.values() if v['country'] == 'HK')
hk_total_net_prev = sum(v['previous']['net_sales'] for v in country_channel.values() if v['country'] == 'HK')
hk_total_discount_prev = ((hk_total_gross_prev - hk_total_net_prev) / hk_total_gross_prev * 100) if hk_total_gross_prev > 0 else 0

# MC 전체 할인율 계산
mc_total_gross = sum(v['current']['gross_sales'] for v in country_channel.values() if v['country'] == 'MO')
mc_total_net = sum(v['current']['net_sales'] for v in country_channel.values() if v['country'] == 'MO')
mc_total_discount = ((mc_total_gross - mc_total_net) / mc_total_gross * 100) if mc_total_gross > 0 else 0

mc_total_gross_prev = sum(v['previous']['gross_sales'] for v in country_channel.values() if v['country'] == 'MO')
mc_total_net_prev = sum(v['previous']['net_sales'] for v in country_channel.values() if v['country'] == 'MO')
mc_total_discount_prev = ((mc_total_gross_prev - mc_total_net_prev) / mc_total_gross_prev * 100) if mc_total_gross_prev > 0 else 0

# HK 출력
print("HK (홍콩) 전체")
print(f"  {hk_total_discount:.1f}% (전년 {hk_total_discount_prev:.1f}%)")
for channel in ['Retail', 'Outlet', 'Online']:
    if channel in hk_data:
        current = hk_data[channel]['current']
        previous = hk_data[channel]['previous']
        print(f"  - {channel}: {current:.1f}% (전년 {previous:.1f}%)")
    else:
        print(f"  - {channel}: 0.0% (전년 0.0%)")
print()

# MC 출력
print("MC (마카오) 전체")
print(f"  {mc_total_discount:.1f}% (전년 {mc_total_discount_prev:.1f}%)")
for channel in ['Retail', 'Outlet', 'Online']:
    if channel in mc_data:
        current = mc_data[channel]['current']
        previous = mc_data[channel]['previous']
        print(f"  - {channel}: {current:.1f}% (전년 {previous:.1f}%)")
    else:
        print(f"  - {channel}: 0.0% (전년 0.0%)")





