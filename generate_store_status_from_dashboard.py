#!/usr/bin/env python3
"""
대시보드 데이터에서 매장 상태 파일 생성
"""
import json
from datetime import datetime

def calculate_yoy(current_value, previous_value):
    """YOY 계산"""
    if previous_value == 0:
        return 0 if current_value == 0 else 1000
    return (current_value / previous_value) * 100

def categorize_store(direct_profit, yoy):
    """매장을 4개 카테고리로 분류"""
    if direct_profit > 0:
        if yoy >= 100:
            return 'profit_improving'  # 흑자 & 성장
        else:
            return 'profit_deteriorating'  # 흑자 & 악화
    else:
        if yoy >= 100:
            return 'loss_improving'  # 적자 & 성장
        else:
            return 'loss_deteriorating'  # 적자 & 악화

def parse_period(period_str):
    """Period 문자열을 파싱 (예: 202510 -> 2025, 10 또는 2510 -> 2025, 10)"""
    if len(period_str) == 6:
        year = int(period_str[:4])
        month = int(period_str[4:6])
        return year, month
    elif len(period_str) == 4:
        year = 2000 + int(period_str[:2])
        month = int(period_str[2:4])
        return year, month
    return None, None

def read_pl_csv(csv_file, period, shop_cd):
    """CSV에서 특정 매장의 특정 기간 데이터 읽기"""
    import csv
    from collections import defaultdict
    
    store_data = defaultdict(float)
    
    try:
        with open(csv_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['PERIOD'] != period or row['SHOP_CD'] != shop_cd:
                    continue
                
                account_nm = row['ACCOUNT_NM'].strip()
                value = float(row['VALUE'] or 0)
                
                # 필요한 계정만 수집
                if account_nm == '실매출액':
                    store_data['net_sales'] += value
                elif account_nm == '매출총이익':
                    store_data['gross_profit'] += value
                elif account_nm == '판매관리비':
                    store_data['selling_expense'] += value
        
        # 직접이익 계산
        store_data['direct_profit'] = store_data['gross_profit'] - store_data['selling_expense']
        
    except FileNotFoundError:
        pass
    
    return store_data

def main():
    period = '2510'
    
    print("=" * 80)
    print(f"홍콩/마카오 {period} 매장 상태 파일 생성 (대시보드 데이터 기반)")
    print("=" * 80)
    
    # Period 파싱
    year, month = parse_period(period)
    if year is None:
        print(f"Invalid period: {period}")
        return
    
    # 전년/전전년 period 계산
    prev_year = year - 1
    prev_prev_year = prev_year - 1
    prev_period = f"{prev_year}{month:02d}"
    prev_prev_period = f"{prev_prev_year}{month:02d}"
    
    # CSV 파일 경로 (전전년 데이터 읽기용)
    csv_file = f'../Dashboard_Raw_Data/HKMC/{period}/HKMC_PL_{period}.csv'
    
    print(f"\nCSV 파일: {csv_file}")
    print(f"Period: {year}{month:02d}")
    print(f"Previous Period: {prev_period}")
    print(f"Previous-Previous Period: {prev_prev_period}")
    
    # 대시보드 데이터 로드
    dashboard_file = f'public/dashboard/hongkong-dashboard-data-{period}.json'
    with open(dashboard_file, 'r', encoding='utf-8') as f:
        dashboard_data = json.load(f)
    
    store_summary = dashboard_data.get('store_summary', {})
    
    # PL 데이터 로드 (직접이익 계산용)
    pl_file = f'public/dashboard/hongkong-pl-data-{period}.json'
    try:
        with open(pl_file, 'r', encoding='utf-8') as f:
            pl_data = json.load(f)
    except FileNotFoundError:
        print(f"경고: PL 데이터 파일을 찾을 수 없음: {pl_file}")
        pl_data = None
    
    # 매장별 PL 데이터 로드 (직접비용)
    pl_stores_file = f'public/dashboard/hongkong-pl-stores-{period}.json'
    try:
        with open(pl_stores_file, 'r', encoding='utf-8') as f:
            pl_stores_data = json.load(f)
            pl_stores = pl_stores_data.get('stores', {})
    except FileNotFoundError:
        print(f"경고: 매장별 PL 데이터 파일을 찾을 수 없음: {pl_stores_file}")
        pl_stores = {}
    
    print(f"\n총 {len(store_summary)}개 매장 데이터 로드")
    
    # 제외 매장 정의 (2510 기준)
    EXCLUDED_STORES = {
        'M12': {'name': 'WTC', 'reason': '10/11 종료'},
        'M05': {'name': 'LCX', 'reason': '10/13-11/7 리뉴얼중'}
    }
    
    # 온라인 매장 코드
    ONLINE_CODES = {'HE1', 'HE2', 'XE1'}
    
    # 매장별 데이터 수집
    store_list = []
    excluded_store_list = []
    
    for store_code, store_data in store_summary.items():
        # 온라인 매장 제외
        if store_code in ONLINE_CODES or store_code == 'M99':
            continue
        
        # HK와 MC만
        country = store_data.get('country', '')
        if country not in ['HK', 'MC']:
            continue
        
        current = store_data.get('current', {})
        previous = store_data.get('previous', {})
        
        # 매출이 0인 매장 제외
        net_sales = current.get('net_sales', 0)
        if net_sales == 0:
            print(f"  제외: {store_code} (매출 0)")
            continue
        
        # 매장별 PL 데이터에서 직접비용 가져오기
        store_pl = pl_stores.get(store_code, {})
        labor_cost = store_pl.get('labor_cost', 0)
        rent = store_pl.get('rent', 0)
        logistics = store_pl.get('logistics', 0)
        other_fee = store_pl.get('other_fee', 0)
        marketing = store_pl.get('marketing', 0)
        fee = store_pl.get('fee', 0)
        maintenance = store_pl.get('maintenance', 0)
        insurance = store_pl.get('insurance', 0)
        utilities = store_pl.get('utilities', 0)
        supplies = store_pl.get('supplies', 0)
        travel = store_pl.get('travel', 0)
        communication = store_pl.get('communication', 0)
        uniform = store_pl.get('uniform', 0)
        depreciation = store_pl.get('depreciation', 0)
        
        # 총 직접비용
        total_direct_cost = (labor_cost + rent + logistics + other_fee + marketing + 
                            fee + maintenance + insurance + utilities + supplies + 
                            travel + communication + uniform + depreciation)
        
        # 매출총이익 = 실매출 - 매출원가
        # 매출원가율을 30.5%로 가정 (PL 데이터의 평균)
        cogs_rate = 0.305
        gross_sales = current.get('gross_sales', 0)
        cogs = net_sales * cogs_rate
        gross_profit = net_sales - cogs
        
        # 직접이익 = 매출총이익 - 직접비용
        direct_profit = gross_profit - total_direct_cost
        
        # 전년 데이터
        prev_net_sales = previous.get('net_sales', 0)
        prev_gross_sales = previous.get('gross_sales', 0)
        prev_cogs = prev_net_sales * cogs_rate
        prev_gross_profit = prev_net_sales - prev_cogs
        
        # 전년 직접비용 (매장별 PL 데이터)
        prev_labor_cost = store_pl.get('labor_cost_prev', 0)
        prev_rent = store_pl.get('rent_prev', 0)
        prev_logistics = store_pl.get('logistics_prev', 0)
        prev_other_fee = store_pl.get('other_fee_prev', 0)
        prev_marketing = store_pl.get('marketing_prev', 0)
        prev_fee = store_pl.get('fee_prev', 0)
        prev_maintenance = store_pl.get('maintenance_prev', 0)
        prev_insurance = store_pl.get('insurance_prev', 0)
        prev_utilities = store_pl.get('utilities_prev', 0)
        prev_supplies = store_pl.get('supplies_prev', 0)
        prev_travel = store_pl.get('travel_prev', 0)
        prev_communication = store_pl.get('communication_prev', 0)
        prev_uniform = store_pl.get('uniform_prev', 0)
        prev_depreciation = store_pl.get('depreciation_prev', 0)
        
        prev_total_direct_cost = (prev_labor_cost + prev_rent + prev_logistics + prev_other_fee + 
                                 prev_marketing + prev_fee + prev_maintenance + prev_insurance + 
                                 prev_utilities + prev_supplies + prev_travel + prev_communication + 
                                 prev_uniform + prev_depreciation)
        
        # 전년 직접이익
        prev_direct_profit = prev_gross_profit - prev_total_direct_cost
        
        # YOY 계산
        yoy = calculate_yoy(net_sales, prev_net_sales)
        
        # 전년 YOY 계산 (전년 vs 전전년) - CSV에서 읽기
        prev_prev_data = read_pl_csv(csv_file, prev_prev_period, store_code)
        prev_prev_net_sales = prev_prev_data.get('net_sales', 0)
        prev_prev_direct_profit = prev_prev_data.get('direct_profit', 0)
        prev_yoy = calculate_yoy(prev_net_sales, prev_prev_net_sales)
        
        # 전년 카테고리 계산
        previous_category = categorize_store(prev_direct_profit, prev_yoy) if prev_prev_net_sales > 0 else None
        
        # 임차료/인건비율 계산
        rent_labor_ratio = ((rent + labor_cost) / net_sales * 100) if net_sales > 0 else 0
        
        store_info = {
            'shop_cd': store_code,
            'shop_nm': store_data.get('store_name', store_code),
            'country': country,
            'current': {
                'net_sales': net_sales,
                'direct_profit': direct_profit,
                'rent_labor_ratio': rent_labor_ratio,
                'rent': rent,
                'labor_cost': labor_cost,
            },
            'previous': {
                'net_sales': prev_net_sales,
                'direct_profit': prev_direct_profit,
            },
            'yoy': yoy,
            'category': None,
            'previous_category': previous_category,
        }
        
        # 제외 매장인지 확인
        if store_code in EXCLUDED_STORES:
            excluded_store_list.append({
                **store_info,
                'exclusion_reason': EXCLUDED_STORES[store_code]['reason']
            })
        else:
            # 카테고리 분류
            store_info['category'] = categorize_store(direct_profit, yoy)
            store_list.append(store_info)
    
    print(f"\n분석 대상 매장: {len(store_list)}개")
    print(f"제외 매장: {len(excluded_store_list)}개")
    
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
    
    # 결과 생성
    result = {
        'metadata': {
            'period': f"20{period}",
            'previous_period': f"20{int(period[:2])-1}{period[2:]}",
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
        'profit_improving': '흑자 & 성장',
        'profit_deteriorating': '흑자 & 악화',
        'loss_improving': '적자 & 성장',
        'loss_deteriorating': '적자 & 악화'
    }
    
    for cat_key, cat_name in category_names.items():
        stores_in_cat = categorized[cat_key]
        if stores_in_cat:
            result['categories'][cat_key] = {
                'name': cat_name,
                'count': len(stores_in_cat),
                'total_direct_profit': sum(s['current']['direct_profit'] for s in stores_in_cat),
                'avg_yoy': sum(s['yoy'] for s in stores_in_cat) / len(stores_in_cat),
                'avg_rent_labor_ratio': sum(s['current']['rent_labor_ratio'] for s in stores_in_cat) / len(stores_in_cat),
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
    output_file = f'public/dashboard/hongkong-store-status-{period}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 80)
    print(f"[OK] {period} 매장 상태 파일 생성 완료: {output_file}")
    print("=" * 80)
    print(f"\n총 매장 수: {result['summary']['total_stores']}")
    print(f"HK 매장: {result['summary']['hk_stores']}개")
    print(f"MC 매장: {result['summary']['mc_stores']}개")
    print(f"총 직접이익: {result['summary']['total_direct_profit']:.2f}K")
    
    print("\n카테고리별 매장 수:")
    for cat_key, cat_data in result['categories'].items():
        print(f"  {cat_data['name']}: {cat_data['count']}개")

if __name__ == '__main__':
    main()
