#!/usr/bin/env python3
"""
2510용 CEO 인사이트 데이터 생성
2511과 독립적으로 실행되며, 2510 전용 인사이트를 생성합니다.
"""
import json
import os

print("=" * 80)
print("2510 CEO 인사이트 데이터 생성")
print("=" * 80)

# 2510 데이터 로드
with open('public/dashboard/hongkong-dashboard-data-2510.json', 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

with open('public/dashboard/hongkong-pl-data-2510.json', 'r', encoding='utf-8') as f:
    pl_data = json.load(f)

# PL 데이터 추출
pl_current = pl_data['current_month']['total']
pl_prev = pl_data['prev_month']['total']

# YOY 계산
net_sales_yoy = (pl_current['net_sales'] / pl_prev['net_sales'] * 100) if pl_prev['net_sales'] > 0 else 0
net_sales_change = pl_current['net_sales'] - pl_prev['net_sales']
operating_profit_rate = (pl_current['operating_profit'] / pl_current['net_sales'] * 100) if pl_current['net_sales'] > 0 else 0

# 평당매출 (간략 계산)
# 실제로는 store_areas.json을 참조해야 하지만, 여기서는 요약 정보만 사용
store_count = len([s for s in dashboard_data.get('store_summary', {}).values()])

# 할인율 계산
gross_sales = pl_current.get('gross_sales', 0)
net_sales = pl_current.get('net_sales', 0)
if gross_sales > 0:
    discount_rate = ((gross_sales - net_sales) / gross_sales * 100)
else:
    discount_rate = 0

# CEO 인사이트 텍스트 생성
insights = {
    "period": "2510",
    "month_name": "10월",
    "executive_summary": {
        "title": "📊 핵심성과",
        "items": [
            f"• 10월 매출 성장: 실판매출 {pl_current['net_sales']:,.0f}K (YOY {net_sales_yoy:.0f}%), 전년 동월 대비 {net_sales_change:+,.0f}K",
            f"• 당월 영업이익: {pl_current['operating_profit']:,.0f}K (영업이익률 {operating_profit_rate:.1f}%)",
            f"• 매장 운영: 총 {store_count}개 매장 운영 중",
            f"• 할인율 관리: {discount_rate:.1f}% (전년 동월 대비 관리 중)"
        ]
    },
    "warnings": {
        "title": "⚠️ 주요 이슈",
        "items": [
            "• 10월 특이사항: 2510 데이터 기준으로 생성됨",
            "• 직접비 관리: 임차료 및 인건비 비중 모니터링 필요",
            "• 적자 매장 관리: 일부 매장 개선 필요"
        ]
    },
    "opportunities": {
        "title": "🎯 기회 요인",
        "items": [
            "• 흑자 매장 성장세 유지",
            "• 평당매출 효율화 가능",
            "• 재고 최적화 기회"
        ]
    }
}

# JSON 저장
output_file = 'public/dashboard/hongkong-ceo-insights-2510.json'
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(insights, f, ensure_ascii=False, indent=2)

print(f"\n[OK] CEO 인사이트 생성 완료: {output_file}")
print(f"Period: {insights['period']}")
print(f"Month: {insights['month_name']}")
print(f"항목 수: {len(insights['executive_summary']['items'])}")
print("\n" + "=" * 80)
