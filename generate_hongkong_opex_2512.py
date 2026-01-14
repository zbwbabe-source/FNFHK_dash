import pandas as pd
import json
from decimal import Decimal

# CSV 파일 읽기
csv_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(csv_file, encoding='utf-8-sig')

# VALUE를 숫자로 변환
df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# HK 국가, M99 제외
df_hk = df[(df['CNTRY_CD'] == 'HK') & (df['SHOP_CD'] != 'M99')].copy()

print('=== 영업비 재계산 시작 ===\n')

# 계정 매핑
ACCOUNT_MAPPING = {
    'salary': ['1. 급 여', ' - Payroll', ' - EMPLOYEE BENEFIT PROGRAMS', ' - Final Payment'],
    'marketing': ['9. 광고선전비'],
    'fee': ['10. 지급수수료', '12. 기타 수수료(매장관리비 외)'],
    'rent': ['4. 임차료', ' - Base Rent', ' - Rent free / Rent concession', ' - Turnover Rates'],
    'insurance': ['13. 보험료'],
    'travel': ['2. TRAVEL & MEAL'],
}

# 기타에 포함될 계정들
OTHER_ACCOUNTS = [
    '3. 피복비(유니폼)',
    '5. 유지보수비',
    '6. 수도광열비',
    '7. 소모품비',
    '8. 통신비',
    '11. 운반비',
    '14. 감가상각비',
    '15. 면세점 직접비',
    ' - Government Rate & License Fee',
    ' - KOL / other',
    ' - Mall Coupon'
]

def calculate_expense(df_filtered, account_list):
    """특정 계정 리스트의 합계 계산"""
    total = 0
    for account in account_list:
        value = df_filtered[df_filtered['ACCOUNT_NM'] == account]['VALUE'].sum()
        total += value
    return total

def calculate_expenses_for_period(df_data, period_start, period_end):
    """특정 기간의 영업비 계산"""
    df_period = df_data[(df_data['PERIOD'] >= period_start) & (df_data['PERIOD'] <= period_end)]
    
    expenses = {}
    
    # 각 항목 계산
    for key, accounts in ACCOUNT_MAPPING.items():
        expenses[key] = calculate_expense(df_period, accounts)
    
    # 기타 계산
    expenses['other'] = calculate_expense(df_period, OTHER_ACCOUNTS)
    
    # 기타 상세
    expenses['other_detail'] = {}
    for account in OTHER_ACCOUNTS:
        value = df_period[df_period['ACCOUNT_NM'] == account]['VALUE'].sum()
        if value != 0:
            # 계정명을 키로 사용 (간단하게)
            key_name = account.strip().replace('.', '').replace(' ', '_').replace('-', '').lower()
            expenses['other_detail'][key_name] = round(value, 2)
    
    # 전체 영업비
    expenses['total'] = sum([expenses[k] for k in ['salary', 'marketing', 'fee', 'rent', 'insurance', 'travel', 'other']])
    
    return expenses

# 당월 계산 (202512)
print('당월 202512 계산 중...')
current_month = calculate_expenses_for_period(df_hk, 202512, 202512)

# 전년 당월 (202412)
print('전년 당월 202412 계산 중...')
prev_month = calculate_expenses_for_period(df_hk, 202412, 202412)

# 누적 계산 (202501-202512)
print('누적 202501-202512 계산 중...')
cumulative = calculate_expenses_for_period(df_hk, 202501, 202512)

# 전년 누적 (202401-202412)
print('전년 누적 202401-202412 계산 중...')
prev_cumulative = calculate_expenses_for_period(df_hk, 202401, 202412)

# 결과 출력
print('\n=== 당월 (202512) ===')
print(f'급여: {current_month["salary"]:,.0f}K')
print(f'마케팅비: {current_month["marketing"]:,.0f}K')
print(f'지급수수료: {current_month["fee"]:,.0f}K')
print(f'임차료: {current_month["rent"]:,.0f}K')
print(f'보험료: {current_month["insurance"]:,.0f}K')
print(f'여비교통비: {current_month["travel"]:,.0f}K')
print(f'기타: {current_month["other"]:,.0f}K')
print(f'전체: {current_month["total"]:,.0f}K')

print('\n=== 전년 당월 (202412) ===')
print(f'급여: {prev_month["salary"]:,.0f}K')
print(f'마케팅비: {prev_month["marketing"]:,.0f}K')
print(f'지급수수료: {prev_month["fee"]:,.0f}K')
print(f'임차료: {prev_month["rent"]:,.0f}K')
print(f'보험료: {prev_month["insurance"]:,.0f}K')
print(f'여비교통비: {prev_month["travel"]:,.0f}K')
print(f'기타: {prev_month["other"]:,.0f}K')
print(f'전체: {prev_month["total"]:,.0f}K')

print('\n=== 누적 (202501-202512) ===')
print(f'급여: {cumulative["salary"]:,.0f}K')
print(f'마케팅비: {cumulative["marketing"]:,.0f}K')
print(f'지급수수료: {cumulative["fee"]:,.0f}K')
print(f'임차료: {cumulative["rent"]:,.0f}K')
print(f'보험료: {cumulative["insurance"]:,.0f}K')
print(f'여비교통비: {cumulative["travel"]:,.0f}K')
print(f'기타: {cumulative["other"]:,.0f}K')
print(f'전체: {cumulative["total"]:,.0f}K')

print('\n=== 전년 누적 (202401-202412) ===')
print(f'급여: {prev_cumulative["salary"]:,.0f}K')
print(f'마케팅비: {prev_cumulative["marketing"]:,.0f}K')
print(f'지급수수료: {prev_cumulative["fee"]:,.0f}K')
print(f'임차료: {prev_cumulative["rent"]:,.0f}K')
print(f'보험료: {prev_cumulative["insurance"]:,.0f}K')
print(f'여비교통비: {prev_cumulative["travel"]:,.0f}K')
print(f'기타: {prev_cumulative["other"]:,.0f}K')
print(f'전체: {prev_cumulative["total"]:,.0f}K')

print('\n=== 기타 상세 (누적) ===')
for key, value in cumulative['other_detail'].items():
    print(f'{key}: {value:,.0f}K')

# JSON으로 저장할 데이터 구조 생성
output_data = {
    'current_month': {
        'period': 202512,
        'expense_detail': {
            'salary': round(current_month['salary'], 2),
            'marketing': round(current_month['marketing'], 2),
            'fee': round(current_month['fee'], 2),
            'rent': round(current_month['rent'], 2),
            'insurance': round(current_month['insurance'], 2),
            'travel': round(current_month['travel'], 2),
            'other': round(current_month['other'], 2),
            'other_detail': current_month['other_detail']
        },
        'sg_a': round(current_month['total'], 2)
    },
    'prev_month': {
        'period': 202412,
        'expense_detail': {
            'salary': round(prev_month['salary'], 2),
            'marketing': round(prev_month['marketing'], 2),
            'fee': round(prev_month['fee'], 2),
            'rent': round(prev_month['rent'], 2),
            'insurance': round(prev_month['insurance'], 2),
            'travel': round(prev_month['travel'], 2),
            'other': round(prev_month['other'], 2),
            'other_detail': prev_month['other_detail']
        },
        'sg_a': round(prev_month['total'], 2)
    },
    'cumulative': {
        'period_start': 202501,
        'period_end': 202512,
        'expense_detail': {
            'salary': round(cumulative['salary'], 2),
            'marketing': round(cumulative['marketing'], 2),
            'fee': round(cumulative['fee'], 2),
            'rent': round(cumulative['rent'], 2),
            'insurance': round(cumulative['insurance'], 2),
            'travel': round(cumulative['travel'], 2),
            'other': round(cumulative['other'], 2),
            'other_detail': cumulative['other_detail']
        },
        'sg_a': round(cumulative['total'], 2)
    },
    'prev_cumulative': {
        'period_start': 202401,
        'period_end': 202412,
        'expense_detail': {
            'salary': round(prev_cumulative['salary'], 2),
            'marketing': round(prev_cumulative['marketing'], 2),
            'fee': round(prev_cumulative['fee'], 2),
            'rent': round(prev_cumulative['rent'], 2),
            'insurance': round(prev_cumulative['insurance'], 2),
            'travel': round(prev_cumulative['travel'], 2),
            'other': round(prev_cumulative['other'], 2),
            'other_detail': prev_cumulative['other_detail']
        },
        'sg_a': round(prev_cumulative['total'], 2)
    }
}

# JSON 파일로 저장
output_file = 'public/dashboard/hongkong-opex-2512.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f'\n저장 완료: {output_file}')
