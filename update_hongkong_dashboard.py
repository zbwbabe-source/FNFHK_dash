#!/usr/bin/env python3
"""
홍콩 재고수불 CSV 파일을 업데이트하고 대시보드 데이터 생성
- 새로운 CSV 파일을 추가하면 자동으로 통합
- 최신 Period를 자동 감지하여 전년 동월과 비교
"""
import csv
import json
import os
import glob
from collections import defaultdict
from datetime import datetime
import sys

# Store Code 분류
OUTLET_CODES = {'M07', 'M13', 'M15', 'M21'}
ONLINE_MLB_CODES = {'HE1', 'HE2'}
ONLINE_DX_CODES = {'XE1'}

# Category 분류 (N시즌 재고주수 계산용) - 4개 카테고리
CATEGORY_MAP = {
    'HEA': '모자',
    'SHO': '신발',
    'BAG': '가방',
    # 나머지는 '기타ACC'
}

# ACC 카테고리 분류 (판매 데이터용)
def get_acc_category(category):
    """
    Category 코드를 기반으로 ACC 카테고리 반환
    - 신발: SHO
    - 모자: HEA
    - 가방: BAG
    - 기타ACC: 나머지
    """
    category_upper = category.upper()
    if 'SHO' in category_upper:
        return '신발'
    elif 'HEA' in category_upper:
        return '모자'
    elif 'BAG' in category_upper:
        return '가방'
    else:
        return '기타ACC'

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
    시즌 타입 결정 (단순화된 규칙)
    - N이 붙으면 N시즌
    - 시즌 연도 기준으로만 당시즌/과시즌 구분
      * current_year의 뒤 두 자리와 같으면 당시즌(F/S)
      * 더 이전 연도면 과시즌(F/S)
    - Month(월)는 사용하지 않음  → 카드/그래프 기준 일치
    """
    if season_code.endswith('N'):
        return 'N시즌'
    
    # 시즌 코드에서 연도/타입 추출 (예: 25F -> 25, 'F')
    if len(season_code) >= 3:
        try:
            season_year = int(season_code[:2])
        except ValueError:
            return '기타'
        current_year_short = current_year % 100  # 2025 → 25
        season_type = season_code[2]  # 'F' or 'S'

        if season_type in ['F', 'S']:
            if season_year == current_year_short:
                # 예: 25F, 25S  → 당시즌F / 당시즌S
                return f'당시즌{season_type}'
            elif season_year < current_year_short:
                # 예: 24F, 24S  → 과시즌F / 과시즌S
                return f'과시즌{season_type}'
    
    return '기타'

def calculate_discount_rate(gross_sales, net_sales):
    """할인율 계산"""
    if gross_sales == 0:
        return 0
    return ((gross_sales - net_sales) / gross_sales) * 100

def read_all_csv_files(csv_dir, target_period=None):
    """CSV 디렉토리에서 모든 CSV 파일 읽기 및 통합"""
    # target_period가 지정되면 해당 파일만, 아니면 모든 파일 읽기
    if target_period:
        # HKMC 폴더 구조 지원: HKMC/{period}/HKMC_Inventory_{period}.csv
        hkmc_dir = os.path.join(csv_dir, 'HKMC', target_period)
        if os.path.exists(hkmc_dir):
            csv_pattern = os.path.join(hkmc_dir, f'*{target_period}*.csv')
        else:
            csv_pattern = os.path.join(csv_dir, f'*{target_period}*.csv')
    else:
        csv_pattern = os.path.join(csv_dir, '*.csv')
    # 홍콩재고수불 또는 HKMC_Inventory 패턴 인식
    csv_files = [f for f in glob.glob(csv_pattern) if '홍콩재고수불' in f or 'HKMC' in f and 'Inventory' in f]
    
    if not csv_files:
        print(f"CSV 파일을 찾을 수 없습니다: {csv_pattern}")
        return [], set()
    
    print(f"발견된 CSV 파일: {len(csv_files)}개")
    for f in sorted(csv_files):
        print(f"  - {os.path.basename(f)}")
    
    all_data = []
    all_periods = set()
    
    for csv_file in sorted(csv_files):
        print(f"\n읽는 중: {os.path.basename(csv_file)}")
        try:
            with open(csv_file, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                row_count = 0
                for row in reader:
                    all_data.append(row)
                    all_periods.add(row['Period'])
                    row_count += 1
                print(f"  OK {row_count:,}행 읽음")
        except Exception as e:
            print(f"  ERROR: {e}")
            continue
    
    # Period를 숫자로 변환하여 정렬 (문자열 정렬 문제 방지)
    periods_sorted = sorted(all_periods, key=lambda x: int(x) if x.isdigit() else 0)
    return all_data, periods_sorted

def generate_dashboard_data(csv_dir, output_file_path, target_period=None):
    """대시보드용 데이터 생성
    
    Args:
        csv_dir: CSV 파일 디렉토리
        output_file_path: 출력 JSON 파일 경로
        target_period: 생성할 Period (예: '2510', '2511'). None이면 가장 최신 Period 사용
    """
    print("=" * 80)
    print("홍콩 대시보드 데이터 생성")
    print("=" * 80)
    
    # 모든 CSV 파일 읽기
    data, periods = read_all_csv_files(csv_dir, target_period)
    
    if not periods:
        print("데이터가 없습니다.")
        return
    
    # Period 결정
    if target_period:
        # target_period가 지정된 경우
        last_period = target_period
        last_year = 2000 + int(target_period[:2])
        last_month = int(target_period[2:4])
        
        if last_period not in periods:
            print(f"경고: {target_period} 데이터가 CSV에 없습니다!")
            print(f"사용 가능한 Period: {periods}")
    else:
        # 마지막 Period 찾기
        last_period = periods[-1]
        last_year, last_month = parse_period(last_period)
    
    # 전년 동월 Period 찾기
    prev_year = last_year - 1
    prev_period = f"{prev_year % 100:02d}{last_month:02d}"
    
    print(f"\n분석 기간:")
    print(f"  마지막 Period: {last_period} ({last_year}년 {last_month}월)")
    print(f"  전년 동월 Period: {prev_period} ({prev_year}년 {last_month}월)")
    
    # 데이터 필터링 (MLB Brand만)
    current_data = [row for row in data if row['Period'] == last_period and row['Brand'] == 'MLB']
    prev_data = [row for row in data if row['Period'] == prev_period and row['Brand'] == 'MLB']
    
    print(f"\n데이터 건수:")
    print(f"  현재 Period: {len(current_data):,}건")
    print(f"  전년 동월: {len(prev_data):,}건")
    
    # 1. Store별 집계
    store_summary = defaultdict(lambda: {
        'store_code': '',
        'store_name': '',
        'category': '',
        'brand': '',
        'channel': '',
        'country': '',
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
    
    # 3-1. ACC 판매 데이터 (N시즌, 카테고리별 상세)
    acc_sales_data = {
        'current': {
            'total': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
            'categories': {
                '신발': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
                '모자': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
                '가방': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
                '기타ACC': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
            }
        },
        'previous': {
            'total': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0},
            'categories': {
                '신발': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
                '모자': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
                '가방': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
                '기타ACC': {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'subcategories': defaultdict(lambda: {'gross_sales': 0, 'net_sales': 0, 'sales_qty': 0, 'stock_price': 0})},
            }
        }
    }
    
    # 4. Country & Channel별 집계
    country_channel_summary = defaultdict(lambda: {
        'country': '',
        'channel': '',
        'current': {
            'gross_sales': 0,
            'net_sales': 0,
            'discount_rate': 0,
        },
        'previous': {
            'gross_sales': 0,
            'net_sales': 0,
            'discount_rate': 0,
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
    print("\n현재 Period 데이터 집계 중...")
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
        store_summary[store_code]['country'] = row['Country']
        
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
            category_name = CATEGORY_MAP.get(category, '기타ACC')
            category_summary[category]['category'] = category
            category_summary[category]['category_name'] = category_name
            category_summary[category]['current']['stock_price'] += stock_price
            category_summary[category]['current']['sales_qty_1m'] += sales_qty  # 임시로 현재월만
            
            # ACC 판매 데이터 수집 (N시즌)
            subcategory_code = row.get('Subcategory_Code', '')
            subcategory_name = row.get('Subcategory_Name', '')
            acc_category = get_acc_category(category)  # Category 컬럼 사용
            
            # 전체 ACC 합계
            acc_sales_data['current']['total']['gross_sales'] += gross_sales
            acc_sales_data['current']['total']['net_sales'] += net_sales
            acc_sales_data['current']['total']['sales_qty'] += sales_qty
            
            # 카테고리별 합계
            acc_sales_data['current']['categories'][acc_category]['gross_sales'] += gross_sales
            acc_sales_data['current']['categories'][acc_category]['net_sales'] += net_sales
            acc_sales_data['current']['categories'][acc_category]['sales_qty'] += sales_qty
            
            # Subcategory별 상세 (TOP5용 및 정체재고 판단)
            if subcategory_code:
                subcat_data = acc_sales_data['current']['categories'][acc_category]['subcategories'][subcategory_code]
                subcat_data['gross_sales'] += gross_sales
                subcat_data['net_sales'] += net_sales
                subcat_data['sales_qty'] += sales_qty
                subcat_data['stock_price'] += stock_price
                subcat_data['subcategory_name'] = subcategory_name
        
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
        country_channel_summary[country_channel_key]['current']['gross_sales'] += gross_sales
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
        category = row['Category']
        
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
        
        # N시즌 ACC 판매 데이터 (전년 동월)
        if season_code.endswith('N'):
            subcategory_code = row.get('Subcategory_Code', '')
            subcategory_name = row.get('Subcategory_Name', '')
            acc_category = get_acc_category(category)  # Category 컬럼 사용
            
            # 전체 ACC 합계
            acc_sales_data['previous']['total']['gross_sales'] += gross_sales
            acc_sales_data['previous']['total']['net_sales'] += net_sales
            acc_sales_data['previous']['total']['sales_qty'] += sales_qty
            
            # 카테고리별 합계
            acc_sales_data['previous']['categories'][acc_category]['gross_sales'] += gross_sales
            acc_sales_data['previous']['categories'][acc_category]['net_sales'] += net_sales
            acc_sales_data['previous']['categories'][acc_category]['sales_qty'] += sales_qty
            
            # Subcategory별 상세 (TOP5용 및 정체재고 판단)
            if subcategory_code:
                subcat_data = acc_sales_data['previous']['categories'][acc_category]['subcategories'][subcategory_code]
                subcat_data['gross_sales'] += gross_sales
                subcat_data['net_sales'] += net_sales
                subcat_data['sales_qty'] += sales_qty
                subcat_data['stock_price'] += stock_price
                subcat_data['subcategory_name'] = subcategory_name
        
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
            country_channel_summary[country_channel_key]['previous']['gross_sales'] += float(row['Gross_Sales'] or 0)
            country_channel_summary[country_channel_key]['previous']['net_sales'] += float(row['Net_Sales'] or 0)
    
    # 전년 동일매장 기준 계산 (폐점 매장 제외)
    print("전년 동일매장 기준 계산 중...")
    
    # 매장 상세 정보 수집
    same_store_details_included = []
    same_store_details_excluded = []
    
    # 제외 매장 정의 (종료/리뉴얼)
    EXCLUDED_STORES = {
        'M12': {'name': 'WTC', 'reason': '10/11 종료'},
        'M05': {'name': 'LCX', 'reason': '10/13-11/7 리뉴얼중'}
    }
    
    for store_code in store_summary:
        store = store_summary[store_code]
        
        # 오프라인 매장만 (온라인 제외)
        is_online = store_code in ['HE1', 'HE2', 'XE1']
        
        if is_online:
            continue
        
        current_sales = store['current']['net_sales']
        previous_sales = store['previous']['net_sales']
        
        # 전년 동일 매장 조건: 현재도 매출이 있고 전년에도 매출이 있는 매장
        # 단, EXCLUDED_STORES에 명시된 매장은 제외
        is_excluded_store = store_code in EXCLUDED_STORES
        has_both_sales = current_sales > 0 and previous_sales > 0
        
        if has_both_sales and not is_excluded_store:
            # 포함된 매장 (전년 동일 매장)
            same_store_summary['current']['net_sales'] += current_sales
            same_store_summary['previous']['net_sales'] += previous_sales
            same_store_summary['store_count'] += 1
            
            same_store_details_included.append({
                'shop_cd': store_code,
                'shop_nm': store['store_name'],
                'current_sales': current_sales,
                'previous_sales': previous_sales
            })
        else:
            # 제외된 매장
            # 1. EXCLUDED_STORES에 명시된 매장 (리뉴얼/종료)
            # 2. 전년 또는 당년에 매출이 없는 매장 (신규/종료)
            if is_excluded_store:
                reason = EXCLUDED_STORES[store_code]['reason']
            elif current_sales == 0:
                reason = '종료'
            elif previous_sales == 0:
                reason = '신규'
            else:
                reason = '기타'
            
            same_store_details_excluded.append({
                'shop_cd': store_code,
                'shop_nm': store['store_name'],
                'reason': reason,
                'current_sales': current_sales,
                'previous_sales': previous_sales
            })
    
    # YOY 계산
    if same_store_summary['previous']['net_sales'] > 0:
        same_store_yoy = (same_store_summary['current']['net_sales'] / same_store_summary['previous']['net_sales']) * 100
    else:
        same_store_yoy = 0
    
    same_store_summary['yoy'] = same_store_yoy
    same_store_summary['details'] = {
        'included': same_store_details_included,
        'excluded': same_store_details_excluded
    }
    
    # 추세 데이터 생성 (가장 최근 월이 속하는 년도의 1월부터)
    print("추세 데이터 생성 중...")
    start_period = f"{last_year % 100:02d}01"  # 해당 년도 1월
    recent_periods = sorted([p for p in periods if start_period <= p <= last_period])
    
    # 월별 채널별 데이터 생성
    monthly_channel_data = defaultdict(lambda: {
        'period': '',
        'HK_Retail': 0,
        'HK_Outlet': 0,
        'HK_Online': 0,
        'MC_Retail': 0,
        'MC_Outlet': 0,
        'total': 0,
    })
    
    # 전년도 월별 채널별 데이터 (YOY 계산용)
    prev_monthly_channel_data = defaultdict(lambda: {
        'period': '',
        'HK_Retail': 0,
        'HK_Outlet': 0,
        'HK_Online': 0,
        'MC_Retail': 0,
        'MC_Outlet': 0,
        'total': 0,
    })
    
    # 월별 아이템별 데이터 생성 (추세 그래프용)
    # - 당시즌/과시즌을 F/S로 세분화 (대만 기준과 동일 로직)
    monthly_item_data = defaultdict(lambda: {
        'period': '',
        # F/S로 나눈 의류
        '당시즌F': {'gross_sales': 0, 'net_sales': 0},
        '당시즌S': {'gross_sales': 0, 'net_sales': 0},
        '과시즌F': {'gross_sales': 0, 'net_sales': 0},
        '과시즌S': {'gross_sales': 0, 'net_sales': 0},
        # 레거시 집계 (기존 그래프 호환용)
        '당시즌의류': {'gross_sales': 0, 'net_sales': 0},
        '과시즌의류': {'gross_sales': 0, 'net_sales': 0},
        # ACC (4개 카테고리)
        '신발': {'gross_sales': 0, 'net_sales': 0},
        '모자': {'gross_sales': 0, 'net_sales': 0},
        '가방': {'gross_sales': 0, 'net_sales': 0},
        '기타ACC': {'gross_sales': 0, 'net_sales': 0},
    })
    
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
        
        # 아이템별 분류
        monthly_item_data[period]['period'] = period
        for row in period_data:
            category = row['Category']
            season_code = row['Season_Code']
            season_type = get_season_type(season_code, last_year, last_month)
            
            gross_sales = float(row['Gross_Sales'] or 0)
            net_sales = float(row['Net_Sales'] or 0)
            
            # 아이템 분류 (N시즌 ACC는 4개 카테고리로 분류)
            if season_code.endswith('N'):
                # ACC (N시즌)
                acc_category = get_acc_category(category)
                monthly_item_data[period][acc_category]['gross_sales'] += gross_sales
                monthly_item_data[period][acc_category]['net_sales'] += net_sales
            else:
                # 의류 (Category가 의류인 경우)
                # 시즌 타입: 당시즌F, 당시즌S, 과시즌F, 과시즌S, N시즌/기타
                if season_type == '당시즌F':
                    monthly_item_data[period]['당시즌F']['gross_sales'] += gross_sales
                    monthly_item_data[period]['당시즌F']['net_sales'] += net_sales
                    monthly_item_data[period]['당시즌의류']['gross_sales'] += gross_sales
                    monthly_item_data[period]['당시즌의류']['net_sales'] += net_sales
                elif season_type == '당시즌S':
                    monthly_item_data[period]['당시즌S']['gross_sales'] += gross_sales
                    monthly_item_data[period]['당시즌S']['net_sales'] += net_sales
                    monthly_item_data[period]['당시즌의류']['gross_sales'] += gross_sales
                    monthly_item_data[period]['당시즌의류']['net_sales'] += net_sales
                elif season_type == '과시즌F':
                    monthly_item_data[period]['과시즌F']['gross_sales'] += gross_sales
                    monthly_item_data[period]['과시즌F']['net_sales'] += net_sales
                    monthly_item_data[period]['과시즌의류']['gross_sales'] += gross_sales
                    monthly_item_data[period]['과시즌의류']['net_sales'] += net_sales
                elif season_type == '과시즌S':
                    monthly_item_data[period]['과시즌S']['gross_sales'] += gross_sales
                    monthly_item_data[period]['과시즌S']['net_sales'] += net_sales
                    monthly_item_data[period]['과시즌의류']['gross_sales'] += gross_sales
                    monthly_item_data[period]['과시즌의류']['net_sales'] += net_sales
                else:
                    # 기타/미분류는 당시즌F에 포함 (보수적으로 처리)
                    monthly_item_data[period]['당시즌F']['gross_sales'] += gross_sales
                    monthly_item_data[period]['당시즌F']['net_sales'] += net_sales
                    monthly_item_data[period]['당시즌의류']['gross_sales'] += gross_sales
                    monthly_item_data[period]['당시즌의류']['net_sales'] += net_sales
        
        # 월별 채널별 집계
        monthly_channel_data[period]['period'] = period
        for row in period_data:
            country = row['Country']
            # Country 코드 표준화 (MO -> MC)
            if country == 'MO':
                country = 'MC'
            
            channel = row['Channel']
            # Channel 표준화
            if channel == 'Outlet':
                channel_key = 'Outlet'
            elif channel == 'Online':
                channel_key = 'Online'
            else:
                channel_key = 'Retail'
            
            channel_name = f"{country}_{channel_key}"
            net_sales = float(row['Net_Sales'] or 0)
            
            if channel_name in monthly_channel_data[period]:
                monthly_channel_data[period][channel_name] += net_sales
        
        # Total 계산
        monthly_channel_data[period]['total'] = (
            monthly_channel_data[period]['HK_Retail'] +
            monthly_channel_data[period]['HK_Outlet'] +
            monthly_channel_data[period]['HK_Online'] +
            monthly_channel_data[period]['MC_Retail'] +
            monthly_channel_data[period]['MC_Outlet']
        )
    
    # 전년도 월별 채널별 데이터 생성
    prev_start_period = f"{prev_year % 100:02d}01"
    prev_recent_periods = sorted([p for p in periods if prev_start_period <= p <= prev_period])
    
    # 전년도 월별 아이템별 데이터 생성 (F/S 기준 세분화)
    prev_monthly_item_data = defaultdict(lambda: {
        'period': '',
        '당시즌F': {'gross_sales': 0, 'net_sales': 0},
        '당시즌S': {'gross_sales': 0, 'net_sales': 0},
        '과시즌F': {'gross_sales': 0, 'net_sales': 0},
        '과시즌S': {'gross_sales': 0, 'net_sales': 0},
        '신발': {'gross_sales': 0, 'net_sales': 0},
        '모자': {'gross_sales': 0, 'net_sales': 0},
        '가방': {'gross_sales': 0, 'net_sales': 0},
        '기타ACC': {'gross_sales': 0, 'net_sales': 0},
    })
    
    for period in prev_recent_periods:
        period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB']
        
        prev_monthly_channel_data[period]['period'] = period
        for row in period_data:
            country = row['Country']
            # Country 코드 표준화 (MO -> MC)
            if country == 'MO':
                country = 'MC'
            
            channel = row['Channel']
            # Channel 표준화
            if channel == 'Outlet':
                channel_key = 'Outlet'
            elif channel == 'Online':
                channel_key = 'Online'
            else:
                channel_key = 'Retail'
            
            channel_name = f"{country}_{channel_key}"
            net_sales = float(row['Net_Sales'] or 0)
            
            if channel_name in prev_monthly_channel_data[period]:
                prev_monthly_channel_data[period][channel_name] += net_sales
        
        # Total 계산
        prev_monthly_channel_data[period]['total'] = (
            prev_monthly_channel_data[period]['HK_Retail'] +
            prev_monthly_channel_data[period]['HK_Outlet'] +
            prev_monthly_channel_data[period]['HK_Online'] +
            prev_monthly_channel_data[period]['MC_Retail'] +
            prev_monthly_channel_data[period]['MC_Outlet']
        )
        
        # 전년도 아이템별 분류
        prev_monthly_item_data[period]['period'] = period
        for row in period_data:
            category = row['Category']
            season_code = row['Season_Code']
            # 전년도 데이터도 상세 시즌 분류 사용
            season_type = get_season_type(season_code, prev_year, last_month)
            
            gross_sales = float(row['Gross_Sales'] or 0)
            net_sales = float(row['Net_Sales'] or 0)
            
            # 아이템 분류 (N시즌 ACC는 4개 카테고리로 분류)
            if season_code.endswith('N'):
                # ACC (N시즌)
                acc_category = get_acc_category(category)
                prev_monthly_item_data[period][acc_category]['gross_sales'] += gross_sales
                prev_monthly_item_data[period][acc_category]['net_sales'] += net_sales
            else:
                # 의류 - F/S 상세 시즌별 집계
                if season_type == '당시즌F':
                    prev_monthly_item_data[period]['당시즌F']['gross_sales'] += gross_sales
                    prev_monthly_item_data[period]['당시즌F']['net_sales'] += net_sales
                elif season_type == '당시즌S':
                    prev_monthly_item_data[period]['당시즌S']['gross_sales'] += gross_sales
                    prev_monthly_item_data[period]['당시즌S']['net_sales'] += net_sales
                elif season_type == '과시즌F':
                    prev_monthly_item_data[period]['과시즌F']['gross_sales'] += gross_sales
                    prev_monthly_item_data[period]['과시즌F']['net_sales'] += net_sales
                elif season_type == '과시즌S':
                    prev_monthly_item_data[period]['과시즌S']['gross_sales'] += gross_sales
                    prev_monthly_item_data[period]['과시즌S']['net_sales'] += net_sales
                else:
                    # 분류 불가한 경우는 당시즌F에 포함
                    prev_monthly_item_data[period]['당시즌F']['gross_sales'] += gross_sales
                    prev_monthly_item_data[period]['당시즌F']['net_sales'] += net_sales
    
    # 월별 채널별 YOY 계산
    monthly_channel_yoy = {
        'HK_Retail': [],
        'HK_Outlet': [],
        'HK_Online': [],
        'MC_Retail': [],
        'MC_Outlet': [],
    }
    
    for period in recent_periods:
        # 전년 동월 Period 찾기
        period_year, period_month = parse_period(period)
        if period_year and period_month:
            prev_period_for_yoy = f"{(period_year - 1) % 100:02d}{period_month:02d}"
            
            current_hk_retail = monthly_channel_data[period]['HK_Retail']
            prev_hk_retail = prev_monthly_channel_data.get(prev_period_for_yoy, {}).get('HK_Retail', 0)
            yoy_hk_retail = (current_hk_retail / prev_hk_retail * 100) if prev_hk_retail > 0 else 0
            monthly_channel_yoy['HK_Retail'].append(round(yoy_hk_retail))
            
            current_hk_outlet = monthly_channel_data[period]['HK_Outlet']
            prev_hk_outlet = prev_monthly_channel_data.get(prev_period_for_yoy, {}).get('HK_Outlet', 0)
            yoy_hk_outlet = (current_hk_outlet / prev_hk_outlet * 100) if prev_hk_outlet > 0 else 0
            monthly_channel_yoy['HK_Outlet'].append(round(yoy_hk_outlet))
            
            current_hk_online = monthly_channel_data[period]['HK_Online']
            prev_hk_online = prev_monthly_channel_data.get(prev_period_for_yoy, {}).get('HK_Online', 0)
            yoy_hk_online = (current_hk_online / prev_hk_online * 100) if prev_hk_online > 0 else 0
            monthly_channel_yoy['HK_Online'].append(round(yoy_hk_online))
            
            current_mc_retail = monthly_channel_data[period]['MC_Retail']
            prev_mc_retail = prev_monthly_channel_data.get(prev_period_for_yoy, {}).get('MC_Retail', 0)
            yoy_mc_retail = (current_mc_retail / prev_mc_retail * 100) if prev_mc_retail > 0 else 0
            monthly_channel_yoy['MC_Retail'].append(round(yoy_mc_retail))
            
            current_mc_outlet = monthly_channel_data[period]['MC_Outlet']
            prev_mc_outlet = prev_monthly_channel_data.get(prev_period_for_yoy, {}).get('MC_Outlet', 0)
            yoy_mc_outlet = (current_mc_outlet / prev_mc_outlet * 100) if prev_mc_outlet > 0 else 0
            monthly_channel_yoy['MC_Outlet'].append(round(yoy_mc_outlet))
    
    # 월별 아이템별 YOY 계산 (F/S 기준 세분화 + 전체 합계)
    monthly_item_yoy = {
        '당시즌F': [],
        '당시즌S': [],
        '과시즌F': [],
        '과시즌S': [],
        '신발': [],
        '모자': [],
        '가방': [],
        '기타ACC': [],
        '전체합계': [],
    }
    
    for period in recent_periods:
        # 전년 동월 Period 찾기
        period_year, period_month = parse_period(period)
        if period_year and period_month:
            prev_period_for_yoy = f"{(period_year - 1) % 100:02d}{period_month:02d}"
            
            # 당시즌F
            current_net = monthly_item_data[period]['당시즌F']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('당시즌F', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['당시즌F'].append(round(yoy))
            
            # 당시즌S
            current_net = monthly_item_data[period]['당시즌S']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('당시즌S', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['당시즌S'].append(round(yoy))
            
            # 과시즌F
            current_net = monthly_item_data[period]['과시즌F']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('과시즌F', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['과시즌F'].append(round(yoy))
            
            # 과시즌S
            current_net = monthly_item_data[period]['과시즌S']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('과시즌S', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['과시즌S'].append(round(yoy))
            
            # 모자
            current_net = monthly_item_data[period]['모자']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('모자', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['모자'].append(round(yoy))
            
            # 신발
            current_net = monthly_item_data[period]['신발']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('신발', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['신발'].append(round(yoy))
            
            # 모자 (이미 위에 있음, 중복 방지)
            
            # 가방
            current_net = monthly_item_data[period]['가방']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('가방', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['가방'].append(round(yoy))
            
            # 기타ACC
            current_net = monthly_item_data[period]['기타ACC']['net_sales']
            prev_net = prev_monthly_item_data.get(prev_period_for_yoy, {}).get('기타ACC', {}).get('net_sales', 0)
            yoy = (current_net / prev_net * 100) if prev_net > 0 else 0
            monthly_item_yoy['기타ACC'].append(round(yoy))

            # 전체합계 (당시즌F/S + 과시즌F/S + 신발 + 모자 + 가방 + 기타ACC)
            current_total = (
                monthly_item_data[period]['당시즌F']['net_sales'] +
                monthly_item_data[period]['당시즌S']['net_sales'] +
                monthly_item_data[period]['과시즌F']['net_sales'] +
                monthly_item_data[period]['과시즌S']['net_sales'] +
                monthly_item_data[period]['신발']['net_sales'] +
                monthly_item_data[period]['모자']['net_sales'] +
                monthly_item_data[period]['가방']['net_sales'] +
                monthly_item_data[period]['기타ACC']['net_sales']
            )
            prev_total = 0
            if prev_period_for_yoy in prev_monthly_item_data:
                prev_item = prev_monthly_item_data[prev_period_for_yoy]
                prev_total = (
                    prev_item['당시즌F']['net_sales'] +
                    prev_item['당시즌S']['net_sales'] +
                    prev_item['과시즌F']['net_sales'] +
                    prev_item['과시즌S']['net_sales'] +
                    prev_item['신발']['net_sales'] +
                    prev_item['모자']['net_sales'] +
                    prev_item['가방']['net_sales'] +
                    prev_item['기타ACC']['net_sales']
                )
            total_yoy = (current_total / prev_total * 100) if prev_total > 0 else 0
            monthly_item_yoy['전체합계'].append(round(total_yoy))
    
    # 재고주수 계산 (최근 6개월 매출 필요)
    print("재고주수 계산 중...")
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
    
    # ACC 재고주수 계산 (N시즌, 직전 6개월 누적매출 기준)
    print("ACC 재고주수 계산 중...")
    
    # Category 분류 (N시즌 재고주수 계산용)
    CATEGORY_ACC_MAP = {
        'HEA': '모자',
        'SHO': '신발',
        'BAG': '가방',
        # 나머지는 '기타ACC'
    }
    
    # ACC 재고주수 집계 (N시즌만)
    acc_stock_summary = defaultdict(lambda: {
        'category': '',
        'category_name': '',
        'current': {
            'stock_price': 0,  # 재고 Tag가
            'gross_sales_6m': 0,  # 직전 6개월 누적매출 (Gross_Sales)
            'stock_weeks': 0,  # 재고주수 (주)
        },
        'previous': {
            'stock_price': 0,
            'gross_sales_6m': 0,
            'stock_weeks': 0,
        },
    })
    
    # 직전 6개월 Period 찾기
    recent_6m_periods_acc = sorted([p for p in periods if p <= last_period])[-6:]
    prev_6m_periods_acc = sorted([p for p in periods if p <= prev_period])[-6:]
    
    # 현재 Period의 N시즌 데이터에서 재고 Tag가 집계
    for row in current_data:
        if row['Season_Code'].endswith('N'):  # N시즌만
            category = row['Category']
            category_name = CATEGORY_ACC_MAP.get(category, '기타ACC')
            
            acc_stock_summary[category]['category'] = category
            acc_stock_summary[category]['category_name'] = category_name
            acc_stock_summary[category]['current']['stock_price'] += float(row['Stock_Price'] or 0)
    
    # 전년 동월의 N시즌 데이터에서 재고 Tag가 집계
    for row in prev_data:
        if row['Season_Code'].endswith('N'):  # N시즌만
            category = row['Category']
            category_name = CATEGORY_ACC_MAP.get(category, '기타ACC')
            
            if category in acc_stock_summary:
                acc_stock_summary[category]['previous']['stock_price'] += float(row['Stock_Price'] or 0)
    
    # 직전 6개월 누적매출 계산 (Gross_Sales 기준)
    for period in recent_6m_periods_acc:
        if period in periods:
            period_data = [row for row in data 
                          if row['Period'] == period 
                          and row['Brand'] == 'MLB'
                          and row['Season_Code'].endswith('N')]  # N시즌만
            
            for row in period_data:
                category = row['Category']
                if category in acc_stock_summary:
                    acc_stock_summary[category]['current']['gross_sales_6m'] += float(row['Gross_Sales'] or 0)
    
    for period in prev_6m_periods_acc:
        if period in periods:
            period_data = [row for row in data 
                          if row['Period'] == period 
                          and row['Brand'] == 'MLB'
                          and row['Season_Code'].endswith('N')]  # N시즌만
            
            for row in period_data:
                category = row['Category']
                if category in acc_stock_summary:
                    acc_stock_summary[category]['previous']['gross_sales_6m'] += float(row['Gross_Sales'] or 0)
    
    # 재고주수 계산 (주 단위)
    # 재고주수 = (재고 Tag가 / 월평균 매출) * 4주
    # 월평균 매출 = 6개월 누적매출 / 6
    for category in acc_stock_summary:
        acc = acc_stock_summary[category]
        
        # 현재
        avg_monthly_sales = acc['current']['gross_sales_6m'] / 6 if 6 > 0 else 0
        if avg_monthly_sales > 0:
            acc['current']['stock_weeks'] = (acc['current']['stock_price'] / avg_monthly_sales) * 4
        
        # 전년
        avg_monthly_sales_prev = acc['previous']['gross_sales_6m'] / 6 if 6 > 0 else 0
        if avg_monthly_sales_prev > 0:
            acc['previous']['stock_weeks'] = (acc['previous']['stock_price'] / avg_monthly_sales_prev) * 4
        
        # 변화량
        acc['stock_weeks_change'] = acc['current']['stock_weeks'] - acc['previous']['stock_weeks']
    
    # ACC 전체 합계
    acc_total_current = {
        'stock_price': sum(acc['current']['stock_price'] for acc in acc_stock_summary.values()),
        'gross_sales_6m': sum(acc['current']['gross_sales_6m'] for acc in acc_stock_summary.values()),
        'stock_weeks': 0,
    }
    acc_total_previous = {
        'stock_price': sum(acc['previous']['stock_price'] for acc in acc_stock_summary.values()),
        'gross_sales_6m': sum(acc['previous']['gross_sales_6m'] for acc in acc_stock_summary.values()),
        'stock_weeks': 0,
    }
    
    # ACC 전체 재고주수 계산
    avg_monthly_sales_total = acc_total_current['gross_sales_6m'] / 6 if 6 > 0 else 0
    if avg_monthly_sales_total > 0:
        acc_total_current['stock_weeks'] = (acc_total_current['stock_price'] / avg_monthly_sales_total) * 4
    
    avg_monthly_sales_total_prev = acc_total_previous['gross_sales_6m'] / 6 if 6 > 0 else 0
    if avg_monthly_sales_total_prev > 0:
        acc_total_previous['stock_weeks'] = (acc_total_previous['stock_price'] / avg_monthly_sales_total_prev) * 4
    
    acc_total_change = acc_total_current['stock_weeks'] - acc_total_previous['stock_weeks']
    
    # 당월 판매 (10월 Net Sales) - N시즌만
    acc_october_sales = defaultdict(lambda: {
        'category': '',
        'category_name': '',
        'net_sales': 0,
    })
    
    for row in current_data:
        if row['Season_Code'].endswith('N'):  # N시즌만
            category = row['Category']
            category_name = CATEGORY_ACC_MAP.get(category, '기타ACC')
            acc_october_sales[category]['category'] = category
            acc_october_sales[category]['category_name'] = category_name
            acc_october_sales[category]['net_sales'] += float(row['Net_Sales'] or 0)
    
    # 전년 10월 판매
    acc_october_sales_prev = defaultdict(lambda: {
        'category': '',
        'category_name': '',
        'net_sales': 0,
    })
    
    for row in prev_data:
        if row['Season_Code'].endswith('N'):  # N시즌만
            category = row['Category']
            category_name = CATEGORY_ACC_MAP.get(category, '기타ACC')
            acc_october_sales_prev[category]['category'] = category
            acc_october_sales_prev[category]['category_name'] = category_name
            acc_october_sales_prev[category]['net_sales'] += float(row['Net_Sales'] or 0)
    
    # YOY 계산
    for category in acc_october_sales:
        current_sales = acc_october_sales[category]['net_sales']
        prev_sales = acc_october_sales_prev.get(category, {}).get('net_sales', 0)
        if prev_sales > 0:
            acc_october_sales[category]['yoy'] = (current_sales / prev_sales) * 100
        else:
            acc_october_sales[category]['yoy'] = 999 if current_sales > 0 else 0
    
    # 제외 매장 정의
    EXCLUDED_STORES = {'M08', 'M20', 'M05', 'M12'}  # 폐점 및 제외 매장
    # M05: LCX (리뉴얼), M12: WTC (종료), M08, M20: 종료매장
    
    # M10과 M10A 합치기 (같은 매장)
    if 'M10' in store_summary and 'M10A' in store_summary:
        # M10에 M10A 매출 합치기
        store_summary['M10']['current']['gross_sales'] += store_summary['M10A']['current']['gross_sales']
        store_summary['M10']['current']['net_sales'] += store_summary['M10A']['current']['net_sales']
        store_summary['M10']['current']['sales_qty'] += store_summary['M10A']['current']['sales_qty']
        store_summary['M10']['current']['stock_price'] += store_summary['M10A']['current']['stock_price']
        store_summary['M10']['current']['stock_cost'] += store_summary['M10A']['current']['stock_cost']
        
        store_summary['M10']['previous']['gross_sales'] += store_summary['M10A']['previous']['gross_sales']
        store_summary['M10']['previous']['net_sales'] += store_summary['M10A']['previous']['net_sales']
        store_summary['M10']['previous']['sales_qty'] += store_summary['M10A']['previous']['sales_qty']
        store_summary['M10']['previous']['stock_price'] += store_summary['M10A']['previous']['stock_price']
        store_summary['M10']['previous']['stock_cost'] += store_summary['M10A']['previous']['stock_cost']
        
        # 할인율 재계산
        store_summary['M10']['current']['discount_rate'] = calculate_discount_rate(
            store_summary['M10']['current']['gross_sales'],
            store_summary['M10']['current']['net_sales']
        )
        store_summary['M10']['previous']['discount_rate'] = calculate_discount_rate(
            store_summary['M10']['previous']['gross_sales'],
            store_summary['M10']['previous']['net_sales']
        )
    
    # 전체 실판매출 계산 (제외 매장 제외)
    total_net_sales_current = sum(
        store['current']['net_sales'] 
        for code, store in store_summary.items() 
        if code not in EXCLUDED_STORES and code != 'M10A'  # M10A는 M10에 합쳐졌으므로 제외
    )
    total_net_sales_previous = sum(
        store['previous']['net_sales'] 
        for code, store in store_summary.items() 
        if code not in EXCLUDED_STORES and code != 'M10A'
    )
    total_yoy = ((total_net_sales_current - total_net_sales_previous) / total_net_sales_previous * 100) if total_net_sales_previous > 0 else 0
    total_change = total_net_sales_current - total_net_sales_previous
    
    # 점당매출 계산 (제외 매장 제외, M10A 제외, M10과 M10A는 1개로 계산)
    # 현재 Period 매장수
    active_stores_current = [
        store for code, store in store_summary.items() 
        if code not in EXCLUDED_STORES 
        and code != 'M10A'  # M10A는 M10에 합쳐졌으므로 제외
        and store['current']['net_sales'] > 0
    ]
    store_count_current = len(active_stores_current)
    sales_per_store_current = total_net_sales_current / store_count_current if store_count_current > 0 else 0
    
    # 전년 동월 매장수
    active_stores_previous = [
        store for code, store in store_summary.items() 
        if code not in EXCLUDED_STORES 
        and code != 'M10A'  # M10A는 M10에 합쳐졌으므로 제외
        and store['previous']['net_sales'] > 0
    ]
    store_count_previous = len(active_stores_previous)
    sales_per_store_previous = total_net_sales_previous / store_count_previous if store_count_previous > 0 else 0
    
    # 전년비 계산
    sales_per_store_yoy = (sales_per_store_current / sales_per_store_previous * 100) if sales_per_store_previous > 0 else 0
    sales_per_store_change = sales_per_store_current - sales_per_store_previous
    
    # 오프라인 매장 효율성 계산 (온라인 제외)
    offline_channel_summary = defaultdict(lambda: {
        'country': '',
        'channel': '',
        'current': {
            'store_count': 0,
            'net_sales': 0,
            'sales_per_store': 0,
        },
        'previous': {
            'store_count': 0,
            'net_sales': 0,
            'sales_per_store': 0,
        },
    })
    
    # 오프라인 매장만 필터링 (Online 제외)
    # 현재 Period: M08, M20, M05, M12 제외 (M12는 10월 11일 폐점)
    for code, store in store_summary.items():
        if (code not in EXCLUDED_STORES 
            and code != 'M10A'  # M10A는 M10에 합쳐짐
            and store['channel'] != 'Online'  # 온라인 제외
            and store['current']['net_sales'] > 0):  # 현재 운영 중인 매장만
            # M12는 10월 11일 폐점이므로 확실히 제외
            if code == 'M12':
                continue
            
            country = store.get('country', '')
            channel = store['channel']
            # Channel 표준화
            if channel == 'Outlet':
                channel_key = 'Outlet'
            else:
                channel_key = 'Retail'  # Retail, Office, Warehouse 등
            
            key = f"{country}_{channel_key}"
            offline_channel_summary[key]['country'] = country
            offline_channel_summary[key]['channel'] = channel_key
            offline_channel_summary[key]['current']['store_count'] += 1
            offline_channel_summary[key]['current']['net_sales'] += store['current']['net_sales']
    
    # 전년 동월 오프라인 매장
    # 전년 동월에는 M08, M20까지 포함 (제외 매장 없음)
    for code, store in store_summary.items():
        if (code != 'M10A'  # M10A는 M10에 합쳐짐
            and store['channel'] != 'Online'  # 온라인 제외
            and store['previous']['net_sales'] > 0):  # 전년 운영 중인 매장만
            
            country = store.get('country', '')
            channel = store['channel']
            if channel == 'Outlet':
                channel_key = 'Outlet'
            else:
                channel_key = 'Retail'
            
            key = f"{country}_{channel_key}"
            if key in offline_channel_summary:
                offline_channel_summary[key]['previous']['store_count'] += 1
                offline_channel_summary[key]['previous']['net_sales'] += store['previous']['net_sales']
    
    # 점당매출 계산
    for key in offline_channel_summary:
        cc = offline_channel_summary[key]
        if cc['current']['store_count'] > 0:
            cc['current']['sales_per_store'] = cc['current']['net_sales'] / cc['current']['store_count']
        if cc['previous']['store_count'] > 0:
            cc['previous']['sales_per_store'] = cc['previous']['net_sales'] / cc['previous']['store_count']
        # 전년비
        if cc['previous']['sales_per_store'] > 0:
            cc['yoy'] = (cc['current']['sales_per_store'] / cc['previous']['sales_per_store']) * 100
        else:
            cc['yoy'] = 0 if cc['current']['sales_per_store'] == 0 else 999
        # 매장수 변화
        cc['store_count_change'] = cc['current']['store_count'] - cc['previous']['store_count']
    
    # 오프라인 전체 집계
    offline_total_current = {
        'store_count': sum(cc['current']['store_count'] for cc in offline_channel_summary.values()),
        'net_sales': sum(cc['current']['net_sales'] for cc in offline_channel_summary.values()),
    }
    offline_total_previous = {
        'store_count': sum(cc['previous']['store_count'] for cc in offline_channel_summary.values()),
        'net_sales': sum(cc['previous']['net_sales'] for cc in offline_channel_summary.values()),
    }
    offline_total_current['sales_per_store'] = offline_total_current['net_sales'] / offline_total_current['store_count'] if offline_total_current['store_count'] > 0 else 0
    offline_total_previous['sales_per_store'] = offline_total_previous['net_sales'] / offline_total_previous['store_count'] if offline_total_previous['store_count'] > 0 else 0
    offline_total_yoy = (offline_total_current['sales_per_store'] / offline_total_previous['sales_per_store'] * 100) if offline_total_previous['sales_per_store'] > 0 else 0
    
    # 기말재고 계산 (Stock_Price 기준)
    print("기말재고 계산 중...")
    
    # 현재 시즌 코드 추출 (예: 25F)
    current_season_f = f"{last_year % 100}F"
    previous_season_f = f"{prev_year % 100}F"
    current_season_s = f"{last_year % 100}S"
    previous_season_s = f"{prev_year % 100}S"
    
    # 시즌별 기말재고 집계
    ending_inventory = defaultdict(lambda: {
        'season_type': '',
        'current': {
            'stock_price': 0,  # 재고 Tag가
        },
        'previous': {
            'stock_price': 0,
        },
    })
    
    # 과시즌 FW 시즌별 재고 (1년차, 2년차, 3년차 이상)
    past_season_fw_inventory = defaultdict(lambda: {
        'season_code': '',
        'year': 0,
        'current': {
            'stock_price': 0,
        },
        'previous': {
            'stock_price': 0,
        },
    })
    
    # 과시즌 FW 시즌별 그룹화 (1년차, 2년차, 3년차 이상) - 먼저 초기화
    prev_prev_season_f = f"{prev_year % 100 - 1}F"  # 23F
    prev_prev_prev_season_f = f"{prev_year % 100 - 2}F"  # 22F
    
    past_season_fw_by_year = {
        '1년차': {
            'season_codes': [previous_season_f],  # 24F
            'current': {'stock_price': 0},
            'previous': {'stock_price': 0},
        },
        '2년차': {
            'season_codes': [prev_prev_season_f],  # 23F
            'current': {'stock_price': 0},
            'previous': {'stock_price': 0},
        },
        '3년차_이상': {
            'season_codes': [],  # 22F 이하
            'current': {'stock_price': 0},
            'previous': {'stock_price': 0},
        },
    }
    
    # 25년 1년차 과시즌재고 (24FW) Subcategory별
    past_season_fw_1year_subcat = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'current': {
            'stock_price': 0,
        },
        'previous': {
            'stock_price': 0,
        },
    })
    
    # 악세 (N시즌) 별도 집계
    acc_ending_inventory = defaultdict(lambda: {
        'category': '',
        'category_name': '',
        'current': {
            'stock_price': 0,
        },
        'previous': {
            'stock_price': 0,
        },
    })
    
    # 현재 Period 기말재고 집계
    for row in current_data:
        season_code = row['Season_Code']
        stock_price = float(row['Stock_Price'] or 0)
        
        if season_code == current_season_f:
            # 당시즌 의류 (25F)
            ending_inventory['당시즌_의류']['season_type'] = '당시즌 의류'
            ending_inventory['당시즌_의류']['current']['stock_price'] += stock_price
        elif season_code == current_season_s:
            # 당시즌 SS (25S)
            ending_inventory['당시즌_SS']['season_type'] = '당시즌 SS'
            ending_inventory['당시즌_SS']['current']['stock_price'] += stock_price
        elif season_code.endswith('F'):
            # 과시즌 FW
            ending_inventory['과시즌_FW']['season_type'] = '과시즌 FW'
            ending_inventory['과시즌_FW']['current']['stock_price'] += stock_price
            
            # 시즌 코드에서 연도 추출
            if len(season_code) >= 2:
                season_year = int(season_code[:2])
                year_diff = last_year % 100 - season_year
                
                # 과시즌 FW 시즌별 집계
                past_season_fw_inventory[season_code]['season_code'] = season_code
                past_season_fw_inventory[season_code]['year'] = season_year
                past_season_fw_inventory[season_code]['current']['stock_price'] += stock_price
                
                # 1년차 (24FW) Subcategory별 집계
                if season_code == previous_season_f:  # 24F
                    subcat_code = row['Subcategory_Code'].strip()
                    subcat_name = row['Subcategory'].strip()
                    past_season_fw_1year_subcat[subcat_code]['subcategory_code'] = subcat_code
                    past_season_fw_1year_subcat[subcat_code]['subcategory_name'] = subcat_name
                    past_season_fw_1year_subcat[subcat_code]['current']['stock_price'] += stock_price
        elif season_code.endswith('S'):
            # 과시즌 SS
            ending_inventory['과시즌_SS']['season_type'] = '과시즌 SS'
            ending_inventory['과시즌_SS']['current']['stock_price'] += stock_price
        elif season_code.endswith('N'):
            # 악세 (N시즌)
            category = row['Category']
            category_name = CATEGORY_ACC_MAP.get(category, '기타ACC')
            acc_ending_inventory[category]['category'] = category
            acc_ending_inventory[category]['category_name'] = category_name
            acc_ending_inventory[category]['current']['stock_price'] += stock_price
    
    # 전년 동월 기말재고 집계
    for row in prev_data:
        season_code = row['Season_Code']
        stock_price = float(row['Stock_Price'] or 0)
        
        if season_code == previous_season_f:
            # 당시즌 의류 (24F)
            ending_inventory['당시즌_의류']['previous']['stock_price'] += stock_price
        elif season_code == previous_season_s:
            # 당시즌 SS (24S)
            ending_inventory['당시즌_SS']['previous']['stock_price'] += stock_price
        elif season_code.endswith('F'):
            # 과시즌 FW
            ending_inventory['과시즌_FW']['previous']['stock_price'] += stock_price
            
            # 과시즌 FW 시즌별 집계 (전년 동월 기준)
            if len(season_code) >= 2:
                season_year = int(season_code[:2])
                # 전년 동월(2410) 기준으로 시즌별 분류
                if season_code == prev_prev_season_f:  # 23F (전년 기준 1년차)
                    past_season_fw_by_year['1년차']['previous']['stock_price'] += stock_price
                    # Subcategory별 집계 (전년 1년차 = 23F)
                    subcat_code = row['Subcategory_Code'].strip()
                    subcat_name = row['Subcategory'].strip()
                    if subcat_code not in past_season_fw_1year_subcat:
                        past_season_fw_1year_subcat[subcat_code] = {
                            'subcategory_code': subcat_code,
                            'subcategory_name': subcat_name,
                            'current': {'stock_price': 0},
                            'previous': {'stock_price': 0},
                        }
                    past_season_fw_1year_subcat[subcat_code]['previous']['stock_price'] += stock_price
                elif season_code == prev_prev_prev_season_f:  # 22F (전년 기준 2년차)
                    past_season_fw_by_year['2년차']['previous']['stock_price'] += stock_price
                elif len(season_code) >= 2 and int(season_code[:2]) < prev_year % 100 - 2:  # 21F 이하 (전년 기준 3년차 이상)
                    past_season_fw_by_year['3년차_이상']['previous']['stock_price'] += stock_price
        elif season_code.endswith('S'):
            # 과시즌 SS
            ending_inventory['과시즌_SS']['previous']['stock_price'] += stock_price
        elif season_code.endswith('N'):
            # 악세 (N시즌)
            category = row['Category']
            if category in acc_ending_inventory:
                acc_ending_inventory[category]['previous']['stock_price'] += stock_price
    
    # 현재 Period 기준으로 1년차, 2년차, 3년차 이상 집계
    for season_code, inv_data in past_season_fw_inventory.items():
        if season_code == previous_season_f:  # 24F (현재 기준 1년차)
            past_season_fw_by_year['1년차']['current']['stock_price'] += inv_data['current']['stock_price']
        elif season_code == prev_prev_season_f:  # 23F (현재 기준 2년차)
            past_season_fw_by_year['2년차']['current']['stock_price'] += inv_data['current']['stock_price']
        else:
            # 3년차 이상 (22F 이하)
            if len(season_code) >= 2:
                season_year = int(season_code[:2])
                if season_year < prev_year % 100 - 1:
                    past_season_fw_by_year['3년차_이상']['current']['stock_price'] += inv_data['current']['stock_price']
    
    # YOY 계산
    for key in ending_inventory:
        inv = ending_inventory[key]
        if inv['previous']['stock_price'] > 0:
            inv['yoy'] = (inv['current']['stock_price'] / inv['previous']['stock_price']) * 100
        else:
            inv['yoy'] = 999 if inv['current']['stock_price'] > 0 else 0
    
    for year_key in past_season_fw_by_year:
        year_data = past_season_fw_by_year[year_key]
        if year_data['previous']['stock_price'] > 0:
            year_data['yoy'] = (year_data['current']['stock_price'] / year_data['previous']['stock_price']) * 100
        else:
            year_data['yoy'] = 999 if year_data['current']['stock_price'] > 0 else 0
        year_data['change'] = year_data['current']['stock_price'] - year_data['previous']['stock_price']
    
    for subcat_code in past_season_fw_1year_subcat:
        subcat = past_season_fw_1year_subcat[subcat_code]
        if subcat['previous']['stock_price'] > 0:
            subcat['yoy'] = (subcat['current']['stock_price'] / subcat['previous']['stock_price']) * 100
        else:
            subcat['yoy'] = 999 if subcat['current']['stock_price'] > 0 else 0
    
    for category in acc_ending_inventory:
        acc = acc_ending_inventory[category]
        if acc['previous']['stock_price'] > 0:
            acc['yoy'] = (acc['current']['stock_price'] / acc['previous']['stock_price']) * 100
        else:
            acc['yoy'] = 999 if acc['current']['stock_price'] > 0 else 0
    
    # 전체 기말재고
    total_ending_inventory_current = sum(inv['current']['stock_price'] for inv in ending_inventory.values())
    total_ending_inventory_current += sum(acc['current']['stock_price'] for acc in acc_ending_inventory.values())
    
    total_ending_inventory_previous = sum(inv['previous']['stock_price'] for inv in ending_inventory.values())
    total_ending_inventory_previous += sum(acc['previous']['stock_price'] for acc in acc_ending_inventory.values())
    
    total_ending_inventory_yoy = (total_ending_inventory_current / total_ending_inventory_previous * 100) if total_ending_inventory_previous > 0 else 0
    
    # 월별 아이템별 재고 추세 데이터 생성
    print("월별 아이템별 재고 추세 데이터 생성 중...")
    monthly_inventory_data = defaultdict(lambda: {
        'period': '',
        'F당시즌': {'stock_price': 0, 'stock_weeks': 0},
        'S당시즌': {'stock_price': 0, 'stock_weeks': 0},
        '과시즌FW': {'stock_price': 0, 'stock_weeks': 0},
        '과시즌SS': {'stock_price': 0, 'stock_weeks': 0},
        '신발': {'stock_price': 0, 'stock_weeks': 0},
        '모자': {'stock_price': 0, 'stock_weeks': 0},
        '가방': {'stock_price': 0, 'stock_weeks': 0},
        '기타ACC': {'stock_price': 0, 'stock_weeks': 0},
    })
    
    # 각 Period별로 재고 데이터 집계
    for period in recent_periods:
        period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB']
        monthly_inventory_data[period]['period'] = period
        
        period_year, period_month = parse_period(period)
        
        # 해당 Period의 재고 데이터 집계
        for row in period_data:
            season_code = row['Season_Code']
            category = row['Category']
            stock_price = float(row['Stock_Price'] or 0)
            
            # F당시즌: 1~6월은 전년 시즌(24F), 7~12월은 현재 시즌(25F)
            if period_year and period_month:
                if period_month <= 6:
                    # 1~6월: 전년 시즌 F (24F)
                    prev_season_f = f"{(period_year - 1) % 100:02d}F"
                    if season_code == prev_season_f:
                        monthly_inventory_data[period]['F당시즌']['stock_price'] += stock_price
                        continue  # F당시즌에 포함되었으므로 다음 행으로
                else:
                    # 7~12월: 현재 시즌 F (25F)
                    if season_code == current_season_f:
                        monthly_inventory_data[period]['F당시즌']['stock_price'] += stock_price
                        continue  # F당시즌에 포함되었으므로 다음 행으로
            
            # S당시즌 (현재 시즌 S)
            if season_code == current_season_s:
                monthly_inventory_data[period]['S당시즌']['stock_price'] += stock_price
            # 과시즌FW: F당시즌에 포함되지 않은 F로 끝나는 시즌만
            elif season_code.endswith('F'):
                monthly_inventory_data[period]['과시즌FW']['stock_price'] += stock_price
            # 과시즌SS
            elif season_code.endswith('S'):
                monthly_inventory_data[period]['과시즌SS']['stock_price'] += stock_price
            # 악세 (N시즌, 4개 카테고리)
            elif season_code.endswith('N'):
                acc_category = get_acc_category(category)
                monthly_inventory_data[period][acc_category]['stock_price'] += stock_price
        
        # 각 아이템별 재고주수 계산 (직전 6개월 매출 기준)
        period_year, period_month = parse_period(period)
        if period_year and period_month:
            # 직전 6개월 Period 찾기
            prev_6m_periods = []
            for i in range(6, 0, -1):
                month = period_month - i
                year = period_year
                if month <= 0:
                    month += 12
                    year -= 1
                prev_6m_periods.append(f"{year % 100:02d}{month:02d}")
            
            # 각 아이템별로 재고주수 계산
            for item_key in ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '신발', '모자', '가방', '기타ACC']:
                stock_price = monthly_inventory_data[period][item_key]['stock_price']
                
                # 직전 6개월 매출 계산
                gross_sales_6m = 0
                for prev_period in prev_6m_periods:
                    if prev_period in periods:
                        prev_period_data = [row for row in data 
                                          if row['Period'] == prev_period 
                                          and row['Brand'] == 'MLB']
                        
                        for row in prev_period_data:
                            season_code = row['Season_Code']
                            category = row['Category']
                            
                            # 아이템별 필터링
                            if item_key == 'F당시즌':
                                # 1~6월은 전년 시즌(24F), 7~12월은 현재 시즌(25F)
                                if period_year and period_month:
                                    if period_month <= 6:
                                        prev_season_f = f"{(period_year - 1) % 100:02d}F"
                                        if season_code == prev_season_f:
                                            gross_sales_6m += float(row['Gross_Sales'] or 0)
                                    else:
                                        if season_code == current_season_f:
                                            gross_sales_6m += float(row['Gross_Sales'] or 0)
                            elif item_key == 'S당시즌' and season_code == current_season_s:
                                gross_sales_6m += float(row['Gross_Sales'] or 0)
                            elif item_key == '과시즌FW':
                                # F당시즌에 포함되지 않은 F로 끝나는 시즌만
                                if period_year and period_month:
                                    if period_month <= 6:
                                        prev_season_f = f"{(period_year - 1) % 100:02d}F"
                                        if season_code.endswith('F') and season_code != prev_season_f:
                                            gross_sales_6m += float(row['Gross_Sales'] or 0)
                                    else:
                                        if season_code.endswith('F') and season_code != current_season_f:
                                            gross_sales_6m += float(row['Gross_Sales'] or 0)
                            elif item_key == '과시즌SS' and season_code.endswith('S'):
                                gross_sales_6m += float(row['Gross_Sales'] or 0)
                            elif item_key in ['신발', '모자', '가방', '기타ACC'] and season_code.endswith('N'):
                                acc_category = get_acc_category(category)
                                if item_key == acc_category:
                                    gross_sales_6m += float(row['Gross_Sales'] or 0)
                
                # 재고주수 계산 (주 단위) - 최근 1개월 매출 기준
                # 해당 월의 매출 계산
                monthly_sales = 0
                period_data = [row for row in data 
                              if row['Period'] == period 
                              and row['Brand'] == 'MLB']
                
                for row in period_data:
                    season_code = row['Season_Code']
                    category = row['Category']
                    
                    # 아이템별 필터링
                    if item_key == 'F당시즌':
                        if period_year and period_month:
                            if period_month <= 6:
                                prev_season_f = f"{(period_year - 1) % 100:02d}F"
                                if season_code == prev_season_f:
                                    monthly_sales += float(row['Gross_Sales'] or 0)
                            else:
                                if season_code == current_season_f:
                                    monthly_sales += float(row['Gross_Sales'] or 0)
                    elif item_key == 'S당시즌' and season_code == current_season_s:
                        monthly_sales += float(row['Gross_Sales'] or 0)
                    elif item_key == '과시즌FW':
                        if period_year and period_month:
                            if period_month <= 6:
                                prev_season_f = f"{(period_year - 1) % 100:02d}F"
                                if season_code.endswith('F') and season_code != prev_season_f:
                                    monthly_sales += float(row['Gross_Sales'] or 0)
                            else:
                                if season_code.endswith('F') and season_code != current_season_f:
                                    monthly_sales += float(row['Gross_Sales'] or 0)
                    elif item_key == '과시즌SS' and season_code.endswith('S'):
                        monthly_sales += float(row['Gross_Sales'] or 0)
                    elif item_key in ['신발', '모자', '가방', '기타ACC'] and season_code.endswith('N'):
                        acc_category = get_acc_category(category)
                        if item_key == acc_category:
                            monthly_sales += float(row['Gross_Sales'] or 0)
                
                # 재고주수 = (재고금액 / 해당 월 매출) * 4주
                if monthly_sales > 0:
                    stock_weeks = (stock_price / monthly_sales) * 4
                    monthly_inventory_data[period][item_key]['stock_weeks'] = round(stock_weeks, 1)
                else:
                    monthly_inventory_data[period][item_key]['stock_weeks'] = 0
    
    # 재고 YOY 데이터 계산
    print("재고 YOY 데이터 계산 중...")
    monthly_inventory_yoy = defaultdict(list)
    
    # 전년 데이터 준비
    prev_monthly_inventory_data = defaultdict(lambda: {
        'period': '',
        'F당시즌': {'stock_price': 0, 'stock_weeks': 0},
        'S당시즌': {'stock_price': 0, 'stock_weeks': 0},
        '과시즌FW': {'stock_price': 0, 'stock_weeks': 0},
        '과시즌SS': {'stock_price': 0, 'stock_weeks': 0},
        '신발': {'stock_price': 0, 'stock_weeks': 0},
        '모자': {'stock_price': 0, 'stock_weeks': 0},
        '가방': {'stock_price': 0, 'stock_weeks': 0},
        '기타ACC': {'stock_price': 0, 'stock_weeks': 0},
    })
    
    # 전년 Period별 재고 데이터 집계
    for period in recent_periods:
        period_year, period_month = parse_period(period)
        if period_year and period_month:
            prev_period_for_yoy = f"{(period_year - 1) % 100:02d}{period_month:02d}"
            if prev_period_for_yoy in periods:
                period_data = [row for row in data if row['Period'] == prev_period_for_yoy and row['Brand'] == 'MLB']
                prev_monthly_inventory_data[prev_period_for_yoy]['period'] = prev_period_for_yoy
                
                for row in period_data:
                    season_code = row['Season_Code']
                    category = row['Category']
                    stock_price = float(row['Stock_Price'] or 0)
                    
                    # F당시즌: 1~6월은 전년 전년 시즌(23F), 7~12월은 전년 시즌(24F)
                    if period_year and period_month:
                        if period_month <= 6:
                            # 1~6월: 전년 전년 시즌 F (23F)
                            prev_prev_season_f = f"{(period_year - 2) % 100:02d}F"
                            if season_code == prev_prev_season_f:
                                prev_monthly_inventory_data[prev_period_for_yoy]['F당시즌']['stock_price'] += stock_price
                                continue  # F당시즌에 포함되었으므로 다음 행으로
                        else:
                            # 7~12월: 전년 시즌 F (24F)
                            prev_season_f = f"{(period_year - 1) % 100:02d}F"
                            if season_code == prev_season_f:
                                prev_monthly_inventory_data[prev_period_for_yoy]['F당시즌']['stock_price'] += stock_price
                                continue  # F당시즌에 포함되었으므로 다음 행으로
                    
                    # S당시즌 (전년 현재 시즌 S)
                    prev_season_s = f"{(period_year - 1) % 100:02d}S"
                    if season_code == prev_season_s:
                        prev_monthly_inventory_data[prev_period_for_yoy]['S당시즌']['stock_price'] += stock_price
                    # 과시즌FW: F당시즌에 포함되지 않은 F로 끝나는 시즌만
                    elif season_code.endswith('F'):
                        prev_monthly_inventory_data[prev_period_for_yoy]['과시즌FW']['stock_price'] += stock_price
                    # 과시즌SS
                    elif season_code.endswith('S'):
                        prev_monthly_inventory_data[prev_period_for_yoy]['과시즌SS']['stock_price'] += stock_price
                    # 악세 (N시즌, 4개 카테고리)
                    elif season_code.endswith('N'):
                        acc_category = get_acc_category(category)
                        prev_monthly_inventory_data[prev_period_for_yoy][acc_category]['stock_price'] += stock_price
    
    # 전년 재고주수 계산 (전년 매출 기준)
    print("전년 재고주수 계산 중...")
    for period in sorted(recent_periods):
        period_year, period_month = parse_period(period)
        if period_year and period_month:
            prev_period_for_yoy = f"{(period_year - 1) % 100:02d}{period_month:02d}"
            if prev_period_for_yoy in periods:
                # 전년 Period의 매출 데이터
                prev_period_data = [row for row in data if row['Period'] == prev_period_for_yoy and row['Brand'] == 'MLB']
                prev_year, prev_month = parse_period(prev_period_for_yoy)
                
                # 전년 기준 시즌 코드
                prev_season_f = f"{(prev_year - 1) % 100:02d}F" if prev_month <= 6 else f"{prev_year % 100:02d}F"
                prev_season_s = f"{prev_year % 100:02d}S"
                
                for item_key in ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '신발', '모자', '가방', '기타ACC']:
                    prev_stock_price = prev_monthly_inventory_data[prev_period_for_yoy][item_key]['stock_price']
                    
                    # 전년 해당 월 매출 계산 (전년 기준으로 시즌 판단)
                    prev_monthly_sales = 0
                    for row in prev_period_data:
                        season_code = row['Season_Code']
                        category = row['Category']
                        
                        # 아이템별 필터링 (전년 기준)
                        if item_key == 'F당시즌':
                            # 전년의 F당시즌: 전년 1~6월은 전전년F, 7~12월은 전년F
                            if prev_month <= 6:
                                prev_prev_season_f = f"{(prev_year - 2) % 100:02d}F"
                                if season_code == prev_prev_season_f:
                                    prev_monthly_sales += float(row['Gross_Sales'] or 0)
                            else:
                                if season_code == prev_season_f:
                                    prev_monthly_sales += float(row['Gross_Sales'] or 0)
                        elif item_key == 'S당시즌':
                            if season_code == prev_season_s:
                                prev_monthly_sales += float(row['Gross_Sales'] or 0)
                        elif item_key == '과시즌FW':
                            if prev_month <= 6:
                                prev_prev_season_f = f"{(prev_year - 2) % 100:02d}F"
                                if season_code.endswith('F') and season_code != prev_prev_season_f:
                                    prev_monthly_sales += float(row['Gross_Sales'] or 0)
                            else:
                                if season_code.endswith('F') and season_code != prev_season_f:
                                    prev_monthly_sales += float(row['Gross_Sales'] or 0)
                        elif item_key == '과시즌SS' and season_code.endswith('S'):
                            prev_monthly_sales += float(row['Gross_Sales'] or 0)
                        elif item_key in ['신발', '모자', '가방', '기타ACC'] and season_code.endswith('N'):
                            acc_category = get_acc_category(category)
                            if item_key == acc_category:
                                prev_monthly_sales += float(row['Gross_Sales'] or 0)
                    
                    # 전년 재고주수 계산
                    if prev_monthly_sales > 0:
                        prev_stock_weeks = (prev_stock_price / prev_monthly_sales) * 4
                        prev_monthly_inventory_data[prev_period_for_yoy][item_key]['stock_weeks'] = round(prev_stock_weeks, 1)
    
    # YOY 계산 (아이템별 + 전체합계)
    item_keys = ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '신발', '모자', '가방', '기타ACC']
    for period in sorted(recent_periods):
        period_year, period_month = parse_period(period)
        if period_year and period_month:
            prev_period_for_yoy = f"{(period_year - 1) % 100:02d}{period_month:02d}"
            
            for item_key in item_keys:
                current_stock = monthly_inventory_data[period][item_key]['stock_price']
                prev_stock = prev_monthly_inventory_data.get(prev_period_for_yoy, {}).get(item_key, {}).get('stock_price', 0)
                
                if prev_stock > 0:
                    yoy = (current_stock / prev_stock) * 100
                    monthly_inventory_yoy[item_key].append(round(yoy))
                else:
                    # 전년 데이터가 없으면 null (None)
                    monthly_inventory_yoy[item_key].append(None)

            # 전체합계 YOY (F/S + 과시즌 + ACC 전체)
            current_total = sum(
                monthly_inventory_data[period][key]['stock_price'] for key in item_keys
            )
            prev_total = 0
            if prev_period_for_yoy in prev_monthly_inventory_data:
                prev_item = prev_monthly_inventory_data[prev_period_for_yoy]
                prev_total = sum(prev_item[key]['stock_price'] for key in item_keys)
            if prev_total > 0:
                total_yoy = (current_total / prev_total) * 100
                monthly_inventory_yoy['전체합계'].append(round(total_yoy))
            else:
                monthly_inventory_yoy['전체합계'].append(None)
    
    # 당시즌F 판매 데이터 계산 (25F vs 24F)
    print("당시즌F 판매 데이터 계산 중...")
    
    # 10월 당시즌F 판매 (25F) - Subcategory_Code 기준
    current_season_f_oct = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'net_sales': 0,
    })
    previous_season_f_oct = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'net_sales': 0,
    })
    
    for row in current_data:
        if row['Season_Code'] == current_season_f:
            subcat_code = row['Subcategory_Code'].strip()
            subcat_name = row['Subcategory'].strip()
            current_season_f_oct[subcat_code]['subcategory_code'] = subcat_code
            current_season_f_oct[subcat_code]['subcategory_name'] = subcat_name
            current_season_f_oct[subcat_code]['net_sales'] += float(row['Net_Sales'] or 0)
    
    for row in prev_data:
        if row['Season_Code'] == previous_season_f:
            subcat_code = row['Subcategory_Code'].strip()
            subcat_name = row['Subcategory'].strip()
            previous_season_f_oct[subcat_code]['subcategory_code'] = subcat_code
            previous_season_f_oct[subcat_code]['subcategory_name'] = subcat_name
            previous_season_f_oct[subcat_code]['net_sales'] += float(row['Net_Sales'] or 0)
    
    # 25F 누적 (7~10월) - 판매율 계산용
    season_f_accumulated_current = defaultdict(lambda: {
        'net_sales': 0,
        'net_acp_p': 0,  # 누적 입고액 (택가)
        'ac_sales_gross': 0,  # 누적 판매액 (택가)
        'stock_price': 0,  # 재고 Tag가
    })
    season_f_accumulated_previous = defaultdict(lambda: {
        'net_sales': 0,
        'net_acp_p': 0,
        'ac_sales_gross': 0,
        'stock_price': 0,
    })
    
    # Subcategory별 누적 데이터
    season_f_subcat_current = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'net_acp_p': 0,  # 누적 입고액
        'ac_sales_gross': 0,  # 누적 판매액
        'stock_price': 0,  # 재고 Tag가
        'gross_sales_total': 0,  # 7~10월 Gross_Sales 합계 (월판매액 계산용)
    })
    season_f_subcat_previous = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'net_acp_p': 0,
        'ac_sales_gross': 0,
        'stock_price': 0,
        'gross_sales_total': 0,
    })
    
    # 7~10월 Period
    season_f_periods_current = [f"{last_year % 100:02d}{m:02d}" for m in range(7, 11)]
    season_f_periods_previous = [f"{prev_year % 100:02d}{m:02d}" for m in range(7, 11)]
    
    # 현재 시즌 누적 데이터 (마지막 Period 기준으로 누적값 사용)
    for row in current_data:
        if row['Season_Code'] == current_season_f:
            season_f_accumulated_current['total']['net_sales'] += float(row['Net_Sales'] or 0)
            season_f_accumulated_current['total']['net_acp_p'] += float(row['Net_AcP_P'] or 0)
            season_f_accumulated_current['total']['ac_sales_gross'] += float(row['AC_Sales_Gross'] or 0)
            season_f_accumulated_current['total']['stock_price'] += float(row['Stock_Price'] or 0)
            
            # Subcategory별
            subcat_code = row['Subcategory_Code'].strip()
            subcat_name = row['Subcategory'].strip()
            season_f_subcat_current[subcat_code]['subcategory_code'] = subcat_code
            season_f_subcat_current[subcat_code]['subcategory_name'] = subcat_name
            season_f_subcat_current[subcat_code]['net_acp_p'] += float(row['Net_AcP_P'] or 0)
            season_f_subcat_current[subcat_code]['ac_sales_gross'] += float(row['AC_Sales_Gross'] or 0)
            season_f_subcat_current[subcat_code]['stock_price'] += float(row['Stock_Price'] or 0)
            season_f_subcat_current[subcat_code]['gross_sales_total'] += float(row['Gross_Sales'] or 0)  # 10월 Gross_Sales
    
    # 7~10월 각 Period의 Gross_Sales 합계 계산
    for period in season_f_periods_current:
        if period in periods:
            period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Season_Code'] == current_season_f]
            for row in period_data:
                subcat_code = row['Subcategory_Code'].strip()
                if subcat_code in season_f_subcat_current:
                    season_f_subcat_current[subcat_code]['gross_sales_total'] += float(row['Gross_Sales'] or 0)
    
    # 전년 시즌 누적 데이터
    for row in prev_data:
        if row['Season_Code'] == previous_season_f:
            season_f_accumulated_previous['total']['net_sales'] += float(row['Net_Sales'] or 0)
            season_f_accumulated_previous['total']['net_acp_p'] += float(row['Net_AcP_P'] or 0)
            season_f_accumulated_previous['total']['ac_sales_gross'] += float(row['AC_Sales_Gross'] or 0)
            season_f_accumulated_previous['total']['stock_price'] += float(row['Stock_Price'] or 0)
            
            # Subcategory별
            subcat_code = row['Subcategory_Code'].strip()
            subcat_name = row['Subcategory'].strip()
            season_f_subcat_previous[subcat_code]['subcategory_code'] = subcat_code
            season_f_subcat_previous[subcat_code]['subcategory_name'] = subcat_name
            season_f_subcat_previous[subcat_code]['net_acp_p'] += float(row['Net_AcP_P'] or 0)
            season_f_subcat_previous[subcat_code]['ac_sales_gross'] += float(row['AC_Sales_Gross'] or 0)
            season_f_subcat_previous[subcat_code]['stock_price'] += float(row['Stock_Price'] or 0)
            season_f_subcat_previous[subcat_code]['gross_sales_total'] += float(row['Gross_Sales'] or 0)  # 10월 Gross_Sales
    
    # 전년 7~10월 각 Period의 Gross_Sales 합계 계산
    for period in season_f_periods_previous:
        if period in periods:
            period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Season_Code'] == previous_season_f]
            for row in period_data:
                subcat_code = row['Subcategory_Code'].strip()
                if subcat_code in season_f_subcat_previous:
                    season_f_subcat_previous[subcat_code]['gross_sales_total'] += float(row['Gross_Sales'] or 0)
    
    # 25S 누적 (1~9월)
    season_s_accumulated_current = defaultdict(lambda: {'net_sales': 0})
    season_s_accumulated_previous = defaultdict(lambda: {'net_sales': 0})
    
    season_s_periods_current = [f"{last_year % 100:02d}{m:02d}" for m in range(1, 10)]
    season_s_periods_previous = [f"{prev_year % 100:02d}{m:02d}" for m in range(1, 10)]
    
    for period in season_s_periods_current:
        if period in periods:
            period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Season_Code'] == current_season_s]
            for row in period_data:
                season_s_accumulated_current['total']['net_sales'] += float(row['Net_Sales'] or 0)
    
    for period in season_s_periods_previous:
        if period in periods:
            period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB' and row['Season_Code'] == previous_season_s]
            for row in period_data:
                season_s_accumulated_previous['total']['net_sales'] += float(row['Net_Sales'] or 0)
    
    # Subcategory_Code별 TOP 5 정렬
    current_season_f_oct_sorted = sorted(current_season_f_oct.items(), key=lambda x: x[1]['net_sales'], reverse=True)[:5]
    previous_season_f_oct_sorted = sorted(previous_season_f_oct.items(), key=lambda x: x[1]['net_sales'], reverse=True)[:5]
    
    # 판매율 계산
    current_acc = season_f_accumulated_current['total']
    previous_acc = season_f_accumulated_previous['total']
    
    current_sales_rate = (current_acc['ac_sales_gross'] / current_acc['net_acp_p'] * 100) if current_acc['net_acp_p'] > 0 else 0
    previous_sales_rate = (previous_acc['ac_sales_gross'] / previous_acc['net_acp_p'] * 100) if previous_acc['net_acp_p'] > 0 else 0
    sales_rate_change = current_sales_rate - previous_sales_rate
    
    # 입고 YOY 계산
    net_acp_p_yoy = (current_acc['net_acp_p'] / previous_acc['net_acp_p'] * 100) if previous_acc['net_acp_p'] > 0 else 0
    ac_sales_gross_yoy = (current_acc['ac_sales_gross'] / previous_acc['ac_sales_gross'] * 100) if previous_acc['ac_sales_gross'] > 0 else 0
    
    # Subcategory별 판매율 및 입고YOY 계산
    subcat_sales_rate = []
    for subcat_code, subcat_data in season_f_subcat_current.items():
        if subcat_data['net_acp_p'] > 0:  # 입고가 있는 것만
            sales_rate = (subcat_data['ac_sales_gross'] / subcat_data['net_acp_p'] * 100) if subcat_data['net_acp_p'] > 0 else 0
            
            # 전년 입고액
            prev_net_acp_p = season_f_subcat_previous.get(subcat_code, {}).get('net_acp_p', 0)
            net_acp_p_yoy_subcat = (subcat_data['net_acp_p'] / prev_net_acp_p * 100) if prev_net_acp_p > 0 else (999 if subcat_data['net_acp_p'] > 0 else 0)
            
            # 누적 판매 YOY 계산 (누적 판매액 기준)
            prev_ac_sales_gross = season_f_subcat_previous.get(subcat_code, {}).get('ac_sales_gross', 0)
            ac_sales_gross_yoy = (subcat_data['ac_sales_gross'] / prev_ac_sales_gross * 100) if prev_ac_sales_gross > 0 else (999 if subcat_data['ac_sales_gross'] > 0 else 0)
            
            # 재고일수 계산 (해당 Period의 Gross_Sales 합계를 월판매액으로 사용)
            months = 4  # 7~10월 = 4개월
            # Gross_Sales 합계를 월평균 판매액으로 사용
            avg_monthly_sales = subcat_data['gross_sales_total'] / months if months > 0 else 0
            stock_days = (subcat_data['stock_price'] / avg_monthly_sales * 30) if avg_monthly_sales > 0 else 0
            
            subcat_sales_rate.append({
                'subcategory_code': subcat_code,
                'subcategory_name': subcat_data['subcategory_name'],
                'net_acp_p': subcat_data['net_acp_p'] / 1000,  # 1K HKD
                'net_acp_p_yoy': net_acp_p_yoy_subcat,
                'ac_sales_gross': subcat_data['ac_sales_gross'] / 1000,  # 1K HKD
                'ac_sales_gross_yoy': ac_sales_gross_yoy,  # 누적 판매 YOY
                'sales_rate': sales_rate,
                'stock_price': subcat_data['stock_price'] / 1000,  # 1K HKD
                'stock_days': stock_days,
            })
    
    # 입고액 높은 순으로 정렬
    subcat_sales_rate_sorted = sorted(subcat_sales_rate, key=lambda x: x['net_acp_p'], reverse=True)
    
    # Country & Channel별 할인율 및 YOY 계산
    for key in country_channel_summary:
        cc = country_channel_summary[key]
        # 할인율 계산
        cc['current']['discount_rate'] = calculate_discount_rate(
            cc['current']['gross_sales'], cc['current']['net_sales']
        )
        cc['previous']['discount_rate'] = calculate_discount_rate(
            cc['previous']['gross_sales'], cc['previous']['net_sales']
        )
        # YOY 계산 (Net Sales 기준)
        if cc['previous']['net_sales'] > 0:
            cc['yoy'] = (cc['current']['net_sales'] / cc['previous']['net_sales']) * 100
        else:
            cc['yoy'] = 0 if cc['current']['net_sales'] == 0 else 999  # 무한대 대신 999로 표시
    
    # 전체 할인율 계산 (제외 매장 제외)
    total_gross_sales_current = sum(
        store['current']['gross_sales'] 
        for code, store in store_summary.items() 
        if code not in EXCLUDED_STORES and code != 'M10A'
    )
    total_gross_sales_previous = sum(
        store['previous']['gross_sales'] 
        for code, store in store_summary.items() 
        if code not in EXCLUDED_STORES and code != 'M10A'
    )
    total_discount_rate_current = calculate_discount_rate(total_gross_sales_current, total_net_sales_current)
    total_discount_rate_previous = calculate_discount_rate(total_gross_sales_previous, total_net_sales_previous)
    total_discount_rate_change = total_discount_rate_current - total_discount_rate_previous
    
    # ============================================================
    # 과시즌 정체재고 분석
    # ============================================================
    print("과시즌 정체재고 분석 중...")
    
    # 과거 10개월 Period 계산 (참고용 - 누적 매출 집계용)
    recent_10m_periods = sorted([p for p in periods if p <= last_period and p >= f"{last_year % 100:02d}01"])[:10]
    print(f"  - 10개월 기간 (참고용): {recent_10m_periods[0] if recent_10m_periods else 'N/A'} ~ {recent_10m_periods[-1] if recent_10m_periods else 'N/A'}")
    
    # Subcategory별 당월(last_period) 택가매출/실판매출 집계 (정체재고 판단용)
    subcategory_current_gross_sales = defaultdict(lambda: defaultdict(float))
    subcategory_current_net_sales = defaultdict(lambda: defaultdict(float))
    current_period_data = [row for row in data 
                          if row['Period'] == last_period 
                          and row['Brand'] == 'MLB'
                          and row['Season_Code'].endswith('F')]  # FW 시즌 전체 (당시즌+과시즌)
    print(f"  - 당월 FW 시즌 데이터: {len(current_period_data)}건")
    for row in current_period_data:
        subcat_code = row.get('Subcategory_Code', '').strip()
        season_code = row.get('Season_Code', '').strip()
        if subcat_code and season_code:
            gross_sales = float(row.get('Gross_Sales', 0) or 0)
            net_sales = float(row.get('Net_Sales', 0) or 0)
            subcategory_current_gross_sales[subcat_code][season_code] += gross_sales
            subcategory_current_net_sales[subcat_code][season_code] += net_sales
    
    # 디버그: 몇 개의 시즌별 매출이 집계되었는지 확인
    total_seasons = sum(len(seasons) for seasons in subcategory_current_gross_sales.values())
    print(f"  - 집계된 Subcategory+Season 조합: {total_seasons}개")
    
    # 디버그: 24F 총 매출 확인
    total_24f_gross = sum(subcategory_current_gross_sales.get(sc, {}).get('24F', 0) for sc in subcategory_current_gross_sales.keys())
    print(f"  - 24F 총 당월 택가매출: {total_24f_gross:,.0f} HKD")
    
    # Subcategory별 시즌별 과거 10개월 실판/택가 판매금액 집계 (참고용 - 표시용)
    subcategory_season_10m_sales = defaultdict(lambda: defaultdict(float))
    subcategory_season_10m_gross_sales = defaultdict(lambda: defaultdict(float))
    for period in recent_10m_periods:
        period_data = [row for row in data 
                      if row['Period'] == period 
                      and row['Brand'] == 'MLB'
                      and row['Season_Code'].endswith('F')]  # 과시즌 FW만
        for row in period_data:
            subcat_code = row.get('Subcategory_Code', '').strip()
            season_code = row.get('Season_Code', '').strip()
            if subcat_code and season_code:
                net_sales = float(row.get('Net_Sales', 0) or 0)
                gross_sales = float(row.get('Gross_Sales', 0) or 0)
                subcategory_season_10m_sales[subcat_code][season_code] += net_sales
                subcategory_season_10m_gross_sales[subcat_code][season_code] += gross_sales
    
    # 현재 시점의 Subcategory별 택가 재고금액 집계 (과시즌 FW만)
    subcategory_stock = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'season_code': '',
        'stock_price': 0,
        'sales_10m': 0,  # 실판 매출
        'gross_sales_10m': 0,  # 택가 매출
    })
    
    for row in current_data:
        season_code = row['Season_Code']
        # 과시즌 FW만
        if season_code.endswith('F') and len(season_code) >= 2:
            try:
                season_year = int(season_code[:2])
                # 과시즌만 (24F 이하)
                if season_year < last_year % 100:
                    subcat_code = row.get('Subcategory_Code', '').strip()
                    subcat_name = row.get('Subcategory', '').strip()
                    if subcat_code:
                        stock_price = float(row.get('Stock_Price', 0) or 0)
                        # 당월 택가매출/실판매출 (정체재고 판단용 및 표시용)
                        current_gross_sales = subcategory_current_gross_sales.get(subcat_code, {}).get(season_code, 0)
                        current_net_sales = subcategory_current_net_sales.get(subcat_code, {}).get(season_code, 0)
                        
                        # 정체재고 기준: 당월 택가매출 < 기말재고 × 0.05 (5%)
                        # 또는 재고는 있는데 판매가 0인 경우
                        is_stagnant = False
                        if stock_price > 0:
                            if current_gross_sales == 0:
                                is_stagnant = True  # 판매 0 = 정체재고
                            elif current_gross_sales < stock_price * 0.05:
                                is_stagnant = True  # 매출/재고 비율 < 5%
                        
                        if is_stagnant:
                            key = f"{subcat_code}_{season_code}"
                            subcategory_stock[key]['subcategory_code'] = subcat_code
                            subcategory_stock[key]['subcategory_name'] = subcat_name
                            subcategory_stock[key]['season_code'] = season_code
                            subcategory_stock[key]['stock_price'] += stock_price
                            subcategory_stock[key]['current_net_sales'] = current_net_sales  # 당월 실판매출
                            subcategory_stock[key]['current_gross_sales'] = current_gross_sales  # 당월 택가매출
            except ValueError:
                continue
    
    # 시즌별로 분류 (24F, 23F, 22F~)
    stagnant_inventory = {
        '24F': [],
        '23F': [],
        '22F~': []
    }
    
    for key, item in subcategory_stock.items():
        season_code = item['season_code']
        if len(season_code) >= 2:
            try:
                season_year = int(season_code[:2])
                # 재고일수 = (택가 재고 / 당월 택가 매출) × 30일 (1개월 기준)
                # 판매가 0이면 None으로 표시 (UI에서 "-"로 표시)
                if item['current_gross_sales'] > 0 and item['stock_price'] > 0:
                    stock_days = (item['stock_price'] / item['current_gross_sales']) * 30
                else:
                    stock_days = None
                
                # 할인율 = (1 - 실판매출 / 택가매출) × 100 (당월 기준)
                # 택가매출이 0이면 None으로 표시
                if item['current_gross_sales'] > 0:
                    discount_rate = (1 - item['current_net_sales'] / item['current_gross_sales']) * 100
                else:
                    discount_rate = None
                
                stagnant_item = {
                    'subcategory_code': item['subcategory_code'],
                    'subcategory_name': item['subcategory_name'],
                    'season_code': season_code,
                    'stock_price': round(item['stock_price'], 0),  # HKD (택가 재고)
                    'current_net_sales': round(item['current_net_sales'], 0),  # HKD (당월 실판 매출)
                    'current_gross_sales': round(item['current_gross_sales'], 0),  # HKD (당월 택가 매출)
                    'discount_rate': round(discount_rate, 1) if discount_rate is not None else None,  # 할인율 (%)
                    'stock_days': round(stock_days, 0) if stock_days is not None else None,  # 재고일수 (당월 기준, 30일)
                }
                
                if season_year == 24:
                    stagnant_inventory['24F'].append(stagnant_item)
                elif season_year == 23:
                    stagnant_inventory['23F'].append(stagnant_item)
                else:
                    stagnant_inventory['22F~'].append(stagnant_item)
            except ValueError:
                continue
    
    # 재고금액 많은 순으로 정렬
    for season_key in stagnant_inventory:
        stagnant_inventory[season_key].sort(key=lambda x: x['stock_price'], reverse=True)
    
    print(f"  - 24F 정체재고: {len(stagnant_inventory['24F'])}개")
    print(f"  - 23F 정체재고: {len(stagnant_inventory['23F'])}개")
    print(f"  - 22F~ 정체재고: {len(stagnant_inventory['22F~'])}개")
    
    # ============================================================
    # 전체 과시즌F 재고 분석 (시즌별 전체 데이터)
    # ============================================================
    print("전체 과시즌F 재고 데이터 생성 중...")
    
    # 전체 과시즌F 재고 (정체재고 기준 없음, 모든 과시즌F 포함)
    all_past_season_inventory = defaultdict(lambda: {
        'subcategory_code': '',
        'subcategory_name': '',
        'season_code': '',
        'stock_price': 0,
        'current_net_sales': 0,  # 당월 실판 매출
        'current_gross_sales': 0,  # 당월 택가 매출
        'discount_rate': None,
        'stock_days': None,
    })
    
    for row in current_data:
        season_code = row['Season_Code']
        # 과시즌 FW만
        if season_code.endswith('F') and len(season_code) >= 2:
            try:
                season_year = int(season_code[:2])
                # 과시즌만 (24F 이하)
                if season_year < last_year % 100:
                    subcat_code = row.get('Subcategory_Code', '').strip()
                    subcat_name = row.get('Subcategory', '').strip()
                    if subcat_code:
                        stock_price = float(row.get('Stock_Price', 0) or 0)
                        
                        if stock_price > 0:
                            key = f"{subcat_code}_{season_code}"
                            
                            # 초기화
                            if all_past_season_inventory[key]['subcategory_code'] == '':
                                all_past_season_inventory[key]['subcategory_code'] = subcat_code
                                all_past_season_inventory[key]['subcategory_name'] = subcat_name
                                all_past_season_inventory[key]['season_code'] = season_code
                            
                            # 재고금액 누적
                            all_past_season_inventory[key]['stock_price'] += stock_price
                            
                            # 당월 매출 정보 (subcategory+season 조합)
                            current_gross = subcategory_current_gross_sales.get(subcat_code, {}).get(season_code, 0)
                            current_net = subcategory_current_net_sales.get(subcat_code, {}).get(season_code, 0)
                            all_past_season_inventory[key]['current_net_sales'] = current_net
                            all_past_season_inventory[key]['current_gross_sales'] = current_gross
            except ValueError:
                continue
    
    # 재고일수와 할인율 계산 (모든 항목에 대해, 당월 기준)
    for key, item in all_past_season_inventory.items():
        current_gross = item['current_gross_sales']
        current_net = item['current_net_sales']
        stock_price = item['stock_price']
        
        # 할인율 계산 (당월 기준)
        if current_gross > 0:
            discount_rate = ((current_gross - current_net) / current_gross) * 100
            item['discount_rate'] = discount_rate
        else:
            item['discount_rate'] = None
        
        # 재고일수 계산 (당월 기준, 30일)
        if current_gross > 0 and stock_price > 0:
            stock_days = (stock_price / current_gross) * 30
            item['stock_days'] = stock_days
        else:
            item['stock_days'] = None
    
    # 시즌별로 분류 (24F, 23F, 22F~)
    all_past_season_by_year = {
        '24F': [],
        '23F': [],
        '22F~': []
    }
    
    for key, item in all_past_season_inventory.items():
        season_code = item['season_code']
        if len(season_code) >= 2:
            try:
                season_year = int(season_code[:2])
                if season_year == (last_year % 100) - 1:  # 24F
                    all_past_season_by_year['24F'].append(item)
                elif season_year == (last_year % 100) - 2:  # 23F
                    all_past_season_by_year['23F'].append(item)
                else:  # 22F~
                    all_past_season_by_year['22F~'].append(item)
            except ValueError:
                continue
    
    # 재고금액 많은 순으로 정렬
    for season_key in all_past_season_by_year:
        all_past_season_by_year[season_key].sort(key=lambda x: x['stock_price'], reverse=True)
        print(f"  - {season_key} 전체 재고: {len(all_past_season_by_year[season_key])}개")
    
    # ============================================================
    # 매장 상세 대시보드용 추가 집계
    # ============================================================
    print("매장 상세 대시보드용 데이터 생성 중...")
    
    # 1. 매장별 월별 추세 (1~10월)
    store_monthly_trends = defaultdict(list)
    
    # 현재 년도 1~10월 데이터
    for period in sorted(periods):
        year, month = parse_period(period)
        if not year or not month or year != last_year or month > last_month:
            continue
        
        period_data = [row for row in data if row['Period'] == period and row['Brand'] == 'MLB']
        store_sales_current = defaultdict(float)
        
        for row in period_data:
            store_code = row['Store_Code']
            net_sales = float(row.get('Net_Sales', 0) or 0)
            store_sales_current[store_code] += net_sales
        
        # 전년 동월 데이터
        prev_period_str = f"{(year-1) % 100:02d}{month:02d}"
        prev_period_data = [row for row in data if row['Period'] == prev_period_str and row['Brand'] == 'MLB']
        store_sales_previous = defaultdict(float)
        
        for row in prev_period_data:
            store_code = row['Store_Code']
            net_sales = float(row.get('Net_Sales', 0) or 0)
            store_sales_previous[store_code] += net_sales
        
        # 각 매장별 데이터 저장
        for store_code in store_sales_current:
            yoy = 0
            if store_sales_previous[store_code] > 0:
                yoy = round((store_sales_current[store_code] / store_sales_previous[store_code]) * 100)
            
            store_monthly_trends[store_code].append({
                'month': month,
                'net_sales': round(store_sales_current[store_code] / 1000, 1),  # 1K HKD
                'yoy': yoy
            })
    
    # 2. 매장별 아이템 전체 (서브카테고리 기준, 합계 포함)
    store_item_sales = defaultdict(lambda: defaultdict(float))
    store_item_yoy = defaultdict(lambda: defaultdict(float))
    
    # 현재 Period - Subcategory_Code 기준
    for row in current_data:
        store_code = row['Store_Code']
        subcat_code = row.get('Subcategory_Code', '').strip()
        if not subcat_code:
            continue
        net_sales = float(row.get('Net_Sales', 0) or 0)
        store_item_sales[store_code][subcat_code] += net_sales
    
    # 전년 Period - Subcategory_Code 기준
    for row in prev_data:
        store_code = row['Store_Code']
        subcat_code = row.get('Subcategory_Code', '').strip()
        if not subcat_code:
            continue
        net_sales_prev = float(row.get('Net_Sales', 0) or 0)
        
        if subcat_code in store_item_sales[store_code] and net_sales_prev > 0:
            current_sales = store_item_sales[store_code][subcat_code]
            store_item_yoy[store_code][subcat_code] = round((current_sales / net_sales_prev) * 100)
    
    # 전체 아이템 추출 (서브카테고리 기준, 합계 포함)
    store_item_all = {}
    for store_code, items in store_item_sales.items():
        total_sales = sum(items.values())
        item_list = [
            {
                'item_name': subcat_code,  # 서브카테고리 코드 그대로 사용
                'net_sales': round(sales / 1000, 1),  # 1K HKD
                'yoy': store_item_yoy[store_code].get(subcat_code, 0)
            }
            for subcat_code, sales in sorted(items.items(), key=lambda x: x[1], reverse=True)
        ]
        # 합계 추가
        total_prev = sum(
            (sales * 100) / store_item_yoy[store_code].get(subcat_code, 100) 
            if store_item_yoy[store_code].get(subcat_code, 0) > 0 else 0
            for subcat_code, sales in items.items()
        )
        total_yoy = round((total_sales / total_prev) * 100) if total_prev > 0 else 0
        item_list.append({
            'item_name': '합계',
            'net_sales': round(total_sales / 1000, 1),
            'yoy': total_yoy
        })
        store_item_all[store_code] = item_list
    
    # 3. 아이템별 매장 TOP5 (서브카테고리 기준)
    item_store_sales = defaultdict(lambda: defaultdict(float))
    item_store_yoy = defaultdict(lambda: defaultdict(float))
    
    # 현재 Period - Subcategory_Code 기준
    for row in current_data:
        store_code = row['Store_Code']
        subcat_code = row.get('Subcategory_Code', '').strip()
        if not subcat_code:
            continue
        net_sales = float(row.get('Net_Sales', 0) or 0)
        item_store_sales[subcat_code][store_code] += net_sales
    
    # 전년 Period - Subcategory_Code 기준
    for row in prev_data:
        store_code = row['Store_Code']
        subcat_code = row.get('Subcategory_Code', '').strip()
        if not subcat_code:
            continue
        net_sales_prev = float(row.get('Net_Sales', 0) or 0)
        
        if store_code in item_store_sales[subcat_code] and net_sales_prev > 0:
            current_sales = item_store_sales[subcat_code][store_code]
            item_store_yoy[subcat_code][store_code] = round((current_sales / net_sales_prev) * 100)
    
    # TOP5 추출 (서브카테고리별, 합계 포함)
    item_store_top5 = {}
    for subcat_code, stores in item_store_sales.items():
        top5 = sorted(stores.items(), key=lambda x: x[1], reverse=True)[:5]
        store_list = [
            {
                'store_code': store_code,
                'store_name': store_summary.get(store_code, {}).get('store_name', store_code),
                'net_sales': round(sales / 1000, 1),  # 1K HKD
                'yoy': item_store_yoy[subcat_code].get(store_code, 0)
            }
            for store_code, sales in top5
        ]
        # 합계 추가
        total_sales = sum(stores.values())
        total_prev = sum(
            (sales * 100) / item_store_yoy[subcat_code].get(store_code, 100)
            if item_store_yoy[subcat_code].get(store_code, 0) > 0 else 0
            for store_code, sales in stores.items()
        )
        total_yoy = round((total_sales / total_prev) * 100) if total_prev > 0 else 0
        store_list.append({
            'store_code': 'TOTAL',
            'store_name': '합계',
            'net_sales': round(total_sales / 1000, 1),
            'yoy': total_yoy
        })
        item_store_top5[subcat_code] = store_list
    
    # 결과 정리
    # prev_period가 올바르게 계산되었는지 확인 및 수정
    # 2510의 전년 동월은 2410이어야 함 (2025년 10월 -> 2024년 10월)
    # 전년 동월 = (last_year - 1)년 last_month월
    prev_period_correct = f"{(last_year - 1) % 100:02d}{last_month:02d}"
    if prev_period != prev_period_correct:
        prev_period = prev_period_correct
    
    # 월 이름 매핑
    month_names = {
        1: 'january', 2: 'february', 3: 'march', 4: 'april', 5: 'may', 6: 'june',
        7: 'july', 8: 'august', 9: 'september', 10: 'october', 11: 'november', 12: 'december'
    }
    
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
            'same_store_details': same_store_summary.get('details', {'included': [], 'excluded': []}),
            'total_discount_rate': total_discount_rate_current,
            'total_discount_rate_previous': total_discount_rate_previous,
            'total_discount_rate_change': total_discount_rate_change,
            'sales_per_store': {
                'current': sales_per_store_current / 1000,  # 1K HKD 단위
                'previous': sales_per_store_previous / 1000,  # 1K HKD 단위
                'yoy': sales_per_store_yoy,
                'change': sales_per_store_change / 1000,  # 1K HKD 단위
                'store_count_current': store_count_current,
                'store_count_previous': store_count_previous,
            },
        },
        'country_channel_summary': dict(country_channel_summary),
        'offline_store_efficiency': {
            'total': {
                'current': {
                    'store_count': offline_total_current['store_count'],
                    'sales_per_store': offline_total_current['sales_per_store'] / 1000,  # 1K HKD
                },
                'previous': {
                    'store_count': offline_total_previous['store_count'],
                    'sales_per_store': offline_total_previous['sales_per_store'] / 1000,  # 1K HKD
                },
                'yoy': offline_total_yoy,
            },
            'by_channel': dict(offline_channel_summary),
        },
        'season_sales': {
            'current_season_f': {
                'season_code': current_season_f,
                **({  # 현재 월에 맞는 키로 동적 생성
                    month_names.get(last_month, 'october'): {
                        'total_net_sales': sum(cat['net_sales'] for cat in current_season_f_oct.values()) / 1000,  # 1K HKD
                        'subcategory_top5': [
                            {
                                'subcategory_code': subcat_code,
                                'subcategory_name': data['subcategory_name'],
                                'net_sales': data['net_sales'] / 1000,  # 1K HKD
                            }
                            for subcat_code, data in current_season_f_oct_sorted
                        ],
                    }
                } if last_month else {'october': {
                    'total_net_sales': sum(cat['net_sales'] for cat in current_season_f_oct.values()) / 1000,
                    'subcategory_top5': [
                        {
                            'subcategory_code': subcat_code,
                            'subcategory_name': data['subcategory_name'],
                            'net_sales': data['net_sales'] / 1000,
                        }
                        for subcat_code, data in current_season_f_oct_sorted
                    ],
                }}),
                'accumulated': {
                    'total_net_sales': season_f_accumulated_current['total']['net_sales'] / 1000,  # 1K HKD
                    'periods': f"{last_year}년 7~10월",
                    'net_acp_p': season_f_accumulated_current['total']['net_acp_p'] / 1000,  # 누적 입고액 (1K HKD)
                    'ac_sales_gross': season_f_accumulated_current['total']['ac_sales_gross'] / 1000,  # 누적 판매액 (1K HKD)
                    'stock_price': season_f_accumulated_current['total']['stock_price'] / 1000,  # 재고 Tag가 (1K HKD)
                    'sales_rate': current_sales_rate,
                    'sales_rate_change': sales_rate_change,
                    'net_acp_p_yoy': net_acp_p_yoy,
                    'ac_sales_gross_yoy': ac_sales_gross_yoy,
                    'subcategory_detail': subcat_sales_rate_sorted,
                },
            },
            'previous_season_f': {
                'season_code': previous_season_f,
                **({  # 전년 동월에 맞는 키로 동적 생성
                    month_names.get(last_month, 'october'): {
                        'total_net_sales': sum(cat['net_sales'] for cat in previous_season_f_oct.values()) / 1000,  # 1K HKD
                        'subcategory_top5': [
                            {
                                'subcategory_code': subcat_code,
                                'subcategory_name': data['subcategory_name'],
                                'net_sales': data['net_sales'] / 1000,  # 1K HKD
                            }
                            for subcat_code, data in previous_season_f_oct_sorted
                        ],
                        'subcategory_detail': [
                            {
                                'subcategory_code': subcat_code,
                                'subcategory_name': data['subcategory_name'],
                                'net_sales': data['net_sales'] / 1000,  # 1K HKD
                            }
                            for subcat_code, data in previous_season_f_oct.items()
                        ],
                    }
                } if last_month else {'october': {
                    'total_net_sales': sum(cat['net_sales'] for cat in previous_season_f_oct.values()) / 1000,
                    'subcategory_top5': [
                        {
                            'subcategory_code': subcat_code,
                            'subcategory_name': data['subcategory_name'],
                            'net_sales': data['net_sales'] / 1000,
                        }
                        for subcat_code, data in previous_season_f_oct_sorted
                    ],
                    'subcategory_detail': [
                        {
                            'subcategory_code': subcat_code,
                            'subcategory_name': data['subcategory_name'],
                            'net_sales': data['net_sales'] / 1000,
                        }
                        for subcat_code, data in previous_season_f_oct.items()
                    ],
                }}),
                'accumulated': {
                    'total_net_sales': season_f_accumulated_previous['total']['net_sales'] / 1000,  # 1K HKD
                    'periods': f"{prev_year}년 7~10월",
                    'net_acp_p': season_f_accumulated_previous['total']['net_acp_p'] / 1000,  # 누적 입고액 (1K HKD)
                    'ac_sales_gross': season_f_accumulated_previous['total']['ac_sales_gross'] / 1000,  # 누적 판매액 (1K HKD)
                    'stock_price': season_f_accumulated_previous['total']['stock_price'] / 1000,  # 재고 Tag가 (1K HKD)
                    'sales_rate': previous_sales_rate,
                },
            },
            'current_season_s': {
                'season_code': current_season_s,
                'accumulated': {
                    'total_net_sales': season_s_accumulated_current['total']['net_sales'] / 1000,  # 1K HKD
                    'periods': f"{last_year}년 1~9월",
                },
            },
            'previous_season_s': {
                'season_code': previous_season_s,
                'accumulated': {
                    'total_net_sales': season_s_accumulated_previous['total']['net_sales'] / 1000,  # 1K HKD
                    'periods': f"{prev_year}년 1~9월",
                },
            },
        },
        'store_summary': dict(store_summary),
        'season_summary': dict(season_summary),
        'category_summary': dict(category_summary),
        'acc_sales_data': {
            'current': {
                'total': {
                    'gross_sales': acc_sales_data['current']['total']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': acc_sales_data['current']['total']['net_sales'] / 1000,  # 1K HKD
                    'sales_qty': acc_sales_data['current']['total']['sales_qty'],
                },
                'categories': {
                    '신발': {
                        'gross_sales': acc_sales_data['current']['categories']['신발']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['current']['categories']['신발']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['current']['categories']['신발']['sales_qty'],
                        'top5': sorted(
                            [
                                {
                                    'subcategory_code': subcat_code,
                                    'subcategory_name': subcat_data.get('subcategory_name', subcat_code),
                                    'net_sales': subcat_data['net_sales'] / 1000,
                                    'gross_sales': subcat_data['gross_sales'] / 1000,
                                    'sales_qty': subcat_data['sales_qty'],
                                    'stock_price': subcat_data['stock_price'] / 1000,
                                    'is_stagnant': (subcat_data['gross_sales'] < subcat_data['stock_price'] * 0.001) if subcat_data['stock_price'] > 0 else False,
                                    'sales_to_stock_ratio': (subcat_data['gross_sales'] / subcat_data['stock_price'] * 100) if subcat_data['stock_price'] > 0 else 0,
                                }
                                for subcat_code, subcat_data in acc_sales_data['current']['categories']['신발']['subcategories'].items()
                            ],
                            key=lambda x: x['net_sales'],
                            reverse=True
                        )[:5]
                    },
                    '모자': {
                        'gross_sales': acc_sales_data['current']['categories']['모자']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['current']['categories']['모자']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['current']['categories']['모자']['sales_qty'],
                        'top5': sorted(
                            [
                                {
                                    'subcategory_code': subcat_code,
                                    'subcategory_name': subcat_data.get('subcategory_name', subcat_code),
                                    'net_sales': subcat_data['net_sales'] / 1000,
                                    'gross_sales': subcat_data['gross_sales'] / 1000,
                                    'sales_qty': subcat_data['sales_qty'],
                                    'stock_price': subcat_data['stock_price'] / 1000,
                                    'is_stagnant': (subcat_data['gross_sales'] < subcat_data['stock_price'] * 0.001) if subcat_data['stock_price'] > 0 else False,
                                    'sales_to_stock_ratio': (subcat_data['gross_sales'] / subcat_data['stock_price'] * 100) if subcat_data['stock_price'] > 0 else 0,
                                }
                                for subcat_code, subcat_data in acc_sales_data['current']['categories']['모자']['subcategories'].items()
                            ],
                            key=lambda x: x['net_sales'],
                            reverse=True
                        )[:5]
                    },
                    '가방': {
                        'gross_sales': acc_sales_data['current']['categories']['가방']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['current']['categories']['가방']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['current']['categories']['가방']['sales_qty'],
                        'top5': sorted(
                            [
                                {
                                    'subcategory_code': subcat_code,
                                    'subcategory_name': subcat_data.get('subcategory_name', subcat_code),
                                    'net_sales': subcat_data['net_sales'] / 1000,
                                    'gross_sales': subcat_data['gross_sales'] / 1000,
                                    'sales_qty': subcat_data['sales_qty'],
                                    'stock_price': subcat_data['stock_price'] / 1000,
                                    'is_stagnant': (subcat_data['gross_sales'] < subcat_data['stock_price'] * 0.001) if subcat_data['stock_price'] > 0 else False,
                                    'sales_to_stock_ratio': (subcat_data['gross_sales'] / subcat_data['stock_price'] * 100) if subcat_data['stock_price'] > 0 else 0,
                                }
                                for subcat_code, subcat_data in acc_sales_data['current']['categories']['가방']['subcategories'].items()
                            ],
                            key=lambda x: x['net_sales'],
                            reverse=True
                        )[:5]
                    },
                    '기타ACC': {
                        'gross_sales': acc_sales_data['current']['categories']['기타ACC']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['current']['categories']['기타ACC']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['current']['categories']['기타ACC']['sales_qty'],
                        'top5': sorted(
                            [
                                {
                                    'subcategory_code': subcat_code,
                                    'subcategory_name': subcat_data.get('subcategory_name', subcat_code),
                                    'net_sales': subcat_data['net_sales'] / 1000,
                                    'gross_sales': subcat_data['gross_sales'] / 1000,
                                    'sales_qty': subcat_data['sales_qty'],
                                    'stock_price': subcat_data['stock_price'] / 1000,
                                    'is_stagnant': (subcat_data['gross_sales'] < subcat_data['stock_price'] * 0.001) if subcat_data['stock_price'] > 0 else False,
                                    'sales_to_stock_ratio': (subcat_data['gross_sales'] / subcat_data['stock_price'] * 100) if subcat_data['stock_price'] > 0 else 0,
                                }
                                for subcat_code, subcat_data in acc_sales_data['current']['categories']['기타ACC']['subcategories'].items()
                            ],
                            key=lambda x: x['net_sales'],
                            reverse=True
                        )[:5]
                    },
                }
            },
            'previous': {
                'total': {
                    'gross_sales': acc_sales_data['previous']['total']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': acc_sales_data['previous']['total']['net_sales'] / 1000,  # 1K HKD
                    'sales_qty': acc_sales_data['previous']['total']['sales_qty'],
                },
                'categories': {
                    '신발': {
                        'gross_sales': acc_sales_data['previous']['categories']['신발']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['previous']['categories']['신발']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['previous']['categories']['신발']['sales_qty'],
                    },
                    '모자': {
                        'gross_sales': acc_sales_data['previous']['categories']['모자']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['previous']['categories']['모자']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['previous']['categories']['모자']['sales_qty'],
                    },
                    '가방': {
                        'gross_sales': acc_sales_data['previous']['categories']['가방']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['previous']['categories']['가방']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['previous']['categories']['가방']['sales_qty'],
                    },
                    '기타ACC': {
                        'gross_sales': acc_sales_data['previous']['categories']['기타ACC']['gross_sales'] / 1000,
                        'net_sales': acc_sales_data['previous']['categories']['기타ACC']['net_sales'] / 1000,
                        'sales_qty': acc_sales_data['previous']['categories']['기타ACC']['sales_qty'],
                    },
                }
            }
        },
        'acc_stock_summary': {
            'total': {
                'current': {
                    'stock_weeks': acc_total_current['stock_weeks'],
                },
                'previous': {
                    'stock_weeks': acc_total_previous['stock_weeks'],
                },
                'stock_weeks_change': acc_total_change,
            },
            'by_category': dict(acc_stock_summary),
            'october_sales': dict(acc_october_sales),
        },
        'ending_inventory': {
            'total': {
                'current': total_ending_inventory_current / 1000,  # 1K HKD
                'previous': total_ending_inventory_previous / 1000,  # 1K HKD
                'yoy': total_ending_inventory_yoy,
            },
            'by_season': dict(ending_inventory),
            'acc_by_category': dict(acc_ending_inventory),
            'past_season_fw': {
                'total': {
                    'current': ending_inventory['과시즌_FW']['current']['stock_price'] / 1000,  # 1K HKD
                    'previous': ending_inventory['과시즌_FW']['previous']['stock_price'] / 1000,  # 1K HKD
                    'yoy': ending_inventory['과시즌_FW'].get('yoy', 0),
                },
                'by_year': past_season_fw_by_year,
                '1year_subcategory': dict(past_season_fw_1year_subcat),
            },
        },
        'stagnant_inventory': stagnant_inventory,
        'all_past_season_inventory': all_past_season_by_year,
        'trend_data': [trend_data[p] for p in sorted(trend_data.keys())],
        'monthly_channel_data': [monthly_channel_data[p] for p in sorted(monthly_channel_data.keys())],
        'monthly_channel_yoy': dict(monthly_channel_yoy),
        'monthly_item_yoy': dict(monthly_item_yoy),
        'monthly_inventory_yoy': dict(monthly_inventory_yoy),
        'monthly_inventory_data': [
            {
                'period': monthly_inventory_data[p]['period'],
                'F당시즌': {
                    'stock_price': monthly_inventory_data[p]['F당시즌']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['F당시즌']['stock_weeks'],
                },
                'S당시즌': {
                    'stock_price': monthly_inventory_data[p]['S당시즌']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['S당시즌']['stock_weeks'],
                },
                '과시즌FW': {
                    'stock_price': monthly_inventory_data[p]['과시즌FW']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['과시즌FW']['stock_weeks'],
                },
                '과시즌SS': {
                    'stock_price': monthly_inventory_data[p]['과시즌SS']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['과시즌SS']['stock_weeks'],
                },
                '모자': {
                    'stock_price': monthly_inventory_data[p]['모자']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['모자']['stock_weeks'],
                },
                '신발': {
                    'stock_price': monthly_inventory_data[p]['신발']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['신발']['stock_weeks'],
                },
                '모자': {
                    'stock_price': monthly_inventory_data[p]['모자']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['모자']['stock_weeks'],
                },
                '가방': {
                    'stock_price': monthly_inventory_data[p]['가방']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['가방']['stock_weeks'],
                },
                '기타ACC': {
                    'stock_price': monthly_inventory_data[p]['기타ACC']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': monthly_inventory_data[p]['기타ACC']['stock_weeks'],
                },
            }
            for p in sorted(monthly_inventory_data.keys())
        ],
        'prev_monthly_inventory_data': [
            {
                'period': prev_monthly_inventory_data[p]['period'],
                'F당시즌': {
                    'stock_price': prev_monthly_inventory_data[p]['F당시즌']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['F당시즌']['stock_weeks'],
                },
                'S당시즌': {
                    'stock_price': prev_monthly_inventory_data[p]['S당시즌']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['S당시즌']['stock_weeks'],
                },
                '과시즌FW': {
                    'stock_price': prev_monthly_inventory_data[p]['과시즌FW']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['과시즌FW']['stock_weeks'],
                },
                '과시즌SS': {
                    'stock_price': prev_monthly_inventory_data[p]['과시즌SS']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['과시즌SS']['stock_weeks'],
                },
                '모자': {
                    'stock_price': prev_monthly_inventory_data[p]['모자']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['모자']['stock_weeks'],
                },
                '신발': {
                    'stock_price': prev_monthly_inventory_data[p]['신발']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['신발']['stock_weeks'],
                },
                '모자': {
                    'stock_price': prev_monthly_inventory_data[p]['모자']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['모자']['stock_weeks'],
                },
                '가방': {
                    'stock_price': prev_monthly_inventory_data[p]['가방']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['가방']['stock_weeks'],
                },
                '기타ACC': {
                    'stock_price': prev_monthly_inventory_data[p]['기타ACC']['stock_price'] / 1000,  # 1K HKD
                    'stock_weeks': prev_monthly_inventory_data[p]['기타ACC']['stock_weeks'],
                },
            }
            for p in sorted(prev_monthly_inventory_data.keys())
        ],
        'monthly_item_data': [
            {
                'period': monthly_item_data[p]['period'],
                # 세분화된 의류 (F/S)
                '당시즌F': {
                    'gross_sales': monthly_item_data[p]['당시즌F']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['당시즌F']['net_sales'] / 1000,  # 1K HKD
                },
                '당시즌S': {
                    'gross_sales': monthly_item_data[p]['당시즌S']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['당시즌S']['net_sales'] / 1000,  # 1K HKD
                },
                '과시즌F': {
                    'gross_sales': monthly_item_data[p]['과시즌F']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['과시즌F']['net_sales'] / 1000,  # 1K HKD
                },
                '과시즌S': {
                    'gross_sales': monthly_item_data[p]['과시즌S']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['과시즌S']['net_sales'] / 1000,  # 1K HKD
                },
                # 레거시 집계 (기존 그래프 호환용)
                '당시즌의류': {
                    'gross_sales': monthly_item_data[p]['당시즌의류']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['당시즌의류']['net_sales'] / 1000,  # 1K HKD
                },
                '과시즌의류': {
                    'gross_sales': monthly_item_data[p]['과시즌의류']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['과시즌의류']['net_sales'] / 1000,  # 1K HKD
                },
                # ACC
                '모자': {
                    'gross_sales': monthly_item_data[p]['모자']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['모자']['net_sales'] / 1000,  # 1K HKD
                },
                '신발': {
                    'gross_sales': monthly_item_data[p]['신발']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['신발']['net_sales'] / 1000,  # 1K HKD
                },
                '가방': {
                    'gross_sales': monthly_item_data[p]['가방']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['가방']['net_sales'] / 1000,  # 1K HKD
                },
                '기타ACC': {
                    'gross_sales': monthly_item_data[p]['기타ACC']['gross_sales'] / 1000,  # 1K HKD
                    'net_sales': monthly_item_data[p]['기타ACC']['net_sales'] / 1000,  # 1K HKD
                },
            }
            for p in sorted(monthly_item_data.keys())
        ],
        'store_monthly_trends': dict(store_monthly_trends),
        'store_item_all': store_item_all,
        'item_store_top5': item_store_top5,
    }
    
    # JSON 저장
    print(f"\n결과 저장 중: {output_file_path}")
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # public 폴더에도 복사
    public_output = output_file_path.replace('components/dashboard', 'public/dashboard')
    os.makedirs(os.path.dirname(public_output), exist_ok=True)
    with open(public_output, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"  복사 완료: {public_output}")
    
    print("\n" + "=" * 80)
    print("완료!")
    print("=" * 80)
    print(f"  - Store 수: {len(store_summary)}")
    print(f"  - 시즌 수: {len(season_summary)}")
    print(f"  - Category 수: {len(category_summary)}")
    print(f"  - 추세 데이터 포인트: {len(trend_data)}")
    print(f"  - 마지막 Period: {last_period}")
    print(f"  - 전년 동월 Period: {prev_period}")
    print("=" * 80)

if __name__ == '__main__':
    import sys
    import traceback
    from datetime import datetime
    
    try:
        # CSV 파일이 있는 디렉토리
        csv_dir = '../Dashboard_Raw_Data'
        
        # 커맨드라인 인자로 period 받기 (기본값: 2511)
        period = sys.argv[1] if len(sys.argv) > 1 else '2511'
        
        output_file = f'components/dashboard/hongkong-dashboard-data-{period}.json'
        
        print("=" * 80)
        print(f"홍콩 대시보드 {period} 데이터 생성")
        print("=" * 80)
        print(f"CSV 디렉토리: {csv_dir}")
        print(f"출력 파일: {output_file}")
        print("=" * 80)
        
        generate_dashboard_data(csv_dir, output_file, target_period=period)
        
        print("\n" + "=" * 80)
        print(f"✅ 홍콩 대시보드 {period} 데이터 생성 완료!")
        print("=" * 80)
    except Exception as e:
        print("\n" + "=" * 80)
        print("❌ 에러 발생!")
        print("=" * 80)
        print(f"에러: {str(e)}")
        print("\n상세 에러:")
        traceback.print_exc()
        print("=" * 80)
        sys.exit(1)

