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
def extract_account_data(df, period, account_name, exclude_m99=False, only_m99=False):
    """특정 기간의 계정 데이터 추출"""
    filtered = df[(df['PERIOD'] == period) & (df['ACCOUNT_NM'] == account_name)]
    
    # M99 필터링
    if exclude_m99:
        filtered = filtered[~filtered['SHOP_CD'].str.contains('99', na=False)]
    elif only_m99:
        filtered = filtered[filtered['SHOP_CD'].str.contains('99', na=False)]
    
    return filtered['VALUE'].sum()

# 당월(2512)와 전년동월(2412) 데이터 추출
def get_period_data(period):
    """특정 기간의 모든 손익 데이터 추출 - M99와 실제 매장 분리"""
    data = {}
    
    # 매출 관련 (HK만)
    df_period = df_discovery[df_discovery['PERIOD'] == period]
    df_hk = df_period[df_period['CNTRY_CD'] == 'HK']
    
    data['tag_sales'] = df_hk[df_hk['ACCOUNT_NM'] == 'Tag매출액']['VALUE'].sum()
    data['net_sales'] = df_hk[df_hk['ACCOUNT_NM'] == '실매출액']['VALUE'].sum()
    data['discount'] = data['tag_sales'] - data['net_sales']
    data['discount_rate'] = (data['discount'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    
    # 원가 및 이익
    data['cogs'] = df_hk[df_hk['ACCOUNT_NM'] == '매출원가합계']['VALUE'].sum()
    data['cogs_rate'] = (data['cogs'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    data['gross_profit'] = df_hk[df_hk['ACCOUNT_NM'] == '매출총이익']['VALUE'].sum()
    data['gross_profit_rate'] = (data['gross_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # 영업이익
    data['operating_profit'] = df_hk[df_hk['ACCOUNT_NM'] == '영업이익']['VALUE'].sum()
    data['operating_profit_rate'] = (data['operating_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # M99와 실제 매장 분리
    df_hk_m99 = df_hk[df_hk['SHOP_CD'].str.contains('99', na=False)]
    df_hk_real = df_hk[~df_hk['SHOP_CD'].str.contains('99', na=False)]
    
    # 실제 매장 직접비 (M99 제외)
    direct_cost_accounts = [
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    data['direct_cost'] = 0
    for acc in direct_cost_accounts:
        val = df_hk_real[df_hk_real['ACCOUNT_NM'] == acc]['VALUE'].sum()
        data['direct_cost'] += val
    
    # M99 영업비
    data['sg_a'] = df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '판매관리비']['VALUE'].sum()
    
    # 비용 상세 (M99만, 영업비용 항목)
    data['expense_detail'] = {
        'salary': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '1. 급 여']['VALUE'].sum(),
        'travel': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '2. TRAVEL & MEAL']['VALUE'].sum(),
        'uniform': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '3. 피복비(유니폼)']['VALUE'].sum(),
        'rent': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '4. 임차료']['VALUE'].sum(),
        'maintenance': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '5. 유지보수비']['VALUE'].sum(),
        'utilities': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '6. 수도광열비']['VALUE'].sum(),
        'supplies': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '7. 소모품비']['VALUE'].sum(),
        'communication': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '8. 통신비']['VALUE'].sum(),
        'marketing': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '9. 광고선전비']['VALUE'].sum(),
        'fee': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '10. 지급수수료']['VALUE'].sum(),
        'logistics': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '11. 운반비']['VALUE'].sum(),
        'other_fee': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '12. 기타 수수료(매장관리비 외)']['VALUE'].sum(),
        'insurance': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '13. 보험료']['VALUE'].sum(),
        'depreciation': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '14. 감가상각비']['VALUE'].sum(),
        'duty_free': df_hk_m99[df_hk_m99['ACCOUNT_NM'] == '15. 면세점 직접비']['VALUE'].sum(),
    }
    
    # 직접이익 = 매출총이익 - 직접비 (M99 제외)
    data['direct_profit'] = data['gross_profit'] - data['direct_cost']
    data['direct_profit_rate'] = (data['direct_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    return data

# 누적 데이터 추출 (2501~2512, 2401~2412)
def get_ytd_data(start_period, end_period):
    """누적 기간의 모든 손익 데이터 추출 - M99와 실제 매장 분리"""
    df_ytd = df_discovery[(df_discovery['PERIOD'] >= start_period) & (df_discovery['PERIOD'] <= end_period)]
    df_ytd_hk = df_ytd[df_ytd['CNTRY_CD'] == 'HK']
    
    data = {}
    
    # 매출 관련
    data['tag_sales'] = df_ytd_hk[df_ytd_hk['ACCOUNT_NM'] == 'Tag매출액']['VALUE'].sum()
    data['net_sales'] = df_ytd_hk[df_ytd_hk['ACCOUNT_NM'] == '실매출액']['VALUE'].sum()
    data['discount'] = data['tag_sales'] - data['net_sales']
    data['discount_rate'] = (data['discount'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    
    data['cogs'] = df_ytd_hk[df_ytd_hk['ACCOUNT_NM'] == '매출원가합계']['VALUE'].sum()
    data['cogs_rate'] = (data['cogs'] / data['tag_sales'] * 100) if data['tag_sales'] > 0 else 0
    data['gross_profit'] = df_ytd_hk[df_ytd_hk['ACCOUNT_NM'] == '매출총이익']['VALUE'].sum()
    data['gross_profit_rate'] = (data['gross_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    data['operating_profit'] = df_ytd_hk[df_ytd_hk['ACCOUNT_NM'] == '영업이익']['VALUE'].sum()
    data['operating_profit_rate'] = (data['operating_profit'] / data['net_sales'] * 100) if data['net_sales'] > 0 else 0
    
    # M99와 실제 매장 분리
    df_ytd_hk_m99 = df_ytd_hk[df_ytd_hk['SHOP_CD'].str.contains('99', na=False)]
    df_ytd_hk_real = df_ytd_hk[~df_ytd_hk['SHOP_CD'].str.contains('99', na=False)]
    
    # 실제 매장 직접비
    direct_cost_accounts = [
        '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
        '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
        '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
        '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
    ]
    
    data['direct_cost'] = 0
    for acc in direct_cost_accounts:
        val = df_ytd_hk_real[df_ytd_hk_real['ACCOUNT_NM'] == acc]['VALUE'].sum()
        data['direct_cost'] += val
    
    # M99 영업비
    data['sg_a'] = df_ytd_hk_m99[df_ytd_hk_m99['ACCOUNT_NM'] == '판매관리비']['VALUE'].sum()
    
    # 비용 상세 (M99만)
    data['expense_detail'] = {}
    for acc in direct_cost_accounts:
        key = acc.split('. ')[1] if '. ' in acc else acc
        key_map = {
            '급 여': 'salary',
            'TRAVEL & MEAL': 'travel',
            '피복비(유니폼)': 'uniform',
            '임차료': 'rent',
            '유지보수비': 'maintenance',
            '수도광열비': 'utilities',
            '소모품비': 'supplies',
            '통신비': 'communication',
            '광고선전비': 'marketing',
            '지급수수료': 'fee',
            '운반비': 'logistics',
            '기타 수수료(매장관리비 외)': 'other_fee',
            '보험료': 'insurance',
            '감가상각비': 'depreciation',
            '면세점 직접비': 'duty_free'
        }
        eng_key = key_map.get(key, key)
        data['expense_detail'][eng_key] = df_ytd_hk_m99[df_ytd_hk_m99['ACCOUNT_NM'] == acc]['VALUE'].sum()
    
    # 필요한 계정 추가 (만약 없으면 0으로)
    for key in ['salary', 'travel', 'uniform', 'rent', 'maintenance', 'utilities', 'supplies', 
                'communication', 'marketing', 'fee', 'logistics', 'other_fee', 'insurance', 'depreciation', 'duty_free']:
        if key not in data['expense_detail']:
            data['expense_detail'][key] = 0
    
    # 직접이익 = 매출총이익 - 직접비 (M99 제외)
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
