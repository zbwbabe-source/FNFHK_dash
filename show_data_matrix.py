#!/usr/bin/env python3
"""
대시보드 데이터를 Matrix 형태로 표시
"""
import json
import sys

def show_store_summary(data):
    """Store별 요약 데이터 표시"""
    print("=" * 120)
    print("STORE SUMMARY (매장별 집계)")
    print("=" * 120)
    
    stores = data.get('store_summary', {})
    
    # 헤더
    print(f"{'Store Code':<12} {'Store Name':<35} {'Category':<15} {'Gross Sales':>15} {'Net Sales':>15} {'할인율':>10} {'폐점':>6}")
    print("-" * 120)
    
    for store_code in sorted(stores.keys()):
        store = stores[store_code]
        current = store['current']
        discount = current['discount_rate']
        closed = "폐점" if store['closed'] else ""
        
        print(f"{store_code:<12} {store['store_name'][:33]:<35} {store['category']:<15} "
              f"{current['gross_sales']:>15,.0f} {current['net_sales']:>15,.0f} "
              f"{discount:>9.2f}% {closed:>6}")
    
    print()

def show_season_summary(data):
    """시즌별 요약 데이터 표시"""
    print("=" * 100)
    print("SEASON SUMMARY (시즌별 집계)")
    print("=" * 100)
    
    seasons = data.get('season_summary', {})
    
    # 헤더
    print(f"{'Season Code':<15} {'Season Type':<15} {'Gross Sales':>15} {'Net Sales':>15} {'Sales Qty':>15}")
    print("-" * 100)
    
    for season_key in sorted(seasons.keys()):
        season = seasons[season_key]
        current = season['current']
        
        print(f"{season['season_code']:<15} {season['season_type']:<15} "
              f"{current['gross_sales']:>15,.0f} {current['net_sales']:>15,.0f} "
              f"{current['sales_qty']:>15,.0f}")
    
    print()

def show_category_summary(data):
    """Category별 요약 데이터 표시 (N시즌 재고주수)"""
    print("=" * 100)
    print("CATEGORY SUMMARY (Category별 집계 - N시즌 재고주수)")
    print("=" * 100)
    
    categories = data.get('category_summary', {})
    
    # 헤더
    print(f"{'Category':<10} {'Category Name':<15} {'Stock Price':>15} {'1개월 매출':>15} {'6개월 매출':>15} {'재고주수(1M)':>15} {'재고주수(6M)':>15}")
    print("-" * 100)
    
    for category in sorted(categories.keys()):
        cat = categories[category]
        current = cat['current']
        
        print(f"{category:<10} {cat['category_name']:<15} "
              f"{current['stock_price']:>15,.0f} {current['sales_qty_1m']:>15,.0f} "
              f"{current['sales_qty_6m']:>15,.0f} {current['stock_months_1m']:>15.2f} "
              f"{current['stock_months_6m']:>15.2f}")
    
    print()

def show_trend_data(data):
    """추세 데이터 표시"""
    print("=" * 100)
    meta = data.get('metadata', {})
    last_year = meta.get('last_year', '')
    print(f"TREND DATA ({last_year}년 1월부터 {last_year}년 {meta.get('last_month', '')}월까지)")
    print("=" * 100)
    
    trends = data.get('trend_data', [])
    
    # 헤더
    print(f"{'Period':<10} {'Gross Sales':>15} {'Net Sales':>15} {'Sales Qty':>15} {'할인율':>10}")
    print("-" * 100)
    
    for trend in trends:
        print(f"{trend['period']:<10} {trend['gross_sales']:>15,.0f} "
              f"{trend['net_sales']:>15,.0f} {trend['sales_qty']:>15,.0f} "
              f"{trend['discount_rate']:>9.2f}%")
    
    print()

def show_metadata(data):
    """메타데이터 표시"""
    print("=" * 80)
    print("METADATA")
    print("=" * 80)
    meta = data.get('metadata', {})
    print(f"마지막 Period: {meta.get('last_period')}")
    print(f"전년 동월 Period: {meta.get('previous_period')}")
    print(f"마지막 년도: {meta.get('last_year')}")
    print(f"마지막 월: {meta.get('last_month')}")
    print(f"생성 시간: {meta.get('generated_at')}")
    print()

if __name__ == '__main__':
    json_file = 'components/dashboard/hongkong-dashboard-data.json'
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        show_metadata(data)
        show_store_summary(data)
        show_season_summary(data)
        show_category_summary(data)
        show_trend_data(data)
        
    except FileNotFoundError:
        print(f"파일을 찾을 수 없습니다: {json_file}")
        sys.exit(1)
    except Exception as e:
        print(f"오류 발생: {e}")
        sys.exit(1)

