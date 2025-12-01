#!/usr/bin/env python3
"""
10월 Net Sales 기준 판매액이 높은 Subcategory (재고일수 짧은 순)
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

season_sales = data.get('season_sales', {})
current_f = season_sales.get('current_season_f', {})

# 10월 판매 데이터
october_data = current_f.get('october', {})
october_top5 = october_data.get('subcategory_top5', [])

# 누적 데이터 (재고일수 포함)
accumulated_data = current_f.get('accumulated', {})
subcat_detail = accumulated_data.get('subcategory_detail', [])

# 10월 Net Sales를 딕셔너리로 변환
october_sales_dict = {item['subcategory_code']: item['net_sales'] for item in october_top5}

# 재고일수 데이터와 결합
combined_data = []
for subcat in subcat_detail:
    subcat_code = subcat['subcategory_code']
    october_sales = october_sales_dict.get(subcat_code, 0)
    combined_data.append({
        'subcategory_code': subcat_code,
        'subcategory_name': subcat['subcategory_name'],
        'october_net_sales': october_sales,
        'stock_days': subcat['stock_days'],
        'sales_rate': subcat['sales_rate'],
        'net_acp_p': subcat['net_acp_p'],
    })

# 10월 Net Sales 높은 순으로 정렬
sorted_by_october_sales = sorted(combined_data, key=lambda x: x['october_net_sales'], reverse=True)

print("=" * 120)
print("10월 Net Sales 기준 판매액 순위 (25F 시즌)")
print("=" * 120)

print(f"\n{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'10월 Net Sales':>18} {'재고일수':>12} {'판매율':>10}")
print("-" * 120)

for i, item in enumerate(sorted_by_october_sales, 1):
    if item['october_net_sales'] > 0:  # 10월 판매가 있는 것만
        stock_days_str = f"{item['stock_days']:.0f}일" if item['stock_days'] > 0 else "재고없음"
        print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
              f"{item['october_net_sales']:>15,.0f} (1K HKD) {stock_days_str:>12} {item['sales_rate']:>9.1f}%")

# 재고일수가 짧은 것들 중에서 10월 Net Sales 높은 순 (상위 10개)
print("\n\n" + "=" * 120)
print("재고일수 300일 이하 중 10월 Net Sales 높은 순 (상위 10개)")
print("=" * 120)

low_stock_items_300 = [item for item in combined_data if 0 < item['stock_days'] <= 300 and item['october_net_sales'] > 0]
low_stock_sorted_300 = sorted(low_stock_items_300, key=lambda x: x['october_net_sales'], reverse=True)[:10]

print(f"\n{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'10월 Net Sales':>18} {'재고일수':>12} {'판매율':>10}")
print("-" * 120)

for i, item in enumerate(low_stock_sorted_300, 1):
    print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['october_net_sales']:>15,.0f} (1K HKD) {item['stock_days']:>9.0f}일 {item['sales_rate']:>9.1f}%")

# 재고일수가 짧은 것들 중에서 10월 Net Sales 높은 순
print("\n\n" + "=" * 120)
print("재고일수 100일 이하 중 10월 Net Sales 높은 순")
print("=" * 120)

low_stock_items = [item for item in combined_data if 0 < item['stock_days'] <= 100 and item['october_net_sales'] > 0]
low_stock_sorted = sorted(low_stock_items, key=lambda x: x['october_net_sales'], reverse=True)

print(f"\n{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'10월 Net Sales':>18} {'재고일수':>12} {'판매율':>10}")
print("-" * 120)

for i, item in enumerate(low_stock_sorted, 1):
    print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['october_net_sales']:>15,.0f} (1K HKD) {item['stock_days']:>9.0f}일 {item['sales_rate']:>9.1f}%")

# 재고일수 200일 이하 중에서도 확인
print("\n\n" + "=" * 120)
print("재고일수 200일 이하 중 10월 Net Sales 높은 순")
print("=" * 120)

low_stock_items_200 = [item for item in combined_data if 0 < item['stock_days'] <= 200 and item['october_net_sales'] > 0]
low_stock_sorted_200 = sorted(low_stock_items_200, key=lambda x: x['october_net_sales'], reverse=True)

print(f"\n{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'10월 Net Sales':>18} {'재고일수':>12} {'판매율':>10}")
print("-" * 120)

for i, item in enumerate(low_stock_sorted_200, 1):
    print(f"{i:<6} {item['subcategory_code']:<20} {item['subcategory_name'][:28]:<30} "
          f"{item['october_net_sales']:>15,.0f} (1K HKD) {item['stock_days']:>9.0f}일 {item['sales_rate']:>9.1f}%")

