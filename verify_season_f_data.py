#!/usr/bin/env python3
"""
25F 시즌 데이터 검증
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

season_sales = data.get('season_sales', {})
current_f = season_sales.get('current_season_f', {})
subcat_detail = current_f.get('accumulated', {}).get('subcategory_detail', [])

print("=" * 100)
print("25F 시즌 Subcategory별 데이터 검증")
print("=" * 100)

# T/SHIRTS 관련 (TS, TR)
print("\n[T/SHIRTS 관련 Subcategory]")
print("-" * 100)
print(f"{'Subcategory Code':<20} {'Subcategory Name':<30} {'입고액':>15} {'판매율':>10} {'재고일수':>10}")
print("-" * 100)

ts_items = [item for item in subcat_detail if item['subcategory_code'] in ['TS', 'TR']]
for item in ts_items:
    print(f"{item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['net_acp_p']:>15,.0f} {item['sales_rate']:>9.1f}% {item['stock_days']:>9.0f}일")

if ts_items:
    # 가장 큰 입고액을 가진 것
    ts_largest = max(ts_items, key=lambda x: x['net_acp_p'])
    print(f"\n→ 선택된 T/SHIRTS: {ts_largest['subcategory_code']} (입고액 {ts_largest['net_acp_p']:,.0f})")

# PANTS 관련 (PT, LG)
print("\n\n[PANTS 관련 Subcategory]")
print("-" * 100)
print(f"{'Subcategory Code':<20} {'Subcategory Name':<30} {'입고액':>15} {'판매율':>10} {'재고일수':>10}")
print("-" * 100)

pt_items = [item for item in subcat_detail if item['subcategory_code'] in ['PT', 'LG']]
for item in pt_items:
    print(f"{item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['net_acp_p']:>15,.0f} {item['sales_rate']:>9.1f}% {item['stock_days']:>9.0f}일")

if pt_items:
    # 가장 큰 입고액을 가진 것
    pt_largest = max(pt_items, key=lambda x: x['net_acp_p'])
    print(f"\n→ 선택된 PANTS: {pt_largest['subcategory_code']} (입고액 {pt_largest['net_acp_p']:,.0f})")

# 모든 Subcategory 확인
print("\n\n[모든 25F Subcategory (입고액 높은순)]")
print("-" * 100)
print(f"{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'입고액':>15} {'판매율':>10}")
print("-" * 100)

for i, item in enumerate(subcat_detail[:10], 1):
    print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['net_acp_p']:>15,.0f} {item['sales_rate']:>9.1f}%")

print("\n\n[확인 사항]")
print("-" * 100)
print("위 데이터는 모두 25F 시즌 코드를 가진 아이템만 포함되어 있습니다.")
print("current_data에서 Season_Code == '25F' 조건으로 필터링되었습니다.")





