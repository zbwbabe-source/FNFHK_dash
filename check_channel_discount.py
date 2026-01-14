import json

# Check dashboard data
with open('public/dashboard/hongkong-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('=== Dashboard Data ===')
print('Keys:', list(data.keys()))

cc = data.get('country_channel_summary', {})
print('\nCountry channel summary keys:', list(cc.keys()))

hk = cc.get('HK', {})
print('\nHK keys:', list(hk.keys()))

if 'Retail' in hk:
    retail = hk['Retail']
    print('\nRetail keys:', list(retail.keys()))
    print('  discount_rate:', retail.get('discount_rate'))
    if 'cumulative' in retail:
        print('  cumulative discount_rate:', retail['cumulative'].get('discount_rate'))

if 'Outlet' in hk:
    outlet = hk['Outlet']
    print('\nOutlet keys:', list(outlet.keys()))
    print('  discount_rate:', outlet.get('discount_rate'))
    if 'cumulative' in outlet:
        print('  cumulative discount_rate:', outlet['cumulative'].get('discount_rate'))
