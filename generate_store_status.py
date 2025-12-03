#!/usr/bin/env python3
"""
오프라인 매장별 현황 데이터 생성
"""
import csv
import json
from collections import defaultdict
from datetime import datetime

def parse_period(period_str):
    """Period 문자열을 파싱 (예: 202510 -> 2025, 10)"""
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

def is_offline_store(store_code):
    """오프라인 매장인지 확인"""
    return store_code not in ONLINE_CODES and store_code != 'M99'

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

def get_store_data(pl_data, period, shop_cd):
    """특정 매장의 특정 기간 데이터 추출"""
    store_data = defaultdict(float)
    
    for row in pl_data:
        if row['PERIOD'] != period or row['SHOP_CD'] != shop_cd:
            continue
        
        account_nm = row['ACCOUNT_NM'].strip()
        account_cd = row['ACCOUNT_CD'].strip()
        value = float(row['VALUE'] or 0)
        
        # 계정별 집계
        if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
            store_data['net_sales'] += value
        elif account_nm == 'Tag매출액' or account_cd == 'TAG_SALE_AMT':
            store_data['tag_sales'] += value
        elif account_nm == '매출원가' or account_cd == 'COGS':
            store_data['cogs'] += value
        elif account_nm == '매출총이익':
            store_data['gross_profit'] += value
        elif account_nm == '판매관리비':
            store_data['selling_expense'] += value
        elif account_nm in ['1. 급여', '1. 급 여'] or account_cd == 'LABOR_EXP':
            store_data['labor_cost'] += value
        elif account_nm == '4. 임차료':  # '4. 임차료' 계정 사용 (임차료율 표시용)
            store_data['rent'] += value
        elif account_nm == '영업이익':
            store_data['operating_profit'] += value
    
    # 직접이익 = 매출총이익 - 판매관리비 (CSV 기준)
    store_data['direct_profit'] = store_data['gross_profit'] - store_data['selling_expense']
    
    # 임차료/인건비율 = (임차료 + 인건비) / 실매출액 * 100
    if store_data['net_sales'] > 0:
        store_data['rent_labor_ratio'] = ((store_data['rent'] + store_data['labor_cost']) / store_data['net_sales']) * 100
    else:
        store_data['rent_labor_ratio'] = 0
    
    return store_data

def calculate_yoy(current_value, previous_value):
    """YOY 계산"""
    if previous_value == 0:
        return 0 if current_value == 0 else 1000  # 1000%로 표시 (비정상)
    return (current_value / previous_value) * 100

def categorize_store(direct_profit, yoy):
    """매장을 4개 카테고리로 분류"""
    if direct_profit > 0:
        if yoy >= 100:
            return 'profit_improving'  # 흑자 & 매출개선
        else:
            return 'profit_deteriorating'  # 흑자 & 매출악화
    else:
        if yoy >= 100:
            return 'loss_improving'  # 적자 & 매출개선
        else:
            return 'loss_deteriorating'  # 적자 & 매출악화

def main():
    csv_file = '../Dashboard_Raw_Data/hmd_pl_database (1).csv'
    
    # 최신 기간 확인 (hongkong-dashboard-data.json에서)
    try:
        with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
            dashboard_data = json.load(f)
            last_period_short = dashboard_data.get('metadata', {}).get('last_period', '2510')
    except:
        last_period_short = '2510'
    
    # 기간 파싱 (4자리 -> 6자리 변환)
    year, month = parse_period(last_period_short)
    if year is None:
        print(f"Invalid period: {last_period_short}")
        return
    
    # CSV 형식으로 변환 (202510)
    last_period = f"{year}{month:02d}"
    
    # 전년 동월 계산
    prev_year = year - 1
    prev_period = f"{prev_year}{month:02d}"
    
    # 데이터 읽기
    pl_data = read_pl_database(csv_file)
    
    # 모든 오프라인 매장 목록 수집
    stores = set()
    for row in pl_data:
        if row['PERIOD'] == last_period:
            stores.add((row['SHOP_CD'], row['SHOP_NM'], row['CNTRY_CD']))
    
    # 제외 매장 정의 (분석에서 제외하되 별도 표시)
    EXCLUDED_STORES = {
        'M12': {'name': 'WTC', 'reason': '10/11 종료'},
        'M05': {'name': 'LCX', 'reason': '10/13-11/7 리뉴얼중'}
    }
    
    # 매장별 데이터 수집
    store_list = []
    excluded_store_list = []  # 제외 매장 별도 저장
    
    for shop_cd, shop_nm, country in stores:
        current_data = get_store_data(pl_data, last_period, shop_cd)

        # 폐점 매장(최근 실매출 0) 제외
        if current_data['net_sales'] == 0:
            continue

        previous_data = get_store_data(pl_data, prev_period, shop_cd)
        
        # YOY 계산
        yoy = calculate_yoy(current_data['net_sales'], previous_data['net_sales'])
        
        store_info = {
            'shop_cd': shop_cd,
            'shop_nm': shop_nm,
            'country': country,
            'current': {
                'net_sales': current_data['net_sales'],
                'direct_profit': current_data['direct_profit'],
                'rent_labor_ratio': current_data['rent_labor_ratio'],
                'rent': current_data['rent'],
                'labor_cost': current_data['labor_cost'],
            },
            'previous': {
                'net_sales': previous_data['net_sales'],
                'direct_profit': previous_data['direct_profit'],
            },
            'yoy': yoy,
            'category': None  # 초기값
        }
        
        # 제외 매장인지 확인
        if shop_cd in EXCLUDED_STORES:
            excluded_store_list.append({
                **store_info,
                'exclusion_reason': EXCLUDED_STORES[shop_cd]['reason']
            })
        else:
            # 카테고리 분류 (제외 매장이 아닌 경우만)
            store_info['category'] = categorize_store(current_data['direct_profit'], yoy)
            store_list.append(store_info)
    
    # 카테고리별로 그룹화 (홍콩 오프라인 매장만)
    categorized = {
        'profit_improving': [],
        'profit_deteriorating': [],
        'loss_improving': [],
        'loss_deteriorating': []
    }
    
    for store in store_list:
        # 홍콩 오프라인 매장만 카테고리에 포함
        if store['country'] == 'HK':
            categorized[store['category']].append(store)
    
    # 각 카테고리별 합계 및 평균 계산
    result = {
        'metadata': {
            'period': last_period,
            'previous_period': prev_period,
            'generated_at': datetime.now().isoformat()
        },
        'summary': {
            'total_stores': len(store_list),
            'hk_stores': len([s for s in store_list if s['country'] == 'HK']),
            'mc_stores': len([s for s in store_list if s['country'] == 'MC']),
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
        'profit_improving': '흑자 & 매출개선',
        'profit_deteriorating': '흑자 & 매출악화',
        'loss_improving': '적자 & 매출개선',
        'loss_deteriorating': '적자 & 매출악화'
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
    
    # 제외 매장 정보 추가
    if excluded_store_list:
        result['excluded_stores'] = {
            'count': len(excluded_store_list),
            'stores': excluded_store_list
        }
    else:
        result['excluded_stores'] = {
            'count': 0,
            'stores': []
        }
    
    # JSON 저장
    output_file = 'components/dashboard/hongkong-store-status.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"매장별 현황 데이터 생성 완료: {output_file}")
    print(f"총 매장 수: {result['summary']['total_stores']}")
    print(f"HK 매장: {result['summary']['hk_stores']}개")
    print(f"MC 매장: {result['summary']['mc_stores']}개")

if __name__ == '__main__':
    main()

