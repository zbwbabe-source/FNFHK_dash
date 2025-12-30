#!/usr/bin/env python3
"""
대만 재고수불 CSV 데이터를 누적 대시보드용 JSON으로 변환
1월~11월 누적 데이터 생성

참고:
- 대만재고수불.csv는 TWD 단위이므로 HKD로 환산 필요
- 환율은 target_period 기준 환율을 사용
- 부가세 제외: 1.05로 나눔
"""
import csv
import json
import os
from collections import defaultdict
from datetime import datetime
import re

# TWD to HKD 환산환율 (동적으로 변경됨)
TWD_TO_HKD_RATE = 4.03

# V- (부가세 제외) 적용 비율
VAT_EXCLUSION_RATE = 1.05

def read_exchange_rate(csv_dir, period):
    """환율 파일에서 해당 period의 환율 읽기"""
    rate_file = os.path.join(csv_dir, 'TW', period, f'TW_Exchange Rate {period}.csv')
    
    if os.path.exists(rate_file):
        try:
            with open(rate_file, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('period') == period:
                        rate = float(row.get('rate', 4.03))
                        print(f"환율 파일에서 로드: {period} = {rate}")
                        return rate
        except Exception as e:
            print(f"환율 파일 읽기 오류: {e}")
    
    print(f"환율 파일 없음, 기본값 사용: 4.03")
    return 4.03

def is_mlb_retail(store_code):
    """MLB 리테일 (T로 시작하는 숫자)"""
    return bool(re.match(r'^T\d+$', store_code))

def is_mlb_online(store_code):
    """MLB 온라인 (TE로 시작)"""
    return store_code.startswith('TE')

def is_mlb_outlet(store_code):
    """MLB 아울렛 (TU로 시작)"""
    return store_code.startswith('TU')

def get_store_category(store_code):
    """Store Code를 기반으로 카테고리 반환"""
    if is_mlb_outlet(store_code):
        return 'MLB 아울렛'
    elif is_mlb_online(store_code):
        return 'MLB 온라인'
    elif is_mlb_retail(store_code):
        return 'MLB 리테일'
    else:
        return '기타'

def is_online_store(store_code):
    """온라인 매장 여부 판단"""
    return is_mlb_online(store_code)

def get_channel_from_store_code(store_code):
    """채널 반환 (Online, Outlet, Retail)"""
    if is_online_store(store_code):
        return 'Online'
    elif is_mlb_outlet(store_code):
        return 'Outlet'
    else:
        return 'Retail'

def parse_period(period_str):
    """Period 문자열을 년도와 월로 파싱"""
    if len(period_str) == 4:
        year = 2000 + int(period_str[:2])
        month = int(period_str[2:])
        return year, month
    return None, None

def get_season_type(season_code, current_year, current_month):
    """시즌 타입 결정"""
    if season_code.endswith('N'):
        return 'N시즌'
    
    if len(season_code) >= 2:
        season_year = int(season_code[:2])
        season_type = season_code[2]
        
        current_year_2digit = current_year % 100
        
        # 현재 시즌 결정 (홍콩과 동일)
        if current_month >= 1 and current_month <= 6:
            # 1-6월: F시즌이 당시즌
            if season_year == current_year_2digit and season_type == 'F':
                return f'당시즌{season_type}'
        else:
            # 7-12월: S시즌이 당시즌
            if season_year == current_year_2digit and season_type == 'S':
                return f'당시즌{season_type}'
        
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
    """CSV 파일 읽기 (MLB 브랜드만)"""
    data = []
    periods = set()
    
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Brand') == 'MLB':
                data.append(row)
                periods.add(row['Period'])
    
    return data, sorted(periods)

def generate_cumulative_dashboard_data(csv_file_path, output_file_path, target_period='2511'):
    """누적 대시보드용 데이터 생성 (1월~target_period 누적)"""
    global TWD_TO_HKD_RATE
    
    # 환율 동적 로드
    csv_dir = os.path.dirname(os.path.dirname(os.path.dirname(csv_file_path)))
    TWD_TO_HKD_RATE = read_exchange_rate(csv_dir, target_period)
    print(f"=" * 80)
    print(f"환율 설정: 1 TWD = {TWD_TO_HKD_RATE} HKD (period: {target_period})")
    print(f"부가세 제외: ÷ {VAT_EXCLUSION_RATE}")
    print(f"=" * 80)
    
    print("CSV 파일 읽는 중...")
    data, periods = read_csv_data(csv_file_path)
    
    if not periods:
        print("데이터가 없습니다.")
        return
    
    if target_period not in periods:
        print(f"경고: {target_period} Period가 CSV에 없습니다.")
        return
    
    last_year, last_month = parse_period(target_period)
    
    # 누적 기간
    start_period = f"{last_year % 100:02d}01"
    cumulative_periods = sorted([p for p in periods if start_period <= p <= target_period])
    
    # 전년 동기 누적
    prev_year = last_year - 1
    prev_start_period = f"{prev_year % 100:02d}01"
    prev_end_period = f"{prev_year % 100:02d}{last_month:02d}"
    prev_cumulative_periods = sorted([p for p in periods if prev_start_period <= p <= prev_end_period])
    
    print(f"누적 기간: {start_period} ~ {target_period} ({len(cumulative_periods)}개월)")
    print(f"  -> {cumulative_periods}")
    print(f"전년 동기 누적: {prev_start_period} ~ {prev_end_period} ({len(prev_cumulative_periods)}개월)")
    print(f"  -> {prev_cumulative_periods}")
    
    # 데이터 필터링
    current_data = [row for row in data if row['Period'] in cumulative_periods]
    prev_data = [row for row in data if row['Period'] in prev_cumulative_periods]
    
    # 재고는 마지막 월 기준
    last_period_inventory = [row for row in data if row['Period'] == target_period]
    prev_last_inventory = [row for row in data if row['Period'] == prev_end_period]
    
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
    
    # 3. Channel별 집계
    channel_summary = defaultdict(lambda: {
        'channel': '',
        'current': {
            'net_sales': 0,
        },
        'previous': {
            'net_sales': 0,
        },
    })
    
    # 4. 월별 추세 데이터 (누적)
    trend_data = []
    for i, period in enumerate(cumulative_periods, 1):
        ytd_periods = cumulative_periods[:i]
        ytd_data = [row for row in data if row['Period'] in ytd_periods]
        
        ytd_gross = 0
        ytd_net = 0
        ytd_qty = 0
        
        for row in ytd_data:
            gross = float(row['Gross_Sales'] or 0)
            net = float(row['Net_Sales'] or 0)
            qty = float(row['Sales_Qty'] or 0)
            
            # TWD -> HKD 변환 + 부가세 제외
            gross_hkd = (gross / VAT_EXCLUSION_RATE) / TWD_TO_HKD_RATE
            net_hkd = (net / VAT_EXCLUSION_RATE) / TWD_TO_HKD_RATE
            
            ytd_gross += gross_hkd
            ytd_net += net_hkd
            ytd_qty += qty
        
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
        
        if store_code not in store_summary:
            store_summary[store_code]['store_code'] = store_code
            store_summary[store_code]['store_name'] = row['Store_Name']
            store_summary[store_code]['category'] = get_store_category(store_code)
            store_summary[store_code]['brand'] = row['Brand']
            store_summary[store_code]['channel'] = get_channel_from_store_code(store_code)
        
        # TWD -> HKD 변환 + 부가세 제외
        gross_sales = float(row['Gross_Sales'] or 0)
        net_sales = float(row['Net_Sales'] or 0)
        sales_qty = float(row['Sales_Qty'] or 0)
        
        gross_sales_hkd = (gross_sales / VAT_EXCLUSION_RATE) / TWD_TO_HKD_RATE
        net_sales_hkd = (net_sales / VAT_EXCLUSION_RATE) / TWD_TO_HKD_RATE
        
        store_summary[store_code]['current']['gross_sales'] += gross_sales_hkd
        store_summary[store_code]['current']['net_sales'] += net_sales_hkd
        store_summary[store_code]['current']['sales_qty'] += sales_qty
        
        # 시즌별 집계
        season_type = get_season_type(season_code, last_year, last_month)
        season_key = f"{season_code}_{season_type}"
        season_summary[season_key]['season_code'] = season_code
        season_summary[season_key]['season_type'] = season_type
        season_summary[season_key]['current']['gross_sales'] += gross_sales_hkd
        season_summary[season_key]['current']['net_sales'] += net_sales_hkd
        season_summary[season_key]['current']['sales_qty'] += sales_qty
        
        # Channel별 집계
        channel = get_channel_from_store_code(store_code)
        channel_summary[channel]['channel'] = channel
        channel_summary[channel]['current']['net_sales'] += net_sales_hkd
    
    # 마지막 월 재고 추가
    print("마지막 월 재고 데이터 추가 중...")
    for row in last_period_inventory:
        store_code = row['Store_Code']
        
        stock_price = float(row['Stock_Price'] or 0)
        stock_cost = float(row['Stock_Cost'] or 0)
        
        # TWD -> HKD 변환 (재고는 부가세 제외 안함)
        stock_price_hkd = stock_price / TWD_TO_HKD_RATE
        stock_cost_hkd = stock_cost / TWD_TO_HKD_RATE
        
        if store_code in store_summary:
            store_summary[store_code]['current']['stock_price'] += stock_price_hkd
            store_summary[store_code]['current']['stock_cost'] += stock_cost_hkd
    
    # 할인율 계산
    for store_code in store_summary:
        current = store_summary[store_code]['current']
        current['discount_rate'] = calculate_discount_rate(
            current['gross_sales'], current['net_sales']
        )
    
    # 전년 동기 누적 데이터 집계
    print("전년 동기 누적 데이터 집계 중...")
    for row in prev_data:
        store_code = row['Store_Code']
        season_code = row['Season_Code']
        
        gross_sales = float(row['Gross_Sales'] or 0)
        net_sales = float(row['Net_Sales'] or 0)
        sales_qty = float(row['Sales_Qty'] or 0)
        
        # 전년도 데이터도 동일한 환율 적용
        gross_sales_hkd = (gross_sales / VAT_EXCLUSION_RATE) / TWD_TO_HKD_RATE
        net_sales_hkd = (net_sales / VAT_EXCLUSION_RATE) / TWD_TO_HKD_RATE
        
        if store_code in store_summary:
            store_summary[store_code]['previous']['gross_sales'] += gross_sales_hkd
            store_summary[store_code]['previous']['net_sales'] += net_sales_hkd
            store_summary[store_code]['previous']['sales_qty'] += sales_qty
        
        season_type = get_season_type(season_code, prev_year, last_month)
        season_key = f"{season_code}_{season_type}"
        if season_key in season_summary:
            season_summary[season_key]['previous']['gross_sales'] += gross_sales_hkd
            season_summary[season_key]['previous']['net_sales'] += net_sales_hkd
            season_summary[season_key]['previous']['sales_qty'] += sales_qty
        
        # Channel별 집계 (전년)
        channel = get_channel_from_store_code(store_code)
        if channel in channel_summary:
            channel_summary[channel]['previous']['net_sales'] += net_sales_hkd
    
    # 전년 마지막 월 재고
    for row in prev_last_inventory:
        store_code = row['Store_Code']
        
        stock_price = float(row['Stock_Price'] or 0)
        stock_cost = float(row['Stock_Cost'] or 0)
        
        stock_price_hkd = stock_price / TWD_TO_HKD_RATE
        stock_cost_hkd = stock_cost / TWD_TO_HKD_RATE
        
        if store_code in store_summary:
            store_summary[store_code]['previous']['stock_price'] += stock_price_hkd
            store_summary[store_code]['previous']['stock_cost'] += stock_cost_hkd
    
    # 전년 할인율 계산
    for store_code in store_summary:
        previous = store_summary[store_code]['previous']
        previous['discount_rate'] = calculate_discount_rate(
            previous['gross_sales'], previous['net_sales']
        )
    
    # 전체 실판매출 계산
    total_net_sales_current = sum(store['current']['net_sales'] for store in store_summary.values())
    total_net_sales_previous = sum(store['previous']['net_sales'] for store in store_summary.values())
    total_yoy = ((total_net_sales_current - total_net_sales_previous) / total_net_sales_previous * 100) if total_net_sales_previous > 0 else 0
    total_change = total_net_sales_current - total_net_sales_previous
    months_count = len(cumulative_periods)
    
    # 당시즌 판매 및 판매율 계산
    print("당시즌 판매 및 판매율 계산 중...")
    season_sales_summary = {
        'current_season_f': {'sales': 0, 'sales_qty': 0},
        'current_season_s': {'sales': 0, 'sales_qty': 0},
    }
    
    for season_key, season_data in season_summary.items():
        season_type = season_data['season_type']
        current_sales = season_data['current']['net_sales']
        current_qty = season_data['current']['sales_qty']
        
        if season_type == '당시즌F':
            season_sales_summary['current_season_f']['sales'] += current_sales
            season_sales_summary['current_season_f']['sales_qty'] += current_qty
        elif season_type == '당시즌S':
            season_sales_summary['current_season_s']['sales'] += current_sales
            season_sales_summary['current_season_s']['sales_qty'] += current_qty
    
    # 당시즌 판매율 계산 (매출 대비)
    current_season_total_sales = (season_sales_summary['current_season_f']['sales'] + 
                                   season_sales_summary['current_season_s']['sales'])
    
    if total_net_sales_current > 0:
        season_sales_summary['current_season_rate'] = (current_season_total_sales / total_net_sales_current) * 100
    else:
        season_sales_summary['current_season_rate'] = 0
    
    # Channel별 YOY 계산 (HKD 단위 그대로 유지)
    for channel in channel_summary:
        ch = channel_summary[channel]
        if ch['previous']['net_sales'] > 0:
            ch['yoy'] = (ch['current']['net_sales'] / ch['previous']['net_sales']) * 100
        else:
            ch['yoy'] = 0 if ch['current']['net_sales'] == 0 else 999
    
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
            'exchange_rate': TWD_TO_HKD_RATE,
            'vat_exclusion_rate': VAT_EXCLUSION_RATE,
            'generated_at': datetime.now().isoformat(),
        },
        'sales_summary': {
            'total_net_sales': total_net_sales_current / 1000,  # 1K HKD 단위
            'total_yoy': total_yoy,
            'total_change': total_change / 1000,
            'same_store_yoy': 0,  # 추후 계산
            'same_store_count': 0,
        },
        'channel_summary': dict(channel_summary),
        'store_summary': dict(store_summary),
        'season_summary': dict(season_summary),
        'season_sales_summary': season_sales_summary,  # 당시즌 판매 및 판매율
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
    print(f"  - 환율: 1 TWD = {TWD_TO_HKD_RATE} HKD")
    print(f"  - 시즌 수: {len(season_summary)}")
    print(f"  - 추세 데이터 포인트: {len(trend_data)}")

if __name__ == '__main__':
    csv_file = '../Dashboard_Raw_Data/TW/2511/TW_Inventory_2511.csv'
    output_file = 'public/dashboard/taiwan-dashboard-cumulative-2511.json'
    
    # 2511 (2025년 1월~11월) 누적 데이터 생성
    generate_cumulative_dashboard_data(csv_file, output_file, target_period='2511')

