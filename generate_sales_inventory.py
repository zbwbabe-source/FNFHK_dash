"""
홍콩 대시보드 - 매출/재고 데이터 자동 생성
CSV에서 매출과 재고 관련 데이터만 추출하여 JSON 생성
손익/영업비 데이터는 별도 JSON(hongkong-financial.json)에서 관리
"""

import pandas as pd
import json
from datetime import datetime
import sys
import io

# Windows 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 80)
print("홍콩 대시보드 - 매출/재고 데이터 자동 생성")
print("=" * 80)

# ========================================
# 설정
# ========================================
TARGET_PERIOD = 2510  # 2025년 10월
PREV_PERIOD = 2410    # 2024년 10월 (전년 동월)

csv_path = '../Dashboard_Raw_Data/24012510 홍콩재고수불.csv'

# CSV 로드
print(f"\nCSV 로드 중: {csv_path}")
df = pd.read_csv(csv_path)
print(f"총 {len(df):,}개 레코드 로드 완료")

df_current = df[df['Period'] == TARGET_PERIOD]
df_prev = df[df['Period'] == PREV_PERIOD]

print(f"기준월: {TARGET_PERIOD} ({len(df_current):,}개 레코드)")
print(f"전년월: {PREV_PERIOD} ({len(df_prev):,}개 레코드)")

# ========================================
# 1. 채널별 매출 데이터
# ========================================
print("\n[1/7] 채널별 매출 데이터 생성 중...")

def get_channel_sales():
    current = df_current.groupby(['Country', 'Channel']).agg({
        'Net_Sales': 'sum',
        'Gross_Sales': 'sum',
        'Stock_Price': 'sum',
        'Stock_Cost': 'sum'
    }).round(0)
    
    prev = df_prev.groupby(['Country', 'Channel']).agg({
        'Net_Sales': 'sum'
    }).round(0)
    
    result = {}
    for idx in current.index:
        country, channel = idx
        key = f"{country}_{channel}"
        net_sales = current.loc[idx, 'Net_Sales']
        gross_sales = current.loc[idx, 'Gross_Sales']
        prev_sales = prev.loc[idx, 'Net_Sales'] if idx in prev.index else 0
        
        result[key] = {
            "country": country,
            "channel": channel,
            "net_sales": float(net_sales),
            "gross_sales": float(gross_sales),
            "stock_price": float(current.loc[idx, 'Stock_Price']),
            "stock_cost": float(current.loc[idx, 'Stock_Cost']),
            "prev_sales": float(prev_sales),
            "yoy": round((net_sales / prev_sales * 100) if prev_sales > 0 else 0, 1),
            "discount_rate": round((1 - net_sales / gross_sales) * 100, 1) if gross_sales > 0 else 0
        }
    
    return result

channels = get_channel_sales()
print(f"   {len(channels)}개 채널 데이터 생성 완료")

# ========================================
# 2. 월별 YOY 추세 (1-10월)
# ========================================
print("[2/7] 월별 YOY 추세 생성 중...")

def get_monthly_yoy():
    result = {}
    
    for month in range(1, 11):
        period_25 = 2500 + month
        period_24 = 2400 + month
        
        df_25 = df[df['Period'] == period_25]
        df_24 = df[df['Period'] == period_24]
        
        if len(df_24) == 0:
            continue
            
        sales_25 = df_25.groupby(['Country', 'Channel'])['Net_Sales'].sum()
        sales_24 = df_24.groupby(['Country', 'Channel'])['Net_Sales'].sum()
        
        for idx in sales_25.index:
            country, channel = idx
            key = f"{country}_{channel}"
            
            if key not in result:
                result[key] = []
            
            yoy = round((sales_25[idx] / sales_24[idx] * 100) if idx in sales_24.index and sales_24[idx] > 0 else 0, 0)
            result[key].append(int(yoy))
    
    return result

monthly_yoy = get_monthly_yoy()
print(f"   월별 추세 데이터 생성 완료")

# ========================================
# 2-1. 월별 채널별 실제 매출액 (차트용)
# ========================================
print("[2-1/7] 월별 채널별 매출액 생성 중...")

def get_monthly_channel_sales():
    """월별 채널별 실제 매출액 추출 (1월~10월)"""
    result = []
    
    for month in range(1, 11):
        period = 2500 + month
        df_month = df[df['Period'] == period]
        
        if len(df_month) == 0:
            continue
        
        # 채널별 매출 집계
        sales_by_channel = df_month.groupby(['Country', 'Channel'])['Net_Sales'].sum()
        
        month_data = {
            'month': f'{month}월',
            'month_num': month,
            'period': period
        }
        
        # 각 채널별 매출 추가
        for idx in sales_by_channel.index:
            country, channel = idx
            key = f"{country} {channel}"
            # HKD를 1K 단위로 변환 (차트 표시용)
            month_data[key] = round(sales_by_channel[idx] / 1000, 0)
        
        # 총합계
        month_data['total'] = sum([v for k, v in month_data.items() if k not in ['month', 'month_num', 'period']])
        
        result.append(month_data)
    
    return result

monthly_channel_sales = get_monthly_channel_sales()
print(f"   {len(monthly_channel_sales)}개월 채널별 매출 데이터 생성 완료")

# ========================================
# 3. 카테고리별 매출
# ========================================
print("[3/7] 카테고리별 매출 생성 중...")

def get_category_sales():
    category_mapping = {
        'INN': '의류', 'OUT': '의류', 'BOT': '의류', 'WTC': '의류',
        'HEA': '모자', 'SHO': '신발', 'BAG': '가방', 'ATC': '악세'
    }
    
    df_current_copy = df_current.copy()
    df_prev_copy = df_prev.copy()
    
    def classify_item(row):
        category = row['Category']
        season_type = row['Season_Type']
        
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                return '과시즌의류'
            else:
                return '당시즌의류'
        
        return category_mapping.get(category, '기타')
    
    df_current_copy['item_type'] = df_current_copy.apply(classify_item, axis=1)
    df_prev_copy['item_type'] = df_prev_copy.apply(classify_item, axis=1)
    
    current = df_current_copy.groupby('item_type').agg({
        'Net_Sales': 'sum',
        'Gross_Sales': 'sum'
    })
    prev = df_prev_copy.groupby('item_type')['Net_Sales'].sum()
    
    result = {}
    for item in current.index:
        result[item] = {
            "sales": float(current.loc[item, 'Net_Sales']),
            "gross_sales": float(current.loc[item, 'Gross_Sales']),
            "prev_sales": float(prev[item]) if item in prev.index else 0,
            "yoy": round((current.loc[item, 'Net_Sales'] / prev[item] * 100) if item in prev.index and prev[item] > 0 else 0, 1)
        }
    
    return result

categories = get_category_sales()
print(f"   {len(categories)}개 카테고리 데이터 생성 완료")

# ========================================
# 4. 아이템별 월별 YOY
# ========================================
print("[4/7] 아이템별 월별 YOY 생성 중...")

def get_item_monthly_yoy():
    def classify_item(row):
        category = row['Category']
        season_type = row['Season_Type']
        
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                return '과시즌의류'
            else:
                return '당시즌의류'
        elif category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category in ['BAG', 'ATC']:
            return '가방외'
        
        return '기타'
    
    result = {}
    
    for month in range(1, 11):
        period_25 = 2500 + month
        period_24 = 2400 + month
        
        df_25 = df[df['Period'] == period_25].copy()
        df_24 = df[df['Period'] == period_24].copy()
        
        if len(df_24) == 0:
            continue
        
        df_25['item_type'] = df_25.apply(classify_item, axis=1)
        df_24['item_type'] = df_24.apply(classify_item, axis=1)
        
        sales_25 = df_25.groupby('item_type')['Net_Sales'].sum()
        sales_24 = df_24.groupby('item_type')['Net_Sales'].sum()
        
        for item in sales_25.index:
            if item not in result:
                result[item] = []
            
            yoy = round((sales_25[item] / sales_24[item] * 100) if item in sales_24.index and sales_24[item] > 0 else 0, 0)
            result[item].append(int(yoy))
    
    return result

item_monthly_yoy = get_item_monthly_yoy()
print(f"   {len(item_monthly_yoy)}개 아이템 월별 추세 생성 완료")

# ========================================
# 4-1. 아이템별 월별 실제 매출액 (차트용)
# ========================================
print("[4-1/7] 아이템별 월별 매출액 생성 중...")

def get_monthly_item_sales():
    """월별 아이템별 실제 매출액 추출 (1월~10월)"""
    def classify_item(row):
        category = row['Category']
        season_type = row['Season_Type']
        
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                return '과시즌의류'
            else:
                return '당시즌의류'
        elif category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category in ['BAG', 'ATC']:
            return '가방외'
        
        return '기타'
    
    result = []
    
    for month in range(1, 11):
        period = 2500 + month
        df_month = df[df['Period'] == period].copy()
        
        if len(df_month) == 0:
            continue
        
        df_month['item_type'] = df_month.apply(classify_item, axis=1)
        sales_by_item = df_month.groupby('item_type')['Net_Sales'].sum()
        
        month_data = {
            'month': f'{month}월',
            'month_num': month,
            'period': period
        }
        
        # 각 아이템별 매출 추가 (1K 단위)
        for item in sales_by_item.index:
            month_data[item] = round(sales_by_item[item] / 1000, 0)
        
        # 총합계
        month_data['total'] = sum([v for k, v in month_data.items() if k not in ['month', 'month_num', 'period']])
        
        result.append(month_data)
    
    return result

monthly_item_sales = get_monthly_item_sales()
print(f"   {len(monthly_item_sales)}개월 아이템별 매출 데이터 생성 완료")

# ========================================
# 4-2. 아이템별 월별 매출 데이터 (item_sales_data.json 형식)
# ========================================
print("[4-2/8] 아이템별 월별 매출 데이터 (차트용) 생성 중...")

def get_item_sales_data():
    """item_sales_data.json 형식으로 데이터 생성 (아이템별 월별 배열)"""
    def classify_item(row):
        category = row['Category']
        season_type = row['Season_Type']
        
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                return '과시즌의류'
            else:
                # 당시즌은 F/S로 구분 필요
                # Season_Type에서 F/S 구분 (예: '25FW', '25SS')
                if 'FW' in season_type or 'F' in season_type:
                    return '당시즌F'
                elif 'SS' in season_type or 'S' in season_type:
                    return '당시즌S'
                else:
                    # 기본값은 F로 처리
                    return '당시즌F'
        elif category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category in ['BAG', 'ATC']:
            return '가방외'
        
        return '기타'
    
    # 아이템 목록 (순서 보장)
    item_list = ['당시즌F', '당시즌S', '과시즌의류', '모자', '신발', '가방외']
    
    # 초기화
    net_sales_data = {item: [] for item in item_list}
    gross_sales_data = {item: [] for item in item_list}
    yoy_data = {item: [] for item in item_list}
    yoy_data['합계'] = []
    
    # 월별 데이터 추출
    for month in range(1, 11):
        period_25 = 2500 + month
        period_24 = 2400 + month
        
        df_25 = df[df['Period'] == period_25].copy()
        df_24 = df[df['Period'] == period_24].copy()
        
        if len(df_25) == 0:
            # 데이터가 없으면 0 또는 null 추가
            for item in item_list:
                net_sales_data[item].append(0)
                gross_sales_data[item].append(0)
                yoy_data[item].append(None)
            yoy_data['합계'].append(None)
            continue
        
        df_25['item_type'] = df_25.apply(classify_item, axis=1)
        
        # 25년 데이터
        sales_25_net = df_25.groupby('item_type')['Net_Sales'].sum()
        sales_25_gross = df_25.groupby('item_type')['Gross_Sales'].sum()
        
        # 24년 데이터 (YOY 계산용)
        if len(df_24) > 0:
            df_24['item_type'] = df_24.apply(classify_item, axis=1)
            sales_24_net = df_24.groupby('item_type')['Net_Sales'].sum()
        else:
            sales_24_net = pd.Series(dtype=float)
        
        # 각 아이템별로 데이터 추가 (1K 단위)
        total_net_25 = 0
        total_net_24 = 0
        
        for item in item_list:
            net_val = round(sales_25_net.get(item, 0) / 1000, 0) if item in sales_25_net.index else 0
            gross_val = round(sales_25_gross.get(item, 0) / 1000, 0) if item in sales_25_gross.index else 0
            
            net_sales_data[item].append(int(net_val))
            gross_sales_data[item].append(int(gross_val))
            
            # YOY 계산
            net_24_val = sales_24_net.get(item, 0) if item in sales_24_net.index else 0
            if net_24_val > 0:
                yoy = round((sales_25_net.get(item, 0) / net_24_val * 100) if item in sales_25_net.index else 0, 0)
                yoy_data[item].append(int(yoy))
            else:
                yoy_data[item].append(None)
            
            total_net_25 += sales_25_net.get(item, 0) if item in sales_25_net.index else 0
            total_net_24 += net_24_val
        
        # 합계 YOY
        if total_net_24 > 0:
            yoy_total = round((total_net_25 / total_net_24 * 100), 0)
            yoy_data['합계'].append(int(yoy_total))
        else:
            yoy_data['합계'].append(None)
    
    return {
        "net_sales": net_sales_data,
        "gross_sales": gross_sales_data,
        "yoy": yoy_data
    }

item_sales_data = get_item_sales_data()
print(f"   아이템별 월별 매출 데이터 생성 완료")

# ========================================
# 5. 재고 데이터
# ========================================
print("[5/8] 재고 데이터 생성 중...")

def get_inventory_data():
    total_stock = float(df_current['Stock_Price'].sum())
    total_stock_prev = float(df_prev['Stock_Price'].sum())
    total_cost = float(df_current['Stock_Cost'].sum())
    
    # 시즌타입별 재고
    season_stock = df_current.groupby('Season_Type').agg({
        'Stock_Price': 'sum',
        'Stock_Cost': 'sum',
        'Stock_Qty': 'sum'
    })
    season_stock_prev = df_prev.groupby('Season_Type')['Stock_Price'].sum()
    
    season_data = {}
    for season in season_stock.index:
        stock = season_stock.loc[season, 'Stock_Price']
        prev_stock = season_stock_prev[season] if season in season_stock_prev.index else 0
        season_data[season] = {
            "stock_price": float(stock),
            "stock_cost": float(season_stock.loc[season, 'Stock_Cost']),
            "stock_qty": int(season_stock.loc[season, 'Stock_Qty']),
            "prev_stock": float(prev_stock),
            "yoy": round((stock / prev_stock * 100) if prev_stock > 0 else 0, 1)
        }
    
    # 카테고리별 재고
    category_stock = df_current.groupby('Category').agg({
        'Stock_Price': 'sum',
        'Stock_Cost': 'sum'
    })
    
    category_data = {}
    for cat in category_stock.index:
        category_data[cat] = {
            "stock_price": float(category_stock.loc[cat, 'Stock_Price']),
            "stock_cost": float(category_stock.loc[cat, 'Stock_Cost'])
        }
    
    return {
        "total_price": total_stock,
        "total_cost": total_cost,
        "total_price_prev": total_stock_prev,
        "yoy": round((total_stock / total_stock_prev * 100) if total_stock_prev > 0 else 0, 1),
        "by_season": season_data,
        "by_category": category_data
    }

inventory = get_inventory_data()
print(f"   재고 데이터 생성 완료")

# ========================================
# 5-1. 월별 아이템별 재고 데이터 (차트용)
# ========================================
print("[5-1/9] 월별 아이템별 재고 데이터 생성 중...")

def get_monthly_item_inventory():
    """월별 아이템별 재고 데이터 추출 (1월~10월)"""
    def classify_inventory_item(row):
        """재고 아이템 분류 (그래프용)"""
        category = row['Category']
        season_type = str(row['Season_Type'])
        
        # 의류 카테고리는 시즌타입으로 세분화
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                if 'FW' in season_type:
                    return '과시즌FW'
                elif 'SS' in season_type:
                    return '과시즌SS'
                else:
                    return '과시즌FW'  # 기본값
            else:
                # 당시즌
                if 'FW' in season_type or 'F' in season_type:
                    return 'F당시즌'
                elif 'SS' in season_type or 'S' in season_type:
                    return 'S당시즌'
                else:
                    return 'F당시즌'  # 기본값
        elif category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category in ['BAG', 'ATC']:
            return '가방외'
        
        return '기타'
    
    result = []
    
    for month in range(1, 11):
        period = 2500 + month
        df_month = df[df['Period'] == period].copy()
        
        if len(df_month) == 0:
            continue
        
        df_month['inventory_item_type'] = df_month.apply(classify_inventory_item, axis=1)
        inventory_by_item = df_month.groupby('inventory_item_type')['Stock_Price'].sum()
        
        month_data = {
            'month': f'{month}월',
            'month_num': month,
            'period': period
        }
        
        # 각 아이템별 재고 추가 (1K 단위)
        item_keys = ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외']
        for item in item_keys:
            month_data[item] = round(inventory_by_item.get(item, 0) / 1000, 0) if item in inventory_by_item.index else 0
        
        # 총합계
        month_data['total'] = sum([v for k, v in month_data.items() if k not in ['month', 'month_num', 'period']])
        
        result.append(month_data)
    
    return result

monthly_item_inventory = get_monthly_item_inventory()
print(f"   {len(monthly_item_inventory)}개월 아이템별 재고 데이터 생성 완료")

# ========================================
# 5-2. 월별 아이템별 재고 YOY 데이터
# ========================================
print("[5-2/9] 월별 아이템별 재고 YOY 데이터 생성 중...")

def get_monthly_item_inventory_yoy():
    """월별 아이템별 재고 YOY 데이터 추출 (1월~10월)"""
    def classify_inventory_item(row):
        """재고 아이템 분류 (그래프용)"""
        category = row['Category']
        season_type = str(row['Season_Type'])
        
        # 의류 카테고리는 시즌타입으로 세분화
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                if 'FW' in season_type:
                    return '과시즌FW'
                elif 'SS' in season_type:
                    return '과시즌SS'
                else:
                    return '과시즌FW'  # 기본값
            else:
                # 당시즌
                if 'FW' in season_type or 'F' in season_type:
                    return 'F당시즌'
                elif 'SS' in season_type or 'S' in season_type:
                    return 'S당시즌'
                else:
                    return 'F당시즌'  # 기본값
        elif category == 'HEA':
            return '모자'
        elif category == 'SHO':
            return '신발'
        elif category in ['BAG', 'ATC']:
            return '가방외'
        
        return '기타'
    
    result = {}
    item_keys = ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외']
    
    # 초기화
    for item in item_keys:
        result[item] = []
    
    for month in range(1, 11):
        period_25 = 2500 + month
        period_24 = 2400 + month
        
        df_25 = df[df['Period'] == period_25].copy()
        df_24 = df[df['Period'] == period_24].copy()
        
        if len(df_25) == 0:
            # 데이터가 없으면 null 추가
            for item in item_keys:
                result[item].append(None)
            continue
        
        if len(df_24) == 0:
            # 전년도 데이터가 없으면 null 추가
            for item in item_keys:
                result[item].append(None)
            continue
        
        df_25['inventory_item_type'] = df_25.apply(classify_inventory_item, axis=1)
        df_24['inventory_item_type'] = df_24.apply(classify_inventory_item, axis=1)
        
        inventory_25 = df_25.groupby('inventory_item_type')['Stock_Price'].sum()
        inventory_24 = df_24.groupby('inventory_item_type')['Stock_Price'].sum()
        
        # 각 아이템별로 YOY 계산
        for item in item_keys:
            stock_25 = inventory_25.get(item, 0) if item in inventory_25.index else 0
            stock_24 = inventory_24.get(item, 0) if item in inventory_24.index else 0
            
            if stock_24 > 0:
                yoy = round((stock_25 / stock_24 * 100), 0)
                result[item].append(int(yoy))
            else:
                result[item].append(None)
    
    return result

item_monthly_inventory_yoy = get_monthly_item_inventory_yoy()
print(f"   아이템별 재고 YOY 데이터 생성 완료")

# ========================================
# 6. 매장별 데이터
# ========================================
print("[6/9] 매장별 데이터 생성 중...")

def get_store_data():
    stores = df_current.groupby(['Store_Code', 'Store_Name', 'Channel', 'Country']).agg({
        'Net_Sales': 'sum',
        'Gross_Sales': 'sum',
        'Stock_Price': 'sum',
        'Stock_Cost': 'sum'
    }).reset_index()
    
    stores_prev = df_prev.groupby(['Store_Code']).agg({
        'Net_Sales': 'sum'
    })
    
    result = []
    for _, row in stores.iterrows():
        store_code = row['Store_Code']
        prev_sales = stores_prev.loc[store_code, 'Net_Sales'] if store_code in stores_prev.index else 0
        
        result.append({
            "code": store_code,
            "name": row['Store_Name'],
            "channel": row['Channel'],
            "country": row['Country'],
            "sales": float(row['Net_Sales']),
            "gross_sales": float(row['Gross_Sales']),
            "stock_price": float(row['Stock_Price']),
            "stock_cost": float(row['Stock_Cost']),
            "prev_sales": float(prev_sales),
            "yoy": round((row['Net_Sales'] / prev_sales * 100) if prev_sales > 0 else 0, 1)
        })
    
    return sorted(result, key=lambda x: x['sales'], reverse=True)

stores = get_store_data()
print(f"   {len(stores)}개 매장 데이터 생성 완료")

# ========================================
# 7. 종합 요약
# ========================================
print("[7/9] 종합 데이터 생성 중...")

total_sales = float(df_current['Net_Sales'].sum())
total_sales_prev = float(df_prev['Net_Sales'].sum())
total_gross_sales = float(df_current['Gross_Sales'].sum())

output_data = {
    "meta": {
        "period": TARGET_PERIOD,
        "period_name": "2025년 10월",
        "prev_period": PREV_PERIOD,
        "prev_period_name": "2024년 10월",
        "generated_at": datetime.now().isoformat(),
        "csv_source": csv_path,
        "record_count": len(df_current),
        "description": "CSV에서 자동 생성된 매출/재고 데이터"
    },
    "summary": {
        "total_sales": total_sales,
        "total_sales_prev": total_sales_prev,
        "sales_yoy": round((total_sales / total_sales_prev * 100) if total_sales_prev > 0 else 0, 1),
        "total_gross_sales": total_gross_sales,
        "discount_rate": round((1 - total_sales / total_gross_sales) * 100, 1),
        "total_stock_price": inventory['total_price'],
        "total_stock_cost": inventory['total_cost'],
        "total_stock_prev": inventory['total_price_prev'],
        "stock_yoy": inventory['yoy']
    },
    "channels": channels,
    "monthly_yoy": monthly_yoy,
    "monthly_channel_sales": monthly_channel_sales,  # 🆕 월별 채널별 매출
    "categories": categories,
    "item_monthly_yoy": item_monthly_yoy,
    "monthly_item_sales": monthly_item_sales,  # 🆕 월별 아이템별 매출
    "monthly_item_inventory": monthly_item_inventory,  # 🆕 월별 아이템별 재고
    "item_monthly_inventory_yoy": item_monthly_inventory_yoy,  # 🆕 월별 아이템별 재고 YOY
    "inventory": inventory,
    "stores": stores
}

# JSON 저장
output_file = 'components/dashboard/hongkong-sales-inventory.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"\n{output_file} 생성 완료!")

# ========================================
# 8. item_sales_data.json 생성
# ========================================
print("\n[8/8] item_sales_data.json 생성 중...")

item_sales_output_file = 'components/dashboard/item_sales_data.json'
with open(item_sales_output_file, 'w', encoding='utf-8') as f:
    json.dump(item_sales_data, f, ensure_ascii=False, indent=2)

print(f"{item_sales_output_file} 생성 완료!")
print("=" * 80)
print("\n생성된 데이터 요약:")
print(f"   총매출: {total_sales:,.0f} HKD (YOY {output_data['summary']['sales_yoy']}%)")
print(f"   총재고: {inventory['total_price']:,.0f} HKD (YOY {inventory['yoy']}%)")
print(f"   채널수: {len(channels)}개")
print(f"   매장수: {len(stores)}개")
print(f"   할인율: {output_data['summary']['discount_rate']}%")
print("\n매출/재고 데이터 생성 완료!")
print("=" * 80)

# ========================================
# TSX 파일 자동 업데이트
# ========================================
print("\n[추가] TSX 파일 차트 데이터 자동 업데이트 중...")

tsx_file = 'components/dashboard/hongkong-report.tsx'

# 차트 데이터 코드 생성
chart_data_lines = []
for m in monthly_channel_sales:
    line = f"              {{ month: '{m['month']}', 'HK Retail': {m['HK Retail']:.0f}, 'HK Outlet': {m['HK Outlet']:.0f}, 'HK Online': {m['HK Online']:.0f}, 'MC Retail': {m['MO Retail']:.0f}, 'MC Outlet': {m['MO Outlet']:.0f}, total: {m['total']:.0f} }},"
    chart_data_lines.append(line)

chart_data_code = '\n'.join(chart_data_lines)

# TSX 파일 읽기
try:
    with open(tsx_file, 'r', encoding='utf-8') as f:
        tsx_content = f.read()
    
    # 마커 찾기
    start_marker = '// AUTO-GENERATED-CHART-DATA-START'
    end_marker = '// AUTO-GENERATED-CHART-DATA-END'
    
    if start_marker in tsx_content and end_marker in tsx_content:
        # 마커 사이의 내용 교체
        start_idx = tsx_content.find(start_marker)
        end_idx = tsx_content.find(end_marker)
        
        before = tsx_content[:start_idx + len(start_marker)]
        after = tsx_content[end_idx:]
        
        new_content = f"{before}\n{chart_data_code}\n            {after}"
        
        # TSX 파일 쓰기
        with open(tsx_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"   ✅ {tsx_file} 차트 데이터 자동 업데이트 완료!")
    else:
        print(f"   ⚠️  마커를 찾을 수 없습니다. 수동으로 차트 코드를 업데이트해주세요.")
        print(f"\n   다음 코드를 복사하여 사용하세요:")
        print("   " + "=" * 70)
        print(chart_data_code)
        print("   " + "=" * 70)
        
except Exception as e:
    print(f"   ❌ TSX 파일 업데이트 실패: {e}")
    print(f"\n   다음 코드를 수동으로 복사하여 사용하세요:")
    print("   " + "=" * 70)
    print(chart_data_code)
    print("   " + "=" * 70)

print("\n" + "=" * 80)
print("🎉 모든 작업 완료!")
print("=" * 80)

