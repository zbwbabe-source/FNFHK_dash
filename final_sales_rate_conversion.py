#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""당시즌판매율 CSV를 JSON으로 변환 (올바른 파싱)"""

import pandas as pd
import json

CSV_FILE = '../Dashboard_Raw_Data/TW/2512/processed/2512_당시즌판매율.csv'
JSON_FILE = './public/dashboard/taiwan-dashboard-data-2512.json'
EXCHANGE_RATE = 4.02

print("당시즌판매율 CSV → JSON 변환 (올바른 파싱)")
print("=" * 80)

df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')

def parse_number(val):
    if pd.isna(val):
        return 0
    return float(str(val).replace(',', '').strip())

# 1. 24F TOTAL (2412) - Row 1
row_24f = df.iloc[1]
net_acp_p_2412 = parse_number(row_24f.iloc[1]) / EXCHANGE_RATE / 1000
ac_sales_2412 = parse_number(row_24f.iloc[2]) / EXCHANGE_RATE / 1000
rate_2412 = (ac_sales_2412 / net_acp_p_2412 * 100) if net_acp_p_2412 > 0 else 0

print(f"\n24F TOTAL (2412):")
print(f"  입고: {net_acp_p_2412:.2f}K HKD")
print(f"  판매: {ac_sales_2412:.2f}K HKD")
print(f"  판매율: {rate_2412:.1f}%")

# 2. 25F TOTAL (2512) - Row 43
row_25f = df.iloc[43]
net_acp_p_2512 = parse_number(row_25f.iloc[4]) / EXCHANGE_RATE / 1000
ac_sales_2512 = parse_number(row_25f.iloc[5]) / EXCHANGE_RATE / 1000
rate_2512 = (ac_sales_2512 / net_acp_p_2512 * 100) if net_acp_p_2512 > 0 else 0

print(f"\n25F TOTAL (2512):")
print(f"  입고: {net_acp_p_2512:.2f}K HKD")
print(f"  판매: {ac_sales_2512:.2f}K HKD")
print(f"  판매율: {rate_2512:.1f}%")

# 3. 카테고리별 데이터 매칭
category_data = {}

# 2412 데이터 수집 (Row 2~42)
for idx in range(2, 43):
    category = str(df.iloc[idx, 0]).strip()
    if not category or category == 'nan':
        continue
    
    net_acp_p = parse_number(df.iloc[idx, 1])
    ac_sales = parse_number(df.iloc[idx, 2])
    
    if net_acp_p == 0:
        continue
    
    category_data[category] = {
        'net_acp_p_2412': net_acp_p / EXCHANGE_RATE / 1000,
        'ac_sales_2412': ac_sales / EXCHANGE_RATE / 1000,
    }

# 2512 데이터 수집 및 매칭 (Row 44~82)
for idx in range(44, len(df)):
    category = str(df.iloc[idx, 0]).strip()
    if not category or category == 'nan':
        continue
    
    net_acp_p = parse_number(df.iloc[idx, 4])
    ac_sales = parse_number(df.iloc[idx, 5])
    
    if net_acp_p == 0:
        continue
    
    if category not in category_data:
        category_data[category] = {}
    
    category_data[category]['net_acp_p_2512'] = net_acp_p / EXCHANGE_RATE / 1000
    category_data[category]['ac_sales_2512'] = ac_sales / EXCHANGE_RATE / 1000

# YOY 계산 및 정렬용 데이터 생성
category_list = []
for cat, data in category_data.items():
    net_2412 = data.get('net_acp_p_2412', 0)
    ac_2412 = data.get('ac_sales_2412', 0)
    net_2512 = data.get('net_acp_p_2512', 0)
    ac_2512 = data.get('ac_sales_2512', 0)
    
    # 2512 데이터가 있는 것만
    if net_2512 == 0:
        continue
    
    purchase_yoy = (net_2512 / net_2412 * 100) if net_2412 > 0 else 0
    sales_yoy = (ac_2512 / ac_2412 * 100) if ac_2412 > 0 else 0
    sales_rate = (ac_2512 / net_2512 * 100) if net_2512 > 0 else 0
    
    category_list.append({
        'category': cat,
        'net_acp_p': net_2512,
        'purchase_yoy': round(purchase_yoy, 0),
        'sales_yoy': round(sales_yoy, 0),
        'sales_rate': round(sales_rate, 1)
    })

# 입고금액 기준 정렬
category_list.sort(key=lambda x: x['net_acp_p'], reverse=True)

# net_acp_p 제거
for cat in category_list:
    del cat['net_acp_p']

print(f"\n카테고리 수: {len(category_list)}")
print(f"\nTOP 5 (입고금액 기준):")
for i, cat in enumerate(category_list[:5], 1):
    print(f"  {i}. {cat['category']}: 입고YOY {cat['purchase_yoy']}%, 판매YOY {cat['sales_yoy']}%, 판매율 {cat['sales_rate']}%")

# JSON 업데이트
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

dashboard_data['season_sales_rate'] = {
    'current': {
        'season': '25F',
        'net_ac_pp': round(net_acp_p_2512, 2),
        'ac_sales_gross': round(ac_sales_2512, 2),
        'sales_rate': round(rate_2512, 1),
        'category_detail': category_list
    },
    'previous': {
        'season': '24F',
        'net_ac_pp': round(net_acp_p_2412, 2),
        'ac_sales_gross': round(ac_sales_2412, 2),
        'sales_rate': round(rate_2412, 1)
    }
}

with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

print(f"\n✓ JSON 저장 완료!")
