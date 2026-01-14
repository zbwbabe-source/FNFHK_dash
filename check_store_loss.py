import json

# 매장 효율성 데이터 읽기
with open('public/dashboard/hongkong-store-efficiency-2512.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

stores = data.get('stores', [])
print(f'Total stores: {len(stores)}')

# NTP3 찾기
ntp3_stores = [s for s in stores if 'NPT3' in s.get('store_name', '').upper() or 'NTP3' in s.get('store_name', '').upper()]
print(f'\nNTP3 stores found: {len(ntp3_stores)}')
for s in ntp3_stores:
    direct_profit = s.get('cumulative', {}).get('direct_profit', 0)
    print(f"  {s.get('store_name')}: 누적 직접손실 {abs(direct_profit):.0f}K")

# Senado 찾기
senado_stores = [s for s in stores if 'SENADO' in s.get('store_name', '').upper()]
print(f'\nSenado stores found: {len(senado_stores)}')
for s in senado_stores:
    direct_profit = s.get('cumulative', {}).get('direct_profit', 0)
    print(f"  {s.get('store_name')}: 누적 직접손실 {abs(direct_profit):.0f}K")
