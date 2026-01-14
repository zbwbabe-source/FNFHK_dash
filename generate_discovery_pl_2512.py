#!/usr/bin/env python3
"""
Discovery 브랜드 PL 데이터 생성 스크립트 (2512)
"""
import pandas as pd
import json
from datetime import datetime

print("=" * 80)
print("Discovery PL 2512 데이터 생성")
print("=" * 80)

# Discovery PL CSV 파일 읽기
pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL Discovery 2512.csv"
df = pd.read_csv(pl_file, encoding='utf-8-sig')

# VALUE를 숫자로 변환
df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# Discovery만 필터링 (BRD_CD == 'X')
df_discovery = df[df['BRD_CD'] == 'X'].copy()

print(f"\n총 {len(df_discovery)} 행의 Discovery 데이터")

# 매장 수 계산 함수
def count_stores(period):
    """특정 기간의 매장 수 계산 (온라인/오프라인) - 홍콩만"""
    df_period = df_discovery[df_discovery['PERIOD'] == period]
    shops = df_period[['SHOP_CD', 'SHOP_NM', 'CHNL_CD', 'CNTRY_CD']].drop_duplicates()
    # 가상점(99 포함) 제외
    shops_real = shops[~shops['SHOP_CD'].str.contains('99', na=False)]
    # 홍콩만 필터링
    hk_shops = shops_real[shops_real['CNTRY_CD'] == 'HK']
    
    # 온라인/오프라인 구분
    # CHNL_CD에 '온라인' 포함 시 온라인, 아니면 오프라인
    online_count = len(hk_shops[hk_shops['CHNL_CD'].str.contains('온라인', na=False)])
    offline_count = len(hk_shops[~hk_shops['CHNL_CD'].str.contains('온라인', na=False)])
    
    return {
        'online': int(online_count),
        'offline': int(offline_count),
        'total': int(len(hk_shops))
    }

# 당월 매장 수
current_store_count = count_stores(202512)
print(f"\n홍콩 Discovery 매장 수 (2512): 온라인 {current_store_count['online']}개, 오프라인 {current_store_count['offline']}개")

# 계정명별로 데이터 추출하는 함수
def extract_account_data(df, period, account_name):
    """특정 기간의 계정 데이터 추출"""
    filtered = df[(df['PERIOD'] == period) & (df['ACCOUNT_NM'] == account_name)]
    return filtered['VALUE'].sum()

# 당월(2512)와 전년동월(2412) 데이터 추출
def get_period_data(period):
    """특정 기간의 모든 손익 데이터 추출"""
    data = {}
    
    # 매출 관련
    data['tag_sales'] = extract_account_data(df_discovery, period, 'Tag매출액')
    data['net_sales'] = extract_account_data(df_discovery, period, '실매출액')
    data['discount'] = data['tag_sales'] - data['net_sales']
    data['discount_rate'] = (data['discount'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    
    # 원가 및 이익
    data['cogs'] = extract_account_data(df_discovery, period, '매출원가합계')
    data['cogs_rate'] = (data['cogs'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    data['gross_profit'] = extract_account_data(df_discovery, period, '매출총이익')
    data['gross_profit_rate'] = (data['gross_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 영업 관련
    data['sg_a'] = extract_account_data(df_discovery, period, '판매관리비')
    data['operating_profit'] = extract_account_data(df_discovery, period, '영업이익')
    data['operating_profit_rate'] = (data['operating_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 비용 상세 항목
    data['expense_detail'] = {
        'salary': extract_account_data(df_discovery, period, '1. 급 여'),
        'travel': extract_account_data(df_discovery, period, '2. TRAVEL & MEAL'),
        'uniform': extract_account_data(df_discovery, period, '3. 피복비(유니폼)'),
        'rent': extract_account_data(df_discovery, period, '4. 임차료'),
        'maintenance': extract_account_data(df_discovery, period, '5. 유지보수비'),
        'utilities': extract_account_data(df_discovery, period, '6. 수도광열비'),
        'supplies': extract_account_data(df_discovery, period, '7. 소모품비'),
        'communication': extract_account_data(df_discovery, period, '8. 통신비'),
        'marketing': extract_account_data(df_discovery, period, '9. 광고선전비'),
        'fee': extract_account_data(df_discovery, period, '10. 지급수수료'),
        'logistics': extract_account_data(df_discovery, period, '11. 운반비'),
        'other_fee': extract_account_data(df_discovery, period, '12. 기타 수수료(매장관리비 외)'),
        'insurance': extract_account_data(df_discovery, period, '13. 보험료'),
        'depreciation': extract_account_data(df_discovery, period, '14. 감가상각비'),
        'duty_free': extract_account_data(df_discovery, period, '15. 면세점 직접비'),
    }
    
    # 직접비 계산
    data['direct_cost'] = sum([
        data['expense_detail']['salary'],
        data['expense_detail']['rent'],
        data['expense_detail']['logistics'],
        data['expense_detail']['other_fee'],
        data['expense_detail']['insurance'],
        data['expense_detail']['depreciation'],
        data['expense_detail']['duty_free'],
        data['expense_detail']['travel'],
        data['expense_detail']['uniform'],
        data['expense_detail']['maintenance'],
        data['expense_detail']['utilities'],
        data['expense_detail']['supplies'],
        data['expense_detail']['communication'],
        data['expense_detail']['marketing'],
        data['expense_detail']['fee']
    ])
    
    data['direct_profit'] = data['gross_profit'] - data['direct_cost']
    data['direct_profit_rate'] = (data['direct_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    return data

# 누적 데이터 추출 (2501~2512, 2401~2412)
def get_ytd_data(start_period, end_period):
    """누적 기간의 모든 손익 데이터 추출"""
    df_ytd = df_discovery[(df_discovery['PERIOD'] >= start_period) & (df_discovery['PERIOD'] <= end_period)]
    
    data = {}
    accounts = [
        'Tag매출액', '실매출액', '매출원가합계', '매출총이익', '판매관리비', '영업이익',
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    for account in accounts:
        filtered = df_ytd[df_ytd['ACCOUNT_NM'] == account]
        data[account] = filtered['VALUE'].sum()
    
    # 계산
    data['tag_sales'] = data.get('Tag매출액', 0)
    data['net_sales'] = data.get('실매출액', 0)
    data['discount'] = data['tag_sales'] - data['net_sales']
    data['discount_rate'] = (data['discount'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    
    data['cogs'] = data.get('매출원가합계', 0)
    data['cogs_rate'] = (data['cogs'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    data['gross_profit'] = data.get('매출총이익', 0)
    data['gross_profit_rate'] = (data['gross_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    data['sg_a'] = data.get('판매관리비', 0)
    data['operating_profit'] = data.get('영업이익', 0)
    data['operating_profit_rate'] = (data['operating_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 비용 상세
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
    
    data['direct_cost'] = sum([
        data['expense_detail']['salary'],
        data['expense_detail']['rent'],
        data['expense_detail']['logistics'],
        data['expense_detail']['other_fee'],
        data['expense_detail']['insurance'],
        data['expense_detail']['depreciation'],
        data['expense_detail']['duty_free'],
        data['expense_detail']['travel'],
        data['expense_detail']['uniform'],
        data['expense_detail']['maintenance'],
        data['expense_detail']['utilities'],
        data['expense_detail']['supplies'],
        data['expense_detail']['communication'],
        data['expense_detail']['marketing'],
        data['expense_detail']['fee']
    ])
    
    data['direct_profit'] = data['gross_profit'] - data['direct_cost']
    data['direct_profit_rate'] = (data['direct_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    return data

# 데이터 추출
current_month = get_period_data(202512)
prev_month = get_period_data(202511)  # 전월 (2511)
prev_year_month = get_period_data(202412)  # 전년동월 (2412)
cumulative = get_ytd_data(202501, 202512)
prev_cumulative = get_ytd_data(202401, 202412)

# YOY 계산
def calc_yoy(current, previous):
    return (current / previous * 100) if previous > 0 else 0

def calc_change(current, previous):
    return current - previous

# 전월비(MOM) 계산
net_sales_mom = calc_yoy(current_month['net_sales'], prev_month['net_sales'])
discount_rate_diff = current_month['discount_rate'] - prev_month['discount_rate']

# JSON 구조 생성
discovery_data = {
    "metadata": {
        "brand": "Discovery",
        "last_period": "2512",
        "previous_period": "2511",
        "previous_year_period": "2412",
        "generated_at": datetime.now().isoformat(),
        "store_count": current_store_count
    },
    "current_month": {
        "data": current_month,
        "store_count": current_store_count,
        "yoy": {
            "tag_sales": calc_yoy(current_month['tag_sales'], prev_year_month['tag_sales']),
            "discount": calc_yoy(current_month['discount'], prev_year_month['discount']),
            "net_sales": calc_yoy(current_month['net_sales'], prev_year_month['net_sales']),
            "cogs": calc_yoy(current_month['cogs'], prev_year_month['cogs']),
            "gross_profit": calc_yoy(current_month['gross_profit'], prev_year_month['gross_profit']),
            "direct_cost": calc_yoy(current_month['direct_cost'], prev_year_month['direct_cost']),
            "direct_profit": calc_yoy(current_month['direct_profit'], prev_year_month['direct_profit']),
            "sg_a": calc_yoy(current_month['sg_a'], prev_year_month['sg_a']),
            "operating_profit": calc_yoy(current_month['operating_profit'], prev_year_month['operating_profit']),
        },
        "mom": {
            "tag_sales": calc_yoy(current_month['tag_sales'], prev_month['tag_sales']),
            "discount": calc_yoy(current_month['discount'], prev_month['discount']),
            "net_sales": net_sales_mom,
            "cogs": calc_yoy(current_month['cogs'], prev_month['cogs']),
            "gross_profit": calc_yoy(current_month['gross_profit'], prev_month['gross_profit']),
            "direct_cost": calc_yoy(current_month['direct_cost'], prev_month['direct_cost']),
            "direct_profit": calc_yoy(current_month['direct_profit'], prev_month['direct_profit']),
            "sg_a": calc_yoy(current_month['sg_a'], prev_month['sg_a']),
            "operating_profit": calc_yoy(current_month['operating_profit'], prev_month['operating_profit']),
        },
        "change": {
            "tag_sales": calc_change(current_month['tag_sales'], prev_year_month['tag_sales']),
            "discount": calc_change(current_month['discount'], prev_year_month['discount']),
            "net_sales": calc_change(current_month['net_sales'], prev_year_month['net_sales']),
            "cogs": calc_change(current_month['cogs'], prev_year_month['cogs']),
            "gross_profit": calc_change(current_month['gross_profit'], prev_year_month['gross_profit']),
            "direct_cost": calc_change(current_month['direct_cost'], prev_year_month['direct_cost']),
            "direct_profit": calc_change(current_month['direct_profit'], prev_year_month['direct_profit']),
            "sg_a": calc_change(current_month['sg_a'], prev_year_month['sg_a']),
            "operating_profit": calc_change(current_month['operating_profit'], prev_year_month['operating_profit']),
        }
    },
    "prev_month": {
        "data": prev_month
    },
    "prev_year_month": {
        "data": prev_year_month
    },
    "cumulative": {
        "data": cumulative,
        "prev_cumulative": {
            "data": prev_cumulative
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
        }
    }
}

# JSON 저장
output_file = 'public/dashboard/discovery-pl-data-2512.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(discovery_data, f, ensure_ascii=False, indent=2)

print(f"\n[OK] Discovery PL 데이터 생성 완료: {output_file}")
print(f"\n당월 데이터 (2512):")
print(f"  - Tag매출액: {current_month['tag_sales']:,.0f}K HKD")
print(f"  - 실판매출: {current_month['net_sales']:,.0f}K HKD")
print(f"    └ 전월비(MOM): {net_sales_mom:.1f}%")
print(f"    └ 전년동월비(YOY): {calc_yoy(current_month['net_sales'], prev_year_month['net_sales']):.1f}%")
print(f"  - 할인율: {current_month['discount_rate']:.1f}% (전월대비: {discount_rate_diff:+.1f}%p)")
print(f"  - 매출원가: {current_month['cogs']:,.0f}K HKD")
print(f"  - TAG대비 원가율: {current_month['cogs_rate']:.1f}%")
print(f"  - 매출총이익: {current_month['gross_profit']:,.0f}K HKD ({current_month['gross_profit_rate']:.1f}%)")
print(f"  - 직접이익: {current_month['direct_profit']:,.0f}K HKD ({current_month['direct_profit_rate']:.1f}%)")
print(f"  - 영업이익: {current_month['operating_profit']:,.0f}K HKD ({current_month['operating_profit_rate']:.1f}%)")
print(f"\n전월 데이터 (2511):")
print(f"  - 실판매출: {prev_month['net_sales']:,.0f}K HKD")
print(f"  - 할인율: {prev_month['discount_rate']:.1f}%")
print(f"\n누적 데이터 (2501~2512):")
print(f"  - Tag매출액: {cumulative['tag_sales']:,.0f}K HKD")
print(f"  - 실판매출: {cumulative['net_sales']:,.0f}K HKD (YOY {calc_yoy(cumulative['net_sales'], prev_cumulative['net_sales']):.1f}%)")
print(f"  - 매출원가: {cumulative['cogs']:,.0f}K HKD")
print(f"  - TAG대비 원가율: {cumulative['cogs_rate']:.1f}%")
print(f"  - 매출총이익: {cumulative['gross_profit']:,.0f}K HKD ({cumulative['gross_profit_rate']:.1f}%)")
print(f"  - 직접이익: {cumulative['direct_profit']:,.0f}K HKD ({cumulative['direct_profit_rate']:.1f}%)")
print(f"  - 영업이익: {cumulative['operating_profit']:,.0f}K HKD ({cumulative['operating_profit_rate']:.1f}%)")
print("\n" + "=" * 80)
