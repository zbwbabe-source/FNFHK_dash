#!/usr/bin/env python3
"""
재고일수가 짧은 Subcategory 확인
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

season_sales = data.get('season_sales', {})
current_f = season_sales.get('current_season_f', {})
subcat_detail = current_f.get('accumulated', {}).get('subcategory_detail', [])

print("=" * 100)
print("25F 시즌 Subcategory별 재고일수 (짧은 순)")
print("=" * 100)

# 재고일수로 정렬 (짧은 순)
sorted_by_stock_days = sorted(subcat_detail, key=lambda x: x['stock_days'] if x['stock_days'] > 0 else 9999)

print(f"\n{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'입고액':>15} {'판매율':>10} {'재고일수':>10}")
print("-" * 100)

for i, item in enumerate(sorted_by_stock_days, 1):
    stock_days = item['stock_days']
    if stock_days == 0:
        stock_days_str = "0일 (재고없음)"
    else:
        stock_days_str = f"{stock_days:.0f}일"
    
    print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['net_acp_p']:>15,.0f} {item['sales_rate']:>9.1f}% {stock_days_str:>15}")

# TS와 비슷하거나 더 짧은 재고일수
print("\n\n[TS (67일)보다 재고일수가 짧거나 비슷한 Subcategory]")
print("-" * 100)
ts_stock_days = next((item['stock_days'] for item in subcat_detail if item['subcategory_code'] == 'TS'), 0)

low_stock_items = [item for item in subcat_detail if 0 < item['stock_days'] <= ts_stock_days + 20]  # TS보다 20일 이내
low_stock_items_sorted = sorted(low_stock_items, key=lambda x: x['stock_days'])

print(f"{'Subcategory Code':<20} {'Subcategory Name':<30} {'입고액':>15} {'판매율':>10} {'재고일수':>10}")
print("-" * 100)

for item in low_stock_items_sorted:
    print(f"{item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['net_acp_p']:>15,.0f} {item['sales_rate']:>9.1f}% {item['stock_days']:>9.0f}일")

# 재고일수 상위 10개 (짧은 순)
print("\n\n[재고일수 상위 10개 (짧은 순, 재고 있는 것만)]")
print("-" * 100)
valid_items = [item for item in sorted_by_stock_days if item['stock_days'] > 0][:10]

print(f"{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'입고액':>15} {'판매율':>10} {'재고일수':>10}")
print("-" * 100)

for i, item in enumerate(valid_items, 1):
    print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['net_acp_p']:>15,.0f} {item['sales_rate']:>9.1f}% {item['stock_days']:>9.0f}일")





