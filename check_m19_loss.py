import pandas as pd

# PL 파일 읽기
pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(pl_file, encoding='utf-8-sig')

# VALUE를 숫자로 변환
df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# M19 매장만 필터링
m19_df = df[df['SHOP_CD'] == 'M19'].copy()

print('=== M19 (NTP 3) 매장 데이터 ===')
print(f'Total rows: {len(m19_df)}')

# 25년 누적 (2501-2512)
m19_2025 = m19_df[(m19_df['PERIOD'] >= 202501) & (m19_df['PERIOD'] <= 202512)]
print(f'\n25년 누적 데이터 (2501-2512): {len(m19_2025)} rows')

# 직접이익 계산
net_sales = m19_2025[m19_2025['ACCOUNT_NM'] == '실매출액']['VALUE'].sum()
gross_profit = m19_2025[m19_2025['ACCOUNT_NM'] == '매출총이익']['VALUE'].sum()

# 직접비 계정들
direct_cost_accounts = [
    '1. 급 여', '2. TRAVEL & MEAL', '3. 피복비(유니폼)', '4. 임차료',
    '5. 유지보수비', '6. 수도광열비', '7. 소모품비', '8. 통신비',
    '9. 광고선전비', '10. 지급수수료', '11. 운반비', '12. 기타 수수료(매장관리비 외)',
    '13. 보험료', '14. 감가상각비', '15. 면세점 직접비'
]

direct_cost = 0
for acc in direct_cost_accounts:
    val = m19_2025[m19_2025['ACCOUNT_NM'] == acc]['VALUE'].sum()
    if val != 0:
        print(f'  {acc}: {val:,.0f}K')
    direct_cost += val

direct_profit = gross_profit - direct_cost

print(f'\n=== M19 (NTP 3) 25년 누적 손익 ===')
print(f'실매출액: {net_sales:,.0f}K')
print(f'매출총이익: {gross_profit:,.0f}K')
print(f'직접비 합계: {direct_cost:,.0f}K')
print(f'직접이익: {direct_profit:,.0f}K')
print(f'직접손실: {abs(direct_profit):,.0f}K')
