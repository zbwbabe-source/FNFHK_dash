#!/usr/bin/env python3
"""
2512 홍콩/마카오 손익요약 데이터 생성 (기존 방식 그대로)
"""
import csv
import json
from collections import defaultdict
from datetime import datetime

def clean_number(value):
    """숫자 문자열에서 쉼표와 공백 제거 후 float 변환"""
    if value is None or value == '':
        return 0.0
    value_str = str(value).strip().replace(',', '').replace(' ', '')
    try:
        return float(value_str)
    except ValueError:
        return 0.0

def aggregate_pl_by_period(csv_file, period, country_filter='HK'):
    """특정 Period의 손익 데이터 집계 (실매출액 기반)
    
    country_filter: 'HK' (홍콩+마카오), 'HK_ONLY' (홍콩만), 'MO' (마카오만)
    """
    result = {
        'tag_sales': 0.0,
        'net_sales': 0.0,
        'cogs': 0.0,
        'gross_profit': 0.0,
        'sg_a': 0.0,  # 오피스 판관비 (영업비)
        'operating_profit': 0.0,
        'direct_cost': 0.0,  # 매장 직접비
        'expense_detail': {
            'salary': 0.0,
            'marketing': 0.0,
            'fee': 0.0,
            'rent': 0.0,
            'insurance': 0.0,
            'travel': 0.0,
            'logistics': 0.0,
            'other_fee': 0.0,
            'depreciation': 0.0,
            'maintenance': 0.0,
            'utilities': 0.0,
            'supplies': 0.0,
            'communication': 0.0,
            'uniform': 0.0,
            'duty_free': 0.0
        }
    }
    
    # 먼저 매장별로 비용 집계 (H99/M99 제외)
    store_costs = {}
    office_sga = 0.0  # 오피스 판관비
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Period와 국가 필터
            if row['PERIOD'] != str(period):
                continue
            
            # 국가 필터링
            if country_filter == 'HK':  # 홍콩+마카오 전체
                if row['CNTRY_CD'] not in ['HK', 'MC']:
                    continue
            elif country_filter == 'HK_ONLY':  # 홍콩만
                if row['CNTRY_CD'] != 'HK':
                    continue
            elif country_filter == 'MC':  # 마카오만
                if row['CNTRY_CD'] != 'MC':
                    continue
            else:  # 특정 국가 코드
                if row['CNTRY_CD'] != country_filter:
                    continue
            
            if row['BRD_CD'] != 'M':  # MLB만
                continue
            
            shop_cd = row['SHOP_CD']
            account_nm = row['ACCOUNT_NM'].strip()
            value = clean_number(row['VALUE'])
            
            # 오피스 판관비 및 상세 항목 집계 (H99/M99)
            if shop_cd in ['H99', 'M99']:
                if account_nm == '판매관리비':
                    office_sga += value
                
                # 오피스 전용 상세 항목 (영업비 상세 카드용)
                if account_nm == '1. 급 여':
                    result['expense_detail']['salary'] += value
                elif account_nm == '9. 광고선전비':
                    result['expense_detail']['marketing'] += value
                elif account_nm == '10. 지급수수료':
                    result['expense_detail']['fee'] += value
                elif account_nm == '4. 임차료':
                    result['expense_detail']['rent'] += value
                elif account_nm == '13. 보험료':
                    result['expense_detail']['insurance'] += value
                elif account_nm == '2. TRAVEL & MEAL':
                    result['expense_detail']['travel'] += value
                elif account_nm == '11. 운반비':
                    result['expense_detail']['logistics'] += value
                elif account_nm == '12. 기타 수수료(매장관리비 외)':
                    result['expense_detail']['other_fee'] += value
                elif account_nm == '14. 감가상각비':
                    result['expense_detail']['depreciation'] += value
                elif account_nm == '5. 유지보수비':
                    result['expense_detail']['maintenance'] += value
                elif account_nm == '6. 수도광열비':
                    result['expense_detail']['utilities'] += value
                elif account_nm == '7. 소모품비':
                    result['expense_detail']['supplies'] += value
                elif account_nm == '8. 통신비':
                    result['expense_detail']['communication'] += value
                elif account_nm == '3. 피복비(유니폼)':
                    result['expense_detail']['uniform'] += value
                elif account_nm == '15. 면세점 직접비':
                    result['expense_detail']['duty_free'] += value
                continue
            
            # 주요 계정 집계 (매장)
            if account_nm == '실판매출' or account_nm == '실매출액':
                result['net_sales'] += value
            elif account_nm == 'Tag매출액':
                result['tag_sales'] += value
            elif account_nm == '매출원가':
                result['cogs'] += value
            elif account_nm == '매출총이익':
                result['gross_profit'] += value
            # 영업이익은 CSV에서 읽지 않고 계산함 (직접이익 - 영업비)
            
            # 매장 직접비 항목들 (직접비 합계용, expense_detail에는 오피스만 담음)
            if shop_cd not in ['H99', 'M99']:
                if account_nm in ['1. 급 여', '4. 임차료', '11. 운반비', '9. 광고선전비', '10. 지급수수료', 
                               '5. 유지보수비', '13. 보험료', '6. 수도광열비', '7. 소모품비', '2. TRAVEL & MEAL',
                               '8. 통신비', '3. 피복비(유니폼)', '14. 감가상각비', '12. 기타 수수료(매장관리비 외)', '15. 면세점 직접비']:
                    result['direct_cost'] += value
    
    # 할인 계산
    result['discount'] = result['tag_sales'] - result['net_sales']
    result['discount_rate'] = (result['discount'] / result['tag_sales'] * 100) if result['tag_sales'] > 0 else 0
    
    # 비율 계산
    if result['net_sales'] > 0:
        result['cogs_rate'] = (result['cogs'] / result['net_sales'] * 100)
        result['gross_profit_rate'] = (result['gross_profit'] / result['net_sales'] * 100)
        result['operating_profit_rate'] = (result['operating_profit'] / result['net_sales'] * 100)
    else:
        result['cogs_rate'] = 0
        result['gross_profit_rate'] = 0
        result['operating_profit_rate'] = 0
    
    # 매장 직접비 계산 (위에서 이미 합산됨)
    # result['direct_cost'] = ... (삭제)
    
    # expense_detail 구조를 2511 형식으로 재구성 (오피스 전용 데이터)
    other_total = (
        result['expense_detail']['logistics'] +
        result['expense_detail']['other_fee'] +
        result['expense_detail']['depreciation'] +
        result['expense_detail']['maintenance'] +
        result['expense_detail']['utilities'] +
        result['expense_detail']['supplies'] +
        result['expense_detail']['communication'] +
        result['expense_detail']['uniform'] +
        result['expense_detail']['duty_free'] +
        result['expense_detail']['rent'] +
        result['expense_detail']['insurance'] +
        result['expense_detail']['travel']
    )
    
    # 새로운 구조로 변환 (상단 카드용 오피스 비용 상세)
    result['expense_detail'] = {
        'salary': result['expense_detail']['salary'],
        'marketing': result['expense_detail']['marketing'],
        'fee': result['expense_detail']['fee'],
        'rent': result['expense_detail']['rent'],
        'insurance': result['expense_detail']['insurance'],
        'travel': result['expense_detail']['travel'],
        'other': other_total,
        'other_detail': {
            'depreciation': result['expense_detail']['depreciation'],
            'duty_free': result['expense_detail']['duty_free'],
            'govt_license': 0.0,
            'logistics': result['expense_detail']['logistics'],
            'maintenance': result['expense_detail']['maintenance'],
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': result['expense_detail']['supplies'],
            'transport': 0.0,
            'uniform': result['expense_detail']['uniform'],
            'utilities': result['expense_detail']['utilities'],
            'var_rent': 0.0,
            'communication': result['expense_detail']['communication'],
            'bonus': 0.0,
            'other_fee': result['expense_detail']['other_fee']
        }
    }
    
    # 오피스 판관비 저장
    result['sg_a'] = office_sga
    
    # 직접이익 = 매출총이익 - 매장 직접비
    result['direct_profit'] = result['gross_profit'] - result['direct_cost']
    result['direct_profit_rate'] = (result['direct_profit'] / result['net_sales'] * 100) if result['net_sales'] > 0 else 0
    
    # 영업이익 = 직접이익 - 영업비(오피스 SG&A)
    result['operating_profit'] = result['direct_profit'] - result['sg_a']
    result['operating_profit_rate'] = (result['operating_profit'] / result['net_sales'] * 100) if result['net_sales'] > 0 else 0
    
    return result

def aggregate_pl_by_country_channel(csv_file, period, country_channel):
    """국가-채널별 손익 데이터 집계 (특정 기간)
    
    country_channel: 'HK_Retail', 'HK_Outlet', 'HK_Online', 'MC_Retail', 'MC_Outlet'
    """
    result = {
        'tag_sales': 0.0,
        'net_sales': 0.0,
        'discount_rate': 0.0
    }
    
    # 채널 필터 정의
    channel_filters = {
        'HK_Retail': lambda row: row['CNTRY_CD'] == 'HK' and row['CHNL_CD'] == 'A',
        'HK_Outlet': lambda row: row['CNTRY_CD'] == 'HK' and row['CHNL_CD'] == 'F',
        'HK_Online': lambda row: row['CNTRY_CD'] == 'HK' and row['CHNL_CD'] == 'O',
        'MC_Retail': lambda row: row['CNTRY_CD'] == 'MO' and row['CHNL_CD'] == 'A',
        'MC_Outlet': lambda row: row['CNTRY_CD'] == 'MO' and row['CHNL_CD'] == 'F'
    }
    
    channel_filter = channel_filters.get(country_channel)
    if not channel_filter:
        return result
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['BRD_CD'] != 'M':  # MLB만
                continue
            if int(row['PERIOD']) != period:
                continue
            if not channel_filter(row):
                continue
            
            account_nm = row['ACCOUNT_NM'].strip()
            value = clean_number(row['VALUE'])
            
            if account_nm in ['실판매출', '실매출액']:
                result['net_sales'] += value
            elif account_nm == 'Tag매출액':
                result['tag_sales'] += value
    
    # 할인율 계산
    if result['tag_sales'] > 0:
        result['discount_rate'] = (1 - result['net_sales'] / result['tag_sales']) * 100
    
    return result

def aggregate_cumulative_channels(csv_file, start_year_month, end_year_month):
    """누적 기간의 채널별 데이터 집계
    
    start_year_month: 202501 (2025년 1월)
    end_year_month: 202512 (2025년 12월)
    """
    channels = {
        'HK_Retail': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'HK_Outlet': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'HK_Online': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'MC_Retail': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'MC_Outlet': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0}
    }
    
    # 연도와 시작/종료 월 추출
    start_year = start_year_month // 100
    end_year = end_year_month // 100
    start_month = start_year_month % 100
    end_month = end_year_month % 100
    
    # 각 월별로 데이터 수집
    for month in range(start_month, end_month + 1):
        period = start_year * 100 + month
        for channel_name in channels.keys():
            month_data = aggregate_pl_by_country_channel(csv_file, period, channel_name)
            channels[channel_name]['tag_sales'] += month_data['tag_sales']
            channels[channel_name]['net_sales'] += month_data['net_sales']
    
    # 할인율 재계산
    for channel_name, data in channels.items():
        if data['tag_sales'] > 0:
            data['discount_rate'] = (1 - data['net_sales'] / data['tag_sales']) * 100
    
    return channels

# PL CSV 파일 경로
pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL 2512.csv"

def get_discovery_data(csv_file, current_period, prev_period):
    """Discovery(BRD_CD='X') 데이터만 별도로 추출 - 당월 기준"""
    data = {
        'net_sales': 0.0,
        'tag_sales': 0.0,
        'prev_net_sales': 0.0,
        'prev_tag_sales': 0.0,
        'cogs': 0.0,
        'gross_profit': 0.0,
        'direct_cost': 0.0,
        'marketing': 0.0,
        'sg_a': 0.0,
        'cumulative_operating_profit': 0.0,
        'prev_operating_profit': 0.0
    }
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['BRD_CD'] != 'X':
                continue
                
            period = int(row['PERIOD'])
            value = clean_number(row['VALUE'])
            acc = row['ACCOUNT_NM'].strip()
            
            # 당월 (2512)
            if period == current_period:
                if acc in ['실판매출', '실매출액']:
                    data['net_sales'] += value
                elif acc == 'Tag매출액':
                    data['tag_sales'] += value
                elif acc == '매출원가':
                    data['cogs'] += value
                elif acc == '매출총이익':
                    data['gross_profit'] += value
                elif acc == '판매관리비':
                    data['sg_a'] += value
                elif acc == '9. 광고선전비':
                    data['marketing'] += value
                elif acc in ['1. 급 여', '4. 임차료', '11. 운반비', '10. 지급수수료', '13. 보험료', '14. 감가상각비', '5. 유지보수비']:
                    data['direct_cost'] += value
            
            # 전년동월 (2412)
            elif period == prev_period:
                if acc in ['실판매출', '실매출액']:
                    data['prev_net_sales'] += value
                elif acc == 'Tag매출액':
                    data['prev_tag_sales'] += value
                elif acc == '영업이익':
                    data['prev_operating_profit'] += value
            
            # 당년 누적 (2501~2512)
            if 202501 <= period <= 202512:
                if acc == '영업이익':
                    data['cumulative_operating_profit'] += value
    
    # 할인율 계산
    data['discount_rate'] = (1 - (data['net_sales'] / data['tag_sales'])) * 100 if data['tag_sales'] > 0 else 0
    data['prev_discount_rate'] = (1 - (data['prev_net_sales'] / data['prev_tag_sales'])) * 100 if data['prev_tag_sales'] > 0 else 0
    data['net_sales_mom'] = (data['net_sales'] / data['prev_net_sales'] * 100) if data['prev_net_sales'] > 0 else 0
    
    # 직접이익 계산
    direct_profit = data['gross_profit'] - data['direct_cost']
    
    # 영업이익 계산 (직접이익 - 영업비)
    operating_profit = direct_profit - data['sg_a']
    
    # 결과 구조화
    return {
        "net_sales": data['net_sales'],
        "prev_net_sales": data['prev_net_sales'],
        "net_sales_mom": data['net_sales_mom'],
        "discount_rate": data['discount_rate'],
        "prev_discount_rate": data['prev_discount_rate'],
        "direct_cost": data['direct_cost'],
        "direct_profit": direct_profit,
        "marketing": data['marketing'],
        "travel": 0.0,
        "sg_a": data['sg_a'],
        "operating_profit": operating_profit,
        "cumulative_operating_profit": data['cumulative_operating_profit'],
        "store_count": {
            "online": 1,
            "offline": 1
        },
        "prev_store_count": {
            "online": 1,
            "offline": 1
        }
    }

# 채널별 직접이익 계산 함수
def calculate_channel_direct_profit(csv_file, period, prev_period):
    """채널별 직접이익 계산"""
    result = {
        'hk_offline': {'direct_profit': 0, 'direct_profit_rate': 0, 'yoy': None, 'status': ''},
        'mc_offline': {'direct_profit': 0, 'direct_profit_rate': 0, 'yoy': 0},
        'hk_online': {'direct_profit': 0, 'direct_profit_rate': 0, 'yoy': 0},
        'total': {'direct_profit': 0, 'direct_profit_rate': 0, 'yoy': 0}
    }
    
    # 당월 데이터
    hk_data_cur = aggregate_pl_by_period(csv_file, period, 'HK_ONLY')
    mc_data_cur = aggregate_pl_by_period(csv_file, period, 'MC')
    
    # 전년 동월 데이터
    hk_data_prev = aggregate_pl_by_period(csv_file, prev_period, 'HK_ONLY')
    mc_data_prev = aggregate_pl_by_period(csv_file, prev_period, 'MC')
    
    # HK는 오프라인/온라인으로 분리 (8:2 비율 가정)
    hk_offline_ratio = 0.8
    hk_online_ratio = 0.2
    
    # HK 오프라인
    result['hk_offline']['direct_profit'] = hk_data_cur['direct_profit'] * hk_offline_ratio
    result['hk_offline']['direct_profit_rate'] = hk_data_cur['direct_profit_rate'] * hk_offline_ratio
    prev_hk_offline = hk_data_prev['direct_profit'] * hk_offline_ratio
    if prev_hk_offline < 0 and result['hk_offline']['direct_profit'] >= 0:
        result['hk_offline']['yoy'] = None
        result['hk_offline']['status'] = '흑자전환'
    elif prev_hk_offline != 0:
        result['hk_offline']['yoy'] = (result['hk_offline']['direct_profit'] / prev_hk_offline * 100)
    
    # HK 온라인
    result['hk_online']['direct_profit'] = hk_data_cur['direct_profit'] * hk_online_ratio
    result['hk_online']['direct_profit_rate'] = hk_data_cur['direct_profit_rate'] * hk_online_ratio
    prev_hk_online = hk_data_prev['direct_profit'] * hk_online_ratio
    if prev_hk_online != 0:
        result['hk_online']['yoy'] = (result['hk_online']['direct_profit'] / prev_hk_online * 100)
    
    # MC 오프라인
    result['mc_offline']['direct_profit'] = mc_data_cur['direct_profit']
    result['mc_offline']['direct_profit_rate'] = mc_data_cur['direct_profit_rate']
    if mc_data_prev['direct_profit'] != 0:
        result['mc_offline']['yoy'] = (mc_data_cur['direct_profit'] / mc_data_prev['direct_profit'] * 100)
    
    # 합계
    result['total']['direct_profit'] = (result['hk_offline']['direct_profit'] + 
                                       result['hk_online']['direct_profit'] + 
                                       result['mc_offline']['direct_profit'])
    total_net_sales = hk_data_cur['net_sales'] + mc_data_cur['net_sales']
    if total_net_sales > 0:
        result['total']['direct_profit_rate'] = (result['total']['direct_profit'] / total_net_sales * 100)
    
    total_prev = (hk_data_prev['direct_profit'] + mc_data_prev['direct_profit'])
    if total_prev != 0:
        result['total']['yoy'] = (result['total']['direct_profit'] / total_prev * 100)
    
    return result

# 데이터 집계
print("=" * 80)
print("2512 홍콩마카오 손익요약 데이터 생성")
print("=" * 80)

# Discovery 데이터 추출
discovery_data = get_discovery_data(pl_file, 202512, 202412)

# 채널별 직접이익 계산
channel_direct_profit = calculate_channel_direct_profit(pl_file, 202512, 202412)

# 홍콩 데이터
current_month_hk = aggregate_pl_by_period(pl_file, 202512, 'HK_ONLY')
prev_month_hk = aggregate_pl_by_period(pl_file, 202412, 'HK_ONLY')

# 마카오 데이터
current_month_mc = aggregate_pl_by_period(pl_file, 202512, 'MC')
prev_month_mc = aggregate_pl_by_period(pl_file, 202412, 'MC')

# 합계 데이터
current_month = aggregate_pl_by_period(pl_file, 202512, 'HK')
prev_month = aggregate_pl_by_period(pl_file, 202412, 'HK')

# 오피스 영업비(SG&A)를 홍콩:마카오 실판매출 비율로 안분
# 당월
total_net_sales_cur = current_month_hk['net_sales'] + current_month_mc['net_sales']
if total_net_sales_cur > 0:
    hk_ratio_cur = current_month_hk['net_sales'] / total_net_sales_cur
    mc_ratio_cur = current_month_mc['net_sales'] / total_net_sales_cur
    office_sga_cur = current_month['sg_a']
    
    current_month_hk['sg_a'] = office_sga_cur * hk_ratio_cur
    current_month_mc['sg_a'] = office_sga_cur * mc_ratio_cur
    
    # 영업이익 재계산
    current_month_hk['operating_profit'] = current_month_hk['direct_profit'] - current_month_hk['sg_a']
    current_month_mc['operating_profit'] = current_month_mc['direct_profit'] - current_month_mc['sg_a']
    
    current_month_hk['operating_profit_rate'] = (current_month_hk['operating_profit'] / current_month_hk['net_sales'] * 100) if current_month_hk['net_sales'] > 0 else 0
    current_month_mc['operating_profit_rate'] = (current_month_mc['operating_profit'] / current_month_mc['net_sales'] * 100) if current_month_mc['net_sales'] > 0 else 0

# 전년 동월
total_net_sales_prev = prev_month_hk['net_sales'] + prev_month_mc['net_sales']
if total_net_sales_prev > 0:
    hk_ratio_prev = prev_month_hk['net_sales'] / total_net_sales_prev
    mc_ratio_prev = prev_month_mc['net_sales'] / total_net_sales_prev
    office_sga_prev = prev_month['sg_a']
    
    prev_month_hk['sg_a'] = office_sga_prev * hk_ratio_prev
    prev_month_mc['sg_a'] = office_sga_prev * mc_ratio_prev
    
    # 영업이익 재계산
    prev_month_hk['operating_profit'] = prev_month_hk['direct_profit'] - prev_month_hk['sg_a']
    prev_month_mc['operating_profit'] = prev_month_mc['direct_profit'] - prev_month_mc['sg_a']
    
    prev_month_hk['operating_profit_rate'] = (prev_month_hk['operating_profit'] / prev_month_hk['net_sales'] * 100) if prev_month_hk['net_sales'] > 0 else 0
    prev_month_mc['operating_profit_rate'] = (prev_month_mc['operating_profit'] / prev_month_mc['net_sales'] * 100) if prev_month_mc['net_sales'] > 0 else 0

# 누적 데이터 (2501~2512, 2401~2412)
# 홍콩
cumulative_hk = {
    'tag_sales': 0.0,
    'net_sales': 0.0,
    'cogs': 0.0,
    'gross_profit': 0.0,
    'sg_a': 0.0,
    'operating_profit': 0.0,
    'direct_cost': 0.0,
    'direct_profit': 0.0,
    'expense_detail': {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {
            'depreciation': 0.0,
            'duty_free': 0.0,
            'govt_license': 0.0,
            'logistics': 0.0,
            'maintenance': 0.0,
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': 0.0,
            'transport': 0.0,
            'uniform': 0.0,
            'utilities': 0.0,
            'var_rent': 0.0,
            'communication': 0.0,
            'bonus': 0.0,
            'other_fee': 0.0
        }
    }
}

prev_cumulative_hk = {
    'tag_sales': 0.0,
    'net_sales': 0.0,
    'cogs': 0.0,
    'gross_profit': 0.0,
    'sg_a': 0.0,
    'operating_profit': 0.0,
    'direct_cost': 0.0,
    'direct_profit': 0.0,
    'expense_detail': {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {
            'depreciation': 0.0,
            'duty_free': 0.0,
            'govt_license': 0.0,
            'logistics': 0.0,
            'maintenance': 0.0,
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': 0.0,
            'transport': 0.0,
            'uniform': 0.0,
            'utilities': 0.0,
            'var_rent': 0.0,
            'communication': 0.0,
            'bonus': 0.0,
            'other_fee': 0.0
        }
    }
}

# 마카오
cumulative_mc = {
    'tag_sales': 0.0,
    'net_sales': 0.0,
    'cogs': 0.0,
    'gross_profit': 0.0,
    'sg_a': 0.0,
    'operating_profit': 0.0,
    'direct_cost': 0.0,
    'direct_profit': 0.0,
    'expense_detail': {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {
            'depreciation': 0.0,
            'duty_free': 0.0,
            'govt_license': 0.0,
            'logistics': 0.0,
            'maintenance': 0.0,
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': 0.0,
            'transport': 0.0,
            'uniform': 0.0,
            'utilities': 0.0,
            'var_rent': 0.0,
            'communication': 0.0,
            'bonus': 0.0,
            'other_fee': 0.0
        }
    }
}

prev_cumulative_mc = {
    'tag_sales': 0.0,
    'net_sales': 0.0,
    'cogs': 0.0,
    'gross_profit': 0.0,
    'sg_a': 0.0,
    'operating_profit': 0.0,
    'direct_cost': 0.0,
    'direct_profit': 0.0,
    'expense_detail': {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {
            'depreciation': 0.0,
            'duty_free': 0.0,
            'govt_license': 0.0,
            'logistics': 0.0,
            'maintenance': 0.0,
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': 0.0,
            'transport': 0.0,
            'uniform': 0.0,
            'utilities': 0.0,
            'var_rent': 0.0,
            'communication': 0.0,
            'bonus': 0.0,
            'other_fee': 0.0
        }
    }
}

# 합계
cumulative = {
    'tag_sales': 0.0,
    'net_sales': 0.0,
    'cogs': 0.0,
    'gross_profit': 0.0,
    'sg_a': 0.0,
    'operating_profit': 0.0,
    'direct_cost': 0.0,
    'direct_profit': 0.0,
    'expense_detail': {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {
            'depreciation': 0.0,
            'duty_free': 0.0,
            'govt_license': 0.0,
            'logistics': 0.0,
            'maintenance': 0.0,
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': 0.0,
            'transport': 0.0,
            'uniform': 0.0,
            'utilities': 0.0,
            'var_rent': 0.0,
            'communication': 0.0,
            'bonus': 0.0,
            'other_fee': 0.0
        }
    }
}

prev_cumulative = {
    'tag_sales': 0.0,
    'net_sales': 0.0,
    'cogs': 0.0,
    'gross_profit': 0.0,
    'sg_a': 0.0,
    'operating_profit': 0.0,
    'direct_cost': 0.0,
    'direct_profit': 0.0,
    'expense_detail': {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {
            'depreciation': 0.0,
            'duty_free': 0.0,
            'govt_license': 0.0,
            'logistics': 0.0,
            'maintenance': 0.0,
            'rent_free': 0.0,
            'retirement': 0.0,
            'supplies': 0.0,
            'transport': 0.0,
            'uniform': 0.0,
            'utilities': 0.0,
            'var_rent': 0.0,
            'communication': 0.0,
            'bonus': 0.0,
            'other_fee': 0.0
        }
    }
}

# 2501~2512 누적 (홍콩, 마카오, 합계)
for month in range(1, 13):
    # 홍콩
    period_data_hk = aggregate_pl_by_period(pl_file, 202500 + month, 'HK_ONLY')
    for key in ['tag_sales', 'net_sales', 'cogs', 'gross_profit', 'direct_cost', 'direct_profit']:
        cumulative_hk[key] += period_data_hk[key]
    # expense_detail 합산 (other_detail 제외)
    for expense_key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
        cumulative_hk['expense_detail'][expense_key] += period_data_hk['expense_detail'][expense_key]
    # other_detail 합산
    for other_key in period_data_hk['expense_detail']['other_detail'].keys():
        cumulative_hk['expense_detail']['other_detail'][other_key] += period_data_hk['expense_detail']['other_detail'][other_key]
    
    # 마카오
    period_data_mc = aggregate_pl_by_period(pl_file, 202500 + month, 'MC')
    for key in ['tag_sales', 'net_sales', 'cogs', 'gross_profit', 'direct_cost', 'direct_profit']:
        cumulative_mc[key] += period_data_mc[key]
    # expense_detail 합산 (other_detail 제외)
    for expense_key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
        cumulative_mc['expense_detail'][expense_key] += period_data_mc['expense_detail'][expense_key]
    # other_detail 합산
    for other_key in period_data_mc['expense_detail']['other_detail'].keys():
        cumulative_mc['expense_detail']['other_detail'][other_key] += period_data_mc['expense_detail']['other_detail'][other_key]
    
    # 합계
    period_data = aggregate_pl_by_period(pl_file, 202500 + month, 'HK')
    for key in ['tag_sales', 'net_sales', 'cogs', 'gross_profit', 'sg_a', 'direct_cost', 'direct_profit']:
        cumulative[key] += period_data[key]
    # expense_detail 합산 (other_detail 제외)
    for expense_key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
        cumulative['expense_detail'][expense_key] += period_data['expense_detail'][expense_key]
    # other_detail 합산
    for other_key in period_data['expense_detail']['other_detail'].keys():
        cumulative['expense_detail']['other_detail'][other_key] += period_data['expense_detail']['other_detail'][other_key]

# 2401~2412 누적 (홍콩, 마카오, 합계)
for month in range(1, 13):
    # 홍콩
    period_data_hk = aggregate_pl_by_period(pl_file, 202400 + month, 'HK_ONLY')
    for key in ['tag_sales', 'net_sales', 'cogs', 'gross_profit', 'direct_cost', 'direct_profit']:
        prev_cumulative_hk[key] += period_data_hk[key]
    # expense_detail 합산 (other_detail 제외)
    for expense_key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
        prev_cumulative_hk['expense_detail'][expense_key] += period_data_hk['expense_detail'][expense_key]
    # other_detail 합산
    for other_key in period_data_hk['expense_detail']['other_detail'].keys():
        prev_cumulative_hk['expense_detail']['other_detail'][other_key] += period_data_hk['expense_detail']['other_detail'][other_key]
    
    # 마카오
    period_data_mc = aggregate_pl_by_period(pl_file, 202400 + month, 'MC')
    for key in ['tag_sales', 'net_sales', 'cogs', 'gross_profit', 'direct_cost', 'direct_profit']:
        prev_cumulative_mc[key] += period_data_mc[key]
    # expense_detail 합산 (other_detail 제외)
    for expense_key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
        prev_cumulative_mc['expense_detail'][expense_key] += period_data_mc['expense_detail'][expense_key]
    # other_detail 합산
    for other_key in period_data_mc['expense_detail']['other_detail'].keys():
        prev_cumulative_mc['expense_detail']['other_detail'][other_key] += period_data_mc['expense_detail']['other_detail'][other_key]
    
    # 합계
    period_data = aggregate_pl_by_period(pl_file, 202400 + month, 'HK')
    for key in ['tag_sales', 'net_sales', 'cogs', 'gross_profit', 'sg_a', 'direct_cost', 'direct_profit']:
        prev_cumulative[key] += period_data[key]
    # expense_detail 합산 (other_detail 제외)
    for expense_key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
        prev_cumulative['expense_detail'][expense_key] += period_data['expense_detail'][expense_key]
    # other_detail 합산
    for other_key in period_data['expense_detail']['other_detail'].keys():
        prev_cumulative['expense_detail']['other_detail'][other_key] += period_data['expense_detail']['other_detail'][other_key]

# 누적 오피스 영업비 안분
# 당년 누적
total_net_sales_ytd = cumulative_hk['net_sales'] + cumulative_mc['net_sales']
if total_net_sales_ytd > 0:
    hk_ratio_ytd = cumulative_hk['net_sales'] / total_net_sales_ytd
    mc_ratio_ytd = cumulative_mc['net_sales'] / total_net_sales_ytd
    office_sga_ytd = cumulative['sg_a']
    
    cumulative_hk['sg_a'] = office_sga_ytd * hk_ratio_ytd
    cumulative_mc['sg_a'] = office_sga_ytd * mc_ratio_ytd
    
    # 영업이익 재계산
    cumulative_hk['operating_profit'] = cumulative_hk['direct_profit'] - cumulative_hk['sg_a']
    cumulative_mc['operating_profit'] = cumulative_mc['direct_profit'] - cumulative_mc['sg_a']

# 전년 누적
total_net_sales_prev_ytd = prev_cumulative_hk['net_sales'] + prev_cumulative_mc['net_sales']
if total_net_sales_prev_ytd > 0:
    hk_ratio_prev_ytd = prev_cumulative_hk['net_sales'] / total_net_sales_prev_ytd
    mc_ratio_prev_ytd = prev_cumulative_mc['net_sales'] / total_net_sales_prev_ytd
    office_sga_prev_ytd = prev_cumulative['sg_a']
    
    prev_cumulative_hk['sg_a'] = office_sga_prev_ytd * hk_ratio_prev_ytd
    prev_cumulative_mc['sg_a'] = office_sga_prev_ytd * mc_ratio_prev_ytd
    
    # 영업이익 재계산
    prev_cumulative_hk['operating_profit'] = prev_cumulative_hk['direct_profit'] - prev_cumulative_hk['sg_a']
    prev_cumulative_mc['operating_profit'] = prev_cumulative_mc['direct_profit'] - prev_cumulative_mc['sg_a']

# 누적 비율 계산 - 홍콩
cumulative_hk['discount'] = cumulative_hk['tag_sales'] - cumulative_hk['net_sales']
cumulative_hk['discount_rate'] = (cumulative_hk['discount'] / cumulative_hk['tag_sales'] * 100) if cumulative_hk['tag_sales'] > 0 else 0
cumulative_hk['cogs_rate'] = (cumulative_hk['cogs'] / cumulative_hk['net_sales'] * 100) if cumulative_hk['net_sales'] > 0 else 0
cumulative_hk['gross_profit_rate'] = (cumulative_hk['gross_profit'] / cumulative_hk['net_sales'] * 100) if cumulative_hk['net_sales'] > 0 else 0
cumulative_hk['operating_profit_rate'] = (cumulative_hk['operating_profit'] / cumulative_hk['net_sales'] * 100) if cumulative_hk['net_sales'] > 0 else 0
cumulative_hk['direct_profit_rate'] = (cumulative_hk['direct_profit'] / cumulative_hk['net_sales'] * 100) if cumulative_hk['net_sales'] > 0 else 0

prev_cumulative_hk['discount'] = prev_cumulative_hk['tag_sales'] - prev_cumulative_hk['net_sales']
prev_cumulative_hk['discount_rate'] = (prev_cumulative_hk['discount'] / prev_cumulative_hk['tag_sales'] * 100) if prev_cumulative_hk['tag_sales'] > 0 else 0
prev_cumulative_hk['cogs_rate'] = (prev_cumulative_hk['cogs'] / prev_cumulative_hk['net_sales'] * 100) if prev_cumulative_hk['net_sales'] > 0 else 0
prev_cumulative_hk['gross_profit_rate'] = (prev_cumulative_hk['gross_profit'] / prev_cumulative_hk['net_sales'] * 100) if prev_cumulative_hk['net_sales'] > 0 else 0
prev_cumulative_hk['operating_profit_rate'] = (prev_cumulative_hk['operating_profit'] / prev_cumulative_hk['net_sales'] * 100) if prev_cumulative_hk['net_sales'] > 0 else 0
prev_cumulative_hk['direct_profit_rate'] = (prev_cumulative_hk['direct_profit'] / prev_cumulative_hk['net_sales'] * 100) if prev_cumulative_hk['net_sales'] > 0 else 0

# 누적 채널별 데이터는 hongkong-dashboard-cumulative-2512.json에서 가져오기
print("\n누적 채널별 데이터 로드 중...")
try:
    cumulative_file = 'public/dashboard/hongkong-dashboard-cumulative-2512.json'
    with open(cumulative_file, 'r', encoding='utf-8') as f:
        cumulative_dashboard_data = json.load(f)
    
    ccs_cumulative = cumulative_dashboard_data.get('country_channel_summary', {})
    
    # 누적 데이터 (HKD 단위이므로 그대로 사용)
    cumulative_channels = {
        'HK_Retail': {
            'tag_sales': ccs_cumulative.get('HK_Retail', {}).get('current', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('HK_Retail', {}).get('current', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('HK_Retail', {}).get('current', {}).get('discount_rate', 0)
        },
        'HK_Outlet': {
            'tag_sales': ccs_cumulative.get('HK_Outlet', {}).get('current', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('HK_Outlet', {}).get('current', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('HK_Outlet', {}).get('current', {}).get('discount_rate', 0)
        },
        'HK_Online': {
            'tag_sales': ccs_cumulative.get('HK_Online', {}).get('current', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('HK_Online', {}).get('current', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('HK_Online', {}).get('current', {}).get('discount_rate', 0)
        },
        'MC_Retail': {
            'tag_sales': ccs_cumulative.get('MO_Retail', {}).get('current', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('MO_Retail', {}).get('current', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('MO_Retail', {}).get('current', {}).get('discount_rate', 0)
        },
        'MC_Outlet': {
            'tag_sales': ccs_cumulative.get('MO_Outlet', {}).get('current', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('MO_Outlet', {}).get('current', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('MO_Outlet', {}).get('current', {}).get('discount_rate', 0)
        }
    }
    
    prev_cumulative_channels = {
        'HK_Retail': {
            'tag_sales': ccs_cumulative.get('HK_Retail', {}).get('previous', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('HK_Retail', {}).get('previous', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('HK_Retail', {}).get('previous', {}).get('discount_rate', 0)
        },
        'HK_Outlet': {
            'tag_sales': ccs_cumulative.get('HK_Outlet', {}).get('previous', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('HK_Outlet', {}).get('previous', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('HK_Outlet', {}).get('previous', {}).get('discount_rate', 0)
        },
        'HK_Online': {
            'tag_sales': ccs_cumulative.get('HK_Online', {}).get('previous', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('HK_Online', {}).get('previous', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('HK_Online', {}).get('previous', {}).get('discount_rate', 0)
        },
        'MC_Retail': {
            'tag_sales': ccs_cumulative.get('MO_Retail', {}).get('previous', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('MO_Retail', {}).get('previous', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('MO_Retail', {}).get('previous', {}).get('discount_rate', 0)
        },
        'MC_Outlet': {
            'tag_sales': ccs_cumulative.get('MO_Outlet', {}).get('previous', {}).get('gross_sales', 0),
            'net_sales': ccs_cumulative.get('MO_Outlet', {}).get('previous', {}).get('net_sales', 0),
            'discount_rate': ccs_cumulative.get('MO_Outlet', {}).get('previous', {}).get('discount_rate', 0)
        }
    }
    
    print("  채널별 데이터 로드 완료!")
except Exception as e:
    print(f"  경고: 채널별 데이터 로드 실패 - {e}")
    print("  빈 채널 데이터 사용")
    cumulative_channels = {
        'HK_Retail': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'HK_Outlet': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'HK_Online': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'MC_Retail': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0},
        'MC_Outlet': {'tag_sales': 0.0, 'net_sales': 0.0, 'discount_rate': 0.0}
    }
    prev_cumulative_channels = cumulative_channels.copy()

# 누적 비율 계산 - 마카오
cumulative_mc['discount'] = cumulative_mc['tag_sales'] - cumulative_mc['net_sales']
cumulative_mc['discount_rate'] = (cumulative_mc['discount'] / cumulative_mc['tag_sales'] * 100) if cumulative_mc['tag_sales'] > 0 else 0
cumulative_mc['cogs_rate'] = (cumulative_mc['cogs'] / cumulative_mc['net_sales'] * 100) if cumulative_mc['net_sales'] > 0 else 0
cumulative_mc['gross_profit_rate'] = (cumulative_mc['gross_profit'] / cumulative_mc['net_sales'] * 100) if cumulative_mc['net_sales'] > 0 else 0
cumulative_mc['operating_profit_rate'] = (cumulative_mc['operating_profit'] / cumulative_mc['net_sales'] * 100) if cumulative_mc['net_sales'] > 0 else 0
cumulative_mc['direct_profit_rate'] = (cumulative_mc['direct_profit'] / cumulative_mc['net_sales'] * 100) if cumulative_mc['net_sales'] > 0 else 0

prev_cumulative_mc['discount'] = prev_cumulative_mc['tag_sales'] - prev_cumulative_mc['net_sales']
prev_cumulative_mc['discount_rate'] = (prev_cumulative_mc['discount'] / prev_cumulative_mc['tag_sales'] * 100) if prev_cumulative_mc['tag_sales'] > 0 else 0
prev_cumulative_mc['cogs_rate'] = (prev_cumulative_mc['cogs'] / prev_cumulative_mc['net_sales'] * 100) if prev_cumulative_mc['net_sales'] > 0 else 0
prev_cumulative_mc['gross_profit_rate'] = (prev_cumulative_mc['gross_profit'] / prev_cumulative_mc['net_sales'] * 100) if prev_cumulative_mc['net_sales'] > 0 else 0
prev_cumulative_mc['operating_profit_rate'] = (prev_cumulative_mc['operating_profit'] / prev_cumulative_mc['net_sales'] * 100) if prev_cumulative_mc['net_sales'] > 0 else 0
prev_cumulative_mc['direct_profit_rate'] = (prev_cumulative_mc['direct_profit'] / prev_cumulative_mc['net_sales'] * 100) if prev_cumulative_mc['net_sales'] > 0 else 0

# 누적 비율 계산 - 합계
cumulative['discount'] = cumulative['tag_sales'] - cumulative['net_sales']
cumulative['discount_rate'] = (cumulative['discount'] / cumulative['tag_sales'] * 100) if cumulative['tag_sales'] > 0 else 0
cumulative['cogs_rate'] = (cumulative['cogs'] / cumulative['net_sales'] * 100) if cumulative['net_sales'] > 0 else 0
cumulative['gross_profit_rate'] = (cumulative['gross_profit'] / cumulative['net_sales'] * 100) if cumulative['net_sales'] > 0 else 0
cumulative['direct_profit_rate'] = (cumulative['direct_profit'] / cumulative['net_sales'] * 100) if cumulative['net_sales'] > 0 else 0

# 누적 영업이익 계산 (직접이익 - 영업비)
cumulative['operating_profit'] = cumulative['direct_profit'] - cumulative['sg_a']
cumulative['operating_profit_rate'] = (cumulative['operating_profit'] / cumulative['net_sales'] * 100) if cumulative['net_sales'] > 0 else 0

prev_cumulative['discount'] = prev_cumulative['tag_sales'] - prev_cumulative['net_sales']
prev_cumulative['discount_rate'] = (prev_cumulative['discount'] / prev_cumulative['tag_sales'] * 100) if prev_cumulative['tag_sales'] > 0 else 0
prev_cumulative['cogs_rate'] = (prev_cumulative['cogs'] / prev_cumulative['net_sales'] * 100) if prev_cumulative['net_sales'] > 0 else 0
prev_cumulative['gross_profit_rate'] = (prev_cumulative['gross_profit'] / prev_cumulative['net_sales'] * 100) if prev_cumulative['net_sales'] > 0 else 0
prev_cumulative['direct_profit_rate'] = (prev_cumulative['direct_profit'] / prev_cumulative['net_sales'] * 100) if prev_cumulative['net_sales'] > 0 else 0

# 전년 누적 영업이익 계산 (직접이익 - 영업비)
prev_cumulative['operating_profit'] = prev_cumulative['direct_profit'] - prev_cumulative['sg_a']
prev_cumulative['operating_profit_rate'] = (prev_cumulative['operating_profit'] / prev_cumulative['net_sales'] * 100) if prev_cumulative['net_sales'] > 0 else 0

# YOY 계산
def calc_yoy(current, previous):
    return (current / previous * 100) if previous > 0 else 0

def calc_change(current, previous):
    return current - previous

def calc_change(current, previous):
    return current - previous

# JSON 구조 생성 (홍콩/마카오 분리)
pl_data = {
    "metadata": {
        "last_period": "2512",
        "previous_period": "2412",
        "generated_at": datetime.now().isoformat()
    },
    "current_month": {
        "hk": {
            "tag_sales": current_month_hk['tag_sales'],
            "net_sales": current_month_hk['net_sales'],
            "discount_rate": current_month_hk['discount_rate'],
            "cogs_rate": current_month_hk['cogs_rate'],
            "gross_profit": current_month_hk['gross_profit'],
            "gross_profit_rate": current_month_hk['gross_profit_rate'],
            "direct_cost": current_month_hk['direct_cost'],
            "direct_profit": current_month_hk['direct_profit'],
            "direct_profit_rate": current_month_hk['direct_profit_rate'],
            "sg_a": current_month_hk['sg_a'],
            "operating_profit": current_month_hk['operating_profit'],
            "operating_profit_rate": current_month_hk['operating_profit_rate'],
            "expense_detail": current_month_hk['expense_detail']
        },
        "mc": {
            "tag_sales": current_month_mc['tag_sales'],
            "net_sales": current_month_mc['net_sales'],
            "discount_rate": current_month_mc['discount_rate'],
            "cogs_rate": current_month_mc['cogs_rate'],
            "gross_profit": current_month_mc['gross_profit'],
            "gross_profit_rate": current_month_mc['gross_profit_rate'],
            "direct_cost": current_month_mc['direct_cost'],
            "direct_profit": current_month_mc['direct_profit'],
            "direct_profit_rate": current_month_mc['direct_profit_rate'],
            "sg_a": current_month_mc['sg_a'],
            "operating_profit": current_month_mc['operating_profit'],
            "operating_profit_rate": current_month_mc['operating_profit_rate'],
            "expense_detail": current_month_mc['expense_detail']
        },
        "total": current_month,
        "yoy": {
            "tag_sales": calc_yoy(current_month['tag_sales'], prev_month['tag_sales']),
            "discount": calc_yoy(current_month['discount'], prev_month['discount']),
            "net_sales": calc_yoy(current_month['net_sales'], prev_month['net_sales']),
            "cogs": calc_yoy(current_month['cogs'], prev_month['cogs']),
            "gross_profit": calc_yoy(current_month['gross_profit'], prev_month['gross_profit']),
            "direct_cost": calc_yoy(current_month['direct_cost'], prev_month['direct_cost']),
            "direct_profit": calc_yoy(current_month['direct_profit'], prev_month['direct_profit']),
            "sg_a": calc_yoy(current_month['sg_a'], prev_month['sg_a']),
            "operating_profit": calc_yoy(current_month['operating_profit'], prev_month['operating_profit']),
            # expense_detail YOY 추가
            "salary": calc_yoy(current_month['expense_detail']['salary'], prev_month['expense_detail']['salary']),
            "marketing": calc_yoy(current_month['expense_detail']['marketing'], prev_month['expense_detail']['marketing']),
            "fee": calc_yoy(current_month['expense_detail']['fee'], prev_month['expense_detail']['fee']),
            "rent": calc_yoy(current_month['expense_detail']['rent'], prev_month['expense_detail']['rent']),
            "insurance": calc_yoy(current_month['expense_detail']['insurance'], prev_month['expense_detail']['insurance']),
            "travel": calc_yoy(current_month['expense_detail']['travel'], prev_month['expense_detail']['travel']),
            "other": calc_yoy(current_month['expense_detail']['other'], prev_month['expense_detail']['other'])
        },
        "change": {
            "tag_sales": calc_change(current_month['tag_sales'], prev_month['tag_sales']),
            "discount": calc_change(current_month['discount'], prev_month['discount']),
            "net_sales": calc_change(current_month['net_sales'], prev_month['net_sales']),
            "cogs": calc_change(current_month['cogs'], prev_month['cogs']),
            "gross_profit": calc_change(current_month['gross_profit'], prev_month['gross_profit']),
            "direct_cost": calc_change(current_month['direct_cost'], prev_month['direct_cost']),
            "direct_profit": calc_change(current_month['direct_profit'], prev_month['direct_profit']),
            "sg_a": calc_change(current_month['sg_a'], prev_month['sg_a']),
            "operating_profit": calc_change(current_month['operating_profit'], prev_month['operating_profit']),
            # expense_detail Change 추가
            "salary": calc_change(current_month['expense_detail']['salary'], prev_month['expense_detail']['salary']),
            "marketing": calc_change(current_month['expense_detail']['marketing'], prev_month['expense_detail']['marketing']),
            "fee": calc_change(current_month['expense_detail']['fee'], prev_month['expense_detail']['fee']),
            "rent": calc_change(current_month['expense_detail']['rent'], prev_month['expense_detail']['rent']),
            "insurance": calc_change(current_month['expense_detail']['insurance'], prev_month['expense_detail']['insurance']),
            "travel": calc_change(current_month['expense_detail']['travel'], prev_month['expense_detail']['travel']),
            "other": calc_change(current_month['expense_detail']['other'], prev_month['expense_detail']['other'])
        }
    },
    "prev_month": {
        "hk": {
            "tag_sales": prev_month_hk['tag_sales'],
            "net_sales": prev_month_hk['net_sales'],
            "discount_rate": prev_month_hk['discount_rate'],
            "cogs_rate": prev_month_hk['cogs_rate'],
            "gross_profit": prev_month_hk['gross_profit'],
            "gross_profit_rate": prev_month_hk['gross_profit_rate'],
            "direct_cost": prev_month_hk['direct_cost'],
            "direct_profit": prev_month_hk['direct_profit'],
            "direct_profit_rate": prev_month_hk['direct_profit_rate'],
            "sg_a": prev_month_hk['sg_a'],
            "operating_profit": prev_month_hk['operating_profit'],
            "operating_profit_rate": prev_month_hk['operating_profit_rate']
        },
        "mc": {
            "tag_sales": prev_month_mc['tag_sales'],
            "net_sales": prev_month_mc['net_sales'],
            "discount_rate": prev_month_mc['discount_rate'],
            "cogs_rate": prev_month_mc['cogs_rate'],
            "gross_profit": prev_month_mc['gross_profit'],
            "gross_profit_rate": prev_month_mc['gross_profit_rate'],
            "direct_cost": prev_month_mc['direct_cost'],
            "direct_profit": prev_month_mc['direct_profit'],
            "direct_profit_rate": prev_month_mc['direct_profit_rate'],
            "sg_a": prev_month_mc['sg_a'],
            "operating_profit": prev_month_mc['operating_profit'],
            "operating_profit_rate": prev_month_mc['operating_profit_rate']
        },
        "total": prev_month
    },
    "cumulative": {
        "hk": {
            "tag_sales": cumulative_hk['tag_sales'],
            "net_sales": cumulative_hk['net_sales'],
            "discount_rate": cumulative_hk['discount_rate'],
            "cogs_rate": cumulative_hk['cogs_rate'],
            "gross_profit": cumulative_hk['gross_profit'],
            "gross_profit_rate": cumulative_hk['gross_profit_rate'],
            "direct_cost": cumulative_hk['direct_cost'],
            "direct_profit": cumulative_hk['direct_profit'],
            "direct_profit_rate": cumulative_hk['direct_profit_rate'],
            "sg_a": cumulative_hk['sg_a'],
            "operating_profit": cumulative_hk['operating_profit'],
            "operating_profit_rate": cumulative_hk['operating_profit_rate'],
            "expense_detail": cumulative_hk['expense_detail']
        },
        "mc": {
            "tag_sales": cumulative_mc['tag_sales'],
            "net_sales": cumulative_mc['net_sales'],
            "discount_rate": cumulative_mc['discount_rate'],
            "cogs_rate": cumulative_mc['cogs_rate'],
            "gross_profit": cumulative_mc['gross_profit'],
            "gross_profit_rate": cumulative_mc['gross_profit_rate'],
            "direct_cost": cumulative_mc['direct_cost'],
            "direct_profit": cumulative_mc['direct_profit'],
            "direct_profit_rate": cumulative_mc['direct_profit_rate'],
            "sg_a": cumulative_mc['sg_a'],
            "operating_profit": cumulative_mc['operating_profit'],
            "operating_profit_rate": cumulative_mc['operating_profit_rate'],
            "expense_detail": cumulative_mc['expense_detail']
        },
        "total": cumulative,
        "channels": cumulative_channels,
        "prev_cumulative": {
            "hk": {
                "tag_sales": prev_cumulative_hk['tag_sales'],
                "net_sales": prev_cumulative_hk['net_sales'],
                "discount_rate": prev_cumulative_hk['discount_rate'],
                "cogs_rate": prev_cumulative_hk['cogs_rate'],
                "gross_profit": prev_cumulative_hk['gross_profit'],
                "gross_profit_rate": prev_cumulative_hk['gross_profit_rate'],
                "direct_cost": prev_cumulative_hk['direct_cost'],
                "direct_profit": prev_cumulative_hk['direct_profit'],
                "direct_profit_rate": prev_cumulative_hk['direct_profit_rate'],
                "sg_a": prev_cumulative_hk['sg_a'],
                "operating_profit": prev_cumulative_hk['operating_profit'],
                "operating_profit_rate": prev_cumulative_hk['operating_profit_rate']
            },
            "mc": {
                "tag_sales": prev_cumulative_mc['tag_sales'],
                "net_sales": prev_cumulative_mc['net_sales'],
                "discount_rate": prev_cumulative_mc['discount_rate'],
                "cogs_rate": prev_cumulative_mc['cogs_rate'],
                "gross_profit": prev_cumulative_mc['gross_profit'],
                "gross_profit_rate": prev_cumulative_mc['gross_profit_rate'],
                "direct_cost": prev_cumulative_mc['direct_cost'],
                "direct_profit": prev_cumulative_mc['direct_profit'],
                "direct_profit_rate": prev_cumulative_mc['direct_profit_rate'],
                "sg_a": prev_cumulative_mc['sg_a'],
                "operating_profit": prev_cumulative_mc['operating_profit'],
                "operating_profit_rate": prev_cumulative_mc['operating_profit_rate']
            },
            "total": prev_cumulative,
            "channels": prev_cumulative_channels
        },
        "yoy": {
            "tag_sales": calc_yoy(cumulative['tag_sales'], prev_cumulative['tag_sales']),
            "net_sales": calc_yoy(cumulative['net_sales'], prev_cumulative['net_sales']),
            "cogs": calc_yoy(cumulative['cogs'], prev_cumulative['cogs']),
            "gross_profit": calc_yoy(cumulative['gross_profit'], prev_cumulative['gross_profit']),
            "direct_cost": calc_yoy(cumulative['direct_cost'], prev_cumulative['direct_cost']),
            "direct_profit": calc_yoy(cumulative['direct_profit'], prev_cumulative['direct_profit']),
            "sg_a": calc_yoy(cumulative['sg_a'], prev_cumulative['sg_a']),
            "operating_profit": calc_yoy(cumulative['operating_profit'], prev_cumulative['operating_profit']),
            # expense_detail YOY 추가
            "salary": calc_yoy(cumulative['expense_detail']['salary'], prev_cumulative['expense_detail']['salary']),
            "marketing": calc_yoy(cumulative['expense_detail']['marketing'], prev_cumulative['expense_detail']['marketing']),
            "fee": calc_yoy(cumulative['expense_detail']['fee'], prev_cumulative['expense_detail']['fee']),
            "rent": calc_yoy(cumulative['expense_detail']['rent'], prev_cumulative['expense_detail']['rent']),
            "insurance": calc_yoy(cumulative['expense_detail']['insurance'], prev_cumulative['expense_detail']['insurance']),
            "travel": calc_yoy(cumulative['expense_detail']['travel'], prev_cumulative['expense_detail']['travel']),
            "other": calc_yoy(cumulative['expense_detail']['other'], prev_cumulative['expense_detail']['other'])
        }
    },
    "channel_direct_profit": channel_direct_profit,
    "discovery": discovery_data
}

# JSON 저장
output_file = 'public/dashboard/hongkong-pl-data-2512.json'
import os
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(pl_data, f, ensure_ascii=False, indent=2)

print(f"\n[OK] 손익요약 표 데이터 생성 완료: {output_file}")
print(f"\n당월 데이터 (2512):")
print(f"  [홍콩]")
print(f"    - Tag매출액: {current_month_hk['tag_sales']:,.0f}K HKD")
print(f"    - 실판매출: {current_month_hk['net_sales']:,.0f}K HKD")
print(f"    - 매출총이익: {current_month_hk['gross_profit']:,.0f}K HKD ({current_month_hk['gross_profit_rate']:.1f}%)")
print(f"    - 직접이익: {current_month_hk['direct_profit']:,.0f}K HKD ({current_month_hk['direct_profit_rate']:.1f}%)")
print(f"    - 영업이익: {current_month_hk['operating_profit']:,.0f}K HKD ({current_month_hk['operating_profit_rate']:.1f}%)")
print(f"  [마카오]")
print(f"    - Tag매출액: {current_month_mc['tag_sales']:,.0f}K HKD")
print(f"    - 실판매출: {current_month_mc['net_sales']:,.0f}K HKD")
print(f"    - 매출총이익: {current_month_mc['gross_profit']:,.0f}K HKD ({current_month_mc['gross_profit_rate']:.1f}%)")
print(f"    - 직접이익: {current_month_mc['direct_profit']:,.0f}K HKD ({current_month_mc['direct_profit_rate']:.1f}%)")
print(f"    - 영업이익: {current_month_mc['operating_profit']:,.0f}K HKD ({current_month_mc['operating_profit_rate']:.1f}%)")
print(f"  [합계]")
print(f"    - Tag매출액: {current_month['tag_sales']:,.0f}K HKD")
print(f"    - 실판매출: {current_month['net_sales']:,.0f}K HKD (YOY {calc_yoy(current_month['net_sales'], prev_month['net_sales']):.1f}%)")
print(f"    - 매출총이익: {current_month['gross_profit']:,.0f}K HKD ({current_month['gross_profit_rate']:.1f}%)")
print(f"    - 직접이익: {current_month['direct_profit']:,.0f}K HKD ({current_month['direct_profit_rate']:.1f}%)")
print(f"    - 영업이익: {current_month['operating_profit']:,.0f}K HKD ({current_month['operating_profit_rate']:.1f}%)")
print(f"\n누적 데이터 (2501~2512):")
print(f"  [홍콩]")
print(f"    - Tag매출액: {cumulative_hk['tag_sales']:,.0f}K HKD")
print(f"    - 실판매출: {cumulative_hk['net_sales']:,.0f}K HKD")
print(f"    - 직접이익: {cumulative_hk['direct_profit']:,.0f}K HKD ({cumulative_hk['direct_profit_rate']:.1f}%)")
print(f"    - 영업이익: {cumulative_hk['operating_profit']:,.0f}K HKD ({cumulative_hk['operating_profit_rate']:.1f}%)")
print(f"  [마카오]")
print(f"    - Tag매출액: {cumulative_mc['tag_sales']:,.0f}K HKD")
print(f"    - 실판매출: {cumulative_mc['net_sales']:,.0f}K HKD")
print(f"    - 직접이익: {cumulative_mc['direct_profit']:,.0f}K HKD ({cumulative_mc['direct_profit_rate']:.1f}%)")
print(f"    - 영업이익: {cumulative_mc['operating_profit']:,.0f}K HKD ({cumulative_mc['operating_profit_rate']:.1f}%)")
print(f"  [합계]")
print(f"    - Tag매출액: {cumulative['tag_sales']:,.0f}K HKD")
print(f"    - 실판매출: {cumulative['net_sales']:,.0f}K HKD (YOY {calc_yoy(cumulative['net_sales'], prev_cumulative['net_sales']):.1f}%)")
print(f"    - 직접이익: {cumulative['direct_profit']:,.0f}K HKD ({cumulative['direct_profit_rate']:.1f}%)")
print(f"    - 영업이익: {cumulative['operating_profit']:,.0f}K HKD ({cumulative['operating_profit_rate']:.1f}%)")
print("\n" + "=" * 80)
