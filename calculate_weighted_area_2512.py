import pandas as pd
import json
import os

def calculate_weighted_area():
    """
    연간 가중평균 평수 계산
    - 각 매장의 월별 순매출이 1K HKD 이상인 경우에만 해당 월에 평수 포함
    - 가중평균 = (각 월의 평수 합계) / 12개월
    """
    
    pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL 2512.csv"
    
    if not os.path.exists(pl_file):
        print(f"파일이 없습니다: {pl_file}")
        return
    
    # 면적 데이터 로드
    with open('public/dashboard/hongkong-dashboard-cumulative-2512.json', 'r', encoding='utf-8') as f:
        cumulative_data = json.load(f)
    
    store_areas = {}
    if cumulative_data.get('store_summary'):
        for code, store in cumulative_data['store_summary'].items():
            area = store.get('area', 0)
            if area > 0:
                store_areas[code] = area
    
    print(f"총 매장 수: {len(store_areas)}")
    
    # PL 데이터 로드
    df = pd.read_csv(pl_file, encoding='utf-8-sig')
    df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
    
    # MLB 홍콩/마카오만
    df_mlb = df[(df['BRD_CD'] == 'M') & (df['CNTRY_CD'].isin(['HK', 'MC']))]
    
    # 실매출액 계정만 필터링
    net_sales_df = df_mlb[df_mlb['ACCOUNT_NM'] == '실매출액']
    
    # 당년 (2025년 1월~12월) 가중평균 계산
    current_year = 2025
    monthly_areas_current = []
    
    for month in range(1, 13):
        period = current_year * 100 + month
        month_data = net_sales_df[net_sales_df['PERIOD'] == period]
        
        # 이번 달 순매출 1K 이상인 매장의 면적 합계
        month_area = 0
        for shop_cd in store_areas.keys():
            if shop_cd in ['H99', 'M99']:  # 오피스 제외
                continue
            sales = month_data[month_data['SHOP_CD'] == shop_cd]['VALUE'].sum()
            if sales >= 1000:  # 1K HKD 이상
                month_area += store_areas[shop_cd]
        
        monthly_areas_current.append(month_area)
        print(f"{current_year}년 {month:02d}월: {month_area}평")
    
    weighted_avg_current = sum(monthly_areas_current) / 12
    
    # 전년 (2024년 1월~12월) 가중평균 계산
    prev_year = 2024
    monthly_areas_prev = []
    
    for month in range(1, 13):
        period = prev_year * 100 + month
        month_data = net_sales_df[net_sales_df['PERIOD'] == period]
        
        month_area = 0
        for shop_cd in store_areas.keys():
            if shop_cd in ['H99', 'M99']:
                continue
            sales = month_data[month_data['SHOP_CD'] == shop_cd]['VALUE'].sum()
            if sales >= 1000:
                month_area += store_areas[shop_cd]
        
        monthly_areas_prev.append(month_area)
        print(f"{prev_year}년 {month:02d}월: {month_area}평")
    
    weighted_avg_prev = sum(monthly_areas_prev) / 12
    
    print("\n=== 결과 ===")
    print(f"2025년 가중평균 평수: {weighted_avg_current:.1f}평")
    print(f"2024년 가중평균 평수: {weighted_avg_prev:.1f}평")
    
    # JSON 파일에 저장
    output = {
        "current_year": current_year,
        "previous_year": prev_year,
        "weighted_average_area": {
            "current": round(weighted_avg_current, 1),
            "previous": round(weighted_avg_prev, 1)
        },
        "monthly_areas": {
            "current": monthly_areas_current,
            "previous": monthly_areas_prev
        }
    }
    
    output_file = 'public/dashboard/hongkong-weighted-area-2512.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n저장 완료: {output_file}")
    
    return output

if __name__ == "__main__":
    calculate_weighted_area()
