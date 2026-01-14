import pandas as pd
import json
import sys
import io

# Windows 콘솔 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# CSV 파일 읽기
csv_path = 'D:/Cursor_work_space/HKMCTW_Dashboard/Dashboard_Raw_Data/HKMC/2512/HKMC_Inventory_TAG_Summary (1).csv'
df = pd.read_csv(csv_path, encoding='utf-8-sig')

print("[CSV] 데이터 로드 완료")
print(f"총 {len(df)}개 TAG 발견")

# 기존 dashboard 데이터 읽기
dashboard_path = 'public/dashboard/hongkong-dashboard-data-2512.json'
cumulative_path = 'public/dashboard/hongkong-dashboard-cumulative-2512.json'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

with open(cumulative_path, 'r', encoding='utf-8') as f:
    cumulative_data = json.load(f)

print("[JSON] 기존 파일 로드 완료")

# TAG별 데이터 구조 생성
def create_tag_data(row):
    return {
        "current": {
            "stock_price": row['STOCK (TAG)_2512']
        },
        "previous": {
            "stock_price": row['STOCK (TAG)_2412']
        },
        "yoy": row['STOCK (TAG)_YOY_%']
    }

def create_sales_data_monthly(row):
    return {
        "current": {
            "gross_sales": row['SALES (TAG)_2512'] / 1000  # K HKD 단위
        },
        "previous": {
            "gross_sales": row['SALES (TAG)_2412'] / 1000
        },
        "yoy": row['SALES (TAG)_YOY_%']
    }

def create_sales_data_cumulative(row):
    return {
        "current": {
            "gross_sales": row['SALES_YTD_2512'] / 1000  # K HKD 단위
        },
        "previous": {
            "gross_sales": row['SALES_YTD_2412'] / 1000
        },
        "yoy": row['SALES_YTD_YOY_%']
    }

# 재고(TAG) 데이터 생성
tag_inventory = {}
for _, row in df.iterrows():
    tag = row['TAG']
    tag_inventory[tag] = create_tag_data(row)

print("[OK] 재고 TAG 데이터 생성 완료")
print(f"  - 26S: {tag_inventory.get('26S', {}).get('current', {}).get('stock_price', 0)/1000:.1f}K HKD")
print(f"  - 25F: {tag_inventory.get('25F', {}).get('current', {}).get('stock_price', 0)/1000:.1f}K HKD")
print(f"  - 25S: {tag_inventory.get('25S', {}).get('current', {}).get('stock_price', 0)/1000:.1f}K HKD")

# 과시즌F 3년차와 4년차 합치기
if '과시즌F_3년차(22F)' in df['TAG'].values and '과시즌F_4년차(21F)' in df['TAG'].values:
    fw_3year = df[df['TAG'] == '과시즌F_3년차(22F)'].iloc[0]
    fw_4year = df[df['TAG'] == '과시즌F_4년차(21F)'].iloc[0]
    
    current_sum = fw_3year['STOCK (TAG)_2512'] + fw_4year['STOCK (TAG)_2512']
    previous_sum = fw_3year['STOCK (TAG)_2412'] + fw_4year['STOCK (TAG)_2412']
    
    tag_inventory['과시즌F_3년차_이상'] = {
        "current": {
            "stock_price": current_sum
        },
        "previous": {
            "stock_price": previous_sum
        },
        "yoy": (current_sum / previous_sum * 100) if previous_sum > 0 else 0
    }
    print(f"[OK] 과시즌F 3년차 이상 통합: {current_sum/1000:.1f}K HKD")

# 과시즌S 3년차와 4년차 합치기
if '과시즌S_3년차(22S)' in df['TAG'].values and '과시즌S_4년차(21S)' in df['TAG'].values:
    ss_3year = df[df['TAG'] == '과시즌S_3년차(22S)'].iloc[0]
    ss_4year = df[df['TAG'] == '과시즌S_4년차(21S)'].iloc[0]
    
    current_sum = ss_3year['STOCK (TAG)_2512'] + ss_4year['STOCK (TAG)_2512']
    previous_sum = ss_3year['STOCK (TAG)_2412'] + ss_4year['STOCK (TAG)_2412']
    
    tag_inventory['과시즌S_3년차_이상'] = {
        "current": {
            "stock_price": current_sum
        },
        "previous": {
            "stock_price": previous_sum
        },
        "yoy": (current_sum / previous_sum * 100) if previous_sum > 0 else 0
    }
    print(f"[OK] 과시즌S 3년차 이상 통합: {current_sum/1000:.1f}K HKD")

# 판매(TAG) 데이터 생성 - 당월
tag_sales_monthly = {}
for _, row in df.iterrows():
    tag = row['TAG']
    tag_sales_monthly[tag] = create_sales_data_monthly(row)

print("[OK] 당월 판매 TAG 데이터 생성 완료")

# 과시즌F 3년차와 4년차 합치기 (판매-당월)
if '과시즌F_3년차(22F)' in df['TAG'].values and '과시즌F_4년차(21F)' in df['TAG'].values:
    fw_3year = df[df['TAG'] == '과시즌F_3년차(22F)'].iloc[0]
    fw_4year = df[df['TAG'] == '과시즌F_4년차(21F)'].iloc[0]
    
    current_sum = fw_3year['SALES (TAG)_2512'] + fw_4year['SALES (TAG)_2512']
    previous_sum = fw_3year['SALES (TAG)_2412'] + fw_4year['SALES (TAG)_2412']
    
    tag_sales_monthly['과시즌F_3년차_이상'] = {
        "current": {
            "gross_sales": current_sum / 1000
        },
        "previous": {
            "gross_sales": previous_sum / 1000
        },
        "yoy": (current_sum / previous_sum * 100) if previous_sum > 0 else 0
    }

# 과시즌S 3년차와 4년차 합치기 (판매-당월)
if '과시즌S_3년차(22S)' in df['TAG'].values and '과시즌S_4년차(21S)' in df['TAG'].values:
    ss_3year = df[df['TAG'] == '과시즌S_3년차(22S)'].iloc[0]
    ss_4year = df[df['TAG'] == '과시즌S_4년차(21S)'].iloc[0]
    
    current_sum = ss_3year['SALES (TAG)_2512'] + ss_4year['SALES (TAG)_2512']
    previous_sum = ss_3year['SALES (TAG)_2412'] + ss_4year['SALES (TAG)_2412']
    
    tag_sales_monthly['과시즌S_3년차_이상'] = {
        "current": {
            "gross_sales": current_sum / 1000
        },
        "previous": {
            "gross_sales": previous_sum / 1000
        },
        "yoy": (current_sum / previous_sum * 100) if previous_sum > 0 else 0
    }

# 판매(TAG) 데이터 생성 - 누적
tag_sales_cumulative = {}
for _, row in df.iterrows():
    tag = row['TAG']
    tag_sales_cumulative[tag] = create_sales_data_cumulative(row)

print("[OK] 누적 판매 TAG 데이터 생성 완료")

# 과시즌F 3년차와 4년차 합치기 (판매-누적)
if '과시즌F_3년차(22F)' in df['TAG'].values and '과시즌F_4년차(21F)' in df['TAG'].values:
    fw_3year = df[df['TAG'] == '과시즌F_3년차(22F)'].iloc[0]
    fw_4year = df[df['TAG'] == '과시즌F_4년차(21F)'].iloc[0]
    
    current_sum = fw_3year['SALES_YTD_2512'] + fw_4year['SALES_YTD_2512']
    previous_sum = fw_3year['SALES_YTD_2412'] + fw_4year['SALES_YTD_2412']
    
    tag_sales_cumulative['과시즌F_3년차_이상'] = {
        "current": {
            "gross_sales": current_sum / 1000
        },
        "previous": {
            "gross_sales": previous_sum / 1000
        },
        "yoy": (current_sum / previous_sum * 100) if previous_sum > 0 else 0
    }

# 과시즌S 3년차와 4년차 합치기 (판매-누적)
if '과시즌S_3년차(22S)' in df['TAG'].values and '과시즌S_4년차(21S)' in df['TAG'].values:
    ss_3year = df[df['TAG'] == '과시즌S_3년차(22S)'].iloc[0]
    ss_4year = df[df['TAG'] == '과시즌S_4년차(21S)'].iloc[0]
    
    current_sum = ss_3year['SALES_YTD_2512'] + ss_4year['SALES_YTD_2512']
    previous_sum = ss_3year['SALES_YTD_2412'] + ss_4year['SALES_YTD_2412']
    
    tag_sales_cumulative['과시즌S_3년차_이상'] = {
        "current": {
            "gross_sales": current_sum / 1000
        },
        "previous": {
            "gross_sales": previous_sum / 1000
        },
        "yoy": (current_sum / previous_sum * 100) if previous_sum > 0 else 0
    }

# 당월 데이터에 추가
if 'ending_inventory' not in dashboard_data:
    dashboard_data['ending_inventory'] = {}
dashboard_data['ending_inventory']['by_tag'] = tag_inventory
dashboard_data['season_sales_detail'] = tag_sales_monthly

# 누적 데이터에 추가
if 'ending_inventory' not in cumulative_data:
    cumulative_data['ending_inventory'] = {}
cumulative_data['ending_inventory']['by_tag'] = tag_inventory
cumulative_data['season_sales_detail'] = tag_sales_cumulative

# 저장
with open(dashboard_path, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

with open(cumulative_path, 'w', encoding='utf-8') as f:
    json.dump(cumulative_data, f, ensure_ascii=False, indent=2)

print("\n" + "="*50)
print("[SUCCESS] TAG 데이터 업데이트 완료!")
print("="*50)
print(f"재고 TAG: {len(tag_inventory)}개")
print(f"판매 당월: {len(tag_sales_monthly)}개")
print(f"판매 누적: {len(tag_sales_cumulative)}개")
print("\n주요 데이터:")
print(f"- 과시즌F: {tag_inventory['과시즌F']['current']['stock_price']/1000:.1f}K HKD")
print(f"- 과시즌S: {tag_inventory['과시즌S']['current']['stock_price']/1000:.1f}K HKD")
print(f"- 과시즌F 판매(당월): {tag_sales_monthly['과시즌F']['current']['gross_sales']:.1f}K HKD")
print(f"- 과시즌F 판매(누적): {tag_sales_cumulative['과시즌F']['current']['gross_sales']:.1f}K HKD")
