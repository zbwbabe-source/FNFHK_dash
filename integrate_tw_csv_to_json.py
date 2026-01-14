#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
전처리된 CSV를 대만 대시보드 JSON에 통합
"""

import pandas as pd
import json
import os
from datetime import datetime

# 경로 설정
CSV_DIR = '../Dashboard_Raw_Data/TW/2512/processed/'
JSON_INPUT = './public/dashboard/taiwan-dashboard-data-2512.json'
JSON_OUTPUT = './public/dashboard/taiwan-dashboard-data-2512.json'

PERIOD = 2512
PREV_PERIOD = 2412

print("=" * 80)
print("전처리 CSV → 대만 대시보드 JSON 통합")
print("=" * 80)

# 1. 기존 JSON 로드
print(f"\n[1/6] 기존 JSON 로드: {JSON_INPUT}")
with open(JSON_INPUT, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)
print(f"  OK 기존 JSON 로드 완료")

# 2. 당시즌 판매율 (25F)
print(f"\n[2/6] 당시즌 판매율 CSV 통합")
df_sales_rate = pd.read_csv(os.path.join(CSV_DIR, '2512_당시즌판매율.csv'), encoding='utf-8-sig')

row_2512 = df_sales_rate[df_sales_rate['PERIOD'] == PERIOD].iloc[0]
row_2412 = df_sales_rate[df_sales_rate['PERIOD'] == PREV_PERIOD].iloc[0]

# season_sales_rate 섹션 업데이트
dashboard_data['season_sales_rate'] = {
    'current': {
        'season': '25F',
        'net_ac_pp': float(row_2512['NET_AC_PP']),
        'ac_sales_gross': float(row_2512['AC_SALES_GROSS']),
        'sales_rate': float(row_2512['SALES_RATE'])
    },
    'previous': {
        'season': '24F',
        'net_ac_pp': float(row_2412['NET_AC_PP']),
        'ac_sales_gross': float(row_2412['AC_SALES_GROSS']),
        'sales_rate': float(row_2412['SALES_RATE'])
    }
}
print(f"  OK 당시즌 판매율: 2512 {row_2512['SALES_RATE']:.1f}%, 2412 {row_2412['SALES_RATE']:.1f}%")

# 3. ACC 재고주수
print(f"\n[3/6] ACC 재고주수 CSV 통합")
df_acc_weeks = pd.read_csv(os.path.join(CSV_DIR, '2512_ACC재고주수.csv'), encoding='utf-8-sig')

acc_stock_weeks = {}
for _, row in df_acc_weeks.iterrows():
    period = int(row['PERIOD'])
    category = row['CATEGORY']
    
    if period not in acc_stock_weeks:
        acc_stock_weeks[period] = {}
    
    acc_stock_weeks[period][category] = {
        'stock_price': float(row['STOCK_PRICE']),
        'monthly_gross_sales': float(row['MONTHLY_GROSS_SALES']),
        'stock_weeks': float(row['STOCK_WEEKS'])
    }

dashboard_data['acc_stock_weeks'] = acc_stock_weeks
print(f"  OK ACC 재고주수: 2512 모자 {acc_stock_weeks[PERIOD]['모자']['stock_weeks']:.1f}주")

# 4. 기말재고 (TAG)
print(f"\n[4/6] 기말재고 TAG CSV 통합")
df_ending_stock = pd.read_csv(os.path.join(CSV_DIR, '2512_기말재고_TAG.csv'), encoding='utf-8-sig')

# ending_inventory 섹션 구조 유지하면서 업데이트
if 'ending_inventory' not in dashboard_data:
    dashboard_data['ending_inventory'] = {}

# by_season 섹션
by_season = {}
acc_by_category = {}

for _, row in df_ending_stock.iterrows():
    tag = row['TAG']
    
    data = {
        'current': {
            'stock_price': float(row['STOCK_PRICE'])
        },
        'previous': {
            'stock_price': float(row['PREV_STOCK_PRICE'])
        },
        'yoy': float(row['YOY'])
    }
    
    # TAG에 따라 분류
    if tag in ['25F', '25S', '26S', '과시즌F', '과시즌S']:
        by_season[tag] = data
    else:  # ACC 카테고리
        acc_by_category[tag] = data

dashboard_data['ending_inventory']['by_season'] = by_season
dashboard_data['ending_inventory']['acc_by_category'] = acc_by_category

print(f"  OK 기말재고 TAG: 25F {by_season['25F']['yoy']:.0f}%, 26S {by_season['26S']['yoy']:.0f}%")
print(f"  OK ACC: 모자 {acc_by_category['모자']['yoy']:.0f}%, 신발 {acc_by_category['신발']['yoy']:.0f}%")

# 5. 아이템별 판매 (TAG)
print(f"\n[5/6] 아이템별 판매 TAG CSV 통합")
df_item_sales = pd.read_csv(os.path.join(CSV_DIR, '2512_아이템별판매_TAG.csv'), encoding='utf-8-sig')

monthly_item_data = {}
monthly_item_yoy = {}

for _, row in df_item_sales.iterrows():
    tag = row['TAG']
    
    monthly_item_data[tag] = {
        'current': float(row['GROSS_SALES']),
        'previous': float(row['PREV_GROSS_SALES'])
    }
    monthly_item_yoy[tag] = float(row['YOY'])

dashboard_data['monthly_item_data'] = monthly_item_data
dashboard_data['monthly_item_yoy'] = monthly_item_yoy

print(f"  OK 아이템별 판매: 25F {monthly_item_data['25F']['current']:.2f}K (YOY {monthly_item_yoy['25F']:.0f}%)")

# 6. 과시즌 재고 (TAG)
print(f"\n[6/6] 과시즌 재고 TAG CSV 통합")
df_past_season = pd.read_csv(os.path.join(CSV_DIR, '2512_과시즌재고_TAG.csv'), encoding='utf-8-sig')

past_season_stock = {}
for _, row in df_past_season.iterrows():
    tag = row['TAG']
    season_codes = row['SEASON_CODES'].split(',')
    
    past_season_stock[tag] = {
        'season_codes': season_codes,
        'current': {
            'stock_price': float(row['STOCK_PRICE'])
        },
        'previous': {
            'stock_price': float(row['PREV_STOCK_PRICE'])
        },
        'yoy': float(row['YOY'])
    }

dashboard_data['past_season_stock'] = past_season_stock
print(f"  OK 과시즌 재고: 과시즌F {past_season_stock['과시즌F']['yoy']:.0f}%, 과시즌S {past_season_stock['과시즌S']['yoy']:.0f}%")

# 메타데이터 업데이트
dashboard_data['metadata']['updated_at'] = datetime.now().isoformat()
dashboard_data['metadata']['preprocessed_csv_applied'] = True

# 7. JSON 저장
print(f"\n[7/7] JSON 저장: {JSON_OUTPUT}")
with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
print(f"  OK JSON 저장 완료")

print("\n" + "=" * 80)
print("OK 전처리 CSV → JSON 통합 완료!")
print("=" * 80)
print("\n통합된 데이터:")
print(f"  1. 당시즌 판매율 (25F): {dashboard_data['season_sales_rate']['current']['sales_rate']:.1f}%")
print(f"  2. ACC 재고주수 (모자): {dashboard_data['acc_stock_weeks'][PERIOD]['모자']['stock_weeks']:.1f}주")
print(f"  3. 기말재고 TAG (25F): YOY {dashboard_data['ending_inventory']['by_season']['25F']['yoy']:.0f}%")
print(f"  4. 아이템별 판매 (25F): {dashboard_data['monthly_item_data']['25F']['current']:.2f}K")
print(f"  5. 과시즌 재고 (과시즌F): YOY {dashboard_data['past_season_stock']['과시즌F']['yoy']:.0f}%")
print()
