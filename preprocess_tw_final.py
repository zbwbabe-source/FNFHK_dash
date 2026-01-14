"""
대만 재고 CSV 전처리 스크립트 (규칙 기반)
TW_Inventory_2312_2512_v5.2.csv → 전처리된 CSV
"""
import pandas as pd
import os

# ============================================================================
# 설정
# ============================================================================
INPUT_CSV = r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\TW_Inventory_2312_2512_v5.2.csv'
EXCHANGE_RATE_FILE = r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\TW_Exchange Rate 2512.csv'
OUTPUT_CSV = r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\TW_Inventory_Processed_2512.csv'

CURRENT_PERIOD = 2512
PREV_PERIOD = 2412
VAT_RATE = 1.05

# ============================================================================
# 1. 데이터 로드
# ============================================================================
print("=" * 80)
print("대만 재고 데이터 전처리 시작")
print("=" * 80)

# 환율 로드
print(f"\n1. 환율 로드: {EXCHANGE_RATE_FILE}")
exchange_df = pd.read_csv(EXCHANGE_RATE_FILE, encoding='utf-8-sig')
exchange_rate = float(exchange_df[exchange_df.iloc[:, 0] == CURRENT_PERIOD].iloc[0, 1])
print(f"   적용 환율: 1 TWD = {exchange_rate} HKD")

# CSV 로드
print(f"\n2. CSV 로드: {INPUT_CSV}")
df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')
print(f"   총 {len(df):,}개 로우")

# ============================================================================
# 2. 브랜드 필터링 (MLB만)
# ============================================================================
print(f"\n3. 브랜드 필터링 (MLB만)")
df = df[df['Brand'] == 'MLB'].copy()
print(f"   필터 후: {len(df):,}개 로우")

# ============================================================================
# 3. 당시즌 판별 함수
# ============================================================================
def get_item_sales_tag(season_code, category):
    """아이템별 판매 Tag 생성 (Gross Sales 기준)"""
    if not season_code or pd.isna(season_code):
        return '기타'
    
    season_code = str(season_code).strip()
    
    # 악세사리 (N으로 끝남)
    if season_code.endswith('N'):
        if category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category == 'BAG':
            return '가방'
        else:
            return '기타ACC'
    
    # 시즌 판별
    if season_code == '25F':
        return '25F'
    elif season_code == '25S':
        return '25S'
    elif season_code == '26S':
        return '26S'
    elif season_code in ['24F', '23F', '22F', '21F', '20F', '19F', '18F', '17F']:
        return '과시즌F'
    elif season_code in ['24S', '23S', '22S', '21S', '20S', '19S', '18S']:
        return '과시즌S'
    
    return '기타'

def get_item_stock_tag(season_code, category):
    """아이템별 기말재고 Tag 생성 (Stock Price 기준)"""
    # 판매 Tag와 동일한 로직
    return get_item_sales_tag(season_code, category)

# ============================================================================
# 4. Tag 컬럼 생성
# ============================================================================
print(f"\n4. Tag 컬럼 생성")
df['ITEM_SALES_TAG'] = df.apply(lambda row: get_item_sales_tag(row['Season_Code'], row['Category']), axis=1)
df['ITEM_ENDING_STOCK_TAG'] = df.apply(lambda row: get_item_stock_tag(row['Season_Code'], row['Category']), axis=1)

print("   판매 Tag 분포:")
print(df['ITEM_SALES_TAG'].value_counts())

# ============================================================================
# 5. 금액 컬럼 변환 (부가세 제외 + 환율)
# ============================================================================
print(f"\n5. 금액 변환 (부가세 + 환율)")

# Gross Sales (택매출): 환율만 적용
df['GROSS_SALES_HKD'] = df['Gross_Sales'] / exchange_rate

# Net Sales (실판매출): 부가세 제외 + 환율
df['NET_SALES_HKD'] = df['Gross_Sales'] / VAT_RATE / exchange_rate

# 기타 금액 컬럼
df['NET_AC_PP_HKD'] = df['Net_AcP_P'] / exchange_rate
df['AC_SALES_GROSS_HKD'] = df['AC_Sales_Gross'] / exchange_rate
df['STOCK_COST_HKD'] = df['Stock_Cost'] / exchange_rate
df['STOCK_PRICE_HKD'] = df['Stock_Price'] / exchange_rate

print(f"   부가세율: {VAT_RATE}")
print(f"   환율: {exchange_rate}")

# ============================================================================
# 6. 출력 컬럼 정리
# ============================================================================
print(f"\n6. 출력 컬럼 정리")

output_df = pd.DataFrame({
    'Period': df['Period'],
    'Brand': df['Brand'],
    'Country': df['Country'],
    'Channel': df['Channel'],  # 추가
    'Season_Code': df['Season_Code'],
    'Category': df['Category'],
    'Subcategory': df['Subcategory'],
    'Subcategory_Code': df['Subcategory_Code'],
    'Store_Code': df['Store_Code'],
    'Store_Name': df['Store_Name'],
    'Gross_Sales': df['GROSS_SALES_HKD'],  # 이미 HKD 변환 완료
    'Net_Sales': df['NET_SALES_HKD'],  # 이미 VAT 제외 + HKD 변환 완료
    'Net_AcP_P': df['NET_AC_PP_HKD'],
    'AC_Sales_Gross': df['AC_SALES_GROSS_HKD'],
    'Stock_Cost': df['STOCK_COST_HKD'],
    'Stock_Price': df['STOCK_PRICE_HKD'],
    'Stock_Qty': df['Stock_Qty'],
    'Sales_Qty': df['Sales_Qty'],
    'ITEM_SALES_TAG': df['ITEM_SALES_TAG'],
    'ITEM_ENDING_STOCK_TAG': df['ITEM_ENDING_STOCK_TAG']
})

# 숫자 반올림 (소수점 2자리)
numeric_cols = ['Gross_Sales', 'Net_Sales', 'Net_AcP_P', 'AC_Sales_Gross', 'Stock_Cost', 'Stock_Price']
for col in numeric_cols:
    output_df[col] = output_df[col].round(2)

print(f"   출력 컬럼 수: {len(output_df.columns)}")

# ============================================================================
# 7. CSV 저장
# ============================================================================
print(f"\n7. CSV 저장: {OUTPUT_CSV}")
output_df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
print(f"   {len(output_df):,}개 로우 저장 완료")

# ============================================================================
# 8. 검증
# ============================================================================
print(f"\n" + "=" * 80)
print("검증")
print("=" * 80)

# 2512 악세사리 판매 (ITEM_SALES_TAG 기준)
df_2512 = output_df[output_df['Period'] == CURRENT_PERIOD]
acc_sales_tags = ['모자', '신발', '가방', '기타ACC']

print(f"\n[2512 악세사리 판매 - Gross Sales]")
for tag in acc_sales_tags:
    tag_data = df_2512[df_2512['ITEM_SALES_TAG'] == tag]
    total = tag_data['Gross_Sales'].sum()
    print(f"  {tag}: {total:,.2f} HKD = {total/1000:,.2f} K HKD ({len(tag_data)} rows)")

# 2512 악세사리 재고 (ITEM_ENDING_STOCK_TAG 기준)
print(f"\n[2512 악세사리 재고 - Stock Price]")
for tag in acc_sales_tags:
    tag_data = df_2512[df_2512['ITEM_ENDING_STOCK_TAG'] == tag]
    total = tag_data['Stock_Price'].sum()
    print(f"  {tag}: {total:,.2f} HKD = {total/1000:,.2f} K HKD ({len(tag_data)} rows)")

# 2412 비교
df_2412 = output_df[output_df['Period'] == PREV_PERIOD]
print(f"\n[2412 악세사리 재고 - Stock Price]")
for tag in acc_sales_tags:
    tag_data = df_2412[df_2412['ITEM_ENDING_STOCK_TAG'] == tag]
    total = tag_data['Stock_Price'].sum()
    print(f"  {tag}: {total:,.2f} HKD = {total/1000:,.2f} K HKD ({len(tag_data)} rows)")

print(f"\n" + "=" * 80)
print("전처리 완료!")
print("=" * 80)
