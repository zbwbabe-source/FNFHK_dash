#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
오프라인 매장별 현황 JSON에 누적 직접이익 데이터 통합
"""
import json
import sys
import os

def update_store_status_with_cumulative(store_status_file, cumulative_file, output_file):
    """store-status JSON에 누적 직접이익 데이터 통합"""
    
    # 기존 store-status 파일 읽기
    with open(store_status_file, 'r', encoding='utf-8') as f:
        store_status = json.load(f)
    
    # 누적 직접이익 파일 읽기
    with open(cumulative_file, 'r', encoding='utf-8') as f:
        cumulative_data = json.load(f)
    
    # 누적 데이터를 매장별로 매핑
    cumulative_stores = cumulative_data.get('stores', {})
    
    # 각 매장에 누적 데이터 추가
    def add_cumulative_to_store(store):
        """매장 정보에 누적 데이터 추가"""
        shop_cd = store.get('shop_cd')
        if shop_cd in cumulative_stores:
            cum_data = cumulative_stores[shop_cd]
            # current에 누적 데이터 추가
            if 'cumulative' not in store['current']:
                store['current']['cumulative'] = {}
            store['current']['cumulative'] = {
                'net_sales': cum_data.get('net_sales', 0),
                'gross_profit': cum_data.get('gross_profit', 0),
                'selling_expense': cum_data.get('selling_expense', 0),
                'direct_profit': cum_data.get('direct_profit', 0),
                'direct_profit_rate': cum_data.get('direct_profit_rate', 0)
            }
            # previous에 누적 데이터 추가
            if 'cumulative' not in store['previous']:
                store['previous']['cumulative'] = {}
            store['previous']['cumulative'] = {
                'net_sales': cum_data.get('net_sales_prev', 0),
                'gross_profit': cum_data.get('gross_profit_prev', 0),
                'selling_expense': cum_data.get('selling_expense_prev', 0),
                'direct_profit': cum_data.get('direct_profit_prev', 0),
                'direct_profit_rate': cum_data.get('direct_profit_rate_prev', 0)
            }
            # YOY 추가
            store['cumulative_yoy'] = cum_data.get('yoy', 0)
            store['cumulative_prev_yoy'] = cum_data.get('prev_yoy', 0)
        return store
    
    # 카테고리별 매장에 누적 데이터 추가
    for cat_key in ['profit_improving', 'profit_deteriorating', 'loss_improving', 'loss_deteriorating']:
        if cat_key in store_status.get('categories', {}):
            stores = store_status['categories'][cat_key].get('stores', [])
            store_status['categories'][cat_key]['stores'] = [add_cumulative_to_store(store) for store in stores]
    
    # 마카오 매장에도 추가
    if 'mc_summary' in store_status:
        mc_stores = store_status['mc_summary'].get('stores', [])
        store_status['mc_summary']['stores'] = [add_cumulative_to_store(store) for store in mc_stores]
    
    # 제외 매장에도 추가
    if 'excluded_stores' in store_status:
        excluded_stores = store_status['excluded_stores'].get('stores', [])
        store_status['excluded_stores']['stores'] = [add_cumulative_to_store(store) for store in excluded_stores]
    
    # summary에 누적 데이터 추가
    if 'summary' not in store_status:
        store_status['summary'] = {}
    
    summary = cumulative_data.get('summary', {})
    store_status['summary']['cumulative_direct_profit'] = summary.get('total_direct_profit', 0)
    store_status['summary']['cumulative_direct_profit_prev'] = summary.get('total_direct_profit_prev', 0)
    store_status['summary']['cumulative_direct_profit_prev_prev'] = summary.get('total_direct_profit_prev_prev', 0)
    store_status['summary']['cumulative_yoy'] = summary.get('total_yoy', 0)
    store_status['summary']['cumulative_prev_yoy'] = summary.get('total_prev_yoy', 0)
    
    # JSON 파일 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(store_status, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] 누적 데이터 통합 완료: {output_file}")
    print(f"   누적 직접이익 합계: {summary.get('total_direct_profit', 0):,.0f}")
    print(f"   전년 누적 직접이익 합계: {summary.get('total_direct_profit_prev', 0):,.0f}")
    print(f"   YOY: {summary.get('total_yoy', 0):.1f}%")

def main():
    period = '2511'
    
    store_status_file = f'public/dashboard/hongkong-store-status-{period}.json'
    cumulative_file = f'cumulative_store_direct_profit_{period}.json'
    output_file = store_status_file  # 같은 파일에 덮어쓰기
    
    if not os.path.exists(store_status_file):
        print(f"❌ 파일을 찾을 수 없습니다: {store_status_file}")
        return
    
    if not os.path.exists(cumulative_file):
        print(f"❌ 파일을 찾을 수 없습니다: {cumulative_file}")
        return
    
    update_store_status_with_cumulative(store_status_file, cumulative_file, output_file)

if __name__ == '__main__':
    main()

