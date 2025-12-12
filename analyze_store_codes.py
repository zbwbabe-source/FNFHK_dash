import csv
from collections import defaultdict

store_info = defaultdict(lambda: {'Store_Name': set(), 'Brand': set(), 'Channel': set()})

with open('../Dashboard_Raw_Data/HKMC/2511/HKMC_Inventory_2511.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        store_code = row['Store_Code']
        store_info[store_code]['Store_Name'].add(row['Store_Name'])
        store_info[store_code]['Brand'].add(row['Brand'])
        store_info[store_code]['Channel'].add(row['Channel'])

# 분류 정의
outlet_codes = {'M07', 'M13', 'M15', 'M21'}
online_mlb_codes = {'HE1', 'HE2'}
online_dx_codes = {'XE1'}

print("=" * 80)
print("Store Code 분류표")
print("=" * 80)
print(f"{'Store Code':<10} {'Store Name':<40} {'Brand':<10} {'Channel':<10} {'분류':<20}")
print("-" * 80)

for store_code in sorted(store_info.keys()):
    name = list(store_info[store_code]['Store_Name'])[0] if store_info[store_code]['Store_Name'] else ''
    brand = ', '.join(sorted(store_info[store_code]['Brand']))
    channel = ', '.join(sorted(store_info[store_code]['Channel']))
    
    # 분류 결정
    if store_code in outlet_codes:
        category = 'MLB 아울렛'
    elif store_code in online_mlb_codes:
        category = 'MLB 온라인'
    elif store_code in online_dx_codes:
        category = 'DX 온라인'
    else:
        category = '리테일'
    
    print(f"{store_code:<10} {name[:38]:<40} {brand:<10} {channel:<10} {category:<20}")

print("=" * 80)
print(f"\n총 매장 수: {len(store_info)}")
print(f"\n분류별 개수:")
print(f"  - MLB 아울렛: {len([s for s in store_info.keys() if s in outlet_codes])}")
print(f"  - MLB 온라인: {len([s for s in store_info.keys() if s in online_mlb_codes])}")
print(f"  - DX 온라인: {len([s for s in store_info.keys() if s in online_dx_codes])}")
print(f"  - 리테일: {len([s for s in store_info.keys() if s not in outlet_codes and s not in online_mlb_codes and s not in online_dx_codes])}")





