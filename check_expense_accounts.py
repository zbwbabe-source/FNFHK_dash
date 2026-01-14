import pandas as pd

# CSV 파일 읽기
csv_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL MLB 2512.csv"
df = pd.read_csv(csv_file, encoding='utf-8-sig')

print('=== 컬럼명 확인 ===')
print(df.columns.tolist())

# HK 국가, M99 제외
df_hk = df[(df['CNTRY_CD'] == 'HK') & (df['SHOP_CD'] != 'M99')].copy()

print(f'\n=== HK 필터링 후 행 수: {len(df_hk)} ===')

# 모든 ACCOUNT_NM 확인
print('\n=== 모든 계정 (처음 30개) ===')
accounts = sorted(df_hk['ACCOUNT_NM'].unique())
for i, acc in enumerate(accounts[:30]):
    print(f'  {i+1}. {acc}')

print(f'\n총 {len(accounts)}개 계정')

print('\n=== 영업비 관련 계정 필터링 ===')
expense_keywords = ['급', '임차', '광고', '수수료', '보험', 'TRAVEL', 'Meal', 'meal', 
                    '피복', '유지', '수도', '소모', '통신', '운반', '감가', '면세', 'EMPLOYEE']

for acc in accounts:
    if any(keyword in str(acc) for keyword in expense_keywords):
        print(f'  {acc}')
