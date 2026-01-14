import pandas as pd

csv_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(csv_file, encoding='utf-8-sig')

df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# M99, HK, 202512
df_m99_202512 = df[(df['CNTRY_CD'] == 'HK') & (df['SHOP_CD'] == 'M99') & (df['PERIOD'] == 202512)]

print('=== M99 202512 모든 계정 ===')
account_summary = df_m99_202512.groupby('ACCOUNT_NM')['VALUE'].sum().sort_values(ascending=False)
total = 0
for account, value in account_summary.items():
    if value != 0:
        print(f'{account}: {value:,.0f}K')
        total += abs(value)

print(f'\n총합 (절대값): {total:,.0f}K')

# 영업비 계정만 필터
print('\n=== 영업비 계정으로 추정되는 것들 ===')
opex_keywords = ['급', '광고', '수수료', '임차', '보험', 'TRAVEL', '피복', '유지', '수도', '소모', '통신', '운반', '감가', '면세', 'KOL', 'Government', 'Mall']
opex_total = 0
for account, value in account_summary.items():
    if any(kw in str(account) for kw in opex_keywords):
        print(f'{account}: {value:,.0f}K')
        opex_total += value

print(f'\n영업비 추정 합계: {opex_total:,.0f}K')
