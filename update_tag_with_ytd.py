import pandas as pd
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. TAG Summary CSV 읽기
tag_summary_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary (3).csv"
df = pd.read_csv(tag_summary_path, encoding='utf-8-sig')

print("TAG Summary 데이터 로드 완료!")
print(f"  총 {len(df)}개 행")

# 2. 기존 JSON 파일 읽기
json_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\taiwan-dashboard-data-2512.json"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 3. TWD를 1K HKD로 변환
EXCHANGE_RATE = 4.02

# 4. 아이템별 판매 (TAG) - 당월 + 누적
item_sales_tag_with_ytd = {}
for _, row in df.iterrows():
    tag = row['TAG']
    
    if tag == 'TOTAL':
        continue
    
    # TAG별로 저장 (당월 + 누적)
    item_sales_tag_with_ytd[tag] = {
        'monthly': {
            'current': {
                'gross_sales': round(row['SALES (TAG)_2512'] / EXCHANGE_RATE / 1000, 1)
            },
            'previous': {
                'gross_sales': round(row['SALES (TAG)_2412'] / EXCHANGE_RATE / 1000, 1)
            },
            'yoy': round(row['SALES (TAG)_YOY_%'], 0)
        },
        'ytd': {
            'current': {
                'gross_sales': round(row['SALES_YTD_2512'] / EXCHANGE_RATE / 1000, 1)
            },
            'previous': {
                'gross_sales': round(row['SALES_YTD_2412'] / EXCHANGE_RATE / 1000, 1)
            },
            'yoy': round(row['SALES_YTD_YOY_%'], 0)
        }
    }

# 5. JSON 업데이트
data['monthly_item_by_tag_with_ytd'] = item_sales_tag_with_ytd

# 6. 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nJSON 업데이트 완료!")

print("\n아이템별 판매 (TAG) - 당월 vs 누적:")
tags = ['25F', '25S', '과시즌F', '과시즌S', '신발', '모자', '가방', '기타ACC']
for tag in tags:
    if tag in item_sales_tag_with_ytd:
        monthly = item_sales_tag_with_ytd[tag]['monthly']['current']['gross_sales']
        ytd = item_sales_tag_with_ytd[tag]['ytd']['current']['gross_sales']
        print(f"  {tag}: 당월 {monthly}K / 누적 {ytd}K")
