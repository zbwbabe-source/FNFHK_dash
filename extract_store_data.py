import json
import pandas as pd

# 누적 매출 데이터 로드
with open('public/dashboard/hongkong-dashboard-cumulative-2512.json', 'r', encoding='utf-8') as f:
    cumulative = json.load(f)

# 당월 매출 데이터 로드
with open('public/dashboard/hongkong-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    monthly = json.load(f)

store_summary = cumulative.get('store_summary', {})
monthly_summary = monthly.get('store_summary', {})

# 채널별 면적 (cumulative에서)
channel_areas = cumulative.get('offline_store_efficiency', {}).get('by_channel', {})

data = []
for code, store in store_summary.items():
    if code in ['M10A', 'H99', 'M99']:  # 오피스 제외
        continue
    
    monthly_store = monthly_summary.get(code, {})
    
    # 매장 정보
    channel = store.get('channel', '')
    country = store.get('country', '')
    store_name = store.get('store_name', '')
    
    # 누적 매출
    current_cumulative = store.get('current', {}).get('net_sales', 0)
    prev_cumulative = store.get('previous', {}).get('net_sales', 0)
    
    # 당월 매출
    current_monthly = monthly_store.get('current', {}).get('net_sales', 0)
    prev_monthly = monthly_store.get('previous', {}).get('net_sales', 0)
    
    # 면적 추정 (채널별 총 면적을 매장 수로 나눔 - 정확하지 않음)
    area = 0
    
    data.append({
        '매장코드': code,
        '매장명': store_name,
        '국가': country,
        '채널': channel,
        '당월매출(HKD)': int(current_monthly),
        '전년당월매출(HKD)': int(prev_monthly),
        '누적매출(HKD)': int(current_cumulative),
        '전년누적매출(HKD)': int(prev_cumulative),
        '당월1K이상': 'O' if current_monthly >= 1000 else 'X',
        '누적1K이상': 'O' if current_cumulative >= 1000 else 'X'
    })

df = pd.DataFrame(data)

# 누적매출 기준 정렬
df = df.sort_values('누적매출(HKD)', ascending=False)

# 엑셀 저장
output_file = '매장별_매출_2512.xlsx'
df.to_excel(output_file, index=False, sheet_name='매장별 데이터')

print(f"저장 완료: {output_file}")
print(f"\n총 매장 수: {len(df)}")
print(f"온라인 제외 매장: {len(df[df['채널'] != 'Online'])}")

print(f"\n=== 당월 매출 1K 이상 (온라인 제외) ===")
monthly_1k = df[(df['당월1K이상'] == 'O') & (df['채널'] != 'Online')]
print(f"매장 수: {len(monthly_1k)}")
print(f"총 매출: {monthly_1k['당월매출(HKD)'].sum():,} HKD")

print(f"\n=== 누적 매출 1K 이상 (온라인 제외) ===")
cumulative_1k = df[(df['누적1K이상'] == 'O') & (df['채널'] != 'Online')]
print(f"매장 수: {len(cumulative_1k)}")
print(f"총 매출: {cumulative_1k['누적매출(HKD)'].sum():,} HKD")

print("\n=== 채널별 면적 (cumulative 데이터) ===")
for key, ch_data in channel_areas.items():
    area = ch_data.get('current', {}).get('total_area', 0)
    print(f"{key}: {area}평")

print("\n" + "="*120)
print(df.to_string(index=False))
