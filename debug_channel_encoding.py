import pandas as pd

df = pd.read_csv(r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv', encoding='utf-8-sig')
df_mlb = df[df['BRD_CD'] == 'M']
df_2512_hk = df_mlb[(df_mlb['PERIOD'] == 202512) & (df_mlb['CNTRY_CD'] == 'HK') & (df_mlb['ACCOUNT_NM'] == '실매출액')]

print("HK CHNL_CD 고유값:")
for chnl in df_2512_hk['CHNL_CD'].unique():
    val = df_2512_hk[df_2512_hk['CHNL_CD'] == chnl]['VALUE'].sum()
    print(f"  '{chnl}' (repr: {repr(chnl)}): {val:,.0f}K")
