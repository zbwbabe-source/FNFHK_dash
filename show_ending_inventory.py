#!/usr/bin/env python3
"""
기말재고 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

ending_inv = data.get('ending_inventory', {})
total = ending_inv.get('total', {})
by_season = ending_inv.get('by_season', {})
acc_by_category = ending_inv.get('acc_by_category', {})

print("=" * 100)
print("기말재고 (TAG, 1K HKD)")
print("=" * 100)

total_current = total.get('current', 0)
total_previous = total.get('previous', 0)
total_yoy = total.get('yoy', 0)

print(f"\n기말재고 (TAG, 1K HKD): {total_current:,.0f}")
print(f"전년 {total_previous:,.0f} | YOY {total_yoy:.0f}%")

# 아이템별 기말재고
print(f"\n아이템별 기말재고")
print("-" * 100)
print(f"{'구분':<20} {'기말재고 (1K HKD)':>20} {'YOY':>10}")
print("-" * 100)

# 당시즌 의류 (25F)
if '당시즌_의류' in by_season:
    inv = by_season['당시즌_의류']
    current = inv['current']['stock_price'] / 1000
    yoy = inv.get('yoy', 0)
    print(f"{'당시즌 의류 (25F)':<20} {current:>18,.0f} ({yoy:.0f}%)")

# 당시즌 SS (25S)
if '당시즌_SS' in by_season:
    inv = by_season['당시즌_SS']
    current = inv['current']['stock_price'] / 1000
    yoy = inv.get('yoy', 0)
    print(f"{'당시즌 SS (25S)':<20} {current:>18,.0f} ({yoy:.0f}%)")

# 과시즌 FW
if '과시즌_FW' in by_season:
    inv = by_season['과시즌_FW']
    current = inv['current']['stock_price'] / 1000
    yoy = inv.get('yoy', 0)
    print(f"{'과시즌 FW':<20} {current:>18,.0f} ({yoy:.0f}%)")

# 과시즌 SS
if '과시즌_SS' in by_season:
    inv = by_season['과시즌_SS']
    current = inv['current']['stock_price'] / 1000
    yoy = inv.get('yoy', 0)
    print(f"{'과시즌 SS':<20} {current:>18,.0f} ({yoy:.0f}%)")

# 악세 합계
acc_total_current = sum(acc['current']['stock_price'] for acc in acc_by_category.values())
acc_total_previous = sum(acc['previous']['stock_price'] for acc in acc_by_category.values())
acc_total_yoy = (acc_total_current / acc_total_previous * 100) if acc_total_previous > 0 else 0

print(f"{'악세 합계':<20} {acc_total_current/1000:>18,.0f} ({acc_total_yoy:.0f}%)")

# 악세 상세
print()
category_order = ['SHO', 'HEA']  # 신발, 모자
for cat_code in category_order:
    if cat_code in acc_by_category:
        acc = acc_by_category[cat_code]
        cat_name = acc['category_name']
        current = acc['current']['stock_price'] / 1000
        yoy = acc.get('yoy', 0)
        print(f"  {cat_name} ({cat_code}): {current:>15,.0f} ({yoy:.0f}%)")

# 가방외
bag_others_codes = [cat_code for cat_code in acc_by_category.keys() if cat_code not in category_order]
if bag_others_codes:
    bag_total_current = sum(acc_by_category[cat_code]['current']['stock_price'] for cat_code in bag_others_codes)
    bag_total_previous = sum(acc_by_category[cat_code]['previous']['stock_price'] for cat_code in bag_others_codes)
    bag_total_yoy = (bag_total_current / bag_total_previous * 100) if bag_total_previous > 0 else 0
    
    # BAG 카테고리 찾기
    bag_category_name = '가방외'
    if 'BAG' in acc_by_category:
        bag_category_name = acc_by_category['BAG']['category_name']
    
    print(f"  {bag_category_name} (BAG): {bag_total_current/1000:>15,.0f} ({bag_total_yoy:.0f}%)")





