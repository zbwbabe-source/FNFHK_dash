#!/usr/bin/env python3
"""
ACC 재고주수 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

acc_stock = data.get('acc_stock_summary', {})
total = acc_stock.get('total', {})
by_category = acc_stock.get('by_category', {})
october_sales = acc_stock.get('october_sales', {})

print("=" * 100)
print("ACC 재고주수")
print("=" * 100)

total_current = total.get('current', {})
total_previous = total.get('previous', {})
total_change = total.get('stock_weeks_change', 0)

stock_weeks_current = total_current.get('stock_weeks', 0)
stock_weeks_previous = total_previous.get('stock_weeks', 0)

print(f"\nACC 재고주수: {stock_weeks_current:.1f}주")
print(f"전년 {stock_weeks_previous:.1f}주 | YOY △{total_change:+.1f}주")
print(f"\n📌 계산기준: 직전 6개월간 누적매출 기준")

# 아이템별 재고주수
print(f"\n아이템별 재고주수")
print("-" * 100)
print(f"{'카테고리':<15} {'재고주수':>15} {'변화':>15}")
print("-" * 100)

# 신발, 모자, 가방외 순서로
category_order = ['SHO', 'HEA']  # 신발, 모자
for cat_code in category_order:
    if cat_code in by_category:
        cat_data = by_category[cat_code]
        cat_name = cat_data['category_name']
        current_weeks = cat_data['current']['stock_weeks']
        change = cat_data.get('stock_weeks_change', 0)
        print(f"{cat_name:<15} {current_weeks:>13.1f}주 (△{change:+.1f}주)")

# 가방외 (HEA, SHO 제외한 나머지 모든 Category)
bag_others_codes = [cat_code for cat_code in by_category.keys() if cat_code not in category_order]
if bag_others_codes:
    total_bag_others_current = sum(by_category[cat_code]['current']['stock_price'] for cat_code in bag_others_codes)
    total_bag_others_sales_6m = sum(by_category[cat_code]['current']['gross_sales_6m'] for cat_code in bag_others_codes)
    total_bag_others_prev_stock = sum(by_category[cat_code]['previous']['stock_price'] for cat_code in bag_others_codes)
    total_bag_others_prev_sales_6m = sum(by_category[cat_code]['previous']['gross_sales_6m'] for cat_code in bag_others_codes)
    
    avg_monthly_bag = total_bag_others_sales_6m / 6 if 6 > 0 else 0
    bag_weeks_current = (total_bag_others_current / avg_monthly_bag * 4) if avg_monthly_bag > 0 else 0
    
    avg_monthly_bag_prev = total_bag_others_prev_sales_6m / 6 if 6 > 0 else 0
    bag_weeks_previous = (total_bag_others_prev_stock / avg_monthly_bag_prev * 4) if avg_monthly_bag_prev > 0 else 0
    bag_change = bag_weeks_current - bag_weeks_previous
    
    print(f"{'가방외':<15} {bag_weeks_current:>13.1f}주 (△{bag_change:+.1f}주)")

# 당월 판매
print(f"\n당월 판매 (1K HKD)")
print("-" * 100)
print(f"{'카테고리':<15} {'판매액':>15} {'YOY':>10}")
print("-" * 100)

total_october_sales = 0
total_october_sales_prev = 0

for cat_code in category_order:
    if cat_code in october_sales:
        cat_data = october_sales[cat_code]
        cat_name = cat_data['category_name']
        net_sales = cat_data['net_sales'] / 1000  # 1K HKD
        yoy = cat_data.get('yoy', 0)
        total_october_sales += cat_data['net_sales']
        
        # 전년 판매액 계산
        prev_sales = net_sales / (yoy / 100) if yoy > 0 and yoy < 999 else 0
        total_october_sales_prev += prev_sales * 1000
        
        yoy_str = f"{yoy:.0f}%" if yoy < 999 else "신규"
        print(f"{cat_name:<15} {net_sales:>13,.0f} ({yoy_str})")

# 가방외 합계 (HEA, SHO 제외한 나머지)
bag_others_oct = sum(cat_data['net_sales'] for cat_code, cat_data in october_sales.items() 
                     if cat_code not in category_order)
bag_others_oct_prev = 0
for cat_code, cat_data in october_sales.items():
    if cat_code not in category_order:
        yoy = cat_data.get('yoy', 0)
        if yoy > 0 and yoy < 999:
            bag_others_oct_prev += cat_data['net_sales'] / (yoy / 100)

if bag_others_oct > 0:
    bag_others_yoy = (bag_others_oct / bag_others_oct_prev * 100) if bag_others_oct_prev > 0 else 0
    print(f"{'가방외':<15} {bag_others_oct/1000:>13,.0f} ({bag_others_yoy:.0f}%)")
    total_october_sales += bag_others_oct

# 악세 합계
total_october_yoy = (total_october_sales / total_october_sales_prev * 100) if total_october_sales_prev > 0 else 0
print(f"\n{'악세 합계':<15} {total_october_sales/1000:>13,.0f} ({total_october_yoy:.0f}%)")

