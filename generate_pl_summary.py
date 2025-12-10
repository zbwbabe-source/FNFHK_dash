#!/usr/bin/env python3
"""
홍콩 대시보드 손익요약 데이터 생성
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

# Store Code 분류 (재고수불 CSV와 동일)
OUTLET_CODES = {'M07', 'M13', 'M15', 'M21'}
ONLINE_MLB_CODES = {'HE1', 'HE2'}
ONLINE_DX_CODES = {'XE1'}

def is_discovery_online(store_code):
    """Discovery 온라인 (XE로 시작)"""
    return store_code.startswith('XE')

def get_store_channel(store_code):
    """Store Code를 기반으로 채널 반환"""
    if store_code in OUTLET_CODES:
        return 'Outlet'
    elif store_code in ONLINE_MLB_CODES or store_code in ONLINE_DX_CODES or is_discovery_online(store_code):
        return 'Online'
    else:
        return 'Retail'

def read_pl_database(csv_file, brand_filter=None, include_office=False):
    """손익 데이터베이스 읽기"""
    pl_data = []
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # HK와 MC만
            if row['CNTRY_CD'] not in ['HK', 'MC']:
                continue
            
            # 오피스 처리 (M99)
            if row['SHOP_CD'] == 'M99':
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
    """MLB 영업비 계산 (M99 오피스의 판매관리비, BRD_CD='M'만)"""
    sg_a = 0.0
    matched_rows = 0
    for row in pl_data:
        if (str(row['PERIOD']) == str(period) and 
            row['SHOP_CD'] == 'M99' and 
            row['BRD_CD'] == 'M' and  # MLB만
            row['ACCOUNT_NM'].strip() == '판매관리비'):
            sg_a += float(row['VALUE'] or 0)
            matched_rows += 1
    # 디버그 로그
    if matched_rows > 0:
        print(f"  DEBUG: M99 MLB 영업비 matched rows: {matched_rows}, total: {sg_a:,.2f}")
    return sg_a

def get_dx_sg_a(pl_data, period):
    """DX(디스커버리) 영업비 계산 (M99 오피스의 판매관리비, BRD_CD='X'만)"""
    sg_a = 0.0
    matched_rows = 0
    for row in pl_data:
        if (str(row['PERIOD']) == str(period) and 
            row['SHOP_CD'] == 'M99' and 
            row['BRD_CD'] == 'X' and  # DX만
            row['ACCOUNT_NM'].strip() == '판매관리비'):
            sg_a += float(row['VALUE'] or 0)
            matched_rows += 1
    # 디버그 로그
    if matched_rows > 0:
        print(f"  DEBUG: M99 DX 영업비 matched rows: {matched_rows}, total: {sg_a:,.2f}")
    return sg_a

def get_mlb_expense_detail(pl_data, period):
    """MLB 영업비 상세 항목 추출 (M99 오피스, BRD_CD='M'만)"""
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
            row['SHOP_CD'] == 'M99' and 
            row['BRD_CD'] == 'M'):  # MLB M99(오피스)만
            
            account_cd = row['ACCOUNT_CD'].strip()
            account_nm = row['ACCOUNT_NM'].strip()
            value = float(row['VALUE'] or 0)
            
            # 계정 코드 또는 계정명으로 매핑
            if account_cd == 'SAL_EXP' or account_nm == ' - Payroll' or account_nm == '1. 급 여':
                expense_detail['salary'] += value
            elif account_cd == 'AD_EXP' or account_nm == '9. 광고선전비':
                expense_detail['marketing'] += value
            elif account_cd == 'COMM_EXP' or account_nm == '10. 지급수수료':
                expense_detail['fee'] += value
            elif account_cd == 'FIX_RENT' or account_nm == ' - Base Rent' or account_nm == '4. 임차료':
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

def calculate_pl_summary(pl_data, latest_period, prev_period):
    """손익요약 계산"""
    
    # 당월 데이터
    # 홍콩 = 리테일 + 아울렛 + 온라인 합계
    current_month_hk_retail = aggregate_pl_by_period(pl_data, latest_period, 'HK', 'Retail')
    current_month_hk_outlet = aggregate_pl_by_period(pl_data, latest_period, 'HK', 'Outlet')
    current_month_hk_online = aggregate_pl_by_period(pl_data, latest_period, 'HK', 'Online')
    current_month_hk = defaultdict(float)
    for key in set(list(current_month_hk_retail.keys()) + list(current_month_hk_outlet.keys()) + list(current_month_hk_online.keys())):
        current_month_hk[key] = current_month_hk_retail[key] + current_month_hk_outlet[key] + current_month_hk_online[key]
    
    # 마카오 = 리테일 + 아울렛 합계
    current_month_mc_retail = aggregate_pl_by_period(pl_data, latest_period, 'MC', 'Retail')
    current_month_mc_outlet = aggregate_pl_by_period(pl_data, latest_period, 'MC', 'Outlet')
    current_month_mc = defaultdict(float)
    for key in set(list(current_month_mc_retail.keys()) + list(current_month_mc_outlet.keys())):
        current_month_mc[key] = current_month_mc_retail[key] + current_month_mc_outlet[key]
    
    # 합계
    current_month_total = defaultdict(float)
    for key in set(list(current_month_hk.keys()) + list(current_month_mc.keys())):
        current_month_total[key] = current_month_hk[key] + current_month_mc[key]
    
    # 전년 동월 데이터
    prev_month_hk_retail = aggregate_pl_by_period(pl_data, prev_period, 'HK', 'Retail')
    prev_month_hk_outlet = aggregate_pl_by_period(pl_data, prev_period, 'HK', 'Outlet')
    prev_month_hk_online = aggregate_pl_by_period(pl_data, prev_period, 'HK', 'Online')
    prev_month_hk = defaultdict(float)
    for key in set(list(prev_month_hk_retail.keys()) + list(prev_month_hk_outlet.keys()) + list(prev_month_hk_online.keys())):
        prev_month_hk[key] = prev_month_hk_retail[key] + prev_month_hk_outlet[key] + prev_month_hk_online[key]
    
    prev_month_mc_retail = aggregate_pl_by_period(pl_data, prev_period, 'MC', 'Retail')
    prev_month_mc_outlet = aggregate_pl_by_period(pl_data, prev_period, 'MC', 'Outlet')
    prev_month_mc = defaultdict(float)
    for key in set(list(prev_month_mc_retail.keys()) + list(prev_month_mc_outlet.keys())):
        prev_month_mc[key] = prev_month_mc_retail[key] + prev_month_mc_outlet[key]
    
    prev_month_total = defaultdict(float)
    for key in set(list(prev_month_hk.keys()) + list(prev_month_mc.keys())):
        prev_month_total[key] = prev_month_hk[key] + prev_month_mc[key]
    
    # 누적 데이터 계산 (1월부터 현재 Period까지)
    latest_year, latest_month = parse_period(latest_period)
    prev_year, prev_month = parse_period(prev_period)
    
    cumulative_periods = [f"{latest_year}{m:02d}" for m in range(1, latest_month + 1)]
    prev_cumulative_periods = [f"{prev_year}{m:02d}" for m in range(1, prev_month + 1)]
    
    cumulative_hk = defaultdict(float)
    cumulative_mc = defaultdict(float)
    cumulative_total = defaultdict(float)
    
    prev_cumulative_hk = defaultdict(float)
    prev_cumulative_mc = defaultdict(float)
    prev_cumulative_total = defaultdict(float)
    
    # 누적 오프라인 데이터 (온라인 제외) - 초기화
    cumulative_offline = defaultdict(float)
    prev_cumulative_offline = defaultdict(float)
    
    for period in cumulative_periods:
        # 홍콩 누적 (리테일+아울렛+온라인)
        period_data_hk_retail = aggregate_pl_by_period(pl_data, period, 'HK', 'Retail')
        period_data_hk_outlet = aggregate_pl_by_period(pl_data, period, 'HK', 'Outlet')
        period_data_hk_online = aggregate_pl_by_period(pl_data, period, 'HK', 'Online')
        for key in set(list(period_data_hk_retail.keys()) + list(period_data_hk_outlet.keys()) + list(period_data_hk_online.keys())):
            cumulative_hk[key] += period_data_hk_retail[key] + period_data_hk_outlet[key] + period_data_hk_online[key]
        
        # 마카오 누적 (리테일+아울렛)
        period_data_mc_retail = aggregate_pl_by_period(pl_data, period, 'MC', 'Retail')
        period_data_mc_outlet = aggregate_pl_by_period(pl_data, period, 'MC', 'Outlet')
        for key in set(list(period_data_mc_retail.keys()) + list(period_data_mc_outlet.keys())):
            cumulative_mc[key] += period_data_mc_retail[key] + period_data_mc_outlet[key]
        
        # 누적 오프라인 (홍콩만 리테일+아울렛, 온라인 제외, 마카오 제외)
        for key in set(list(period_data_hk_retail.keys()) + list(period_data_hk_outlet.keys())):
            cumulative_offline[key] += period_data_hk_retail[key] + period_data_hk_outlet[key]
        
        # 합계
        for key in set(list(cumulative_hk.keys()) + list(cumulative_mc.keys())):
            cumulative_total[key] = cumulative_hk[key] + cumulative_mc[key]
    
    for period in prev_cumulative_periods:
        # 전년 홍콩 누적 (리테일+아울렛+온라인)
        period_data_hk_retail = aggregate_pl_by_period(pl_data, period, 'HK', 'Retail')
        period_data_hk_outlet = aggregate_pl_by_period(pl_data, period, 'HK', 'Outlet')
        period_data_hk_online = aggregate_pl_by_period(pl_data, period, 'HK', 'Online')
        for key in set(list(period_data_hk_retail.keys()) + list(period_data_hk_outlet.keys()) + list(period_data_hk_online.keys())):
            prev_cumulative_hk[key] += period_data_hk_retail[key] + period_data_hk_outlet[key] + period_data_hk_online[key]
        
        # 전년 마카오 누적 (리테일+아울렛)
        period_data_mc_retail = aggregate_pl_by_period(pl_data, period, 'MC', 'Retail')
        period_data_mc_outlet = aggregate_pl_by_period(pl_data, period, 'MC', 'Outlet')
        for key in set(list(period_data_mc_retail.keys()) + list(period_data_mc_outlet.keys())):
            prev_cumulative_mc[key] += period_data_mc_retail[key] + period_data_mc_outlet[key]
        
        # 전년 누적 오프라인 (홍콩만 리테일+아울렛, 온라인 제외, 마카오 제외)
        for key in set(list(period_data_hk_retail.keys()) + list(period_data_hk_outlet.keys())):
            prev_cumulative_offline[key] += period_data_hk_retail[key] + period_data_hk_outlet[key]
        
        # 전년 합계
        for key in set(list(prev_cumulative_hk.keys()) + list(prev_cumulative_mc.keys())):
            prev_cumulative_total[key] = prev_cumulative_hk[key] + prev_cumulative_mc[key]
    
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
    
    metrics_hk = calculate_metrics(current_month_hk, prev_month_hk, cumulative_hk, prev_cumulative_hk)
    metrics_mc = calculate_metrics(current_month_mc, prev_month_mc, cumulative_mc, prev_cumulative_mc)
    metrics_total = calculate_metrics(current_month_total, prev_month_total, cumulative_total, prev_cumulative_total)
    
    return {
        'current_month': {
            'hk': current_month_hk,
            'mc': current_month_mc,
            'total': current_month_total,
        },
        'prev_month': {
            'hk': prev_month_hk,
            'mc': prev_month_mc,
            'total': prev_month_total,
        },
        'cumulative': {
            'hk': cumulative_hk,
            'mc': cumulative_mc,
            'total': cumulative_total,
        },
        'prev_cumulative': {
            'hk': prev_cumulative_hk,
            'mc': prev_cumulative_mc,
            'total': prev_cumulative_total,
        },
        'metrics': {
            'hk': metrics_hk,
            'mc': metrics_mc,
            'total': metrics_total,
        },
    }

def main(target_period_short=None):
    """PL Summary 생성
    
    Args:
        target_period_short: 처리할 Period (예: '2410'). None이면 dashboard-data.json에서 읽음
    """
    if target_period_short:
        # target_period가 지정되면 직접 사용
        latest_period_short = target_period_short
        latest_year = 2000 + int(latest_period_short[:2])
        latest_month = int(latest_period_short[2:4])
        prev_year = latest_year - 1
        prev_period_short = f"{prev_year % 100:02d}{latest_month:02d}"
    else:
        # 기존 대시보드 데이터에서 최신 Period 가져오기
        with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
            dashboard_data = json.load(f)
        
        # metadata에서 Period 찾기
        metadata = dashboard_data.get('metadata', {})
        latest_period_short = metadata.get('last_period', '2510')  # 예: "2510"
        prev_period_short = metadata.get('previous_period', '2410')  # 예: "2410"
        
        # Period 형식 변환 (2510 -> 202510)
        latest_year = 2000 + int(latest_period_short[:2])
        latest_month = int(latest_period_short[2:4])
        prev_year = 2000 + int(prev_period_short[:2])
        prev_month = int(prev_period_short[2:4])
        prev_period_full = f"{prev_year}{prev_month:02d}"
    
    latest_period_full = f"{latest_year}{latest_month:02d}"
    if not target_period_short:
        prev_period_full = f"{prev_year}{prev_month:02d}"
    else:
        prev_period_full = f"{prev_year}{latest_month:02d}"
    
    # 전월 (MOM - Month over Month) 계산
    if latest_month == 1:
        prev_month_period = f"{latest_year - 1}12"
    else:
        prev_month_period = f"{latest_year}{latest_month - 1:02d}"
    
    print(f"처리 Period: {latest_period_full} ({latest_year}년 {latest_month}월)")
    print(f"전년 동월 Period: {prev_period_full} ({prev_year}년 {latest_month}월)")
    print(f"전월 Period: {prev_month_period}")
    
    # 손익 데이터 읽기 (MLB만, 오피스 제외)
    print("\n손익 데이터 읽는 중...")
    # Period별 파일 찾기
    pl_csv_path = f'../Dashboard_Raw_Data/hmd_pl_database_{latest_period_short}.csv'
    import os
    if not os.path.exists(pl_csv_path):
        pl_csv_path = '../Dashboard_Raw_Data/hmd_pl_database.csv'
    print(f"PL CSV 파일: {pl_csv_path}")
    pl_data = read_pl_database(pl_csv_path, brand_filter='M', include_office=False)
    print(f"총 {len(pl_data):,}건의 MLB 손익 데이터 읽음")
    
    # 영업이익 계산용 데이터 (MLB + M99 오피스) - 동일한 파일 사용!
    pl_data_with_office = read_pl_database(pl_csv_path, brand_filter='M', include_office=True)
    print(f"오피스 포함 MLB 데이터: {len(pl_data_with_office):,}건")
    
    # 디스커버리 데이터 읽기 (참고용) - 동일한 파일 사용!
    discovery_data = read_pl_database(pl_csv_path, brand_filter='X', include_office=False)
    print(f"디스커버리 데이터: {len(discovery_data):,}건")
    
    # 누적 기간 계산 (디스커버리 누적 계산에 사용)
    latest_year, latest_month = parse_period(latest_period_full)
    cumulative_periods = [f"{latest_year}{m:02d}" for m in range(1, latest_month + 1)]
    
    # MLB 영업비 계산 (M99 오피스의 판매관리비)
    mlb_sg_a = get_mlb_sg_a(pl_data_with_office, latest_period_full)
    mlb_sg_a_prev = get_mlb_sg_a(pl_data_with_office, prev_period_full)
    print(f"\nMLB 영업비 (M99 오피스 판매관리비):")
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
    
    print(f"\n{'항목':<20} {'당월 (홍콩/마카오/합계)':>60} {'당월 전년비':>50} {'YOY':>10} {'누적 (홍콩/마카오/합계)':>60} {'누적 전년비':>50} {'누적 YOY':>10}")
    print("-" * 260)
    
    for item_name, current_key, cumulative_key, *unit in items:
        unit_str = unit[0] if unit else ''
        
        # 당월 (VALUE가 이미 1K HKD 단위)
        current_hk = pl_summary['current_month']['hk'].get(current_key, 0)
        current_mc = pl_summary['current_month']['mc'].get(current_key, 0)
        current_total = pl_summary['current_month']['total'].get(current_key, 0)
        
        # 전년 동월
        prev_hk = pl_summary['prev_month']['hk'].get(current_key, 0)
        prev_mc = pl_summary['prev_month']['mc'].get(current_key, 0)
        prev_total = pl_summary['prev_month']['total'].get(current_key, 0)
        
        # 변화량
        change_hk = current_hk - prev_hk
        change_mc = current_mc - prev_mc
        change_total = current_total - prev_total
        
        # YOY
        yoy_hk = (current_hk / prev_hk * 100) if prev_hk != 0 else 0
        yoy_mc = (current_mc / prev_mc * 100) if prev_mc != 0 else 0
        yoy_total = (current_total / prev_total * 100) if prev_total != 0 else 0
        
        # 누적 (VALUE가 이미 1K HKD 단위)
        cum_hk = pl_summary['cumulative']['hk'].get(cumulative_key, 0)
        cum_mc = pl_summary['cumulative']['mc'].get(cumulative_key, 0)
        cum_total = pl_summary['cumulative']['total'].get(cumulative_key, 0)
        
        # 전년 누적
        prev_cum_hk = pl_summary['prev_cumulative']['hk'].get(cumulative_key, 0)
        prev_cum_mc = pl_summary['prev_cumulative']['mc'].get(cumulative_key, 0)
        prev_cum_total = pl_summary['prev_cumulative']['total'].get(cumulative_key, 0)
        
        # 누적 변화량
        cum_change_hk = cum_hk - prev_cum_hk
        cum_change_mc = cum_mc - prev_cum_mc
        cum_change_total = cum_total - prev_cum_total
        
        # 누적 YOY
        cum_yoy_hk = (cum_hk / prev_cum_hk * 100) if prev_cum_hk != 0 else 0
        cum_yoy_mc = (cum_mc / prev_cum_mc * 100) if prev_cum_mc != 0 else 0
        cum_yoy_total = (cum_total / prev_cum_total * 100) if prev_cum_total != 0 else 0
        
        # 메트릭스 값 사용 (할인율, 원가율 등)
        if current_key in pl_summary['metrics']['hk']:
            current_hk = pl_summary['metrics']['hk'][current_key]
            current_mc = pl_summary['metrics']['mc'][current_key]
            current_total = pl_summary['metrics']['total'][current_key]
            
            prev_hk = pl_summary['metrics']['hk'].get(current_key.replace('_당월', '_전년'), 0)
            prev_mc = pl_summary['metrics']['mc'].get(current_key.replace('_당월', '_전년'), 0)
            prev_total = pl_summary['metrics']['total'].get(current_key.replace('_당월', '_전년'), 0)
            
            change_hk = pl_summary['metrics']['hk'].get(current_key.replace('_당월', '_당월_변화'), 0)
            change_mc = pl_summary['metrics']['mc'].get(current_key.replace('_당월', '_당월_변화'), 0)
            change_total = pl_summary['metrics']['total'].get(current_key.replace('_당월', '_당월_변화'), 0)
            
            yoy_hk = 0  # 퍼센트 포인트 변화는 YOY로 표시하지 않음
            yoy_mc = 0
            yoy_total = 0
        
        if cumulative_key in pl_summary['metrics']['hk']:
            cum_hk = pl_summary['metrics']['hk'][cumulative_key]
            cum_mc = pl_summary['metrics']['mc'][cumulative_key]
            cum_total = pl_summary['metrics']['total'][cumulative_key]
            
            prev_cum_hk = pl_summary['metrics']['hk'].get(cumulative_key.replace('_누적', '_누적_전년'), 0)
            prev_cum_mc = pl_summary['metrics']['mc'].get(cumulative_key.replace('_누적', '_누적_전년'), 0)
            prev_cum_total = pl_summary['metrics']['total'].get(cumulative_key.replace('_누적', '_누적_전년'), 0)
            
            cum_change_hk = pl_summary['metrics']['hk'].get(cumulative_key.replace('_누적', '_누적_변화'), 0)
            cum_change_mc = pl_summary['metrics']['mc'].get(cumulative_key.replace('_누적', '_누적_변화'), 0)
            cum_change_total = pl_summary['metrics']['total'].get(cumulative_key.replace('_누적', '_누적_변화'), 0)
            
            cum_yoy_hk = 0
            cum_yoy_mc = 0
            cum_yoy_total = 0
        
        # 출력
        if unit_str == '%':
            print(f"{item_name:<20} "
                  f"HK:{current_hk:>8.1f} MC:{current_mc:>8.1f} 합:{current_total:>8.1f}  "
                  f"HK:{change_hk:>7.1f} MC:{change_mc:>7.1f} 합:{change_total:>7.1f}  "
                  f"{yoy_total:>8.0f}%  "
                  f"HK:{cum_hk:>8.1f} MC:{cum_mc:>8.1f} 합:{cum_total:>8.1f}  "
                  f"HK:{cum_change_hk:>7.1f} MC:{cum_change_mc:>7.1f} 합:{cum_change_total:>7.1f}  "
                  f"{cum_yoy_total:>8.0f}%")
        else:
            print(f"{item_name:<20} "
                  f"HK:{current_hk:>8,.0f} MC:{current_mc:>8,.0f} 합:{current_total:>8,.0f}  "
                  f"HK:{change_hk:>7,.0f} MC:{change_mc:>7,.0f} 합:{change_total:>7,.0f}  "
                  f"{yoy_total:>8.0f}%  "
                  f"HK:{cum_hk:>8,.0f} MC:{cum_mc:>8,.0f} 합:{cum_total:>8,.0f}  "
                  f"HK:{cum_change_hk:>7,.0f} MC:{cum_change_mc:>7,.0f} 합:{cum_change_total:>7,.0f}  "
                  f"{cum_yoy_total:>8.0f}%")
    
    # 채널별 직접이익 계산
    print("\n" + "=" * 100)
    print("채널별 직접이익 및 영업이익")
    print("=" * 100)
    
    # HK 오프라인 (리테일 + 아울렛)
    current_hk_offline_retail = aggregate_pl_by_period(pl_data, latest_period_full, 'HK', 'Retail')
    current_hk_offline_outlet = aggregate_pl_by_period(pl_data, latest_period_full, 'HK', 'Outlet')
    current_hk_offline = defaultdict(float)
    for key in set(list(current_hk_offline_retail.keys()) + list(current_hk_offline_outlet.keys())):
        current_hk_offline[key] = current_hk_offline_retail[key] + current_hk_offline_outlet[key]
    
    prev_hk_offline_retail = aggregate_pl_by_period(pl_data, prev_period_full, 'HK', 'Retail')
    prev_hk_offline_outlet = aggregate_pl_by_period(pl_data, prev_period_full, 'HK', 'Outlet')
    prev_hk_offline = defaultdict(float)
    for key in set(list(prev_hk_offline_retail.keys()) + list(prev_hk_offline_outlet.keys())):
        prev_hk_offline[key] = prev_hk_offline_retail[key] + prev_hk_offline_outlet[key]
    
    # MC 오프라인 (리테일 + 아울렛)
    current_mc_offline_retail = aggregate_pl_by_period(pl_data, latest_period_full, 'MC', 'Retail')
    current_mc_offline_outlet = aggregate_pl_by_period(pl_data, latest_period_full, 'MC', 'Outlet')
    current_mc_offline = defaultdict(float)
    for key in set(list(current_mc_offline_retail.keys()) + list(current_mc_offline_outlet.keys())):
        current_mc_offline[key] = current_mc_offline_retail[key] + current_mc_offline_outlet[key]
    
    prev_mc_offline_retail = aggregate_pl_by_period(pl_data, prev_period_full, 'MC', 'Retail')
    prev_mc_offline_outlet = aggregate_pl_by_period(pl_data, prev_period_full, 'MC', 'Outlet')
    prev_mc_offline = defaultdict(float)
    for key in set(list(prev_mc_offline_retail.keys()) + list(prev_mc_offline_outlet.keys())):
        prev_mc_offline[key] = prev_mc_offline_retail[key] + prev_mc_offline_outlet[key]
    
    # HK 온라인
    current_hk_online = aggregate_pl_by_period(pl_data, latest_period_full, 'HK', 'Online')
    prev_hk_online = aggregate_pl_by_period(pl_data, prev_period_full, 'HK', 'Online')
    
    # 직접이익 계산 (매출총이익 - 직접비)
    hk_offline_direct_profit = current_hk_offline['매출총이익'] - current_hk_offline['직접비_합계']
    hk_offline_direct_profit_prev = prev_hk_offline['매출총이익'] - prev_hk_offline['직접비_합계']
    # 전년이 적자면 YOY 계산 대신 흑자전환 표시
    if hk_offline_direct_profit_prev <= 0:
        hk_offline_direct_profit_yoy = None  # 흑자전환
    elif hk_offline_direct_profit_prev > 0:
        hk_offline_direct_profit_yoy = (hk_offline_direct_profit / hk_offline_direct_profit_prev * 100) if hk_offline_direct_profit_prev != 0 else 0
    else:
        hk_offline_direct_profit_yoy = 0
    hk_offline_direct_profit_rate = (hk_offline_direct_profit / current_hk_offline['실판'] * 100) if current_hk_offline['실판'] > 0 else 0
    
    mc_offline_direct_profit = current_mc_offline['매출총이익'] - current_mc_offline['직접비_합계']
    mc_offline_direct_profit_prev = prev_mc_offline['매출총이익'] - prev_mc_offline['직접비_합계']
    mc_offline_direct_profit_yoy = (mc_offline_direct_profit / mc_offline_direct_profit_prev * 100) if mc_offline_direct_profit_prev != 0 else 0
    mc_offline_direct_profit_rate = (mc_offline_direct_profit / current_mc_offline['실판'] * 100) if current_mc_offline['실판'] > 0 else 0
    
    hk_online_direct_profit = current_hk_online['매출총이익'] - current_hk_online['직접비_합계']
    hk_online_direct_profit_prev = prev_hk_online['매출총이익'] - prev_hk_online['직접비_합계']
    hk_online_direct_profit_yoy = (hk_online_direct_profit / hk_online_direct_profit_prev * 100) if hk_online_direct_profit_prev != 0 else 0
    hk_online_direct_profit_rate = (hk_online_direct_profit / current_hk_online['실판'] * 100) if current_hk_online['실판'] > 0 else 0
    
    total_direct_profit = hk_offline_direct_profit + mc_offline_direct_profit + hk_online_direct_profit
    total_direct_profit_prev = hk_offline_direct_profit_prev + mc_offline_direct_profit_prev + hk_online_direct_profit_prev
    total_direct_profit_yoy = (total_direct_profit / total_direct_profit_prev * 100) if total_direct_profit_prev != 0 else 0
    
    # 현재 월 합계 데이터 가져오기
    current_month_total = pl_summary['current_month']['total']
    prev_month_total = pl_summary['prev_month']['total']
    
    total_direct_profit_rate = (total_direct_profit / current_month_total['실판'] * 100) if current_month_total['실판'] > 0 else 0
    
    # 직접이익 계산 (영업이익 계산에 사용)
    mlb_direct_profit = current_month_total['매출총이익'] - current_month_total['직접비_합계']
    mlb_direct_profit_prev = prev_month_total['매출총이익'] - prev_month_total['직접비_합계']
    
    # 영업이익 계산 (M99 오피스의 판매관리비를 MLB 영업비로 사용)
    # mlb_sg_a와 mlb_sg_a_prev는 이미 main()에서 계산됨
    
    # 영업이익 = 직접이익 - 영업비
    operating_profit = mlb_direct_profit - mlb_sg_a
    operating_profit_prev = mlb_direct_profit_prev - mlb_sg_a_prev
    operating_profit_rate = (operating_profit / current_month_total['실판'] * 100) if current_month_total['실판'] > 0 else 0
    
    print(f"\n영업이익 (1K HKD): {operating_profit:,.0f}")
    print(f"적자악화 | 이익률 {operating_profit_rate:.1f}%")
    
    print(f"\n채널별 직접이익[이익률]:")
    hk_offline_status = "적자개선" if hk_offline_direct_profit > hk_offline_direct_profit_prev else "적자악화" if hk_offline_direct_profit < 0 else ""
    hk_offline_yoy_str = "흑자전환" if hk_offline_direct_profit_yoy is None else f"{hk_offline_direct_profit_yoy:.0f}%"
    print(f"HK 오프라인: {hk_offline_direct_profit:,.0f} ({hk_offline_yoy_str}) [{hk_offline_direct_profit_rate:.1f}%] {hk_offline_status}")
    print(f"MC 오프라인: {mc_offline_direct_profit:,.0f} ({mc_offline_direct_profit_yoy:.0f}%) [{mc_offline_direct_profit_rate:.1f}%]")
    print(f"HK 온라인: {hk_online_direct_profit:,.0f} ({hk_online_direct_profit_yoy:.0f}%) [{hk_online_direct_profit_rate:.1f}%]")
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
    
    # MLB 영업비 (M99 오피스의 판매관리비)
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
    
    # 디스커버리 참고 데이터 (당월)
    discovery_current = None
    discovery_tag = 0
    discovery_net = 0
    discovery_discount_rate = 0
    discovery_direct_cost = 0
    discovery_direct_profit = 0
    discovery_marketing = 0
    discovery_travel = 0
    discovery_sg_a = 0
    discovery_op_profit = 0
    online_count = 0
    offline_count = 0
    
    # 디스커버리 누적 데이터
    discovery_cumulative = defaultdict(float)
    discovery_cumulative_op_profit = 0
    
    if discovery_data:
        print(f"\n참고: 디스커버리 실적 (1K HKD)")
        discovery_current = aggregate_pl_by_period(discovery_data, latest_period_full)
        discovery_tag = discovery_current['TAG']
        discovery_net = discovery_current['실판']
        discovery_discount_rate = ((discovery_tag - discovery_net) / discovery_tag * 100) if discovery_tag > 0 else 0
        
        # 전월 실판매출 (MOM - Month over Month)
        discovery_prev_month = aggregate_pl_by_period(discovery_data, prev_month_period)
        discovery_prev_net = discovery_prev_month.get('실판', 0)
        discovery_net_mom = (discovery_net / discovery_prev_net * 100) if discovery_prev_net > 0 else 0
        
        # 판매관리비 = 직접비
        discovery_direct_cost = discovery_current.get('판매관리비', 0)
        discovery_gross_profit = discovery_current['매출총이익']
        discovery_direct_profit = discovery_gross_profit - discovery_direct_cost
        
        # 영업이익 = 직접이익 - M99 오피스 DX 영업비
        discovery_sg_a = get_dx_sg_a(pl_data_with_office, latest_period_full)
        discovery_op_profit = discovery_direct_profit - discovery_sg_a
        
        # 마케팅비, 여비교통비는 영업비 상세에서 추출 (참고용)
        discovery_marketing = 0
        discovery_travel = 0
        for row in pl_data_with_office:
            if (str(row['PERIOD']) == str(latest_period_full) and 
                row['SHOP_CD'] == 'M99' and 
                row['BRD_CD'] == 'X'):
                account = row['ACCOUNT_NM'].strip()
                if '광고선전비' in account or '판촉비' in account:
                    discovery_marketing += float(row.get('VALUE', 0) or 0)
                elif '여비교통비' in account:
                    discovery_travel += float(row.get('VALUE', 0) or 0)
        
        # 매장 수 확인 (25년 10월 기준, 매출이 있는 매장만)
        discovery_stores = set()
        for row in discovery_data:
            if (row['PERIOD'] == latest_period_full and 
                row['ACCOUNT_NM'] == '실매출액' and
                float(row.get('VALUE', 0) or 0) != 0 and
                row['SHOP_CD'].strip() not in ['M99']):  # 오피스 제외
                store_code = row['SHOP_CD'].strip()
                # 매장 코드 패턴으로 채널 구분
                channel = get_store_channel(store_code)
                discovery_stores.add((row['CNTRY_CD'], store_code, channel))
        
        online_count = sum(1 for _, _, ch in discovery_stores if ch == 'Online')
        offline_count = sum(1 for _, _, ch in discovery_stores if ch in ['Retail', 'Outlet'])
        
        # 전월 매장수 계산
        discovery_prev_stores = set()
        for row in discovery_data:
            if row.get('PERIOD') == prev_month_period and row.get('ACCOUNT_NM', '').strip() == '실매출액':
                if float(row.get('VALUE', 0) or 0) != 0:
                    store_code = row['SHOP_CD'].strip()
                    channel = get_store_channel(store_code)
                    discovery_prev_stores.add((row['CNTRY_CD'], store_code, channel))
        
        prev_online_count = sum(1 for _, _, ch in discovery_prev_stores if ch == 'Online')
        prev_offline_count = sum(1 for _, _, ch in discovery_prev_stores if ch in ['Retail', 'Outlet'])
        
        # 디스커버리 누적 계산 (실제 영업한 기간만)
        # 디스커버리가 실제로 영업한 기간 확인
        discovery_periods = set()
        for row in discovery_data:
            if row.get('ACCOUNT_NM', '').strip() == '실매출액' and float(row.get('VALUE', 0) or 0) != 0:
                discovery_periods.add(row['PERIOD'])
        
        # 누적 기간과 실제 영업 기간의 교집합만 계산
        actual_discovery_periods = [p for p in cumulative_periods if p in discovery_periods]
        
        for period in actual_discovery_periods:
            period_discovery = aggregate_pl_by_period(discovery_data, period)
            for key in period_discovery.keys():
                discovery_cumulative[key] += period_discovery[key]
        
        # 누적 영업이익 계산
        discovery_cumulative_direct_cost = discovery_cumulative.get('판매관리비', 0)
        discovery_cumulative_direct_profit = discovery_cumulative['매출총이익'] - discovery_cumulative_direct_cost
        
        # 누적 M99 오피스 DX 영업비
        discovery_cumulative_sg_a = 0
        for period in actual_discovery_periods:
            discovery_cumulative_sg_a += get_dx_sg_a(pl_data_with_office, period)
        
        discovery_cumulative_op_profit = discovery_cumulative_direct_profit - discovery_cumulative_sg_a
        
        print(f"온라인{online_count}개, 오프라인{offline_count}개 (10/1 영업개시)")
        print(f"실판매출: {discovery_net:,.0f} (할인율 {discovery_discount_rate:.1f}%)")
        print(f"직접비: {discovery_direct_cost:,.0f}")
        print(f"직접손실: {discovery_direct_profit:,.0f}")
        print(f"  - 마케팅비: {discovery_marketing:,.0f}")
        print(f"  - 여비교통비: {discovery_travel:,.0f}")
        print(f"영업손실: {discovery_op_profit:,.0f}")
        print(f"\n누적 영업손실: {discovery_cumulative_op_profit:,.0f}")
    
    # 누적 데이터 계산
    current_month_hk = pl_summary['current_month']['hk']
    current_month_mc = pl_summary['current_month']['mc']
    prev_month_hk = pl_summary['prev_month']['hk']
    prev_month_mc = pl_summary['prev_month']['mc']
    cumulative_total = pl_summary['cumulative']['total']
    prev_cumulative_total = pl_summary['prev_cumulative']['total']
    cumulative_hk = pl_summary['cumulative']['hk']
    prev_cumulative_hk = pl_summary['prev_cumulative']['hk']
    cumulative_mc = pl_summary['cumulative']['mc']
    prev_cumulative_mc = pl_summary['prev_cumulative']['mc']
    
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
    
    # HK/MC별 영업비 안분 계산 (매출 비중 기준)
    # 당월
    hk_net_sales = current_month_hk['실판']
    mc_net_sales = current_month_mc['실판']
    total_net_sales = net_sales
    hk_sg_a = (sg_a * (hk_net_sales / total_net_sales)) if total_net_sales > 0 else 0
    mc_sg_a = (sg_a * (mc_net_sales / total_net_sales)) if total_net_sales > 0 else 0
    
    # 전년도 당월
    hk_net_sales_prev = prev_month_hk['실판']
    mc_net_sales_prev = prev_month_mc['실판']
    total_net_sales_prev = net_sales_prev
    hk_sg_a_prev = (sg_a_prev * (hk_net_sales_prev / total_net_sales_prev)) if total_net_sales_prev > 0 else 0
    mc_sg_a_prev = (sg_a_prev * (mc_net_sales_prev / total_net_sales_prev)) if total_net_sales_prev > 0 else 0
    
    # HK/MC별 영업이익 계산
    hk_op_profit = current_month_hk['직접이익'] - hk_sg_a
    mc_op_profit = current_month_mc['직접이익'] - mc_sg_a
    hk_op_profit_prev = prev_month_hk['직접이익'] - hk_sg_a_prev
    mc_op_profit_prev = prev_month_mc['직접이익'] - mc_sg_a_prev
    
    # HK/MC별 영업이익률 계산
    hk_op_profit_rate = (hk_op_profit / hk_net_sales * 100) if hk_net_sales > 0 else 0
    mc_op_profit_rate = (mc_op_profit / mc_net_sales * 100) if mc_net_sales > 0 else 0
    hk_op_profit_rate_prev = (hk_op_profit_prev / hk_net_sales_prev * 100) if hk_net_sales_prev > 0 else 0
    mc_op_profit_rate_prev = (mc_op_profit_prev / mc_net_sales_prev * 100) if mc_net_sales_prev > 0 else 0
    
    # 누적 오프라인 지표 계산 (직접 계산)
    cumulative_offline = defaultdict(float)
    prev_cumulative_offline = defaultdict(float)
    
    latest_year, latest_month = parse_period(latest_period_full)
    prev_year, prev_month = parse_period(prev_period_full)
    cumulative_periods = [f"{latest_year}{m:02d}" for m in range(1, latest_month + 1)]
    prev_cumulative_periods = [f"{prev_year}{m:02d}" for m in range(1, prev_month + 1)]
    
    for period in cumulative_periods:
        period_data_hk_retail = aggregate_pl_by_period(pl_data, period, 'HK', 'Retail')
        period_data_hk_outlet = aggregate_pl_by_period(pl_data, period, 'HK', 'Outlet')
        for key in set(list(period_data_hk_retail.keys()) + list(period_data_hk_outlet.keys())):
            cumulative_offline[key] += period_data_hk_retail[key] + period_data_hk_outlet[key]
    
    for period in prev_cumulative_periods:
        period_data_hk_retail = aggregate_pl_by_period(pl_data, period, 'HK', 'Retail')
        period_data_hk_outlet = aggregate_pl_by_period(pl_data, period, 'HK', 'Outlet')
        for key in set(list(period_data_hk_retail.keys()) + list(period_data_hk_outlet.keys())):
            prev_cumulative_offline[key] += period_data_hk_retail[key] + period_data_hk_outlet[key]
    
    cum_offline_tag_sales = cumulative_offline.get('TAG', 0)
    cum_offline_net_sales = cumulative_offline.get('실판', 0)
    cum_offline_discount_rate = ((cum_offline_tag_sales - cum_offline_net_sales) / cum_offline_tag_sales * 100) if cum_offline_tag_sales > 0 else 0
    cum_offline_cogs = cumulative_offline.get('매출원가', 0)
    cum_offline_cogs_rate = (cum_offline_cogs / cum_offline_tag_sales * 100) if cum_offline_tag_sales > 0 else 0
    cum_offline_gross_profit = cumulative_offline.get('매출총이익', 0)
    cum_offline_gross_profit_rate = (cum_offline_gross_profit / cum_offline_net_sales * 100) if cum_offline_net_sales > 0 else 0
    cum_offline_direct_cost = cumulative_offline.get('직접비_합계', 0)
    cum_offline_direct_profit = cumulative_offline.get('직접이익', 0)
    cum_offline_direct_profit_rate = (cum_offline_direct_profit / cum_offline_net_sales * 100) if cum_offline_net_sales > 0 else 0
    # 누적 오프라인 영업비는 오프라인 매출 비율로 분배
    cum_offline_sg_a = (cum_sg_a * (cum_offline_net_sales / cum_net_sales)) if cum_net_sales > 0 else 0
    cum_offline_op_profit = cum_offline_direct_profit - cum_offline_sg_a
    cum_offline_op_profit_rate = (cum_offline_op_profit / cum_offline_net_sales * 100) if cum_offline_net_sales > 0 else 0
    
    # 누적 기간의 월별 면적 계산 (월별 면적 합계를 모두 더한 후 월수로 나눔)
    # 면적 데이터 로드
    store_areas = {}
    try:
        with open('components/dashboard/hongkong-store-areas.json', 'r', encoding='utf-8') as f:
            area_data = json.load(f)
            store_areas = area_data.get('store_areas', {})
    except:
        print("⚠️ 면적 데이터 파일을 읽을 수 없습니다. 기본값 0 사용")
    
    # 월별 면적 합계 계산 (홍콩만, 마카오 제외)
    monthly_areas = []
    for period in cumulative_periods:
        # 해당 월에 실제 영업한 매장 목록 (실매출액이 있는 매장, MLB 브랜드, 오프라인, 홍콩만)
        active_stores = set()
        for row in pl_data:
            if (row['PERIOD'] == period and
                row['BRD_CD'] == 'M' and  # MLB만
                row['CNTRY_CD'] == 'HK' and  # 홍콩만 (마카오 제외)
                row['SHOP_CD'] != 'M99' and  # 오피스 제외
                row.get('CHANNEL') in ['Retail', 'Outlet']):  # 오프라인만
                account_nm = row['ACCOUNT_NM'].strip()
                account_cd = row['ACCOUNT_CD'].strip()
                value = float(row['VALUE'] or 0)
                # 실매출액이 있는 매장만
                if ((account_nm == '실매출액' or account_cd == 'ACT_SALE_AMT') and value > 0):
                    active_stores.add(row['SHOP_CD'])
        
        # 해당 월의 면적 합계 (홍콩만)
        month_area = sum(store_areas.get(store_code, 0) for store_code in active_stores)
        if month_area > 0:
            monthly_areas.append(month_area)
    
    # 누적 평균 면적 = 월별 면적 합계를 모두 더한 후 월수로 나눔 (홍콩만)
    cum_avg_offline_area = sum(monthly_areas) / len(monthly_areas) if monthly_areas else 0
    
    # 전년 누적 오프라인 지표 계산
    prev_cum_offline_tag_sales = prev_cumulative_offline.get('TAG', 0)
    prev_cum_offline_net_sales = prev_cumulative_offline.get('실판', 0)
    prev_cum_offline_discount_rate = ((prev_cum_offline_tag_sales - prev_cum_offline_net_sales) / prev_cum_offline_tag_sales * 100) if prev_cum_offline_tag_sales > 0 else 0
    prev_cum_offline_cogs = prev_cumulative_offline.get('매출원가', 0)
    prev_cum_offline_cogs_rate = (prev_cum_offline_cogs / prev_cum_offline_tag_sales * 100) if prev_cum_offline_tag_sales > 0 else 0
    prev_cum_offline_gross_profit = prev_cumulative_offline.get('매출총이익', 0)
    prev_cum_offline_gross_profit_rate = (prev_cum_offline_gross_profit / prev_cum_offline_net_sales * 100) if prev_cum_offline_net_sales > 0 else 0
    prev_cum_offline_direct_cost = prev_cumulative_offline.get('직접비_합계', 0)
    prev_cum_offline_direct_profit = prev_cumulative_offline.get('직접이익', 0)
    prev_cum_offline_direct_profit_rate = (prev_cum_offline_direct_profit / prev_cum_offline_net_sales * 100) if prev_cum_offline_net_sales > 0 else 0
    prev_cum_offline_sg_a = (cum_sg_a_prev * (prev_cum_offline_net_sales / cum_net_sales_prev)) if cum_net_sales_prev > 0 else 0
    prev_cum_offline_op_profit = prev_cum_offline_direct_profit - prev_cum_offline_sg_a
    prev_cum_offline_op_profit_rate = (prev_cum_offline_op_profit / prev_cum_offline_net_sales * 100) if prev_cum_offline_net_sales > 0 else 0
    
    # 누적
    hk_cum_net_sales = cumulative_hk['실판']
    mc_cum_net_sales = cumulative_mc['실판']
    hk_cum_sg_a = (cum_sg_a * (hk_cum_net_sales / cum_net_sales)) if cum_net_sales > 0 else 0
    mc_cum_sg_a = (cum_sg_a * (mc_cum_net_sales / cum_net_sales)) if cum_net_sales > 0 else 0
    
    # 전년도 누적
    hk_cum_net_sales_prev = prev_cumulative_hk['실판']
    mc_cum_net_sales_prev = prev_cumulative_mc['실판']
    hk_cum_sg_a_prev = (cum_sg_a_prev * (hk_cum_net_sales_prev / cum_net_sales_prev)) if cum_net_sales_prev > 0 else 0
    mc_cum_sg_a_prev = (cum_sg_a_prev * (mc_cum_net_sales_prev / cum_net_sales_prev)) if cum_net_sales_prev > 0 else 0
    
    # 누적 HK/MC별 영업이익 계산
    hk_cum_op_profit = cumulative_hk['직접이익'] - hk_cum_sg_a
    mc_cum_op_profit = cumulative_mc['직접이익'] - mc_cum_sg_a
    hk_cum_op_profit_prev = prev_cumulative_hk['직접이익'] - hk_cum_sg_a_prev
    mc_cum_op_profit_prev = prev_cumulative_mc['직접이익'] - mc_cum_sg_a_prev
    
    # 누적 HK/MC별 영업이익률 계산
    hk_cum_op_profit_rate = (hk_cum_op_profit / hk_cum_net_sales * 100) if hk_cum_net_sales > 0 else 0
    mc_cum_op_profit_rate = (mc_cum_op_profit / mc_cum_net_sales * 100) if mc_cum_net_sales > 0 else 0
    hk_cum_op_profit_rate_prev = (hk_cum_op_profit_prev / hk_cum_net_sales_prev * 100) if hk_cum_net_sales_prev > 0 else 0
    mc_cum_op_profit_rate_prev = (mc_cum_op_profit_prev / mc_cum_net_sales_prev * 100) if mc_cum_net_sales_prev > 0 else 0
    
    # JSON 출력 데이터 구성
    pl_json_data = {
        'metadata': {
            'last_period': latest_period_short,
            'previous_period': prev_period_short,
            'generated_at': datetime.now().isoformat()
        },
        'current_month': {
            'hk': {
                'tag_sales': current_month_hk['TAG'],
                'net_sales': current_month_hk['실판'],
                'discount_rate': pl_summary['metrics']['hk']['할인율_당월'],
                'cogs_rate': pl_summary['metrics']['hk']['원가율_당월'],
                'gross_profit': current_month_hk['매출총이익'],
                'gross_profit_rate': pl_summary['metrics']['hk']['매출총이익률_당월'],
                'direct_cost': current_month_hk['직접비_합계'],
                'direct_profit': current_month_hk['직접이익'],
                'direct_profit_rate': pl_summary['metrics']['hk']['직접이익율_당월'],
                'sg_a': hk_sg_a,
                'operating_profit': hk_op_profit,
                'operating_profit_rate': hk_op_profit_rate,
            },
            'mc': {
                'tag_sales': current_month_mc['TAG'],
                'net_sales': current_month_mc['실판'],
                'discount_rate': pl_summary['metrics']['mc']['할인율_당월'],
                'cogs_rate': pl_summary['metrics']['mc']['원가율_당월'],
                'gross_profit': current_month_mc['매출총이익'],
                'gross_profit_rate': pl_summary['metrics']['mc']['매출총이익률_당월'],
                'direct_cost': current_month_mc['직접비_합계'],
                'direct_profit': current_month_mc['직접이익'],
                'direct_profit_rate': pl_summary['metrics']['mc']['직접이익율_당월'],
                'sg_a': mc_sg_a,
                'operating_profit': mc_op_profit,
                'operating_profit_rate': mc_op_profit_rate,
            },
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
            'hk': {
                'tag_sales': cumulative_hk['TAG'],
                'net_sales': cumulative_hk['실판'],
                'discount_rate': pl_summary['metrics']['hk']['할인율_누적'],
                'cogs_rate': pl_summary['metrics']['hk']['원가율_누적'],
                'gross_profit': cumulative_hk['매출총이익'],
                'gross_profit_rate': pl_summary['metrics']['hk']['매출총이익률_누적'],
                'direct_cost': cumulative_hk['직접비_합계'],
                'direct_profit': cumulative_hk['직접이익'],
                'direct_profit_rate': pl_summary['metrics']['hk']['직접이익율_누적'],
                'sg_a': hk_cum_sg_a,
                'operating_profit': hk_cum_op_profit,
                'operating_profit_rate': hk_cum_op_profit_rate,
            },
            'mc': {
                'tag_sales': cumulative_mc['TAG'],
                'net_sales': cumulative_mc['실판'],
                'discount_rate': pl_summary['metrics']['mc']['할인율_누적'],
                'cogs_rate': pl_summary['metrics']['mc']['원가율_누적'],
                'gross_profit': cumulative_mc['매출총이익'],
                'gross_profit_rate': pl_summary['metrics']['mc']['매출총이익률_누적'],
                'direct_cost': cumulative_mc['직접비_합계'],
                'direct_profit': cumulative_mc['직접이익'],
                'direct_profit_rate': pl_summary['metrics']['mc']['직접이익율_누적'],
                'sg_a': mc_cum_sg_a,
                'operating_profit': mc_cum_op_profit,
                'operating_profit_rate': mc_cum_op_profit_rate,
            },
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
                'tag_sales': cum_offline_tag_sales,
                'net_sales': cum_offline_net_sales,
                'discount_rate': cum_offline_discount_rate,
                'cogs': cum_offline_cogs,
                'cogs_rate': cum_offline_cogs_rate,
                'gross_profit': cum_offline_gross_profit,
                'gross_profit_rate': cum_offline_gross_profit_rate,
                'direct_cost': cum_offline_direct_cost,
                'direct_profit': cum_offline_direct_profit,
                'direct_profit_rate': cum_offline_direct_profit_rate,
                'sg_a': cum_offline_sg_a,
                'operating_profit': cum_offline_op_profit,
                'operating_profit_rate': cum_offline_op_profit_rate,
                'average_area': cum_avg_offline_area,  # 누적 기간의 평균 면적
            },
            'prev_cumulative': {
                'hk': {
                    'tag_sales': prev_cumulative_hk['TAG'],
                    'net_sales': prev_cumulative_hk['실판'],
                    'discount_rate': pl_summary['metrics']['hk']['할인율_누적_전년'],
                    'cogs_rate': pl_summary['metrics']['hk']['원가율_누적_전년'],
                    'gross_profit': prev_cumulative_hk['매출총이익'],
                    'gross_profit_rate': pl_summary['metrics']['hk']['매출총이익률_누적_전년'],
                    'direct_cost': prev_cumulative_hk['직접비_합계'],
                    'direct_profit': prev_cumulative_hk['직접이익'],
                    'direct_profit_rate': pl_summary['metrics']['hk']['직접이익율_누적_전년'],
                    'sg_a': hk_cum_sg_a_prev,
                    'operating_profit': hk_cum_op_profit_prev,
                    'operating_profit_rate': hk_cum_op_profit_rate_prev,
                },
                'mc': {
                    'tag_sales': prev_cumulative_mc['TAG'],
                    'net_sales': prev_cumulative_mc['실판'],
                    'discount_rate': pl_summary['metrics']['mc']['할인율_누적_전년'],
                    'cogs_rate': pl_summary['metrics']['mc']['원가율_누적_전년'],
                    'gross_profit': prev_cumulative_mc['매출총이익'],
                    'gross_profit_rate': pl_summary['metrics']['mc']['매출총이익률_누적_전년'],
                    'direct_cost': prev_cumulative_mc['직접비_합계'],
                    'direct_profit': prev_cumulative_mc['직접이익'],
                    'direct_profit_rate': pl_summary['metrics']['mc']['직접이익율_누적_전년'],
                    'sg_a': mc_cum_sg_a_prev,
                    'operating_profit': mc_cum_op_profit_prev,
                    'operating_profit_rate': mc_cum_op_profit_rate_prev,
                },
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
                    'tag_sales': prev_cum_offline_tag_sales,
                    'net_sales': prev_cum_offline_net_sales,
                    'discount_rate': prev_cum_offline_discount_rate,
                    'cogs': prev_cum_offline_cogs,
                    'cogs_rate': prev_cum_offline_cogs_rate,
                    'gross_profit': prev_cum_offline_gross_profit,
                    'gross_profit_rate': prev_cum_offline_gross_profit_rate,
                    'direct_cost': prev_cum_offline_direct_cost,
                    'direct_profit': prev_cum_offline_direct_profit,
                    'direct_profit_rate': prev_cum_offline_direct_profit_rate,
                    'sg_a': prev_cum_offline_sg_a,
                    'operating_profit': prev_cum_offline_op_profit,
                    'operating_profit_rate': prev_cum_offline_op_profit_rate,
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
        'prev_month': {
            'hk': {
                'tag_sales': prev_month_hk['TAG'],
                'net_sales': prev_month_hk['실판'],
                'discount_rate': pl_summary['metrics']['hk']['할인율_전년'],
                'cogs_rate': pl_summary['metrics']['hk']['원가율_전년'],
                'gross_profit': prev_month_hk['매출총이익'],
                'gross_profit_rate': pl_summary['metrics']['hk']['매출총이익률_전년'],
                'direct_cost': prev_month_hk['직접비_합계'],
                'direct_profit': prev_month_hk['직접이익'],
                'direct_profit_rate': pl_summary['metrics']['hk']['직접이익율_전년'],
                'sg_a': hk_sg_a_prev,
                'operating_profit': hk_op_profit_prev,
                'operating_profit_rate': hk_op_profit_rate_prev,
            },
            'mc': {
                'tag_sales': prev_month_mc['TAG'],
                'net_sales': prev_month_mc['실판'],
                'discount_rate': pl_summary['metrics']['mc']['할인율_전년'],
                'cogs_rate': pl_summary['metrics']['mc']['원가율_전년'],
                'gross_profit': prev_month_mc['매출총이익'],
                'gross_profit_rate': pl_summary['metrics']['mc']['매출총이익률_전년'],
                'direct_cost': prev_month_mc['직접비_합계'],
                'direct_profit': prev_month_mc['직접이익'],
                'direct_profit_rate': pl_summary['metrics']['mc']['직접이익율_전년'],
                'sg_a': mc_sg_a_prev,
                'operating_profit': mc_op_profit_prev,
                'operating_profit_rate': mc_op_profit_rate_prev,
            },
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
            }
        },
        'channel_direct_profit': {
            'hk_offline': {
                'direct_profit': hk_offline_direct_profit,
                'direct_profit_rate': hk_offline_direct_profit_rate,
                'yoy': hk_offline_direct_profit_yoy,
                'status': hk_offline_status
            },
            'mc_offline': {
                'direct_profit': mc_offline_direct_profit,
                'direct_profit_rate': mc_offline_direct_profit_rate,
                'yoy': mc_offline_direct_profit_yoy
            },
            'hk_online': {
                'direct_profit': hk_online_direct_profit,
                'direct_profit_rate': hk_online_direct_profit_rate,
                'yoy': hk_online_direct_profit_yoy
            },
            'total': {
                'direct_profit': total_direct_profit,
                'direct_profit_rate': total_direct_profit_rate,
                'yoy': total_direct_profit_yoy
            }
        },
        'discovery': {
            'net_sales': discovery_net if discovery_data else 0,
            'prev_net_sales': discovery_prev_net if discovery_data else 0,
            'net_sales_mom': discovery_net_mom if discovery_data else 0,
            'discount_rate': discovery_discount_rate if discovery_data else 0,
            'direct_cost': discovery_direct_cost if discovery_data else 0,
            'direct_profit': discovery_direct_profit if discovery_data else 0,
            'marketing': discovery_marketing if discovery_data else 0,
            'travel': discovery_travel if discovery_data else 0,
            'sg_a': discovery_sg_a if discovery_data else 0,
            'operating_profit': discovery_op_profit if discovery_data else 0,
            'cumulative_operating_profit': discovery_cumulative_op_profit if discovery_data else 0,
            'store_count': {
                'online': online_count if discovery_data else 0,
                'offline': offline_count if discovery_data else 0
            },
            'prev_store_count': {
                'online': prev_online_count if discovery_data else 0,
                'offline': prev_offline_count if discovery_data else 0
            }
        } if discovery_data else None
    }
    
    # JSON 파일 저장 (period별 + 기본 파일)
    import shutil
    if target_period_short:
        output_file = f'components/dashboard/hongkong-pl-data-{target_period_short}.json'
        public_file = f'public/dashboard/hongkong-pl-data-{target_period_short}.json'
    else:
        output_file = 'components/dashboard/hongkong-pl-data.json'
        public_file = 'public/dashboard/hongkong-pl-data.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(pl_json_data, f, ensure_ascii=False, indent=2)
    
    # public 폴더에도 복사
    shutil.copy(output_file, public_file)
    
    print(f"\nP&L 데이터가 {output_file}에 저장되었습니다.")
    print(f"Public 폴더에도 복사: {public_file}")
    
    # 기본 파일로도 복사 (최신 데이터)
    if target_period_short:
        default_output = 'components/dashboard/hongkong-pl-data.json'
        default_public = 'public/dashboard/hongkong-pl-data.json'
        shutil.copy(output_file, default_output)
        shutil.copy(output_file, default_public)
        print(f"기본 파일로도 복사: {default_output}, {default_public}")

if __name__ == '__main__':
    import sys
    # 명령줄 인자로 period 받기
    target_period = sys.argv[1] if len(sys.argv) > 1 else None
    main(target_period)

