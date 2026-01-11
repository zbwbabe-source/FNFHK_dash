#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
오프라인 매장별 누적 직접이익 계산 (CSV 기반)
"""
import csv
import sys
import os
from collections import defaultdict

def parse_period(period_str):
    """Period 문자열을 파싱 (예: 2511 -> 2025, 11)"""
    if len(period_str) == 4:
        year = 2000 + int(period_str[:2])
        month = int(period_str[2:4])
        return year, month
    return None, None

# 온라인 매장 코드
ONLINE_CODES = {'HE1', 'HE2', 'XE1'}

def is_offline_store(store_code):
    """오프라인 매장인지 확인"""
    return store_code not in ONLINE_CODES and store_code not in ['M99', 'H99']

def calculate_cumulative_direct_profit(csv_file, period):
    """CSV 파일에서 매장별 누적 직접이익 계산"""
    year, month = parse_period(period)
    if year is None:
        raise ValueError(f"Invalid period: {period}")
    
    # 누적 period 리스트 (1월~해당월) - 6자리 형식만 사용 (202501, 202502, ...)
    all_periods = set([f"{year}{m:02d}" for m in range(1, month + 1)])
    
    # 전년 누적 period 리스트 - 6자리 형식만 사용 (202401, 202402, ...)
    prev_year = year - 1
    all_prev_periods = set([f"{prev_year}{m:02d}" for m in range(1, month + 1)])
    
    # 전전년 누적 period 리스트 - 6자리 형식만 사용 (202301, 202302, ...) - 전년 YOY 계산용
    prev_prev_year = prev_year - 1
    all_prev_prev_periods = set([f"{prev_prev_year}{m:02d}" for m in range(1, month + 1)])
    
    stores = {}
    
    print(f"CSV 파일 읽는 중: {csv_file}")
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        row_count = 0
        for row in reader:
            row_count += 1
            if row_count % 10000 == 0:
                print(f"  처리 중: {row_count:,}개 행...")
            
            period_str = row['PERIOD']
            
            # 오프라인 매장만, HK/MC만, MLB만
            if (row['CNTRY_CD'] not in ['HK', 'MC'] or 
                row['BRD_CD'] != 'M' or
                not is_offline_store(row['SHOP_CD'])):
                continue
            
            store_code = row['SHOP_CD']
            account_nm = row['ACCOUNT_NM'].strip()
            account_cd = row['ACCOUNT_CD'].strip()
            value = float(row['VALUE'] or 0)
            
            # 매장 초기화 (당년, 전년, 전전년 데이터 중 하나라도 있으면)
            if period_str in all_periods or period_str in all_prev_periods or period_str in all_prev_prev_periods:
                if store_code not in stores:
                    stores[store_code] = {
                        'net_sales': 0,
                        'net_sales_prev': 0,
                        'gross_profit': 0,
                        'gross_profit_prev': 0,
                        'selling_expense': 0,  # 판매관리비
                        'selling_expense_prev': 0,
                        'net_sales_prev_prev': 0,  # 전전년 (전년 YOY 계산용)
                        'gross_profit_prev_prev': 0,
                        'selling_expense_prev_prev': 0,
                    }
            
            # 당년 누적 데이터
            if period_str in all_periods:
                if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
                    stores[store_code]['net_sales'] += value
                elif account_nm == '매출총이익':
                    stores[store_code]['gross_profit'] += value
                elif account_nm == '판매관리비':
                    stores[store_code]['selling_expense'] += value
            
            # 전년 누적 데이터
            if period_str in all_prev_periods:
                if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
                    stores[store_code]['net_sales_prev'] += value
                elif account_nm == '매출총이익':
                    stores[store_code]['gross_profit_prev'] += value
                elif account_nm == '판매관리비':
                    stores[store_code]['selling_expense_prev'] += value
            
            # 전전년 누적 데이터 (전년 YOY 계산용)
            if period_str in all_prev_prev_periods:
                if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
                    stores[store_code]['net_sales_prev_prev'] += value
                elif account_nm == '매출총이익':
                    stores[store_code]['gross_profit_prev_prev'] += value
                elif account_nm == '판매관리비':
                    stores[store_code]['selling_expense_prev_prev'] += value
    
    print(f"총 {row_count:,}개 행 처리 완료")
    print(f"오프라인 매장 {len(stores)}개 발견\n")
    
    # 누적 직접이익 계산 (generate_store_status.py 방식: 매출총이익 - 판매관리비)
    results = {}
    total_direct_profit = 0
    total_direct_profit_prev = 0
    
    for store_code, data in stores.items():
        # 직접이익 = 매출총이익 - 판매관리비
        direct_profit = data['gross_profit'] - data['selling_expense']
        direct_profit_prev = data['gross_profit_prev'] - data['selling_expense_prev']
        direct_profit_prev_prev = data['gross_profit_prev_prev'] - data['selling_expense_prev_prev']
        
        total_direct_profit += direct_profit
        total_direct_profit_prev += direct_profit_prev
        
        # 당년 YOY (2025년 vs 2024년) - 매출 YOY 사용 (generate_store_status.py와 일관성 유지)
        yoy = (data['net_sales'] / data['net_sales_prev'] * 100) if data['net_sales_prev'] != 0 else 0
        
        # 전년 YOY (2024년 vs 2023년) - 전년 데이터의 매출 YOY
        prev_yoy = (data['net_sales_prev'] / data['net_sales_prev_prev'] * 100) if data['net_sales_prev_prev'] != 0 else 0
        
        direct_profit_rate = (direct_profit / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
        
        results[store_code] = {
            'net_sales': data['net_sales'],
            'net_sales_prev': data['net_sales_prev'],
            'gross_profit': data['gross_profit'],
            'gross_profit_prev': data['gross_profit_prev'],
            'selling_expense': data['selling_expense'],
            'selling_expense_prev': data['selling_expense_prev'],
            'direct_profit': direct_profit,
            'direct_profit_prev': direct_profit_prev,
            'direct_profit_rate': direct_profit_rate,
            'yoy': yoy,  # 당년 YOY (2025 vs 2024)
            'prev_yoy': prev_yoy  # 전년 YOY (2024 vs 2023)
        }
    
    # 전년 YOY 합계 계산을 위한 전전년 합계 계산
    total_direct_profit_prev_prev = sum(
        (data['gross_profit_prev_prev'] - data['selling_expense_prev_prev']) 
        for data in stores.values()
    )
    
    return results, total_direct_profit, total_direct_profit_prev, total_direct_profit_prev_prev

def main():
    period = '2511'
    
    # CSV 파일 경로
    csv_file = f'../Dashboard_Raw_Data/HKMC/{period}/HKMC_PL_{period}.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_file}")
        return
    
    print("=" * 100)
    print(f"오프라인 매장별 누적 직접이익 계산: {period}")
    print("=" * 100)
    
    # 계산 수행
    results, total_direct_profit, total_direct_profit_prev, total_direct_profit_prev_prev = calculate_cumulative_direct_profit(csv_file, period)
    
    # 결과 출력
    print("\n" + "=" * 130)
    print(f"{'매장코드':<10} {'누적매출':>15} {'누적매출총이익':>18} {'누적판매관리비':>18} {'누적직접이익':>18} {'직접이익률':>12} {'YOY':>8} {'전년YOY':>9}")
    print("=" * 130)
    
    # 매장코드 순으로 정렬하여 출력
    for store_code in sorted(results.keys()):
        data = results[store_code]
        print(f"{store_code:<10} "
              f"{data['net_sales']:>15,.0f} "
              f"{data['gross_profit']:>18,.0f} "
              f"{data['selling_expense']:>18,.0f} "
              f"{data['direct_profit']:>18,.0f} "
              f"{data['direct_profit_rate']:>11.1f}% "
              f"{data['yoy']:>7.0f}% "
              f"{data['prev_yoy']:>8.0f}%")
    
    print("=" * 130)
    total_yoy = (total_direct_profit / total_direct_profit_prev * 100) if total_direct_profit_prev != 0 else 0
    total_prev_yoy = (total_direct_profit_prev / total_direct_profit_prev_prev * 100) if total_direct_profit_prev_prev != 0 else 0
    print(f"{'합계':<10} {'-':>15} {'-':>18} {'-':>18} "
          f"{total_direct_profit:>18,.0f} "
          f"{'-':>12} "
          f"{total_yoy:>7.0f}% "
          f"{total_prev_yoy:>8.0f}%")
    print("=" * 130)
    
    print(f"\n총 {len(results)}개 매장")
    print(f"누적 직접이익 합계: {total_direct_profit:,.0f} (전년: {total_direct_profit_prev:,.0f}, YOY: {total_yoy:.0f}%)")
    print(f"전년 누적 직접이익 합계: {total_direct_profit_prev:,.0f} (전전년: {total_direct_profit_prev_prev:,.0f}, 전년YOY: {total_prev_yoy:.0f}%)")
    
    # JSON 파일로 저장
    import json
    from datetime import datetime
    output_file = f'cumulative_store_direct_profit_{period}.json'
    output_data = {
        'period': period,
        'generated_at': datetime.now().isoformat(),
        'csv_source': csv_file,
        'stores': results,
        'summary': {
            'total_stores': len(results),
            'total_direct_profit': total_direct_profit,
            'total_direct_profit_prev': total_direct_profit_prev,
            'total_direct_profit_prev_prev': total_direct_profit_prev_prev,
            'total_yoy': total_yoy,
            'total_prev_yoy': total_prev_yoy
        }
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n결과가 {output_file}에 저장되었습니다.")

if __name__ == '__main__':
    main()

