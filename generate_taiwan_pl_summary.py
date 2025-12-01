#!/usr/bin/env python3
"""
대만 대시보드 손익요약 데이터 생성
"""
import csv
import json
from collections import defaultdict
from datetime import datetime
import re

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

def get_store_channel(store_code):
    """Store Code를 기반으로 채널 반환"""
    if is_mlb_outlet(store_code) or is_discovery_retail(store_code):  # 아울렛은 없을 수도 있음
        return 'Outlet'
    elif is_mlb_online(store_code) or is_discovery_online(store_code):
        return 'Online'
    else:
        return 'Retail'

def read_pl_database(csv_file, brand_filter=None, include_office=False):
    """손익 데이터베이스 읽기"""
    pl_data = []
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # TW만
            if row['CNTRY_CD'] != 'TW':
                continue
            
            # 오피스 처리 (T99)
            if row['SHOP_CD'] == 'T99':
                if include_office:
                    # 오피스는 채널 정보 없음
                    row['CHANNEL'] = 'Office'
                    pl_data.append(row)
                continue
            
            # 브랜드 필터 적용
            if brand_filter and row['BRD_CD'] != brand_filter:
                continue
            # 채널 정보 추가
            row['CHANNEL'] = get_store_channel(row['SHOP_CD'])
            pl_data.append(row)
    return pl_data

def get_mlb_sg_a(pl_data, period):
    """MLB 영업비 계산 (T99 오피스의 판매관리비, BRD_CD='M'만)"""
    sg_a = 0.0
    for row in pl_data:
        if (row['PERIOD'] == period and 
            row['SHOP_CD'] == 'T99' and 
            row['BRD_CD'] == 'M' and  # MLB만
            row['ACCOUNT_NM'].strip() == '판매관리비'):
            sg_a += float(row['VALUE'] or 0)
    return sg_a

def get_mlb_expense_detail(pl_data, period):
    """MLB 영업비 상세 항목 추출 (T99 오피스, BRD_CD='M'만)"""
    expense_detail = {
        'salary': 0.0,      # 급여 (SAL_EXP)
        'marketing': 0.0,   # 광고선전비 (AD_EXP)
        'fee': 0.0,         # 지급수수료 (COMM_EXP)
        'rent': 0.0,        # 임차료 (FIX_RENT)
        'insurance': 0.0,    # 보험료 (INS_EXP)
        'travel': 0.0,      # 여비교통비 (TRVL_MEAL_EXP)
        'other': 0.0,       # 기타
        'other_detail': {}  # 기타 상세 항목
    }
    
    # 기타 항목 계정 정의
    other_accounts = {
        'depreciation': {'code': 'DEPR_EXP', 'name': '14. 감가상각비', 'label': '감가상각비'},
        'duty_free': {'code': 'DUTY_FREE_EXP', 'name': '15. 면세점 직접비', 'label': '면세점 직접비'},
        'govt_license': {'code': 'GOVT_LICEN_FEES', 'name': ' - Government Rate & License Fee', 'label': '정부세금 및 라이센스'},
        'logistics': {'code': 'LGT_EXP', 'name': '11. 운반비', 'label': '운반비'},
        'maintenance': {'code': 'MAINT_EXP', 'name': '5. 유지보수비', 'label': '유지보수비'},
        'other_fee': {'code': 'OTHER_FEE_EXP', 'name': '12. 기타 수수료(매장관리비 외)', 'label': '기타 수수료'},
        'rent_free': {'code': 'RENT_FREE_CONC', 'name': ' - Rent free / Rent concession', 'label': '임대료 면제/할인'},
        'retirement': {'code': 'RET_PEN_EXP', 'name': ' - EMPLOYEE BENEFIT PROGRAMS', 'label': '퇴직연금'},
        'supplies': {'code': 'SUPPLIES_EXP', 'name': '7. 소모품비', 'label': '소모품비'},
        'transport': {'code': 'TRANS_EXP', 'name': '운반비', 'label': '운반비(기타)'},
        'uniform': {'code': 'UNIFORM_EXP', 'name': '3. 피복비(유니폼)', 'label': '피복비(유니폼)'},
        'utilities': {'code': 'UTILITIES_EXP', 'name': '6. 수도광열비', 'label': '수도광열비'},
        'var_rent': {'code': 'VAR_RENT', 'name': ' - Turnover Rates', 'label': '매출연동 임대료'},
        'communication': {'code': 'COMMUNI_EXP', 'name': '8. 통신비', 'label': '통신비'},
        'bonus': {'code': 'BON_EXP', 'name': ' - Final Payment', 'label': '최종지급금'}
    }
    
    # 기타 상세 초기화
    for key in other_accounts:
        expense_detail['other_detail'][key] = 0.0
    
    for row in pl_data:
        if (row['PERIOD'] == period and 
            row['SHOP_CD'] == 'T99' and 
            row['BRD_CD'] == 'M'):  # MLB만
            
            account_cd = row['ACCOUNT_CD'].strip()
            account_nm = row['ACCOUNT_NM'].strip()
            value = float(row['VALUE'] or 0)
            
            # 계정 코드 또는 계정명으로 매핑
            if account_cd == 'SAL_EXP' or account_nm == ' - Payroll':
                expense_detail['salary'] += value
            elif account_cd == 'AD_EXP' or account_nm == '9. 광고선전비':
                expense_detail['marketing'] += value
            elif account_cd == 'COMM_EXP' or account_nm == '10. 지급수수료':
                expense_detail['fee'] += value
            elif account_cd == 'FIX_RENT' or account_nm == ' - Base Rent':
                expense_detail['rent'] += value
            elif account_cd == 'INS_EXP' or account_nm == '13. 보험료':
                expense_detail['insurance'] += value
            elif account_cd == 'TRVL_MEAL_EXP' or account_nm == '2. TRAVEL & MEAL':
                expense_detail['travel'] += value
            else:
                # 기타 항목들 분류
                for key, account_info in other_accounts.items():
                    if account_cd == account_info['code'] or account_nm == account_info['name']:
                        expense_detail['other_detail'][key] += value
                        break
    
    # 기타 항목 합계 계산
    expense_detail['other'] = sum(expense_detail['other_detail'].values())
    
    return expense_detail

def aggregate_pl_by_period(pl_data, period, country=None, channel=None):
    """특정 Period의 손익 데이터 집계"""
    result = defaultdict(float)
    
    for row in pl_data:
        if row['PERIOD'] != period:
            continue
        if country and row['CNTRY_CD'] != country:
            continue
        if channel and row.get('CHANNEL') != channel:
            continue
        
        account_nm = row['ACCOUNT_NM'].strip()
        account_cd = row['ACCOUNT_CD'].strip()
        value = float(row['VALUE'] or 0)
        
        # 계정별 집계
        if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
            result['실판'] += value
        elif account_nm == 'Tag매출액' or account_cd == 'TAG_SALE_AMT':
            result['TAG'] += value
        elif account_nm == '매출원가' or account_cd == 'COGS':
            result['매출원가'] += value
        elif account_nm == '매출총이익':
            result['매출총이익'] += value
        elif account_nm == '판매관리비':
            result['판매관리비'] += value
        elif account_nm == '영업이익':
            result['영업이익'] += value
        
        # 직접비 항목들 (매장 직접비)
        # 직접비 = 급여 + 임차료 + 운반비 + 기타 수수료 + 보험료 + 감가상각비 + 면세점 직접비 + TRAVEL & MEAL + 피복비 + 유지보수비 + 수도광열비 + 소모품비 + 통신비 + 광고선전비 + 지급수수료
        # 하지만 실제로는 판매관리비에서 직접비를 제외한 나머지가 영업비 소계일 수도 있음
        # 일단 판매관리비를 영업비 소계로 사용하고, 직접비는 별도 계산
        if account_nm in ['1. 급 여', '4. 임차료', '11. 운반비', '12. 기타 수수료(매장관리비 외)', 
                          '13. 보험료', '14. 감가상각비', '15. 면세점 직접비', '2. TRAVEL & MEAL',
                          '3. 피복비(유니폼)', '5. 유지보수비', '6. 수도광열비', '7. 소모품비',
                          '8. 통신비', '9. 광고선전비', '10. 지급수수료',
                          ' - Base Rent', ' - Payroll', ' - EMPLOYEE BENEFIT PROGRAMS']:
            result['직접비_합계'] += value
        
        # 영업비 소계 = 판매관리비 (직접비를 제외한 나머지 비용들)
        # 현재는 판매관리비 자체를 영업비 소계로 사용
    
    return result

def calculate_store_direct_profit(pl_data, latest_period, prev_period):
    """매장별 영업이익 계산 (직접이익으로 표시하지만 실제로는 영업이익 사용)"""
    stores = {}
    
    # 당월 데이터 집계
    for row in pl_data:
        if row['PERIOD'] != latest_period or row['CNTRY_CD'] != 'TW':
            continue
        
        store_code = row['SHOP_CD']
        if store_code == 'T99':  # 오피스 제외
            continue
        
        if store_code not in stores:
            stores[store_code] = {
                'direct_profit': 0,  # 실제로는 영업이익 저장
                'direct_profit_prev': 0,  # 실제로는 전년 영업이익 저장
                'rent': 0,
                'rent_prev': 0,
                'labor_cost': 0,
                'labor_cost_prev': 0,
                'depreciation': 0,
                'depreciation_prev': 0,
                'net_sales': 0,
                'net_sales_prev': 0
            }
        
        account_nm = row['ACCOUNT_NM'].strip()
        account_cd = row['ACCOUNT_CD'].strip()
        value = float(row['VALUE'] or 0)
        
        # 실매출액
        if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
            stores[store_code]['net_sales'] = value
        
        # 직접비 항목들
        # 임차료 (4. 임차료만 사용)
        if account_nm == '4. 임차료':
            stores[store_code]['rent'] = value
        
        # 인건비 (1. 급 여만 사용)
        if account_nm == '1. 급 여':
            stores[store_code]['labor_cost'] = value
        
        # 감가상각비
        if account_nm in ['14. 감가상각비'] or account_cd == 'DEPR_EXP':
            stores[store_code]['depreciation'] += value
    
    # 전년 동월 데이터 집계
    for row in pl_data:
        if row['PERIOD'] != prev_period or row['CNTRY_CD'] != 'TW':
            continue
        
        store_code = row['SHOP_CD']
        if store_code == 'T99' or store_code not in stores:
            continue
        
        account_nm = row['ACCOUNT_NM'].strip()
        account_cd = row['ACCOUNT_CD'].strip()
        value = float(row['VALUE'] or 0)
        
        # 실매출액
        if account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT':
            stores[store_code]['net_sales_prev'] = value
        
        # 전년 동월 직접비 계산 (4. 임차료만 사용)
        if account_nm == '4. 임차료':
            stores[store_code]['rent_prev'] = value
        # 전년 동월 인건비 계산 (1. 급 여만 사용)
        if account_nm == '1. 급 여':
            stores[store_code]['labor_cost_prev'] = value
        if account_nm in ['14. 감가상각비'] or account_cd == 'DEPR_EXP':
            stores[store_code]['depreciation_prev'] += value
    
    # 영업이익 계산 (CSV에서 직접 읽기)
    for store_code in stores:
        # 당월 영업이익 찾기
        operating_profit = 0
        for row in pl_data:
            if (row['PERIOD'] == latest_period and 
                row['SHOP_CD'] == store_code and 
                row['CNTRY_CD'] == 'TW' and
                row['ACCOUNT_NM'].strip() == '영업이익'):
                operating_profit = float(row['VALUE'] or 0)
                break
        
        # 전년 동월 영업이익 찾기
        operating_profit_prev = 0
        for row in pl_data:
            if (row['PERIOD'] == prev_period and 
                row['SHOP_CD'] == store_code and 
                row['CNTRY_CD'] == 'TW' and
                row['ACCOUNT_NM'].strip() == '영업이익'):
                operating_profit_prev = float(row['VALUE'] or 0)
                break
        
        # direct_profit 필드에 영업이익 저장 (호환성을 위해 필드명은 유지)
        stores[store_code]['direct_profit'] = operating_profit
        stores[store_code]['direct_profit_prev'] = operating_profit_prev
    
    return stores

def calculate_pl_summary(pl_data, latest_period, prev_period):
    """손익요약 계산"""
    
    # 당월 데이터 (대만은 TW 전체)
    current_month_tw_retail = aggregate_pl_by_period(pl_data, latest_period, 'TW', 'Retail')
    current_month_tw_outlet = aggregate_pl_by_period(pl_data, latest_period, 'TW', 'Outlet')
    current_month_tw_online = aggregate_pl_by_period(pl_data, latest_period, 'TW', 'Online')
    current_month_total = defaultdict(float)
    for key in set(list(current_month_tw_retail.keys()) + list(current_month_tw_outlet.keys()) + list(current_month_tw_online.keys())):
        current_month_total[key] = current_month_tw_retail[key] + current_month_tw_outlet[key] + current_month_tw_online[key]
    
    # 전년 동월 데이터
    prev_month_tw_retail = aggregate_pl_by_period(pl_data, prev_period, 'TW', 'Retail')
    prev_month_tw_outlet = aggregate_pl_by_period(pl_data, prev_period, 'TW', 'Outlet')
    prev_month_tw_online = aggregate_pl_by_period(pl_data, prev_period, 'TW', 'Online')
    prev_month_total = defaultdict(float)
    for key in set(list(prev_month_tw_retail.keys()) + list(prev_month_tw_outlet.keys()) + list(prev_month_tw_online.keys())):
        prev_month_total[key] = prev_month_tw_retail[key] + prev_month_tw_outlet[key] + prev_month_tw_online[key]
    
    # 누적 데이터 계산 (1월부터 현재 Period까지)
    latest_year, latest_month = parse_period(latest_period)
    prev_year, prev_month = parse_period(prev_period)
    
    cumulative_periods = [f"{latest_year}{m:02d}" for m in range(1, latest_month + 1)]
    prev_cumulative_periods = [f"{prev_year}{m:02d}" for m in range(1, prev_month + 1)]
    
    cumulative_total = defaultdict(float)
    prev_cumulative_total = defaultdict(float)
    
    for period in cumulative_periods:
        # 대만 누적 (리테일+아울렛+온라인)
        period_data_tw_retail = aggregate_pl_by_period(pl_data, period, 'TW', 'Retail')
        period_data_tw_outlet = aggregate_pl_by_period(pl_data, period, 'TW', 'Outlet')
        period_data_tw_online = aggregate_pl_by_period(pl_data, period, 'TW', 'Online')
        for key in set(list(period_data_tw_retail.keys()) + list(period_data_tw_outlet.keys()) + list(period_data_tw_online.keys())):
            cumulative_total[key] += period_data_tw_retail[key] + period_data_tw_outlet[key] + period_data_tw_online[key]
    
    for period in prev_cumulative_periods:
        # 전년 대만 누적 (리테일+아울렛+온라인)
        period_data_tw_retail = aggregate_pl_by_period(pl_data, period, 'TW', 'Retail')
        period_data_tw_outlet = aggregate_pl_by_period(pl_data, period, 'TW', 'Outlet')
        period_data_tw_online = aggregate_pl_by_period(pl_data, period, 'TW', 'Online')
        for key in set(list(period_data_tw_retail.keys()) + list(period_data_tw_outlet.keys()) + list(period_data_tw_online.keys())):
            prev_cumulative_total[key] += period_data_tw_retail[key] + period_data_tw_outlet[key] + period_data_tw_online[key]
    
    # 계산된 지표들
    def calculate_metrics(current, prev, cumulative, prev_cumulative):
        metrics = {}
        
        # 할인율 = (TAG - 실판) / TAG * 100
        if current['TAG'] > 0:
            metrics['할인율_당월'] = ((current['TAG'] - current['실판']) / current['TAG']) * 100
        else:
            metrics['할인율_당월'] = 0
        
        if prev['TAG'] > 0:
            metrics['할인율_전년'] = ((prev['TAG'] - prev['실판']) / prev['TAG']) * 100
        else:
            metrics['할인율_전년'] = 0
        
        metrics['할인율_당월_변화'] = metrics['할인율_당월'] - metrics['할인율_전년']
        
        if cumulative['TAG'] > 0:
            metrics['할인율_누적'] = ((cumulative['TAG'] - cumulative['실판']) / cumulative['TAG']) * 100
        else:
            metrics['할인율_누적'] = 0
        
        if prev_cumulative['TAG'] > 0:
            metrics['할인율_누적_전년'] = ((prev_cumulative['TAG'] - prev_cumulative['실판']) / prev_cumulative['TAG']) * 100
        else:
            metrics['할인율_누적_전년'] = 0
        
        metrics['할인율_누적_변화'] = metrics['할인율_누적'] - metrics['할인율_누적_전년']
        
        # Tag 원가율 = 매출원가 / TAG * 100
        if current['TAG'] > 0:
            metrics['원가율_당월'] = (current['매출원가'] / current['TAG']) * 100
        else:
            metrics['원가율_당월'] = 0
        
        if prev['TAG'] > 0:
            metrics['원가율_전년'] = (prev['매출원가'] / prev['TAG']) * 100
        else:
            metrics['원가율_전년'] = 0
        
        metrics['원가율_당월_변화'] = metrics['원가율_당월'] - metrics['원가율_전년']
        
        if cumulative['TAG'] > 0:
            metrics['원가율_누적'] = (cumulative['매출원가'] / cumulative['TAG']) * 100
        else:
            metrics['원가율_누적'] = 0
        
        if prev_cumulative['TAG'] > 0:
            metrics['원가율_누적_전년'] = (prev_cumulative['매출원가'] / prev_cumulative['TAG']) * 100
        else:
            metrics['원가율_누적_전년'] = 0
        
        metrics['원가율_누적_변화'] = metrics['원가율_누적'] - metrics['원가율_누적_전년']
        
        # 매출총이익률 = 매출총이익 / 실판 * 100
        if current['실판'] > 0:
            metrics['매출총이익률_당월'] = (current['매출총이익'] / current['실판']) * 100
        else:
            metrics['매출총이익률_당월'] = 0
        
        if prev['실판'] > 0:
            metrics['매출총이익률_전년'] = (prev['매출총이익'] / prev['실판']) * 100
        else:
            metrics['매출총이익률_전년'] = 0
        
        metrics['매출총이익률_당월_변화'] = metrics['매출총이익률_당월'] - metrics['매출총이익률_전년']
        
        if cumulative['실판'] > 0:
            metrics['매출총이익률_누적'] = (cumulative['매출총이익'] / cumulative['실판']) * 100
        else:
            metrics['매출총이익률_누적'] = 0
        
        if prev_cumulative['실판'] > 0:
            metrics['매출총이익률_누적_전년'] = (prev_cumulative['매출총이익'] / prev_cumulative['실판']) * 100
        else:
            metrics['매출총이익률_누적_전년'] = 0
        
        metrics['매출총이익률_누적_변화'] = metrics['매출총이익률_누적'] - metrics['매출총이익률_누적_전년']
        
        # 직접이익 = 매출총이익 - 직접비 합계
        current['직접이익'] = current['매출총이익'] - current['직접비_합계']
        prev['직접이익'] = prev['매출총이익'] - prev['직접비_합계']
        cumulative['직접이익'] = cumulative['매출총이익'] - cumulative['직접비_합계']
        prev_cumulative['직접이익'] = prev_cumulative['매출총이익'] - prev_cumulative['직접비_합계']
        
        # 직접이익율 = 직접이익 / 실판 * 100
        if current['실판'] > 0:
            metrics['직접이익율_당월'] = (current['직접이익'] / current['실판']) * 100
        else:
            metrics['직접이익율_당월'] = 0
        
        if prev['실판'] > 0:
            metrics['직접이익율_전년'] = (prev['직접이익'] / prev['실판']) * 100
        else:
            metrics['직접이익율_전년'] = 0
        
        metrics['직접이익율_당월_변화'] = metrics['직접이익율_당월'] - metrics['직접이익율_전년']
        
        if cumulative['실판'] > 0:
            metrics['직접이익율_누적'] = (cumulative['직접이익'] / cumulative['실판']) * 100
        else:
            metrics['직접이익율_누적'] = 0
        
        if prev_cumulative['실판'] > 0:
            metrics['직접이익율_누적_전년'] = (prev_cumulative['직접이익'] / prev_cumulative['실판']) * 100
        else:
            metrics['직접이익율_누적_전년'] = 0
        
        metrics['직접이익율_누적_변화'] = metrics['직접이익율_누적'] - metrics['직접이익율_누적_전년']
        
        # 영업이익률 = 영업이익 / 실판 * 100
        if current['실판'] > 0:
            metrics['영업이익률_당월'] = (current['영업이익'] / current['실판']) * 100
        else:
            metrics['영업이익률_당월'] = 0
        
        if prev['실판'] > 0:
            metrics['영업이익률_전년'] = (prev['영업이익'] / prev['실판']) * 100
        else:
            metrics['영업이익률_전년'] = 0
        
        metrics['영업이익률_당월_변화'] = metrics['영업이익률_당월'] - metrics['영업이익률_전년']
        
        if cumulative['실판'] > 0:
            metrics['영업이익률_누적'] = (cumulative['영업이익'] / cumulative['실판']) * 100
        else:
            metrics['영업이익률_누적'] = 0
        
        if prev_cumulative['실판'] > 0:
            metrics['영업이익률_누적_전년'] = (prev_cumulative['영업이익'] / prev_cumulative['실판']) * 100
        else:
            metrics['영업이익률_누적_전년'] = 0
        
        metrics['영업이익률_누적_변화'] = metrics['영업이익률_누적'] - metrics['영업이익률_누적_전년']
        
        return metrics
    
    metrics_total = calculate_metrics(current_month_total, prev_month_total, cumulative_total, prev_cumulative_total)
    
    return {
        'current_month': {
            'total': current_month_total,
        },
        'prev_month': {
            'total': prev_month_total,
        },
        'cumulative': {
            'total': cumulative_total,
        },
        'prev_cumulative': {
            'total': prev_cumulative_total,
        },
        'metrics': {
            'total': metrics_total,
        },
    }

def main():
    # 기존 대시보드 데이터에서 최신 Period 가져오기
    with open('components/dashboard/taiwan-dashboard-data.json', 'r', encoding='utf-8') as f:
        dashboard_data = json.load(f)
    
    # metadata에서 Period 찾기
    metadata = dashboard_data.get('metadata', {})
    latest_period_short = metadata.get('last_period', '2510')  # 예: "2510"
    prev_period_short = metadata.get('previous_period', '2410')  # 예: "2410"
    
    # Period 형식 변환 (2510 -> 202510)
    latest_year = 2000 + int(latest_period_short[:2])
    latest_month = int(latest_period_short[2:4])
    latest_period_full = f"{latest_year}{latest_month:02d}"
    
    prev_year = 2000 + int(prev_period_short[:2])
    prev_month = int(prev_period_short[2:4])
    prev_period_full = f"{prev_year}{prev_month:02d}"
    
    print(f"최신 Period: {latest_period_full} ({latest_year}년 {latest_month}월)")
    print(f"전년 동월 Period: {prev_period_full} ({prev_year}년 {prev_month}월)")
    
    # 손익 데이터 읽기 (MLB만, 오피스 제외)
    print("\n손익 데이터 읽는 중...")
    pl_data = read_pl_database('components/dashboard/hmd_pl_database (1).csv', brand_filter='M', include_office=False)
    print(f"총 {len(pl_data):,}건의 MLB 손익 데이터 읽음")
    
    # 영업이익 계산용 데이터 (MLB + M99 오피스)
    pl_data_with_office = read_pl_database('components/dashboard/hmd_pl_database (1).csv', brand_filter='M', include_office=True)
    print(f"오피스 포함 MLB 데이터: {len(pl_data_with_office):,}건")
    
    # 디스커버리 데이터 읽기 (참고용)
    discovery_data = read_pl_database('components/dashboard/hmd_pl_database (1).csv', brand_filter='X', include_office=False)
    print(f"디스커버리 데이터: {len(discovery_data):,}건")
    
    # MLB 영업비 계산 (T99 오피스의 판매관리비)
    mlb_sg_a = get_mlb_sg_a(pl_data_with_office, latest_period_full)
    mlb_sg_a_prev = get_mlb_sg_a(pl_data_with_office, prev_period_full)
    print(f"\nMLB 영업비 (T99 오피스 판매관리비):")
    print(f"  당월 ({latest_period_full}): {mlb_sg_a:,.2f}")
    print(f"  전년 ({prev_period_full}): {mlb_sg_a_prev:,.2f}")
    
    # 영업비 상세 항목 추출
    expense_detail = get_mlb_expense_detail(pl_data_with_office, latest_period_full)
    expense_detail_prev = get_mlb_expense_detail(pl_data_with_office, prev_period_full)
    print(f"\n영업비 상세 항목 (당월):")
    for key, value in expense_detail.items():
        if key != 'other_detail':
            print(f"  {key}: {value:,.2f}")
    print(f"\n기타 상세 항목:")
    for key, value in expense_detail.get('other_detail', {}).items():
        if value > 0:
            print(f"  {key}: {value:,.2f}")
    
    # 누적 영업비 계산 (1월부터 현재까지)
    latest_year, latest_month = parse_period(latest_period_full)
    prev_year, prev_month = parse_period(prev_period_full)
    cumulative_periods = [f"{latest_year}{m:02d}" for m in range(1, latest_month + 1)]
    prev_cumulative_periods = [f"{prev_year}{m:02d}" for m in range(1, prev_month + 1)]
    
    cum_sg_a = 0.0
    cum_sg_a_prev = 0.0
    for period in cumulative_periods:
        cum_sg_a += get_mlb_sg_a(pl_data_with_office, period)
    for period in prev_cumulative_periods:
        cum_sg_a_prev += get_mlb_sg_a(pl_data_with_office, period)
    
    print(f"  누적 (1~{latest_month}월): {cum_sg_a:,.2f}")
    print(f"  전년 누적 (1~{prev_month}월): {cum_sg_a_prev:,.2f}")
    
    # 누적 영업비 상세 항목 계산
    # 기타 상세 항목 키 초기화
    other_accounts = ['depreciation', 'duty_free', 'govt_license', 'logistics', 'maintenance', 
                     'other_fee', 'rent_free', 'retirement', 'supplies', 'transport', 
                     'uniform', 'utilities', 'var_rent', 'communication', 'bonus']
    
    cum_expense_detail = {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {}
    }
    cum_expense_detail_prev = {
        'salary': 0.0,
        'marketing': 0.0,
        'fee': 0.0,
        'rent': 0.0,
        'insurance': 0.0,
        'travel': 0.0,
        'other': 0.0,
        'other_detail': {}
    }
    
    # 기타 상세 항목 초기화
    for key in other_accounts:
        cum_expense_detail['other_detail'][key] = 0.0
        cum_expense_detail_prev['other_detail'][key] = 0.0
    
    for period in cumulative_periods:
        period_detail = get_mlb_expense_detail(pl_data_with_office, period)
        for key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
            cum_expense_detail[key] += period_detail[key]
        for key in other_accounts:
            cum_expense_detail['other_detail'][key] += period_detail.get('other_detail', {}).get(key, 0.0)
    
    for period in prev_cumulative_periods:
        period_detail = get_mlb_expense_detail(pl_data_with_office, period)
        for key in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']:
            cum_expense_detail_prev[key] += period_detail[key]
        for key in other_accounts:
            cum_expense_detail_prev['other_detail'][key] += period_detail.get('other_detail', {}).get(key, 0.0)
    
    print(f"\n영업비 상세 항목 (누적):")
    for key, value in cum_expense_detail.items():
        if key != 'other_detail':
            print(f"  {key}: {value:,.2f}")
    print(f"\n기타 상세 항목 (누적):")
    for key, value in cum_expense_detail.get('other_detail', {}).items():
        if value > 0:
            print(f"  {key}: {value:,.2f}")
    
    # 손익요약 계산
    print("\n손익요약 계산 중...")
    pl_summary = calculate_pl_summary(pl_data, latest_period_full, prev_period_full)
    
    # 결과 출력
    print("\n" + "=" * 100)
    print("손익요약 (단위: 1K HKD)")
    print("=" * 100)
    
    # 표 형식으로 출력
    items = [
        ('TAG', 'TAG', 'TAG'),
        ('실판', '실판', '실판'),
        ('할인율', '할인율_당월', '할인율_누적', '%'),
        ('(Tag 원가율)', '원가율_당월', '원가율_누적', '%'),
        ('매출총이익', '매출총이익', '매출총이익'),
        ('매출총이익률', '매출총이익률_당월', '매출총이익률_누적', '%'),
        ('직접비 합계', '직접비_합계', '직접비_합계'),
        ('직접이익', '직접이익', '직접이익'),
        ('직접이익율', '직접이익율_당월', '직접이익율_누적', '%'),
        ('영업비 소계', '판매관리비', '판매관리비'),
        ('영업이익', '영업이익', '영업이익'),
        ('영업이익율', '영업이익률_당월', '영업이익률_누적', '%'),
    ]
    
    print(f"\n{'항목':<20} {'당월 (대만)':>30} {'당월 전년비':>20} {'YOY':>10} {'누적 (대만)':>30} {'누적 전년비':>20} {'누적 YOY':>10}")
    print("-" * 140)
    
    for item_name, current_key, cumulative_key, *unit in items:
        unit_str = unit[0] if unit else ''
        
        # 당월 (VALUE가 이미 1K TWD 단위)
        current_total = pl_summary['current_month']['total'].get(current_key, 0)
        
        # 전년 동월
        prev_total = pl_summary['prev_month']['total'].get(current_key, 0)
        
        # 변화량
        change_total = current_total - prev_total
        
        # YOY
        yoy_total = (current_total / prev_total * 100) if prev_total != 0 else 0
        
        # 누적 (VALUE가 이미 1K TWD 단위)
        cum_total = pl_summary['cumulative']['total'].get(cumulative_key, 0)
        
        # 전년 누적
        prev_cum_total = pl_summary['prev_cumulative']['total'].get(cumulative_key, 0)
        
        # 누적 변화량
        cum_change_total = cum_total - prev_cum_total
        
        # 누적 YOY
        cum_yoy_total = (cum_total / prev_cum_total * 100) if prev_cum_total != 0 else 0
        
        # 메트릭스 값 사용 (할인율, 원가율 등)
        if current_key in pl_summary['metrics']['total']:
            current_total = pl_summary['metrics']['total'][current_key]
            prev_total = pl_summary['metrics']['total'].get(current_key.replace('_당월', '_전년'), 0)
            change_total = pl_summary['metrics']['total'].get(current_key.replace('_당월', '_당월_변화'), 0)
            yoy_total = 0  # 퍼센트 포인트 변화는 YOY로 표시하지 않음
        
        if cumulative_key in pl_summary['metrics']['total']:
            cum_total = pl_summary['metrics']['total'][cumulative_key]
            prev_cum_total = pl_summary['metrics']['total'].get(cumulative_key.replace('_누적', '_누적_전년'), 0)
            cum_change_total = pl_summary['metrics']['total'].get(cumulative_key.replace('_누적', '_누적_변화'), 0)
            cum_yoy_total = 0
        
        # 출력
        if unit_str == '%':
            print(f"{item_name:<20} "
                  f"{current_total:>28.1f}  "
                  f"{change_total:>18.1f}  "
                  f"{yoy_total:>8.0f}%  "
                  f"{cum_total:>28.1f}  "
                  f"{cum_change_total:>18.1f}  "
                  f"{cum_yoy_total:>8.0f}%")
        else:
            print(f"{item_name:<20} "
                  f"{current_total:>28,.0f}  "
                  f"{change_total:>18,.0f}  "
                  f"{yoy_total:>8.0f}%  "
                  f"{cum_total:>28,.0f}  "
                  f"{cum_change_total:>18,.0f}  "
                  f"{cum_yoy_total:>8.0f}%")
    
    # 채널별 직접이익 계산
    print("\n" + "=" * 100)
    print("채널별 직접이익 및 영업이익")
    print("=" * 100)
    
    # TW 오프라인 (리테일 + 아울렛) - 당월
    current_tw_offline_retail = aggregate_pl_by_period(pl_data, latest_period_full, 'TW', 'Retail')
    current_tw_offline_outlet = aggregate_pl_by_period(pl_data, latest_period_full, 'TW', 'Outlet')
    current_tw_offline = defaultdict(float)
    for key in set(list(current_tw_offline_retail.keys()) + list(current_tw_offline_outlet.keys())):
        current_tw_offline[key] = current_tw_offline_retail[key] + current_tw_offline_outlet[key]
    
    prev_tw_offline_retail = aggregate_pl_by_period(pl_data, prev_period_full, 'TW', 'Retail')
    prev_tw_offline_outlet = aggregate_pl_by_period(pl_data, prev_period_full, 'TW', 'Outlet')
    prev_tw_offline = defaultdict(float)
    for key in set(list(prev_tw_offline_retail.keys()) + list(prev_tw_offline_outlet.keys())):
        prev_tw_offline[key] = prev_tw_offline_retail[key] + prev_tw_offline_outlet[key]
    
    # TW 온라인 - 당월
    current_tw_online = aggregate_pl_by_period(pl_data, latest_period_full, 'TW', 'Online')
    prev_tw_online = aggregate_pl_by_period(pl_data, prev_period_full, 'TW', 'Online')
    
    # 누적 데이터 - 오프라인
    cumulative_tw_offline_retail = defaultdict(float)
    cumulative_tw_offline_outlet = defaultdict(float)
    cumulative_tw_offline = defaultdict(float)
    prev_cumulative_tw_offline_retail = defaultdict(float)
    prev_cumulative_tw_offline_outlet = defaultdict(float)
    prev_cumulative_tw_offline = defaultdict(float)
    
    for period in cumulative_periods:
        period_data_retail = aggregate_pl_by_period(pl_data, period, 'TW', 'Retail')
        period_data_outlet = aggregate_pl_by_period(pl_data, period, 'TW', 'Outlet')
        for key in set(list(period_data_retail.keys()) + list(period_data_outlet.keys())):
            cumulative_tw_offline_retail[key] += period_data_retail[key]
            cumulative_tw_offline_outlet[key] += period_data_outlet[key]
            cumulative_tw_offline[key] += period_data_retail[key] + period_data_outlet[key]
    
    for period in prev_cumulative_periods:
        period_data_retail = aggregate_pl_by_period(pl_data, period, 'TW', 'Retail')
        period_data_outlet = aggregate_pl_by_period(pl_data, period, 'TW', 'Outlet')
        for key in set(list(period_data_retail.keys()) + list(period_data_outlet.keys())):
            prev_cumulative_tw_offline_retail[key] += period_data_retail[key]
            prev_cumulative_tw_offline_outlet[key] += period_data_outlet[key]
            prev_cumulative_tw_offline[key] += period_data_retail[key] + period_data_outlet[key]
    
    # 누적 데이터 - 온라인
    cumulative_tw_online = defaultdict(float)
    prev_cumulative_tw_online = defaultdict(float)
    
    for period in cumulative_periods:
        period_data_online = aggregate_pl_by_period(pl_data, period, 'TW', 'Online')
        for key in period_data_online.keys():
            cumulative_tw_online[key] += period_data_online[key]
    
    for period in prev_cumulative_periods:
        period_data_online = aggregate_pl_by_period(pl_data, period, 'TW', 'Online')
        for key in period_data_online.keys():
            prev_cumulative_tw_online[key] += period_data_online[key]
    
    # 직접이익 계산 (매출총이익 - 직접비)
    tw_offline_direct_profit = current_tw_offline['매출총이익'] - current_tw_offline['직접비_합계']
    tw_offline_direct_profit_prev = prev_tw_offline['매출총이익'] - prev_tw_offline['직접비_합계']
    tw_offline_direct_profit_yoy = (tw_offline_direct_profit / tw_offline_direct_profit_prev * 100) if tw_offline_direct_profit_prev != 0 else 0
    tw_offline_direct_profit_rate = (tw_offline_direct_profit / current_tw_offline['실판'] * 100) if current_tw_offline['실판'] > 0 else 0
    
    tw_online_direct_profit = current_tw_online['매출총이익'] - current_tw_online['직접비_합계']
    tw_online_direct_profit_prev = prev_tw_online['매출총이익'] - prev_tw_online['직접비_합계']
    tw_online_direct_profit_yoy = (tw_online_direct_profit / tw_online_direct_profit_prev * 100) if tw_online_direct_profit_prev != 0 else 0
    tw_online_direct_profit_rate = (tw_online_direct_profit / current_tw_online['실판'] * 100) if current_tw_online['실판'] > 0 else 0
    
    total_direct_profit = tw_offline_direct_profit + tw_online_direct_profit
    total_direct_profit_prev = tw_offline_direct_profit_prev + tw_online_direct_profit_prev
    total_direct_profit_yoy = (total_direct_profit / total_direct_profit_prev * 100) if total_direct_profit_prev != 0 else 0
    
    # 현재 월 합계 데이터 가져오기
    current_month_total = pl_summary['current_month']['total']
    prev_month_total = pl_summary['prev_month']['total']
    
    total_direct_profit_rate = (total_direct_profit / current_month_total['실판'] * 100) if current_month_total['실판'] > 0 else 0
    
    # 직접이익 계산 (영업이익 계산에 사용)
    mlb_direct_profit = current_month_total['매출총이익'] - current_month_total['직접비_합계']
    mlb_direct_profit_prev = prev_month_total['매출총이익'] - prev_month_total['직접비_합계']
    
    # 영업이익 계산 (T99 오피스의 판매관리비를 MLB 영업비로 사용)
    # mlb_sg_a와 mlb_sg_a_prev는 이미 main()에서 계산됨
    
    # 영업이익 = 직접이익 - 영업비
    operating_profit = mlb_direct_profit - mlb_sg_a
    operating_profit_prev = mlb_direct_profit_prev - mlb_sg_a_prev
    operating_profit_rate = (operating_profit / current_month_total['실판'] * 100) if current_month_total['실판'] > 0 else 0
    
    print(f"\n영업이익 (1K HKD): {operating_profit:,.0f}")
    print(f"적자악화 | 이익률 {operating_profit_rate:.1f}%")
    
    print(f"\n채널별 직접이익[이익률]:")
    tw_offline_status = "적자개선" if tw_offline_direct_profit > tw_offline_direct_profit_prev else "적자악화" if tw_offline_direct_profit < 0 else ""
    print(f"TW 오프라인: {tw_offline_direct_profit:,.0f} ({tw_offline_direct_profit_yoy:.0f}%) [{tw_offline_direct_profit_rate:.1f}%] {tw_offline_status}")
    print(f"TW 온라인: {tw_online_direct_profit:,.0f} ({tw_online_direct_profit_yoy:.0f}%) [{tw_online_direct_profit_rate:.1f}%]")
    print(f"전체 직접이익: {total_direct_profit:,.0f} ({total_direct_profit_yoy:.0f}%)")
    print(f"직접이익률: {total_direct_profit_rate:.2f}%")
    
    # 손익 구조
    print(f"\n손익 구조:")
    print(f"{'항목':<25} {'금액':>15} {'YOY':>10} {'전년비':>15}")
    print("-" * 65)
    
    tag_sales = current_month_total['TAG']
    tag_sales_prev = prev_month_total['TAG']
    tag_sales_yoy = (tag_sales / tag_sales_prev * 100) if tag_sales_prev > 0 else 0
    tag_sales_change = tag_sales - tag_sales_prev
    
    discount = tag_sales - current_month_total['실판']
    discount_prev = tag_sales_prev - prev_month_total['실판']
    discount_yoy = (discount / discount_prev * 100) if discount_prev > 0 else 0
    discount_change = discount - discount_prev
    discount_rate = (discount / tag_sales * 100) if tag_sales > 0 else 0
    
    net_sales = current_month_total['실판']
    net_sales_prev = prev_month_total['실판']
    net_sales_yoy = (net_sales / net_sales_prev * 100) if net_sales_prev > 0 else 0
    net_sales_change = net_sales - net_sales_prev
    
    cogs = current_month_total['매출원가']
    cogs_prev = prev_month_total['매출원가']
    cogs_yoy = (cogs / cogs_prev * 100) if cogs_prev > 0 else 0
    cogs_change = cogs - cogs_prev
    cogs_rate = (cogs / tag_sales * 100) if tag_sales > 0 else 0
    
    gross_profit = current_month_total['매출총이익']
    gross_profit_prev = prev_month_total['매출총이익']
    gross_profit_yoy = (gross_profit / gross_profit_prev * 100) if gross_profit_prev > 0 else 0
    gross_profit_change = gross_profit - gross_profit_prev
    gross_profit_rate = (gross_profit / net_sales * 100) if net_sales > 0 else 0
    
    direct_cost = current_month_total['직접비_합계']
    direct_cost_prev = prev_month_total['직접비_합계']
    direct_cost_yoy = (direct_cost / direct_cost_prev * 100) if direct_cost_prev > 0 else 0
    direct_cost_change = direct_cost - direct_cost_prev
    
    direct_profit = gross_profit - direct_cost
    direct_profit_prev = gross_profit_prev - direct_cost_prev
    direct_profit_yoy = (direct_profit / direct_profit_prev * 100) if direct_profit_prev > 0 else 0
    direct_profit_change = direct_profit - direct_profit_prev
    direct_profit_rate = (direct_profit / net_sales * 100) if net_sales > 0 else 0
    
    # MLB 영업비 (T99 오피스의 판매관리비)
    # mlb_sg_a와 mlb_sg_a_prev는 이미 main()에서 계산됨
    sg_a = mlb_sg_a
    sg_a_prev = mlb_sg_a_prev
    sg_a_yoy = (sg_a / sg_a_prev * 100) if sg_a_prev > 0 else 0
    sg_a_change = sg_a - sg_a_prev
    
    op_profit = direct_profit - sg_a
    op_profit_prev = direct_profit_prev - sg_a_prev
    op_profit_change = op_profit - op_profit_prev
    op_profit_rate = (op_profit / net_sales * 100) if net_sales > 0 else 0
    
    print(f"{'택매출':<25} {tag_sales:>15,.0f} {tag_sales_yoy:>9.0f}% {tag_sales_change:>14,.0f}")
    print(f"{'  - 할인 (' + f'{discount_rate:.1f}%)':<25} {discount:>15,.0f} {discount_yoy:>9.0f}% {discount_change:>14,.0f}")
    print(f"{'= 실판매출':<25} {net_sales:>15,.0f} {net_sales_yoy:>9.0f}% {net_sales_change:>14,.0f}")
    print(f"{'  - 매출원가 (' + f'{cogs_rate:.1f}%)':<25} {cogs:>15,.0f} {cogs_yoy:>9.0f}% {cogs_change:>14,.0f}")
    print(f"{'= 매출총이익 (' + f'{gross_profit_rate:.1f}%)':<25} {gross_profit:>15,.0f} {gross_profit_yoy:>9.0f}% {gross_profit_change:>14,.0f}")
    print(f"{'  - 직접비':<25} {direct_cost:>15,.0f} {direct_cost_yoy:>9.0f}% {direct_cost_change:>14,.0f}")
    print(f"{'= 직접이익 (' + f'{direct_profit_rate:.1f}%)':<25} {direct_profit:>15,.0f} {direct_profit_yoy:>9.0f}% {direct_profit_change:>14,.0f}")
    print(f"{'  - 영업비':<25} {sg_a:>15,.0f} {sg_a_yoy:>9.0f}% {sg_a_change:>14,.0f}")
    print(f"{'= 영업이익 (' + f'{op_profit_rate:.1f}%)':<25} {op_profit:>15,.0f} {'적자악화':>9} {op_profit_change:>14,.0f}")
    
    # 디스커버리 참고 데이터
    if discovery_data:
        print(f"\n참고: 디스커버리 실적 (1K HKD)")
        discovery_current = aggregate_pl_by_period(discovery_data, latest_period_full)
        discovery_tag = discovery_current['TAG']
        discovery_net = discovery_current['실판']
        discovery_discount_rate = ((discovery_tag - discovery_net) / discovery_tag * 100) if discovery_tag > 0 else 0
        discovery_direct_cost = discovery_current['직접비_합계']
        discovery_direct_profit = discovery_current['매출총이익'] - discovery_direct_cost
        # 사용자 제공값: 마케팅비 240, 여비교통비 25.74
        discovery_marketing = 240.0
        discovery_travel = 25.74
        discovery_sg_a = 424.02  # 사용자 제공값
        discovery_op_profit = discovery_direct_profit - discovery_sg_a
        
        # 매장 수 확인
        discovery_stores = set()
        for row in discovery_data:
            if row['PERIOD'] == latest_period_full and row['ACCOUNT_NM'] == '실매출액':
                discovery_stores.add((row['CNTRY_CD'], row['SHOP_CD'], row.get('CHANNEL', 'Unknown')))
        
        online_count = sum(1 for _, _, ch in discovery_stores if ch == 'Online')
        offline_count = sum(1 for _, _, ch in discovery_stores if ch in ['Retail', 'Outlet'])
        
        print(f"온라인{online_count}개, 오프라인{offline_count}개 (10/1 영업개시)")
        print(f"실판매출: {discovery_net:,.0f} (할인율 {discovery_discount_rate:.1f}%)")
        print(f"직접비: {discovery_direct_cost:,.0f}")
        print(f"직접손실: {discovery_direct_profit:,.0f}")
        print(f"  - 마케팅비: {discovery_marketing:,.0f}")
        print(f"  - 여비교통비: {discovery_travel:,.0f}")
        print(f"영업손실: {discovery_op_profit:,.0f}")
    
    # 누적 데이터 계산
    current_month_total = pl_summary['current_month']['total']
    prev_month_total = pl_summary['prev_month']['total']
    cumulative_total = pl_summary['cumulative']['total']
    prev_cumulative_total = pl_summary['prev_cumulative']['total']
    
    # 누적 지표 계산
    cum_tag_sales = cumulative_total['TAG']
    cum_tag_sales_prev = prev_cumulative_total['TAG']
    cum_tag_sales_yoy = (cum_tag_sales / cum_tag_sales_prev * 100) if cum_tag_sales_prev > 0 else 0
    cum_tag_sales_change = cum_tag_sales - cum_tag_sales_prev
    
    cum_net_sales = cumulative_total['실판']
    cum_net_sales_prev = prev_cumulative_total['실판']
    cum_net_sales_yoy = (cum_net_sales / cum_net_sales_prev * 100) if cum_net_sales_prev > 0 else 0
    cum_net_sales_change = cum_net_sales - cum_net_sales_prev
    
    cum_discount_rate = pl_summary['metrics']['total']['할인율_누적']
    cum_discount_rate_prev = pl_summary['metrics']['total']['할인율_누적_전년']
    cum_discount_rate_change = pl_summary['metrics']['total']['할인율_누적_변화']
    
    cum_cogs_rate = pl_summary['metrics']['total']['원가율_누적']
    cum_cogs_rate_prev = pl_summary['metrics']['total']['원가율_누적_전년']
    cum_cogs_rate_change = pl_summary['metrics']['total']['원가율_누적_변화']
    
    cum_gross_profit = cumulative_total['매출총이익']
    cum_gross_profit_prev = prev_cumulative_total['매출총이익']
    cum_gross_profit_yoy = (cum_gross_profit / cum_gross_profit_prev * 100) if cum_gross_profit_prev > 0 else 0
    cum_gross_profit_change = cum_gross_profit - cum_gross_profit_prev
    cum_gross_profit_rate = pl_summary['metrics']['total']['매출총이익률_누적']
    cum_gross_profit_rate_prev = pl_summary['metrics']['total']['매출총이익률_누적_전년']
    cum_gross_profit_rate_change = pl_summary['metrics']['total']['매출총이익률_누적_변화']
    
    cum_direct_cost = cumulative_total['직접비_합계']
    cum_direct_cost_prev = prev_cumulative_total['직접비_합계']
    cum_direct_cost_yoy = (cum_direct_cost / cum_direct_cost_prev * 100) if cum_direct_cost_prev > 0 else 0
    cum_direct_cost_change = cum_direct_cost - cum_direct_cost_prev
    
    cum_direct_profit = cumulative_total['직접이익']
    cum_direct_profit_prev = prev_cumulative_total['직접이익']
    cum_direct_profit_yoy = (cum_direct_profit / cum_direct_profit_prev * 100) if cum_direct_profit_prev > 0 else 0
    cum_direct_profit_change = cum_direct_profit - cum_direct_profit_prev
    cum_direct_profit_rate = pl_summary['metrics']['total']['직접이익율_누적']
    cum_direct_profit_rate_prev = pl_summary['metrics']['total']['직접이익율_누적_전년']
    cum_direct_profit_rate_change = pl_summary['metrics']['total']['직접이익율_누적_변화']
    
    # 누적 영업비는 main()에서 계산됨
    
    cum_sg_a_yoy = (cum_sg_a / cum_sg_a_prev * 100) if cum_sg_a_prev > 0 else 0
    cum_sg_a_change = cum_sg_a - cum_sg_a_prev
    
    cum_op_profit = cum_direct_profit - cum_sg_a
    cum_op_profit_prev = cum_direct_profit_prev - cum_sg_a_prev
    cum_op_profit_yoy = (cum_op_profit / cum_op_profit_prev * 100) if cum_op_profit_prev > 0 else 0
    cum_op_profit_change = cum_op_profit - cum_op_profit_prev
    cum_op_profit_rate = (cum_op_profit / cum_net_sales * 100) if cum_net_sales > 0 else 0
    cum_op_profit_rate_prev = (cum_op_profit_prev / cum_net_sales_prev * 100) if cum_net_sales_prev > 0 else 0
    cum_op_profit_rate_change = cum_op_profit_rate - cum_op_profit_rate_prev
    
    # 대만은 HK/MC 구분 없이 total만 사용
    
    # JSON 출력 데이터 구성
    pl_json_data = {
        'metadata': {
            'last_period': latest_period_short,
            'previous_period': prev_period_short,
            'generated_at': datetime.now().isoformat()
        },
        'current_month': {
            'total': {
                'tag_sales': tag_sales,
                'discount': discount,
                'discount_rate': discount_rate,
                'net_sales': net_sales,
                'cogs': cogs,
                'cogs_rate': cogs_rate,
                'gross_profit': gross_profit,
                'gross_profit_rate': gross_profit_rate,
                'direct_cost': direct_cost,
                'direct_profit': direct_profit,
                'direct_profit_rate': direct_profit_rate,
                'sg_a': sg_a,
                'operating_profit': op_profit,
                'operating_profit_rate': op_profit_rate,
                'expense_detail': expense_detail,
            },
            'offline': {
                'tag_sales': current_tw_offline.get('TAG', 0),
                'net_sales': current_tw_offline.get('실판', 0),
                'discount_rate': ((current_tw_offline.get('TAG', 0) - current_tw_offline.get('실판', 0)) / current_tw_offline.get('TAG', 1) * 100) if current_tw_offline.get('TAG', 0) > 0 else 0,
                'cogs': current_tw_offline.get('매출원가', 0),
                'cogs_rate': (current_tw_offline.get('매출원가', 0) / current_tw_offline.get('TAG', 1) * 100) if current_tw_offline.get('TAG', 0) > 0 else 0,
                'gross_profit': current_tw_offline.get('매출총이익', 0),
                'gross_profit_rate': (current_tw_offline.get('매출총이익', 0) / current_tw_offline.get('실판', 1) * 100) if current_tw_offline.get('실판', 0) > 0 else 0,
                'direct_cost': current_tw_offline.get('직접비_합계', 0),
                'direct_profit': current_tw_offline.get('매출총이익', 0) - current_tw_offline.get('직접비_합계', 0),
                'direct_profit_rate': tw_offline_direct_profit_rate,
                'sg_a': (sg_a * current_tw_offline.get('실판', 0) / net_sales) if net_sales > 0 else 0,  # 실판매출 비율로 분배
                'operating_profit': (current_tw_offline.get('매출총이익', 0) - current_tw_offline.get('직접비_합계', 0)) - (sg_a * current_tw_offline.get('실판', 0) / net_sales) if net_sales > 0 else 0,
                'operating_profit_rate': ((current_tw_offline.get('매출총이익', 0) - current_tw_offline.get('직접비_합계', 0) - (sg_a * current_tw_offline.get('실판', 0) / net_sales)) / current_tw_offline.get('실판', 1) * 100) if current_tw_offline.get('실판', 0) > 0 and net_sales > 0 else 0,
            },
            'online': {
                'tag_sales': current_tw_online.get('TAG', 0),
                'net_sales': current_tw_online.get('실판', 0),
                'discount_rate': ((current_tw_online.get('TAG', 0) - current_tw_online.get('실판', 0)) / current_tw_online.get('TAG', 1) * 100) if current_tw_online.get('TAG', 0) > 0 else 0,
                'cogs': current_tw_online.get('매출원가', 0),
                'cogs_rate': (current_tw_online.get('매출원가', 0) / current_tw_online.get('TAG', 1) * 100) if current_tw_online.get('TAG', 0) > 0 else 0,
                'gross_profit': current_tw_online.get('매출총이익', 0),
                'gross_profit_rate': (current_tw_online.get('매출총이익', 0) / current_tw_online.get('실판', 1) * 100) if current_tw_online.get('실판', 0) > 0 else 0,
                'direct_cost': current_tw_online.get('직접비_합계', 0),
                'direct_profit': current_tw_online.get('매출총이익', 0) - current_tw_online.get('직접비_합계', 0),
                'direct_profit_rate': tw_online_direct_profit_rate,
                'sg_a': (sg_a * current_tw_online.get('실판', 0) / net_sales) if net_sales > 0 else 0,  # 실판매출 비율로 분배
                'operating_profit': (current_tw_online.get('매출총이익', 0) - current_tw_online.get('직접비_합계', 0)) - (sg_a * current_tw_online.get('실판', 0) / net_sales) if net_sales > 0 else 0,
                'operating_profit_rate': ((current_tw_online.get('매출총이익', 0) - current_tw_online.get('직접비_합계', 0) - (sg_a * current_tw_online.get('실판', 0) / net_sales)) / current_tw_online.get('실판', 1) * 100) if current_tw_online.get('실판', 0) > 0 and net_sales > 0 else 0,
            },
            'prev_month': {
                'total': {
                    'tag_sales': tag_sales_prev,
                    'net_sales': net_sales_prev,
                    'cogs': cogs_prev,
                    'gross_profit': gross_profit_prev,
                    'direct_cost': direct_cost_prev,
                    'direct_profit': direct_profit_prev,
                    'sg_a': sg_a_prev,
                    'operating_profit': op_profit_prev,
                    'expense_detail': expense_detail_prev,
                },
                'offline': {
                    'tag_sales': prev_tw_offline.get('TAG', 0),
                    'net_sales': prev_tw_offline.get('실판', 0),
                    'discount_rate': ((prev_tw_offline.get('TAG', 0) - prev_tw_offline.get('실판', 0)) / prev_tw_offline.get('TAG', 1) * 100) if prev_tw_offline.get('TAG', 0) > 0 else 0,
                    'cogs': prev_tw_offline.get('매출원가', 0),
                    'cogs_rate': (prev_tw_offline.get('매출원가', 0) / prev_tw_offline.get('TAG', 1) * 100) if prev_tw_offline.get('TAG', 0) > 0 else 0,
                    'gross_profit': prev_tw_offline.get('매출총이익', 0),
                    'gross_profit_rate': (prev_tw_offline.get('매출총이익', 0) / prev_tw_offline.get('실판', 1) * 100) if prev_tw_offline.get('실판', 0) > 0 else 0,
                    'direct_cost': prev_tw_offline.get('직접비_합계', 0),
                    'direct_profit': prev_tw_offline.get('매출총이익', 0) - prev_tw_offline.get('직접비_합계', 0),
                    'direct_profit_rate': (prev_tw_offline.get('매출총이익', 0) - prev_tw_offline.get('직접비_합계', 0)) / prev_tw_offline.get('실판', 1) * 100 if prev_tw_offline.get('실판', 0) > 0 else 0,
                    'sg_a': (sg_a_prev * prev_tw_offline.get('실판', 0) / net_sales_prev) if net_sales_prev > 0 else 0,
                    'operating_profit': (prev_tw_offline.get('매출총이익', 0) - prev_tw_offline.get('직접비_합계', 0)) - (sg_a_prev * prev_tw_offline.get('실판', 0) / net_sales_prev) if net_sales_prev > 0 else 0,
                    'operating_profit_rate': ((prev_tw_offline.get('매출총이익', 0) - prev_tw_offline.get('직접비_합계', 0) - (sg_a_prev * prev_tw_offline.get('실판', 0) / net_sales_prev)) / prev_tw_offline.get('실판', 1) * 100) if prev_tw_offline.get('실판', 0) > 0 and net_sales_prev > 0 else 0,
                },
                'online': {
                    'tag_sales': prev_tw_online.get('TAG', 0),
                    'net_sales': prev_tw_online.get('실판', 0),
                    'discount_rate': ((prev_tw_online.get('TAG', 0) - prev_tw_online.get('실판', 0)) / prev_tw_online.get('TAG', 1) * 100) if prev_tw_online.get('TAG', 0) > 0 else 0,
                    'cogs': prev_tw_online.get('매출원가', 0),
                    'cogs_rate': (prev_tw_online.get('매출원가', 0) / prev_tw_online.get('TAG', 1) * 100) if prev_tw_online.get('TAG', 0) > 0 else 0,
                    'gross_profit': prev_tw_online.get('매출총이익', 0),
                    'gross_profit_rate': (prev_tw_online.get('매출총이익', 0) / prev_tw_online.get('실판', 1) * 100) if prev_tw_online.get('실판', 0) > 0 else 0,
                    'direct_cost': prev_tw_online.get('직접비_합계', 0),
                    'direct_profit': prev_tw_online.get('매출총이익', 0) - prev_tw_online.get('직접비_합계', 0),
                    'direct_profit_rate': (prev_tw_online.get('매출총이익', 0) - prev_tw_online.get('직접비_합계', 0)) / prev_tw_online.get('실판', 1) * 100 if prev_tw_online.get('실판', 0) > 0 else 0,
                    'sg_a': (sg_a_prev * prev_tw_online.get('실판', 0) / net_sales_prev) if net_sales_prev > 0 else 0,
                    'operating_profit': (prev_tw_online.get('매출총이익', 0) - prev_tw_online.get('직접비_합계', 0)) - (sg_a_prev * prev_tw_online.get('실판', 0) / net_sales_prev) if net_sales_prev > 0 else 0,
                    'operating_profit_rate': ((prev_tw_online.get('매출총이익', 0) - prev_tw_online.get('직접비_합계', 0) - (sg_a_prev * prev_tw_online.get('실판', 0) / net_sales_prev)) / prev_tw_online.get('실판', 1) * 100) if prev_tw_online.get('실판', 0) > 0 and net_sales_prev > 0 else 0,
                }
            },
            'yoy': {
                'tag_sales': tag_sales_yoy,
                'discount': discount_yoy,
                'net_sales': net_sales_yoy,
                'cogs': cogs_yoy,
                'gross_profit': gross_profit_yoy,
                'direct_cost': direct_cost_yoy,
                'direct_profit': direct_profit_yoy,
                'sg_a': sg_a_yoy,
                'operating_profit': (op_profit / op_profit_prev * 100) if op_profit_prev != 0 else 0
            },
            'change': {
                'tag_sales': tag_sales_change,
                'discount': discount_change,
                'net_sales': net_sales_change,
                'cogs': cogs_change,
                'gross_profit': gross_profit_change,
                'direct_cost': direct_cost_change,
                'direct_profit': direct_profit_change,
                'sg_a': sg_a_change,
                'operating_profit': op_profit_change
            }
        },
        'cumulative': {
            'total': {
                'tag_sales': cum_tag_sales,
                'net_sales': cum_net_sales,
                'discount_rate': cum_discount_rate,
                'cogs_rate': cum_cogs_rate,
                'gross_profit': cum_gross_profit,
                'gross_profit_rate': cum_gross_profit_rate,
                'direct_cost': cum_direct_cost,
                'direct_profit': cum_direct_profit,
                'direct_profit_rate': cum_direct_profit_rate,
                'sg_a': cum_sg_a,
                'operating_profit': cum_op_profit,
                'operating_profit_rate': cum_op_profit_rate,
                'expense_detail': {
                    'salary': cum_expense_detail['salary'],
                    'marketing': cum_expense_detail['marketing'],
                    'fee': cum_expense_detail['fee'],
                    'rent': cum_expense_detail['rent'],
                    'insurance': cum_expense_detail['insurance'],
                    'travel': cum_expense_detail['travel'],
                    'other': cum_expense_detail['other'],
                    'other_detail': cum_expense_detail['other_detail']
                },
            },
            'offline': {
                'tag_sales': cumulative_tw_offline.get('TAG', 0),
                'net_sales': cumulative_tw_offline.get('실판', 0),
                'discount_rate': ((cumulative_tw_offline.get('TAG', 0) - cumulative_tw_offline.get('실판', 0)) / cumulative_tw_offline.get('TAG', 1) * 100) if cumulative_tw_offline.get('TAG', 0) > 0 else 0,
                'cogs': cumulative_tw_offline.get('매출원가', 0),
                'cogs_rate': (cumulative_tw_offline.get('매출원가', 0) / cumulative_tw_offline.get('TAG', 1) * 100) if cumulative_tw_offline.get('TAG', 0) > 0 else 0,
                'gross_profit': cumulative_tw_offline.get('매출총이익', 0),
                'gross_profit_rate': (cumulative_tw_offline.get('매출총이익', 0) / cumulative_tw_offline.get('실판', 1) * 100) if cumulative_tw_offline.get('실판', 0) > 0 else 0,
                'direct_cost': cumulative_tw_offline.get('직접비_합계', 0),
                'direct_profit': cumulative_tw_offline.get('매출총이익', 0) - cumulative_tw_offline.get('직접비_합계', 0),
                'direct_profit_rate': ((cumulative_tw_offline.get('매출총이익', 0) - cumulative_tw_offline.get('직접비_합계', 0)) / cumulative_tw_offline.get('실판', 1) * 100) if cumulative_tw_offline.get('실판', 0) > 0 else 0,
                'sg_a': (cum_sg_a * cumulative_tw_offline.get('실판', 0) / cum_net_sales) if cum_net_sales > 0 else 0,
                'operating_profit': (cumulative_tw_offline.get('매출총이익', 0) - cumulative_tw_offline.get('직접비_합계', 0)) - (cum_sg_a * cumulative_tw_offline.get('실판', 0) / cum_net_sales) if cum_net_sales > 0 else 0,
                'operating_profit_rate': ((cumulative_tw_offline.get('매출총이익', 0) - cumulative_tw_offline.get('직접비_합계', 0) - (cum_sg_a * cumulative_tw_offline.get('실판', 0) / cum_net_sales)) / cumulative_tw_offline.get('실판', 1) * 100) if cumulative_tw_offline.get('실판', 0) > 0 and cum_net_sales > 0 else 0,
            },
            'online': {
                'tag_sales': cumulative_tw_online.get('TAG', 0),
                'net_sales': cumulative_tw_online.get('실판', 0),
                'discount_rate': ((cumulative_tw_online.get('TAG', 0) - cumulative_tw_online.get('실판', 0)) / cumulative_tw_online.get('TAG', 1) * 100) if cumulative_tw_online.get('TAG', 0) > 0 else 0,
                'cogs': cumulative_tw_online.get('매출원가', 0),
                'cogs_rate': (cumulative_tw_online.get('매출원가', 0) / cumulative_tw_online.get('TAG', 1) * 100) if cumulative_tw_online.get('TAG', 0) > 0 else 0,
                'gross_profit': cumulative_tw_online.get('매출총이익', 0),
                'gross_profit_rate': (cumulative_tw_online.get('매출총이익', 0) / cumulative_tw_online.get('실판', 1) * 100) if cumulative_tw_online.get('실판', 0) > 0 else 0,
                'direct_cost': cumulative_tw_online.get('직접비_합계', 0),
                'direct_profit': cumulative_tw_online.get('매출총이익', 0) - cumulative_tw_online.get('직접비_합계', 0),
                'direct_profit_rate': ((cumulative_tw_online.get('매출총이익', 0) - cumulative_tw_online.get('직접비_합계', 0)) / cumulative_tw_online.get('실판', 1) * 100) if cumulative_tw_online.get('실판', 0) > 0 else 0,
                'sg_a': (cum_sg_a * cumulative_tw_online.get('실판', 0) / cum_net_sales) if cum_net_sales > 0 else 0,
                'operating_profit': (cumulative_tw_online.get('매출총이익', 0) - cumulative_tw_online.get('직접비_합계', 0)) - (cum_sg_a * cumulative_tw_online.get('실판', 0) / cum_net_sales) if cum_net_sales > 0 else 0,
                'operating_profit_rate': ((cumulative_tw_online.get('매출총이익', 0) - cumulative_tw_online.get('직접비_합계', 0) - (cum_sg_a * cumulative_tw_online.get('실판', 0) / cum_net_sales)) / cumulative_tw_online.get('실판', 1) * 100) if cumulative_tw_online.get('실판', 0) > 0 and cum_net_sales > 0 else 0,
            },
            'prev_cumulative': {
                'total': {
                    'tag_sales': cum_tag_sales_prev,
                    'net_sales': cum_net_sales_prev,
                    'gross_profit': cum_gross_profit_prev,
                    'direct_cost': cum_direct_cost_prev,
                    'direct_profit': cum_direct_profit_prev,
                    'sg_a': cum_sg_a_prev,
                    'operating_profit': cum_op_profit_prev,
                    'expense_detail': {
                        'salary': cum_expense_detail_prev.get('salary', 0),
                        'marketing': cum_expense_detail_prev.get('marketing', 0),
                        'fee': cum_expense_detail_prev.get('fee', 0),
                        'rent': cum_expense_detail_prev.get('rent', 0),
                        'insurance': cum_expense_detail_prev.get('insurance', 0),
                        'travel': cum_expense_detail_prev.get('travel', 0),
                        'other': cum_expense_detail_prev.get('other', 0),
                        'other_detail': cum_expense_detail_prev.get('other_detail', {})
                    },
                },
                'offline': {
                    'tag_sales': prev_cumulative_tw_offline.get('TAG', 0),
                    'net_sales': prev_cumulative_tw_offline.get('실판', 0),
                    'discount_rate': ((prev_cumulative_tw_offline.get('TAG', 0) - prev_cumulative_tw_offline.get('실판', 0)) / prev_cumulative_tw_offline.get('TAG', 1) * 100) if prev_cumulative_tw_offline.get('TAG', 0) > 0 else 0,
                    'cogs': prev_cumulative_tw_offline.get('매출원가', 0),
                    'cogs_rate': (prev_cumulative_tw_offline.get('매출원가', 0) / prev_cumulative_tw_offline.get('TAG', 1) * 100) if prev_cumulative_tw_offline.get('TAG', 0) > 0 else 0,
                    'gross_profit': prev_cumulative_tw_offline.get('매출총이익', 0),
                    'gross_profit_rate': (prev_cumulative_tw_offline.get('매출총이익', 0) / prev_cumulative_tw_offline.get('실판', 1) * 100) if prev_cumulative_tw_offline.get('실판', 0) > 0 else 0,
                    'direct_cost': prev_cumulative_tw_offline.get('직접비_합계', 0),
                    'direct_profit': prev_cumulative_tw_offline.get('매출총이익', 0) - prev_cumulative_tw_offline.get('직접비_합계', 0),
                    'direct_profit_rate': ((prev_cumulative_tw_offline.get('매출총이익', 0) - prev_cumulative_tw_offline.get('직접비_합계', 0)) / prev_cumulative_tw_offline.get('실판', 1) * 100) if prev_cumulative_tw_offline.get('실판', 0) > 0 else 0,
                    'sg_a': (cum_sg_a_prev * prev_cumulative_tw_offline.get('실판', 0) / cum_net_sales_prev) if cum_net_sales_prev > 0 else 0,
                    'operating_profit': (prev_cumulative_tw_offline.get('매출총이익', 0) - prev_cumulative_tw_offline.get('직접비_합계', 0)) - (cum_sg_a_prev * prev_cumulative_tw_offline.get('실판', 0) / cum_net_sales_prev) if cum_net_sales_prev > 0 else 0,
                    'operating_profit_rate': ((prev_cumulative_tw_offline.get('매출총이익', 0) - prev_cumulative_tw_offline.get('직접비_합계', 0) - (cum_sg_a_prev * prev_cumulative_tw_offline.get('실판', 0) / cum_net_sales_prev)) / prev_cumulative_tw_offline.get('실판', 1) * 100) if prev_cumulative_tw_offline.get('실판', 0) > 0 and cum_net_sales_prev > 0 else 0,
                },
                'online': {
                    'tag_sales': prev_cumulative_tw_online.get('TAG', 0),
                    'net_sales': prev_cumulative_tw_online.get('실판', 0),
                    'discount_rate': ((prev_cumulative_tw_online.get('TAG', 0) - prev_cumulative_tw_online.get('실판', 0)) / prev_cumulative_tw_online.get('TAG', 1) * 100) if prev_cumulative_tw_online.get('TAG', 0) > 0 else 0,
                    'cogs': prev_cumulative_tw_online.get('매출원가', 0),
                    'cogs_rate': (prev_cumulative_tw_online.get('매출원가', 0) / prev_cumulative_tw_online.get('TAG', 1) * 100) if prev_cumulative_tw_online.get('TAG', 0) > 0 else 0,
                    'gross_profit': prev_cumulative_tw_online.get('매출총이익', 0),
                    'gross_profit_rate': (prev_cumulative_tw_online.get('매출총이익', 0) / prev_cumulative_tw_online.get('실판', 1) * 100) if prev_cumulative_tw_online.get('실판', 0) > 0 else 0,
                    'direct_cost': prev_cumulative_tw_online.get('직접비_합계', 0),
                    'direct_profit': prev_cumulative_tw_online.get('매출총이익', 0) - prev_cumulative_tw_online.get('직접비_합계', 0),
                    'direct_profit_rate': ((prev_cumulative_tw_online.get('매출총이익', 0) - prev_cumulative_tw_online.get('직접비_합계', 0)) / prev_cumulative_tw_online.get('실판', 1) * 100) if prev_cumulative_tw_online.get('실판', 0) > 0 else 0,
                    'sg_a': (cum_sg_a_prev * prev_cumulative_tw_online.get('실판', 0) / cum_net_sales_prev) if cum_net_sales_prev > 0 else 0,
                    'operating_profit': (prev_cumulative_tw_online.get('매출총이익', 0) - prev_cumulative_tw_online.get('직접비_합계', 0)) - (cum_sg_a_prev * prev_cumulative_tw_online.get('실판', 0) / cum_net_sales_prev) if cum_net_sales_prev > 0 else 0,
                    'operating_profit_rate': ((prev_cumulative_tw_online.get('매출총이익', 0) - prev_cumulative_tw_online.get('직접비_합계', 0) - (cum_sg_a_prev * prev_cumulative_tw_online.get('실판', 0) / cum_net_sales_prev)) / prev_cumulative_tw_online.get('실판', 1) * 100) if prev_cumulative_tw_online.get('실판', 0) > 0 and cum_net_sales_prev > 0 else 0,
                }
            },
            'yoy': {
                'tag_sales': cum_tag_sales_yoy,
                'net_sales': cum_net_sales_yoy,
                'gross_profit': cum_gross_profit_yoy,
                'direct_cost': cum_direct_cost_yoy,
                'direct_profit': cum_direct_profit_yoy,
                'sg_a': cum_sg_a_yoy,
                'operating_profit': cum_op_profit_yoy,
            },
            'change': {
                'tag_sales': cum_tag_sales_change,
                'net_sales': cum_net_sales_change,
                'gross_profit': cum_gross_profit_change,
                'direct_cost': cum_direct_cost_change,
                'direct_profit': cum_direct_profit_change,
                'sg_a': cum_sg_a_change,
                'operating_profit': cum_op_profit_change,
            }
        },
        'channel_direct_profit': {
            'tw_offline': {
                'direct_profit': tw_offline_direct_profit,
                'direct_profit_rate': tw_offline_direct_profit_rate,
                'yoy': tw_offline_direct_profit_yoy,
                'status': tw_offline_status
            },
            'tw_online': {
                'direct_profit': tw_online_direct_profit,
                'direct_profit_rate': tw_online_direct_profit_rate,
                'yoy': tw_online_direct_profit_yoy
            },
            'total': {
                'direct_profit': total_direct_profit,
                'direct_profit_rate': total_direct_profit_rate,
                'yoy': total_direct_profit_yoy
            },
            'stores': calculate_store_direct_profit(pl_data, latest_period_full, prev_period_full)
        },
        'discovery': {
            'net_sales': discovery_net if discovery_data else 0,
            'discount_rate': discovery_discount_rate if discovery_data else 0,
            'direct_cost': discovery_direct_cost if discovery_data else 0,
            'direct_profit': discovery_direct_profit if discovery_data else 0,
            'marketing': discovery_marketing if discovery_data else 0,
            'travel': discovery_travel if discovery_data else 0,
            'sg_a': discovery_sg_a if discovery_data else 0,
            'operating_profit': discovery_op_profit if discovery_data else 0,
            'store_count': {
                'online': online_count if discovery_data else 0,
                'offline': offline_count if discovery_data else 0
            }
        } if discovery_data else None
    }
    
    # JSON 파일 저장
    output_file = 'components/dashboard/taiwan-pl-data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(pl_json_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nP&L 데이터가 {output_file}에 저장되었습니다.")

if __name__ == '__main__':
    main()

