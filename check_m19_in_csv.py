import pandas as pd

# PL 파일에서 M19 확인
pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(pl_file, encoding='utf-8-sig')

print('=== PL 파일에서 매장 확인 ===')
shops = df[['SHOP_CD', 'SHOP_NM']].drop_duplicates().sort_values('SHOP_CD')
print(f'Total unique shops: {len(shops)}')

# M14, M19 찾기
m14 = shops[shops['SHOP_CD'] == 'M14']
m19 = shops[shops['SHOP_CD'] == 'M19']

print(f'\n=== M14 매장 ===')
if not m14.empty:
    print(m14.to_string(index=False))
else:
    print('M14 not found')

print(f'\n=== M19 매장 ===')
if not m19.empty:
    print(m19.to_string(index=False))
else:
    print('M19 not found')

# NTP 관련 매장 모두 찾기
ntp_shops = shops[shops['SHOP_NM'].str.contains('NTP', case=False, na=False)]
print(f'\n=== NTP 관련 모든 매장 ===')
print(ntp_shops.to_string(index=False))

# 모든 M 매장 출력
m_shops = shops[shops['SHOP_CD'].str.startswith('M', na=False)]
print(f'\n=== 모든 M 매장 (총 {len(m_shops)}개) ===')
print(m_shops.to_string(index=False))
