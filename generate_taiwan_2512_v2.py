"""
대만 대시보드 2512 데이터 생성 (전처리 통합)
CSV → 자동 전처리 → JSON 생성
"""
import sys
import os

# generate_taiwan_dashboard_data.py의 경로 추가
sys.path.insert(0, os.path.dirname(__file__))

# 전처리 함수 정의
def preprocess_csv_data(data, exchange_rate):
    """
    CSV 데이터를 전처리하여 Tag 추가
    """
    import pandas as pd
    
    def get_item_tag(season_code, category):
        """아이템 Tag 생성 (판매/재고 공통)"""
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
    
    # 각 row에 Tag 추가
    for row in data:
        season_code = row.get('Season_Code', '')
        category = row.get('Category', '')
        
        # Tag 생성
        tag = get_item_tag(season_code, category)
        row['ITEM_SALES_TAG'] = tag
        row['ITEM_ENDING_STOCK_TAG'] = tag
    
    return data

# generate_taiwan_dashboard_data 모듈 import
from generate_taiwan_dashboard_data import generate_dashboard

# CSV 파일 경로
csv_file = '../Dashboard_Raw_Data/TW/2512/TW_Inventory_2312_2512_v5.2.csv'
output_file = 'components/dashboard/taiwan-dashboard-data.json'

# 환율 파일
exchange_rate_file = '../Dashboard_Raw_Data/TW/2512/TW_Exchange Rate 2512.csv'

# Period 설정
period = 2512

print(f"대만 대시보드 {period} 데이터 생성 시작...")
print(f"CSV 파일: {csv_file}")
print(f"출력 파일: {output_file}")

# 대시보드 생성 (전처리 함수 포함)
generate_dashboard(
    csv_file=csv_file,
    output_file=output_file,
    period=period,
    exchange_rate_file=exchange_rate_file,
    preprocess_func=preprocess_csv_data
)

print(f"✅ 대만 대시보드 {period} 데이터 생성 완료!")
