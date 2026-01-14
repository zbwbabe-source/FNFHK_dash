import json

# Load dashboard data
with open('public/dashboard/hongkong-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    dd = json.load(f)

# Load PL data
with open('public/dashboard/hongkong-pl-data-2512.json', 'r', encoding='utf-8') as f:
    pl = json.load(f)

# Get monthly channel data
monthly_data = dd['monthly_channel_data']
monthly_channel_yoy = dd.get('monthly_channel_yoy', {})

# Calculate cumulative by channel
channels = ['HK_Retail', 'HK_Outlet', 'HK_Online', 'MC_Retail', 'MC_Outlet']
cumulative = {}

for channel in channels:
    net_sales = sum([period.get(channel, 0) for period in monthly_data])
    cumulative[channel] = {'net_sales': net_sales}
    print(f'{channel} cumulative net_sales: {net_sales:,.0f}')

# Now calculate discount from country_channel_summary
cc = dd['country_channel_summary']
print('\n=== Current month data ===')
for channel in channels:
    if channel in cc:
        current = cc[channel]['current']
        print(f'\n{channel}:')
        print(f'  Current gross: {current["gross_sales"]:,.0f}')
        print(f'  Current net: {current["net_sales"]:,.0f}')
        print(f'  Current discount: {current["gross_sales"] - current["net_sales"]:,.0f}')
        print(f'  Current discount_rate: {current["discount_rate"]:.2f}%')
