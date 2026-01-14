#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대만 2512/2412 카드별 CSV 전처리 스크립트

원본: TW_Inventory_2312_2512_v5.2.csv
출력: 5개의 카드별 전처리 CSV 파일
- 2512_당시즌판매율.csv
- 2512_ACC재고주수.csv
- 2512_기말재고_TAG.csv
- 2512_아이템별판매_TAG.csv
- 2512_과시즌재고_TAG.csv
"""

import pandas as pd
import os
import sys

# 상수 정의
RAW_CSV = '../Dashboard_Raw_Data/TW/2512/TW_Inventory_2312_2512_v5.2.csv'
EXCHANGE_RATE_CSV = '../Dashboard_Raw_Data/TW/2512/TW_Exchange Rate 2512.csv'
OUTPUT_DIR = '../Dashboard_Raw_Data/TW/2512/processed/'

CURRENT_PERIOD = 2512
PREV_PERIOD = 2412
VAT_RATE = 1.05

# 전역 변수
df_original = None
exchange_rate = 0

def load_and_prepare_data():
    """원본 CSV 로드 및 기본 전처리"""
    global df_original, exchange_rate
    
    print("=" * 80)
    print("대만 2512/2412 카드별 CSV 전처리 시작")
    print("=" * 80)
    
    # 1. 환율 로드
    print(f"\n[1/3] 환율 로드: {EXCHANGE_RATE_CSV}")
    try:
        df_exchange = pd.read_csv(EXCHANGE_RATE_CSV, encoding='utf-8-sig')
        exchange_rate = df_exchange[df_exchange['period'] == CURRENT_PERIOD]['rate'].iloc[0]
        print(f"   OK 환율: {exchange_rate} (2512 기준, 전년에도 동일 적용)")
    except Exception as e:
        print(f"   ERROR 환율 로드 실패: {e}")
        print(f"   기본값 4.02 사용")
        exchange_rate = 4.02
    
    # 2. 원본 CSV 로드
    print(f"\n[2/3] 원본 CSV 로드: {RAW_CSV}")
    df_original = pd.read_csv(RAW_CSV, encoding='utf-8-sig')
    print(f"   OK 총 {len(df_original):,}개 로우 로드")
    
    # 3. MLB 브랜드만 필터링
    print(f"\n[3/3] 데이터 필터링")
    df_original = df_original[df_original['Brand'] == 'MLB'].copy()
    print(f"   OK MLB 브랜드 필터링: {len(df_original):,}개 로우")
    
    # 2512, 2412만 필터
    periods_count = df_original['Period'].value_counts()
    print(f"   Period 분포:")
    for period in sorted(periods_count.index):
        if period in [CURRENT_PERIOD, PREV_PERIOD]:
            print(f"     {period}: {periods_count[period]:,}개")
    
    # 4. 금액 컬럼 변환 (TWD → HKD, K 단위)
    print(f"\n금액 변환 규칙:")
    print(f"   택매출(Gross Sales) = Gross_Sales ÷ {exchange_rate} ÷ 1000")
    print(f"   실판매출(Net Sales) = Gross_Sales ÷ {VAT_RATE} ÷ {exchange_rate} ÷ 1000")
    
    df_original['GROSS_SALES_HKD'] = df_original['Gross_Sales'] / exchange_rate / 1000
    df_original['NET_SALES_HKD'] = df_original['Gross_Sales'] / VAT_RATE / exchange_rate / 1000
    df_original['STOCK_PRICE_HKD'] = df_original['Stock_Price'] / exchange_rate / 1000
    df_original['NET_AC_PP_HKD'] = df_original['Net_AcP_P'] / exchange_rate / 1000
    df_original['AC_SALES_GROSS_HKD'] = df_original['AC_Sales_Gross'] / exchange_rate / 1000
    
    print(f"\nOK 데이터 준비 완료\n")

def generate_season_sales_rate():
    """1. 당시즌판매율.csv 생성"""
    print("=" * 80)
    print("[1/5] 당시즌판매율.csv 생성")
    print("=" * 80)
    
    results = []
    
    # 2512: 25F
    df_2512_f = df_original[(df_original['Period'] == CURRENT_PERIOD) & 
                            (df_original['Season_Code'] == '25F')]
    net_ac_pp_2512 = df_2512_f['NET_AC_PP_HKD'].sum()
    ac_sales_gross_2512 = df_2512_f['AC_SALES_GROSS_HKD'].sum()
    rate_2512 = (ac_sales_gross_2512 / net_ac_pp_2512 * 100) if net_ac_pp_2512 > 0 else 0  # 수정: 판매/입고
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'SEASON': '25F',
        'NET_AC_PP': round(net_ac_pp_2512, 2),
        'AC_SALES_GROSS': round(ac_sales_gross_2512, 2),
        'SALES_RATE': round(rate_2512, 1)
    })
    
    # 2412: 24F
    df_2412_f = df_original[(df_original['Period'] == PREV_PERIOD) & 
                            (df_original['Season_Code'] == '24F')]
    net_ac_pp_2412 = df_2412_f['NET_AC_PP_HKD'].sum()
    ac_sales_gross_2412 = df_2412_f['AC_SALES_GROSS_HKD'].sum()
    rate_2412 = (ac_sales_gross_2412 / net_ac_pp_2412 * 100) if net_ac_pp_2412 > 0 else 0  # 수정: 판매/입고
    
    results.append({
        'PERIOD': PREV_PERIOD,
        'SEASON': '24F',
        'NET_AC_PP': round(net_ac_pp_2412, 2),
        'AC_SALES_GROSS': round(ac_sales_gross_2412, 2),
        'SALES_RATE': round(rate_2412, 1)
    })
    
    result_df = pd.DataFrame(results)
    output_file = os.path.join(OUTPUT_DIR, '2512_당시즌판매율.csv')
    result_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print(f"OK 파일 생성: {output_file}")
    print(f"  2512 25F 판매율: {rate_2512:.1f}%")
    print(f"  2412 24F 판매율: {rate_2412:.1f}%")
    print()

def generate_acc_stock_weeks():
    """2. ACC재고주수.csv 생성 (4주 기준, 당월 매출 기준)"""
    print("=" * 80)
    print("[2/5] ACC재고주수.csv 생성")
    print("=" * 80)
    
    results = []
    
    for period in [CURRENT_PERIOD, PREV_PERIOD]:
        # N시즌(악세사리)만 필터링 (당월만)
        df_period = df_original[(df_original['Period'] == period) & 
                                (df_original['Season_Code'].str.endswith('N', na=False))]
        
        # 카테고리별 집계
        for category, cat_name in [('HEA', '모자'), ('SHO', '신발'), ('BAG', '가방')]:
            # 기말재고 (당월)
            df_cat = df_period[df_period['Category'] == category]
            stock_price = df_cat['STOCK_PRICE_HKD'].sum()
            
            # 당월 택매출
            monthly_gross = df_cat['GROSS_SALES_HKD'].sum()
            
            # 재고주수 = (재고 / 당월택매출) × 4주
            stock_weeks = (stock_price / monthly_gross * 4) if monthly_gross > 0 else 0
            
            results.append({
                'PERIOD': period,
                'CATEGORY': cat_name,
                'STOCK_PRICE': round(stock_price, 2),
                'MONTHLY_GROSS_SALES': round(monthly_gross, 2),
                'STOCK_WEEKS': round(stock_weeks, 1)
            })
        
        # 기타ACC (나머지 카테고리)
        df_etc = df_period[~df_period['Category'].isin(['HEA', 'SHO', 'BAG'])]
        stock_price = df_etc['STOCK_PRICE_HKD'].sum()
        monthly_gross = df_etc['GROSS_SALES_HKD'].sum()
        
        stock_weeks = (stock_price / monthly_gross * 4) if monthly_gross > 0 else 0
        
        results.append({
            'PERIOD': period,
            'CATEGORY': '기타ACC',
            'STOCK_PRICE': round(stock_price, 2),
            'MONTHLY_GROSS_SALES': round(monthly_gross, 2),
            'STOCK_WEEKS': round(stock_weeks, 1)
        })
    
    result_df = pd.DataFrame(results)
    output_file = os.path.join(OUTPUT_DIR, '2512_ACC재고주수.csv')
    result_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print(f"OK 파일 생성: {output_file}")
    print(f"  총 {len(result_df)} rows (2개 기간 x 4개 카테고리)")
    
    # 2512 재고주수 출력
    df_2512 = result_df[result_df['PERIOD'] == CURRENT_PERIOD]
    print(f"\n  2512 재고주수:")
    for _, row in df_2512.iterrows():
        print(f"    {row['CATEGORY']}: {row['STOCK_WEEKS']:.1f}주")
    print()

def generate_ending_stock_tag():
    """3. 기말재고_TAG.csv 생성 (시즌 매칭 적용)"""
    print("=" * 80)
    print("[3/5] 기말재고_TAG.csv 생성")
    print("=" * 80)
    
    results = []
    
    # === 2512 데이터 ===
    df_2512 = df_original[df_original['Period'] == CURRENT_PERIOD]
    df_2412 = df_original[df_original['Period'] == PREV_PERIOD]
    
    # 1. 25F (2512 25F vs 2412 24F)
    stock_2512_25f = df_2512[df_2512['Season_Code'] == '25F']['STOCK_PRICE_HKD'].sum()
    stock_2412_24f = df_2412[df_2412['Season_Code'] == '24F']['STOCK_PRICE_HKD'].sum()
    yoy_25f = (stock_2512_25f / stock_2412_24f * 100) if stock_2412_24f > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '25F',
        'STOCK_PRICE': round(stock_2512_25f, 2),
        'PREV_STOCK_PRICE': round(stock_2412_24f, 2),
        'YOY': round(yoy_25f, 0)
    })
    
    # 2. 25S (2512 25S vs 2412 24S)
    stock_2512_25s = df_2512[df_2512['Season_Code'] == '25S']['STOCK_PRICE_HKD'].sum()
    stock_2412_24s = df_2412[df_2412['Season_Code'] == '24S']['STOCK_PRICE_HKD'].sum()
    yoy_25s = (stock_2512_25s / stock_2412_24s * 100) if stock_2412_24s > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '25S',
        'STOCK_PRICE': round(stock_2512_25s, 2),
        'PREV_STOCK_PRICE': round(stock_2412_24s, 2),
        'YOY': round(yoy_25s, 0)
    })
    
    # 3. 26S (2512 26S vs 2412 25S)
    stock_2512_26s = df_2512[df_2512['Season_Code'] == '26S']['STOCK_PRICE_HKD'].sum()
    stock_2412_25s = df_2412[df_2412['Season_Code'] == '25S']['STOCK_PRICE_HKD'].sum()
    yoy_26s = (stock_2512_26s / stock_2412_25s * 100) if stock_2412_25s > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '26S',
        'STOCK_PRICE': round(stock_2512_26s, 2),
        'PREV_STOCK_PRICE': round(stock_2412_25s, 2),
        'YOY': round(yoy_26s, 0)
    })
    
    # 4. 과시즌F (2512: 24F+23F+22F+21F vs 2412: 23F+22F+21F+20F)
    past_f_2512 = ['24F', '23F', '22F', '21F']
    past_f_2412 = ['23F', '22F', '21F', '20F']
    
    stock_2512_pf = df_2512[df_2512['Season_Code'].isin(past_f_2512)]['STOCK_PRICE_HKD'].sum()
    stock_2412_pf = df_2412[df_2412['Season_Code'].isin(past_f_2412)]['STOCK_PRICE_HKD'].sum()
    yoy_pf = (stock_2512_pf / stock_2412_pf * 100) if stock_2412_pf > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '과시즌F',
        'STOCK_PRICE': round(stock_2512_pf, 2),
        'PREV_STOCK_PRICE': round(stock_2412_pf, 2),
        'YOY': round(yoy_pf, 0)
    })
    
    # 5. 과시즌S (2512: 24S+23S+22S+21S vs 2412: 23S+22S+21S+20S)
    past_s_2512 = ['24S', '23S', '22S', '21S']
    past_s_2412 = ['23S', '22S', '21S', '20S']
    
    stock_2512_ps = df_2512[df_2512['Season_Code'].isin(past_s_2512)]['STOCK_PRICE_HKD'].sum()
    stock_2412_ps = df_2412[df_2412['Season_Code'].isin(past_s_2412)]['STOCK_PRICE_HKD'].sum()
    yoy_ps = (stock_2512_ps / stock_2412_ps * 100) if stock_2412_ps > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '과시즌S',
        'STOCK_PRICE': round(stock_2512_ps, 2),
        'PREV_STOCK_PRICE': round(stock_2412_ps, 2),
        'YOY': round(yoy_ps, 0)
    })
    
    # 6. ACC (N시즌)
    df_2512_acc = df_2512[df_2512['Season_Code'].str.endswith('N', na=False)]
    df_2412_acc = df_2412[df_2412['Season_Code'].str.endswith('N', na=False)]
    
    for category, cat_name in [('HEA', '모자'), ('SHO', '신발'), ('BAG', '가방')]:
        stock_2512 = df_2512_acc[df_2512_acc['Category'] == category]['STOCK_PRICE_HKD'].sum()
        stock_2412 = df_2412_acc[df_2412_acc['Category'] == category]['STOCK_PRICE_HKD'].sum()
        yoy = (stock_2512 / stock_2412 * 100) if stock_2412 > 0 else 0
        
        results.append({
            'PERIOD': CURRENT_PERIOD,
            'TAG': cat_name,
            'STOCK_PRICE': round(stock_2512, 2),
            'PREV_STOCK_PRICE': round(stock_2412, 2),
            'YOY': round(yoy, 0)
        })
    
    # 기타ACC
    stock_2512 = df_2512_acc[~df_2512_acc['Category'].isin(['HEA', 'SHO', 'BAG'])]['STOCK_PRICE_HKD'].sum()
    stock_2412 = df_2412_acc[~df_2412_acc['Category'].isin(['HEA', 'SHO', 'BAG'])]['STOCK_PRICE_HKD'].sum()
    yoy = (stock_2512 / stock_2412 * 100) if stock_2412 > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '기타ACC',
        'STOCK_PRICE': round(stock_2512, 2),
        'PREV_STOCK_PRICE': round(stock_2412, 2),
        'YOY': round(yoy, 0)
    })
    
    result_df = pd.DataFrame(results)
    output_file = os.path.join(OUTPUT_DIR, '2512_기말재고_TAG.csv')
    result_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print(f"OK 파일 생성: {output_file}")
    print(f"  총 {len(result_df)} rows")
    print(f"\n  주요 TAG YOY:")
    print(f"    25F: {yoy_25f:.0f}% (2512 25F vs 2412 24F)")
    print(f"    26S: {yoy_26s:.0f}% (2512 26S vs 2412 25S)")
    print()

def generate_item_sales_tag():
    """4. 아이템별판매_TAG.csv 생성 (Gross Sales 기준, 시즌 매칭)"""
    print("=" * 80)
    print("[4/5] 아이템별판매_TAG.csv 생성")
    print("=" * 80)
    
    results = []
    
    df_2512 = df_original[df_original['Period'] == CURRENT_PERIOD]
    df_2412 = df_original[df_original['Period'] == PREV_PERIOD]
    
    # 1. 25F (2512 25F vs 2412 24F)
    sales_2512_25f = df_2512[df_2512['Season_Code'] == '25F']['GROSS_SALES_HKD'].sum()
    sales_2412_24f = df_2412[df_2412['Season_Code'] == '24F']['GROSS_SALES_HKD'].sum()
    yoy_25f = (sales_2512_25f / sales_2412_24f * 100) if sales_2412_24f > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '25F',
        'GROSS_SALES': round(sales_2512_25f, 2),
        'PREV_GROSS_SALES': round(sales_2412_24f, 2),
        'YOY': round(yoy_25f, 0)
    })
    
    # 2. 25S (2512 25S vs 2412 24S)
    sales_2512_25s = df_2512[df_2512['Season_Code'] == '25S']['GROSS_SALES_HKD'].sum()
    sales_2412_24s = df_2412[df_2412['Season_Code'] == '24S']['GROSS_SALES_HKD'].sum()
    yoy_25s = (sales_2512_25s / sales_2412_24s * 100) if sales_2412_24s > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '25S',
        'GROSS_SALES': round(sales_2512_25s, 2),
        'PREV_GROSS_SALES': round(sales_2412_24s, 2),
        'YOY': round(yoy_25s, 0)
    })
    
    # 3. 26S (2512 26S vs 2412 25S)
    sales_2512_26s = df_2512[df_2512['Season_Code'] == '26S']['GROSS_SALES_HKD'].sum()
    sales_2412_25s = df_2412[df_2412['Season_Code'] == '25S']['GROSS_SALES_HKD'].sum()
    yoy_26s = (sales_2512_26s / sales_2412_25s * 100) if sales_2412_25s > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '26S',
        'GROSS_SALES': round(sales_2512_26s, 2),
        'PREV_GROSS_SALES': round(sales_2412_25s, 2),
        'YOY': round(yoy_26s, 0)
    })
    
    # 4. 과시즌F
    past_f_2512 = ['24F', '23F', '22F', '21F']
    past_f_2412 = ['23F', '22F', '21F', '20F']
    
    sales_2512_pf = df_2512[df_2512['Season_Code'].isin(past_f_2512)]['GROSS_SALES_HKD'].sum()
    sales_2412_pf = df_2412[df_2412['Season_Code'].isin(past_f_2412)]['GROSS_SALES_HKD'].sum()
    yoy_pf = (sales_2512_pf / sales_2412_pf * 100) if sales_2412_pf > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '과시즌F',
        'GROSS_SALES': round(sales_2512_pf, 2),
        'PREV_GROSS_SALES': round(sales_2412_pf, 2),
        'YOY': round(yoy_pf, 0)
    })
    
    # 5. 과시즌S
    past_s_2512 = ['24S', '23S', '22S', '21S']
    past_s_2412 = ['23S', '22S', '21S', '20S']
    
    sales_2512_ps = df_2512[df_2512['Season_Code'].isin(past_s_2512)]['GROSS_SALES_HKD'].sum()
    sales_2412_ps = df_2412[df_2412['Season_Code'].isin(past_s_2412)]['GROSS_SALES_HKD'].sum()
    yoy_ps = (sales_2512_ps / sales_2412_ps * 100) if sales_2412_ps > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '과시즌S',
        'GROSS_SALES': round(sales_2512_ps, 2),
        'PREV_GROSS_SALES': round(sales_2412_ps, 2),
        'YOY': round(yoy_ps, 0)
    })
    
    # 6. ACC (N시즌, Gross Sales 기준)
    df_2512_acc = df_2512[df_2512['Season_Code'].str.endswith('N', na=False)]
    df_2412_acc = df_2412[df_2412['Season_Code'].str.endswith('N', na=False)]
    
    for category, cat_name in [('HEA', '모자'), ('SHO', '신발'), ('BAG', '가방')]:
        sales_2512 = df_2512_acc[df_2512_acc['Category'] == category]['GROSS_SALES_HKD'].sum()
        sales_2412 = df_2412_acc[df_2412_acc['Category'] == category]['GROSS_SALES_HKD'].sum()
        yoy = (sales_2512 / sales_2412 * 100) if sales_2412 > 0 else 0
        
        results.append({
            'PERIOD': CURRENT_PERIOD,
            'TAG': cat_name,
            'GROSS_SALES': round(sales_2512, 2),
            'PREV_GROSS_SALES': round(sales_2412, 2),
            'YOY': round(yoy, 0)
        })
    
    # 기타ACC
    sales_2512 = df_2512_acc[~df_2512_acc['Category'].isin(['HEA', 'SHO', 'BAG'])]['GROSS_SALES_HKD'].sum()
    sales_2412 = df_2412_acc[~df_2412_acc['Category'].isin(['HEA', 'SHO', 'BAG'])]['GROSS_SALES_HKD'].sum()
    yoy = (sales_2512 / sales_2412 * 100) if sales_2412 > 0 else 0
    
    results.append({
        'PERIOD': CURRENT_PERIOD,
        'TAG': '기타ACC',
        'GROSS_SALES': round(sales_2512, 2),
        'PREV_GROSS_SALES': round(sales_2412, 2),
        'YOY': round(yoy, 0)
    })
    
    result_df = pd.DataFrame(results)
    output_file = os.path.join(OUTPUT_DIR, '2512_아이템별판매_TAG.csv')
    result_df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print(f"OK 파일 생성: {output_file}")
    print(f"  총 {len(result_df)} rows (Gross Sales 기준)")
    print(f"\n  주요 TAG (택매출):")
    print(f"    25F: {sales_2512_25f:.2f}K")
    acc_hat_sales = df_2512_acc[df_2512_acc['Category'] == 'HEA']['GROSS_SALES_HKD'].sum()
    print(f"    모자: {acc_hat_sales:.2f}K")
    print()

def generate_past_season_tag():
    """5. 과시즌재고_TAG.csv 생성"""
    print("=" * 80)
    print("[5/5] 과시즌재고_TAG.csv 생성")
    print("=" * 80)
    
    # 기말재고_TAG에서 과시즌만 추출
    stock_file = os.path.join(OUTPUT_DIR, '2512_기말재고_TAG.csv')
    df_stock = pd.read_csv(stock_file, encoding='utf-8-sig')
    
    df_past = df_stock[df_stock['TAG'].isin(['과시즌F', '과시즌S'])].copy()
    
    # SEASON_CODES 컬럼 추가
    df_past.insert(1, 'SEASON_CODES', '')
    df_past.loc[df_past['TAG'] == '과시즌F', 'SEASON_CODES'] = '24F,23F,22F,21F'
    df_past.loc[df_past['TAG'] == '과시즌S', 'SEASON_CODES'] = '24S,23S,22S,21S'
    
    output_file = os.path.join(OUTPUT_DIR, '2512_과시즌재고_TAG.csv')
    df_past.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    print(f"OK 파일 생성: {output_file}")
    print(f"  총 {len(df_past)} rows (과시즌F, 과시즌S)")
    print()

def validate_output():
    """생성된 파일 검증"""
    print("=" * 80)
    print("생성된 파일 검증")
    print("=" * 80)
    
    files = [
        '2512_당시즌판매율.csv',
        '2512_ACC재고주수.csv',
        '2512_기말재고_TAG.csv',
        '2512_아이템별판매_TAG.csv',
        '2512_과시즌재고_TAG.csv'
    ]
    
    for filename in files:
        filepath = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(filepath):
            df = pd.read_csv(filepath, encoding='utf-8-sig')
            print(f"OK {filename}: {len(df)} rows")
        else:
            print(f"ERROR {filename}: 파일 없음")
    
    print()
    
    # 시즌 매칭 검증
    print("시즌 매칭 검증:")
    stock_file = os.path.join(OUTPUT_DIR, '2512_기말재고_TAG.csv')
    df_stock = pd.read_csv(stock_file, encoding='utf-8-sig')
    
    row_25f = df_stock[df_stock['TAG'] == '25F'].iloc[0]
    yoy_calc = (row_25f['STOCK_PRICE'] / row_25f['PREV_STOCK_PRICE'] * 100)
    print(f"  25F YOY: {row_25f['YOY']:.0f}% (계산값: {yoy_calc:.0f}%)")
    print(f"    2512 25F: {row_25f['STOCK_PRICE']:.2f}K vs 2412 24F: {row_25f['PREV_STOCK_PRICE']:.2f}K")
    
    row_26s = df_stock[df_stock['TAG'] == '26S'].iloc[0]
    yoy_calc = (row_26s['STOCK_PRICE'] / row_26s['PREV_STOCK_PRICE'] * 100)
    print(f"  26S YOY: {row_26s['YOY']:.0f}% (계산값: {yoy_calc:.0f}%)")
    print(f"    2512 26S: {row_26s['STOCK_PRICE']:.2f}K vs 2412 25S: {row_26s['PREV_STOCK_PRICE']:.2f}K")

def main():
    """메인 실행"""
    try:
        # 1. 데이터 로드 및 준비
        load_and_prepare_data()
        
        # 2. 출력 폴더 생성
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # 3. 5개 CSV 파일 생성
        generate_season_sales_rate()
        generate_acc_stock_weeks()
        generate_ending_stock_tag()
        generate_item_sales_tag()
        generate_past_season_tag()
        
        # 4. 검증
        validate_output()
        
        print("=" * 80)
        print("OK 전처리 완료!")
        print(f"  출력 폴더: {OUTPUT_DIR}")
        print("=" * 80)
        
    except Exception as e:
        print(f"\nERROR 에러 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
