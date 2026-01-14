#!/usr/bin/env python3
"""
대만 당시즌 판매율 & ACC 재고주수 데이터 생성 - 2512
"""
import pandas as pd
import json
from datetime import datetime

# 환율 및 단위
TWD_TO_HKD_RATE = 4.02
UNIT_DIVISOR = 1000  # TWD를 1K HKD로 변환

def generate_sales_acc_data(period='2512'):
    """당시즌 판매율과 ACC 재고주수 JSON 생성"""
    
    # 1. ACC 재고주수 데이터 읽기
    acc_weeks_file = f'../Dashboard_Raw_Data/TW/2512/processed/ACC_Inventory_Weeks_2512.csv'
    acc_df = pd.read_csv(acc_weeks_file, encoding='utf-8-sig')
    
    acc_weeks_data = {}
    for _, row in acc_df.iterrows():
        acc_type = row['ACC_TYPE']
        acc_weeks_data[acc_type] = {
            'weeks_2412': float(row['WEEKS_2412']),
            'weeks_2512': float(row['WEEKS_2512']),
            'weeks_diff': float(row['WEEKS_DIFF'])
        }
    
    # 2. 당시즌 판매율 데이터 읽기
    sales_rate_file = f'../Dashboard_Raw_Data/TW/2512/processed/TW_2512 SALES RATE.csv'
    sales_df = pd.read_csv(sales_rate_file, encoding='utf-8-sig')
    
    # TOTAL 데이터 추출
    total_row = sales_df[sales_df['CATEGORY'] == 'TOTAL'].iloc[0]
    
    sales_rate_total = {
        'inbound_2412': float(total_row['INBOUND_2412']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
        'inbound_2512': float(total_row['INBOUND_2512']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
        'inbound_yoy': float(total_row['INBOUND_YOY_%']),
        'sales_2412': float(total_row['SALES_2412']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
        'sales_2512': float(total_row['SALES_2512']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
        'sales_yoy': float(total_row['SALES_YOY_%']),
        'rate_2412': float(total_row['RATE_2412']),
        'rate_2512': float(total_row['RATE_2512']),
        'rate_diff_pp': float(total_row['RATE_DIFF_pp'])
    }
    
    # 카테고리별 데이터 (TOP 5 by sales)
    category_df = sales_df[sales_df['LEVEL'] == 'CATEGORY'].copy()
    category_df['SALES_2512_NUM'] = category_df['SALES_2512'].astype(float)
    category_df = category_df.sort_values('SALES_2512_NUM', ascending=False).head(5)
    
    sales_rate_categories = {}
    for _, row in category_df.iterrows():
        cat = row['CATEGORY']
        sales_rate_categories[cat] = {
            'inbound_yoy': float(row['INBOUND_YOY_%']),
            'sales_yoy': float(row['SALES_YOY_%']),
            'rate_2412': float(row['RATE_2412']),
            'rate_2512': float(row['RATE_2512']),
            'rate_diff_pp': float(row['RATE_DIFF_pp'])
        }
    
    # JSON 출력
    output = {
        'metadata': {
            'period': period,
            'generated_at': datetime.now().isoformat(),
            'source': {
                'acc_weeks': 'ACC_Inventory_Weeks_2512.csv',
                'sales_rate': 'TW_2512 SALES RATE.csv'
            },
            'unit': '1K HKD (for sales/inbound)',
            'exchange_rate': TWD_TO_HKD_RATE
        },
        'acc_inventory_weeks': acc_weeks_data,
        'sales_rate': {
            'total': sales_rate_total,
            'top5_categories': sales_rate_categories
        }
    }
    
    # 파일 저장
    output_file = f'public/dashboard/taiwan-sales-acc-{period}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] 당시즌 판매율 & ACC 재고주수 생성 완료: {output_file}")
    print(f"\n=== 당시즌 판매율 (25F) ===")
    print(f"  - 판매율 2512: {sales_rate_total['rate_2512']:.1f}%")
    print(f"  - 판매율 2412: {sales_rate_total['rate_2412']:.1f}%")
    print(f"  - 전년비: {sales_rate_total['rate_diff_pp']:.1f}pp")
    print(f"\n=== ACC 재고주수 ===")
    print(f"  - ACC 전체 2512: {acc_weeks_data['ACC 전체']['weeks_2512']:.1f}주")
    print(f"  - ACC 전체 2412: {acc_weeks_data['ACC 전체']['weeks_2412']:.1f}주")
    print(f"  - 변동: {acc_weeks_data['ACC 전체']['weeks_diff']:.1f}주")
    print(f"\n=== TOP 5 카테고리 ===")
    for cat in sales_rate_categories:
        print(f"  - {cat}: {sales_rate_categories[cat]['rate_2412']:.0f}% → {sales_rate_categories[cat]['rate_2512']:.0f}% ({sales_rate_categories[cat]['rate_diff_pp']:+.0f}pp)")

if __name__ == '__main__':
    generate_sales_acc_data('2512')
