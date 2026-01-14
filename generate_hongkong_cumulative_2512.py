#!/usr/bin/env python3
"""
홍콩 재고수불 CSV 데이터를 누적 대시보드용 JSON으로 변환
1월~12월 누적 데이터 생성
"""
import csv
import json
import os
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
        
        # current_year를 2자리로 변환 (2025 -> 25)
        current_year_2digit = current_year % 100
        
        # 현재 시즌 결정
        if current_month >= 1 and current_month <= 6:
            # 1-6월: F시즌이 당시즌
            current_season = 'F'
            if season_year == current_year_2digit and season_type == 'F':
                return f'당시즌{season_type}'
        else:
            # 7-12월: S시즌이 당시즌
            current_season = 'S'
            if season_year == current_year_2digit and season_type == 'S':
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

def generate_cumulative_dashboard_data(csv_file_path, output_file_path, target_period='2511'):
    """누적 대시보드용 데이터 생성 (1월~target_period 누적)
    
    Args:
        csv_file_path: CSV 파일 경로
        output_file_path: 출력 JSON 파일 경로
        target_period: 마지막 Period (예: '2511' = 2025년 11월)
    """
    # 매장 면적 데이터 로드
    store_areas = {}
    area_file = 'components/dashboard/hongkong-store-areas.json'
    if os.path.exists(area_file):
        with open(area_file, 'r', encoding='utf-8') as f:
            area_data = json.load(f)
            store_areas = area_data.get('store_areas', {})
        print(f"매장 면적 데이터 로드: {len(store_areas)}개 매장")
    else:
        print("경고: 매장 면적 데이터 파일을 찾을 수 없습니다.")
    
    print("CSV 파일 읽는 중...")
    data, periods = read_csv_data(csv_file_path)
    
    if not periods:
        print("데이터가 없습니다.")
        return
    
    # target_period 파싱
    if target_period not in periods:
        print(f"경고: {target_period} Period가 CSV에 없습니다. 사용 가능한 Period: {periods}")
        return
    
    last_year, last_month = parse_period(target_period)
    
    # 누적 기간: 해당 년도 1월부터 target_period까지
    start_period = f"{last_year % 100:02d}01"  # 해당 년도 1월
    cumulative_periods = sorted([p for p in periods if start_period <= p <= target_period])
    
    # 전년 동기 누적 기간
    prev_year = last_year - 1
    prev_start_period = f"{prev_year % 100:02d}01"
    prev_end_period = f"{prev_year % 100:02d}{last_month:02d}"
    prev_cumulative_periods = sorted([p for p in periods if prev_start_period <= p <= prev_end_period])
    
    print(f"누적 기간: {start_period} ~ {target_period} ({len(cumulative_periods)}개월)")
    print(f"  → {cumulative_periods}")
    print(f"전년 동기 누적: {prev_start_period} ~ {prev_end_period} ({len(prev_cumulative_periods)}개월)")
    print(f"  → {prev_cumulative_periods}")
    
    # 데이터 필터링 (MLB Brand만)
    current_data = [row for row in data if row['Period'] in cumulative_periods and row['Brand'] == 'MLB']
    prev_data = [row for row in data if row['Period'] in prev_cumulative_periods and row['Brand'] == 'MLB']
    
    # 재고는 마지막 월 기준
    last_period_inventory = [row for row in data if row['Period'] == target_period and row['Brand'] == 'MLB']
    prev_last_period = prev_end_period
    prev_last_inventory = [row for row in data if row['Period'] == prev_last_period and row['Brand'] == 'MLB']
    
    print(f"누적 데이터 레코드 수: {len(current_data)}")
    print(f"전년 동기 누적 데이터 레코드 수: {len(prev_data)}")
    
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
            'stock_price': 0,  # 마지막 월 재고
            'stock_cost': 0,   # 마지막 월 재고
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
        'closed': False,
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
            'stock_price': 0,  # 마지막 월 재고
            'sales_qty_cumulative': 0,  # 누적 매출
            'stock_months': 0,  # 재고주수
        },
    })
    
    # 4. Country & Channel별 집계
    country_channel_summary = defaultdict(lambda: {
        'country': '',
        'channel': '',
        'current': {
            'net_sales': 0,
            'gross_sales': 0,
            'discount_rate': 0,
        },
        'previous': {
            'net_sales': 0,
            'gross_sales': 0,
            'discount_rate': 0,
        },
    })
    
    # 5. 전년 동일매장 기준 집계
    same_store_summary = {
        'current': {
            'net_sales': 0,
        },
        'previous': {
            'net_sales': 0,
        },
        'store_count': 0,
    }
    
    # 6. 월별 추세 데이터 (누적)
    trend_data = []
    for i, period in enumerate(cumulative_periods, 1):
        # 해당 기간까지 누적
        ytd_periods = cumulative_periods[:i]
        ytd_data = [row for row in data if row['Period'] in ytd_periods and row['Brand'] == 'MLB']
        
        ytd_gross = sum(float(row['Gross_Sales'] or 0) for row in ytd_data)
        ytd_net = sum(float(row['Net_Sales'] or 0) for row in ytd_data)
        ytd_qty = sum(float(row['Sales_Qty'] or 0) for row in ytd_data)
        ytd_discount = calculate_discount_rate(ytd_gross, ytd_net)
        
        trend_data.append({
            'period': period,
            'gross_sales': ytd_gross,
            'net_sales': ytd_net,
            'sales_qty': ytd_qty,
            'discount_rate': ytd_discount,
        })
    
    # 현재 누적 데이터 집계
    print("현재 누적 데이터 집계 중...")
    for row in current_data:
        store_code = row['Store_Code']
        season_code = row['Season_Code']
        category = row['Category']
        
        # Store별 매출 누적
        if store_code not in store_summary:
            store_summary[store_code]['store_code'] = store_code
            store_summary[store_code]['store_name'] = row['Store_Name']
            store_summary[store_code]['category'] = get_store_category(store_code)
            store_summary[store_code]['brand'] = row['Brand']
            store_summary[store_code]['channel'] = row['Channel']
            store_summary[store_code]['country'] = row['Country']
        
        gross_sales = float(row['Gross_Sales'] or 0)
        net_sales = float(row['Net_Sales'] or 0)
        sales_qty = float(row['Sales_Qty'] or 0)
        
        store_summary[store_code]['current']['gross_sales'] += gross_sales
        store_summary[store_code]['current']['net_sales'] += net_sales
        store_summary[store_code]['current']['sales_qty'] += sales_qty
        
        # 시즌별 집계
        season_type = get_season_type(season_code, last_year, last_month)
        season_key = f"{season_code}_{season_type}"
        season_summary[season_key]['season_code'] = season_code
        season_summary[season_key]['season_type'] = season_type
        season_summary[season_key]['current']['gross_sales'] += gross_sales
        season_summary[season_key]['current']['net_sales'] += net_sales
        season_summary[season_key]['current']['sales_qty'] += sales_qty
        
        # N시즌 Category별 매출 누적
        if season_code.endswith('N'):
            category_name = CATEGORY_MAP.get(category, '가방외')
            category_summary[category]['category'] = category
            category_summary[category]['category_name'] = category_name
            category_summary[category]['current']['sales_qty_cumulative'] += sales_qty
        
        # Country & Channel별 집계
        country = row['Country']
        channel = row['Channel']
        if channel == 'Outlet':
            channel_key = 'Outlet'
        elif channel == 'Online':
            channel_key = 'Online'
        else:
            channel_key = 'Retail'
        
        country_channel_key = f"{country}_{channel_key}"
        country_channel_summary[country_channel_key]['country'] = country
        country_channel_summary[country_channel_key]['channel'] = channel_key
        country_channel_summary[country_channel_key]['current']['net_sales'] += net_sales
        country_channel_summary[country_channel_key]['current']['gross_sales'] += gross_sales
    
    # 마지막 월 재고 추가
    print("마지막 월 재고 데이터 추가 중...")
    for row in last_period_inventory:
        store_code = row['Store_Code']
        category = row['Category']
        season_code = row['Season_Code']
        
        stock_price = float(row['Stock_Price'] or 0)
        stock_cost = float(row['Stock_Cost'] or 0)
        
        if store_code in store_summary:
            store_summary[store_code]['current']['stock_price'] += stock_price
            store_summary[store_code]['current']['stock_cost'] += stock_cost
        
        # N시즌 재고
        if season_code.endswith('N') and category in category_summary:
            category_summary[category]['current']['stock_price'] += stock_price
    
    # 할인율 계산
    for store_code in store_summary:
        current = store_summary[store_code]['current']
        current['discount_rate'] = calculate_discount_rate(
            current['gross_sales'], current['net_sales']
        )
    
    # 전년 동기 누적 데이터 집계
    print("전년 동기 누적 데이터 집계 중...")
    
    # 현재 시즌 코드 (25F, 25S)
    current_season_f_code = f"{last_year % 100}F"
    current_season_s_code = f"{last_year % 100}S"
    previous_season_f_code = f"{(last_year - 1) % 100}F"
    previous_season_s_code = f"{(last_year - 1) % 100}S"
    
    for row in prev_data:
        store_code = row['Store_Code']
        season_code = row['Season_Code']
        
        gross_sales = float(row['Gross_Sales'] or 0)
        net_sales = float(row['Net_Sales'] or 0)
        sales_qty = float(row['Sales_Qty'] or 0)
        
        if store_code in store_summary:
            store_summary[store_code]['previous']['gross_sales'] += gross_sales
            store_summary[store_code]['previous']['net_sales'] += net_sales
            store_summary[store_code]['previous']['sales_qty'] += sales_qty
        
        # 전년 시즌 타입 결정 (prev_year 기준)
        season_type = get_season_type(season_code, prev_year, last_month)
        season_key = f"{season_code}_{season_type}"
        
        # season_summary에 없으면 생성 (전년 데이터용)
        if season_key not in season_summary:
            season_summary[season_key]['season_code'] = season_code
            season_summary[season_key]['season_type'] = season_type
        
            season_summary[season_key]['previous']['gross_sales'] += gross_sales
            season_summary[season_key]['previous']['net_sales'] += net_sales
            season_summary[season_key]['previous']['sales_qty'] += sales_qty
        
        # 25F의 전년 동기 데이터는 24F 누적 데이터이므로 매핑
        # 25S의 전년 동기 데이터는 24S 누적 데이터이므로 매핑
        if season_code == previous_season_f_code:
            # 24F 데이터를 25F_과시즌F의 previous에 추가
            # 25F는 11월 기준으로 과시즌F로 분류됨
            current_season_f_key = f"{current_season_f_code}_과시즌F"
            if current_season_f_key in season_summary:
                season_summary[current_season_f_key]['previous']['gross_sales'] += gross_sales
                season_summary[current_season_f_key]['previous']['net_sales'] += net_sales
                season_summary[current_season_f_key]['previous']['sales_qty'] += sales_qty
        elif season_code == previous_season_s_code:
            # 24S 데이터를 25S_당시즌S의 previous에 추가
            # 25S는 11월 기준으로 당시즌S로 분류됨
            current_season_s_key = f"{current_season_s_code}_당시즌S"
            if current_season_s_key in season_summary:
                season_summary[current_season_s_key]['previous']['gross_sales'] += gross_sales
                season_summary[current_season_s_key]['previous']['net_sales'] += net_sales
                season_summary[current_season_s_key]['previous']['sales_qty'] += sales_qty
        
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
            country_channel_summary[country_channel_key]['previous']['net_sales'] += net_sales
            country_channel_summary[country_channel_key]['previous']['gross_sales'] += gross_sales
    
    # 전년 마지막 월 재고
    for row in prev_last_inventory:
        store_code = row['Store_Code']
        
        stock_price = float(row['Stock_Price'] or 0)
        stock_cost = float(row['Stock_Cost'] or 0)
        
        if store_code in store_summary:
            store_summary[store_code]['previous']['stock_price'] += stock_price
            store_summary[store_code]['previous']['stock_cost'] += stock_cost
    
    # 전년 할인율 계산
    for store_code in store_summary:
        previous = store_summary[store_code]['previous']
        previous['discount_rate'] = calculate_discount_rate(
            previous['gross_sales'], previous['net_sales']
        )
    
    # 재고주수 계산 (누적 매출 기준)
    print("재고주수 계산 중...")
    for category in category_summary:
        stock_price = category_summary[category]['current']['stock_price']
        sales_cumulative = category_summary[category]['current']['sales_qty_cumulative']
        
        # 월평균 매출
        months_count = len(cumulative_periods)
        if months_count > 0 and sales_cumulative > 0:
            avg_monthly_sales = sales_cumulative / months_count
            category_summary[category]['current']['stock_months'] = stock_price / avg_monthly_sales
            category_summary[category]['current']['stock_months_1m'] = stock_price / avg_monthly_sales  # 월평균 기준
            category_summary[category]['current']['stock_months_6m'] = stock_price / avg_monthly_sales  # 동일
        else:
            category_summary[category]['current']['stock_months'] = 0
            category_summary[category]['current']['stock_months_1m'] = 0
            category_summary[category]['current']['stock_months_6m'] = 0
    
    # 전체 실판매출 계산 (먼저 계산)
    total_net_sales_current = sum(store['current']['net_sales'] for store in store_summary.values())
    total_net_sales_previous = sum(store['previous']['net_sales'] for store in store_summary.values())
    total_yoy = ((total_net_sales_current - total_net_sales_previous) / total_net_sales_previous * 100) if total_net_sales_previous > 0 else 0
    total_change = total_net_sales_current - total_net_sales_previous
    months_count = len(cumulative_periods)
    
    # 당시즌 판매 및 판매율 계산
    print("당시즌 판매 및 판매율 계산 중...")
    season_sales_summary = {
        'current_season_f': {'sales': 0, 'sales_qty': 0, 'net_acp_p': 0, 'ac_sales_gross': 0},
        'current_season_s': {'sales': 0, 'sales_qty': 0, 'net_acp_p': 0, 'ac_sales_gross': 0},
        'previous_season_f': {'sales': 0, 'sales_qty': 0, 'net_acp_p': 0, 'ac_sales_gross': 0},
        'previous_season_s': {'sales': 0, 'sales_qty': 0, 'net_acp_p': 0, 'ac_sales_gross': 0},
        'acc': {'sales': 0, 'sales_qty': 0, 'stock_price': 0},
    }
    
    # 25S와 25F의 net_acp_p와 ac_sales_gross 수집 (마지막 Period 기준 누적값)
    current_season_f_code = f"{last_year % 100}F"
    current_season_s_code = f"{last_year % 100}S"
    previous_season_f_code = f"{(last_year - 1) % 100}F"
    previous_season_s_code = f"{(last_year - 1) % 100}S"
    
    for row in last_period_inventory:
        season_code = row['Season_Code']
        net_acp_p = float(row.get('Net_AcP_P', 0) or 0)
        ac_sales_gross = float(row.get('AC_Sales_Gross', 0) or 0)
        
        if season_code == current_season_f_code:
            season_sales_summary['current_season_f']['net_acp_p'] += net_acp_p
            season_sales_summary['current_season_f']['ac_sales_gross'] += ac_sales_gross
        elif season_code == current_season_s_code:
            season_sales_summary['current_season_s']['net_acp_p'] += net_acp_p
            season_sales_summary['current_season_s']['ac_sales_gross'] += ac_sales_gross
    
    # 전년 마지막 Period 기준 전년 시즌 입고액 및 판매액 수집
    for row in prev_last_inventory:
        season_code = row['Season_Code']
        net_acp_p = float(row.get('Net_AcP_P', 0) or 0)
        ac_sales_gross = float(row.get('AC_Sales_Gross', 0) or 0)
        
        if season_code == previous_season_f_code:
            season_sales_summary['previous_season_f']['net_acp_p'] += net_acp_p
            season_sales_summary['previous_season_f']['ac_sales_gross'] += ac_sales_gross
        elif season_code == previous_season_s_code:
            season_sales_summary['previous_season_s']['net_acp_p'] += net_acp_p
            season_sales_summary['previous_season_s']['ac_sales_gross'] += ac_sales_gross
    
    for season_key, season_data in season_summary.items():
        season_type = season_data['season_type']
        season_code = season_data['season_code']
        current_sales = season_data['current']['net_sales']
        current_qty = season_data['current']['sales_qty']
        previous_sales = season_data['previous']['net_sales']
        previous_qty = season_data['previous']['sales_qty']
        
        if season_type == '당시즌F':
            season_sales_summary['current_season_f']['sales'] += current_sales
            season_sales_summary['current_season_f']['sales_qty'] += current_qty
        elif season_type == '당시즌S':
            season_sales_summary['current_season_s']['sales'] += current_sales
            season_sales_summary['current_season_s']['sales_qty'] += current_qty
        
        # 전년 시즌 판매 데이터 수집 (24F, 24S)
        if season_code == previous_season_f_code:
            season_sales_summary['previous_season_f']['sales'] += previous_sales
            season_sales_summary['previous_season_f']['sales_qty'] += previous_qty
        elif season_code == previous_season_s_code:
            season_sales_summary['previous_season_s']['sales'] += previous_sales
            season_sales_summary['previous_season_s']['sales_qty'] += previous_qty
    
    # ACC 재고 (N시즌)
    for category, cat_data in category_summary.items():
        season_sales_summary['acc']['stock_price'] += cat_data['current']['stock_price']
    
    # ACC 재고주수 계산
    acc_stock_months = 0
    if months_count > 0 and season_sales_summary['acc']['stock_price'] > 0:
        # 전체 매출에서 월평균 계산
        total_monthly_avg = total_net_sales_current / months_count if months_count > 0 else 0
        if total_monthly_avg > 0:
            acc_stock_months = season_sales_summary['acc']['stock_price'] / total_monthly_avg
    
    season_sales_summary['acc']['stock_months'] = acc_stock_months
    
    # 당시즌 판매율 계산 (입고 대비 판매율)
    # 25F 판매율
    if season_sales_summary['current_season_f']['net_acp_p'] > 0:
        season_sales_summary['current_season_f']['sales_rate'] = (
            season_sales_summary['current_season_f']['ac_sales_gross'] / 
            season_sales_summary['current_season_f']['net_acp_p'] * 100
        )
    else:
        season_sales_summary['current_season_f']['sales_rate'] = 0
    
    # 25S 판매율
    if season_sales_summary['current_season_s']['net_acp_p'] > 0:
        season_sales_summary['current_season_s']['sales_rate'] = (
            season_sales_summary['current_season_s']['ac_sales_gross'] / 
            season_sales_summary['current_season_s']['net_acp_p'] * 100
        )
    else:
        season_sales_summary['current_season_s']['sales_rate'] = 0
    
    # 전년 판매율 계산 (24F, 24S)
    # 24F 판매율
    if season_sales_summary['previous_season_f']['net_acp_p'] > 0:
        season_sales_summary['previous_season_f']['sales_rate'] = (
            season_sales_summary['previous_season_f']['ac_sales_gross'] / 
            season_sales_summary['previous_season_f']['net_acp_p'] * 100
        )
    else:
        season_sales_summary['previous_season_f']['sales_rate'] = 0
    
    # 24S 판매율
    if season_sales_summary['previous_season_s']['net_acp_p'] > 0:
        season_sales_summary['previous_season_s']['sales_rate'] = (
            season_sales_summary['previous_season_s']['ac_sales_gross'] / 
            season_sales_summary['previous_season_s']['net_acp_p'] * 100
        )
    else:
        season_sales_summary['previous_season_s']['sales_rate'] = 0
    
    # 당시즌 판매율 계산 (매출 대비 - 기존 로직 유지)
    current_season_total_sales = (season_sales_summary['current_season_f']['sales'] + 
                                   season_sales_summary['current_season_s']['sales'])
    
    if total_net_sales_current > 0:
        season_sales_summary['current_season_rate'] = (current_season_total_sales / total_net_sales_current) * 100
    else:
        season_sales_summary['current_season_rate'] = 0
    
    # ============================================================
    # 누적 아이템별 데이터 생성 (25F 카테고리별 TOP 5, ACC 카테고리별)
    # ============================================================
    print("누적 아이템별 데이터 생성 중...")
    
    # 25F 카테고리별 누적 판매 (1월~target_period 누적)
    season_f_subcat_cumulative = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'net_sales': 0,
    })
    season_f_subcat_prev_cumulative = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'net_sales': 0,
    })
    
    # 현재 누적 데이터 (1월~target_period)
    for row in current_data:
        if row['Season_Code'] == current_season_f_code:
            subcat_code = row.get('Subcategory_Code', '').strip()
            subcat_name = row.get('Subcategory', '').strip()
            if subcat_code:
                season_f_subcat_cumulative[subcat_code]['subcategory_code'] = subcat_code
                season_f_subcat_cumulative[subcat_code]['subcategory_name'] = subcat_name
                season_f_subcat_cumulative[subcat_code]['net_sales'] += float(row.get('Net_Sales', 0) or 0)
    
    # 전년 동기 누적 데이터
    for row in prev_data:
        if row['Season_Code'] == previous_season_f_code:
            subcat_code = row.get('Subcategory_Code', '').strip()
            subcat_name = row.get('Subcategory', '').strip()
            if subcat_code:
                season_f_subcat_prev_cumulative[subcat_code]['subcategory_code'] = subcat_code
                season_f_subcat_prev_cumulative[subcat_code]['subcategory_name'] = subcat_name
                season_f_subcat_prev_cumulative[subcat_code]['net_sales'] += float(row.get('Net_Sales', 0) or 0)
    
    # TOP 5 정렬
    season_f_top5 = sorted(season_f_subcat_cumulative.items(), key=lambda x: x[1]['net_sales'], reverse=True)[:5]
    
    # ACC 카테고리별 누적 판매 (1월~target_period 누적)
    acc_sales_data = {
        'current': {
            'total': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
            'categories': {
                '신발': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
                '모자': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
                '가방': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
                '기타ACC': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
            }
        },
        'previous': {
            'total': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
            'categories': {
                '신발': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
                '모자': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
                '가방': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
                '기타ACC': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
            }
        }
    }
    
    # ACC 카테고리 매핑
    def get_acc_category(category):
        if category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category == 'BAG':
            return '가방'
        else:
            return '기타ACC'
    
    # 현재 누적 ACC 데이터
    for row in current_data:
        season_code = row['Season_Code']
        if season_code.endswith('N'):  # N시즌만
            category = row.get('Category', '')
            acc_category = get_acc_category(category)
            gross_sales = float(row.get('Gross_Sales', 0) or 0)
            net_sales = float(row.get('Net_Sales', 0) or 0)
            sales_qty = float(row.get('Sales_Qty', 0) or 0)
            
            acc_sales_data['current']['total']['gross_sales'] += gross_sales
            acc_sales_data['current']['total']['net_sales'] += net_sales
            acc_sales_data['current']['total']['sales_qty'] += sales_qty
            
            acc_sales_data['current']['categories'][acc_category]['gross_sales'] += gross_sales
            acc_sales_data['current']['categories'][acc_category]['net_sales'] += net_sales
            acc_sales_data['current']['categories'][acc_category]['sales_qty'] += sales_qty
    
    # 전년 동기 누적 ACC 데이터
    for row in prev_data:
        season_code = row['Season_Code']
        if season_code.endswith('N'):  # N시즌만
            category = row.get('Category', '')
            acc_category = get_acc_category(category)
            gross_sales = float(row.get('Gross_Sales', 0) or 0)
            net_sales = float(row.get('Net_Sales', 0) or 0)
            sales_qty = float(row.get('Sales_Qty', 0) or 0)
            
            acc_sales_data['previous']['total']['gross_sales'] += gross_sales
            acc_sales_data['previous']['total']['net_sales'] += net_sales
            acc_sales_data['previous']['total']['sales_qty'] += sales_qty
            
            acc_sales_data['previous']['categories'][acc_category]['gross_sales'] += gross_sales
            acc_sales_data['previous']['categories'][acc_category]['net_sales'] += net_sales
            acc_sales_data['previous']['categories'][acc_category]['sales_qty'] += sales_qty
    
    # season_sales 구조 생성 (accumulated 섹션 포함)
    season_sales = {
        'current_season_f': {
            'accumulated': {
                'subcategory_top5': [
                    {
                        'subcategory_code': subcat_code,
                        'subcategory_name': data['subcategory_name'],
                        'net_sales': data['net_sales'] / 1000,  # 1K HKD
                    }
                    for subcat_code, data in season_f_top5
                ],
            }
        },
        'previous_season_f': {
            'accumulated': {
                'subcategory_top5': [
                    {
                        'subcategory_code': subcat_code,
                        'subcategory_name': data['subcategory_name'],
                        'net_sales': data['net_sales'] / 1000,  # 1K HKD
                    }
                    for subcat_code, data in sorted(season_f_subcat_prev_cumulative.items(), key=lambda x: x[1]['net_sales'], reverse=True)[:5]
                ],
            }
        }
    }
    
    # 전년 동일매장 기준 계산
    print("전년 동일매장 기준 계산 중...")
    for store_code in store_summary:
        store = store_summary[store_code]
        # 현재 누적 매출이 있는 매장만 포함
        if store['current']['net_sales'] > 0:
            same_store_summary['current']['net_sales'] += store['current']['net_sales']
            same_store_summary['previous']['net_sales'] += store['previous']['net_sales']
            same_store_summary['store_count'] += 1
    
    # Same Store YOY 계산
    if same_store_summary['previous']['net_sales'] > 0:
        same_store_yoy = (same_store_summary['current']['net_sales'] / same_store_summary['previous']['net_sales']) * 100
    else:
        same_store_yoy = 0
    
    same_store_summary['yoy'] = same_store_yoy
    
    # Country & Channel별 YOY 및 할인율 계산 (HKD 단위 그대로 유지)
    offline_store_efficiency = {
        'total': {
            'current': {'store_count': 0, 'sales_per_store': 0},
            'previous': {'store_count': 0, 'sales_per_store': 0},
            'yoy': 0
        },
        'by_channel': {}
    }
    
    # 채널별 매장 수 및 면적 카운트
    channel_store_count = defaultdict(lambda: {'current': 0, 'previous': 0})
    channel_store_area = defaultdict(lambda: {'current': 0, 'previous': 0})
    
    for store_code, store_data in store_summary.items():
        if not store_code.startswith('M'):  # M으로 시작하는 매장만 (홍콩+마카오)
            continue
        if store_data.get('channel') == 'Online':  # 온라인 제외
            continue
            
        country = store_data.get('country', '')
        channel = store_data.get('channel', 'Retail')
        
        if not country:  # country가 없으면 건너뛰기
            continue
            
        channel_key = f"{country}_{channel}"
        store_area = store_areas.get(store_code, 0)  # 면적 (평)
        
        # 현재 매출이 있으면 카운트
        if store_data['current']['net_sales'] > 0:
            channel_store_count[channel_key]['current'] += 1
            channel_store_area[channel_key]['current'] += store_area
            offline_store_efficiency['total']['current']['store_count'] += 1
        
        # 전년 매출이 있으면 카운트
        if store_data['previous']['net_sales'] > 0:
            channel_store_count[channel_key]['previous'] += 1
            channel_store_area[channel_key]['previous'] += store_area
            offline_store_efficiency['total']['previous']['store_count'] += 1
    
    # 누적 일수 계산 (1월~target_period)
    cumulative_days = 0
    for month in range(1, last_month + 1):
        if month == 12:
            next_month_year = last_year + 1
            next_month = 1
        else:
            next_month_year = last_year
            next_month = month + 1
        cumulative_days += (datetime(next_month_year, next_month, 1) - datetime(last_year, month, 1)).days
    print(f"누적 일수 계산: {last_year}년 1월~{last_month}월 = {cumulative_days}일")
    
    # 채널별 매장당 매출 계산
    for key in country_channel_summary:
        cc = country_channel_summary[key]
        if cc['previous']['net_sales'] > 0:
            cc['yoy'] = (cc['current']['net_sales'] / cc['previous']['net_sales']) * 100
        else:
            cc['yoy'] = 0 if cc['current']['net_sales'] == 0 else 999
        
        # 현재 할인율 계산
        current_gross = cc['current']['gross_sales']
        current_net = cc['current']['net_sales']
        cc['current']['discount_rate'] = calculate_discount_rate(current_gross, current_net)
        
        # 전년 할인율 계산
        prev_gross = cc['previous']['gross_sales']
        prev_net = cc['previous']['net_sales']
        cc['previous']['discount_rate'] = calculate_discount_rate(prev_gross, prev_net)
        
        # offline_store_efficiency 채널별 데이터 추가 (온라인 제외)
        if cc['channel'] != 'Online':
            current_count = channel_store_count[key]['current']
            previous_count = channel_store_count[key]['previous']
            current_area = channel_store_area[key]['current']
            previous_area = channel_store_area[key]['previous']
            
            # 평당매출 계산: (누적 매출 / 총 면적) ÷ 누적 일수
            # 결과는 HKD/평/일
            current_sales_per_pyeong_per_day = 0
            if current_area > 0 and cumulative_days > 0:
                current_sales_per_pyeong_per_day = (cc['current']['net_sales'] / current_area) / cumulative_days
            
            previous_sales_per_pyeong_per_day = 0
            if previous_area > 0 and cumulative_days > 0:
                previous_sales_per_pyeong_per_day = (cc['previous']['net_sales'] / previous_area) / cumulative_days
            
            offline_store_efficiency['by_channel'][key] = {
                'country': cc['country'],
                'channel': cc['channel'],
                'current': {
                    'store_count': current_count,
                    'total_area': current_area,
                    'net_sales': cc['current']['net_sales'],
                    'sales_per_pyeong_per_day': current_sales_per_pyeong_per_day  # HKD/평/일
                },
                'previous': {
                    'store_count': previous_count,
                    'total_area': previous_area,
                    'net_sales': cc['previous']['net_sales'],
                    'sales_per_pyeong_per_day': previous_sales_per_pyeong_per_day  # HKD/평/일
                },
                'yoy': 0,
                'store_count_change': current_count - previous_count,
                'cumulative_days': cumulative_days
            }
            
            # YOY 계산
            if previous_sales_per_pyeong_per_day > 0:
                offline_store_efficiency['by_channel'][key]['yoy'] = (
                    current_sales_per_pyeong_per_day / previous_sales_per_pyeong_per_day
                ) * 100
    
    # 전체 평당매출 계산
    total_current_sales = sum(cc['current']['net_sales'] for key, cc in country_channel_summary.items() if cc['channel'] != 'Online')
    total_previous_sales = sum(cc['previous']['net_sales'] for key, cc in country_channel_summary.items() if cc['channel'] != 'Online')
    
    total_current_area = sum(channel_store_area[key]['current'] for key in channel_store_area)
    total_previous_area = sum(channel_store_area[key]['previous'] for key in channel_store_area)
    
    # 전체 평당매출 (HKD/평/일)
    current_sales_per_pyeong_per_day = 0
    if total_current_area > 0 and cumulative_days > 0:
        current_sales_per_pyeong_per_day = (total_current_sales / total_current_area) / cumulative_days
    
    previous_sales_per_pyeong_per_day = 0
    if total_previous_area > 0 and cumulative_days > 0:
        previous_sales_per_pyeong_per_day = (total_previous_sales / total_previous_area) / cumulative_days
    
    offline_store_efficiency['total']['current']['total_area'] = total_current_area
    offline_store_efficiency['total']['current']['sales_per_pyeong_per_day'] = current_sales_per_pyeong_per_day
    offline_store_efficiency['total']['previous']['total_area'] = total_previous_area
    offline_store_efficiency['total']['previous']['sales_per_pyeong_per_day'] = previous_sales_per_pyeong_per_day
    offline_store_efficiency['total']['cumulative_days'] = cumulative_days
    
    if previous_sales_per_pyeong_per_day > 0:
        offline_store_efficiency['total']['yoy'] = (
            current_sales_per_pyeong_per_day / previous_sales_per_pyeong_per_day
        ) * 100
    
    # 결과 정리
    result = {
        'metadata': {
            'period_type': 'cumulative',
            'start_period': start_period,
            'end_period': target_period,
            'months_count': len(cumulative_periods),
            'previous_start_period': prev_start_period,
            'previous_end_period': prev_end_period,
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
        'offline_store_efficiency': offline_store_efficiency,
        'store_summary': dict(store_summary),
        'season_summary': dict(season_summary),
        'category_summary': dict(category_summary),
        'season_sales_summary': season_sales_summary,  # 당시즌 판매 및 판매율
        'season_sales': season_sales,  # 누적 아이템별 데이터 (25F 카테고리별 TOP 5)
        'acc_sales_data': acc_sales_data,  # ACC 카테고리별 누적 판매
        'trend_data': trend_data,
    }
    
    # JSON 저장
    print(f"결과 저장 중: {output_file_path}")
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("완료!")
    print(f"  - 누적 기간: {start_period} ~ {target_period} ({len(cumulative_periods)}개월)")
    print(f"  - Store 수: {len(store_summary)}")
    print(f"  - 누적 실판매출: {total_net_sales_current / 1000:,.1f}K HKD")
    print(f"  - 전년 동기 대비: {total_yoy:.1f}%")
    print(f"  - 시즌 수: {len(season_summary)}")
    print(f"  - Category 수: {len(category_summary)}")
    print(f"  - 추세 데이터 포인트: {len(trend_data)}")

if __name__ == '__main__':
    csv_file = '../Dashboard_Raw_Data/HKMC/2512/HKMC_Inventory_2512.csv'
    output_file = 'public/dashboard/hongkong-dashboard-cumulative-2512.json'
    
    # 2512 (2025년 1월~12월) 누적 데이터 생성
    generate_cumulative_dashboard_data(csv_file, output_file, target_period='2512')

