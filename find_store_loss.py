import json

with open(r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\hongkong-dashboard-cumulative-2512.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

stores = data.get('stores', {})
print(f'Total stores: {len(stores)}')

# NTP3 찾기
ntp3_stores = {k: v for k, v in stores.items() if 'NPT3' in v.get('shop_nm', '') or 'NTP3' in v.get('shop_nm', '')}
print(f'\nNTP3 stores: {len(ntp3_stores)}')
for k, v in ntp3_stores.items():
    dp = v.get('cumulative', {}).get('direct_profit', 0)
    print(f'  {k}: {v.get("shop_nm")} - 누적 직접손실: {abs(dp):.0f}K')

# Senado 찾기  
senado_stores = {k: v for k, v in stores.items() if 'Senado' in v.get('shop_nm', '') or 'senado' in v.get('shop_nm', '')}
print(f'\nSenado stores: {len(senado_stores)}')
for k, v in senado_stores.items():
    dp = v.get('cumulative', {}).get('direct_profit', 0)
    print(f'  {k}: {v.get("shop_nm")} - 누적 직접손실: {abs(dp):.0f}K')
