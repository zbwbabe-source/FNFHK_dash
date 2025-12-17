#!/usr/bin/env python3
"""
2510 데이터 검증 스크립트
"""
import json

print("=" * 80)
print("2510 매장별 현황 데이터 검증")
print("=" * 80)

# 데이터 로드
with open('public/dashboard/hongkong-store-status-2510.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

summary = data['summary']

print("\n=== 요약 정보 ===")
print(f"총 매장 수: {summary['total_stores']}")
print(f"HK 매장: {summary['hk_stores']}")
print(f"MC 매장: {summary['mc_stores']}")
print(f"총 직접이익: {summary['total_direct_profit']:.2f}K")
print(f"매장당 매출: {summary['sales_per_store']:.2f}K")
print(f"전체 YOY: {summary['overall_yoy']:.2f}%")

print("\n=== 카테고리별 매장 수 ===")
for key, cat in data['categories'].items():
    print(f"{cat['name']}: {cat['count']}개")
    print(f"  - 직접이익 합계: {cat['total_direct_profit']:.2f}K")
    print(f"  - 평균 YOY: {cat['avg_yoy']:.2f}%")
    print(f"  - 평균 임차료/인건비율: {cat['avg_rent_labor_ratio']:.2f}%")

# M09 매장 찾기
print("\n=== 샘플 매장 (M09) 상세 ===")
m09 = None
for cat_key in ['profit_improving', 'loss_improving', 'profit_deteriorating', 'loss_deteriorating']:
    for store in data['categories'][cat_key]['stores']:
        if store['shop_cd'] == 'M09':
            m09 = store
            break
    if m09:
        break

if m09:
    print(f"매장: {m09['shop_cd']} {m09['shop_nm']}")
    print(f"카테고리: {m09['category']}")
    print(f"실매출: {m09['current']['net_sales']:.2f}K")
    print(f"직접이익: {m09['current']['direct_profit']:.2f}K")
    print(f"임차료: {m09['current']['rent']:.2f}K")
    print(f"인건비: {m09['current']['labor_cost']:.2f}K")
    print(f"임차료/인건비율: {m09['current']['rent_labor_ratio']:.2f}%")
    print(f"YOY: {m09['yoy']:.2f}%")

# 검증 기준 체크
print("\n=== 검증 결과 ===")
checks = []

# 1. 총 직접이익이 합리적인 범위인지
if 100 < summary['total_direct_profit'] < 10000:
    checks.append(("✓", "총 직접이익이 합리적 범위 (100~10,000K)"))
else:
    checks.append(("✗", f"총 직접이익이 비정상: {summary['total_direct_profit']:.2f}K"))

# 2. 임차료/인건비율이 합리적인지
for cat_key, cat in data['categories'].items():
    if cat['count'] > 0:
        ratio = cat['avg_rent_labor_ratio']
        if 20 < ratio < 60:
            checks.append(("✓", f"{cat['name']} 임차료/인건비율 정상: {ratio:.2f}%"))
        else:
            checks.append(("✗", f"{cat['name']} 임차료/인건비율 비정상: {ratio:.2f}%"))

# 3. 흑자/적자 분류가 있는지
profit_count = data['categories']['profit_improving']['count'] + data['categories']['profit_deteriorating']['count']
loss_count = data['categories']['loss_improving']['count'] + data['categories']['loss_deteriorating']['count']

if profit_count > 0 and loss_count > 0:
    checks.append(("✓", f"흑자({profit_count}개)와 적자({loss_count}개) 매장 모두 존재"))
elif profit_count > 0:
    checks.append(("✓", f"흑자 매장만 존재 ({profit_count}개)"))
elif loss_count > 0:
    checks.append(("!", f"적자 매장만 존재 ({loss_count}개) - 확인 필요"))
else:
    checks.append(("✗", "매장 분류 오류"))

for symbol, msg in checks:
    print(f"{symbol} {msg}", flush=True)

print("\n" + "=" * 80)
