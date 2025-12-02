import pandas as pd
import json
import sys

# UTF-8 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# CSV 로드
print("CSV 파일 로딩 중...")
df = pd.read_csv('../Dashboard_Raw_Data/24012510 홍콩재고수불.csv')

print(f"✅ 총 {len(df):,}개 레코드 로드 완료\n")

# 기본 정보
print("=" * 80)
print("📊 기본 데이터 정보")
print("=" * 80)
print(f"컬럼: {list(df.columns)}\n")
print(f"기간 범위: {df['Period'].min()} ~ {df['Period'].max()}")
print(f"연도: {df['Year'].unique()}")
print(f"채널: {df['Channel'].unique()}")
print(f"국가: {df['Country'].unique()}\n")

# 2510, 2410 데이터 확인
print("=" * 80)
print("🎯 타겟 기간 데이터 확인")
print("=" * 80)
df_2510 = df[df['Period'] == 2510]
df_2410 = df[df['Period'] == 2410]

print(f"2510 (2025년 10월) 레코드: {len(df_2510):,}개")
print(f"2410 (2024년 10월) 레코드: {len(df_2410):,}개\n")

if len(df_2510) == 0:
    print("⚠️ 2510 데이터가 없습니다!")
    exit()

# 1. 채널별 매출 및 재고 (2510)
print("=" * 80)
print("📊 1. 채널별 실판매출 & 재고 (2025년 10월)")
print("=" * 80)
channel_summary = df_2510.groupby('Channel').agg({
    'Net_Sales': 'sum',
    'Gross_Sales': 'sum',
    'Stock_Price': 'sum',
    'Stock_Qty': 'sum'
}).round(0)

print(channel_summary)
print()

# 2. 시즌별 재고 (2510)
print("=" * 80)
print("📦 2. 시즌 타입별 재고 (2025년 10월)")
print("=" * 80)
season_summary = df_2510.groupby('Season_Type').agg({
    'Stock_Price': 'sum',
    'Stock_Qty': 'sum'
}).round(0)

print(season_summary)
print()

# 3. 카테고리별 재고 (2510)
print("=" * 80)
print("🏷️ 3. 카테고리별 재고 (2025년 10월)")
print("=" * 80)
category_summary = df_2510.groupby('Category').agg({
    'Stock_Price': 'sum',
    'Net_Sales': 'sum'
}).round(0)

print(category_summary)
print()

# 4. 월별 추세 데이터 (2501~2510)
print("=" * 80)
print("📈 4. 월별 재고 추세 (2025년 1월~10월)")
print("=" * 80)
df_2025 = df[df['Period'].between(2501, 2510)]
monthly_trend = df_2025.groupby(['Period', 'Category'])['Stock_Price'].sum().unstack(fill_value=0).round(0)

print(monthly_trend)
print()

# 5. YOY 계산 (채널별)
print("=" * 80)
print("📊 5. 채널별 YOY (2510 vs 2410)")
print("=" * 80)

if len(df_2410) > 0:
    channel_2510 = df_2510.groupby('Channel')['Net_Sales'].sum()
    channel_2410 = df_2410.groupby('Channel')['Net_Sales'].sum()
    
    yoy_channel = pd.DataFrame({
        '2510': channel_2510,
        '2410': channel_2410,
        'YOY (%)': ((channel_2510 / channel_2410) * 100).round(0)
    })
    
    print(yoy_channel)
else:
    print("⚠️ 2410 데이터가 없어서 YOY 계산 불가")

print()

# 6. 매장 리스트 (상위 10개)
print("=" * 80)
print("🏪 6. 매장별 재고 TOP 10 (2025년 10월)")
print("=" * 80)
store_summary = df_2510.groupby(['Store_Code', 'Store_Name', 'Channel']).agg({
    'Stock_Price': 'sum',
    'Net_Sales': 'sum'
}).sort_values('Stock_Price', ascending=False).head(10).round(0)

print(store_summary)
print()

# 7. 시즌 코드별 재고 (상위 15개)
print("=" * 80)
print("🎽 7. 시즌 코드별 재고 TOP 15 (2025년 10월)")
print("=" * 80)
season_code_summary = df_2510.groupby('Season_Code')['Stock_Price'].sum().sort_values(ascending=False).head(15).round(0)

print(season_code_summary)
print()

# 8. JSON 형식으로 주요 데이터 추출
print("=" * 80)
print("💾 8. JSON 데이터 생성 중...")
print("=" * 80)

output_data = {
    "기준월": "2510 (2025년 10월)",
    "채널별_실판매출": channel_summary['Net_Sales'].to_dict(),
    "채널별_재고": channel_summary['Stock_Price'].to_dict(),
    "시즌타입별_재고": season_summary['Stock_Price'].to_dict(),
    "카테고리별_재고": category_summary['Stock_Price'].to_dict(),
    "총재고": float(df_2510['Stock_Price'].sum()),
    "총매출": float(df_2510['Net_Sales'].sum())
}

# JSON 파일 저장
with open('hongkong_analysis_2510.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("✅ hongkong_analysis_2510.json 파일 저장 완료!")
print()

print("=" * 80)
print("🎉 분석 완료!")
print("=" * 80)
print(f"총재고: {df_2510['Stock_Price'].sum():,.0f} HKD")
print(f"총매출: {df_2510['Net_Sales'].sum():,.0f} HKD")
print(f"할인율: {((1 - df_2510['Net_Sales'].sum() / df_2510['Gross_Sales'].sum()) * 100):.1f}%")

