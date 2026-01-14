#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ACC 재고주수 계산 검증"""

import pandas as pd

# 원본 CSV 로드
print("=" * 80)
print("ACC 재고주수 계산 검증")
print("=" * 80)

df = pd.read_csv('../Dashboard_Raw_Data/TW/2512/TW_Inventory_2312_2512_v5.2.csv', encoding='utf-8-sig')

# MLB, 2512, N시즌만 필터
df_2512_acc = df[(df['Brand'] == 'MLB') & 
                  (df['Period'] == 2512) & 
                  (df['Season_Code'].str.endswith('N', na=False))].copy()

# 환율 적용
exchange_rate = 4.02

# 모자(HEA) 예시로 검증
df_hea = df_2512_acc[df_2512_acc['Category'] == 'HEA']

print("\n[모자(HEA) 카테고리 - 2512 당월만]")
print(f"로우 수: {len(df_hea)}")

# 1. Stock Price
stock_price_twd = df_hea['Stock_Price'].sum()
stock_price_hkd = stock_price_twd / exchange_rate / 1000
print(f"\n1. Stock Price (기말재고 택가)")
print(f"   TWD: {stock_price_twd:,.0f}")
print(f"   HKD (1K): {stock_price_hkd:,.2f}K")

# 2. Gross Sales (당월만)
gross_sales_twd = df_hea['Gross_Sales'].sum()
gross_sales_hkd = gross_sales_twd / exchange_rate / 1000
print(f"\n2. Gross Sales (당월 택매출)")
print(f"   TWD: {gross_sales_twd:,.0f}")
print(f"   HKD (1K): {gross_sales_hkd:,.2f}K")

# 3. YTD Gross Sales (연초부터 당월까지)
df_ytd_hea = df[(df['Brand'] == 'MLB') & 
                (df['Period'].isin([2501, 2502, 2503, 2504, 2505, 2506, 2507, 2508, 2509, 2510, 2511, 2512])) & 
                (df['Season_Code'].str.endswith('N', na=False)) &
                (df['Category'] == 'HEA')]

ytd_gross_twd = df_ytd_hea['Gross_Sales'].sum()
ytd_gross_hkd = ytd_gross_twd / exchange_rate / 1000
print(f"\n3. YTD Gross Sales (2501~2512 누적 택매출)")
print(f"   TWD: {ytd_gross_twd:,.0f}")
print(f"   HKD (1K): {ytd_gross_hkd:,.2f}K")

# 4. 재고주수 계산 비교
print(f"\n4. 재고주수 계산")

# 잘못된 계산 (당월 매출 사용)
wrong_weeks = (stock_price_hkd / gross_sales_hkd) * (31/4) if gross_sales_hkd > 0 else 0
print(f"   (잘못) Stock Price / 당월 Gross Sales × (31/4)")
print(f"          {stock_price_hkd:.2f} / {gross_sales_hkd:.2f} × 7.75 = {wrong_weeks:.1f}주")

# 올바른 계산 (YTD 매출 사용)
correct_weeks = (stock_price_hkd / ytd_gross_hkd) * (31/4) if ytd_gross_hkd > 0 else 0
print(f"   (올바른) Stock Price / YTD Gross Sales × (31/4)")
print(f"          {stock_price_hkd:.2f} / {ytd_gross_hkd:.2f} × 7.75 = {correct_weeks:.1f}주")

# 일반적인 재고회전 계산
turnover_months = (stock_price_hkd / (ytd_gross_hkd / 12)) if ytd_gross_hkd > 0 else 0
print(f"\n5. 재고회전 (개월)")
print(f"   Stock Price / (YTD Sales / 12개월) = {turnover_months:.1f}개월")
print(f"   = {turnover_months * 4.33:.1f}주")

# 생성된 CSV 확인
print("\n" + "=" * 80)
print("생성된 CSV 파일 확인")
print("=" * 80)

df_csv = pd.read_csv('../Dashboard_Raw_Data/TW/2512/processed/2512_ACC재고주수.csv', encoding='utf-8-sig')
print("\n전체 데이터:")
print(df_csv.to_string(index=False))

print("\n모자(2512):")
hea_row = df_csv[(df_csv['PERIOD'] == 2512) & (df_csv['CATEGORY'] == '모자')].iloc[0]
print(f"  STOCK_PRICE: {hea_row['STOCK_PRICE']:.2f}K")
print(f"  YTD_GROSS_SALES: {hea_row['YTD_GROSS_SALES']:.2f}K")
print(f"  STOCK_WEEKS: {hea_row['STOCK_WEEKS']:.1f}주")

verify_weeks = (hea_row['STOCK_PRICE'] / hea_row['YTD_GROSS_SALES']) * (31/4)
print(f"  검증: ({hea_row['STOCK_PRICE']:.2f} / {hea_row['YTD_GROSS_SALES']:.2f}) × 7.75 = {verify_weeks:.1f}주")

print("\n" + "=" * 80)
