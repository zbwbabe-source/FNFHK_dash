#!/usr/bin/env python3
"""
대만 2511용 CEO 인사이트 데이터 생성
기존 2511 동작을 유지하기 위한 파일
"""
import json
import os

print("=" * 80)
print("대만 2511 CEO 인사이트 데이터 생성")
print("=" * 80)

# 2511 데이터 로드
with open('public/dashboard/taiwan-dashboard-data-2511.json', 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

with open('public/dashboard/taiwan-pl-data-2511.json', 'r', encoding='utf-8') as f:
    pl_data = json.load(f)

# PL 데이터 추출
pl_current = pl_data['current_month']['total']
pl_prev = pl_data.get('prev_month', {}).get('total', {})

# YOY 계산
net_sales = pl_current.get('net_sales', 0)
net_sales_prev = pl_prev.get('net_sales', 0)
net_sales_yoy = (net_sales / net_sales_prev * 100) if net_sales_prev > 0 else 0
net_sales_change = net_sales - net_sales_prev

# 영업이익
operating_profit = pl_current.get('operating_profit', 0)
operating_profit_rate = (operating_profit / net_sales * 100) if net_sales > 0 else 0

# 온라인 데이터
online_sales = pl_current.get('online_sales', 0)
online_yoy = pl_current.get('online_yoy', 100)
online_ratio = (online_sales / net_sales * 100) if net_sales > 0 else 0
online_profit = pl_current.get('online_direct_profit', 0)

# 재고
total_inventory = dashboard_data.get('ending_inventory', {}).get('total', {}).get('total_amount', 0)
inventory_yoy = dashboard_data.get('ending_inventory', {}).get('total', {}).get('yoy', 100)

# 25F 판매율
season_sales = dashboard_data.get('season_sales', {})
fw25_sell_through = season_sales.get('25F', {}).get('sell_through_rate', 0)

# 평당매출 (간단 계산)
sales_per_pyeong_day = dashboard_data.get('sales_summary', {}).get('sales_per_pyeong_day', 0)
sales_per_pyeong_yoy = dashboard_data.get('sales_summary', {}).get('sales_per_pyeong_yoy', 100)

# CEO 인사이트 텍스트 생성
insights = {
    "period": "2511",
    "month_name": "11월",
    "executive_summary": {
        "title": "💡 핵심 성과",
        "items": [
            f"• 매출개선: {net_sales:,.0f}K, YOY {net_sales_yoy:.0f}%",
            f"• 매장효율성 개선: 평당매출 {sales_per_pyeong_day:.0f} HKD/평/1일, YOY {sales_per_pyeong_yoy:.0f}%",
            f"• 25F 판매율: {fw25_sell_through:.1f}%, 전년비 분석 필요",
            f"• 온라인: {online_sales:,.0f}K (YOY {online_yoy:.0f}%, 비중 {online_ratio:.1f}%), 직접이익 {online_profit:,.0f}K",
            f"• 총재고 감소: {total_inventory:,.0f}K, YOY {inventory_yoy:.0f}%"
        ]
    },
    "warnings": {
        "title": "⚠️ 주의사항",
        "items": [
            "• 11월 운영 현황 모니터링",
            "• 연말 시즌 재고 관리",
            "• Discovery 브랜드 성장 전략"
        ]
    },
    "opportunities": {
        "title": "🎯 개선 기회",
        "items": [
            "• 온라인 성장 모멘텀 유지",
            "• 신규 시즌 판매율 극대화",
            "• 아울렛 효율성 제고"
        ]
    }
}

# JSON 저장
output_file = 'public/dashboard/taiwan-ceo-insights-2511.json'
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(insights, f, ensure_ascii=False, indent=2)

print(f"\n[OK] CEO 인사이트 생성 완료: {output_file}")
print(f"Period: {insights['period']}")
print(f"Month: {insights['month_name']}")
print(f"항목 수: {len(insights['executive_summary']['items'])}")
print("\n" + "=" * 80)
