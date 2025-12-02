#!/usr/bin/env python3
"""
홍콩 재고수불 CSV 데이터를 대시보드용 JSON으로 변환
"""
import csv
import json
from collections import defaultdict
from datetime import datetime

# Store Code 분류
OUTLET_CODES = {'M07', 'M13', 'M15', 'M21'}
ONLINE_MLB_CODES = {'HE1', 'HE2'}
ONLINE_DX_CODES = {'XE1'}

# Category 분류 (N시즌 재고주수 계산용)
CATEGORY_MAP = {
    'HEA': '모자',
    'SHO': '신발',
    # 나머지는 '가방외'
}

def get_store_category(store_code):
    """Store Code를 기반으로 카테고리 반환"""
    if store_code in OUTLET_CODES:
        return 'MLB 아울렛'
    elif store_code in ONLINE_MLB_CODES:
        return 'MLB 온라인'
    elif store_code in ONLINE_DX_CODES:
        return 'DX 온라인'
    else:
        return '리테일'

def parse_period(period_str):
    """Period 문자열을 년도와 월로 파싱 (예: 2312 -> 2023, 12)"""
    if len(period_str) == 4:
        year = 2000 + int(period_str[:2])
        month = int(period_str[2:])
        return year, month
    return None, None

def get_season_type(season_code, current_year, current_month):
    """
    시즌 타입 결정
    - N이 붙으면 N시즌
    - 마지막 Period 기준으로 당시즌/과시즌 결정
    """
    if season_code.endswith('N'):
        return 'N시즌'
    
    # 시즌 코드에서 연도 추출 (예: 25F -> 25)
    if len(season_code) >= 2:
        season_year = int(season_code[:2])
        season_type = season_code[2]  # F or S
        
        # 현재 시즌 결정
        if current_month >= 1 and current_month <= 6:
            # 1-6월: F시즌이 당시즌
            current_season = 'F'
            if season_year == current_year and season_type == 'F':
                return f'당시즌{season_type}'
        else:
            # 7-12월: S시즌이 당시즌
            current_season = 'S'
            if season_year == current_year and season_type == 'S':
                return f'당시즌{season_type}'
        
        # 과시즌 판단
        if season_type == 'F':
            return '과시즌F'
        elif season_type == 'S':
            return '과시즌S'
    
    return '기타'

def calculate_discount_rate(gross_sales, net_sales):
    """할인율 계산"""
    if gross_sales == 0:
        return 0
    return ((gross_sales - net_sales) / gross_sales) * 100

def read_csv_data(file_path):
    """CSV 파일 읽기"""
    data = []
    periods = set()
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:  # BOM 제거를 위해 utf-8-sig 사용
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
            periods.add(row['Period'])
    
    return data, sorted(periods)

def generate_dashboard_data(csv_file_path, output_file_path, target_period=None):
    """대시보드용 데이터 생성
    
    Args:
        csv_file_path: CSV 파일 경로
        output_file_path: 출력 JSON 파일 경로
        target_period: 처리할 Period (예: '2410'). None이면 마지막 Period 사용
    """
    print("CSV 파일 읽는 중...")
    data, periods = read_csv_data(csv_file_path)
    
    if not periods:
        print("데이터가 없습니다.")
        return
    
    # target_period가 지정되면 해당 Period 사용, 아니면 마지막 Period 사용
    if target_period:
        if target_period not in periods:
            print(f"경고: {target_period} Period가 CSV에 없습니다. 사용 가능한 Period: {periods}")
            return
        last_period = target_period
        last_year, last_month = parse_period(last_period)
    else:
        # 마지막 Period 찾기
        last_period = periods[-1]
        last_year, last_month = parse_period(last_period)
    
    # 전년 동월 Period 찾기
    prev_year = last_year - 1
    prev_period = f"{prev_year % 100:02d}{last_month:02d}"
    
    print(f"처리 Period: {last_period} ({last_year}년 {last_month}월)")
    print(f"전년 동월 Period: {prev_period} ({prev_year}년 {last_month}월)")
    
    # 데이터 필터링 (MLB Brand만)
    current_data = [row for row in data if row['Period'] == last_period and row['Brand'] == 'MLB']
    prev_data = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB']
    
    # 1. Store별 집계
    store_summary = defaultdict(lambda: {
        'store_code': '',
        'store_name': '',
        'category': '',
        'brand': '',
        'channel': '',
        'current': {
            'gross_sales': 0,
            'net_sales': 0,
            'sales_qty': 0,
            'stock_price': 0,
            'stock_cost': 0,
            'discount_rate': 0,
        },
        'previous': {
            'gross_sales': 0,
            'net_sales': 0,
            'sales_qty': 0,
            'stock_price': 0,
            'stock_cost': 0,
            'discount_rate': 0,
        },
        'closed': False,  # 폐점 여부
    })
    
    # 2. 시즌별 집계
    season_summary = defaultdict(lambda: {
        'season_code': '',
        'season_type': '',
        'current': {
            'gross_sales': 0,
            'net_sales': 0,
            'sales_qty': 0,
        },
        'previous': {
            'gross_sales': 0,
            'net_sales': 0,
            'sales_qty': 0,
        },
    })
    
    # 3. Category별 집계 (N시즌만)
    category_summary = defaultdict(lambda: {
        'category': '',
        'category_name': '',
        'current': {
            'stock_price': 0,
            'sales_qty_1m': 0,  # 최근 1개월 매출
            'sales_qty_6m': 0,  # 최근 6개월 매출
            'stock_months_1m': 0,  # 재고주수 (1개월 기준)
            'stock_months_6m': 0,  # 재고주수 (6개월 기준)
        },
    })
    
    # 4. Country & Channel별 집계
    country_channel_summary = defaultdict(lambda: {
        'country': '',
        'channel': '',
        'current': {
            'net_sales': 0,
        },
        'previous': {
            'net_sales': 0,
        },
    })
    
    # 5. 전년 동일매장 기준 집계 (폐점 매장 제외)
    same_store_summary = {
        'current': {
            'net_sales': 0,
        },
        'previous': {
            'net_sales': 0,
        },
        'store_count': 0,  # 동일매장 수
    }
    
    # 6. 추세 데이터 (월별)
    trend_data = defaultdict(lambda: {
        'period': '',
        'gross_sales': 0,
        'net_sales': 0,
        'sales_qty': 0,
        'discount_rate': 0,
    })
    
    # 현재 데이터 집계
    print("현재 Period 데이터 집계 중...")
    for row in current_data:
        store_code = row['Store_Code']
        season_code = row['Season_Code']
        category = row['Category']
        
        # Store별 집계
        store_summary[store_code]['store_code'] = store_code
        store_summary[store_code]['store_name'] = row['Store_Name']
        store_summary[store_code]['category'] = get_store_category(store_code)
        store_summary[store_code]['brand'] = row['Brand']
        store_summary[store_code]['channel'] = row['Channel']
        
        gross_sales = float(row['Gross_Sales'] or 0)
        net_sales = float(row['Net_Sales'] or 0)
        sales_qty = float(row['Sales_Qty'] or 0)
        stock_price = float(row['Stock_Price'] or 0)
        stock_cost = float(row['Stock_Cost'] or 0)
        
        store_summary[store_code]['current']['gross_sales'] += gross_sales
        store_summary[store_code]['current']['net_sales'] += net_sales
        store_summary[store_code]['current']['sales_qty'] += sales_qty
        store_summary[store_code]['current']['stock_price'] += stock_price
        store_summary[store_code]['current']['stock_cost'] += stock_cost
        
        # 폐점 판단 (마지막 Period에서 Net Sales가 0이면 폐점)
        if net_sales == 0 and store_summary[store_code]['current']['net_sales'] == 0:
            store_summary[store_code]['closed'] = True
        
        # 시즌별 집계
        season_type = get_season_type(season_code, last_year, last_month)
        season_key = f"{season_code}_{season_type}"
        season_summary[season_key]['season_code'] = season_code
        season_summary[season_key]['season_type'] = season_type
        season_summary[season_key]['current']['gross_sales'] += gross_sales
        season_summary[season_key]['current']['net_sales'] += net_sales
        season_summary[season_key]['current']['sales_qty'] += sales_qty
        
        # N시즌 Category별 집계 (재고주수 계산용)
        if season_code.endswith('N'):
            category_name = CATEGORY_MAP.get(category, '가방외')
            category_summary[category]['category'] = category
            category_summary[category]['category_name'] = category_name
            category_summary[category]['current']['stock_price'] += stock_price
            category_summary[category]['current']['sales_qty_1m'] += sales_qty  # 임시로 현재월만
        
        # Country & Channel별 집계
        country = row['Country']
        channel = row['Channel']
        # Channel을 표준화 (Outlet, Retail, Online)
        if channel == 'Outlet':
            channel_key = 'Outlet'
        elif channel == 'Online':
            channel_key = 'Online'
        else:
            channel_key = 'Retail'  # Retail, Office, Warehouse 등은 모두 Retail로
        
        country_channel_key = f"{country}_{channel_key}"
        country_channel_summary[country_channel_key]['country'] = country
        country_channel_summary[country_channel_key]['channel'] = channel_key
        country_channel_summary[country_channel_key]['current']['net_sales'] += net_sales
    
    # 할인율 계산
    for store_code in store_summary:
        current = store_summary[store_code]['current']
        current['discount_rate'] = calculate_discount_rate(
            current['gross_sales'], current['net_sales']
        )
    
    # 전년 동월 데이터 집계
    print("전년 동월 데이터 집계 중...")
    for row in prev_data:
        store_code = row['Store_Code']
        season_code = row['Season_Code']
        
        gross_sales = float(row['Gross_Sales'] or 0)
        net_sales = float(row['Net_Sales'] or 0)
        sales_qty = float(row['Sales_Qty'] or 0)
        stock_price = float(row['Stock_Price'] or 0)
        stock_cost = float(row['Stock_Cost'] or 0)
        
        if store_code in store_summary:
            store_summary[store_code]['previous']['gross_sales'] += gross_sales
            store_summary[store_code]['previous']['net_sales'] += net_sales
            store_summary[store_code]['previous']['sales_qty'] += sales_qty
            store_summary[store_code]['previous']['stock_price'] += stock_price
            store_summary[store_code]['previous']['stock_cost'] += stock_cost
            store_summary[store_code]['previous']['discount_rate'] = calculate_discount_rate(
                store_summary[store_code]['previous']['gross_sales'],
                store_summary[store_code]['previous']['net_sales']
            )
        
        season_type = get_season_type(season_code, prev_year, last_month)
        season_key = f"{season_code}_{season_type}"
        if season_key in season_summary:
            season_summary[season_key]['previous']['gross_sales'] += gross_sales
            season_summary[season_key]['previous']['net_sales'] += net_sales
            season_summary[season_key]['previous']['sales_qty'] += sales_qty
        
        # Country & Channel별 집계 (전년)
        country = row['Country']
        channel = row['Channel']
        if channel == 'Outlet':
            channel_key = 'Outlet'
        elif channel == 'Online':
            channel_key = 'Online'
        else:
            channel_key = 'Retail'
        
        country_channel_key = f"{country}_{channel_key}"
        if country_channel_key in country_channel_summary:
            country_channel_summary[country_channel_key]['previous']['net_sales'] += float(row['Net_Sales'] or 0)
    
    # 추세 데이터 생성 (가장 최근 월이 속하는 년도의 1월부터)
    print("추세 데이터 생성 중...")
    # 마지막 Period가 속하는 년도의 1월부터 마지막 Period까지
    start_period = f"{last_year % 100:02d}01"  # 해당 년도 1월
    recent_periods = sorted([p for p in periods if start_period <= p <= last_period])
    
    for period in recent_periods:
        period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB']
        period_gross = sum(float(row['Gross_Sales'] or 0) for row in period_data)
        period_net = sum(float(row['Net_Sales'] or 0) for row in period_data)
        period_qty = sum(float(row['Sales_Qty'] or 0) for row in period_data)
        period_discount = calculate_discount_rate(period_gross, period_net)
        
        trend_data[period] = {
            'period': period,
            'gross_sales': period_gross,
            'net_sales': period_net,
            'sales_qty': period_qty,
            'discount_rate': period_discount,
        }
    
    # 전년 동일매장 기준 계산 (폐점 매장 제외)
    print("전년 동일매장 기준 계산 중...")
    for store_code in store_summary:
        store = store_summary[store_code]
        # 폐점 매장이 아니고, 온라인 포함 22개 매장 기준
        # 온라인 포함: HE1, HE2, XE1
        # 폐점이 아닌 매장만 포함
        if not store['closed']:
            same_store_summary['current']['net_sales'] += store['current']['net_sales']
            same_store_summary['previous']['net_sales'] += store['previous']['net_sales']
            same_store_summary['store_count'] += 1
    
    # YOY 계산
    if same_store_summary['previous']['net_sales'] > 0:
        same_store_yoy = (same_store_summary['current']['net_sales'] / same_store_summary['previous']['net_sales']) * 100
    else:
        same_store_yoy = 0
    
    same_store_summary['yoy'] = same_store_yoy
    
    # 재고주수 계산 (최근 6개월 매출 필요)
    print("재고주수 계산 중...")
    # 최근 6개월 Period 찾기
    recent_6m_periods = sorted([p for p in periods if p <= last_period])[-6:]
    
    for category in category_summary:
        # 최근 6개월 매출 합계
        sales_6m = 0
        for period in recent_6m_periods:
            period_data = [row for row in data 
                          if row['Period'] == period 
                          and row['Brand'] == 'MLB'
                          and row['Category'] == category
                          and row['Season_Code'].endswith('N')]
            sales_6m += sum(float(row['Sales_Qty'] or 0) for row in period_data)
        
        category_summary[category]['current']['sales_qty_6m'] = sales_6m
        
        # 재고주수 계산
        stock_price = category_summary[category]['current']['stock_price']
        sales_1m = category_summary[category]['current']['sales_qty_1m']
        sales_6m = category_summary[category]['current']['sales_qty_6m']
        
        if sales_1m > 0:
            category_summary[category]['current']['stock_months_1m'] = stock_price / sales_1m
        if sales_6m > 0:
            category_summary[category]['current']['stock_months_6m'] = stock_price / (sales_6m / 6)
    
    # 전체 실판매출 계산
    total_net_sales_current = sum(store['current']['net_sales'] for store in store_summary.values())
    total_net_sales_previous = sum(store['previous']['net_sales'] for store in store_summary.values())
    total_yoy = ((total_net_sales_current - total_net_sales_previous) / total_net_sales_previous * 100) if total_net_sales_previous > 0 else 0
    total_change = total_net_sales_current - total_net_sales_previous
    
    # Country & Channel별 YOY 계산
    for key in country_channel_summary:
        cc = country_channel_summary[key]
        if cc['previous']['net_sales'] > 0:
            cc['yoy'] = (cc['current']['net_sales'] / cc['previous']['net_sales']) * 100
        else:
            cc['yoy'] = 0 if cc['current']['net_sales'] == 0 else 999  # 무한대 대신 999로 표시
    
    # 결과 정리
    result = {
        'metadata': {
            'last_period': last_period,
            'previous_period': prev_period,
            'last_year': last_year,
            'last_month': last_month,
            'generated_at': datetime.now().isoformat(),
        },
        'sales_summary': {
            'total_net_sales': total_net_sales_current / 1000,  # 1K HKD 단위
            'total_yoy': total_yoy,
            'total_change': total_change / 1000,  # 1K HKD 단위
            'same_store_yoy': same_store_yoy,
            'same_store_count': same_store_summary['store_count'],
        },
        'country_channel_summary': dict(country_channel_summary),
        'store_summary': dict(store_summary),
        'season_summary': dict(season_summary),
        'category_summary': dict(category_summary),
        'trend_data': [trend_data[p] for p in sorted(trend_data.keys())],
    }
    
    # JSON 저장
    print(f"결과 저장 중: {output_file_path}")
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("완료!")
    print(f"  - Store 수: {len(store_summary)}")
    print(f"  - 시즌 수: {len(season_summary)}")
    print(f"  - Category 수: {len(category_summary)}")
    print(f"  - 추세 데이터 포인트: {len(trend_data)}")

if __name__ == '__main__':
    csv_file = '../Dashboard_Raw_Data/24012510 홍콩재고수불.csv'
    output_file = 'components/dashboard/hongkong-dashboard-data.json'
    generate_dashboard_data(csv_file, output_file)

