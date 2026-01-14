#!/usr/bin/env python3
"""
2512용 완전한 홍콩마카오 PL 손익요약 데이터 생성
매출, 원가, 손익 모든 데이터 포함
"""
import pandas as pd
import json
import os
from datetime import datetime

print("=" * 80)
print("2512 홍콩마카오 완전한 손익요약 데이터 생성")
print("=" * 80)

# PL CSV 파일 읽기
pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(pl_file, encoding='utf-8-sig')

# VALUE를 숫자로 변환
df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# MLB만 필터링
df_mlb = df[df['BRD_CD'] == 'M'].copy()

# 계정명별로 데이터 추출하는 함수
def extract_account_data(df, period, account_name, region=None, shop_code=None):
    """특정 기간의 계정 데이터 추출"""
    filtered = df[(df['PERIOD'] == period) & (df['ACCOUNT_NM'] == account_name)]
    if region:
        filtered = filtered[filtered['CNTRY_CD'] == region]
    if shop_code:
        filtered = filtered[filtered['SHOP_CD'] == shop_code]
    return filtered['VALUE'].sum()

# 당월(2512)와 전년동월(2412) 데이터 추출
def get_period_data(period, region=None):
    """특정 기간의 모든 손익 데이터 추출 (region: 'HK', 'MC', None=전체)"""
    data = {}
    
    # 매출 관련
    data['tag_sales'] = extract_account_data(df_mlb, period, 'Tag매출액', region)
    data['net_sales'] = extract_account_data(df_mlb, period, '실매출액', region)
    data['discount'] = data['tag_sales'] - data['net_sales']
    data['discount_rate'] = (data['discount'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    
    # 원가 및 이익
    data['cogs'] = extract_account_data(df_mlb, period, '매출원가합계', region)
    data['cogs_rate'] = (data['cogs'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0  # TAG대비 원가율
    data['gross_profit'] = extract_account_data(df_mlb, period, '매출총이익', region)
    data['gross_profit_rate'] = (data['gross_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 영업이익
    data['operating_profit'] = extract_account_data(df_mlb, period, '영업이익', region)
    data['operating_profit_rate'] = (data['operating_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 영업비 (M99만) - 판매관리비
    data['sg_a'] = extract_account_data(df_mlb, period, '판매관리비', region, 'M99')
    
    # 영업비 상세 항목 (M99만)
    data['expense_detail'] = {
        'salary': extract_account_data(df_mlb, period, '1. 급 여', region, 'M99'),
        'travel': extract_account_data(df_mlb, period, '2. TRAVEL & MEAL', region, 'M99'),
        'uniform': extract_account_data(df_mlb, period, '3. 피복비(유니폼)', region, 'M99'),
        'rent': extract_account_data(df_mlb, period, '4. 임차료', region, 'M99'),
        'maintenance': extract_account_data(df_mlb, period, '5. 유지보수비', region, 'M99'),
        'utilities': extract_account_data(df_mlb, period, '6. 수도광열비', region, 'M99'),
        'supplies': extract_account_data(df_mlb, period, '7. 소모품비', region, 'M99'),
        'communication': extract_account_data(df_mlb, period, '8. 통신비', region, 'M99'),
        'marketing': extract_account_data(df_mlb, period, '9. 광고선전비', region, 'M99'),
        'fee': extract_account_data(df_mlb, period, '10. 지급수수료', region, 'M99'),
        'logistics': extract_account_data(df_mlb, period, '11. 운반비', region, 'M99'),
        'other_fee': extract_account_data(df_mlb, period, '12. 기타 수수료(매장관리비 외)', region, 'M99'),
        'insurance': extract_account_data(df_mlb, period, '13. 보험료', region, 'M99'),
        'depreciation': extract_account_data(df_mlb, period, '14. 감가상각비', region, 'M99'),
        'duty_free': extract_account_data(df_mlb, period, '15. 면세점 직접비', region, 'M99'),
    }
    
    # 직접비 계산을 위한 함수 추가 필요
    # 직접비 = MLB 실제 매장들의 비용 (M99 제외)
    df_period = df_mlb[df_mlb['PERIOD'] == period]
    if region:
        df_period = df_period[df_period['CNTRY_CD'] == region]
    # M99 제외
    df_period_real = df_period[df_period['SHOP_CD'] != 'M99']
    
    # 직접비 항목들 (M99 제외한 실제 매장)
    direct_cost_accounts = [
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    data['direct_cost'] = 0
    for account in direct_cost_accounts:
        val = df_period_real[df_period_real['ACCOUNT_NM'] == account]['VALUE'].sum()
        data['direct_cost'] += val
    
    # 렌트 관련 상세 (필요시)
    data['rent_detail'] = {
        'base_rent': extract_account_data(df_mlb, period, ' - Base Rent', region),
        'var_rent': extract_account_data(df_mlb, period, ' - Turnover Rates', region),
        'rent_free': extract_account_data(df_mlb, period, ' - Rent free / Rent concession', region),
        'govt_license': extract_account_data(df_mlb, period, ' - Government Rate & License Fee', region),
    }
    
    # 직접이익 = 매출총이익 - 직접비
    data['direct_profit'] = data['gross_profit'] - data['direct_cost']
    data['direct_profit_rate'] = (data['direct_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    return data

# 누적 데이터 추출 (2501~2512, 2401~2412)
def get_ytd_data(start_period, end_period, region=None):
    """누적 기간의 모든 손익 데이터 추출 (region: 'HK', 'MC', None=전체)"""
    df_ytd = df_mlb[(df_mlb['PERIOD'] >= start_period) & (df_mlb['PERIOD'] <= end_period)]
    if region:
        df_ytd = df_ytd[df_ytd['CNTRY_CD'] == region]
    
    # M99 가상점만 필터링 (영업비용)
    df_ytd_m99 = df_ytd[df_ytd['SHOP_CD'] == 'M99']
    
    data = {}
    accounts = [
        'Tag매출액', '실매출액', '매출원가합계', '매출총이익', '영업이익',
    ]
    
    # 전체 데이터
    for account in accounts:
        filtered = df_ytd[df_ytd['ACCOUNT_NM'] == account]
        data[account] = filtered['VALUE'].sum()
    
    # 영업비는 M99만
    sg_a_filtered = df_ytd_m99[df_ytd_m99['ACCOUNT_NM'] == '판매관리비']
    data['판매관리비'] = sg_a_filtered['VALUE'].sum()
    
    # 영업비 상세 항목 (M99만)
    expense_accounts = [
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    for account in expense_accounts:
        filtered = df_ytd_m99[df_ytd_m99['ACCOUNT_NM'] == account]
        data[account] = filtered['VALUE'].sum()
    
    # 직접비 계산 (M99 제외한 실제 매장)
    df_ytd_real = df_ytd[df_ytd['SHOP_CD'] != 'M99']
    data['direct_cost'] = 0
    for account in expense_accounts:
        val = df_ytd_real[df_ytd_real['ACCOUNT_NM'] == account]['VALUE'].sum()
        data['direct_cost'] += val
    
    # 계산
    data['tag_sales'] = data.get('Tag매출액', 0)
    data['net_sales'] = data.get('실매출액', 0)
    data['discount'] = data['tag_sales'] - data['net_sales']
    data['discount_rate'] = (data['discount'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    
    data['cogs'] = data.get('매출원가합계', 0)
    data['cogs_rate'] = (data['cogs'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0  # TAG대비 원가율
    data['gross_profit'] = data.get('매출총이익', 0)
    data['gross_profit_rate'] = (data['gross_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    data['sg_a'] = data.get('판매관리비', 0)
    data['operating_profit'] = data.get('영업이익', 0)
    data['operating_profit_rate'] = (data['operating_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 영업비 상세 (M99만)
    data['expense_detail'] = {
        'salary': data.get('1. 급 여', 0),
        'travel': data.get('2. TRAVEL & MEAL', 0),
        'uniform': data.get('3. 피복비(유니폼)', 0),
        'rent': data.get('4. 임차료', 0),
        'maintenance': data.get('5. 유지보수비', 0),
        'utilities': data.get('6. 수도광열비', 0),
        'supplies': data.get('7. 소모품비', 0),
        'communication': data.get('8. 통신비', 0),
        'marketing': data.get('9. 광고선전비', 0),
        'fee': data.get('10. 지급수수료', 0),
        'logistics': data.get('11. 운반비', 0),
        'other_fee': data.get('12. 기타 수수료(매장관리비 외)', 0),
        'insurance': data.get('13. 보험료', 0),
        'depreciation': data.get('14. 감가상각비', 0),
        'duty_free': data.get('15. 면세점 직접비', 0),
    }
    
    # 직접이익 = 매출총이익 - 직접비
    data['direct_profit'] = data['gross_profit'] - data['direct_cost']
    data['direct_profit_rate'] = (data['direct_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    return data

# 데이터 추출 - 홍콩/마카오 분리
current_month_hk = get_period_data(202512, 'HK')
current_month_mc = get_period_data(202512, 'MC')

# 영업비 안분 (M99 영업비를 HK+MC 실판매출 비율로 안분)
total_sg_a_202512 = current_month_hk['sg_a'] + current_month_mc['sg_a']
total_net_sales_202512 = current_month_hk['net_sales'] + current_month_mc['net_sales']
current_month_hk['sg_a'] = total_sg_a_202512 * (current_month_hk['net_sales'] / total_net_sales_202512) if total_net_sales_202512 > 0 else 0
current_month_mc['sg_a'] = total_sg_a_202512 * (current_month_mc['net_sales'] / total_net_sales_202512) if total_net_sales_202512 > 0 else 0

# 영업이익 재계산 (매출총이익 - 직접비 - 영업비)
current_month_hk['operating_profit'] = current_month_hk['gross_profit'] - current_month_hk['direct_cost'] - current_month_hk['sg_a']
current_month_hk['operating_profit_rate'] = (current_month_hk['operating_profit'] / current_month_hk['net_sales'] * 100) if current_month_hk['net_sales'] > 0 else 0
current_month_mc['operating_profit'] = current_month_mc['gross_profit'] - current_month_mc['direct_cost'] - current_month_mc['sg_a']
current_month_mc['operating_profit_rate'] = (current_month_mc['operating_profit'] / current_month_mc['net_sales'] * 100) if current_month_mc['net_sales'] > 0 else 0

# total은 HK + MC 합계로 계산
current_month_total = {
    'tag_sales': current_month_hk['tag_sales'] + current_month_mc['tag_sales'],
    'net_sales': current_month_hk['net_sales'] + current_month_mc['net_sales'],
    'discount': current_month_hk['discount'] + current_month_mc['discount'],
    'cogs': current_month_hk['cogs'] + current_month_mc['cogs'],
    'gross_profit': current_month_hk['gross_profit'] + current_month_mc['gross_profit'],
    'sg_a': current_month_hk['sg_a'] + current_month_mc['sg_a'],
    'operating_profit': current_month_hk['operating_profit'] + current_month_mc['operating_profit'],
    'direct_cost': current_month_hk['direct_cost'] + current_month_mc['direct_cost'],
    'direct_profit': current_month_hk['direct_profit'] + current_month_mc['direct_profit'],
}
# expense_detail 합계 추가
current_month_total['expense_detail'] = {}
for key in current_month_hk.get('expense_detail', {}).keys():
    current_month_total['expense_detail'][key] = (
        current_month_hk.get('expense_detail', {}).get(key, 0) + 
        current_month_mc.get('expense_detail', {}).get(key, 0)
    )
# 비율 재계산
current_month_total['discount_rate'] = (current_month_total['discount'] / current_month_total['tag_sales'] * 100) if current_month_total['tag_sales'] > 0 else 0
current_month_total['cogs_rate'] = (current_month_total['cogs'] / current_month_total['tag_sales'] * 100) if current_month_total['tag_sales'] > 0 else 0
current_month_total['gross_profit_rate'] = (current_month_total['gross_profit'] / current_month_total['net_sales'] * 100) if current_month_total['net_sales'] > 0 else 0
current_month_total['operating_profit_rate'] = (current_month_total['operating_profit'] / current_month_total['net_sales'] * 100) if current_month_total['net_sales'] > 0 else 0
current_month_total['direct_profit_rate'] = (current_month_total['direct_profit'] / current_month_total['net_sales'] * 100) if current_month_total['net_sales'] > 0 else 0

prev_month_hk = get_period_data(202412, 'HK')
prev_month_mc = get_period_data(202412, 'MC')

# 영업비 안분 (M99 영업비를 HK+MC 실판매출 비율로 안분)
total_sg_a_202412 = prev_month_hk['sg_a'] + prev_month_mc['sg_a']
total_net_sales_202412 = prev_month_hk['net_sales'] + prev_month_mc['net_sales']
prev_month_hk['sg_a'] = total_sg_a_202412 * (prev_month_hk['net_sales'] / total_net_sales_202412) if total_net_sales_202412 > 0 else 0
prev_month_mc['sg_a'] = total_sg_a_202412 * (prev_month_mc['net_sales'] / total_net_sales_202412) if total_net_sales_202412 > 0 else 0

# 영업이익 재계산
prev_month_hk['operating_profit'] = prev_month_hk['gross_profit'] - prev_month_hk['direct_cost'] - prev_month_hk['sg_a']
prev_month_hk['operating_profit_rate'] = (prev_month_hk['operating_profit'] / prev_month_hk['net_sales'] * 100) if prev_month_hk['net_sales'] > 0 else 0
prev_month_mc['operating_profit'] = prev_month_mc['gross_profit'] - prev_month_mc['direct_cost'] - prev_month_mc['sg_a']
prev_month_mc['operating_profit_rate'] = (prev_month_mc['operating_profit'] / prev_month_mc['net_sales'] * 100) if prev_month_mc['net_sales'] > 0 else 0

# total은 HK + MC 합계로 계산
prev_month_total = {
    'tag_sales': prev_month_hk['tag_sales'] + prev_month_mc['tag_sales'],
    'net_sales': prev_month_hk['net_sales'] + prev_month_mc['net_sales'],
    'discount': prev_month_hk['discount'] + prev_month_mc['discount'],
    'cogs': prev_month_hk['cogs'] + prev_month_mc['cogs'],
    'gross_profit': prev_month_hk['gross_profit'] + prev_month_mc['gross_profit'],
    'sg_a': prev_month_hk['sg_a'] + prev_month_mc['sg_a'],
    'operating_profit': prev_month_hk['operating_profit'] + prev_month_mc['operating_profit'],
    'direct_cost': prev_month_hk['direct_cost'] + prev_month_mc['direct_cost'],
    'direct_profit': prev_month_hk['direct_profit'] + prev_month_mc['direct_profit'],
}
# expense_detail 합계 추가
prev_month_total['expense_detail'] = {}
for key in prev_month_hk.get('expense_detail', {}).keys():
    prev_month_total['expense_detail'][key] = (
        prev_month_hk.get('expense_detail', {}).get(key, 0) + 
        prev_month_mc.get('expense_detail', {}).get(key, 0)
    )

cumulative_hk = get_ytd_data(202501, 202512, 'HK')
cumulative_mc = get_ytd_data(202501, 202512, 'MC')

# 영업비 안분 (M99 영업비를 HK+MC 실판매출 비율로 안분)
total_sg_a_ytd = cumulative_hk['sg_a'] + cumulative_mc['sg_a']
total_net_sales_ytd = cumulative_hk['net_sales'] + cumulative_mc['net_sales']
cumulative_hk['sg_a'] = total_sg_a_ytd * (cumulative_hk['net_sales'] / total_net_sales_ytd) if total_net_sales_ytd > 0 else 0
cumulative_mc['sg_a'] = total_sg_a_ytd * (cumulative_mc['net_sales'] / total_net_sales_ytd) if total_net_sales_ytd > 0 else 0

# 영업이익 재계산
cumulative_hk['operating_profit'] = cumulative_hk['gross_profit'] - cumulative_hk['direct_cost'] - cumulative_hk['sg_a']
cumulative_hk['operating_profit_rate'] = (cumulative_hk['operating_profit'] / cumulative_hk['net_sales'] * 100) if cumulative_hk['net_sales'] > 0 else 0
cumulative_mc['operating_profit'] = cumulative_mc['gross_profit'] - cumulative_mc['direct_cost'] - cumulative_mc['sg_a']
cumulative_mc['operating_profit_rate'] = (cumulative_mc['operating_profit'] / cumulative_mc['net_sales'] * 100) if cumulative_mc['net_sales'] > 0 else 0

# total은 HK + MC 합계로 계산
cumulative_total = {
    'tag_sales': cumulative_hk['tag_sales'] + cumulative_mc['tag_sales'],
    'net_sales': cumulative_hk['net_sales'] + cumulative_mc['net_sales'],
    'discount': cumulative_hk['discount'] + cumulative_mc['discount'],
    'cogs': cumulative_hk['cogs'] + cumulative_mc['cogs'],
    'gross_profit': cumulative_hk['gross_profit'] + cumulative_mc['gross_profit'],
    'sg_a': cumulative_hk['sg_a'] + cumulative_mc['sg_a'],
    'operating_profit': cumulative_hk['operating_profit'] + cumulative_mc['operating_profit'],
    'direct_cost': cumulative_hk['direct_cost'] + cumulative_mc['direct_cost'],
    'direct_profit': cumulative_hk['direct_profit'] + cumulative_mc['direct_profit'],
}
# expense_detail 합계 추가
cumulative_total['expense_detail'] = {}
for key in cumulative_hk.get('expense_detail', {}).keys():
    cumulative_total['expense_detail'][key] = (
        cumulative_hk.get('expense_detail', {}).get(key, 0) + 
        cumulative_mc.get('expense_detail', {}).get(key, 0)
    )
# 비율 재계산
cumulative_total['discount_rate'] = (cumulative_total['discount'] / cumulative_total['tag_sales'] * 100) if cumulative_total['tag_sales'] > 0 else 0
cumulative_total['cogs_rate'] = (cumulative_total['cogs'] / cumulative_total['tag_sales'] * 100) if cumulative_total['tag_sales'] > 0 else 0
cumulative_total['gross_profit_rate'] = (cumulative_total['gross_profit'] / cumulative_total['net_sales'] * 100) if cumulative_total['net_sales'] > 0 else 0
cumulative_total['operating_profit_rate'] = (cumulative_total['operating_profit'] / cumulative_total['net_sales'] * 100) if cumulative_total['net_sales'] > 0 else 0
cumulative_total['direct_profit_rate'] = (cumulative_total['direct_profit'] / cumulative_total['net_sales'] * 100) if cumulative_total['net_sales'] > 0 else 0

prev_cumulative_hk = get_ytd_data(202401, 202412, 'HK')
prev_cumulative_mc = get_ytd_data(202401, 202412, 'MC')

# 영업비 안분 (M99 영업비를 HK+MC 실판매출 비율로 안분)
total_sg_a_prev_ytd = prev_cumulative_hk['sg_a'] + prev_cumulative_mc['sg_a']
total_net_sales_prev_ytd = prev_cumulative_hk['net_sales'] + prev_cumulative_mc['net_sales']
prev_cumulative_hk['sg_a'] = total_sg_a_prev_ytd * (prev_cumulative_hk['net_sales'] / total_net_sales_prev_ytd) if total_net_sales_prev_ytd > 0 else 0
prev_cumulative_mc['sg_a'] = total_sg_a_prev_ytd * (prev_cumulative_mc['net_sales'] / total_net_sales_prev_ytd) if total_net_sales_prev_ytd > 0 else 0

# 영업이익 재계산
prev_cumulative_hk['operating_profit'] = prev_cumulative_hk['gross_profit'] - prev_cumulative_hk['direct_cost'] - prev_cumulative_hk['sg_a']
prev_cumulative_hk['operating_profit_rate'] = (prev_cumulative_hk['operating_profit'] / prev_cumulative_hk['net_sales'] * 100) if prev_cumulative_hk['net_sales'] > 0 else 0
prev_cumulative_mc['operating_profit'] = prev_cumulative_mc['gross_profit'] - prev_cumulative_mc['direct_cost'] - prev_cumulative_mc['sg_a']
prev_cumulative_mc['operating_profit_rate'] = (prev_cumulative_mc['operating_profit'] / prev_cumulative_mc['net_sales'] * 100) if prev_cumulative_mc['net_sales'] > 0 else 0

# total은 HK + MC 합계로 계산
prev_cumulative_total = {
    'tag_sales': prev_cumulative_hk['tag_sales'] + prev_cumulative_mc['tag_sales'],
    'net_sales': prev_cumulative_hk['net_sales'] + prev_cumulative_mc['net_sales'],
    'discount': prev_cumulative_hk['discount'] + prev_cumulative_mc['discount'],
    'cogs': prev_cumulative_hk['cogs'] + prev_cumulative_mc['cogs'],
    'gross_profit': prev_cumulative_hk['gross_profit'] + prev_cumulative_mc['gross_profit'],
    'sg_a': prev_cumulative_hk['sg_a'] + prev_cumulative_mc['sg_a'],
    'operating_profit': prev_cumulative_hk['operating_profit'] + prev_cumulative_mc['operating_profit'],
    'direct_cost': prev_cumulative_hk['direct_cost'] + prev_cumulative_mc['direct_cost'],
    'direct_profit': prev_cumulative_hk['direct_profit'] + prev_cumulative_mc['direct_profit'],
}
# expense_detail 합계 추가
prev_cumulative_total['expense_detail'] = {}
for key in prev_cumulative_hk.get('expense_detail', {}).keys():
    prev_cumulative_total['expense_detail'][key] = (
        prev_cumulative_hk.get('expense_detail', {}).get(key, 0) + 
        prev_cumulative_mc.get('expense_detail', {}).get(key, 0)
    )

# YOY 계산
def calc_yoy(current, previous):
    return (current / previous * 100) if previous > 0 else 0

def calc_change(current, previous):
    return current - previous

# 채널별 데이터 추출 함수
def get_channel_data(df, period, channels, region):
    """특정 채널의 실판매출 추출"""
    filtered = df[(df['PERIOD'] == period) & 
                  (df['ACCOUNT_NM'] == '실매출액') & 
                  (df['CHNL_CD'].isin(channels)) &
                  (df['CNTRY_CD'] == region)]
    return filtered['VALUE'].sum()

# 실제 채널명 추출 (인코딩 문제 해결)
df_2512_sample = df_mlb[(df_mlb['PERIOD'] == 202512) & (df_mlb['ACCOUNT_NM'] == '실매출액')]
all_channels = df_2512_sample['CHNL_CD'].unique()

channel_names = {
    'online': None,
    'retail': None,
    'outlet': None
}

for chnl in all_channels:
    # 바이트 단위로 비교
    if any(keyword in str(chnl).encode('utf-8', errors='ignore').decode('utf-8', errors='ignore') for keyword in ['온라인']):
        channel_names['online'] = chnl
    # 정규점 찾기 - 가상점이 아니면서 온라인/아웃렛이 아닌 것
    elif '가상' not in str(chnl):
        # 아웃렛 체크
        if len(str(chnl)) < 5:  # 아웃렛은 보통 길이가 짧음
            if channel_names['outlet'] is None:
                channel_names['outlet'] = chnl
        else:  # 정규점은 보통 길이가 더 김
            if channel_names['retail'] is None and chnl != channel_names['online']:
                channel_names['retail'] = chnl

# 수동으로 다시 매핑 (all_channels에서 찾기)
for chnl in all_channels:
    print(f"  채널: '{chnl}' (len={len(str(chnl))})")
    
# 직접 인덱스로 매핑
all_channels_list = list(all_channels)
if len(all_channels_list) >= 3:
    channel_names['online'] = all_channels_list[0]  # 온라인
    channel_names['retail'] = all_channels_list[1]   # 정규점
    channel_names['outlet'] = all_channels_list[2]   # 아웃렛

print(f"\n채널명 최종 매핑: {channel_names}")

# 채널별 직접이익 계산
print("\n채널별 직접이익 계산 중...")

# 전체 M99 영업비 (HK+MC 합계)
total_sg_a_current = current_month_total['sg_a']
total_net_sales_current = current_month_total['net_sales']
total_sg_a_prev = prev_month_total['sg_a']
total_net_sales_prev = prev_month_total['net_sales']

print(f"전체 영업비(M99): {total_sg_a_current:,.0f}K")
print(f"전체 실판매출: {total_net_sales_current:,.0f}K (HK: {current_month_hk['net_sales']:,.0f}K, MC: {current_month_mc['net_sales']:,.0f}K)")

# 채널별 직접비를 직접 계산하는 함수
def get_channel_direct_cost(df, period, channels, region):
    """특정 채널의 직접비 합계 (M99 제외)"""
    df_period = df[(df['PERIOD'] == period) & (df['CNTRY_CD'] == region)]
    # M99 제외
    df_period = df_period[df_period['SHOP_CD'] != 'M99']
    # 채널 필터
    df_period = df_period[df_period['CHNL_CD'].isin(channels)]
    
    direct_cost_accounts = [
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    total = 0
    for account in direct_cost_accounts:
        val = df_period[df_period['ACCOUNT_NM'] == account]['VALUE'].sum()
        total += val
    return total

# HK 오프라인 (정규점 + 아웃렛)
offline_channels = [ch for ch in [channel_names['retail'], channel_names['outlet']] if ch]
hk_offline_sales = get_channel_data(df_mlb, 202512, offline_channels, 'HK')
hk_offline_sales_prev = get_channel_data(df_mlb, 202412, offline_channels, 'HK')

# 직접이익 = 매출총이익 - 직접비 (영업비 제외)
hk_offline_gross = hk_offline_sales * (current_month_hk['gross_profit_rate'] / 100)
hk_offline_direct_cost = get_channel_direct_cost(df_mlb, 202512, offline_channels, 'HK')
hk_offline_direct_profit = hk_offline_gross - hk_offline_direct_cost
print(f"  HK 오프라인 매출: {hk_offline_sales:,.0f}K, 총이익: {hk_offline_gross:,.0f}K, 직접비: {hk_offline_direct_cost:,.0f}K, 직접이익: {hk_offline_direct_profit:,.0f}K")

hk_offline_gross_prev = hk_offline_sales_prev * (prev_month_hk['gross_profit_rate'] / 100)
hk_offline_direct_cost_prev = get_channel_direct_cost(df_mlb, 202412, offline_channels, 'HK')
hk_offline_direct_profit_prev = hk_offline_gross_prev - hk_offline_direct_cost_prev

# MC 오프라인 (정규점 + 아웃렛)
mc_offline_sales = get_channel_data(df_mlb, 202512, offline_channels, 'MC')
mc_offline_sales_prev = get_channel_data(df_mlb, 202412, offline_channels, 'MC')
mc_offline_gross = mc_offline_sales * (current_month_mc['gross_profit_rate'] / 100)
mc_offline_direct_cost = get_channel_direct_cost(df_mlb, 202512, offline_channels, 'MC')
mc_offline_direct_profit = mc_offline_gross - mc_offline_direct_cost
print(f"  MC 오프라인 매출: {mc_offline_sales:,.0f}K, 총이익: {mc_offline_gross:,.0f}K, 직접비: {mc_offline_direct_cost:,.0f}K, 직접이익: {mc_offline_direct_profit:,.0f}K")

mc_offline_gross_prev = mc_offline_sales_prev * (prev_month_mc['gross_profit_rate'] / 100)
mc_offline_direct_cost_prev = get_channel_direct_cost(df_mlb, 202412, offline_channels, 'MC')
mc_offline_direct_profit_prev = mc_offline_gross_prev - mc_offline_direct_cost_prev

# HK 온라인
online_channels = [channel_names['online']] if channel_names['online'] else []
hk_online_sales = get_channel_data(df_mlb, 202512, online_channels, 'HK')
hk_online_sales_prev = get_channel_data(df_mlb, 202412, online_channels, 'HK')
hk_online_gross = hk_online_sales * (current_month_hk['gross_profit_rate'] / 100)
hk_online_direct_cost = get_channel_direct_cost(df_mlb, 202512, online_channels, 'HK')
hk_online_direct_profit = hk_online_gross - hk_online_direct_cost
print(f"  HK 온라인 매출: {hk_online_sales:,.0f}K, 총이익: {hk_online_gross:,.0f}K, 직접비: {hk_online_direct_cost:,.0f}K, 직접이익: {hk_online_direct_profit:,.0f}K")

hk_online_gross_prev = hk_online_sales_prev * (prev_month_hk['gross_profit_rate'] / 100)
hk_online_direct_cost_prev = get_channel_direct_cost(df_mlb, 202412, online_channels, 'HK')
hk_online_direct_profit_prev = hk_online_gross_prev - hk_online_direct_cost_prev

channel_direct_profit = {
    "hk_offline": {
        "direct_profit": hk_offline_direct_profit,
        "direct_profit_rate": (hk_offline_direct_profit / hk_offline_sales * 100) if hk_offline_sales > 0 else 0,
        "yoy": calc_yoy(hk_offline_direct_profit, hk_offline_direct_profit_prev) if hk_offline_direct_profit_prev != 0 else None
    },
    "mc_offline": {
        "direct_profit": mc_offline_direct_profit,
        "direct_profit_rate": (mc_offline_direct_profit / mc_offline_sales * 100) if mc_offline_sales > 0 else 0,
        "yoy": calc_yoy(mc_offline_direct_profit, mc_offline_direct_profit_prev)
    },
    "hk_online": {
        "direct_profit": hk_online_direct_profit,
        "direct_profit_rate": (hk_online_direct_profit / hk_online_sales * 100) if hk_online_sales > 0 else 0,
        "yoy": calc_yoy(hk_online_direct_profit, hk_online_direct_profit_prev)
    },
    "total": {
        "direct_profit": current_month_total['direct_profit'],
        "direct_profit_rate": current_month_total['direct_profit_rate'],
        "yoy": calc_yoy(current_month_total['direct_profit'], prev_month_total['direct_profit'])
    }
}

print(f"  HK 오프라인 직접이익: {hk_offline_direct_profit:,.0f}K")
print(f"  MC 오프라인 직접이익: {mc_offline_direct_profit:,.0f}K")
print(f"  HK 온라인 직접이익: {hk_online_direct_profit:,.0f}K")

# 누적 채널별 직접이익 계산
print("\n누적 채널별 직접이익 계산 중...")

# 누적 채널별 매출 데이터 추출
def get_channel_data_ytd(df, start_period, end_period, channels, region):
    """누적 기간 특정 채널의 실판매출 추출"""
    filtered = df[(df['PERIOD'] >= start_period) & (df['PERIOD'] <= end_period) &
                  (df['ACCOUNT_NM'] == '실매출액') & 
                  (df['CHNL_CD'].isin(channels)) &
                  (df['CNTRY_CD'] == region)]
    return filtered['VALUE'].sum()

def get_channel_direct_cost_ytd(df, start_period, end_period, channels, region):
    """누적 기간 특정 채널의 직접비 합계 (M99 제외)"""
    df_period = df[(df['PERIOD'] >= start_period) & (df['PERIOD'] <= end_period) & (df['CNTRY_CD'] == region)]
    df_period = df_period[df_period['SHOP_CD'] != 'M99']
    df_period = df_period[df_period['CHNL_CD'].isin(channels)]
    
    direct_cost_accounts = [
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    total = 0
    for account in direct_cost_accounts:
        val = df_period[df_period['ACCOUNT_NM'] == account]['VALUE'].sum()
        total += val
    return total

# 누적 (2501~2512)
cumul_total_sg_a = cumulative_hk['sg_a'] + cumulative_mc['sg_a']
cumul_total_net_sales = cumulative_hk['net_sales'] + cumulative_mc['net_sales']

cumul_hk_offline_sales = get_channel_data_ytd(df_mlb, 202501, 202512, offline_channels, 'HK')
cumul_hk_offline_gross = cumul_hk_offline_sales * (cumulative_hk['gross_profit_rate'] / 100)
cumul_hk_offline_direct_cost = get_channel_direct_cost_ytd(df_mlb, 202501, 202512, offline_channels, 'HK')
cumul_hk_offline_direct_profit = cumul_hk_offline_gross - cumul_hk_offline_direct_cost

cumul_mc_offline_sales = get_channel_data_ytd(df_mlb, 202501, 202512, offline_channels, 'MC')
cumul_mc_offline_gross = cumul_mc_offline_sales * (cumulative_mc['gross_profit_rate'] / 100)
cumul_mc_offline_direct_cost = get_channel_direct_cost_ytd(df_mlb, 202501, 202512, offline_channels, 'MC')
cumul_mc_offline_direct_profit = cumul_mc_offline_gross - cumul_mc_offline_direct_cost

cumul_hk_online_sales = get_channel_data_ytd(df_mlb, 202501, 202512, online_channels, 'HK')
cumul_hk_online_gross = cumul_hk_online_sales * (cumulative_hk['gross_profit_rate'] / 100)
cumul_hk_online_direct_cost = get_channel_direct_cost_ytd(df_mlb, 202501, 202512, online_channels, 'HK')
cumul_hk_online_direct_profit = cumul_hk_online_gross - cumul_hk_online_direct_cost

print(f"  누적 HK 오프라인: {cumul_hk_offline_direct_profit:,.0f}K")
print(f"  누적 MC 오프라인: {cumul_mc_offline_direct_profit:,.0f}K")
print(f"  누적 HK 온라인: {cumul_hk_online_direct_profit:,.0f}K")

# 전년 누적 (2401~2412)
prev_cumul_total_sg_a = prev_cumulative_hk['sg_a'] + prev_cumulative_mc['sg_a']
prev_cumul_total_net_sales = prev_cumulative_hk['net_sales'] + prev_cumulative_mc['net_sales']

prev_cumul_hk_offline_sales = get_channel_data_ytd(df_mlb, 202401, 202412, offline_channels, 'HK')
prev_cumul_hk_offline_gross = prev_cumul_hk_offline_sales * (prev_cumulative_hk['gross_profit_rate'] / 100)
prev_cumul_hk_offline_direct_cost = get_channel_direct_cost_ytd(df_mlb, 202401, 202412, offline_channels, 'HK')
prev_cumul_hk_offline_direct_profit = prev_cumul_hk_offline_gross - prev_cumul_hk_offline_direct_cost

prev_cumul_mc_offline_sales = get_channel_data_ytd(df_mlb, 202401, 202412, offline_channels, 'MC')
prev_cumul_mc_offline_gross = prev_cumul_mc_offline_sales * (prev_cumulative_mc['gross_profit_rate'] / 100)
prev_cumul_mc_offline_direct_cost = get_channel_direct_cost_ytd(df_mlb, 202401, 202412, offline_channels, 'MC')
prev_cumul_mc_offline_direct_profit = prev_cumul_mc_offline_gross - prev_cumul_mc_offline_direct_cost

prev_cumul_hk_online_sales = get_channel_data_ytd(df_mlb, 202401, 202412, online_channels, 'HK')
prev_cumul_hk_online_gross = prev_cumul_hk_online_sales * (prev_cumulative_hk['gross_profit_rate'] / 100)
prev_cumul_hk_online_direct_cost = get_channel_direct_cost_ytd(df_mlb, 202401, 202412, online_channels, 'HK')
prev_cumul_hk_online_direct_profit = prev_cumul_hk_online_gross - prev_cumul_hk_online_direct_cost

cumulative_channel_direct_profit = {
    "hk_offline": {
        "direct_profit": cumul_hk_offline_direct_profit,
        "direct_profit_rate": (cumul_hk_offline_direct_profit / cumul_hk_offline_sales * 100) if cumul_hk_offline_sales > 0 else 0,
        "yoy": calc_yoy(cumul_hk_offline_direct_profit, prev_cumul_hk_offline_direct_profit) if prev_cumul_hk_offline_direct_profit != 0 else None
    },
    "mc_offline": {
        "direct_profit": cumul_mc_offline_direct_profit,
        "direct_profit_rate": (cumul_mc_offline_direct_profit / cumul_mc_offline_sales * 100) if cumul_mc_offline_sales > 0 else 0,
        "yoy": calc_yoy(cumul_mc_offline_direct_profit, prev_cumul_mc_offline_direct_profit)
    },
    "hk_online": {
        "direct_profit": cumul_hk_online_direct_profit,
        "direct_profit_rate": (cumul_hk_online_direct_profit / cumul_hk_online_sales * 100) if cumul_hk_online_sales > 0 else 0,
        "yoy": calc_yoy(cumul_hk_online_direct_profit, prev_cumul_hk_online_direct_profit)
    },
    "total": {
        "direct_profit": cumulative_total['direct_profit'],
        "direct_profit_rate": cumulative_total['direct_profit_rate'],
        "yoy": calc_yoy(cumulative_total['direct_profit'], prev_cumulative_total['direct_profit'])
    }
}

# JSON 구조 생성
pl_data = {
    "metadata": {
        "last_period": "2512",
        "previous_period": "2412",
        "generated_at": datetime.now().isoformat()
    },
    "channel_direct_profit": channel_direct_profit,
    "current_month": {
        "hk": current_month_hk,
        "mc": current_month_mc,
        "total": current_month_total,
        "yoy": {
            "tag_sales": calc_yoy(current_month_total['tag_sales'], prev_month_total['tag_sales']),
            "discount": calc_yoy(current_month_total['discount'], prev_month_total['discount']),
            "net_sales": calc_yoy(current_month_total['net_sales'], prev_month_total['net_sales']),
            "cogs": calc_yoy(current_month_total['cogs'], prev_month_total['cogs']),
            "gross_profit": calc_yoy(current_month_total['gross_profit'], prev_month_total['gross_profit']),
            "direct_cost": calc_yoy(current_month_total['direct_cost'], prev_month_total['direct_cost']),
            "direct_profit": calc_yoy(current_month_total['direct_profit'], prev_month_total['direct_profit']),
            "sg_a": calc_yoy(current_month_total['sg_a'], prev_month_total['sg_a']),
            "operating_profit": calc_yoy(current_month_total['operating_profit'], prev_month_total['operating_profit']),
        },
        "change": {
            "tag_sales": calc_change(current_month_total['tag_sales'], prev_month_total['tag_sales']),
            "discount": calc_change(current_month_total['discount'], prev_month_total['discount']),
            "net_sales": calc_change(current_month_total['net_sales'], prev_month_total['net_sales']),
            "cogs": calc_change(current_month_total['cogs'], prev_month_total['cogs']),
            "gross_profit": calc_change(current_month_total['gross_profit'], prev_month_total['gross_profit']),
            "direct_cost": calc_change(current_month_total['direct_cost'], prev_month_total['direct_cost']),
            "direct_profit": calc_change(current_month_total['direct_profit'], prev_month_total['direct_profit']),
            "sg_a": calc_change(current_month_total['sg_a'], prev_month_total['sg_a']),
            "operating_profit": calc_change(current_month_total['operating_profit'], prev_month_total['operating_profit']),
        }
    },
    "prev_month": {
        "hk": prev_month_hk,
        "mc": prev_month_mc,
        "total": prev_month_total
    },
    "cumulative": {
        "hk": cumulative_hk,
        "mc": cumulative_mc,
        "total": cumulative_total,
        "channel_direct_profit": cumulative_channel_direct_profit,
        "prev_cumulative": {
            "hk": prev_cumulative_hk,
            "mc": prev_cumulative_mc,
            "total": prev_cumulative_total
        },
        "yoy": {
            "tag_sales": calc_yoy(cumulative_total['tag_sales'], prev_cumulative_total['tag_sales']),
            "net_sales": calc_yoy(cumulative_total['net_sales'], prev_cumulative_total['net_sales']),
            "cogs": calc_yoy(cumulative_total['cogs'], prev_cumulative_total['cogs']),
            "gross_profit": calc_yoy(cumulative_total['gross_profit'], prev_cumulative_total['gross_profit']),
            "direct_cost": calc_yoy(cumulative_total['direct_cost'], prev_cumulative_total['direct_cost']),
            "direct_profit": calc_yoy(cumulative_total['direct_profit'], prev_cumulative_total['direct_profit']),
            "sg_a": calc_yoy(cumulative_total['sg_a'], prev_cumulative_total['sg_a']),
            "operating_profit": calc_yoy(cumulative_total['operating_profit'], prev_cumulative_total['operating_profit']),
        }
    }
}

# JSON 저장
output_file = 'public/dashboard/hongkong-pl-data-2512.json'
os.makedirs(os.path.dirname(output_file), exist_ok=True)

# Discovery PL 데이터 로드 (있으면)
discovery_pl_file = 'public/dashboard/discovery-pl-data-2512.json'
if os.path.exists(discovery_pl_file):
    try:
        with open(discovery_pl_file, 'r', encoding='utf-8') as f:
            discovery_data = json.load(f)
        
        # Discovery 당월 데이터 추출
        discovery_current = discovery_data.get('current_month', {}).get('data', {})
        discovery_prev = discovery_data.get('prev_month', {}).get('data', {})
        discovery_mom = discovery_data.get('current_month', {}).get('mom', {})
        discovery_store_count = discovery_data.get('metadata', {}).get('store_count', {})
        
        # Discovery 누적 데이터 추출
        discovery_cumulative = discovery_data.get('cumulative', {}).get('data', {})
        
        # pl_data에 Discovery 추가
        pl_data['discovery'] = {
            'net_sales': discovery_current.get('net_sales', 0),
            'prev_net_sales': discovery_prev.get('net_sales', 0),
            'net_sales_mom': discovery_mom.get('net_sales', 0),
            'discount_rate': discovery_current.get('discount_rate', 0),
            'prev_discount_rate': discovery_prev.get('discount_rate', 0),
            'direct_cost': discovery_current.get('direct_cost', 0),
            'direct_profit': discovery_current.get('direct_profit', 0),
            'sg_a': discovery_current.get('sg_a', 0),
            'operating_profit': discovery_current.get('operating_profit', 0),
            'marketing': discovery_current.get('expense_detail', {}).get('marketing', 0),
            'travel': discovery_current.get('expense_detail', {}).get('travel', 0),
            'store_count': discovery_store_count,
            # 누적 데이터 추가
            'cumulative_net_sales': discovery_cumulative.get('net_sales', 0),
            'cumulative_discount_rate': discovery_cumulative.get('discount_rate', 0),
            'cumulative_direct_cost': discovery_cumulative.get('direct_cost', 0),
            'cumulative_direct_profit': discovery_cumulative.get('direct_profit', 0),
            'cumulative_sg_a': discovery_cumulative.get('sg_a', 0),
            'cumulative_operating_profit': discovery_cumulative.get('operating_profit', 0),
            'cumulative_marketing': discovery_cumulative.get('expense_detail', {}).get('marketing', 0),
            'cumulative_travel': discovery_cumulative.get('expense_detail', {}).get('travel', 0),
        }
        print(f"\n[INFO] Discovery 데이터 통합 완료")
        print(f"  [당월]")
        print(f"  - 실판매출: {pl_data['discovery']['net_sales']:,.0f}K HKD")
        print(f"  - 전월 실판매출: {pl_data['discovery']['prev_net_sales']:,.0f}K HKD")
        print(f"  - 전월비(MOM): {pl_data['discovery']['net_sales_mom']:.1f}%")
        print(f"  - 할인율: {pl_data['discovery']['discount_rate']:.1f}%")
        print(f"  - 전월 할인율: {pl_data['discovery']['prev_discount_rate']:.1f}%")
        print(f"  - 할인율 증감: {pl_data['discovery']['discount_rate'] - pl_data['discovery']['prev_discount_rate']:+.1f}%p")
        print(f"  - 직접비(실제 매장): {pl_data['discovery']['direct_cost']:,.0f}K HKD")
        print(f"  - 직접손실: {pl_data['discovery']['direct_profit']:,.0f}K HKD")
        print(f"  - 영업비(M99): {pl_data['discovery']['sg_a']:,.0f}K HKD")
        print(f"  - 영업손실: {pl_data['discovery']['operating_profit']:,.0f}K HKD")
        print(f"  [누적]")
        print(f"  - 누적 실판매출: {pl_data['discovery']['cumulative_net_sales']:,.0f}K HKD")
        print(f"  - 누적 할인율: {pl_data['discovery']['cumulative_discount_rate']:.1f}%")
        print(f"  - 누적 직접비: {pl_data['discovery']['cumulative_direct_cost']:,.0f}K HKD")
        print(f"  - 누적 직접손실: {pl_data['discovery']['cumulative_direct_profit']:,.0f}K HKD")
        print(f"  - 누적 영업비(M99): {pl_data['discovery']['cumulative_sg_a']:,.0f}K HKD")
        print(f"  - 누적 영업손실: {pl_data['discovery']['cumulative_operating_profit']:,.0f}K HKD")
        print(f"  - 매장수: 오프라인 {discovery_store_count.get('offline', 0)}개, 온라인 {discovery_store_count.get('online', 0)}개")
    except Exception as e:
        print(f"\n[WARNING] Discovery 데이터 로드 실패: {e}")
else:
    print(f"\n[INFO] Discovery 데이터 파일 없음, 스킵")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(pl_data, f, ensure_ascii=False, indent=2)

print(f"\n[OK] 완전한 손익요약 표 데이터 생성 완료: {output_file}")
print(f"\n당월 데이터 (2512) - HK+MC:")
print(f"  - Tag매출액: {current_month_total['tag_sales']:,.0f}K HKD")
print(f"  - 실판매출: {current_month_total['net_sales']:,.0f}K HKD (YOY {calc_yoy(current_month_total['net_sales'], prev_month_total['net_sales']):.1f}%)")
print(f"  - 할인율: {current_month_total['discount_rate']:.1f}%")
print(f"  - 매출원가: {current_month_total['cogs']:,.0f}K HKD")
print(f"  - TAG대비 원가율: {current_month_total['cogs_rate']:.1f}%")
print(f"  - 매출총이익: {current_month_total['gross_profit']:,.0f}K HKD ({current_month_total['gross_profit_rate']:.1f}%)")
print(f"  - 직접이익: {current_month_total['direct_profit']:,.0f}K HKD ({current_month_total['direct_profit_rate']:.1f}%)")
print(f"  - 영업이익: {current_month_total['operating_profit']:,.0f}K HKD ({current_month_total['operating_profit_rate']:.1f}%)")
print(f"\n누적 데이터 (2501~2512) - HK+MC:")
print(f"  - Tag매출액: {cumulative_total['tag_sales']:,.0f}K HKD")
print(f"  - 실판매출: {cumulative_total['net_sales']:,.0f}K HKD (YOY {calc_yoy(cumulative_total['net_sales'], prev_cumulative_total['net_sales']):.1f}%)")
print(f"  - 매출원가: {cumulative_total['cogs']:,.0f}K HKD")
print(f"  - TAG대비 원가율: {cumulative_total['cogs_rate']:.1f}%")
print(f"  - 매출총이익: {cumulative_total['gross_profit']:,.0f}K HKD ({cumulative_total['gross_profit_rate']:.1f}%)")
print(f"  - 직접이익: {cumulative_total['direct_profit']:,.0f}K HKD ({cumulative_total['direct_profit_rate']:.1f}%)")
print(f"  - 영업이익: {cumulative_total['operating_profit']:,.0f}K HKD ({cumulative_total['operating_profit_rate']:.1f}%)")
print("\n" + "=" * 80)
