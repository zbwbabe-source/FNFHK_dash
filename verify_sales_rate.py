#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""당시즌 판매율 계산 검증"""

import pandas as pd
import json

print("=" * 80)
print("당시즌 판매율 계산 검증")
print("=" * 80)

# 1. CSV 원본 확인
print("\n[1] CSV 전처리 데이터 확인")
df = pd.read_csv('../Dashboard_Raw_Data/TW/2512/processed/2512_당시즌판매율.csv', encoding='utf-8-sig')
print(df)

for _, row in df.iterrows():
    period = row['PERIOD']
    net_ac_pp = row['NET_AC_PP']
    ac_sales_gross = row['AC_SALES_GROSS']
    sales_rate = row['SALES_RATE']
    
    print(f"\n{period}:")
    print(f"  NET_AC_PP (누적입고): {net_ac_pp:.2f}K")
    print(f"  AC_SALES_GROSS (누적판매): {ac_sales_gross:.2f}K")
    print(f"  SALES_RATE: {sales_rate:.1f}%")
    
    # 계산 검증
    calculated_rate = (net_ac_pp / ac_sales_gross * 100) if ac_sales_gross > 0 else 0
    print(f"  계산 검증: {net_ac_pp:.2f} / {ac_sales_gross:.2f} * 100 = {calculated_rate:.1f}%")
    
    if abs(calculated_rate - sales_rate) > 0.1:
        print(f"  WARNING 불일치! CSV: {sales_rate:.1f}%, 계산: {calculated_rate:.1f}%")
    else:
        print(f"  OK 일치")

# 2. 원본 CSV에서 직접 계산
print("\n" + "=" * 80)
print("[2] 원본 Inventory CSV에서 직접 계산")
print("=" * 80)

df_raw = pd.read_csv('../Dashboard_Raw_Data/TW/2512/TW_Inventory_2312_2512_v5.2.csv', encoding='utf-8-sig')

# MLB, 2512, 25F만 필터
df_2512_25f = df_raw[(df_raw['Brand'] == 'MLB') & 
                     (df_raw['Period'] == 2512) & 
                     (df_raw['Season_Code'] == '25F')]

print(f"\n2512 25F 데이터:")
print(f"  로우 수: {len(df_2512_25f)}")

# 환율
exchange_rate = 4.02
vat_rate = 1.05

# 누적입고 (Net_AcP_P)
net_acp_p_twd = df_2512_25f['Net_AcP_P'].sum()
net_acp_p_hkd = net_acp_p_twd / exchange_rate / 1000

print(f"\n누적입고 (Net_AcP_P):")
print(f"  TWD: {net_acp_p_twd:,.0f}")
print(f"  HKD (1K): {net_acp_p_hkd:,.2f}K")

# 누적판매 (AC_Sales_Gross) - 택매출
ac_sales_gross_twd = df_2512_25f['AC_Sales_Gross'].sum()
ac_sales_gross_hkd = ac_sales_gross_twd / exchange_rate / 1000

print(f"\n누적판매 택가 (AC_Sales_Gross):")
print(f"  TWD: {ac_sales_gross_twd:,.0f}")
print(f"  HKD (1K): {ac_sales_gross_hkd:,.2f}K")

# 판매율 계산
sales_rate = (net_acp_p_hkd / ac_sales_gross_hkd * 100) if ac_sales_gross_hkd > 0 else 0

print(f"\n판매율:")
print(f"  계산: {net_acp_p_hkd:,.2f} / {ac_sales_gross_hkd:,.2f} * 100 = {sales_rate:.1f}%")

# 올바른 공식 확인
print("\n" + "=" * 80)
print("[3] 판매율 공식 확인")
print("=" * 80)
print("\n현재 계산:")
print(f"  판매율 = (누적입고 / 누적판매) × 100")
print(f"  판매율 = ({net_acp_p_hkd:.2f} / {ac_sales_gross_hkd:.2f}) × 100 = {sales_rate:.1f}%")

# 역으로 계산 (100% 이상이 나오는 경우는 입고가 판매보다 많다는 의미)
if sales_rate > 100:
    print(f"\nWARNING 판매율이 100%를 초과합니다!")
    print(f"  -> 누적입고({net_acp_p_hkd:.2f}K)가 누적판매({ac_sales_gross_hkd:.2f}K)보다 많습니다")
    print(f"  -> 재고가 {net_acp_p_hkd - ac_sales_gross_hkd:.2f}K 남아있습니다")

# README 확인
print("\n" + "=" * 80)
print("[4] README 공식 확인 필요")
print("=" * 80)
print("판매율 공식이 맞는지 확인:")
print("  1. 판매율 = (누적판매 / 누적입고) × 100  ← 일반적인 소진율")
print("  2. 판매율 = (누적입고 / 누적판매) × 100  ← 현재 사용 중 (217.4%)")

correct_rate = (ac_sales_gross_hkd / net_acp_p_hkd * 100) if net_acp_p_hkd > 0 else 0
print(f"\n만약 공식 1을 사용한다면:")
print(f"  판매율 = ({ac_sales_gross_hkd:.2f} / {net_acp_p_hkd:.2f}) × 100 = {correct_rate:.1f}%")

print("\n" + "=" * 80)
