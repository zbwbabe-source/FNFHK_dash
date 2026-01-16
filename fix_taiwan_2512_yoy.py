#!/usr/bin/env python3
"""
대만 대시보드 2512 데이터의 재고 YOY 수정
전처리된 TAG Summary CSV를 기반으로 12월 YOY 데이터를 정확하게 업데이트합니다.
"""
import json
import pandas as pd
from datetime import datetime

print("=" * 80)
print("대만 대시보드 2512 재고 YOY 데이터 수정")
print("=" * 80)

# 1. 전처리된 TAG Summary CSV 읽기
csv_file = r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary (3).csv'
df = pd.read_csv(csv_file)

print(f"\n[INFO] TAG Summary CSV 로드 완료")
print(f"  - 파일: {csv_file}")
print(f"  - 행 수: {len(df)}")

# 2. 정확한 YOY 값 추출
yoy_mapping = {
    '25F': 'F당시즌',
    '25S': 'S당시즌',
    '과시즌F': '과시즌FW',
    '과시즌S': '과시즌SS',
    '신발': '신발',
    '모자': '모자',
    '가방': '가방',
    '기타ACC': '기타ACC'
}

correct_yoy = {}
print("\n[INFO] 정확한 YOY 값:")
for _, row in df.iterrows():
    tag = row['TAG']
    if tag in yoy_mapping:
        dashboard_key = yoy_mapping[tag]
        yoy_value = round(row['STOCK (TAG)_YOY_%'])
        correct_yoy[dashboard_key] = yoy_value
        print(f"  - {dashboard_key}: {yoy_value}%")

# 3. 대시보드 JSON 파일 읽기
dashboard_file = 'public/dashboard/taiwan-dashboard-data-2512.json'
with open(dashboard_file, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

print(f"\n[INFO] 대시보드 데이터 로드 완료")
print(f"  - 파일: {dashboard_file}")

# 4. 12월 (인덱스 11) YOY 데이터 수정
print("\n[INFO] 12월 YOY 데이터 수정 중...")
monthly_inventory_yoy = dashboard_data.get('monthly_inventory_yoy', {})

print("\n[BEFORE] 수정 전 12월 YOY 값:")
for key, values in monthly_inventory_yoy.items():
    if len(values) >= 12:
        print(f"  - {key}: {values[11]}")

# 12월 데이터 수정
for key, correct_value in correct_yoy.items():
    if key in monthly_inventory_yoy and len(monthly_inventory_yoy[key]) >= 12:
        monthly_inventory_yoy[key][11] = correct_value

# '가방외'도 '가방'과 동일한 YOY 값으로 설정
if '가방' in correct_yoy and '가방외' in monthly_inventory_yoy:
    if len(monthly_inventory_yoy['가방외']) >= 12:
        monthly_inventory_yoy['가방외'][11] = correct_yoy['가방']

dashboard_data['monthly_inventory_yoy'] = monthly_inventory_yoy

print("\n[AFTER] 수정 후 12월 YOY 값:")
for key, values in monthly_inventory_yoy.items():
    if len(values) >= 12:
        print(f"  - {key}: {values[11]}")

# 5. 수정된 데이터 저장
with open(dashboard_file, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

print(f"\n[OK] 대시보드 데이터 수정 완료: {dashboard_file}")

# 6. components 폴더에도 복사
import shutil
components_file = 'components/dashboard/taiwan-dashboard-data-2512.json'
shutil.copy(dashboard_file, components_file)
print(f"[OK] Components 폴더 복사 완료: {components_file}")

print("\n" + "=" * 80)
print("✅ 재고 YOY 데이터 수정 완료!")
print("=" * 80)
