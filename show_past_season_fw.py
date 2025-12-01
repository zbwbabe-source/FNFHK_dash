#!/usr/bin/env python3
"""
과시즌 FW 재고 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

ending_inv = data.get('ending_inventory', {})
past_season_fw = ending_inv.get('past_season_fw', {})
total_fw = past_season_fw.get('total', {})
by_year = past_season_fw.get('by_year', {})
subcat_1year = past_season_fw.get('1year_subcategory', {})

print("=" * 100)
print("과시즌 FW 재고 (TAG, 1K HKD)")
print("=" * 100)

total_current = total_fw.get('current', 0)
total_previous = total_fw.get('previous', 0)
total_yoy = total_fw.get('yoy', 0)

print(f"\n과시즌 FW 재고 (TAG, 1K HKD): {total_current:,.0f}")
print(f"전년 {total_previous:,.0f} | YOY {total_yoy:.0f}% {'🔴' if total_yoy > 100 else '✓'}")

# 시즌별 재고
print(f"\n시즌별 재고")
print("-" * 100)
print(f"{'구분':<20} {'재고 (1K HKD)':>20} {'YOY/변화':>15}")
print("-" * 100)

# 1년차 (24FW)
if '1년차' in by_year:
    year1 = by_year['1년차']
    current = year1['current']['stock_price'] / 1000
    yoy = year1.get('yoy', 0)
    print(f"{'1년차 (24FW)':<20} {current:>18,.0f} ({yoy:.0f}%)")

# 2년차 (23FW)
if '2년차' in by_year:
    year2 = by_year['2년차']
    current = year2['current']['stock_price'] / 1000
    yoy = year2.get('yoy', 0)
    print(f"{'2년차 (23FW)':<20} {current:>18,.0f} ({yoy:.0f}%)")

# 3년차 이상
if '3년차_이상' in by_year:
    year3 = by_year['3년차_이상']
    current = year3['current']['stock_price'] / 1000
    change = year3.get('change', 0) / 1000
    print(f"{'3년차 이상 (22FW~)':<20} {current:>18,.0f} (+{change:,.0f})")

# 25년 1년차 과시즌재고 (24FW) Subcategory별
print(f"\n⚠️ 25년 1년차 과시즌재고 (24FW)")
print("-" * 100)

# SWEAT SHIRTS (MT만), JUMPER (JP만), Knit Cardigan 찾기
found_subcats = {}

for subcat_code, subcat_data in subcat_1year.items():
    subcat_name = subcat_data['subcategory_name'].upper()
    yoy = subcat_data.get('yoy', 0)
    current_stock = subcat_data.get('current', {}).get('stock_price', 0) / 1000  # 1K HKD
    previous_stock = subcat_data.get('previous', {}).get('stock_price', 0) / 1000  # 1K HKD
    
    # SWEAT SHIRTS: MT 코드만
    if subcat_code == 'MT':
        found_subcats['SWEAT SHIRTS'] = {
            'name': subcat_data['subcategory_name'],
            'yoy': yoy,
            'current_stock': current_stock,
            'previous_stock': previous_stock,
        }
    # JUMPER: JP 코드만
    elif subcat_code == 'JP':
        found_subcats['JUMPER'] = {
            'name': subcat_data['subcategory_name'],
            'yoy': yoy,
            'current_stock': current_stock,
            'previous_stock': previous_stock,
        }
    # Knit Cardigan: CARDIGAN이 포함된 Subcategory
    elif 'CARDIGAN' in subcat_name:
        if 'Knit Cardigan' not in found_subcats or subcat_data['current']['stock_price'] > found_subcats['Knit Cardigan'].get('stock_price', 0):
            found_subcats['Knit Cardigan'] = {
                'name': subcat_data['subcategory_name'],
                'yoy': yoy,
                'current_stock': current_stock,
                'previous_stock': previous_stock,
                'stock_price': subcat_data['current']['stock_price'],
            }


# 출력 (요청된 순서대로)
for target_name in ['SWEAT SHIRTS', 'JUMPER', 'Knit Cardigan']:
    if target_name in found_subcats:
        info = found_subcats[target_name]
        print(f"• {info['name']}: YOY {info['yoy']:.0f}%")
        print(f"  당월 재고: {info['current_stock']:,.0f} (1K HKD)")
        print(f"  전년 재고: {info['previous_stock']:,.0f} (1K HKD)")
        print()

