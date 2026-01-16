#!/usr/bin/env python3
"""
대만 2512용 CEO 인사이트 데이터 생성
전처리된 TAG Summary를 기반으로 정확한 데이터 생성
"""
import json
import os
import pandas as pd

print("=" * 80)
print("대만 2512 CEO 인사이트 데이터 생성")
print("=" * 80)

# 1. 전처리된 TAG Summary CSV 읽기
csv_file = r'D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\TW_Inventory_TAG_Summary (3).csv'
df = pd.read_csv(csv_file)

# 2. 2512 데이터 로드
with open('public/dashboard/taiwan-dashboard-data-2512.json', 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

with open('public/dashboard/taiwan-pl-data-2512.json', 'r', encoding='utf-8') as f:
    pl_data = json.load(f)

# 3. TAG Summary에서 데이터 추출
total_row = df[df['TAG'] == 'TOTAL'].iloc[0]
f25_row = df[df['TAG'] == '25F'].iloc[0]
s25_row = df[df['TAG'] == '25S'].iloc[0]
past_f_row = df[df['TAG'] == '과시즌F'].iloc[0]

exchange_rate = 4.02

# 당월 매출 (1K HKD)
sales_current = total_row['SALES (TAG)_2512'] / 1000 / exchange_rate
sales_previous = total_row['SALES (TAG)_2412'] / 1000 / exchange_rate
sales_yoy = total_row['SALES (TAG)_YOY_%']

# 누적 매출 (1K HKD)
sales_ytd_current = total_row['SALES_YTD_2512'] / 1000 / exchange_rate
sales_ytd_previous = total_row['SALES_YTD_2412'] / 1000 / exchange_rate
sales_ytd_yoy = total_row['SALES_YTD_YOY_%']

# 재고 (1K HKD)
inventory_current = total_row['STOCK (TAG)_2512'] / 1000 / exchange_rate
inventory_yoy = total_row['STOCK (TAG)_YOY_%']

# PL 데이터 추출
pl_current = pl_data['current_month']['total']
pl_cumulative = pl_data['cumulative']['total']

# 당월 영업이익
operating_profit = pl_current.get('operating_profit', 0)
operating_profit_rate = pl_current.get('operating_profit_rate', 0)
operating_profit_prev = pl_data.get('prev_month', {}).get('total', {}).get('operating_profit_rate', 0)
operating_profit_rate_change = operating_profit_rate - operating_profit_prev

# 누적 영업이익
cumulative_operating_profit = pl_cumulative.get('operating_profit', 0)
cumulative_operating_profit_rate = pl_cumulative.get('operating_profit_rate', 0)
cumulative_operating_profit_prev = pl_data.get('prev_year_cumulative', {}).get('total', {}).get('operating_profit_rate', 0)
cumulative_operating_profit_rate_change = cumulative_operating_profit_rate - cumulative_operating_profit_prev

# 25F 입고 및 판매
f25_stock_yoy = f25_row['STOCK (TAG)_YOY_%']
f25_sales_ytd_yoy = f25_row['SALES_YTD_YOY_%']

# CEO 인사이트 텍스트 생성
insights = {
    "period": "2512",
    "month_name": "12월",
    "executive_summary": {
        "title": "💡 핵심 성과",
        "items": [
            f"**당월 매출개선**: {sales_current:,.0f}K YOY {sales_yoy:.0f}%",
            f"**누적 매출개선**: {sales_ytd_current:,.0f}K YOY {sales_ytd_yoy:.0f}%",
            f"**당월 영업이익 {'흑자' if operating_profit >= 0 else '적자'}**: {operating_profit:,.0f}K (이익률 {operating_profit_rate:.1f}%, 전년비 {operating_profit_rate_change:+.1f}%p)",
            f"**누적 영업이익 {'흑자' if cumulative_operating_profit >= 0 else '적자'}**: {cumulative_operating_profit:,.0f}K (이익률 {cumulative_operating_profit_rate:.1f}% 전년비 {cumulative_operating_profit_rate_change:+.1f}%p)",
            f"**총재고**: {inventory_current:,.0f}K, YOY {inventory_yoy:.0f}%"
        ]
    },
    "warnings": {
        "title": "⚠️ 주요 리스크",
        "items": [
            f"**DJ 입고** {f25_stock_yoy:.0f}%, **판매** {f25_sales_ytd_yoy:.0f}%로 판매율 제고 필요",
            "**Discovery 25년 누적 영업손실** -2,344K<br/>  • 온라인2개, 오프라인 3개점<br/>  • 26년 5월 10월 총 2개점 오픈 예정"
        ]
    },
    "opportunities": {
        "title": "🎯 CEO 전략 방향",
        "items": [
            "**1-2월 합계 매출** YOY 105% 목표 (춘절 당년 2월, 전년 1월)",
            "**2026년 연간 매출목표** YOY 106%",
            "**2026년 MLB매장 신규오픈** (빅시티, A11, 한신아레나 타이중점)",
            "**2026년 과시즌2년차(23F)재고** 집중 소진 예정"
        ]
    }
}

# JSON 저장
output_file = 'public/dashboard/taiwan-ceo-insights-2512.json'
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(insights, f, ensure_ascii=False, indent=2)

print(f"\n[OK] CEO 인사이트 생성 완료: {output_file}")
print(f"Period: {insights['period']}")
print(f"Month: {insights['month_name']}")
print(f"항목 수: {len(insights['executive_summary']['items'])}")
print(f"\n핵심 데이터:")
print(f"  당월 매출: {sales_current:,.0f}K (YOY {sales_yoy:.0f}%)")
print(f"  누적 매출: {sales_ytd_current:,.0f}K (YOY {sales_ytd_yoy:.0f}%)")
print(f"  당월 영업이익률: {operating_profit_rate:.1f}%")
print(f"  누적 영업이익률: {cumulative_operating_profit_rate:.1f}%")
print(f"  총재고: {inventory_current:,.0f}K (YOY {inventory_yoy:.0f}%)")
print("\n" + "=" * 80)
