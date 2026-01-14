import pandas as pd
import json

# 면적 데이터 로드
area_df = pd.read_csv(r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC Store pyung 2512.csv', 
                      encoding='utf-8-sig')

# 매출 데이터 로드
with open('public/dashboard/hongkong-dashboard-cumulative-2512.json', 'r', encoding='utf-8') as f:
    cumulative = json.load(f)

with open('public/dashboard/hongkong-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    monthly = json.load(f)

store_summary = cumulative.get('store_summary', {})
monthly_summary = monthly.get('store_summary', {})

# 매장 코드를 키로 하는 면적 딕셔너리 생성
store_areas = {}
for _, row in area_df.iterrows():
    code = row['Store code']
    store_areas[code] = {
        'country': row['country'],
        'channel': row['channel'],
        'monthly_area_2025': {f'{i:02d}': row[f'25{i:02d}'] for i in range(1, 13)},  # 2501~2512
        'monthly_area_2024': {f'{i:02d}': row[f'24{i:02d}'] for i in range(1, 13)},  # 2401~2412
        'area_2512': row['2512'],  # 당년 12월 면적
        'area_2412': row['2412']   # 전년 12월 면적
    }

print("=" * 80)
print("면적 데이터 로드 완료")
print(f"총 매장 수: {len(store_areas)}")
print("=" * 80)

# === 당월 (12월) 계산 ===
print("\n=== 당년 당월 (2512) 평당매출 계산 ===")

monthly_total_sales = 0
monthly_total_area = 0
monthly_stores = []

for code, area_info in store_areas.items():
    if code == 'M03' or area_info['channel'] == 'Online':
        continue
    
    store = monthly_summary.get(code, {})
    sales = store.get('current', {}).get('net_sales', 0)
    area = area_info['area_2512']
    
    if pd.notna(area) and area > 0 and sales > 0:
        monthly_total_sales += sales
        monthly_total_area += area
        monthly_stores.append({'code': code, 'sales': sales, 'area': area})

monthly_days = 31
monthly_sales_per_pyeong = monthly_total_sales / monthly_total_area if monthly_total_area > 0 else 0
monthly_daily_sales_per_pyeong = monthly_sales_per_pyeong / monthly_days

print(f"매장 수: {len(monthly_stores)}")
print(f"총 매출: {monthly_total_sales:,.0f} HKD = {monthly_total_sales/1000:,.1f} K HKD")
print(f"총 면적: {monthly_total_area:.0f}평")
print(f"일평당매출: {monthly_daily_sales_per_pyeong:,.0f} HKD/평/일")

# === 전년 당월 (2412) 계산 ===
print("\n=== 전년 당월 (2412) 평당매출 계산 ===")

prev_monthly_total_sales = 0
prev_monthly_total_area = 0
prev_monthly_stores = []

for code, area_info in store_areas.items():
    if code == 'M03' or area_info['channel'] == 'Online':
        continue
    
    store = monthly_summary.get(code, {})
    sales = store.get('previous', {}).get('net_sales', 0)
    area = area_info['area_2412']
    
    if pd.notna(area) and area > 0 and sales > 0:
        prev_monthly_total_sales += sales
        prev_monthly_total_area += area
        prev_monthly_stores.append({'code': code, 'sales': sales, 'area': area})

prev_monthly_sales_per_pyeong = prev_monthly_total_sales / prev_monthly_total_area if prev_monthly_total_area > 0 else 0
prev_monthly_daily_sales_per_pyeong = prev_monthly_sales_per_pyeong / monthly_days

print(f"매장 수: {len(prev_monthly_stores)}")
print(f"총 매출: {prev_monthly_total_sales:,.0f} HKD = {prev_monthly_total_sales/1000:,.1f} K HKD")
print(f"총 면적: {prev_monthly_total_area:.0f}평")
print(f"일평당매출: {prev_monthly_daily_sales_per_pyeong:,.0f} HKD/평/일")

monthly_yoy = (monthly_daily_sales_per_pyeong / prev_monthly_daily_sales_per_pyeong * 100) if prev_monthly_daily_sales_per_pyeong > 0 else 0
print(f"YOY: {monthly_yoy:.1f}%")

# === 당년 누적 (2025) 계산 ===
print("\n=== 당년 누적 (2501~2512) 평당매출 계산 (가중평균) ===")

monthly_area_sums = []
for month in range(1, 13):
    month_key = f'{month:02d}'
    month_area_sum = 0
    
    for code, area_info in store_areas.items():
        if code == 'M03' or area_info['channel'] == 'Online':
            continue
        
        store = store_summary.get(code, {})
        cumulative_sales = store.get('current', {}).get('net_sales', 0)
        
        if cumulative_sales >= 1000:
            area = area_info['monthly_area_2025'].get(month_key, 0)
            if pd.notna(area) and area > 0:
                month_area_sum += area
    
    monthly_area_sums.append(month_area_sum)
    print(f"  {month:02d}월 면적: {month_area_sum:.0f}평")

weighted_avg_area = sum(monthly_area_sums) / 12
print(f"가중평균 면적: {weighted_avg_area:.1f}평")

cumulative_total_sales = 0
cumulative_stores = []

for code, area_info in store_areas.items():
    if code == 'M03' or area_info['channel'] == 'Online':
        continue
    
    store = store_summary.get(code, {})
    sales = store.get('current', {}).get('net_sales', 0)
    
    if sales >= 1000:
        cumulative_total_sales += sales
        cumulative_stores.append({'code': code, 'sales': sales})

cumulative_days = 365
cumulative_sales_per_pyeong = cumulative_total_sales / weighted_avg_area if weighted_avg_area > 0 else 0
cumulative_daily_sales_per_pyeong = cumulative_sales_per_pyeong / cumulative_days

print(f"매장 수: {len(cumulative_stores)}")
print(f"총 매출: {cumulative_total_sales:,.0f} HKD = {cumulative_total_sales/1000:,.1f} K HKD")
print(f"일평당매출: {cumulative_daily_sales_per_pyeong:,.0f} HKD/평/일")

# === 전년 누적 (2024) 계산 ===
print("\n=== 전년 누적 (2401~2412) 평당매출 계산 (가중평균) ===")

prev_monthly_area_sums = []
for month in range(1, 13):
    month_key = f'{month:02d}'
    month_area_sum = 0
    
    for code, area_info in store_areas.items():
        if code == 'M03' or area_info['channel'] == 'Online':
            continue
        
        store = store_summary.get(code, {})
        prev_cumulative_sales = store.get('previous', {}).get('net_sales', 0)
        
        if prev_cumulative_sales >= 1000:
            area = area_info['monthly_area_2024'].get(month_key, 0)
            if pd.notna(area) and area > 0:
                month_area_sum += area
    
    prev_monthly_area_sums.append(month_area_sum)
    print(f"  {month:02d}월 면적: {month_area_sum:.0f}평")

prev_weighted_avg_area = sum(prev_monthly_area_sums) / 12
print(f"가중평균 면적: {prev_weighted_avg_area:.1f}평")

prev_cumulative_total_sales = 0
prev_cumulative_stores = []

for code, area_info in store_areas.items():
    if code == 'M03' or area_info['channel'] == 'Online':
        continue
    
    store = store_summary.get(code, {})
    sales = store.get('previous', {}).get('net_sales', 0)
    
    if sales >= 1000:
        prev_cumulative_total_sales += sales
        prev_cumulative_stores.append({'code': code, 'sales': sales})

prev_cumulative_sales_per_pyeong = prev_cumulative_total_sales / prev_weighted_avg_area if prev_weighted_avg_area > 0 else 0
prev_cumulative_daily_sales_per_pyeong = prev_cumulative_sales_per_pyeong / cumulative_days

print(f"매장 수: {len(prev_cumulative_stores)}")
print(f"총 매출: {prev_cumulative_total_sales:,.0f} HKD = {prev_cumulative_total_sales/1000:,.1f} K HKD")
print(f"일평당매출: {prev_cumulative_daily_sales_per_pyeong:,.0f} HKD/평/일")

cumulative_yoy = (cumulative_daily_sales_per_pyeong / prev_cumulative_daily_sales_per_pyeong * 100) if prev_cumulative_daily_sales_per_pyeong > 0 else 0
print(f"YOY: {cumulative_yoy:.1f}%")

# === 채널별 평당매출 계산 ===
print("\n=== 채널별 평당매출 계산 ===")

# 채널 매핑
channel_mapping = {
    'HK_Retail': ('HK', '정상'),
    'HK_Outlet': ('HK', '아울렛'),
    'MC_Retail': ('MC', '정상'),
    'MC_Outlet': ('MC', '아울렛')
}

channels_data = {}

for channel_key, (country, channel_type) in channel_mapping.items():
    print(f"\n--- {country} {channel_type} ---")
    
    # 당월
    monthly_channel_sales = 0
    monthly_channel_area = 0
    
    for code, area_info in store_areas.items():
        if area_info['country'] != country or area_info['channel'] != channel_type:
            continue
        if code == 'M03':
            continue
            
        store = monthly_summary.get(code, {})
        sales = store.get('current', {}).get('net_sales', 0)
        area = area_info['area_2512']
        
        if pd.notna(area) and area > 0:
            monthly_channel_sales += sales
            monthly_channel_area += area
    
    monthly_channel_daily = (monthly_channel_sales / monthly_channel_area / monthly_days) if monthly_channel_area > 0 else 0
    
    # 전년 당월
    prev_monthly_channel_sales = 0
    prev_monthly_channel_area = 0
    
    for code, area_info in store_areas.items():
        if area_info['country'] != country or area_info['channel'] != channel_type:
            continue
        if code == 'M03':
            continue
            
        store = monthly_summary.get(code, {})
        sales = store.get('previous', {}).get('net_sales', 0)
        area = area_info['area_2412']
        
        if pd.notna(area) and area > 0:
            prev_monthly_channel_sales += sales
            prev_monthly_channel_area += area
    
    prev_monthly_channel_daily = (prev_monthly_channel_sales / prev_monthly_channel_area / monthly_days) if prev_monthly_channel_area > 0 else 0
    monthly_channel_yoy = (monthly_channel_daily / prev_monthly_channel_daily * 100) if prev_monthly_channel_daily > 0 else 0
    
    print(f"당월: {monthly_channel_daily:,.0f} HKD/평/일 (면적: {monthly_channel_area}평)")
    print(f"전년: {prev_monthly_channel_daily:,.0f} HKD/평/일 (YOY: {monthly_channel_yoy:.1f}%)")
    
    # 누적 - 가중평균
    cumulative_channel_monthly_areas = []
    for month in range(1, 13):
        month_key = f'{month:02d}'
        month_area = 0
        
        for code, area_info in store_areas.items():
            if area_info['country'] != country or area_info['channel'] != channel_type:
                continue
            if code == 'M03':
                continue
                
            store = store_summary.get(code, {})
            cumulative_sales = store.get('current', {}).get('net_sales', 0)
            
            if cumulative_sales >= 1000:
                area = area_info['monthly_area_2025'].get(month_key, 0)
                if pd.notna(area) and area > 0:
                    month_area += area
        
        cumulative_channel_monthly_areas.append(month_area)
    
    cumulative_channel_avg_area = sum(cumulative_channel_monthly_areas) / 12
    
    cumulative_channel_sales = 0
    for code, area_info in store_areas.items():
        if area_info['country'] != country or area_info['channel'] != channel_type:
            continue
        if code == 'M03':
            continue
            
        store = store_summary.get(code, {})
        sales = store.get('current', {}).get('net_sales', 0)
        
        if sales >= 1000:
            cumulative_channel_sales += sales
    
    cumulative_channel_daily = (cumulative_channel_sales / cumulative_channel_avg_area / cumulative_days) if cumulative_channel_avg_area > 0 else 0
    
    # 전년 누적
    prev_cumulative_channel_monthly_areas = []
    for month in range(1, 13):
        month_key = f'{month:02d}'
        month_area = 0
        
        for code, area_info in store_areas.items():
            if area_info['country'] != country or area_info['channel'] != channel_type:
                continue
            if code == 'M03':
                continue
                
            store = store_summary.get(code, {})
            prev_cumulative_sales = store.get('previous', {}).get('net_sales', 0)
            
            if prev_cumulative_sales >= 1000:
                area = area_info['monthly_area_2024'].get(month_key, 0)
                if pd.notna(area) and area > 0:
                    month_area += area
        
        prev_cumulative_channel_monthly_areas.append(month_area)
    
    prev_cumulative_channel_avg_area = sum(prev_cumulative_channel_monthly_areas) / 12
    
    prev_cumulative_channel_sales = 0
    for code, area_info in store_areas.items():
        if area_info['country'] != country or area_info['channel'] != channel_type:
            continue
        if code == 'M03':
            continue
            
        store = store_summary.get(code, {})
        sales = store.get('previous', {}).get('net_sales', 0)
        
        if sales >= 1000:
            prev_cumulative_channel_sales += sales
    
    prev_cumulative_channel_daily = (prev_cumulative_channel_sales / prev_cumulative_channel_avg_area / cumulative_days) if prev_cumulative_channel_avg_area > 0 else 0
    cumulative_channel_yoy = (cumulative_channel_daily / prev_cumulative_channel_daily * 100) if prev_cumulative_channel_daily > 0 else 0
    
    print(f"누적: {cumulative_channel_daily:,.0f} HKD/평/일 (가중평균 면적: {cumulative_channel_avg_area:.1f}평)")
    print(f"전년: {prev_cumulative_channel_daily:,.0f} HKD/평/일 (YOY: {cumulative_channel_yoy:.1f}%)")
    
    channels_data[channel_key] = {
        "monthly": {
            "current": {
                "sales_per_pyeong_daily": monthly_channel_daily,
                "area": monthly_channel_area
            },
            "previous": {
                "sales_per_pyeong_daily": prev_monthly_channel_daily,
                "area": prev_monthly_channel_area
            },
            "yoy": monthly_channel_yoy
        },
        "cumulative": {
            "current": {
                "sales_per_pyeong_daily": cumulative_channel_daily,
                "weighted_avg_area": cumulative_channel_avg_area
            },
            "previous": {
                "sales_per_pyeong_daily": prev_cumulative_channel_daily,
                "weighted_avg_area": prev_cumulative_channel_avg_area
            },
            "yoy": cumulative_channel_yoy
        }
    }

# JSON으로 저장
result = {
    "monthly": {
        "current": {
            "stores": len(monthly_stores),
            "total_sales_hkd": monthly_total_sales,
            "total_area": monthly_total_area,
            "sales_per_pyeong_daily": monthly_daily_sales_per_pyeong,
            "days": monthly_days
        },
        "previous": {
            "stores": len(prev_monthly_stores),
            "total_sales_hkd": prev_monthly_total_sales,
            "total_area": prev_monthly_total_area,
            "sales_per_pyeong_daily": prev_monthly_daily_sales_per_pyeong,
            "days": monthly_days
        },
        "yoy": monthly_yoy
    },
    "cumulative": {
        "current": {
            "stores": len(cumulative_stores),
            "total_sales_hkd": cumulative_total_sales,
            "weighted_avg_area": weighted_avg_area,
            "monthly_areas": monthly_area_sums,
            "sales_per_pyeong_daily": cumulative_daily_sales_per_pyeong,
            "days": cumulative_days
        },
        "previous": {
            "stores": len(prev_cumulative_stores),
            "total_sales_hkd": prev_cumulative_total_sales,
            "weighted_avg_area": prev_weighted_avg_area,
            "monthly_areas": prev_monthly_area_sums,
            "sales_per_pyeong_daily": prev_cumulative_daily_sales_per_pyeong,
            "days": cumulative_days
        },
        "yoy": cumulative_yoy
    },
    "channels": channels_data
}

output_file = 'public/dashboard/hongkong-sales-per-pyeong-2512.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\n저장 완료: {output_file}")

