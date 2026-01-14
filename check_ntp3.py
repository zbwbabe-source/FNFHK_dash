import json

# 매장 상태 파일 확인
with open(r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\hongkong-store-status-2512.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('=== 매장 상태 파일 확인 ===')
categories = data.get('categories', {})
all_stores = []
for cat_name, cat_data in categories.items():
    if 'stores' in cat_data:
        all_stores.extend(cat_data['stores'])

print(f'Total stores: {len(all_stores)}')

# NTP3 / M19 찾기
ntp3_stores = [s for s in all_stores if 'NTP' in s.get('shop_nm', '').upper() or 'M19' in s.get('shop_cd', '')]
print(f'\nNTP3/M19 stores found: {len(ntp3_stores)}')
for s in ntp3_stores:
    print(f"  {s['shop_cd']}: {s['shop_nm']}")

# 모든 매장 코드 출력
print(f'\n=== 모든 매장 코드 (총 {len(all_stores)}개) ===')
for s in sorted(all_stores, key=lambda x: x.get('shop_cd', '')):
    print(f"  {s['shop_cd']}: {s['shop_nm']}")
