#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""당시즌판매율 CSV를 JSON으로 변환 (환율 적용 + 1000으로 나누기)"""

import pandas as pd
import json
import os

CSV_FILE = '../Dashboard_Raw_Data/TW/2512/processed/2512_당시즌판매율.csv'
JSON_FILE = './public/dashboard/taiwan-dashboard-data-2512.json'
EXCHANGE_RATE = 4.02

print("당시즌판매율 CSV → JSON 변환")
print(f"환율: {EXCHANGE_RATE}, 단위: K HKD (1000으로 나누기)")
print("=" * 80)

# CSV 로드
df = pd.read_csv(CSV_FILE, encoding='utf-8-sig')
print(f"\nCSV 로드 완료: {len(df)} rows")
print(f"컬럼: {list(df.columns)}")

# 기존 JSON 로드
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

# 데이터 처리
# Row 0: 헤더행
# Row 1: 24F TOTAL
# Row 2~: 카테고리별

# 2512 (25F) 전체 데이터
row_2512_total = None
for idx, row in df.iterrows():
    if idx == 0:  # 헤더 스킵
        continue
    
    category = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
    
    # 2512 데이터 (컬럼 4, 5 확인)
    if pd.notna(row.iloc[4]):  # 2512 Net_AcP_P
        net_acp_p_str = str(row.iloc[4]).replace(',', '').strip()
        ac_sales_gross_str = str(row.iloc[5]).replace(',', '').strip() if pd.notna(row.iloc[5]) else "0"
        
        try:
            net_acp_p_twd = float(net_acp_p_str)
            ac_sales_gross_twd = float(ac_sales_gross_str)
            
            # TWD → K HKD (환율 적용 + 1000으로 나누기)
            net_acp_p_hkd = net_acp_p_twd / EXCHANGE_RATE / 1000
            ac_sales_gross_hkd = ac_sales_gross_twd / EXCHANGE_RATE / 1000
            sales_rate = (ac_sales_gross_hkd / net_acp_p_hkd * 100) if net_acp_p_hkd > 0 else 0
            
            if "25F TOTAL" in category or (idx == 1 and "TOTAL" in category):
                row_2512_total = {
                    'net_ac_pp': round(net_acp_p_hkd, 2),
                    'ac_sales_gross': round(ac_sales_gross_hkd, 2),
                    'sales_rate': round(sales_rate, 1)
                }
                print(f"\n2512 25F TOTAL:")
                print(f"  누적입고: {net_acp_p_hkd:.2f}K HKD")
                print(f"  누적판매: {ac_sales_gross_hkd:.2f}K HKD")
                print(f"  판매율: {sales_rate:.1f}%")
                break
        except:
            continue

# 2412 (24F) 전체 데이터
row_2412_total = None
for idx, row in df.iterrows():
    if idx == 0:  # 헤더 스킵
        continue
    
    category = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
    
    # 2412 데이터 (컬럼 1, 2 확인)
    if pd.notna(row.iloc[1]):  # 2412 Net_AcP_P
        net_acp_p_str = str(row.iloc[1]).replace(',', '').strip()
        ac_sales_gross_str = str(row.iloc[2]).replace(',', '').strip() if pd.notna(row.iloc[2]) else "0"
        
        try:
            net_acp_p_twd = float(net_acp_p_str)
            ac_sales_gross_twd = float(ac_sales_gross_str)
            
            # TWD → K HKD
            net_acp_p_hkd = net_acp_p_twd / EXCHANGE_RATE / 1000
            ac_sales_gross_hkd = ac_sales_gross_twd / EXCHANGE_RATE / 1000
            sales_rate = (ac_sales_gross_hkd / net_acp_p_hkd * 100) if net_acp_p_hkd > 0 else 0
            
            if "24F TOTAL" in category or (idx == 1 and "TOTAL" in category):
                row_2412_total = {
                    'net_ac_pp': round(net_acp_p_hkd, 2),
                    'ac_sales_gross': round(ac_sales_gross_hkd, 2),
                    'sales_rate': round(sales_rate, 1)
                }
                print(f"\n2412 24F TOTAL:")
                print(f"  누적입고: {net_acp_p_hkd:.2f}K HKD")
                print(f"  누적판매: {ac_sales_gross_hkd:.2f}K HKD")
                print(f"  판매율: {sales_rate:.1f}%")
                break
        except:
            continue

# 카테고리별 상세 (2512만)
category_detail = []
for idx, row in df.iterrows():
    if idx <= 1:  # 헤더와 TOTAL 스킵
        continue
    
    category = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
    if not category or category == "nan":
        continue
    
    # 2512 데이터
    if pd.notna(row.iloc[4]):
        net_acp_p_str = str(row.iloc[4]).replace(',', '').strip()
        ac_sales_gross_str = str(row.iloc[5]).replace(',', '').strip() if pd.notna(row.iloc[5]) else "0"
        
        try:
            net_acp_p_twd = float(net_acp_p_str)
            ac_sales_gross_twd = float(ac_sales_gross_str)
            
            # TWD → K HKD
            net_acp_p_hkd = net_acp_p_twd / EXCHANGE_RATE / 1000
            ac_sales_gross_hkd = ac_sales_gross_twd / EXCHANGE_RATE / 1000
            sales_rate = (ac_sales_gross_hkd / net_acp_p_hkd * 100) if net_acp_p_hkd > 0 else 0
            
            # 2412 데이터 (YOY 계산용)
            net_acp_p_prev = 0
            ac_sales_gross_prev = 0
            if pd.notna(row.iloc[1]):
                net_acp_p_prev = float(str(row.iloc[1]).replace(',', '')) / EXCHANGE_RATE / 1000
            if pd.notna(row.iloc[2]):
                ac_sales_gross_prev = float(str(row.iloc[2]).replace(',', '')) / EXCHANGE_RATE / 1000
            
            purchase_yoy = (net_acp_p_hkd / net_acp_p_prev * 100) if net_acp_p_prev > 0 else 0
            sales_yoy = (ac_sales_gross_hkd / ac_sales_gross_prev * 100) if ac_sales_gross_prev > 0 else 0
            
            category_detail.append({
                'category': category,
                'purchase_yoy': round(purchase_yoy, 0),
                'sales_yoy': round(sales_yoy, 0),
                'sales_rate': round(sales_rate, 1)
            })
        except:
            continue

print(f"\n카테고리별 상세: {len(category_detail)}개")

# JSON 업데이트
dashboard_data['season_sales_rate'] = {
    'current': {
        'season': '25F',
        **row_2512_total,
        'category_detail': category_detail
    },
    'previous': {
        'season': '24F',
        **row_2412_total
    }
}

# JSON 저장
with open(JSON_FILE, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

print(f"\nOK JSON 저장 완료: {JSON_FILE}")
print(f"\n최종 데이터:")
print(f"  2512 25F 판매율: {row_2512_total['sales_rate']}%")
print(f"  2412 24F 판매율: {row_2412_total['sales_rate']}%")
print(f"  카테고리 수: {len(category_detail)}")
