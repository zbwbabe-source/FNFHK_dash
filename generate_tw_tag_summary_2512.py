#!/usr/bin/env python3
"""
대만 TAG 재고 요약 데이터 생성 - 2512
TW_Inventory_TAG_Summary (3).csv 파일만 읽어서 JSON 생성
"""
import pandas as pd
import json
from datetime import datetime

# 환율 및 단위
TWD_TO_HKD_RATE = 4.02
UNIT_DIVISOR = 1000  # TWD를 1K HKD로 변환

def generate_tag_summary(period='2512'):
    """TAG Summary CSV를 읽어서 기말재고/과시즌재고 JSON 생성"""
    
    # CSV 파일 읽기
    csv_file = f'../Dashboard_Raw_Data/TW/2512/processed/TW_Inventory_TAG_Summary (3).csv'
    df = pd.read_csv(csv_file, encoding='utf-8-sig')
    
    # TAG별 데이터 구조화 (TWD -> HKD 변환, 1K 단위)
    tag_data = {}
    for _, row in df.iterrows():
        tag = row['TAG']
        tag_data[tag] = {
            'stock_current': float(row['STOCK (TAG)_2512']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
            'stock_previous': float(row['STOCK (TAG)_2412']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
            'stock_yoy': float(row['STOCK (TAG)_YOY_%']),
            'sales_current': float(row['SALES (TAG)_2512']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
            'sales_previous': float(row['SALES (TAG)_2412']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
            'sales_yoy': float(row['SALES (TAG)_YOY_%']),
            'sales_ytd_current': float(row['SALES_YTD_2512']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
            'sales_ytd_previous': float(row['SALES_YTD_2412']) / TWD_TO_HKD_RATE / UNIT_DIVISOR,
            'sales_ytd_yoy': float(row['SALES_YTD_YOY_%'])
        }
    
    # 기말재고 (TAG) - TOTAL
    total_data = tag_data.get('TOTAL', {})
    ending_inventory = {
        'current': total_data.get('stock_current', 0),
        'previous': total_data.get('stock_previous', 0),
        'yoy': total_data.get('stock_yoy', 0)
    }
    
    # 과시즌 재고 (TAG) - 과시즌F 합계
    past_f_data = tag_data.get('과시즌F', {})
    past_season_inventory = {
        'current': past_f_data.get('stock_current', 0),
        'previous': past_f_data.get('stock_previous', 0),
        'yoy': past_f_data.get('stock_yoy', 0)
    }
    
    # JSON 출력
    output = {
        'metadata': {
            'period': period,
            'generated_at': datetime.now().isoformat(),
            'source': 'TW_Inventory_TAG_Summary (3).csv',
            'unit': '1K HKD',
            'exchange_rate': TWD_TO_HKD_RATE
        },
        'ending_inventory_tag': ending_inventory,
        'past_season_inventory_tag': past_season_inventory,
        'tag_detail': tag_data
    }
    
    # 파일 저장
    output_file = f'public/dashboard/taiwan-tag-summary-{period}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] TAG 재고 요약 생성 완료: {output_file}")
    print(f"  - 기말재고(TAG): {ending_inventory['current']:,.0f}K HKD (YOY {ending_inventory['yoy']:.1f}%)")
    print(f"  - 과시즌재고(TAG): {past_season_inventory['current']:,.0f}K HKD (YOY {past_season_inventory['yoy']:.1f}%)")
    print(f"  - TAG 수: {len(tag_data)}")
    print(f"  - 환율: 1 TWD = {TWD_TO_HKD_RATE} HKD")

if __name__ == '__main__':
    generate_tag_summary('2512')
