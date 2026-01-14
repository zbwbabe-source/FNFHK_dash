import json
import pandas as pd

# 면적 데이터 로드
with open('public/dashboard/hongkong-store-areas.json', 'r', encoding='utf-8') as f:
    areas = json.load(f)

# 누적 매출 데이터 로드
with open('public/dashboard/hongkong-dashboard-cumulative-2512.json', 'r', encoding='utf-8') as f:
    cumulative = json.load(f)

# 당월 매출 데이터 로드
with open('public/dashboard/hongkong-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    monthly = json.load(f)

store_summary = cumulative.get('store_summary', {})
monthly_summary = monthly.get('store_summary', {})

data = []
for code, area in areas.items():
    if code in ['M10A', 'H99', 'M99']:  # 오피스 제외
        continue
    
    store = store_summary.get(code, {})
    monthly_store = monthly_summary.get(code, {})
    
    # 누적 매출
    current_cumulative = store.get('current', {}).get('net_sales', 0)
    prev_cumulative = store.get('previous', {}).get('net_sales', 0)
    
    # 당월 매출
    current_monthly = monthly_store.get('current', {}).get('net_sales', 0)
    prev_monthly = monthly_store.get('previous', {}).get('net_sales', 0)
    
    # 채널
    channel = store.get('channel', '')
    country = store.get('country', '')
    
    data.append({
        '매장코드': code,
        '국가': country,
        '채널': channel,
        '면적(평)': area,
        '당월매출(HKD)': int(current_monthly),
        '전년당월매출(HKD)': int(prev_monthly),
        '누적매출(HKD)': int(current_cumulative),
        '전년누적매출(HKD)': int(prev_cumulative),
        '당월1K이상': 'O' if current_monthly >= 1000 else 'X',
        '누적1K이상': 'O' if current_cumulative >= 1000 else 'X'
    })

df = pd.DataFrame(data)

# 면적 기준 정렬
df = df.sort_values('면적(평)', ascending=False)

# 엑셀 저장
output_file = '매장별_면적_매출_2512.xlsx'
df.to_excel(output_file, index=False, sheet_name='매장별 데이터')

print(f"저장 완료: {output_file}")
print(f"\n총 매장 수: {len(df)}")
print(f"온라인 제외 매장: {len(df[df['채널'] != 'Online'])}")
print(f"\n=== 당월 매출 1K 이상 ===")
print(f"매장 수: {len(df[df['당월1K이상'] == 'O'])}")
print(f"총 면적: {df[df['당월1K이상'] == 'O']['면적(평)'].sum()}평")
print(f"\n=== 누적 매출 1K 이상 (온라인 제외) ===")
cumulative_stores = df[(df['누적1K이상'] == 'O') & (df['채널'] != 'Online')]
print(f"매장 수: {len(cumulative_stores)}")
print(f"총 면적: {cumulative_stores['면적(평)'].sum()}평")

# 화면에도 출력
print("\n" + "="*100)
print(df.to_string(index=False))
