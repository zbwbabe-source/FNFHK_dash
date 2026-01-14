import pandas as pd

# PL 파일 읽기
pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(pl_file, encoding='utf-8-sig')

# VALUE를 숫자로 변환
df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# M19 매장만 필터링
m19_df = df[df['SHOP_CD'] == 'M19'].copy()

print('=== M19 (NTP 3) 기간별 데이터 ===')

# 기간별 매출 확인
periods = sorted(m19_df['PERIOD'].unique())
print(f'\nM19가 있는 기간: {periods}')

# 각 기간별 실매출액
print('\n기간별 실매출액:')
for period in periods:
    period_data = m19_df[m19_df['PERIOD'] == period]
    net_sales = period_data[period_data['ACCOUNT_NM'] == '실매출액']['VALUE'].sum()
    print(f'  {period}: {net_sales:,.0f}K')

# 2512 (12월) 데이터 확인
m19_2512 = m19_df[m19_df['PERIOD'] == 202512]
print(f'\n=== 2512 (12월) M19 데이터 ===')
print(f'Total rows: {len(m19_2512)}')

if len(m19_2512) > 0:
    net_sales_2512 = m19_2512[m19_2512['ACCOUNT_NM'] == '실매출액']['VALUE'].sum()
    gross_profit_2512 = m19_2512[m19_2512['ACCOUNT_NM'] == '매출총이익']['VALUE'].sum()
    print(f'12월 실매출액: {net_sales_2512:,.0f}K')
    print(f'12월 매출총이익: {gross_profit_2512:,.0f}K')
    
    # 직접비 계정들
    direct_cost_accounts = [
        '1. 급 여', '4. 임차료', '10. 지급수수료', '11. 운반비'
    ]
    
    direct_cost_2512 = 0
    for acc in direct_cost_accounts:
        val = m19_2512[m19_2512['ACCOUNT_NM'] == acc]['VALUE'].sum()
        if val != 0:
            print(f'  {acc}: {val:,.0f}K')
        direct_cost_2512 += val
    
    direct_profit_2512 = gross_profit_2512 - direct_cost_2512
    print(f'12월 직접이익: {direct_profit_2512:,.0f}K')
else:
    print('2512년 12월 데이터 없음 - 폐점된 것으로 추정')

# 마지막 영업 기간 확인
last_period = max(periods)
print(f'\n마지막 영업 기간: {last_period}')
