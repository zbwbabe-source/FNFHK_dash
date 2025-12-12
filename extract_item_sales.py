#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
홍콩 재고수불 CSV에서 아이템별 매출 데이터 추출
"""

import pandas as pd
import json
import sys
import io

# Windows 콘솔 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# CSV 파일 읽기
print("📂 CSV 파일 읽는 중...")
df = pd.read_csv('../Dashboard_Raw_Data/HKMC/2511/HKMC_Inventory_2511.csv', encoding='utf-8')

print(f"✅ 총 {len(df):,}개 행 로드됨")
print(f"📊 컬럼: {list(df.columns)}")

# 2025년 1~10월 데이터만 필터링
# Period를 정수로 변환 (float일 수 있음)
df['Period_int'] = df['Period'].fillna(0).astype(float).astype(int)
df['Month_num'] = df['Period_int'] % 100

df_2025 = df[(df['Year'] == 2025) & (df['Month_num'].between(1, 10))].copy()

print(f"\n✅ 2025년 1-10월 데이터: {len(df_2025):,}개 행")

# Period를 월로 변환 (예: 2501 -> 1월)
df_2025['Month'] = df_2025['Month_num']

# Season_Type 고유값 확인
print(f"\n📋 Season_Type 고유값:")
print(df_2025['Season_Type'].value_counts())

# Category 고유값 확인  
print(f"\n📋 Category 고유값:")
print(df_2025['Category'].value_counts())

# 아이템 분류 함수
def classify_item(row):
    season_type = str(row['Season_Type']).lower()
    season_code = str(row['Season_Code']).upper()
    category = str(row['Category']).upper()
    
    # 모자
    if category == 'HEA':
        return '모자'
    # 신발
    elif category == 'SHO':
        return '신발'
    # 가방외 (악세사리)
    elif category in ['BAG', 'ATC']:
        return '가방외'
    # 당시즌F (25F 또는 24F 후반)
    elif '당시즌f' in season_type or season_code.startswith('25F') or season_code == '24F':
        return '당시즌F'
    # 당시즌S (25S)
    elif '당시즌s' in season_type or season_code.startswith('25S'):
        return '당시즌S'
    # 과시즌의류 (의류 카테고리이면서 과시즌)
    elif category in ['BOT', 'INN', 'OUT', 'WTC'] and ('과시즌' in season_type or season_code < '24F'):
        return '과시즌의류'
    # 기타 의류 - 과시즌으로 분류
    elif category in ['BOT', 'INN', 'OUT', 'WTC']:
        return '과시즌의류'
    else:
        return '기타'

# 아이템 분류 적용
df_2025['Item'] = df_2025.apply(classify_item, axis=1)

print(f"\n📊 아이템 분류 결과:")
print(df_2025['Item'].value_counts())

# 월별/아이템별 매출 집계
result = {}

# 실판가 (Net_Sales)
net_sales = df_2025.groupby(['Month', 'Item'])['Net_Sales'].sum().reset_index()
net_sales_pivot = net_sales.pivot(index='Month', columns='Item', values='Net_Sales').fillna(0)
net_sales_pivot = (net_sales_pivot / 1000).round(0).astype(int)  # 1K HKD 단위로 변환

# 택가 (Gross_Sales)
gross_sales = df_2025.groupby(['Month', 'Item'])['Gross_Sales'].sum().reset_index()
gross_sales_pivot = gross_sales.pivot(index='Month', columns='Item', values='Gross_Sales').fillna(0)
gross_sales_pivot = (gross_sales_pivot / 1000).round(0).astype(int)  # 1K HKD 단위로 변환

# 결과 저장
result['net_sales'] = {}
result['gross_sales'] = {}

items = ['당시즌F', '당시즌S', '과시즌의류', '모자', '신발', '가방외']
months = list(range(1, 11))

for item in items:
    result['net_sales'][item] = []
    result['gross_sales'][item] = []
    
    for month in months:
        net_val = int(net_sales_pivot.loc[month, item]) if item in net_sales_pivot.columns and month in net_sales_pivot.index else 0
        gross_val = int(gross_sales_pivot.loc[month, item]) if item in gross_sales_pivot.columns and month in gross_sales_pivot.index else 0
        
        result['net_sales'][item].append(net_val)
        result['gross_sales'][item].append(gross_val)

# YOY 계산 (2024년 데이터와 비교)
df_2024 = df[(df['Year'] == 2024) & (df['Month_num'].between(1, 10))].copy()
df_2024['Month'] = df_2024['Month_num']
df_2024['Item'] = df_2024.apply(classify_item, axis=1)

net_sales_2024 = df_2024.groupby(['Month', 'Item'])['Net_Sales'].sum().reset_index()
net_sales_2024_pivot = net_sales_2024.pivot(index='Month', columns='Item', values='Net_Sales').fillna(0)
net_sales_2024_pivot = (net_sales_2024_pivot / 1000).round(0).astype(int)

result['yoy'] = {}
result['yoy']['합계'] = []

for item in items:
    result['yoy'][item] = []
    
    for month in months:
        val_2025 = int(net_sales_pivot.loc[month, item]) if item in net_sales_pivot.columns and month in net_sales_pivot.index else 0
        val_2024 = int(net_sales_2024_pivot.loc[month, item]) if item in net_sales_2024_pivot.columns and month in net_sales_2024_pivot.index else 0
        
        if val_2024 == 0:
            yoy = None
        else:
            yoy = int((val_2025 / val_2024) * 100)
        
        result['yoy'][item].append(yoy)

# 합계 YOY 계산
for month in months:
    total_2025 = sum(result['net_sales'][item][month-1] for item in items)
    total_2024 = sum(int(net_sales_2024_pivot.loc[month, item]) if item in net_sales_2024_pivot.columns and month in net_sales_2024_pivot.index else 0 for item in items)
    
    if total_2024 == 0:
        result['yoy']['합계'].append(0)
    else:
        result['yoy']['합계'].append(int((total_2025 / total_2024) * 100))

# 결과 출력
print("\n" + "="*60)
print("📊 추출 결과 요약")
print("="*60)

print("\n🔹 실판가 (Net Sales, 1K HKD):")
for item in items:
    print(f"  {item:12s}: {result['net_sales'][item]}")

print("\n🔹 택가 (Gross Sales, 1K HKD):")
for item in items:
    print(f"  {item:12s}: {result['gross_sales'][item]}")

print("\n🔹 YOY (%):")
for item in items + ['합계']:
    print(f"  {item:12s}: {result['yoy'][item]}")

# JSON 파일로 저장
with open('item_sales_data.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("\n✅ 결과가 'item_sales_data.json' 파일로 저장되었습니다!")
print("\n완료! 🎉")

