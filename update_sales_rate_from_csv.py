import pandas as pd
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. SALES RATE CSV 읽기
sales_rate_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_2512 SALES RATE.csv"
df = pd.read_csv(sales_rate_path, encoding='utf-8-sig')

print("SALES RATE 데이터 로드 완료!")
print(f"  총 {len(df)}개 행")

# 2. 기존 JSON 파일 읽기
json_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\taiwan-dashboard-data-2512.json"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 3. 전체(TOTAL) 데이터 추출
total_row = df[df['LEVEL'] == 'TOTAL'].iloc[0]

# TWD를 1K HKD로 변환 (환율 4.02 적용, 1000으로 나누기)
EXCHANGE_RATE = 4.02

season_sales_rate = {
    'current': {
        'net_ac_pp': round(total_row['INBOUND_2512'] / EXCHANGE_RATE / 1000, 1),
        'ac_sales_gross': round(total_row['SALES_2512'] / EXCHANGE_RATE / 1000, 1),
        'sales_rate': round(total_row['RATE_2512'], 1)
    },
    'previous': {
        'net_ac_pp': round(total_row['INBOUND_2412'] / EXCHANGE_RATE / 1000, 1),
        'ac_sales_gross': round(total_row['SALES_2412'] / EXCHANGE_RATE / 1000, 1),
        'sales_rate': round(total_row['RATE_2412'], 1)
    },
    'yoy': {
        'inbound_yoy': round(total_row['INBOUND_YOY_%'], 0),
        'sales_yoy': round(total_row['SALES_YOY_%'], 0),
        'rate_diff': round(total_row['RATE_DIFF_pp'], 1)
    },
    'category_detail': []
}

# 4. 카테고리별 상세 데이터 (입고금액 기준 TOP 5)
category_rows = df[df['LEVEL'] == 'CATEGORY'].copy()
category_rows = category_rows.sort_values('INBOUND_2512', ascending=False).head(5)

for _, row in category_rows.iterrows():
    category_detail = {
        'category': row['CATEGORY'],
        'inbound_2512': round(row['INBOUND_2512'] / EXCHANGE_RATE / 1000, 1),
        'inbound_2412': round(row['INBOUND_2412'] / EXCHANGE_RATE / 1000, 1),
        'inbound_yoy': round(row['INBOUND_YOY_%'], 0),
        'sales_2512': round(row['SALES_2512'] / EXCHANGE_RATE / 1000, 1),
        'sales_2412': round(row['SALES_2412'] / EXCHANGE_RATE / 1000, 1),
        'sales_yoy': round(row['SALES_YOY_%'], 0),
        'rate_2512': round(row['RATE_2512'], 1),
        'rate_2412': round(row['RATE_2412'], 1),
        'rate_diff': round(row['RATE_DIFF_pp'], 1)
    }
    season_sales_rate['category_detail'].append(category_detail)

# 5. JSON 업데이트
data['season_sales_rate'] = season_sales_rate

# 6. 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nJSON 업데이트 완료!")
print("\n전체 판매율:")
print(f"  2512: {season_sales_rate['current']['sales_rate']}%")
print(f"  2412: {season_sales_rate['previous']['sales_rate']}%")
print(f"  전년비: {season_sales_rate['yoy']['rate_diff']}%p")

print("\nTOP 5 카테고리 (입고금액 기준):")
for i, cat in enumerate(season_sales_rate['category_detail'], 1):
    print(f"  {i}. {cat['category']}: 입고 {cat['inbound_2512']}K (YOY {cat['inbound_yoy']}%), 판매율 {cat['rate_2512']}%")
