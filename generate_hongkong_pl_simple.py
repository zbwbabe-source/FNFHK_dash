#!/usr/bin/env python3
"""
홍콩/마카오 매장별 직접비 데이터 생성 (간단 버전)
"""
import csv
import json
from collections import defaultdict

def read_store_data(csv_file, period, prev_period):
    """매장별 직접비 데이터 읽기"""
    stores = {}
    
    # 당월 데이터
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row['PERIOD'] == period and 
                row['CNTRY_CD'] in ['HK', 'MC'] and 
                row['SHOP_CD'] not in ['H99', 'M99'] and
                row['BRD_CD'] == 'M'):
                
                store_code = row['SHOP_CD']
                if store_code not in stores:
                    stores[store_code] = {
                        'labor_cost': 0, 'labor_cost_prev': 0,
                        'rent': 0, 'rent_prev': 0,
                        'logistics': 0, 'logistics_prev': 0,
                        'other_fee': 0, 'other_fee_prev': 0,
                        'marketing': 0, 'marketing_prev': 0,
                        'fee': 0, 'fee_prev': 0,
                        'maintenance': 0, 'maintenance_prev': 0,
                        'insurance': 0, 'insurance_prev': 0,
                        'utilities': 0, 'utilities_prev': 0,
                        'supplies': 0, 'supplies_prev': 0,
                        'travel': 0, 'travel_prev': 0,
                        'communication': 0, 'communication_prev': 0,
                        'uniform': 0, 'uniform_prev': 0,
                        'depreciation': 0, 'depreciation_prev': 0
                    }
                
                account_nm = row['ACCOUNT_NM'].strip()
                value = float(row['VALUE'] or 0)
                
                if account_nm == '1. 급 여':
                    stores[store_code]['labor_cost'] += value
                elif account_nm == '4. 임차료':
                    stores[store_code]['rent'] += value
                elif account_nm == '11. 운반비':
                    stores[store_code]['logistics'] += value
                elif account_nm == '12. 기타 수수료(매장관리비 외)':
                    stores[store_code]['other_fee'] += value
                elif account_nm == '9. 광고선전비':
                    stores[store_code]['marketing'] += value
                elif account_nm == '10. 지급수수료':
                    stores[store_code]['fee'] += value
                elif account_nm == '5. 유지보수비':
                    stores[store_code]['maintenance'] += value
                elif account_nm == '13. 보험료':
                    stores[store_code]['insurance'] += value
                elif account_nm == '6. 수도광열비':
                    stores[store_code]['utilities'] += value
                elif account_nm == '7. 소모품비':
                    stores[store_code]['supplies'] += value
                elif account_nm == '2. TRAVEL & MEAL':
                    stores[store_code]['travel'] += value
                elif account_nm == '8. 통신비':
                    stores[store_code]['communication'] += value
                elif account_nm == '3. 피복비(유니폼)':
                    stores[store_code]['uniform'] += value
                elif account_nm == '14. 감가상각비':
                    stores[store_code]['depreciation'] += value
    
    # 전년 데이터
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row['PERIOD'] == prev_period and 
                row['CNTRY_CD'] in ['HK', 'MC'] and 
                row['SHOP_CD'] not in ['H99', 'M99'] and
                row['BRD_CD'] == 'M'):
                
                store_code = row['SHOP_CD']
                if store_code not in stores:
                    continue
                
                account_nm = row['ACCOUNT_NM'].strip()
                value = float(row['VALUE'] or 0)
                
                if account_nm == '1. 급 여':
                    stores[store_code]['labor_cost_prev'] += value
                elif account_nm == '4. 임차료':
                    stores[store_code]['rent_prev'] += value
                elif account_nm == '11. 운반비':
                    stores[store_code]['logistics_prev'] += value
                elif account_nm == '12. 기타 수수료(매장관리비 외)':
                    stores[store_code]['other_fee_prev'] += value
                elif account_nm == '9. 광고선전비':
                    stores[store_code]['marketing_prev'] += value
                elif account_nm == '10. 지급수수료':
                    stores[store_code]['fee_prev'] += value
                elif account_nm == '5. 유지보수비':
                    stores[store_code]['maintenance_prev'] += value
                elif account_nm == '13. 보험료':
                    stores[store_code]['insurance_prev'] += value
                elif account_nm == '6. 수도광열비':
                    stores[store_code]['utilities_prev'] += value
                elif account_nm == '7. 소모품비':
                    stores[store_code]['supplies_prev'] += value
                elif account_nm == '2. TRAVEL & MEAL':
                    stores[store_code]['travel_prev'] += value
                elif account_nm == '8. 통신비':
                    stores[store_code]['communication_prev'] += value
                elif account_nm == '3. 피복비(유니폼)':
                    stores[store_code]['uniform_prev'] += value
                elif account_nm == '14. 감가상각비':
                    stores[store_code]['depreciation_prev'] += value
    
    return stores

def read_opex_data(csv_file, period):
    """본사 영업비 읽기 (M99)"""
    opex = {
        'salary': 0,
        'marketing': 0,
        'fee': 0,
        'rent': 0,
        'insurance': 0,
        'travel': 0,
        'other': 0
    }
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row['PERIOD'] == period and 
                row['SHOP_CD'] == 'M99' and
                row['BRD_CD'] == 'M'):
                
                account_nm = row['ACCOUNT_NM'].strip()
                value = float(row['VALUE'] or 0)
                
                if account_nm in ['1. 급 여', '- Payroll']:
                    opex['salary'] += value
                elif account_nm in ['9. 광고선전비', '- KOL / other']:
                    opex['marketing'] += value
                elif account_nm == '10. 지급수수료':
                    opex['fee'] += value
                elif account_nm == '4. 임차료':
                    opex['rent'] += value
                elif account_nm == '13. 보험료':
                    opex['insurance'] += value
                elif account_nm == '2. TRAVEL & MEAL':
                    opex['travel'] += value
                else:
                    # 기타 항목들
                    if account_nm in ['11. 운반비', '12. 기타 수수료(매장관리비 외)', '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비', '14. 감가상각비']:
                        opex['other'] += value
    
    return opex

if __name__ == '__main__':
    import sys
    
    # 명령줄 인자로 period 받기
    if len(sys.argv) > 1:
        period_short = sys.argv[1]  # 예: 2510
    else:
        period_short = '2511'  # 기본값
    
    # Period 형식 변환
    year = 2000 + int(period_short[:2])
    month = int(period_short[2:4])
    period = f"{year}{month:02d}"
    
    # 전년 동월
    prev_year = year - 1
    prev_period = f"{prev_year}{month:02d}"
    
    csv_file = f'../Dashboard_Raw_Data/HKMC/{period_short}/HKMC_PL_{period_short}.csv'
    
    print("홍콩/마카오 매장별 직접비 데이터 읽는 중...")
    stores = read_store_data(csv_file, period, prev_period)
    
    print(f"총 {len(stores)}개 매장 데이터 읽음")
    
    # 합계 계산
    total = defaultdict(float)
    for store_data in stores.values():
        for key, value in store_data.items():
            if not key.endswith('_prev'):
                total[key] += value
    
    print("\n매장별 직접비 합계:")
    for key, value in sorted(total.items(), key=lambda x: x[1], reverse=True):
        if value > 0:
            print(f"  {key}: {value:,.2f}")
    
    print("\n본사 영업비 읽는 중...")
    opex = read_opex_data(csv_file, period)
    
    print("\n본사 영업비 (M99):")
    for key, value in sorted(opex.items(), key=lambda x: x[1], reverse=True):
        if value > 0:
            print(f"  {key}: {value:,.2f}")
    
    # JSON 저장
    output_data = {
        'stores': stores,
        'opex': opex
    }
    
    output_file = f'public/dashboard/hongkong-pl-stores-{period_short}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n데이터가 {output_file}에 저장되었습니다.")

