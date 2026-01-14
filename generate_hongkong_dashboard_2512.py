import pandas as pd
import json
from datetime import datetime

# 전처리된 CSV 파일 읽기
mlb_df = pd.read_csv('PL_MLB_2512_preprocessed.csv')
brand_df = pd.read_csv('PL_Brand_Summary_2512.csv')

# MLB 데이터만 추출 (채널별)
mlb_data = mlb_df[mlb_df['BRAND'] == 'MLB'].to_dict('records')

# 브랜드 요약 데이터
brand_summary = brand_df.to_dict('records')
mlb_summary = next((b for b in brand_summary if b['BRAND'] == 'MLB'), None)

# CEO Insights JSON 생성
def generate_ceo_insights():
    if not mlb_summary:
        return {}
    
    net_cur = mlb_summary['NET_CUR_MONTH']  # 이미 1K HKD 단위
    net_prev = mlb_summary['NET_PREV_MONTH']
    net_change = net_cur - net_prev
    net_yoy = (net_cur / net_prev * 100) if net_prev > 0 else 0
    
    net_cur_ytd = mlb_summary['NET_CUR_YTD']
    net_prev_ytd = mlb_summary['NET_PREV_YTD']
    net_ytd_yoy = (net_cur_ytd / net_prev_ytd * 100) if net_prev_ytd > 0 else 0
    
    discount_cur = mlb_summary['DISCOUNT_RATE_CUR_MONTH'] * 100
    discount_prev = mlb_summary['DISCOUNT_RATE_PREV_MONTH'] * 100
    
    ceo_insights = {
        "period": "2512",
        "month_name": "12월",
        "executive_summary": {
            "title": "📊 핵심성과",
            "items": [
                f"• 12월 매출 성장: 실판매출 {net_cur:,.0f}K (YOY {net_yoy:.0f}%), 전년 동월 대비 {net_change:+,.0f}K",
                f"• 누적 실판매출: {net_cur_ytd:,.0f}K (YOY {net_ytd_yoy:.0f}%)",
                f"• 당월 할인율: {discount_cur:.1f}% (전년: {discount_prev:.1f}%)",
                "• 매장 운영 현황 점검 필요"
            ]
        },
        "warnings": {
            "title": "⚠️ 주요 이슈",
            "items": [
                "• 12월 연말 시즌 실적 점검",
                "• 직접비 최적화 진행 중",
                "• 매장별 수익성 모니터링"
            ]
        },
        "opportunities": {
            "title": "🎯 기회 요인",
            "items": [
                "• 2026년 전략 수립",
                "• 흑자 매장 모범 사례 확산",
                "• 온라인 채널 확대"
            ]
        }
    }
    
    return ceo_insights

# 홍콩 대시보드 간단 요약 JSON 생성 (상단 5개 카드용)
def generate_dashboard_summary():
    if not mlb_summary:
        return {}
    
    # 전체 직접비 (실판매출)
    net_sales_cur = mlb_summary['NET_CUR_MONTH']
    net_sales_prev = mlb_summary['NET_PREV_MONTH']
    net_sales_yoy = (net_sales_cur / net_sales_prev * 100) if net_sales_prev > 0 else 0
    net_sales_change = net_sales_cur - net_sales_prev
    
    # Tag매출액
    tag_sales_cur = mlb_summary['TAG_CUR_MONTH']
    tag_sales_prev = mlb_summary['TAG_PREV_MONTH']
    
    # 할인율
    discount_cur = mlb_summary['DISCOUNT_RATE_CUR_MONTH'] * 100
    discount_prev = mlb_summary['DISCOUNT_RATE_PREV_MONTH'] * 100
    discount_change = discount_cur - discount_prev
    
    # 채널별 데이터
    channels = {}
    for channel_data in mlb_data:
        channel = channel_data['CHANNEL']
        channels[channel] = {
            'net_sales': channel_data['NET_CUR_MONTH'],
            'net_sales_prev': channel_data['NET_PREV_MONTH'],
            'yoy': (channel_data['NET_CUR_MONTH'] / channel_data['NET_PREV_MONTH'] * 100) if channel_data['NET_PREV_MONTH'] > 0 else 0,
            'discount_rate': channel_data['DISCOUNT_RATE_CUR_MONTH'] * 100
        }
    
    # 브랜드별 전체 데이터 (MLB, Discovery 포함)
    brands = {}
    for brand_data in brand_summary:
        b_name = brand_data['BRAND']
        brands[b_name] = {
            'net_sales': brand_data['NET_CUR_MONTH'],
            'net_sales_prev': brand_data['NET_PREV_MONTH'],
            'yoy': (brand_data['NET_CUR_MONTH'] / brand_data['NET_PREV_MONTH'] * 100) if brand_data['NET_PREV_MONTH'] > 0 else 0,
            'tag_sales': brand_data['TAG_CUR_MONTH'],
            'discount_rate': brand_data['DISCOUNT_RATE_CUR_MONTH'] * 100,
            'net_ytd': brand_data['NET_CUR_YTD'],
            'net_ytd_prev': brand_data['NET_PREV_YTD'],
            'ytd_yoy': (brand_data['NET_CUR_YTD'] / brand_data['NET_PREV_YTD'] * 100) if brand_data['NET_PREV_YTD'] > 0 else 0
        }
    
    summary = {
        "metadata": {
            "period": "2512",
            "year": 2025,
            "month": 12,
            "generated_at": datetime.now().isoformat()
        },
        "summary": {
            "total_net_sales": net_sales_cur,
            "total_net_sales_prev": net_sales_prev,
            "yoy": net_sales_yoy,
            "change": net_sales_change,
            "tag_sales": tag_sales_cur,
            "tag_sales_prev": tag_sales_prev,
            "discount_rate": discount_cur,
            "discount_rate_prev": discount_prev,
            "discount_change": discount_change
        },
        "brands": brands,
        "channels": channels,
        "ytd": {
            "net_sales": mlb_summary['NET_CUR_YTD'],
            "net_sales_prev": mlb_summary['NET_PREV_YTD'],
            "yoy": (mlb_summary['NET_CUR_YTD'] / mlb_summary['NET_PREV_YTD'] * 100) if mlb_summary['NET_PREV_YTD'] > 0 else 0
        }
    }
    
    return summary

# JSON 파일 생성
ceo_insights = generate_ceo_insights()
dashboard_summary = generate_dashboard_summary()

# CEO Insights 저장
with open('public/dashboard/hongkong-ceo-insights-2512.json', 'w', encoding='utf-8') as f:
    json.dump(ceo_insights, f, ensure_ascii=False, indent=2)

# Dashboard Summary 저장
with open('public/dashboard/hongkong-dashboard-summary-2512.json', 'w', encoding='utf-8') as f:
    json.dump(dashboard_summary, f, ensure_ascii=False, indent=2)

print("완료: public/dashboard/hongkong-ceo-insights-2512.json")
print("완료: public/dashboard/hongkong-dashboard-summary-2512.json")
if mlb_summary:
    net_cur = mlb_summary['NET_CUR_MONTH']
    net_prev = mlb_summary['NET_PREV_MONTH']
    yoy = (net_cur / net_prev * 100) if net_prev > 0 else 0
    print(f"\n12월 실판매출: {net_cur:,.0f}K HKD (YOY {yoy:.1f}%)")
    print(f"누적 실판매출: {mlb_summary['NET_CUR_YTD']:,.0f}K HKD")
