#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""당시즌판매율 CSV를 JSON으로 변환 (YOY 계산 수정)"""

import pandas as pd
import json
import os

CSV_FILE = '../Dashboard_Raw_Data/TW/2512/processed/2512_당시즌판매율.csv'
JSON_FILE = './public/dashboard/taiwan-dashboard-data-2512.json'
EXCHANGE_RATE = 4.02

print("당시즌판매율 CSV → JSON 변환 (YOY 계산 수정)")
print("=" * 80)

# CSV 로드
df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')

# 기존 JSON 로드
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

def parse_number(val):
    """문자열을 숫자로 변환"""
    if pd.isna(val):
        return 0
    val_str = str(val).replace(',', '').strip()
    try:
        return float(val_str)
    except:
        return 0

# 2512 전체 데이터 (첫 번째 데이터 행)
row_2512_total = None
row_2412_total = None

for idx, row in df.iterrows():
    if idx == 0:  # 헤더 스킵
        continue
    
    category = str(row.iloc[0]).strip()
    
    if "TOTAL" in category and idx == 1:
        # 2512 데이터
        net_acp_p_2512 = parse_number(row.iloc[4]) / EXCHANGE_RATE / 1000
        ac_sales_2512 = parse_number(row.iloc[5]) / EXCHANGE_RATE / 1000
        rate_2512 = (ac_sales_2512 / net_acp_p_2512 * 100) if net_acp_p_2512 > 0 else 0
        
        # 2412 데이터
        net_acp_p_2412 = parse_number(row.iloc[1]) / EXCHANGE_RATE / 1000
        ac_sales_2412 = parse_number(row.iloc[2]) / EXCHANGE_RATE / 1000
        rate_2412 = (ac_sales_2412 / net_acp_p_2412 * 100) if net_acp_p_2412 > 0 else 0
        
        row_2512_total = {
            'net_ac_pp': round(net_acp_p_2512, 2),
            'ac_sales_gross': round(ac_sales_2512, 2),
            'sales_rate': round(rate_2512, 1)
        }
        
        row_2412_total = {
            'net_ac_pp': round(net_acp_p_2412, 2),
            'ac_sales_gross': round(ac_sales_2412, 2),
            'sales_rate': round(rate_2412, 1)
        }
        
        print(f"2512 25F TOTAL: 판매율 {rate_2512:.1f}%")
        print(f"2412 24F TOTAL: 판매율 {rate_2412:.1f}%")
        break

# 카테고리별 상세 데이터 수집
category_data = []
for idx, row in df.iterrows():
    if idx <= 1:  # 헤더와 TOTAL 스킵
        continue
    
    category = str(row.iloc[0]).strip()
    if not category or category == "nan":
        continue
    
    # 2512 데이터
    net_acp_p_2512 = parse_number(row.iloc[4])
    ac_sales_2512 = parse_number(row.iloc[5])
    
    # 2412 데이터
    net_acp_p_2412 = parse_number(row.iloc[1])
    ac_sales_2412 = parse_number(row.iloc[2])
    
    if net_acp_p_2512 == 0:  # 데이터 없으면 스킵
        continue
    
    # TWD → K HKD 변환
    net_acp_p_2512_hkd = net_acp_p_2512 / EXCHANGE_RATE / 1000
    ac_sales_2512_hkd = ac_sales_2512 / EXCHANGE_RATE / 1000
    net_acp_p_2412_hkd = net_acp_p_2412 / EXCHANGE_RATE / 1000
    ac_sales_2412_hkd = ac_sales_2412 / EXCHANGE_RATE / 1000
    
    # YOY 계산
    purchase_yoy = (net_acp_p_2512_hkd / net_acp_p_2412_hkd * 100) if net_acp_p_2412_hkd > 0 else 0
    sales_yoy = (ac_sales_2512_hkd / ac_sales_2412_hkd * 100) if ac_sales_2412_hkd > 0 else 0
    
    # 판매율
    sales_rate = (ac_sales_2512_hkd / net_acp_p_2512_hkd * 100) if net_acp_p_2512_hkd > 0 else 0
    
    category_data.append({
        'category': category,
        'net_acp_p': net_acp_p_2512_hkd,
        'purchase_yoy': round(purchase_yoy, 0),
        'sales_yoy': round(sales_yoy, 0),
        'sales_rate': round(sales_rate, 1)
    })

# 입고금액 기준으로 정렬 (큰 순서)
category_data.sort(key=lambda x: x['net_acp_p'], reverse=True)

# net_acp_p 제거 (정렬용으로만 사용)
for cat in category_data:
    del cat['net_acp_p']

print(f"\n카테고리 수: {len(category_data)}")
print(f"\nTOP 5 카테고리 (입고금액 기준):")
for i, cat in enumerate(category_data[:5], 1):
    print(f"  {i}. {cat['category']}: 입고YOY {cat['purchase_yoy']}%, 판매YOY {cat['sales_yoy']}%, 판매율 {cat['sales_rate']}%")

# JSON 업데이트
dashboard_data['season_sales_rate'] = {
    'current': {
        'season': '25F',
        **row_2512_total,
        'category_detail': category_data
    },
    'previous': {
        'season': '24F',
        **row_2412_total
    }
}

# JSON 저장
with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

print(f"\nOK JSON 저장 완료!")
