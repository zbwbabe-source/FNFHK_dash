#!/usr/bin/env python3
"""
2512용 홍콩마카오 손익요약 표 데이터 생성
실판매출, Tag매출액, 할인율 중심으로 생성
"""
import json
import os
from datetime import datetime

print("=" * 80)
print("2512 홍콩마카오 손익요약 표 데이터 생성")
print("=" * 80)

# 전처리된 데이터 로드
with open('PL_MLB_2512_preprocessed.csv', 'r', encoding='utf-8-sig') as f:
    import csv
    reader = csv.DictReader(f)
    mlb_data = list(reader)

with open('PL_Brand_Summary_2512.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    brand_data = {row['BRAND']: row for row in reader}

# MLB 데이터만 사용
mlb_summary = brand_data.get('MLB', {})

# 수치를 float로 변환하는 헬퍼 함수
def to_float(value):
    try:
        return float(value)
    except:
        return 0.0

# 당월 데이터
net_cur = to_float(mlb_summary.get('NET_CUR_MONTH', 0))
net_prev = to_float(mlb_summary.get('NET_PREV_MONTH', 0))
tag_cur = to_float(mlb_summary.get('TAG_CUR_MONTH', 0))
tag_prev = to_float(mlb_summary.get('TAG_PREV_MONTH', 0))
discount_rate_cur = to_float(mlb_summary.get('DISCOUNT_RATE_CUR_MONTH', 0))
discount_rate_prev = to_float(mlb_summary.get('DISCOUNT_RATE_PREV_MONTH', 0))

# 누적 데이터
net_cur_ytd = to_float(mlb_summary.get('NET_CUR_YTD', 0))
net_prev_ytd = to_float(mlb_summary.get('NET_PREV_YTD', 0))
tag_cur_ytd = to_float(mlb_summary.get('TAG_CUR_YTD', 0))
tag_prev_ytd = to_float(mlb_summary.get('TAG_PREV_YTD', 0))
discount_rate_cur_ytd = to_float(mlb_summary.get('DISCOUNT_RATE_CUR_YTD', 0))
discount_rate_prev_ytd = to_float(mlb_summary.get('DISCOUNT_RATE_PREV_YTD', 0))

# 할인액 계산
discount_cur = tag_cur - net_cur
discount_prev = tag_prev - net_prev
discount_cur_ytd = tag_cur_ytd - net_cur_ytd
discount_prev_ytd = tag_prev_ytd - net_prev_ytd

# YOY 계산
net_yoy = (net_cur / net_prev * 100) if net_prev > 0 else 0
tag_yoy = (tag_cur / tag_prev * 100) if tag_prev > 0 else 0
discount_yoy = (discount_cur / discount_prev * 100) if discount_prev > 0 else 0

net_yoy_ytd = (net_cur_ytd / net_prev_ytd * 100) if net_prev_ytd > 0 else 0
tag_yoy_ytd = (tag_cur_ytd / tag_prev_ytd * 100) if tag_prev_ytd > 0 else 0

# Change 계산
net_change = net_cur - net_prev
tag_change = tag_cur - tag_prev
discount_change = discount_cur - discount_prev

# 손익요약 JSON 구조 (매출 데이터만 포함, 손익 항목은 0 또는 추정치)
pl_data = {
    "metadata": {
        "last_period": "2512",
        "previous_period": "2412",
        "generated_at": datetime.now().isoformat()
    },
    "current_month": {
        "total": {
            "tag_sales": tag_cur,  # 이미 1K HKD 단위
            "discount": discount_cur,
            "discount_rate": discount_rate_cur * 100,
            "net_sales": net_cur,
            "cogs": 0,  # 매출원가는 별도 입력 필요
            "cogs_rate": 0,
            "gross_profit": 0,
            "gross_profit_rate": 0,
            "direct_cost": 0,
            "direct_profit": 0,
            "direct_profit_rate": 0,
            "sg_a": 0,
            "operating_profit": 0,
            "operating_profit_rate": 0,
            "expense_detail": {
                "salary": 0,
                "marketing": 0,
                "fee": 0,
                "rent": 0,
                "insurance": 0,
                "travel": 0,
                "other": 0,
                "other_detail": {
                    "depreciation": 0,
                    "duty_free": 0,
                    "govt_license": 0,
                    "logistics": 0,
                    "maintenance": 0,
                    "rent_free": 0,
                    "retirement": 0,
                    "supplies": 0,
                    "transport": 0,
                    "uniform": 0,
                    "utilities": 0,
                    "var_rent": 0,
                    "communication": 0,
                    "bonus": 0
                }
            }
        },
        "yoy": {
            "tag_sales": tag_yoy,
            "discount": discount_yoy,
            "net_sales": net_yoy,
            "cogs": 0,
            "gross_profit": 0,
            "direct_cost": 0,
            "direct_profit": 0,
            "sg_a": 0,
            "operating_profit": 0
        },
        "change": {
            "tag_sales": tag_change,
            "discount": discount_change,
            "net_sales": net_change,
            "cogs": 0,
            "gross_profit": 0,
            "direct_cost": 0,
            "direct_profit": 0,
            "sg_a": 0,
            "operating_profit": 0
        }
    },
    "prev_month": {
        "total": {
            "tag_sales": tag_prev,
            "discount": discount_prev,
            "discount_rate": discount_rate_prev * 100,
            "net_sales": net_prev,
            "cogs": 0,
            "cogs_rate": 0,
            "gross_profit": 0,
            "gross_profit_rate": 0,
            "direct_cost": 0,
            "direct_profit": 0,
            "direct_profit_rate": 0,
            "sg_a": 0,
            "operating_profit": 0,
            "operating_profit_rate": 0
        }
    },
    "cumulative": {
        "total": {
            "tag_sales": tag_cur_ytd,
            "net_sales": net_cur_ytd,
            "discount_rate": discount_rate_cur_ytd * 100,
            "cogs": 0,
            "cogs_rate": 0,
            "gross_profit": 0,
            "gross_profit_rate": 0,
            "direct_cost": 0,
            "direct_profit": 0,
            "direct_profit_rate": 0,
            "sg_a": 0,
            "operating_profit": 0,
            "operating_profit_rate": 0,
            "expense_detail": {
                "salary": 0,
                "marketing": 0,
                "fee": 0,
                "rent": 0,
                "insurance": 0,
                "travel": 0,
                "other": 0,
                "other_detail": {
                    "depreciation": 0,
                    "duty_free": 0,
                    "govt_license": 0,
                    "logistics": 0,
                    "maintenance": 0,
                    "rent_free": 0,
                    "retirement": 0,
                    "supplies": 0,
                    "transport": 0,
                    "uniform": 0,
                    "utilities": 0,
                    "var_rent": 0,
                    "communication": 0,
                    "bonus": 0
                }
            }
        },
        "prev_cumulative": {
            "total": {
                "tag_sales": tag_prev_ytd,
                "net_sales": net_prev_ytd,
                "discount_rate": discount_rate_prev_ytd * 100,
                "cogs": 0,
                "cogs_rate": 0,
                "gross_profit": 0,
                "gross_profit_rate": 0,
                "direct_cost": 0,
                "direct_profit": 0,
                "direct_profit_rate": 0,
                "sg_a": 0,
                "operating_profit": 0,
                "operating_profit_rate": 0
            }
        },
        "yoy": {
            "tag_sales": tag_yoy_ytd,
            "net_sales": net_yoy_ytd,
            "cogs": 0,
            "gross_profit": 0,
            "direct_cost": 0,
            "direct_profit": 0,
            "sg_a": 0,
            "operating_profit": 0
        }
    }
}

# JSON 저장
output_file = 'public/dashboard/hongkong-pl-data-2512.json'
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(pl_data, f, ensure_ascii=False, indent=2)

print(f"\n[OK] 손익요약 표 데이터 생성 완료: {output_file}")
print(f"\n당월 데이터:")
print(f"  - Tag매출액: {tag_cur:,.0f}K HKD")
print(f"  - 실판매출: {net_cur:,.0f}K HKD (YOY {net_yoy:.1f}%)")
print(f"  - 할인율: {discount_rate_cur*100:.1f}%")
print(f"\n누적 데이터:")
print(f"  - Tag매출액: {tag_cur_ytd:,.0f}K HKD")
print(f"  - 실판매출: {net_cur_ytd:,.0f}K HKD (YOY {net_yoy_ytd:.1f}%)")
print(f"  - 할인율: {discount_rate_cur_ytd*100:.1f}%")
print("\n" + "=" * 80)
print("[주의] 손익 항목(COGS, 영업이익 등)은 0으로 설정되어 있습니다.")
print("실제 손익 데이터는 별도로 입력하거나 PL CSV에서 추출해야 합니다.")
print("=" * 80)
