#!/usr/bin/env python3
"""
오프라인 매장 효율성 상세 (매장별 계산근거)
"""
import json

with open('components/dashboard/hongkong-dashboard-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

store_summary = data.get('store_summary', {})
offline_eff = data.get('offline_store_efficiency', {})
total = offline_eff.get('total', {})

EXCLUDED_STORES = {'M08', 'M20', 'M05', 'M12'}

print("=" * 120)
print("매장 효율성 계산근거 (오프라인)")
print("=" * 120)

# 현재 Period 오프라인 매장
print("\n[당월 오프라인 매장]")
print("-" * 120)
print(f"{'Store Code':<12} {'Store Name':<40} {'Country':<6} {'Channel':<10} {'Net Sales (1K)':>15}")
print("-" * 120)

current_offline = []
current_total_net = 0
for code, store in sorted(store_summary.items()):
    if (code not in EXCLUDED_STORES 
        and code != 'M10A'
        and store['channel'] != 'Online'
        and store['current']['net_sales'] > 0):
        if code == 'M12':  # M12는 10월 11일 폐점이므로 제외
            continue
        current_offline.append((code, store))
        net_sales_k = store['current']['net_sales'] / 1000
        current_total_net += store['current']['net_sales']
        print(f"{code:<12} {store['store_name'][:38]:<40} {store.get('country', ''):<6} {store['channel']:<10} {net_sales_k:>15,.2f}")

current_count = len(current_offline)
current_sps = current_total_net / current_count if current_count > 0 else 0

print("-" * 120)
print(f"총 {current_count}개 매장")
print(f"총 Net Sales: {current_total_net / 1000:,.2f} (1K HKD)")
print(f"점당매출: {current_sps / 1000:,.0f} (1K HKD)")

# 전년 동월 오프라인 매장
print("\n\n[전년 동월 오프라인 매장]")
print("-" * 120)
print(f"{'Store Code':<12} {'Store Name':<40} {'Country':<6} {'Channel':<10} {'Net Sales (1K)':>15}")
print("-" * 120)

previous_offline = []
previous_total_net = 0
for code, store in sorted(store_summary.items()):
    if (code != 'M10A'  # M10A는 M10에 합쳐짐
        and store['channel'] != 'Online'  # 온라인 제외
        and store['previous']['net_sales'] > 0):  # 전년 운영 중인 매장만
        previous_offline.append((code, store))
        net_sales_k = store['previous']['net_sales'] / 1000
        previous_total_net += store['previous']['net_sales']
        print(f"{code:<12} {store['store_name'][:38]:<40} {store.get('country', ''):<6} {store['channel']:<10} {net_sales_k:>15,.2f}")

previous_count = len(previous_offline)
previous_sps = previous_total_net / previous_count if previous_count > 0 else 0

print("-" * 120)
print(f"총 {previous_count}개 매장")
print(f"총 Net Sales: {previous_total_net / 1000:,.2f} (1K HKD)")
print(f"점당매출: {previous_sps / 1000:,.0f} (1K HKD)")

# 차이점
print("\n\n[차이점 분석]")
print("-" * 120)
current_codes = {code for code, _ in current_offline}
previous_codes = {code for code, _ in previous_offline}

only_current = current_codes - previous_codes
only_previous = previous_codes - current_codes

if only_current:
    print(f"당월에만 있는 매장 ({len(only_current)}개):")
    for code in sorted(only_current):
        store = store_summary[code]
        print(f"  - {code}: {store['store_name']} (Net Sales: {store['current']['net_sales']/1000:,.2f} 1K HKD)")

if only_previous:
    print(f"\n전년에만 있는 매장 ({len(only_previous)}개):")
    for code in sorted(only_previous):
        store = store_summary[code]
        print(f"  - {code}: {store['store_name']} (Net Sales: {store['previous']['net_sales']/1000:,.2f} 1K HKD)")

# 제외된 매장
print("\n[제외된 매장]")
print("-" * 120)
print("당월 제외:")
for code in sorted(EXCLUDED_STORES):
    if code in store_summary:
        store = store_summary[code]
        current_net = store['current']['net_sales'] / 1000
        if current_net > 0:
            reason = "폐점" if code in {'M08', 'M20'} else "리뉴얼공사" if code == 'M05' else "10월 11일 폐점"
            print(f"  - {code}: {store['store_name']} ({reason}, Net Sales: {current_net:,.2f} 1K HKD)")

print("\n전년 동월: 제외 매장 없음 (M08, M20 포함)")

# 최종 요약
print("\n" + "=" * 120)
print("최종 요약")
print("=" * 120)
yoy = (current_sps / previous_sps * 100) if previous_sps > 0 else 0
print(f"전년 {previous_count}개, 점당 {previous_sps/1000:,.0f} | 당월 {current_count}개, 점당 {current_sps/1000:,.0f} (YOY {yoy:.0f}%)")





