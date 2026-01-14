#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TAG별 YTD 데이터를 CSV에서 읽어 JSON에 추가하는 스크립트
"""

import json
import pandas as pd
from pathlib import Path

# 파일 경로
csv_path = Path(r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary (3).csv")
json_path = Path("public/dashboard/taiwan-dashboard-data-2512.json")

# CSV 읽기
df = pd.read_csv(csv_path, encoding='utf-8')

print("CSV 데이터:")
print(df.to_string())

# JSON 읽기
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# TAG별 YTD 데이터 매핑
tag_ytd_data = {}

for _, row in df.iterrows():
    tag = row['TAG']
    
    # TAG 이름 매핑
    if tag == '과시즌F':
        tag_key = '과시즌F'
    elif tag == '과시즌S':
        tag_key = '과시즌S'
    elif tag == '신발':
        tag_key = '신발'
    elif tag == '모자':
        tag_key = '모자'
    elif tag == '가방':
        tag_key = '가방'
    elif tag == '기타ACC':
        tag_key = '기타ACC'
    elif tag == '25F':
        tag_key = '25F'
    elif tag == '25S':
        tag_key = '25S'
    else:
        continue
    
    tag_ytd_data[tag_key] = {
        'current': {
            'gross_sales': row['SALES_YTD_2512'],  # 이미 K HKD 단위
            'stock_price': row['STOCK (TAG)_2512']
        },
        'previous': {
            'gross_sales': row['SALES_YTD_2412'],
            'stock_price': row['STOCK (TAG)_2412']
        },
        'yoy': row['SALES_YTD_YOY_%']
    }

print("\n변환된 TAG YTD 데이터:")
print(json.dumps(tag_ytd_data, indent=2, ensure_ascii=False))

# JSON에 추가
data['tag_ytd_sales'] = tag_ytd_data

# JSON 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\n✅ JSON 업데이트 완료: {json_path}")
