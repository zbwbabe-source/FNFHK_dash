#!/usr/bin/env python3
"""
대만 재고수불 CSV 데이터를 대시보드용 JSON으로 변환

참고:
- 대만재고수불.csv는 TWD 단위이므로 HKD로 환산 필요
- hmd_pl_database (1).csv는 이미 HKD로 환산되어 있음
- 환율은 매달 업데이트 시 변경 필요
"""
import csv
import json
import os
import shutil
from collections import defaultdict
from datetime import datetime
import re

# TWD to HKD 환산환율
# 2511 기준: 4.03
# 2510 기준: 3.95701015338086
# 2509 기준: 3.92
TWD_TO_HKD_RATE = 4.03  # 2511 환율

# V- (부가세 제외) 적용 비율
# 대만재고수불.csv의 실판매출은 V-로 표현해야 하므로 1.05로 나눔
# hmd_pl_database (1).csv는 이미 V-로 되어있음
VAT_EXCLUSION_RATE = 1.05

# Store Code 분류 (대만)
def is_mlb_retail(store_code):
    """MLB 리테일 (T로 시작하는 숫자)"""
    return bool(re.match(r'^T\d+$', store_code))

def is_mlb_online(store_code):
    """MLB 온라인 (TE로 시작)"""
    return store_code.startswith('TE')

def is_mlb_outlet(store_code):
    """MLB 아울렛 (TU로 시작)"""
    return store_code.startswith('TU')

def is_discovery_retail(store_code):
    """Discovery 리테일 (D로 시작하는 숫자)"""
    return bool(re.match(r'^D\d+$', store_code))

def is_discovery_online(store_code):
    """Discovery 온라인 (DE로 시작)"""
    return store_code.startswith('DE')

def get_store_category(store_code):
    """Store Code를 기반으로 카테고리 반환"""
    if is_mlb_outlet(store_code):
        return 'MLB 아울렛'
    elif is_mlb_online(store_code):
        return 'MLB 온라인'
    elif is_discovery_online(store_code):
        return 'Discovery 온라인'
    elif is_discovery_retail(store_code):
        return 'Discovery 리테일'
    elif is_mlb_retail(store_code):
        return 'MLB 리테일'
    else:
        return '기타'

def is_online_store(store_code):
    """Store Code를 기반으로 온라인 매장 여부 판단"""
    return is_mlb_online(store_code) or is_discovery_online(store_code)

def get_channel_from_store_code(store_code):
    """Store Code를 기반으로 채널 반환 (Online, Outlet, Retail)"""
    if is_online_store(store_code):
        return 'Online'
    elif is_mlb_outlet(store_code):
        return 'Outlet'
    else:
        return 'Retail'  # MLB 리테일, Discovery 리테일 등

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
    - 10월: 25F가 당시즌F (Fall/Winter 시즌)
    """
    if season_code.endswith('N'):
        return 'N시즌'
    
    # 시즌 코드에서 연도 추출 (예: 25F -> 25)
    if len(season_code) >= 2:
        season_year = int(season_code[:2])
        season_type = season_code[2]  # F or S
        
        # 현재 시즌 결정
        # 10월은 Fall 시즌이므로 25F가 당시즌
        # season_year는 2자리 (25), current_year는 4자리 (2025)이므로 % 100으로 비교
        current_year_2digit = current_year % 100
        if current_month >= 7 and current_month <= 12:
            # 7-12월: F시즌이 당시즌 (Fall/Winter)
            if season_year == current_year_2digit and season_type == 'F':
                return f'당시즌{season_type}'
            elif season_year == current_year_2digit and season_type == 'S':
                return f'과시즌{season_type}'  # 25S는 과시즌
        elif current_month >= 1 and current_month <= 6:
            # 1-6월: S시즌이 당시즌 (Spring/Summer)
            if season_year == current_year_2digit and season_type == 'S':
                return f'당시즌{season_type}'
            elif season_year == current_year_2digit and season_type == 'F':
                return f'과시즌{season_type}'  # 25F는 과시즌
        
        # 과시즌 판단 (당시즌이 아닌 경우)
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
    """CSV 파일 읽기 (MLB 브랜드만 필터링)"""
    data = []
    periods = set()
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:  # BOM 제거를 위해 utf-8-sig 사용
        reader = csv.DictReader(f)
        for row in reader:
            # MLB 브랜드만 포함 (DX 제외)
            if row.get('Brand') == 'MLB':
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
    
    # 전전년 동월 Period 찾기
    prev_prev_year = last_year - 2
    prev_prev_period = f"{prev_prev_year % 100:02d}{last_month:02d}"
    
    print(f"처리 Period: {last_period} ({last_year}년 {last_month}월)")
    print(f"전년 동월 Period: {prev_period} ({prev_year}년 {last_month}월)")
    print(f"전전년 동월 Period: {prev_prev_period} ({prev_prev_year}년 {last_month}월)")
    print(f"CSV에 포함된 Period: {sorted(periods)}")
    
    # 데이터 필터링 (MLB Brand만, TW Country만)
    current_data = [row for row in data if row['Period'] == last_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
    prev_data = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
    prev_prev_data = [row for row in data if row['Period'] == prev_prev_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
    
    print(f"현재 Period 데이터 건수: {len(current_data)}건")
    print(f"전년 동월 Period 데이터 건수: {len(prev_data)}건")
    print(f"전전년 동월 Period 데이터 건수: {len(prev_prev_data)}건")
    
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
        'previous_previous': {
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
            'stock_price': 0,
        },
        'previous': {
            'gross_sales': 0,
            'net_sales': 0,
            'sales_qty': 0,
            'stock_price': 0,
        },
    })
    
    # 3. Category별 집계 (N시즌만)
    CATEGORY_MAP = {
        'HEA': '모자',
        'SHO': '신발',
        # 나머지는 '가방외'
    }
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
        # Store Code 기반으로 채널 결정 (CSV의 Channel 컬럼보다 정확함)
        store_summary[store_code]['channel'] = get_channel_from_store_code(store_code)
        
        # CSV는 TWD 단위이므로 HKD로 환산
        gross_sales = float(row['Gross_Sales'] or 0) / TWD_TO_HKD_RATE
        net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        sales_qty = float(row['Sales_Qty'] or 0)  # 수량은 환율 적용 안 함
        stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
        stock_cost = float(row['Stock_Cost'] or 0) / TWD_TO_HKD_RATE
        
        store_summary[store_code]['current']['gross_sales'] += gross_sales
        store_summary[store_code]['current']['net_sales'] += net_sales
        store_summary[store_code]['current']['sales_qty'] += sales_qty
        store_summary[store_code]['current']['stock_price'] += stock_price
        store_summary[store_code]['current']['stock_cost'] += stock_cost
        
        # 폐점 판단은 나중에 별도로 처리 (현재는 초기화만)
        # closed는 기본값 False로 유지
        
        # 시즌별 집계
        season_type = get_season_type(season_code, last_year, last_month)
        season_key = f"{season_code}_{season_type}"
        season_summary[season_key]['season_code'] = season_code
        season_summary[season_key]['season_type'] = season_type
        season_summary[season_key]['current']['gross_sales'] += gross_sales
        season_summary[season_key]['current']['net_sales'] += net_sales
        season_summary[season_key]['current']['sales_qty'] += sales_qty
        season_summary[season_key]['current']['stock_price'] += stock_price
        
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
        
        # CSV는 TWD 단위이므로 HKD로 환산
        gross_sales = float(row['Gross_Sales'] or 0) / TWD_TO_HKD_RATE
        net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        sales_qty = float(row['Sales_Qty'] or 0)  # 수량은 환율 적용 안 함
        stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
        stock_cost = float(row['Stock_Cost'] or 0) / TWD_TO_HKD_RATE
        
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
    
    # 전전년 동월 데이터 집계
    print("전전년 동월 데이터 집계 중...")
    for row in prev_prev_data:
        store_code = row['Store_Code']
        
        # CSV는 TWD 단위이므로 HKD로 환산
        gross_sales = float(row['Gross_Sales'] or 0) / TWD_TO_HKD_RATE
        net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        sales_qty = float(row['Sales_Qty'] or 0)  # 수량은 환율 적용 안 함
        stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
        stock_cost = float(row['Stock_Cost'] or 0) / TWD_TO_HKD_RATE
        
        if store_code in store_summary:
            store_summary[store_code]['previous_previous']['gross_sales'] += gross_sales
            store_summary[store_code]['previous_previous']['net_sales'] += net_sales
            store_summary[store_code]['previous_previous']['sales_qty'] += sales_qty
            store_summary[store_code]['previous_previous']['stock_price'] += stock_price
            store_summary[store_code]['previous_previous']['stock_cost'] += stock_cost
            store_summary[store_code]['previous_previous']['discount_rate'] = calculate_discount_rate(
                store_summary[store_code]['previous_previous']['gross_sales'],
                store_summary[store_code]['previous_previous']['net_sales']
            )
        
        # 전년 데이터는 prev_year 기준으로 분류
        season_type = get_season_type(season_code, prev_year, last_month)
        season_key = f"{season_code}_{season_type}"
        # season_key가 없으면 생성 (전년 데이터에서만 나타나는 시즌일 수 있음)
        if season_key not in season_summary:
            season_summary[season_key] = {
                'season_code': season_code,
                'season_type': season_type,
                'current': {
                    'gross_sales': 0,
                    'net_sales': 0,
                    'sales_qty': 0,
                    'stock_price': 0,
                },
                'previous': {
                    'gross_sales': 0,
                    'net_sales': 0,
                    'sales_qty': 0,
                    'stock_price': 0,
                },
            }
        season_summary[season_key]['previous']['gross_sales'] += gross_sales
        season_summary[season_key]['previous']['net_sales'] += net_sales
        season_summary[season_key]['previous']['sales_qty'] += sales_qty
        season_summary[season_key]['previous']['stock_price'] += stock_price
        
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
            country_channel_summary[country_channel_key]['previous']['net_sales'] += float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
    
    # 추세 데이터 생성 (가장 최근 월이 속하는 년도의 1월부터)
    print("추세 데이터 생성 중...")
    # 마지막 Period가 속하는 년도의 1월부터 마지막 Period까지
    start_period = f"{last_year % 100:02d}01"  # 해당 년도 1월
    recent_periods = sorted([p for p in periods if start_period <= p <= last_period])
    
    # 월별 채널별 데이터 생성
    monthly_channel_data = []
    monthly_channel_yoy = {
        'TW_Retail': [],
        'TW_Outlet': [],
        'TW_Online': []
    }
    
    for period in recent_periods:
        period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
        # CSV는 TWD 단위이므로 HKD로 환산
        period_gross = sum(float(row['Gross_Sales'] or 0) for row in period_data) / TWD_TO_HKD_RATE
        period_net = sum(float(row['Net_Sales'] or 0) for row in period_data) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        period_qty = sum(float(row['Sales_Qty'] or 0) for row in period_data)  # 수량은 환율 적용 안 함
        period_discount = calculate_discount_rate(period_gross, period_net)
        
        trend_data[period] = {
            'period': period,
            'gross_sales': period_gross,
            'net_sales': period_net,
            'sales_qty': period_qty,
            'discount_rate': period_discount,
        }
        
        # 채널별 매출 집계
        tw_retail = 0
        tw_outlet = 0
        tw_online = 0
        
        for row in period_data:
            store_code = row.get('Store_Code', '')
            channel = get_channel_from_store_code(store_code)
            net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
            
            if channel == 'Retail':
                tw_retail += net_sales
            elif channel == 'Outlet':
                tw_outlet += net_sales
            elif channel == 'Online':
                tw_online += net_sales
        
        total = tw_retail + tw_outlet + tw_online
        
        monthly_channel_data.append({
            'period': period,
            'TW_Retail': tw_retail,
            'TW_Outlet': tw_outlet,
            'TW_Online': tw_online,
            'total': total
        })
        
        # 전년 동월 대비 YOY 계산
        prev_year, prev_month = parse_period(period)
        if prev_year and prev_month:
            prev_period = f"{(prev_year - 1) % 100:02d}{prev_month:02d}"
            prev_period_data = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
            
            prev_tw_retail = 0
            prev_tw_outlet = 0
            prev_tw_online = 0
            
            for row in prev_period_data:
                store_code = row.get('Store_Code', '')
                channel = get_channel_from_store_code(store_code)
                net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
                
                if channel == 'Retail':
                    prev_tw_retail += net_sales
                elif channel == 'Outlet':
                    prev_tw_outlet += net_sales
                elif channel == 'Online':
                    prev_tw_online += net_sales
            
            # YOY 계산
            tw_retail_yoy = (tw_retail / prev_tw_retail * 100) if prev_tw_retail > 0 else 0
            tw_outlet_yoy = (tw_outlet / prev_tw_outlet * 100) if prev_tw_outlet > 0 else 0
            tw_online_yoy = (tw_online / prev_tw_online * 100) if prev_tw_online > 0 else 0
            
            monthly_channel_yoy['TW_Retail'].append(round(tw_retail_yoy))
            monthly_channel_yoy['TW_Outlet'].append(round(tw_outlet_yoy))
            monthly_channel_yoy['TW_Online'].append(round(tw_online_yoy))
    
    # 월별 아이템별 데이터 생성
    print("월별 아이템별 데이터 생성 중...")
    monthly_item_data = []
    monthly_item_yoy = {
        '당시즌F': [],
        '당시즌S': [],
        '과시즌F': [],
        '과시즌S': [],
        '모자': [],
        '신발': [],
        '가방외': []
    }
    
    # Category를 아이템으로 매핑
    def get_item_from_category_and_season(category, season_code, period_year, period_month):
        """Category와 Season Code를 기반으로 아이템 분류"""
        # 모자와 신발은 Category로 판단
        if category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        
        # 의류는 Season Code로 판단
        if len(season_code) >= 3:
            season_year = int(season_code[:2])
            season_type = season_code[2]  # F or S
            current_year_2digit = period_year % 100
            
            # 당시즌 판단
            # F시즌: 6월부터 판매 시작
            # - 1-5월: 전년 F를 당시즌F (예: 2025년 1-5월은 24F)
            # - 6-12월: 올해 F를 당시즌F (예: 2025년 6-12월은 25F)
            if season_type == 'F':
                if period_month >= 1 and period_month <= 5:
                    # 1-5월: 전년 F를 당시즌F
                    if season_year == (current_year_2digit - 1):
                        return '당시즌F'
                elif period_month >= 6 and period_month <= 12:
                    # 6-12월: 올해 F를 당시즌F
                    if season_year == current_year_2digit:
                        return '당시즌F'
            
            # S시즌: 올해 S만 당시즌으로 분류
            # - 올해 S는 1년 내내 당시즌S (예: 2025년 1-12월 모두 25S는 당시즌S)
            # - 전년 S는 과시즌S (예: 2024년 데이터에서 24S는 과시즌S, 2025년 데이터에서 24S는 과시즌S)
            if season_type == 'S':
                # 올해 S만 당시즌S
                if season_year == current_year_2digit:
                    return '당시즌S'
            
            # 과시즌 판단 (당시즌이 아닌 F/S 시즌)
            # 당시즌으로 분류된 것은 여기서 제외됨
            if season_type == 'F':
                return '과시즌F'
            elif season_type == 'S':
                # 당시즌S가 아닌 S 시즌은 과시즌S (예: 23S, 22S 등)
                return '과시즌S'
        
        # 나머지는 가방외
        return '가방외'
    
    for period in recent_periods:
        period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
        period_year, period_month = parse_period(period)
        
        if not period_year or not period_month:
            continue
        
        # 아이템별 집계
        item_sales = {
            '당시즌F': {'gross_sales': 0, 'net_sales': 0},
            '당시즌S': {'gross_sales': 0, 'net_sales': 0},
            '과시즌F': {'gross_sales': 0, 'net_sales': 0},
            '과시즌S': {'gross_sales': 0, 'net_sales': 0},
            '모자': {'gross_sales': 0, 'net_sales': 0},
            '신발': {'gross_sales': 0, 'net_sales': 0},
            '가방외': {'gross_sales': 0, 'net_sales': 0}
        }
        
        for row in period_data:
            category = row.get('Category', '')
            season_code = row.get('Season_Code', '')
            item = get_item_from_category_and_season(category, season_code, period_year, period_month)
            
            # CSV는 TWD 단위이므로 HKD로 환산
            gross_sales = float(row['Gross_Sales'] or 0) / TWD_TO_HKD_RATE
            net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
            
            item_sales[item]['gross_sales'] += gross_sales
            item_sales[item]['net_sales'] += net_sales
        
        monthly_item_data.append({
            'period': period,
            '당시즌F': {
                'gross_sales': item_sales['당시즌F']['gross_sales'],
                'net_sales': item_sales['당시즌F']['net_sales']
            },
            '당시즌S': {
                'gross_sales': item_sales['당시즌S']['gross_sales'],
                'net_sales': item_sales['당시즌S']['net_sales']
            },
            '과시즌F': {
                'gross_sales': item_sales['과시즌F']['gross_sales'],
                'net_sales': item_sales['과시즌F']['net_sales']
            },
            '과시즌S': {
                'gross_sales': item_sales['과시즌S']['gross_sales'],
                'net_sales': item_sales['과시즌S']['net_sales']
            },
            '모자': {
                'gross_sales': item_sales['모자']['gross_sales'],
                'net_sales': item_sales['모자']['net_sales']
            },
            '신발': {
                'gross_sales': item_sales['신발']['gross_sales'],
                'net_sales': item_sales['신발']['net_sales']
            },
            '가방외': {
                'gross_sales': item_sales['가방외']['gross_sales'],
                'net_sales': item_sales['가방외']['net_sales']
            }
        })
        
        # 전년 동월 대비 YOY 계산
        if period_year and period_month:
            prev_year = period_year - 1
            prev_month = period_month
            prev_period = f"{(prev_year) % 100:02d}{prev_month:02d}"
            prev_period_data = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
            
            prev_item_sales = {
                '당시즌F': {'net_sales': 0},
                '당시즌S': {'net_sales': 0},
                '과시즌F': {'net_sales': 0},
                '과시즌S': {'net_sales': 0},
                '모자': {'net_sales': 0},
                '신발': {'net_sales': 0},
                '가방외': {'net_sales': 0}
            }
            
            for row in prev_period_data:
                category = row.get('Category', '')
                season_code = row.get('Season_Code', '')
                # YOY 계산 시 전년도 데이터는 전년도 기준으로 분류
                item = get_item_from_category_and_season(category, season_code, prev_year, prev_month)
                net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE
                prev_item_sales[item]['net_sales'] += net_sales
            
            # YOY 계산
            for item in ['당시즌F', '당시즌S', '과시즌F', '과시즌S', '모자', '신발', '가방외']:
                current_net = item_sales[item]['net_sales']
                prev_net = prev_item_sales[item]['net_sales']
                yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
                monthly_item_yoy[item].append(round(yoy))
    
    # 전년 동일매장 기준 계산 (폐점 매장 제외)
    print("전년 동일매장 기준 계산 중...")
    for store_code in store_summary:
        store = store_summary[store_code]
        # 폐점 매장이 아닌 경우만 포함
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
                          and row['Country'] == 'TW'
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
    
    # 오프라인 매장 효율성 계산
    # Store Code 기반으로 온라인 매장 제외, 정상 운영 매장만 포함
    offline_stores_current = [
        s for s in store_summary.values() 
        if not is_online_store(s['store_code']) 
        and s['current']['net_sales'] > 0  # 매출이 있는 매장만
    ]
    offline_stores_previous = [
        s for s in store_summary.values() 
        if not is_online_store(s['store_code']) 
        and s['previous']['net_sales'] > 0  # 전년에 매출이 있었던 매장
    ]
    
    offline_store_efficiency = {
        'total': {
            'current': {
                'store_count': len(offline_stores_current),
                'net_sales': sum(s['current']['net_sales'] for s in offline_stores_current),
            },
            'previous': {
                'store_count': len(offline_stores_previous),
                'net_sales': sum(s['previous']['net_sales'] for s in offline_stores_previous),
            }
        }
    }
    
    # 점당 매출 계산
    if offline_store_efficiency['total']['current']['store_count'] > 0:
        offline_store_efficiency['total']['current']['sales_per_store'] = (
            offline_store_efficiency['total']['current']['net_sales'] / offline_store_efficiency['total']['current']['store_count']
        )
    else:
        offline_store_efficiency['total']['current']['sales_per_store'] = 0
    
    if offline_store_efficiency['total']['previous']['store_count'] > 0:
        offline_store_efficiency['total']['previous']['sales_per_store'] = (
            offline_store_efficiency['total']['previous']['net_sales'] / offline_store_efficiency['total']['previous']['store_count']
        )
    else:
        offline_store_efficiency['total']['previous']['sales_per_store'] = 0
    
    # YOY 계산
    if offline_store_efficiency['total']['previous']['sales_per_store'] > 0:
        offline_store_efficiency['total']['yoy'] = (
            offline_store_efficiency['total']['current']['sales_per_store'] / offline_store_efficiency['total']['previous']['sales_per_store']
        ) * 100
    else:
        offline_store_efficiency['total']['yoy'] = 0
    
    # ========================================
    # season_sales 생성 (당시즌 F 의류 판매)
    # ========================================
    print("season_sales 데이터 생성 중...")
    season_sales = {}
    
    # 당시즌 F 의류 (25F)
    current_season_f_code = f"{last_year % 100}F"
    prev_season_f_code = f"{prev_year % 100}F"
    
    # 당월 데이터 (25F 10월) - 모든 카테고리 포함
    current_f_data = [row for row in current_data 
                     if row['Season_Code'] == current_season_f_code]
    
    # Subcategory별 집계
    subcategory_sales = defaultdict(lambda: {'net_sales': 0, 'subcategory_code': '', 'subcategory_name': ''})
    for row in current_f_data:
        subcat_code = row['Subcategory_Code'].strip()
        subcat_name = row['Subcategory'].strip()
        net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        subcategory_sales[subcat_code]['subcategory_code'] = subcat_code
        subcategory_sales[subcat_code]['subcategory_name'] = subcat_name
        subcategory_sales[subcat_code]['net_sales'] += net_sales
    
    # TOP 5 정렬
    top5_subcategories = sorted(subcategory_sales.values(), key=lambda x: x['net_sales'], reverse=True)[:5]
    total_net_sales_october = sum(s['net_sales'] for s in subcategory_sales.values())
    
    # 전년 동월 데이터 (24F 10월) - 모든 카테고리 포함
    prev_f_data = [row for row in prev_data 
                  if row['Season_Code'] == prev_season_f_code]
    prev_subcategory_sales = defaultdict(lambda: {'net_sales': 0, 'subcategory_code': '', 'subcategory_name': ''})
    for row in prev_f_data:
        subcat_code = row['Subcategory_Code'].strip()
        subcat_name = row['Subcategory'].strip()
        net_sales = float(row['Net_Sales'] or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        prev_subcategory_sales[subcat_code]['subcategory_code'] = subcat_code
        prev_subcategory_sales[subcat_code]['subcategory_name'] = subcat_name
        prev_subcategory_sales[subcat_code]['net_sales'] += net_sales
    prev_total_net_sales_october = sum(s['net_sales'] for s in prev_subcategory_sales.values())
    
    # 누적 데이터 (25F 7~10월) - 모든 카테고리 포함
    # 주의: CSV의 Net_AcP_P와 AC_Sales_Gross는 이미 누적값이므로 마지막 Period(2510)만 사용
    accumulated_periods = sorted([p for p in periods if f"{last_year % 100:02d}07" <= p <= last_period])
    accumulated_f_data = [row for row in data 
                         if row['Period'] in accumulated_periods
                         and row['Brand'] == 'MLB' 
                         and row['Country'] == 'TW'
                         and row['Season_Code'] == current_season_f_code]
    
    # Net_AcP_P (누적 입고금액), AC_Sales_Gross (누적 판매금액) - 마지막 Period만 사용 (이미 누적값)
    # Stock_Price는 당월 재고이므로 current_f_data 사용
    net_acp_p = sum(float(row['Net_AcP_P'] or 0) for row in accumulated_f_data if row['Period'] == last_period) / TWD_TO_HKD_RATE
    ac_sales_gross = sum(float(row['AC_Sales_Gross'] or 0) for row in accumulated_f_data if row['Period'] == last_period) / TWD_TO_HKD_RATE
    stock_price_f = sum(float(row['Stock_Price'] or 0) for row in current_f_data) / TWD_TO_HKD_RATE
    
    # 판매율 계산
    sales_rate = (ac_sales_gross / net_acp_p * 100) if net_acp_p > 0 else 0
    
    # 전년 누적 데이터 - 마지막 Period만 사용 (이미 누적값) - 모든 카테고리 포함
    prev_accumulated_periods = sorted([p for p in periods if f"{prev_year % 100:02d}07" <= p <= prev_period])
    prev_accumulated_f_data = [row for row in data 
                              if row['Period'] in prev_accumulated_periods
                              and row['Brand'] == 'MLB' 
                              and row['Country'] == 'TW'
                              and row['Season_Code'] == prev_season_f_code]
    prev_net_acp_p = sum(float(row['Net_AcP_P'] or 0) for row in prev_accumulated_f_data if row['Period'] == prev_period) / TWD_TO_HKD_RATE
    prev_ac_sales_gross = sum(float(row['AC_Sales_Gross'] or 0) for row in prev_accumulated_f_data if row['Period'] == prev_period) / TWD_TO_HKD_RATE
    prev_sales_rate = (prev_ac_sales_gross / prev_net_acp_p * 100) if prev_net_acp_p > 0 else 0
    sales_rate_change = sales_rate - prev_sales_rate
    
    # YOY 계산
    net_acp_p_yoy = (net_acp_p / prev_net_acp_p * 100) if prev_net_acp_p > 0 else 0
    ac_sales_gross_yoy = (ac_sales_gross / prev_ac_sales_gross * 100) if prev_ac_sales_gross > 0 else 0
    
    # Subcategory별 상세 데이터 생성 (입고YOY/판매YOY/판매율)
    subcategory_detail = []
    for subcat_code, subcat_data in subcategory_sales.items():
        # 해당 subcategory의 누적 입고금액, 판매금액 계산 - 마지막 Period만 사용 (이미 누적값)
        subcat_accumulated = [row for row in accumulated_f_data 
                             if row['Period'] == last_period
                             and row['Subcategory_Code'].strip() == subcat_code]
        subcat_net_acp_p = sum(float(row['Net_AcP_P'] or 0) for row in subcat_accumulated) / TWD_TO_HKD_RATE
        subcat_ac_sales_gross = sum(float(row['AC_Sales_Gross'] or 0) for row in subcat_accumulated) / TWD_TO_HKD_RATE
        subcat_sales_rate = (subcat_ac_sales_gross / subcat_net_acp_p * 100) if subcat_net_acp_p > 0 else 0
        
        # 전년 데이터 - 마지막 Period만 사용
        subcat_prev_accumulated = [row for row in prev_accumulated_f_data 
                                  if row['Period'] == prev_period
                                  and row['Subcategory_Code'].strip() == subcat_code]
        subcat_prev_net_acp_p = sum(float(row['Net_AcP_P'] or 0) for row in subcat_prev_accumulated) / TWD_TO_HKD_RATE
        subcat_prev_ac_sales_gross = sum(float(row['AC_Sales_Gross'] or 0) for row in subcat_prev_accumulated) / TWD_TO_HKD_RATE
        subcat_net_acp_p_yoy = (subcat_net_acp_p / subcat_prev_net_acp_p * 100) if subcat_prev_net_acp_p > 0 else 0
        
        # 누적 판매 YOY 계산 (누적 판매금액 기준)
        subcat_ac_sales_gross_yoy = (subcat_ac_sales_gross / subcat_prev_ac_sales_gross * 100) if subcat_prev_ac_sales_gross > 0 else 0
        
        subcategory_detail.append({
            'subcategory_code': subcat_code,
            'subcategory_name': subcat_data['subcategory_name'],
            'net_acp_p': subcat_net_acp_p / 1000,  # 1K HKD
            'ac_sales_gross': subcat_ac_sales_gross / 1000,  # 1K HKD
            'sales_rate': subcat_sales_rate,
            'net_acp_p_yoy': subcat_net_acp_p_yoy,
            'ac_sales_gross_yoy': subcat_ac_sales_gross_yoy  # 누적 판매 YOY
        })
    
    # 입고(net_acp_p) 기준으로 정렬하고 TOP 5만 선택
    subcategory_detail.sort(key=lambda x: x['net_acp_p'], reverse=True)
    subcategory_detail = subcategory_detail[:5]
    
    # 월 이름을 영어로 변환 (10월 -> october)
    month_names = {
        1: 'january', 2: 'february', 3: 'march', 4: 'april', 5: 'may', 6: 'june',
        7: 'july', 8: 'august', 9: 'september', 10: 'october', 11: 'november', 12: 'december'
    }
    month_key = month_names.get(last_month, 'october')
    periods_str = f"{last_year}년 7~{last_month}월" if last_month >= 7 else f"{last_year}년 {last_month}월"
    
    season_sales['current_season_f'] = {
        'season_code': current_season_f_code,
        month_key: {
            'total_net_sales': total_net_sales_october / 1000,  # 1K HKD
            'subcategory_top5': [{'subcategory_code': s['subcategory_code'], 
                                  'subcategory_name': s['subcategory_name'],
                                  'net_sales': s['net_sales'] / 1000} for s in top5_subcategories]
        },
        'accumulated': {
            'total_net_sales': total_net_sales_october / 1000,  # 1K HKD
            'periods': periods_str,
            'net_acp_p': net_acp_p / 1000,  # 1K HKD
            'ac_sales_gross': ac_sales_gross / 1000,  # 1K HKD
            'stock_price': stock_price_f / 1000,  # 1K HKD
            'sales_rate': sales_rate,
            'sales_rate_change': sales_rate_change,
            'net_acp_p_yoy': net_acp_p_yoy,
            'ac_sales_gross_yoy': ac_sales_gross_yoy,
            'subcategory_detail': subcategory_detail
        }
    }
    
    # 전년 시즌 F 데이터
    prev_top5_subcategories = sorted([{'subcategory_code': v['subcategory_code'], 'subcategory_name': v['subcategory_name'], 'net_sales': v['net_sales']} 
                                     for v in prev_subcategory_sales.values()], 
                                    key=lambda x: x['net_sales'], reverse=True)[:5]
    # 전년 10월의 모든 subcategory 데이터 (YOY 계산용)
    prev_subcategory_detail_october = [{'subcategory_code': v['subcategory_code'], 
                                        'subcategory_name': v['subcategory_name'],
                                        'net_sales': v['net_sales'] / 1000}  # 1K HKD
                                       for v in prev_subcategory_sales.values()]
    season_sales['previous_season_f'] = {
        'season_code': prev_season_f_code,
        month_key: {
            'total_net_sales': prev_total_net_sales_october / 1000,  # 1K HKD
            'subcategory_top5': [{'subcategory_code': s['subcategory_code'], 
                                 'subcategory_name': s['subcategory_name'],
                                 'net_sales': s['net_sales'] / 1000} for s in prev_top5_subcategories],
            'subcategory_detail': prev_subcategory_detail_october  # 모든 subcategory 포함
        },
        'accumulated': {
            'total_net_sales': prev_total_net_sales_october / 1000,  # 1K HKD
            'periods': f"{prev_year}년 7~{last_month}월" if last_month >= 7 else f"{prev_year}년 {last_month}월",
            'net_acp_p': prev_net_acp_p / 1000,  # 1K HKD
            'ac_sales_gross': prev_ac_sales_gross / 1000,  # 1K HKD
            'stock_price': sum(float(row['Stock_Price'] or 0) for row in prev_f_data) / TWD_TO_HKD_RATE / 1000,  # 1K HKD
            'sales_rate': prev_sales_rate
        }
    }
    
    # 당시즌 S 의류 (25S) - 참고용
    current_season_s_code = f"{last_year % 100}S"
    prev_season_s_code = f"{prev_year % 100}S"
    
    # 누적 데이터 (25S 1~10월 또는 해당 기간)
    # 주의: CSV의 Net_AcP_P와 AC_Sales_Gross는 이미 누적값이므로 마지막 Period만 사용
    accumulated_s_periods = sorted([p for p in periods if f"{last_year % 100:02d}01" <= p <= last_period])
    accumulated_s_data = [row for row in data 
                         if row['Period'] in accumulated_s_periods
                         and row['Brand'] == 'MLB' 
                         and row['Country'] == 'TW'
                         and row['Season_Code'] == current_season_s_code 
                         and row['Category'] != 'HEA' 
                         and row['Category'] != 'SHO']
    
    # 25S 누적 데이터
    # Net_AcP_P와 AC_Sales_Gross는 누적값이므로 마지막 Period(2510)만 사용
    s_net_acp_p = sum(float(row['Net_AcP_P'] or 0) for row in accumulated_s_data if row['Period'] == last_period) / TWD_TO_HKD_RATE
    s_ac_sales_gross = sum(float(row['AC_Sales_Gross'] or 0) for row in accumulated_s_data if row['Period'] == last_period) / TWD_TO_HKD_RATE
    # Net_Sales는 월별 합산
    s_total_net_sales = sum(float(row['Net_Sales'] or 0) for row in accumulated_s_data) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
    
    # 전년 누적 데이터 (24S) - 전년 Period 사용
    prev_accumulated_s_periods = sorted([p for p in periods if f"{prev_year % 100:02d}01" <= p <= prev_period])
    prev_accumulated_s_data = [row for row in data 
                              if row['Period'] in prev_accumulated_s_periods
                              and row['Brand'] == 'MLB' 
                              and row['Country'] == 'TW'
                              and row['Season_Code'] == prev_season_s_code 
                              and row['Category'] != 'HEA' 
                              and row['Category'] != 'SHO']
    # Net_AcP_P와 AC_Sales_Gross는 누적값이므로 마지막 Period(2410)만 사용
    prev_s_net_acp_p = sum(float(row['Net_AcP_P'] or 0) for row in prev_accumulated_s_data if row['Period'] == prev_period) / TWD_TO_HKD_RATE
    prev_s_ac_sales_gross = sum(float(row['AC_Sales_Gross'] or 0) for row in prev_accumulated_s_data if row['Period'] == prev_period) / TWD_TO_HKD_RATE
    # Net_Sales는 월별 합산
    prev_s_total_net_sales = sum(float(row['Net_Sales'] or 0) for row in prev_accumulated_s_data) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
    
    season_sales['current_season_s'] = {
        'season_code': current_season_s_code,
        'accumulated': {
            'total_net_sales': s_total_net_sales / 1000,  # 1K HKD
            'net_acp_p': s_net_acp_p / 1000,  # 1K HKD
            'ac_sales_gross': s_ac_sales_gross / 1000,  # 1K HKD
        }
    }
    
    season_sales['previous_season_s'] = {
        'season_code': prev_season_s_code,
        'accumulated': {
            'total_net_sales': prev_s_total_net_sales / 1000,  # 1K HKD
            'net_acp_p': prev_s_net_acp_p / 1000,  # 1K HKD
            'ac_sales_gross': prev_s_ac_sales_gross / 1000,  # 1K HKD
        }
    }
    
    # ========================================
    # acc_stock_summary 생성 (ACC 재고주수)
    # ========================================
    print("acc_stock_summary 데이터 생성 중...")
    acc_stock_summary = {'total': {}, 'by_category': {}, 'october_sales': {}}
    
    # N시즌 Category별 재고주수 계산
    recent_6m_periods = sorted([p for p in periods if p <= last_period])[-6:]
    prev_recent_6m_periods = sorted([p for p in periods if p <= prev_period])[-6:]
    
    total_stock_weeks_current = 0
    total_stock_weeks_previous = 0
    total_categories = 0
    
    for category in category_summary:
        cat_data = category_summary[category]
        category_name = cat_data['category_name']
        
        # 최근 6개월 매출 (Gross_Sales 기준)
        gross_sales_6m = 0
        for period in recent_6m_periods:
            period_data = [row for row in data 
                          if row['Period'] == period 
                          and row['Brand'] == 'MLB'
                          and row['Country'] == 'TW'
                          and row['Category'] == category
                          and row['Season_Code'].endswith('N')]
            gross_sales_6m += sum(float(row['Gross_Sales'] or 0) for row in period_data) / TWD_TO_HKD_RATE
        
        # 전년 최근 6개월 매출
        prev_gross_sales_6m = 0
        for period in prev_recent_6m_periods:
            period_data = [row for row in data 
                          if row['Period'] == period 
                          and row['Brand'] == 'MLB'
                          and row['Country'] == 'TW'
                          and row['Category'] == category
                          and row['Season_Code'].endswith('N')]
            prev_gross_sales_6m += sum(float(row['Gross_Sales'] or 0) for row in period_data) / TWD_TO_HKD_RATE
        
        stock_price = cat_data['current']['stock_price']
        prev_stock_price = sum(float(row['Stock_Price'] or 0) for row in prev_data 
                              if row['Category'] == category and row['Season_Code'].endswith('N')) / TWD_TO_HKD_RATE
        
        # 재고주수 계산 (주 단위)
        stock_weeks = (stock_price / (gross_sales_6m / 26)) if gross_sales_6m > 0 else 0  # 6개월 = 26주
        prev_stock_weeks = (prev_stock_price / (prev_gross_sales_6m / 26)) if prev_gross_sales_6m > 0 else 0
        stock_weeks_change = stock_weeks - prev_stock_weeks
        
        acc_stock_summary['by_category'][category] = {
            'category': category,
            'category_name': category_name,
            'current': {
                'stock_price': stock_price / 1000,  # 1K HKD
                'gross_sales_6m': gross_sales_6m / 1000,  # 1K HKD
                'stock_weeks': stock_weeks
            },
            'previous': {
                'stock_price': prev_stock_price / 1000,  # 1K HKD
                'gross_sales_6m': prev_gross_sales_6m / 1000,  # 1K HKD
                'stock_weeks': prev_stock_weeks
            },
            'stock_weeks_change': stock_weeks_change
        }
        
        if stock_weeks > 0:
            total_stock_weeks_current += stock_weeks
            total_categories += 1
        if prev_stock_weeks > 0:
            total_stock_weeks_previous += prev_stock_weeks
    
    # 전체 평균 재고주수
    avg_stock_weeks_current = total_stock_weeks_current / total_categories if total_categories > 0 else 0
    avg_stock_weeks_previous = total_stock_weeks_previous / len([c for c in acc_stock_summary['by_category'].values() if c['previous']['stock_weeks'] > 0]) if len([c for c in acc_stock_summary['by_category'].values() if c['previous']['stock_weeks'] > 0]) > 0 else 0
    
    acc_stock_summary['total'] = {
        'current': {
            'stock_weeks': avg_stock_weeks_current
        },
        'previous': {
            'stock_weeks': avg_stock_weeks_previous
        },
        'stock_weeks_change': avg_stock_weeks_current - avg_stock_weeks_previous
    }
    
    # 10월 판매 데이터 (ACC 카테고리는 N시즌 데이터 사용)
    for category in category_summary:
        category_name = category_summary[category]['category_name']
        # ACC 카테고리(HEA, SHO, BAG 등)는 N시즌 데이터 사용
        # 의류 카테고리는 current_f_data 사용
        if category in ['HEA', 'SHO', 'BAG', 'ATC', 'WTC', 'BOT']:
            # N시즌 데이터에서 해당 카테고리의 10월 판매 합계
            october_sales = sum(float(row['Net_Sales'] or 0) for row in current_data 
                               if row['Category'] == category 
                               and row['Season_Code'].endswith('N')) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
            prev_october_sales = sum(float(row['Net_Sales'] or 0) for row in prev_data 
                                    if row['Category'] == category 
                                    and row['Season_Code'].endswith('N')) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        else:
            # 의류 카테고리는 current_f_data 사용
            october_sales = sum(float(row['Net_Sales'] or 0) for row in current_f_data 
                               if row['Category'] == category) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
            prev_october_sales = sum(float(row['Net_Sales'] or 0) for row in prev_f_data 
                                    if row['Category'] == category) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # V- 적용
        yoy = (october_sales / prev_october_sales * 100) if prev_october_sales > 0 else 0
        
        acc_stock_summary['october_sales'][category] = {
            'category': category,
            'category_name': category_name,
            'net_sales': october_sales / 1000,  # 1K HKD
            'yoy': yoy
        }
    
    # ========================================
    # ending_inventory 생성 (기말재고)
    # ========================================
    print("ending_inventory 데이터 생성 중...")
    ending_inventory = {'total': {}, 'by_season': {}, 'acc_by_category': {}, 'past_season_fw': {}}
    
    # 전체 기말재고
    total_stock_current = sum(float(row['Stock_Price'] or 0) for row in current_data) / TWD_TO_HKD_RATE
    total_stock_previous = sum(float(row['Stock_Price'] or 0) for row in prev_data) / TWD_TO_HKD_RATE
    total_stock_yoy = (total_stock_current / total_stock_previous * 100) if total_stock_previous > 0 else 0
    
    ending_inventory['total'] = {
        'current': total_stock_current / 1000,  # 1K HKD
        'previous': total_stock_previous / 1000,  # 1K HKD
        'yoy': total_stock_yoy
    }
    
    # 시즌별 기말재고 (시즌 타입별로 합산)
    season_types_map = {
        '과시즌F': '과시즌_FW',
        '과시즌S': '과시즌_SS',
        '당시즌S': '당시즌_SS',
        '당시즌F': '당시즌_의류'
    }
    
    # 시즌 타입별로 재고 합산
    season_stock_aggregated = {}
    for season_key, season_data in season_summary.items():
        season_type = season_data['season_type']
        season_code = season_data['season_code']
        
        # 25S는 당시즌 SS로 표시 (10월이지만 당시즌으로 표시)
        if season_code == f"{last_year % 100}S" and season_type == '과시즌S':
            # 25S를 당시즌 SS로 매핑
            key = '당시즌_SS'
            if key not in season_stock_aggregated:
                season_stock_aggregated[key] = {
                    'season_type': '당시즌S',
                    'current': 0,
                    'previous': 0
                }
            season_stock_aggregated[key]['current'] += season_data['current'].get('stock_price', 0)
            season_stock_aggregated[key]['previous'] += season_data['previous'].get('stock_price', 0)
        # 전년 24S도 당시즌 SS로 매핑 (전년 10월에는 24S가 당시즌이었음)
        elif season_code == f"{prev_year % 100}S" and season_type == '과시즌S':
            # 24S를 당시즌 SS의 previous로 매핑
            key = '당시즌_SS'
            if key not in season_stock_aggregated:
                season_stock_aggregated[key] = {
                    'season_type': '당시즌S',
                    'current': 0,
                    'previous': 0
                }
            season_stock_aggregated[key]['previous'] += season_data['previous'].get('stock_price', 0)
        # 전년 24F도 당시즌 의류로 매핑 (전년 10월에는 24F가 당시즌이었음)
        elif season_code == f"{prev_year % 100}F" and season_type == '과시즌F':
            # 24F를 당시즌 의류의 previous로 매핑
            key = '당시즌_의류'
            if key not in season_stock_aggregated:
                season_stock_aggregated[key] = {
                    'season_type': '당시즌F',
                    'current': 0,
                    'previous': 0
                }
            season_stock_aggregated[key]['previous'] += season_data['previous'].get('stock_price', 0)
        elif season_type in season_types_map:
            key = season_types_map[season_type]
            if key not in season_stock_aggregated:
                season_stock_aggregated[key] = {
                    'season_type': season_type,
                    'current': 0,
                    'previous': 0
                }
            season_stock_aggregated[key]['current'] += season_data['current'].get('stock_price', 0)
            season_stock_aggregated[key]['previous'] += season_data['previous'].get('stock_price', 0)
    
    # ending_inventory.by_season 생성
    for key, aggregated in season_stock_aggregated.items():
        stock_current = aggregated['current']
        stock_previous = aggregated['previous']
        stock_yoy = (stock_current / stock_previous * 100) if stock_previous > 0 else 0
        
        ending_inventory['by_season'][key] = {
            'season_type': aggregated['season_type'],
            'current': {
                'stock_price': stock_current / 1000  # 1K HKD
            },
            'previous': {
                'stock_price': stock_previous / 1000  # 1K HKD
            },
            'yoy': stock_yoy
        }
    
    # 카테고리별 기말재고
    for category in category_summary:
        category_name = category_summary[category]['category_name']
        stock_current = sum(float(row['Stock_Price'] or 0) for row in current_data 
                           if row['Category'] == category) / TWD_TO_HKD_RATE
        stock_previous = sum(float(row['Stock_Price'] or 0) for row in prev_data 
                            if row['Category'] == category) / TWD_TO_HKD_RATE
        stock_yoy = (stock_current / stock_previous * 100) if stock_previous > 0 else 0
        
        ending_inventory['acc_by_category'][category] = {
            'category': category,
            'category_name': category_name,
            'current': {
                'stock_price': stock_current / 1000  # 1K HKD
            },
            'previous': {
                'stock_price': stock_previous / 1000  # 1K HKD
            },
            'yoy': stock_yoy
        }
    
    # 과시즌 FW 재고 (년차별)
    past_season_fw_data = [row for row in current_data 
                          if row['Season_Code'].endswith('F') and int(row['Season_Code'][:2]) < last_year % 100]
    past_season_fw_total = sum(float(row['Stock_Price'] or 0) for row in past_season_fw_data) / TWD_TO_HKD_RATE
    prev_past_season_fw_data = [row for row in prev_data 
                               if row['Season_Code'].endswith('F') and int(row['Season_Code'][:2]) < prev_year % 100]
    prev_past_season_fw_total = sum(float(row['Stock_Price'] or 0) for row in prev_past_season_fw_data) / TWD_TO_HKD_RATE
    past_season_fw_yoy = (past_season_fw_total / prev_past_season_fw_total * 100) if prev_past_season_fw_total > 0 else 0
    
    # 년차별 분류 (1년차: 24FW, 2년차: 23FW, 3년차 이상: 22FW~)
    by_year_current = {}
    by_year_previous = {}
    
    # 현재 데이터 년차별 집계
    for row in past_season_fw_data:
        season_code = row['Season_Code']
        if season_code.endswith('F'):
            season_year = int(season_code[:2])
            years_ago = last_year % 100 - season_year
            if years_ago == 1:
                year_key = '1년차'
            elif years_ago == 2:
                year_key = '2년차'
            elif years_ago >= 3:
                year_key = '3년차 이상'
            else:
                continue
            
            if year_key not in by_year_current:
                by_year_current[year_key] = 0
            by_year_current[year_key] += float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
    
    # 전년 데이터 년차별 집계
    for row in prev_past_season_fw_data:
        season_code = row['Season_Code']
        if season_code.endswith('F'):
            season_year = int(season_code[:2])
            years_ago = prev_year % 100 - season_year
            if years_ago == 1:
                year_key = '1년차'
            elif years_ago == 2:
                year_key = '2년차'
            elif years_ago >= 3:
                year_key = '3년차 이상'
            else:
                continue
            
            if year_key not in by_year_previous:
                by_year_previous[year_key] = 0
            by_year_previous[year_key] += float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
    
    # by_year 구조 생성
    by_year = {}
    all_year_keys = set(list(by_year_current.keys()) + list(by_year_previous.keys()))
    for year_key in all_year_keys:
        current_stock = by_year_current.get(year_key, 0) / 1000  # 1K HKD
        previous_stock = by_year_previous.get(year_key, 0) / 1000  # 1K HKD
        stock_yoy = (current_stock / previous_stock * 100) if previous_stock > 0 else 0
        
        by_year[year_key] = {
            'current': {
                'stock_price': current_stock
            },
            'previous': {
                'stock_price': previous_stock
            },
            'yoy': stock_yoy
        }
    
    # 1년차(24FW) subcategory별 집계 (재고금액 높은순 top5)
    if '1년차' in by_year:
        # 현재 데이터에서 1년차(24FW) subcategory별 집계
        year1_subcategory_current = defaultdict(lambda: {'stock_price': 0, 'subcategory_code': '', 'subcategory_name': ''})
        for row in past_season_fw_data:
            season_code = row['Season_Code']
            if season_code.endswith('F'):
                season_year = int(season_code[:2])
                years_ago = last_year % 100 - season_year
                if years_ago == 1:  # 1년차 (24FW)
                    subcat_code = row['Subcategory_Code'].strip()
                    subcat_name = row['Subcategory'].strip()
                    stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE  # V- 적용 안 함 (택재고)
                    year1_subcategory_current[subcat_code]['subcategory_code'] = subcat_code
                    year1_subcategory_current[subcat_code]['subcategory_name'] = subcat_name
                    year1_subcategory_current[subcat_code]['stock_price'] += stock_price
        
        # 전년 데이터에서 1년차(23FW) subcategory별 집계
        # 전년 기준으로 1년차는 23FW (prev_year=24, season_year=23)
        year1_subcategory_previous = defaultdict(lambda: {'stock_price': 0, 'subcategory_code': '', 'subcategory_name': ''})
        for row in prev_past_season_fw_data:
            season_code = row['Season_Code']
            if season_code.endswith('F'):
                season_year = int(season_code[:2])
                # 전년 기준으로 1년차는 23FW (prev_year=24, season_year=23)
                # 현재 기준으로 1년차는 24FW (last_year=25, season_year=24)
                # 따라서 전년 데이터에서 1년차를 찾을 때는 season_year == 23
                if season_year == 23:  # 전년 기준 1년차 (23FW)
                    subcat_code = row['Subcategory_Code'].strip()
                    subcat_name = row['Subcategory'].strip()
                    stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE  # V- 적용 안 함 (택재고)
                    year1_subcategory_previous[subcat_code]['subcategory_code'] = subcat_code
                    year1_subcategory_previous[subcat_code]['subcategory_name'] = subcat_name
                    year1_subcategory_previous[subcat_code]['stock_price'] += stock_price
        
        # Top 5 정렬 (재고금액 높은순)
        year1_subcategory_list = []
        for subcat_code, subcat_data in year1_subcategory_current.items():
            current_stock = subcat_data['stock_price'] / 1000  # 1K HKD
            prev_data = year1_subcategory_previous.get(subcat_code, {})
            previous_stock = prev_data.get('stock_price', 0) / 1000  # 1K HKD
            stock_yoy = (current_stock / previous_stock * 100) if previous_stock > 0 else 0
            
            year1_subcategory_list.append({
                'subcategory_code': subcat_code,
                'subcategory_name': subcat_data['subcategory_name'],
                'stock_price': current_stock,
                'yoy': stock_yoy
            })
        
        # 재고금액 높은순으로 정렬하고 top 7 선택 (JP, DJ 포함)
        year1_subcategory_list.sort(key=lambda x: x['stock_price'], reverse=True)
        # Top7로 확장 (JP, DJ 포함)
        by_year['1년차']['subcategory_top5'] = year1_subcategory_list[:7]
        
        # Top7를 제외한 나머지 합계 계산 및 상세 내역
        top7_codes = {item['subcategory_code'] for item in year1_subcategory_list[:7]}
        others_list = [item for item in year1_subcategory_list if item['subcategory_code'] not in top7_codes]
        others_list.sort(key=lambda x: x['stock_price'], reverse=True)  # 재고금액 큰 순으로 정렬
        others_current = sum(item['stock_price'] for item in others_list)
        others_previous = sum(year1_subcategory_previous.get(subcat_code, {}).get('stock_price', 0) / 1000 
                             for subcat_code, subcat_data in year1_subcategory_current.items() 
                             if subcat_code not in top7_codes)
        others_yoy = (others_current / others_previous * 100) if others_previous > 0 else 0
        by_year['1년차']['others'] = {
            'stock_price': others_current,
            'yoy': others_yoy,
            'subcategory_top5': others_list[:5]  # 기타 항목 중 재고금액 큰 순으로 5개
        }
    
    # 2년차(23FW) subcategory별 집계 (재고금액 높은순 top5)
    if '2년차' in by_year:
        # 현재 데이터에서 2년차(23FW) subcategory별 집계
        year2_subcategory_current = defaultdict(lambda: {'stock_price': 0, 'subcategory_code': '', 'subcategory_name': ''})
        for row in past_season_fw_data:
            season_code = row['Season_Code']
            if season_code.endswith('F'):
                season_year = int(season_code[:2])
                years_ago = last_year % 100 - season_year
                if years_ago == 2:  # 2년차 (23FW)
                    subcat_code = row['Subcategory_Code'].strip()
                    subcat_name = row['Subcategory'].strip()
                    stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE  # V- 적용 안 함 (택재고)
                    year2_subcategory_current[subcat_code]['subcategory_code'] = subcat_code
                    year2_subcategory_current[subcat_code]['subcategory_name'] = subcat_name
                    year2_subcategory_current[subcat_code]['stock_price'] += stock_price
        
        # 전년 데이터에서 2년차(22FW) subcategory별 집계
        # 전년 기준으로 2년차는 22FW (prev_year=24, season_year=22)
        year2_subcategory_previous = defaultdict(lambda: {'stock_price': 0, 'subcategory_code': '', 'subcategory_name': ''})
        for row in prev_past_season_fw_data:
            season_code = row['Season_Code']
            if season_code.endswith('F'):
                season_year = int(season_code[:2])
                # 전년 기준으로 2년차는 22FW (prev_year=24, season_year=22)
                # 현재 기준으로 2년차는 23FW (last_year=25, season_year=23)
                # 따라서 전년 데이터에서 2년차를 찾을 때는 season_year == 22
                if season_year == 22:  # 전년 기준 2년차 (22FW)
                    subcat_code = row['Subcategory_Code'].strip()
                    subcat_name = row['Subcategory'].strip()
                    stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE  # V- 적용 안 함 (택재고)
                    year2_subcategory_previous[subcat_code]['subcategory_code'] = subcat_code
                    year2_subcategory_previous[subcat_code]['subcategory_name'] = subcat_name
                    year2_subcategory_previous[subcat_code]['stock_price'] += stock_price
        
        # Top 5 정렬 (재고금액 높은순)
        year2_subcategory_list = []
        for subcat_code, subcat_data in year2_subcategory_current.items():
            current_stock = subcat_data['stock_price'] / 1000  # 1K HKD
            prev_data = year2_subcategory_previous.get(subcat_code, {})
            previous_stock = prev_data.get('stock_price', 0) / 1000  # 1K HKD
            stock_yoy = (current_stock / previous_stock * 100) if previous_stock > 0 else 0
            
            year2_subcategory_list.append({
                'subcategory_code': subcat_code,
                'subcategory_name': subcat_data['subcategory_name'],
                'stock_price': current_stock,
                'yoy': stock_yoy
            })
        
        # 재고금액 높은순으로 정렬하고 top 7 선택
        year2_subcategory_list.sort(key=lambda x: x['stock_price'], reverse=True)
        # Top7로 확장
        by_year['2년차']['subcategory_top5'] = year2_subcategory_list[:7]
        
        # Top7를 제외한 나머지 합계 계산 및 상세 내역
        top7_codes = {item['subcategory_code'] for item in year2_subcategory_list[:7]}
        others_list = [item for item in year2_subcategory_list if item['subcategory_code'] not in top7_codes]
        others_list.sort(key=lambda x: x['stock_price'], reverse=True)  # 재고금액 큰 순으로 정렬
        others_current = sum(item['stock_price'] for item in others_list)
        others_previous = sum(year2_subcategory_previous.get(subcat_code, {}).get('stock_price', 0) / 1000 
                             for subcat_code, subcat_data in year2_subcategory_current.items() 
                             if subcat_code not in top7_codes)
        others_yoy = (others_current / others_previous * 100) if others_previous > 0 else 0
        by_year['2년차']['others'] = {
            'stock_price': others_current,
            'yoy': others_yoy,
            'subcategory_top5': others_list[:5]  # 기타 항목 중 재고금액 큰 순으로 5개
        }
    
    ending_inventory['past_season_fw'] = {
        'total': {
            'current': past_season_fw_total / 1000,  # 1K HKD
            'previous': prev_past_season_fw_total / 1000,  # 1K HKD
            'yoy': past_season_fw_yoy
        },
        'by_year': by_year
    }
    
    # past_season_sales 생성 (과시즌 판매 데이터)
    print("past_season_sales 데이터 생성 중...")
    # prev_data를 로컬 변수로 저장 (다른 곳에서 재정의될 수 있으므로)
    prev_data_for_sales = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
    current_data_for_sales = [row for row in data if row['Period'] == last_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
    past_season_sales_by_year = {
        '1년차': {
            'current': {'gross_sales': 0},
            'previous': {'gross_sales': 0},
        },
        '2년차': {
            'current': {'gross_sales': 0},
            'previous': {'gross_sales': 0},
        },
        '3년차_이상': {
            'current': {'gross_sales': 0},
            'previous': {'gross_sales': 0},
        },
    }
    past_season_sales_ss = {
        'current': {'gross_sales': 0},
        'previous': {'gross_sales': 0},
    }
    
    # 현재 시즌 코드 계산
    current_season_f = f"{last_year % 100:02d}F"
    current_season_s = f"{last_year % 100:02d}S"
    previous_season_f = f"{prev_year % 100:02d}F"
    previous_season_s = f"{prev_year % 100:02d}S"
    prev_prev_season_f = f"{(prev_year - 1) % 100:02d}F" if prev_year > 0 else None
    prev_prev_prev_season_f = f"{(prev_year - 2) % 100:02d}F" if prev_year > 1 else None
    
    # 현재 Period 과시즌 판매 계산
    current_fw_count = 0
    current_ss_count = 0
    current_season_codes = {}
    
    for row in current_data_for_sales:
        season_code = row.get('Season_Code', '')
        if season_code:
            current_season_codes[season_code] = current_season_codes.get(season_code, 0) + 1
        gross_sales = float(row.get('Gross_Sales', 0) or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # TWD → HKD, V- 적용
        
        if season_code.endswith('F') and season_code != current_season_f:
            # 과시즌F
            if len(season_code) >= 2:
                try:
                    season_year = int(season_code[:2])
                    year_diff = last_year % 100 - season_year
                    
                    if season_code == previous_season_f:  # 24F (1년차)
                        past_season_sales_by_year['1년차']['current']['gross_sales'] += gross_sales
                        current_fw_count += 1
                    elif prev_prev_season_f and season_code == prev_prev_season_f:  # 23F (2년차)
                        past_season_sales_by_year['2년차']['current']['gross_sales'] += gross_sales
                        current_fw_count += 1
                    elif season_year < prev_year % 100 - 1:  # 22F 이하 (3년차 이상)
                        past_season_sales_by_year['3년차_이상']['current']['gross_sales'] += gross_sales
                        current_fw_count += 1
                except ValueError:
                    continue
        elif season_code.endswith('S') and season_code != current_season_s:
            # 과시즌S
            past_season_sales_ss['current']['gross_sales'] += gross_sales
            current_ss_count += 1
    
    print(f"현재 Period 과시즌 판매 계산:")
    print(f"  현재 Period 당시즌: {current_season_f}, {current_season_s}")
    print(f"  현재 Period 기준 1년차: {previous_season_f}")
    print(f"  현재 Period 기준 2년차: {prev_prev_season_f}")
    print(f"  현재 Period 데이터의 시즌 코드 분포:")
    for sc, count in sorted(current_season_codes.items()):
        print(f"    {sc}: {count}건")
    print(f"  현재 Period 과시즌F 데이터 건수: {current_fw_count}")
    print(f"  현재 Period 과시즌S 데이터 건수: {current_ss_count}")
    print(f"  현재 Period 1년차 판매: {past_season_sales_by_year['1년차']['current']['gross_sales']:.2f} HKD")
    print(f"  현재 Period 2년차 판매: {past_season_sales_by_year['2년차']['current']['gross_sales']:.2f} HKD")
    print(f"  현재 Period 3년차 이상 판매: {past_season_sales_by_year['3년차_이상']['current']['gross_sales']:.2f} HKD")
    print(f"  현재 Period 과시즌S 판매: {past_season_sales_ss['current']['gross_sales']:.2f} HKD")
    
    # 전년 동월 과시즌 판매 계산
    # 전년 동월 기준으로 시즌 코드 재계산
    prev_year_for_prev_period = prev_year  # 2024
    prev_prev_year_for_prev_period = prev_year - 1  # 2023
    prev_prev_prev_year_for_prev_period = prev_year - 2  # 2022
    prev_period_previous_season_f = f"{prev_year_for_prev_period % 100:02d}F"  # 24F (전년 동월의 당시즌)
    prev_period_previous_season_s = f"{prev_year_for_prev_period % 100:02d}S"  # 24S (전년 동월의 당시즌)
    prev_period_prev_prev_season_f = f"{prev_prev_year_for_prev_period % 100:02d}F" if prev_prev_year_for_prev_period > 0 else None  # 23F (전년 동월 기준 1년차)
    prev_period_prev_prev_prev_season_f = f"{prev_prev_prev_year_for_prev_period % 100:02d}F" if prev_prev_prev_year_for_prev_period > 0 else None  # 22F (전년 동월 기준 2년차)
    
    print(f"전년 동월 과시즌 판매 계산:")
    print(f"  전년 동월 당시즌: {prev_period_previous_season_f}, {prev_period_previous_season_s}")
    print(f"  전년 동월 기준 1년차: {prev_period_prev_prev_season_f}")
    print(f"  전년 동월 기준 2년차: {prev_period_prev_prev_prev_season_f}")
    print(f"  전년 동월 데이터 건수: {len(prev_data)}건")
    
    # 전년 동월 데이터의 시즌 코드 확인
    prev_season_codes = {}
    prev_gross_sales_by_season = {}
    for row in prev_data:
        sc = row.get('Season_Code', '')
        gross_sales = float(row.get('Gross_Sales', 0) or 0)
        if sc:
            prev_season_codes[sc] = prev_season_codes.get(sc, 0) + 1
            if gross_sales > 0:
                if sc not in prev_gross_sales_by_season:
                    prev_gross_sales_by_season[sc] = 0
                prev_gross_sales_by_season[sc] += gross_sales
    print(f"  전년 동월 데이터의 시즌 코드 분포:")
    if prev_season_codes:
        for sc, count in sorted(prev_season_codes.items()):
            gross = prev_gross_sales_by_season.get(sc, 0)
            print(f"    {sc}: {count}건 (Gross_Sales 합계: {gross:.2f})")
    else:
        print(f"    (시즌 코드 없음)")
    
    prev_fw_count = 0
    prev_ss_count = 0
    
    for row in prev_data_for_sales:
        season_code = row.get('Season_Code', '')
        gross_sales = float(row.get('Gross_Sales', 0) or 0) / TWD_TO_HKD_RATE / VAT_EXCLUSION_RATE  # TWD → HKD, V- 적용
        
        if season_code.endswith('F') and season_code != prev_period_previous_season_f:
            # 과시즌F (전년 동월 기준)
            if len(season_code) >= 2:
                try:
                    season_year = int(season_code[:2])
                    # 전년 동월 기준으로 시즌별 분류
                    if prev_period_prev_prev_season_f and season_code == prev_period_prev_prev_season_f:  # 23F (전년 동월 기준 1년차)
                        past_season_sales_by_year['1년차']['previous']['gross_sales'] += gross_sales
                        prev_fw_count += 1
                    elif prev_period_prev_prev_prev_season_f and season_code == prev_period_prev_prev_prev_season_f:  # 22F (전년 동월 기준 2년차)
                        past_season_sales_by_year['2년차']['previous']['gross_sales'] += gross_sales
                        prev_fw_count += 1
                    elif season_year < prev_year_for_prev_period % 100 - 2:  # 21F 이하 (전년 동월 기준 3년차 이상)
                        past_season_sales_by_year['3년차_이상']['previous']['gross_sales'] += gross_sales
                        prev_fw_count += 1
                except ValueError:
                    continue
        elif season_code.endswith('S') and season_code != prev_period_previous_season_s:
            # 과시즌S (전년 동월 기준)
            past_season_sales_ss['previous']['gross_sales'] += gross_sales
            prev_ss_count += 1
    
    print(f"  전년 동월 과시즌F 데이터 건수: {prev_fw_count}")
    print(f"  전년 동월 과시즌S 데이터 건수: {prev_ss_count}")
    print(f"  전년 동월 1년차 판매: {past_season_sales_by_year['1년차']['previous']['gross_sales']:.2f} HKD")
    print(f"  전년 동월 2년차 판매: {past_season_sales_by_year['2년차']['previous']['gross_sales']:.2f} HKD")
    print(f"  전년 동월 3년차 이상 판매: {past_season_sales_by_year['3년차_이상']['previous']['gross_sales']:.2f} HKD")
    print(f"  전년 동월 과시즌S 판매: {past_season_sales_ss['previous']['gross_sales']:.2f} HKD")
    
    # YOY 및 증감 계산
    for year_key in past_season_sales_by_year:
        year_data = past_season_sales_by_year[year_key]
        if year_data['previous']['gross_sales'] > 0:
            year_data['yoy'] = (year_data['current']['gross_sales'] / year_data['previous']['gross_sales']) * 100
        else:
            year_data['yoy'] = 999 if year_data['current']['gross_sales'] > 0 else 0
        year_data['change'] = year_data['current']['gross_sales'] - year_data['previous']['gross_sales']
    
    if past_season_sales_ss['previous']['gross_sales'] > 0:
        past_season_sales_ss['yoy'] = (past_season_sales_ss['current']['gross_sales'] / past_season_sales_ss['previous']['gross_sales']) * 100
    else:
        past_season_sales_ss['yoy'] = 999 if past_season_sales_ss['current']['gross_sales'] > 0 else 0
    
    # ending_inventory에 past_season_sales 추가
    ending_inventory['past_season_sales'] = {
        'fw': {
            'by_year': {
                '1년차': {
                    'current': past_season_sales_by_year['1년차']['current']['gross_sales'] / 1000,  # 1K HKD
                    'previous': past_season_sales_by_year['1년차']['previous']['gross_sales'] / 1000,  # 1K HKD
                    'yoy': past_season_sales_by_year['1년차'].get('yoy', 0),
                    'change': past_season_sales_by_year['1년차'].get('change', 0) / 1000,  # 1K HKD
                },
                '2년차': {
                    'current': past_season_sales_by_year['2년차']['current']['gross_sales'] / 1000,  # 1K HKD
                    'previous': past_season_sales_by_year['2년차']['previous']['gross_sales'] / 1000,  # 1K HKD
                    'yoy': past_season_sales_by_year['2년차'].get('yoy', 0),
                    'change': past_season_sales_by_year['2년차'].get('change', 0) / 1000,  # 1K HKD
                },
                '3년차_이상': {
                    'current': past_season_sales_by_year['3년차_이상']['current']['gross_sales'] / 1000,  # 1K HKD
                    'previous': past_season_sales_by_year['3년차_이상']['previous']['gross_sales'] / 1000,  # 1K HKD
                    'yoy': past_season_sales_by_year['3년차_이상'].get('yoy', 0),
                    'change': past_season_sales_by_year['3년차_이상'].get('change', 0) / 1000,  # 1K HKD
                },
            },
        },
        'ss': {
            'current': past_season_sales_ss['current']['gross_sales'] / 1000,  # 1K HKD
            'previous': past_season_sales_ss['previous']['gross_sales'] / 1000,  # 1K HKD
            'yoy': past_season_sales_ss.get('yoy', 0),
        },
    }
    
    # monthly_inventory_data 생성
    print("monthly_inventory_data 생성 중...")
    monthly_inventory_data = []
    monthly_inventory_yoy = {
        'F당시즌': [],
        'S당시즌': [],
        '과시즌FW': [],
        '과시즌SS': [],
        '모자': [],
        '신발': [],
        '가방외': []
    }
    
    for period in recent_periods:
        period_rows = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
        p_year, p_month = parse_period(period)
        
        if not p_year or not p_month:
            continue
        
        # 아이템별 재고 집계
        inv_items = {}
        for key in ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외']:
            inv_items[key] = {'stock_price': 0, 'stock_weeks': 0}
        
        for row in period_rows:
            cat = row.get('Category', '')
            sc = row.get('Season_Code', '')
            item = get_item_from_category_and_season(cat, sc, p_year, p_month)
            
            # 대시보드 키로 매핑
            inv_key = None
            if item == '당시즌F':
                inv_key = 'F당시즌'
            elif item == '당시즌S':
                inv_key = 'S당시즌'
            elif item == '과시즌F':
                inv_key = '과시즌FW'
            elif item == '과시즌S':
                inv_key = '과시즌SS'
            elif item in ['모자', '신발', '가방외']:
                inv_key = item
            
            if inv_key:
                stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
                inv_items[inv_key]['stock_price'] += stock_price
        
        # 재고주수 계산은 생략 (복잡하므로 추후 구현)
        
        monthly_inventory_data.append({
            'period': period,
            'F당시즌': {'stock_price': inv_items['F당시즌']['stock_price'] / 1000, 'stock_weeks': 0},
            'S당시즌': {'stock_price': inv_items['S당시즌']['stock_price'] / 1000, 'stock_weeks': 0},
            '과시즌FW': {'stock_price': inv_items['과시즌FW']['stock_price'] / 1000, 'stock_weeks': 0},
            '과시즌SS': {'stock_price': inv_items['과시즌SS']['stock_price'] / 1000, 'stock_weeks': 0},
            '모자': {'stock_price': inv_items['모자']['stock_price'] / 1000, 'stock_weeks': 0},
            '신발': {'stock_price': inv_items['신발']['stock_price'] / 1000, 'stock_weeks': 0},
            '가방외': {'stock_price': inv_items['가방외']['stock_price'] / 1000, 'stock_weeks': 0}
        })
        
        # 전년 동월 대비 YOY 계산
        if p_year and p_month:
            prev_year = p_year - 1
            prev_month = p_month
            prev_period = f"{(prev_year) % 100:02d}{prev_month:02d}"
            prev_period_rows = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB' and row['Country'] == 'TW']
            
            prev_inv_items = {}
            for key in ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외']:
                prev_inv_items[key] = {'stock_price': 0}
            
            for row in prev_period_rows:
                cat = row.get('Category', '')
                sc = row.get('Season_Code', '')
                # YOY 계산 시 전년도 데이터는 전년도 기준으로 분류
                item = get_item_from_category_and_season(cat, sc, prev_year, prev_month)
                
                inv_key = None
                if item == '당시즌F':
                    inv_key = 'F당시즌'
                elif item == '당시즌S':
                    inv_key = 'S당시즌'
                elif item == '과시즌F':
                    inv_key = '과시즌FW'
                elif item == '과시즌S':
                    inv_key = '과시즌SS'
                elif item in ['모자', '신발', '가방외']:
                    inv_key = item
                
                if inv_key:
                    stock_price = float(row['Stock_Price'] or 0) / TWD_TO_HKD_RATE
                    prev_inv_items[inv_key]['stock_price'] += stock_price
            
            # YOY 계산
            for inv_key in ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외']:
                current_stock = inv_items[inv_key]['stock_price']
                prev_stock = prev_inv_items[inv_key]['stock_price']
                yoy = (current_stock / prev_stock * 100) if prev_stock > 0 else 0
                monthly_inventory_yoy[inv_key].append(round(yoy))
    
    # ACC 판매 데이터 계산 (Season_Type = '악세')
    print("ACC 판매 데이터 계산 중...")
    acc_sales_data = {
        'current': {
            'total': {'net_sales': 0, 'gross_sales': 0},
            'categories': {
                '신발': {'net_sales': 0, 'gross_sales': 0},
                '모자': {'net_sales': 0, 'gross_sales': 0},
                '가방': {'net_sales': 0, 'gross_sales': 0},
                '기타ACC': {'net_sales': 0, 'gross_sales': 0}
            }
        },
        'previous': {
            'total': {'net_sales': 0, 'gross_sales': 0},
            'categories': {
                '신발': {'net_sales': 0, 'gross_sales': 0},
                '모자': {'net_sales': 0, 'gross_sales': 0},
                '가방': {'net_sales': 0, 'gross_sales': 0},
                '기타ACC': {'net_sales': 0, 'gross_sales': 0}
            }
        }
    }
    
    # 카테고리 매핑
    category_mapping = {
        'SHO': '신발',
        'HEA': '모자',
        'BAG': '가방',
        'ATC': '기타ACC'
    }
    
    # 당월 ACC 데이터
    for row in data:
        if row['Period'] == last_period and row.get('Season_Type') == '악세' and row.get('Brand') == 'MLB':
            net_sales = float(row['Net_Sales'] or 0) / VAT_EXCLUSION_RATE / TWD_TO_HKD_RATE
            gross_sales = float(row['Gross_Sales'] or 0) / VAT_EXCLUSION_RATE / TWD_TO_HKD_RATE
            
            acc_sales_data['current']['total']['net_sales'] += net_sales
            acc_sales_data['current']['total']['gross_sales'] += gross_sales
            
            # 카테고리별 집계
            category = row.get('Category', '')
            if category in category_mapping:
                korean_cat = category_mapping[category]
                acc_sales_data['current']['categories'][korean_cat]['net_sales'] += net_sales
                acc_sales_data['current']['categories'][korean_cat]['gross_sales'] += gross_sales
    
    # 전년 ACC 데이터
    for row in data:
        if row['Period'] == prev_period and row.get('Season_Type') == '악세' and row.get('Brand') == 'MLB':
            net_sales = float(row['Net_Sales'] or 0) / VAT_EXCLUSION_RATE / TWD_TO_HKD_RATE
            gross_sales = float(row['Gross_Sales'] or 0) / VAT_EXCLUSION_RATE / TWD_TO_HKD_RATE
            
            acc_sales_data['previous']['total']['net_sales'] += net_sales
            acc_sales_data['previous']['total']['gross_sales'] += gross_sales
            
            # 카테고리별 집계
            category = row.get('Category', '')
            if category in category_mapping:
                korean_cat = category_mapping[category]
                acc_sales_data['previous']['categories'][korean_cat]['net_sales'] += net_sales
                acc_sales_data['previous']['categories'][korean_cat]['gross_sales'] += gross_sales
    
    print(f"ACC 당월 합계: {acc_sales_data['current']['total']['net_sales']:.2f} HKD")
    print(f"ACC 전년 합계: {acc_sales_data['previous']['total']['net_sales']:.2f} HKD")
    print(f"ACC 카테고리별 당월:")
    for cat, val in acc_sales_data['current']['categories'].items():
        print(f"  {cat}: {val['net_sales']:.2f} HKD")
    
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
            'total_net_sales': total_net_sales_current / 1000,  # 1K HKD 단위 (TWD에서 환산됨)
            'total_yoy': total_yoy,
            'total_change': total_change / 1000,  # 1K HKD 단위 (TWD에서 환산됨)
            'same_store_yoy': same_store_yoy,
            'same_store_count': same_store_summary['store_count'],
        },
        'country_channel_summary': dict(country_channel_summary),
        'store_summary': dict(store_summary),
        'season_summary': dict(season_summary),
        'category_summary': dict(category_summary),
        'trend_data': [trend_data[p] for p in sorted(trend_data.keys())],
        'monthly_channel_data': monthly_channel_data,
        'monthly_channel_yoy': monthly_channel_yoy,
        'monthly_item_data': monthly_item_data,
        'monthly_item_yoy': monthly_item_yoy,
        'monthly_inventory_data': monthly_inventory_data,
        'monthly_inventory_yoy': monthly_inventory_yoy,
        'offline_store_efficiency': offline_store_efficiency,
        'season_sales': season_sales,
        'acc_stock_summary': acc_stock_summary,
        'ending_inventory': ending_inventory,
        'acc_sales_data': acc_sales_data,
    }
    
    # Period별 파일명 생성
    period = result['metadata']['last_period']
    base_name = os.path.splitext(os.path.basename(output_file_path))[0]
    period_file = f"{base_name}-{period}.json"
    period_output_path = os.path.join(os.path.dirname(output_file_path), period_file)
    
    # JSON 저장 (Period별 파일명)
    print(f"결과 저장 중: {period_output_path}")
    with open(period_output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # 기본 파일명으로도 복사 (최신 Period용)
    shutil.copy2(period_output_path, output_file_path)
    print(f"기본 파일로도 복사: {output_file_path}")
    
    # public/dashboard 폴더에도 복사 (Next.js에서 동적 로드용)
    public_dir = 'public/dashboard'
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
    public_period_file = os.path.join(public_dir, period_file)
    public_default_file = os.path.join(public_dir, os.path.basename(output_file_path))
    shutil.copy2(period_output_path, public_period_file)
    shutil.copy2(period_output_path, public_default_file)
    print(f"public 폴더로 복사 완료: {public_period_file}, {public_default_file}")
    
    print("완료!")
    print(f"  - Store 수: {len(store_summary)}")
    print(f"  - 시즌 수: {len(season_summary)}")
    print(f"  - Category 수: {len(category_summary)}")
    print(f"  - 추세 데이터 포인트: {len(trend_data)}")

if __name__ == '__main__':
    # 2511 데이터 생성 (기존 2510 유지)
    csv_file = '../Dashboard_Raw_Data/TW/2511/TW_Inventory_2511.csv'
    output_file = 'components/dashboard/taiwan-dashboard-data-2511.json'
    print("=" * 80)
    print("대만 대시보드 2511 데이터 생성")
    print("=" * 80)
    print(f"CSV 파일: {csv_file}")
    print(f"출력 파일: {output_file}")
    print(f"환율: {TWD_TO_HKD_RATE}")
    print("=" * 80)
    generate_dashboard_data(csv_file, output_file, target_period='2511')
    print("\n✅ 대만 대시보드 2511 데이터 생성 완료!")

