#!/usr/bin/env python3
"""
당시즌F 판매율 데이터 표시
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

season_sales = data.get('season_sales', {})
current_f = season_sales.get('current_season_f', {})
previous_f = season_sales.get('previous_season_f', {})

print("=" * 100)
print("당시즌F 판매율 데이터")
print("=" * 100)

current_acc = current_f.get('accumulated', {})
previous_acc = previous_f.get('accumulated', {})

sales_rate = current_acc.get('sales_rate', 0)
previous_sales_rate = previous_acc.get('sales_rate', 0)
sales_rate_change = current_acc.get('sales_rate_change', 0)

print(f"\n당시즌F 판매율 ({current_f.get('season_code', '')}, 누적 기준)")
print(f"{sales_rate:.1f}%")
print(f"(전년 {previous_f.get('season_code', '')} 대비 {sales_rate_change:+.1f}%p)")

net_acp_p = current_acc.get('net_acp_p', 0)
ac_sales_gross = current_acc.get('ac_sales_gross', 0)
net_acp_p_yoy = current_acc.get('net_acp_p_yoy', 0)
ac_sales_gross_yoy = current_acc.get('ac_sales_gross_yoy', 0)

print(f"\n누적입고 (Tag)")
print(f"{net_acp_p:,.0f} ({net_acp_p_yoy:.1f}%) {'🔽' if net_acp_p_yoy < 100 else '✓'}")

print(f"\n누적판매 (Tag)")
print(f"{ac_sales_gross:,.0f} ({ac_sales_gross_yoy:.0f}%) {'✓' if ac_sales_gross_yoy >= 100 else '🔽'}")

# 상세 분석 (T/SHIRTS, PANTS)
print(f"\n상세 분석")
subcat_detail = current_acc.get('subcategory_detail', [])

# T/SHIRTS 찾기 (TS 또는 TR)
ts_data = None
for item in subcat_detail:
    if item['subcategory_code'] in ['TS', 'TR']:
        if ts_data is None or item['net_acp_p'] > ts_data['net_acp_p']:
            ts_data = item

if ts_data:
    print(f"• T/SHIRTS: 판매율 {ts_data['sales_rate']:.1f}% 재고일수 {ts_data['stock_days']:.0f}일")

# PANTS 찾기 (PT 또는 LG)
pt_data = None
for item in subcat_detail:
    if item['subcategory_code'] in ['PT', 'LG']:
        if pt_data is None or item['net_acp_p'] > pt_data['net_acp_p']:
            pt_data = item

if pt_data:
    print(f"• PANTS: 판매율 {pt_data['sales_rate']:.1f}% 재고일수 {pt_data['stock_days']:.0f}일")

print(f"→ 26SS 조기운영으로 대응 (12월-1월 투입)")

# 카테고리별 입고YOY/판매율 (입고 높은순)
print(f"\n카테고리별 입고YOY/판매율")
print("-" * 100)
print(f"{'Subcategory Code':<20} {'입고YOY':<15} {'판매율':<15}")
print("-" * 100)

for item in subcat_detail[:10]:  # 상위 10개
    subcat_code = item['subcategory_code']
    net_acp_p_yoy_val = item['net_acp_p_yoy']
    sales_rate_val = item['sales_rate']
    
    if net_acp_p_yoy_val >= 999:
        yoy_str = "신규"
    else:
        yoy_str = f"{net_acp_p_yoy_val:.0f}%"
    
    print(f"{subcat_code:<20} {yoy_str:<15} {sales_rate_val:.1f}%")

print(f"\n* 입고YOY / 판매율 (입고 높은순)")





