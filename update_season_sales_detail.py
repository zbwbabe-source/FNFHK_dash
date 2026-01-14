#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
시즌별 판매 TAG 데이터를 CSV에서 읽어 JSON에 추가
"""

import json
import pandas as pd
from pathlib import Path

# 파일 경로
csv_path = Path(r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary (3).csv")
json_path = Path("public/dashboard/taiwan-dashboard-data-2512.json")

# 2512 환율
EXCHANGE_RATE = 4.02

# CSV 읽기
df = pd.read_csv(csv_path, encoding='utf-8')

print("=== CSV 데이터 ===")
print(df[['TAG', 'SALES_YTD_2412', 'SALES_YTD_2512', 'SALES_YTD_YOY_%']].to_string())

# JSON 읽기
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 시즌별 판매 데이터 생성
season_sales_detail = {}

for _, row in df.iterrows():
    tag = row['TAG']
    
    # 과시즌F의 세부 항목도 포함
    if '과시즌F' in tag or tag in ['25F', '25S', '과시즌S', '신발', '모자', '가방', '기타ACC']:
        season_sales_detail[tag] = {
            'current': {
                'gross_sales': row['SALES_YTD_2512'] / 1000 / EXCHANGE_RATE,  # TWD -> K HKD
                'gross_sales_twd': row['SALES_YTD_2512']  # 원본 TWD 값 보관
            },
            'previous': {
                'gross_sales': row['SALES_YTD_2412'] / 1000 / EXCHANGE_RATE,
                'gross_sales_twd': row['SALES_YTD_2412']
            },
            'yoy': row['SALES_YTD_YOY_%']
        }

print(f"\n=== 변환된 시즌별 판매 데이터 (K HKD, 환율: {EXCHANGE_RATE}) ===")
for tag, values in season_sales_detail.items():
    print(f"{tag}: {values['current']['gross_sales']:.2f} K HKD (YOY: {values['yoy']:.1f}%)")

# JSON에 추가
data['season_sales_detail'] = season_sales_detail

# JSON 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\nJSON updated successfully")
