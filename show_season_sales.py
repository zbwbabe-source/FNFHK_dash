#!/usr/bin/env python3
"""
당시즌F 판매 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

season_sales = data.get('season_sales', {})
current_f = season_sales.get('current_season_f', {})
previous_f = season_sales.get('previous_season_f', {})
current_s = season_sales.get('current_season_s', {})
previous_s = season_sales.get('previous_season_s', {})

print("=" * 100)
print("당시즌F 판매 데이터")
print("=" * 100)

# 10월 당시즌F 판매
current_oct = current_f.get('october', {})
previous_oct = previous_f.get('october', {})

current_total = current_oct.get('total_net_sales', 0)
previous_total = previous_oct.get('total_net_sales', 0)
yoy = (current_total / previous_total * 100) if previous_total > 0 else 0

print(f"\n당시즌F 판매 ({current_f.get('season_code', '')} 의류, 10월 실판)")
print(f"{current_total:,.0f}")
print(f"전년 {previous_total:,.0f} ({previous_f.get('season_code', '')}) | YOY {yoy:.0f}%")

# Subcategory_Code별 TOP 5
print(f"\n카테고리별 판매금액 TOP 5 (Subcategory_Code 기준)")
print("-" * 100)
print(f"{'순위':<6} {'Subcategory Code':<20} {'Subcategory Name':<30} {'당월 ({})':<20} {'YOY':<10}".format(
    current_f.get('season_code', '')
))
print("-" * 100)

current_top5 = current_oct.get('subcategory_top5', [])
previous_top5 = previous_oct.get('subcategory_top5', [])

# 전년 데이터를 딕셔너리로 변환 (빠른 조회용)
previous_dict = {item['subcategory_code']: item['net_sales'] for item in previous_top5}

for i, item in enumerate(current_top5, 1):
    subcat_code = item['subcategory_code']
    subcat_name = item['subcategory_name']
    current_sales = item['net_sales']
    previous_sales = previous_dict.get(subcat_code, 0)
    yoy = (current_sales / previous_sales * 100) if previous_sales > 0 else (999 if current_sales > 0 else 0)
    yoy_str = f"{yoy:.0f}%" if yoy < 999 else "신규"
    print(f"{i:<6} {subcat_code:<20} {subcat_name[:28]:<30} {current_sales:>15,.0f} ({yoy_str})")

print(f"\n* 10월 실판가 기준 (1K HKD)")

# 25F 누적
print(f"\n{'='*100}")
print(f"{current_f.get('season_code', '')} 시즌 누적 ({current_f.get('accumulated', {}).get('periods', '')})")
print("=" * 100)

current_acc = current_f.get('accumulated', {}).get('total_net_sales', 0)
previous_acc = previous_f.get('accumulated', {}).get('total_net_sales', 0)
acc_yoy = (current_acc / previous_acc * 100) if previous_acc > 0 else 0

print(f"판매금액: {current_acc:,.0f} (전년 {previous_f.get('season_code', '')}: {previous_acc:,.0f})")
print(f"누적 YOY: {acc_yoy:.0f}%")

# 25S 누적
print(f"\n{'='*100}")
print(f"참고: {current_s.get('season_code', '')} 누적 성과 ({current_s.get('accumulated', {}).get('periods', '')})")
print("=" * 100)

current_s_acc = current_s.get('accumulated', {}).get('total_net_sales', 0)
previous_s_acc = previous_s.get('accumulated', {}).get('total_net_sales', 0)
s_acc_yoy = (current_s_acc / previous_s_acc * 100) if previous_s_acc > 0 else 0

print(f"판매금액: {current_s_acc:,.0f} (전년 {previous_s.get('season_code', '')}: {previous_s_acc:,.0f})")
print(f"누적 YOY: {s_acc_yoy:.0f}%")

