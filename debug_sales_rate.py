import pandas as pd
import json

# CSV 파일 다시 확인
df = pd.read_csv('../Dashboard_Raw_Data/TW/2512/processed/2512_당시즌판매율.csv', encoding='utf-8-sig')

print("CSV 파일 구조 분석:")
print("=" * 80)
print(f"전체 행 수: {len(df)}")
print(f"\n컬럼: {list(df.columns)}")
print("\n첫 10행:")
print(df.head(10))

# JSON 확인
with open('./public/dashboard/taiwan-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("\n\nJSON의 season_sales_rate:")
print("=" * 80)
if 'season_sales_rate' in data:
    rate_data = data['season_sales_rate']
    print(f"Current: {rate_data.get('current', {})}")
    print(f"\nCategory detail 수: {len(rate_data.get('current', {}).get('category_detail', []))}")
    if rate_data.get('current', {}).get('category_detail'):
        print("\n첫 5개 카테고리:")
        for cat in rate_data['current']['category_detail'][:5]:
            print(f"  {cat}")
else:
    print("season_sales_rate 없음!")
