#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
누적 직접이익 데이터 업데이트 검증
"""
import json

period = '2511'
file_path = f'public/dashboard/hongkong-store-status-{period}.json'

print("=" * 80)
print(f"누적 직접이익 데이터 업데이트 검증: {period}")
print("=" * 80)

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Summary 검증
print("\n[Summary 섹션]")
summary = data.get('summary', {})
if 'cumulative_direct_profit' in summary:
    print(f"  누적 직접이익: {summary['cumulative_direct_profit']:,.0f} (1K HKD)")
    print(f"  전년 누적: {summary['cumulative_direct_profit_prev']:,.0f} (1K HKD)")
    print(f"  전전년 누적: {summary['cumulative_direct_profit_prev_prev']:,.0f} (1K HKD)")
    print(f"  YOY: {summary['cumulative_yoy']:.1f}%")
    print(f"  전년 YOY: {summary['cumulative_prev_yoy']:.1f}%")
    print("  [OK] Summary에 누적 데이터 있음")
else:
    print("  [ERROR] Summary에 누적 데이터 없음")

# 매장별 검증
print("\n[매장별 누적 데이터 검증]")
categories = data.get('categories', {})
total_stores_with_cumulative = 0
total_stores = 0

for cat_key, cat_data in categories.items():
    stores = cat_data.get('stores', [])
    for store in stores:
        total_stores += 1
        if 'cumulative' in store.get('current', {}):
            total_stores_with_cumulative += 1

print(f"  총 매장 수: {total_stores}")
print(f"  누적 데이터 있는 매장: {total_stores_with_cumulative}")

if total_stores == total_stores_with_cumulative:
    print("  [OK] 모든 매장에 누적 데이터 있음")
else:
    print(f"  [WARNING] {total_stores - total_stores_with_cumulative}개 매장에 누적 데이터 없음")

# 샘플 매장 확인
print("\n[샘플 매장 데이터 (M11)]")
for cat_key, cat_data in categories.items():
    stores = cat_data.get('stores', [])
    m11 = [s for s in stores if s.get('shop_cd') == 'M11']
    if m11:
        store = m11[0]
        print(f"  매장명: {store.get('shop_nm', 'N/A')}")
        print(f"  당월 직접이익: {store['current']['direct_profit']:,.0f}")
        if 'cumulative' in store['current']:
            cum = store['current']['cumulative']
            print(f"  누적 직접이익: {cum['direct_profit']:,.0f}")
            print(f"  누적 직접이익률: {cum['direct_profit_rate']:.1f}%")
            print(f"  누적 YOY: {store.get('cumulative_yoy', 0):.1f}%")
            print(f"  전년 누적 YOY: {store.get('cumulative_prev_yoy', 0):.1f}%")
        break

print("\n" + "=" * 80)
print("[검증 완료]")






