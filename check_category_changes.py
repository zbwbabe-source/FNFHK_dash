import json
from collections import Counter

with open('public/dashboard/hongkong-store-status-2512.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('=== 홍콩 오프라인 전년 vs 당년 카테고리별 매장 수 ===\n')

categories = data['categories']
all_stores = []
for cat_name, cat_data in categories.items():
    if 'stores' in cat_data:
        for store in cat_data['stores']:
            if store.get('country') == 'HK':  # 홍콩만
                all_stores.append({
                    'shop_nm': store['shop_nm'],
                    'current_category': store['category'],
                    'previous_category': store.get('previous_category', 'N/A')
                })

# 전년 카테고리별 집계
prev_categories = Counter([s['previous_category'] for s in all_stores if s['previous_category'] != 'N/A'])
curr_categories = Counter([s['current_category'] for s in all_stores])

print('전년 (previous_category):')
for cat, count in sorted(prev_categories.items()):
    print(f'  {cat}: {count}개')

print('\n당년 (current_category):')
for cat, count in sorted(curr_categories.items()):
    print(f'  {cat}: {count}개')

print('\n증감:')
cat_names = {
    'profit_improving': '흑자 & 성장',
    'profit_deteriorating': '흑자 & 악화',
    'loss_improving': '적자 & 성장',
    'loss_deteriorating': '적자 & 악화'
}

for cat_key, cat_name in cat_names.items():
    prev = prev_categories.get(cat_key, 0)
    curr = curr_categories.get(cat_key, 0)
    change = curr - prev
    sign = '+' if change > 0 else '△' if change < 0 else ''
    print(f'  {cat_name}: 전년 {prev}개 → 당년 {curr}개 ({sign}{abs(change)}개)')
