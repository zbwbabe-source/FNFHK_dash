import pandas as pd

df = pd.read_csv(r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv', encoding='utf-8-sig')
df_mlb = df[df['BRD_CD'] == 'M']

print("2512 HK 정규점 실판매출:")
result = df_mlb[(df_mlb['PERIOD'] == 202512) & 
                (df_mlb['ACCOUNT_NM'] == '실매출액') & 
                (df_mlb['CHNL_CD'] == '정규점') &
                (df_mlb['CNTRY_CD'] == 'HK')]
print(f"  행 수: {len(result)}")
print(f"  합계: {result['VALUE'].sum():,.0f}K")

print("\n2512 HK 아웃렛 실판매출:")
result = df_mlb[(df_mlb['PERIOD'] == 202512) & 
                (df_mlb['ACCOUNT_NM'] == '실매출액') & 
                (df_mlb['CHNL_CD'] == '아웃렛') &
                (df_mlb['CNTRY_CD'] == 'HK')]
print(f"  행 수: {len(result)}")
print(f"  합계: {result['VALUE'].sum():,.0f}K")
