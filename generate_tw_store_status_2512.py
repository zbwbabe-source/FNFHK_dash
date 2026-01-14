#!/usr/bin/env python3
"""
대만 매장별 상태 데이터 생성 - 2512
"""
import json
import os

# TWPL JSON에서 매장별 데이터 추출하여 상태 파일 생성
def generate_taiwan_store_status(period='2512'):
    """대만 매장별 상태 생성"""
    
    # PL 데이터 로드
    pl_file = f'public/dashboard/taiwan-pl-data-{period}.json'
    
    if not os.path.exists(pl_file):
        print(f"[ERROR] PL 파일 없음: {pl_file}")
        return
    
    with open(pl_file, 'r', encoding='utf-8') as f:
        pl_data = json.load(f)
    
    # 매장별 데이터 (당월, 누적)
    stores_current = pl_data.get('channel_direct_profit', {}).get('stores', {})
    stores_cumulative = pl_data.get('channel_direct_profit', {}).get('cumulative_stores', {})
    
    # 매장 메타데이터 (면적, 채널 등)
    # 기존 store-status 파일이나 별도 매핑에서 가져와야 함
    # 일단 하드코딩으로 주요 매장 정보 설정
    store_meta = {
        'T01': {'name': '台北101', 'area': 70, 'channel': '정규점'},
        'T02': {'name': '新光三越信義A11', 'area': 60, 'channel': '정규점'},
        'T03': {'name': '微風南京', 'area': 50, 'channel': '정규점'},
        'T04': {'name': '新光三越台北站前', 'area': 45, 'channel': '정규점'},
        'T05': {'name': '微風信義', 'area': 55, 'channel': '정규점'},
        'T06': {'name': '誠品信義', 'area': 40, 'channel': '정규점'},
        'T07': {'name': '台中大遠百', 'area': 45, 'channel': '정규점'},
        'T08': {'name': '高雄大遠百', 'area': 40, 'channel': '정규점'},
        'T09': {'name': 'Gloria Outlet 華泰名品城', 'area': 35, 'channel': '아웃렛'},
        'T10': {'name': 'Online', 'area': 0, 'channel': '온라인'},
    }
    
    # Store status 생성
    store_status = []
    
    for shop_cd, store_data in stores_current.items():
        if shop_cd == 'T99':  # 가상점 제외
            continue
            
        cumul_data = stores_cumulative.get(shop_cd, {})
        meta = store_meta.get(shop_cd, {'name': shop_cd, 'area': 0, 'channel': '기타'})
        
        # 직접이익률 계산
        current_net_sales = store_data.get('net_sales', 0)
        current_direct_profit = store_data.get('direct_profit', 0)
        current_direct_profit_rate = (current_direct_profit / current_net_sales * 100) if current_net_sales > 0 else 0
        
        cumul_net_sales = cumul_data.get('net_sales', 0)
        cumul_direct_profit = cumul_data.get('direct_profit', 0)
        cumul_direct_profit_rate = (cumul_direct_profit / cumul_net_sales * 100) if cumul_net_sales > 0 else 0
        
        status = {
            'shop_cd': shop_cd,
            'shop_nm': meta['name'],
            'region': 'TW',
            'channel': meta['channel'],
            'area': meta['area'],
            'is_active': True,
            'current': {
                'net_sales': current_net_sales,
                'direct_profit': current_direct_profit,
                'direct_profit_rate': current_direct_profit_rate,
                'operating_profit': 0,  # PL data에 없음
            },
            'cumulative': {
                'net_sales': cumul_net_sales,
                'direct_profit': cumul_direct_profit,
                'direct_profit_rate': cumul_direct_profit_rate,
                'operating_profit': 0,  # PL data에 없음
            }
        }
        store_status.append(status)
    
    # 출력
    output = {
        'metadata': {
            'period': period,
            'generated_at': datetime.now().isoformat()
        },
        'stores': store_status
    }
    
    output_file = f'public/taiwan-store-status-{period}.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"[OK] 대만 매장 상태 생성 완료: {output_file}")
    print(f"  - 매장 수: {len(store_status)}")

if __name__ == '__main__':
    from datetime import datetime
    generate_taiwan_store_status('2512')
