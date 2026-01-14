import pandas as pd
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. TAG Summary CSV 읽기
tag_summary_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary.csv"
df = pd.read_csv(tag_summary_path, encoding='utf-8-sig')

print("TAG Summary 데이터 로드 완료!")
print(f"  총 {len(df)}개 행")

# 2. 기존 JSON 파일 읽기
json_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\taiwan-dashboard-data-2512.json"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 3. TWD를 1K HKD로 변환
EXCHANGE_RATE = 4.02

# 4. 기말재고 (TAG) - Stock Price 기준
ending_inventory_tag = {}
for _, row in df.iterrows():
    tag = row['TAG']
    
    if tag == 'TOTAL':
        continue
    
    # TAG별로 저장
    ending_inventory_tag[tag] = {
        'current': {
            'stock_price': round(row['STOCK (TAG)_2512'] / EXCHANGE_RATE / 1000, 1)
        },
        'previous': {
            'stock_price': round(row['STOCK (TAG)_2412'] / EXCHANGE_RATE / 1000, 1)
        },
        'yoy': round(row['STOCK (TAG)_YOY_%'], 0)
    }

# 5. 아이템별 판매 (TAG) - Gross Sales 기준
item_sales_tag = {}
for _, row in df.iterrows():
    tag = row['TAG']
    
    if tag == 'TOTAL':
        continue
    
    # TAG별로 저장
    item_sales_tag[tag] = {
        'current': {
            'gross_sales': round(row['SALES (TAG)_2512'] / EXCHANGE_RATE / 1000, 1)
        },
        'previous': {
            'gross_sales': round(row['SALES (TAG)_2412'] / EXCHANGE_RATE / 1000, 1)
        },
        'yoy': round(row['SALES (TAG)_YOY_%'], 0)
    }

# 6. JSON 업데이트
if 'ending_inventory' not in data:
    data['ending_inventory'] = {}

data['ending_inventory']['by_tag'] = ending_inventory_tag
data['monthly_item_by_tag'] = item_sales_tag

# 7. 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nJSON 업데이트 완료!")

print("\n기말재고 (TAG) - Stock Price:")
for tag, value in ending_inventory_tag.items():
    print(f"  {tag}: {value['current']['stock_price']}K (YOY {value['yoy']}%)")

print("\n아이템별 판매 (TAG) - Gross Sales:")
for tag, value in item_sales_tag.items():
    print(f"  {tag}: {value['current']['gross_sales']}K (YOY {value['yoy']}%)")
