#!/usr/bin/env python3
"""
2512 대만 TAG Summary 데이터를 JSON으로 변환
전처리된 CSV 파일을 읽어서 JSON으로 변환합니다.
"""
import pandas as pd
import json
from datetime import datetime
import os

print("=" * 80)
print("2512 대만 TAG Summary 데이터 변환")
print("=" * 80)

# CSV 파일 경로
csv_file = r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary (3).csv'

# CSV 파일 읽기
df = pd.read_csv(csv_file)

print(f"\n[INFO] CSV 파일 로드 완료")
print(f"  - 파일: {csv_file}")
print(f"  - 행 수: {len(df)}")
print(f"  - 컬럼: {list(df.columns)}")

# 환율 (TWD to HKD)
exchange_rate = 4.02

# 결과 딕셔너리
result = {
    "metadata": {
        "period": "2512",
        "generated_at": datetime.now().isoformat(),
        "source": "TW_Inventory_TAG_Summary (3).csv",
        "unit": "1K HKD",
        "exchange_rate": exchange_rate
    },
    "tag_detail": {}
}

# 각 TAG별 데이터 처리
for _, row in df.iterrows():
    tag = row['TAG']
    
    # TOTAL 행 처리
    if tag == 'TOTAL':
        result['ending_inventory_tag'] = {
            "current": float(row['STOCK (TAG)_2512']) / 1000 / exchange_rate,
            "previous": float(row['STOCK (TAG)_2412']) / 1000 / exchange_rate,
            "yoy": round(float(row['STOCK (TAG)_YOY_%']))
        }
        result['tag_detail']['TOTAL'] = {
            "stock_current": float(row['STOCK (TAG)_2512']) / 1000 / exchange_rate,
            "stock_previous": float(row['STOCK (TAG)_2412']) / 1000 / exchange_rate,
            "stock_yoy": round(float(row['STOCK (TAG)_YOY_%'])),
            "sales_current": float(row['SALES (TAG)_2512']) / 1000 / exchange_rate,
            "sales_previous": float(row['SALES (TAG)_2412']) / 1000 / exchange_rate,
            "sales_yoy": round(float(row['SALES (TAG)_YOY_%'])),
            "sales_ytd_current": float(row['SALES_YTD_2512']) / 1000 / exchange_rate,
            "sales_ytd_previous": float(row['SALES_YTD_2412']) / 1000 / exchange_rate,
            "sales_ytd_yoy": round(float(row['SALES_YTD_YOY_%']))
        }
    # 과시즌F 합계 (재고만)
    elif tag == '과시즌F':
        result['past_season_inventory_tag'] = {
            "current": float(row['STOCK (TAG)_2512']) / 1000 / exchange_rate,
            "previous": float(row['STOCK (TAG)_2412']) / 1000 / exchange_rate,
            "yoy": round(float(row['STOCK (TAG)_YOY_%']))
        }
        result['tag_detail'][tag] = {
            "stock_current": float(row['STOCK (TAG)_2512']) / 1000 / exchange_rate,
            "stock_previous": float(row['STOCK (TAG)_2412']) / 1000 / exchange_rate,
            "stock_yoy": round(float(row['STOCK (TAG)_YOY_%'])),
            "sales_current": float(row['SALES (TAG)_2512']) / 1000 / exchange_rate,
            "sales_previous": float(row['SALES (TAG)_2412']) / 1000 / exchange_rate,
            "sales_yoy": round(float(row['SALES (TAG)_YOY_%'])),
            "sales_ytd_current": float(row['SALES_YTD_2512']) / 1000 / exchange_rate,
            "sales_ytd_previous": float(row['SALES_YTD_2412']) / 1000 / exchange_rate,
            "sales_ytd_yoy": round(float(row['SALES_YTD_YOY_%']))
        }
    else:
        # 나머지 TAG들
        result['tag_detail'][tag] = {
            "stock_current": float(row['STOCK (TAG)_2512']) / 1000 / exchange_rate,
            "stock_previous": float(row['STOCK (TAG)_2412']) / 1000 / exchange_rate,
            "stock_yoy": round(float(row['STOCK (TAG)_YOY_%'])),
            "sales_current": float(row['SALES (TAG)_2512']) / 1000 / exchange_rate,
            "sales_previous": float(row['SALES (TAG)_2412']) / 1000 / exchange_rate,
            "sales_yoy": round(float(row['SALES (TAG)_YOY_%'])),
            "sales_ytd_current": float(row['SALES_YTD_2512']) / 1000 / exchange_rate,
            "sales_ytd_previous": float(row['SALES_YTD_2412']) / 1000 / exchange_rate,
            "sales_ytd_yoy": round(float(row['SALES_YTD_YOY_%']))
        }

# JSON 파일로 저장
output_file = 'public/dashboard/taiwan-tag-summary-2512.json'
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\n[OK] TAG Summary 데이터 변환 완료")
print(f"  - 출력 파일: {output_file}")
print(f"  - TAG 수: {len(result['tag_detail'])}")
print(f"\n총 재고 (TOTAL):")
print(f"  - 당월 (2512): {result['ending_inventory_tag']['current']:,.1f}K HKD")
print(f"  - 전년 (2412): {result['ending_inventory_tag']['previous']:,.1f}K HKD")
print(f"  - YOY: {result['ending_inventory_tag']['yoy']:.1f}%")
print(f"\n과시즌 재고 (과시즌F):")
print(f"  - 당월 (2512): {result['past_season_inventory_tag']['current']:,.1f}K HKD")
print(f"  - 전년 (2412): {result['past_season_inventory_tag']['previous']:,.1f}K HKD")
print(f"  - YOY: {result['past_season_inventory_tag']['yoy']:.1f}%")

print("\n" + "=" * 80)
