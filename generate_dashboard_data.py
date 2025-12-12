import pandas as pd
import json
from datetime import datetime
import sys
import io

# Windows 인코딩 문제 해결
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("홍콩 대시보드 데이터 생성 시작...")
print("=" * 80)

# CSV 로드
csv_path = '../Dashboard_Raw_Data/HKMC/2511/HKMC_Inventory_2511.csv'
print(f"CSV 로드 중: {csv_path}")
df = pd.read_csv(csv_path)
print(f"{len(df):,}개 레코드 로드 완료\n")

# 기준월 설정
TARGET_PERIOD = 2510  # 2025년 10월
PREV_PERIOD = 2410    # 2024년 10월 (전년 동월)

df_current = df[df['Period'] == TARGET_PERIOD]
df_prev = df[df['Period'] == PREV_PERIOD]

print(f"기준월: {TARGET_PERIOD} ({len(df_current):,}개 레코드)")
print(f"전년월: {PREV_PERIOD} ({len(df_prev):,}개 레코드)\n")

# ========================================
# 1. 채널별 매출 데이터
# ========================================
print("1. 채널별 매출 데이터 생성 중...")

def get_channel_sales():
    """채널별 실판매출 및 YOY"""
    current = df_current.groupby(['Country', 'Channel']).agg({
        'Net_Sales': 'sum',
        'Gross_Sales': 'sum',
        'Stock_Price': 'sum'
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
            "net_sales": float(net_sales),
            "gross_sales": float(gross_sales),
            "stock": float(current.loc[idx, 'Stock_Price']),
            "prev_sales": float(prev_sales),
            "yoy": round((net_sales / prev_sales * 100) if prev_sales > 0 else 0, 1),
            "discount_rate": round((1 - net_sales / gross_sales) * 100, 1) if gross_sales > 0 else 0
        }
    
    return result

channels_data = get_channel_sales()
print(f"   {len(channels_data)}개 채널 데이터 생성")

# ========================================
# 2. 월별 YOY 추세 (1-10월)
# ========================================
print("2. 월별 YOY 추세 생성 중...")

def get_monthly_yoy():
    """1-10월 채널별 YOY 추세"""
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

monthly_yoy_data = get_monthly_yoy()
print(f"   10개월 추세 데이터 생성")

# ========================================
# 3. 카테고리별 매출 (아이템별)
# ========================================
print("3. 카테고리별 매출 생성 중...")

def get_category_sales():
    """카테고리별 매출 및 YOY"""
    # 대시보드의 아이템 분류 매핑
    category_mapping = {
        'INN': '의류',
        'OUT': '의류',
        'BOT': '의류',
        'WTC': '의류',
        'HEA': '모자',
        'SHO': '신발',
        'BAG': '가방',
        'ATC': '악세'
    }
    
    df_current_copy = df_current.copy()
    df_prev_copy = df_prev.copy()
    
    # 시즌타입으로 당시즌/과시즌 구분
    def classify_item(row):
        category = row['Category']
        season_type = row['Season_Type']
        
        # 의류 카테고리는 시즌타입으로 세분화
        if category in ['INN', 'OUT', 'BOT', 'WTC']:
            if '과시즌' in season_type:
                return '과시즌의류'
            else:
                return '당시즌의류'
        
        return category_mapping.get(category, '기타')
    
    df_current_copy['item_type'] = df_current_copy.apply(classify_item, axis=1)
    df_prev_copy['item_type'] = df_prev_copy.apply(classify_item, axis=1)
    
    current = df_current_copy.groupby('item_type')['Net_Sales'].sum()
    prev = df_prev_copy.groupby('item_type')['Net_Sales'].sum()
    
    result = {}
    for item in current.index:
        result[item] = {
            "sales": float(current[item]),
            "prev_sales": float(prev[item]) if item in prev.index else 0,
            "yoy": round((current[item] / prev[item] * 100) if item in prev.index and prev[item] > 0 else 0, 1)
        }
    
    # 합계 추가
    total_sales = sum([v['sales'] for v in result.values()])
    total_prev_sales = sum([v['prev_sales'] for v in result.values()])
    result['합계'] = {
        "sales": total_sales,
        "prev_sales": total_prev_sales,
        "yoy": round((total_sales / total_prev_sales * 100) if total_prev_sales > 0 else 0, 1)
    }
    
    return result

categories_data = get_category_sales()
print(f"   {len(categories_data)}개 카테고리 데이터 생성")

# ========================================
# 4. 아이템별 월별 YOY (1-10월)
# ========================================
print("4. 아이템별 월별 YOY 생성 중...")

def get_item_monthly_yoy():
    """아이템별 1-10월 YOY 추세"""
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
    
    # 합계 계산
    result['합계'] = []
    for month in range(1, 11):
        period_25 = 2500 + month
        period_24 = 2400 + month
        
        total_25 = df[df['Period'] == period_25]['Net_Sales'].sum()
        total_24 = df[df['Period'] == period_24]['Net_Sales'].sum()
        
        yoy = round((total_25 / total_24 * 100) if total_24 > 0 else 0, 0)
        result['합계'].append(int(yoy))
    
    return result

item_monthly_yoy = get_item_monthly_yoy()
print(f"   {len(item_monthly_yoy)}개 아이템 월별 추세 생성")

# ========================================
# 5. 재고 데이터
# ========================================
print("5. 재고 데이터 생성 중...")

def get_inventory_data():
    """총재고 및 카테고리별 재고"""
    total_stock = float(df_current['Stock_Price'].sum())
    total_stock_prev = float(df_prev['Stock_Price'].sum())
    
    # 시즌타입별 재고
    season_stock = df_current.groupby('Season_Type')['Stock_Price'].sum().to_dict()
    season_stock_prev = df_prev.groupby('Season_Type')['Stock_Price'].sum().to_dict()
    
    season_data = {}
    for season in set(list(season_stock.keys()) + list(season_stock_prev.keys())):
        stock = season_stock.get(season, 0)
        prev_stock = season_stock_prev.get(season, 0)
        season_data[season] = {
            "stock": float(stock),
            "prev_stock": float(prev_stock),
            "yoy": round((stock / prev_stock * 100) if prev_stock > 0 else 0, 1)
        }
    
    # 카테고리별 재고
    category_stock = df_current.groupby('Category')['Stock_Price'].sum().to_dict()
    category_stock_prev = df_prev.groupby('Category')['Stock_Price'].sum().to_dict()
    
    category_data = {}
    for cat in set(list(category_stock.keys()) + list(category_stock_prev.keys())):
        stock = category_stock.get(cat, 0)
        prev_stock = category_stock_prev.get(cat, 0)
        category_data[cat] = {
            "stock": float(stock),
            "prev_stock": float(prev_stock),
            "yoy": round((stock / prev_stock * 100) if prev_stock > 0 else 0, 1)
        }
    
    return {
        "total": total_stock,
        "total_prev": total_stock_prev,
        "total_yoy": round((total_stock / total_stock_prev * 100) if total_stock_prev > 0 else 0, 1),
        "by_season": season_data,
        "by_category": category_data
    }

inventory_data = get_inventory_data()
print(f"   총재고 및 시즌별/카테고리별 재고 생성")

# ========================================
# 6. 매장별 데이터
# ========================================
print("6. 매장별 데이터 생성 중...")

def get_store_data():
    """매장별 매출 및 재고"""
    stores = df_current.groupby(['Store_Code', 'Store_Name', 'Channel', 'Country']).agg({
        'Net_Sales': 'sum',
        'Gross_Sales': 'sum',
        'Stock_Price': 'sum'
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
            "stock": float(row['Stock_Price']),
            "prev_sales": float(prev_sales),
            "yoy": round((row['Net_Sales'] / prev_sales * 100) if prev_sales > 0 else 0, 1)
        })
    
    return sorted(result, key=lambda x: x['sales'], reverse=True)

stores_data = get_store_data()
print(f"   {len(stores_data)}개 매장 데이터 생성")

# ========================================
# 7. 영업비 데이터 (하드코딩 - CSV에 없는 데이터)
# ========================================
print("7. 영업비 데이터 생성 중...")

opex_data = {
    "monthly": {
        "total": 1451,
        "total_prev": 1117,
        "yoy": 130,
        "breakdown": {
            "marketing": {"amount": 657, "yoy": 215},
            "salary": {"amount": 605, "yoy": 137},
            "commission": {"amount": 131, "yoy": 243},
            "other": {"amount": 116, "yoy": 92},
            "rent": {"amount": 85, "yoy": 70},
            "depreciation": {"amount": 59, "yoy": 152},
            "travel": {"amount": 47, "yoy": 408},
            "insurance": {"amount": 17, "yoy": 92}
        }
    },
    "ytd": {
        "total": 13385,
        "total_prev": 12982,
        "yoy": 103,
        "breakdown": {
            "salary": {"amount": 5232, "yoy": 114},
            "marketing": {"amount": 3137, "yoy": 76},
            "commission": {"amount": 1964, "yoy": 194},
            "other": {"amount": 1210, "yoy": 92},
            "rent": {"amount": 1015, "yoy": 85},
            "depreciation": {"amount": 426, "yoy": 115},
            "travel": {"amount": 223, "yoy": 150},
            "insurance": {"amount": 179, "yoy": 88}
        }
    }
}

print(f"   당월 영업비: {opex_data['monthly']['total']}K, YOY {opex_data['monthly']['yoy']}%")

# ========================================
# 8. 종합 데이터 생성
# ========================================
print("\n종합 데이터 생성 중...")

dashboard_data = {
    "meta": {
        "period": TARGET_PERIOD,
        "period_name": "2025년 10월",
        "prev_period": PREV_PERIOD,
        "prev_period_name": "2024년 10월",
        "generated_at": datetime.now().isoformat(),
        "csv_source": csv_path,
        "record_count": len(df_current)
    },
    "summary": {
        "total_sales": float(df_current['Net_Sales'].sum()),
        "total_sales_prev": float(df_prev['Net_Sales'].sum()),
        "sales_yoy": round((df_current['Net_Sales'].sum() / df_prev['Net_Sales'].sum() * 100) if df_prev['Net_Sales'].sum() > 0 else 0, 1),
        "total_gross_sales": float(df_current['Gross_Sales'].sum()),
        "discount_rate": round((1 - df_current['Net_Sales'].sum() / df_current['Gross_Sales'].sum()) * 100, 1),
        "total_stock": inventory_data['total'],
        "total_stock_prev": inventory_data['total_prev'],
        "stock_yoy": inventory_data['total_yoy']
    },
    "channels": channels_data,
    "monthly_yoy": monthly_yoy_data,
    "categories": categories_data,
    "item_monthly_yoy": item_monthly_yoy,
    "inventory": inventory_data,
    "stores": stores_data,
    "opex": opex_data
}

# JSON 저장
output_file = 'components/dashboard/hongkong-data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, indent=2)

print(f"\n{output_file} 생성 완료!")
print("=" * 80)
print("\n생성된 데이터 요약:")
print(f"   총매출: {dashboard_data['summary']['total_sales']:,.0f} HKD (YOY {dashboard_data['summary']['sales_yoy']}%)")
print(f"   총재고: {dashboard_data['inventory']['total']:,.0f} HKD (YOY {dashboard_data['inventory']['total_yoy']}%)")
print(f"   채널수: {len(dashboard_data['channels'])}개")
print(f"   매장수: {len(dashboard_data['stores'])}개")
print(f"   할인율: {dashboard_data['summary']['discount_rate']}%")
print("\n데이터 생성 완료!")

