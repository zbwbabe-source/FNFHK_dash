#!/usr/bin/env python3
"""
오프라인 매장별 누적 현황 데이터 생성 - 2512용
"""
import csv
import json
from collections import defaultdict
from datetime import datetime

def parse_period(period_str):
    """Period 문자열을 파싱 (예: 202511 -> 2025, 11)"""
    if len(period_str) == 6:
        year = int(period_str[:4])
        month = int(period_str[4:6])
        return year, month
    elif len(period_str) == 4:
        year = 2000 + int(period_str[:2])
        month = int(period_str[2:4])
        return year, month
    return None, None

# Store Code 분류
OUTLET_CODES = {'M07', 'M13', 'M15', 'M21'}
ONLINE_CODES = {'HE1', 'HE2', 'XE1'}
EXCLUDED_STORES = {'M06', 'M19', 'W01'}  # K11 임시매장, 신라면세점(M19, W01) 제외

def is_offline_store(store_code):
    """오프라인 매장인지 확인"""
    return store_code not in ONLINE_CODES and store_code != 'M99' and store_code not in EXCLUDED_STORES

def read_pl_database(csv_file):
    """손익 데이터베이스 읽기"""
    pl_data = []
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # HK와 MC만, MLB만
            if row['CNTRY_CD'] not in ['HK', 'MC'] or row['BRD_CD'] != 'M':
                continue
            # 오프라인 매장만
            if not is_offline_store(row['SHOP_CD']):
                continue
            pl_data.append(row)
    return pl_data

def get_cumulative_data(pl_data, year, shop_cd):
    """특정 매장의 연간 누적 데이터 추출 (2501-2512)"""
    store_data = defaultdict(float)
    
    # 1월부터 12월까지 합계
    for month in range(1, 13):
        period = f"{year}{month:02d}"
        
        for row in pl_data:
            if row['PERIOD'] != period or row['SHOP_CD'] != shop_cd:
                continue
            
            account_nm = row['ACCOUNT_NM'].strip()
            value = float(row['VALUE'] or 0)
            
            # 계정별 집계
            if account_nm == '실매출액':
                store_data['net_sales'] += value
            elif account_nm == 'Tag매출액':
                store_data['tag_sales'] += value
            elif account_nm == '매출원가':
                store_data['cogs'] += value
            elif account_nm == '매출총이익':
                store_data['gross_profit'] += value
            elif account_nm == '판매관리비':
                store_data['selling_expense'] += value
            elif account_nm in ['1. 급여', '1. 급 여']:
                store_data['labor_cost'] += value
            elif account_nm == '4. 임차료':
                store_data['rent'] += value
            elif account_nm == '영업이익':
                store_data['operating_profit'] += value
    
    # 직접이익 = 매출총이익 - 판매관리비
    store_data['direct_profit'] = store_data['gross_profit'] - store_data['selling_expense']
    
    # 임차료/인건비율 = (임차료 + 인건비) / 실매출액 * 100
    if store_data['net_sales'] > 0:
        store_data['rent_labor_ratio'] = ((store_data['rent'] + store_data['labor_cost']) / store_data['net_sales']) * 100
    else:
        store_data['rent_labor_ratio'] = 0
    
    return store_data

def get_monthly_data(pl_data, period, shop_cd):
    """특정 매장의 특정 기간 데이터 추출 (당월용)"""
    store_data = defaultdict(float)
    
    for row in pl_data:
        if row['PERIOD'] != period or row['SHOP_CD'] != shop_cd:
            continue
        
        account_nm = row['ACCOUNT_NM'].strip()
        value = float(row['VALUE'] or 0)
        
        # 계정별 집계
        if account_nm == '실매출액':
            store_data['net_sales'] += value
        elif account_nm == 'Tag매출액':
            store_data['tag_sales'] += value
        elif account_nm == '매출원가':
            store_data['cogs'] += value
        elif account_nm == '매출총이익':
            store_data['gross_profit'] += value
        elif account_nm == '판매관리비':
            store_data['selling_expense'] += value
        elif account_nm in ['1. 급여', '1. 급 여']:
            store_data['labor_cost'] += value
        elif account_nm == '4. 임차료':
            store_data['rent'] += value
        elif account_nm == '영업이익':
            store_data['operating_profit'] += value
    
    # 직접이익 = 매출총이익 - 판매관리비
    store_data['direct_profit'] = store_data['gross_profit'] - store_data['selling_expense']
    
    # 임차료/인건비율
    if store_data['net_sales'] > 0:
        store_data['rent_labor_ratio'] = ((store_data['rent'] + store_data['labor_cost']) / store_data['net_sales']) * 100
    else:
        store_data['rent_labor_ratio'] = 0
    
    return store_data

def calculate_yoy(current_value, previous_value):
    """YOY 계산"""
    if previous_value == 0:
        return 0 if current_value == 0 else 1000
    return (current_value / previous_value) * 100

def categorize_store(direct_profit, yoy):
    """매장을 4개 카테고리로 분류"""
    if direct_profit > 0:
        if yoy >= 100:
            return 'profit_improving'
        else:
            return 'profit_deteriorating'
    else:
        if yoy >= 100:
            return 'loss_improving'
        else:
            return 'loss_deteriorating'

def main():
    # 2512 기간 설정
    last_period_short = '2512'
    current_year = 2025
    previous_year = 2024
    
    # CSV 파일 사용
    csv_file = '../Dashboard_Raw_Data/HKMC/2512/HKMC PL 2512.csv'
    
    print("=" * 80)
    print("홍콩/마카오 2512 매장별 누적 현황 데이터 생성")
    print("=" * 80)
    print(f"\nCSV 파일: {csv_file}")
    print(f"누적 기간: 2501-2512 vs 2401-2412")
    
    # 데이터 읽기
    try:
        pl_data = read_pl_database(csv_file)
    except FileNotFoundError:
        print(f"\n오류: CSV 파일을 찾을 수 없습니다: {csv_file}")
        return
    
    print(f"\n총 {len(pl_data)}개 PL 레코드 읽음")
    
    # 모든 오프라인 매장 목록 수집 (2512 기준)
    stores = set()
    for row in pl_data:
        if row['PERIOD'] == '202512':
            stores.add((row['SHOP_CD'], row['SHOP_NM'], row['CNTRY_CD']))
    
    # 추가로 2501-2511 기간 중 매출이 있었던 매장도 포함 (폐점 매장)
    for row in pl_data:
        period_year = int(row['PERIOD'][:4])
        if period_year == 2025:
            stores.add((row['SHOP_CD'], row['SHOP_NM'], row['CNTRY_CD']))
    
    print(f"총 매장 수: {len(stores)}")
    
    # 매장별 데이터 수집
    store_list = []
    
    for shop_cd, shop_nm, country in stores:
        # 당년 누적 (2501-2512)
        current_cumulative = get_cumulative_data(pl_data, current_year, shop_cd)
        
        # 전년 누적 (2401-2412)
        previous_cumulative = get_cumulative_data(pl_data, previous_year, shop_cd)
        
        # 당월 데이터 (2512)
        current_monthly = get_monthly_data(pl_data, '202512', shop_cd)
        
        # 폐점 매장 확인: 누적 매출은 있지만 2512 매출이 0
        is_closed = current_cumulative['net_sales'] > 0 and current_monthly['net_sales'] == 0
        
        # 매출이 전혀 없는 매장은 제외
        if current_cumulative['net_sales'] == 0 and previous_cumulative['net_sales'] == 0:
            print(f"  제외: {shop_cd} (누적 매출 0)")
            continue
        
        # YOY 계산 (누적 기준)
        cumulative_yoy = calculate_yoy(current_cumulative['net_sales'], previous_cumulative['net_sales'])
        
        # 카테고리 분류 (누적 기준)
        category = categorize_store(current_cumulative['direct_profit'], cumulative_yoy)
        
        # 전년도 카테고리 계산 (2401-2412 vs 2301-2312)
        previous_previous_cumulative = get_cumulative_data(pl_data, previous_year - 1, shop_cd)
        previous_yoy = calculate_yoy(previous_cumulative['net_sales'], previous_previous_cumulative['net_sales'])
        previous_category = categorize_store(previous_cumulative['direct_profit'], previous_yoy) if previous_cumulative['net_sales'] > 0 else None
        
        store_info = {
            'shop_cd': shop_cd,
            'shop_nm': shop_nm,
            'country': country,
            'is_closed': is_closed,
            'current': {
                'net_sales': current_cumulative['net_sales'],
                'direct_profit': current_cumulative['direct_profit'],
                'rent_labor_ratio': current_cumulative['rent_labor_ratio'],
                'rent': current_cumulative['rent'],
                'labor_cost': current_cumulative['labor_cost'],
            },
            'previous': {
                'net_sales': previous_cumulative['net_sales'],
                'direct_profit': previous_cumulative['direct_profit'],
            },
            'yoy': cumulative_yoy,
            'category': category,
            'previous_category': previous_category
        }
        
        store_list.append(store_info)
    
    print(f"\n분석 대상 매장: {len(store_list)}개")
    print(f"폐점 매장: {sum(1 for s in store_list if s['is_closed'])}개")
    
    # 카테고리별로 그룹화 (홍콩 오프라인 매장만)
    categorized = {
        'profit_improving': [],
        'profit_deteriorating': [],
        'loss_improving': [],
        'loss_deteriorating': []
    }
    
    for store in store_list:
        if store['country'] == 'HK':
            categorized[store['category']].append(store)
    
    # 각 카테고리별 합계 및 평균 계산
    result = {
        'metadata': {
            'period': '2512_cumulative',
            'period_range': '2501-2512',
            'previous_period_range': '2401-2412',
            'generated_at': datetime.now().isoformat()
        },
        'summary': {
            'total_stores': len(store_list),
            'hk_stores': len([s for s in store_list if s['country'] == 'HK']),
            'mc_stores': len([s for s in store_list if s['country'] == 'MC']),
            'closed_stores': len([s for s in store_list if s['is_closed']]),
            'total_direct_profit': sum(s['current']['direct_profit'] for s in store_list),
            'sales_per_store': sum(s['current']['net_sales'] for s in store_list) / len(store_list) if store_list else 0,
            'overall_yoy': calculate_yoy(
                sum(s['current']['net_sales'] for s in store_list),
                sum(s['previous']['net_sales'] for s in store_list)
            ) if store_list else 0
        },
        'categories': {}
    }
    
    category_names = {
        'profit_improving': '흑자 & 성장',
        'profit_deteriorating': '흑자 & 악화',
        'loss_improving': '적자 & 성장',
        'loss_deteriorating': '적자 & 악화'
    }
    
    for cat_key, cat_name in category_names.items():
        stores_in_cat = categorized[cat_key]
        if stores_in_cat:
            total_direct = sum(s['current']['direct_profit'] for s in stores_in_cat)
            avg_yoy = sum(s['yoy'] for s in stores_in_cat) / len(stores_in_cat)
            total_rent_labor_ratio = sum(s['current']['rent_labor_ratio'] for s in stores_in_cat) / len(stores_in_cat)
            
            result['categories'][cat_key] = {
                'name': cat_name,
                'count': len(stores_in_cat),
                'total_direct_profit': total_direct,
                'avg_yoy': avg_yoy,
                'avg_rent_labor_ratio': total_rent_labor_ratio,
                'stores': stores_in_cat
            }
        else:
            result['categories'][cat_key] = {
                'name': cat_name,
                'count': 0,
                'total_direct_profit': 0,
                'avg_yoy': 0,
                'avg_rent_labor_ratio': 0,
                'stores': []
            }
    
    # 마카오 매장 종합
    mc_stores = [s for s in store_list if s['country'] == 'MC']
    if mc_stores:
        result['mc_summary'] = {
            'count': len(mc_stores),
            'total_direct_profit': sum(s['current']['direct_profit'] for s in mc_stores),
            'overall_yoy': calculate_yoy(
                sum(s['current']['net_sales'] for s in mc_stores),
                sum(s['previous']['net_sales'] for s in mc_stores)
            ),
            'avg_rent_labor_ratio': sum(s['current']['rent_labor_ratio'] for s in mc_stores) / len(mc_stores),
            'stores': mc_stores
        }
    else:
        result['mc_summary'] = {
            'count': 0,
            'total_direct_profit': 0,
            'overall_yoy': 0,
            'avg_rent_labor_ratio': 0,
            'stores': []
        }
    
    # JSON 저장
    output_file = 'public/dashboard/hongkong-store-status-2512-cumulative.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 80)
    print(f"[OK] 2512 누적 매장별 현황 데이터 생성 완료: {output_file}")
    print("=" * 80)
    print(f"\n총 매장 수: {result['summary']['total_stores']}")
    print(f"HK 매장: {result['summary']['hk_stores']}개")
    print(f"MC 매장: {result['summary']['mc_stores']}개")
    print(f"폐점 매장: {result['summary']['closed_stores']}개")
    print(f"총 직접이익: {result['summary']['total_direct_profit']:.2f}K")
    
    print("\n카테고리별 매장 수:")
    for cat_key, cat_data in result['categories'].items():
        print(f"  {cat_data['name']}: {cat_data['count']}개")
    
    # 폐점 매장 리스트
    closed_stores = [s for s in store_list if s['is_closed']]
    if closed_stores:
        print("\n폐점 매장 (영업종료):")
        for store in closed_stores:
            print(f"  - {store['shop_cd']} ({store['shop_nm']}): 누적 {store['current']['net_sales']/1000:.1f}K HKD")

if __name__ == '__main__':
    main()
