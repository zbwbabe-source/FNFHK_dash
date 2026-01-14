#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대만 매장별 누적 데이터 생성 스크립트
Period 2401-2412 (전년 누적), 2501-2512 (당년 누적) 실판매출 합계 계산
"""
import os
import sys
import csv
import json
import glob

# 현재 디렉토리 설정
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

def clean_number(value):
    """숫자 문자열에서 쉼표와 공백 제거 후 float 변환"""
    if not value or value == '':
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    # 문자열인 경우
    cleaned = str(value).replace(',', '').replace(' ', '').strip()
    if cleaned == '' or cleaned == '-':
        return 0.0
    try:
        return float(cleaned)
    except:
        return 0.0

def get_store_channel(store_code):
    """매장 코드로 채널 판단"""
    if store_code.startswith('TU'):
        return 'Outlet'
    elif store_code.startswith('TE'):
        return 'Online'
    else:
        return 'Retail'

def find_pl_csv(period):
    """PL CSV 파일 찾기"""
    possible_paths = [
        f'../Dashboard_Raw_Data/TW/{period}/TWPL_{period}.csv',
        f'../Dashboard_Raw_Data/TW/{period}/TW_PL_{period}.csv',
        f'../Dashboard_Raw_Data/hmd_pl_database_{period}.csv',
        '../Dashboard_Raw_Data/hmd_pl_database.csv'
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    # glob으로 찾기
    glob_pattern = f'../Dashboard_Raw_Data/TW/{period}/*PL*.csv'
    matches = glob.glob(glob_pattern)
    if matches:
        return matches[0]
    
    # 전체 데이터베이스 파일에서 찾기 (전년 데이터용)
    db_paths = [
        '../Dashboard_Raw_Data/hmd_pl_database.csv',
        '../Dashboard_Raw_Data/TW/hmd_pl_database.csv'
    ]
    for db_path in db_paths:
        if os.path.exists(db_path):
            return db_path
    
    return None

def calculate_cumulative_store_data(target_period='2512'):
    """매장별 누적 데이터 계산"""
    print("=" * 80)
    print(f"대만 매장별 누적 데이터 생성 (Period: {target_period})")
    print("=" * 80)
    
    # Period 계산
    target_year = 2000 + int(target_period[:2])
    target_month = int(target_period[2:4])
    prev_year = target_year - 1
    
    # 당년 누적 Period 리스트 (2501-2512)
    current_year_periods = []
    for month in range(1, target_month + 1):
        period_short = f"{target_period[:2]}{month:02d}"
        current_year_periods.append(period_short)
    
    # 전년 누적 Period 리스트 (2401-2412)
    prev_year_periods = []
    for month in range(1, 13):
        period_short = f"{prev_year % 100:02d}{month:02d}"
        prev_year_periods.append(period_short)
    
    print(f"\n당년 누적 Period: {current_year_periods}")
    print(f"전년 누적 Period: {prev_year_periods}")
    
    # 매장별 누적 데이터 저장
    store_cumulative = {}
    
    # 당년 누적 데이터 수집
    print(f"\n당년 누적 데이터 수집 중...")
    
    # TWPL_2512.csv에 모든 기간 데이터가 포함되어 있으므로 이를 우선 사용
    db_paths = [
        f'../Dashboard_Raw_Data/TW/{target_period}/TWPL_{target_period}.csv',
        f'../Dashboard_Raw_Data/TW/{target_period}/TW_PL_{target_period}.csv',
        '../Dashboard_Raw_Data/hmd_pl_database.csv',
        '../Dashboard_Raw_Data/TW/hmd_pl_database.csv'
    ]
    db_path_current = None
    for path in db_paths:
        if os.path.exists(path):
            db_path_current = path
            break
    
    if db_path_current:
        print(f"  [파일] 전체 데이터베이스: {db_path_current}")
        with open(db_path_current, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # TW만
                if row.get('CNTRY_CD', '') != 'TW':
                    continue
                
                # 브랜드 M (MLB)만
                if row.get('BRD_CD', '') != 'M':
                    continue
                
                # 온라인 제외 (TE로 시작하는 매장 제외)
                shop_cd = row.get('SHOP_CD', '')
                if shop_cd.startswith('TE'):
                    continue
                
                # 오피스 제외
                if shop_cd == 'T99':
                    continue
                
                # 실판매출 (ACCOUNT_NM이 '실매출액'인 경우)
                account_nm = row.get('ACCOUNT_NM', '').strip()
                if account_nm != '실매출액':
                    continue
                
                period_full = row.get('PERIOD', '')
                if not period_full:
                    continue
                
                # Period 형식 확인 (202501 또는 2501)
                period_str = str(period_full).strip()
                if len(period_str) == 6:  # 202501 형식
                    period_year = int(period_str[:4])
                    period_month = int(period_str[4:6])
                    period_short = f"{period_year % 100:02d}{period_month:02d}"
                elif len(period_str) == 4:  # 2501 형식
                    period_short = period_str
                else:
                    continue
                
                # 당년 Period만 처리
                if period_short not in current_year_periods:
                    continue
                
                value = clean_number(row.get('VALUE', 0))
                
                if shop_cd not in store_cumulative:
                    store_cumulative[shop_cd] = {
                        'shop_code': shop_cd,
                        'current_cumulative_net_sales': 0,
                        'prev_cumulative_net_sales': 0,
                        'channel': get_store_channel(shop_cd)
                    }
                
                store_cumulative[shop_cd]['current_cumulative_net_sales'] += value
    else:
        # Fallback: 개별 파일로 시도
        for period_short in current_year_periods:
            pl_csv_path = find_pl_csv(period_short)
            if not pl_csv_path:
                print(f"  [경고]  {period_short} Period CSV 파일 없음, 건너뜀")
                continue
            
            print(f"  [파일] {period_short}: {pl_csv_path}")
            with open(pl_csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # TW만
                    if row.get('CNTRY_CD', '') != 'TW':
                        continue
                    
                    # 브랜드 M (MLB)만
                    if row.get('BRD_CD', '') != 'M':
                        continue
                    
                    # 온라인 제외 (TE로 시작하는 매장 제외)
                    shop_cd = row.get('SHOP_CD', '')
                    if shop_cd.startswith('TE'):
                        continue
                    
                    # 오피스 제외
                    if shop_cd == 'T99':
                        continue
                    
                    # 실판매출 (ACCOUNT_NM이 '실매출액'인 경우)
                    account_nm = row.get('ACCOUNT_NM', '').strip()
                    if account_nm != '실매출액':
                        continue
                    
                    period_full = row.get('PERIOD', '')
                    if not period_full or str(period_full) != f"20{period_short}":
                        continue
                    
                    value = clean_number(row.get('VALUE', 0))
                    
                    if shop_cd not in store_cumulative:
                        store_cumulative[shop_cd] = {
                            'shop_code': shop_cd,
                            'current_cumulative_net_sales': 0,
                            'prev_cumulative_net_sales': 0,
                            'channel': get_store_channel(shop_cd)
                        }
                    
                    store_cumulative[shop_cd]['current_cumulative_net_sales'] += value
    
    # 전년 누적 데이터 수집 (전체 데이터베이스 파일에서)
    print(f"\n전년 누적 데이터 수집 중...")
    # TWPL_2512.csv에 모든 기간 데이터가 포함되어 있으므로 이를 우선 사용
    db_paths = [
        f'../Dashboard_Raw_Data/TW/{target_period}/TWPL_{target_period}.csv',
        f'../Dashboard_Raw_Data/TW/{target_period}/TW_PL_{target_period}.csv',
        '../Dashboard_Raw_Data/hmd_pl_database.csv',
        '../Dashboard_Raw_Data/TW/hmd_pl_database.csv'
    ]
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if db_path:
        print(f"  [파일] 전체 데이터베이스: {db_path}")
        with open(db_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # TW만
                if row.get('CNTRY_CD', '') != 'TW':
                    continue
                
                # 브랜드 M (MLB)만
                if row.get('BRD_CD', '') != 'M':
                    continue
                
                # 온라인 제외
                shop_cd = row.get('SHOP_CD', '')
                if shop_cd.startswith('TE'):
                    continue
                
                # 오피스 제외
                if shop_cd == 'T99':
                    continue
                
                # 실판매출
                account_nm = row.get('ACCOUNT_NM', '').strip()
                if account_nm != '실매출액':
                    continue
                
                period_full = row.get('PERIOD', '')
                if not period_full:
                    continue
                
                # Period 형식 확인 (202401 또는 2401)
                period_str = str(period_full).strip()
                if len(period_str) == 6:  # 202401 형식
                    period_year = int(period_str[:4])
                    period_month = int(period_str[4:6])
                    period_short = f"{period_year % 100:02d}{period_month:02d}"
                elif len(period_str) == 4:  # 2401 형식
                    period_short = period_str
                else:
                    continue
                
                # 전년 Period만 처리
                if period_short not in prev_year_periods:
                    continue
                
                value = clean_number(row.get('VALUE', 0))
                
                if shop_cd not in store_cumulative:
                    store_cumulative[shop_cd] = {
                        'shop_code': shop_cd,
                        'current_cumulative_net_sales': 0,
                        'prev_cumulative_net_sales': 0,
                        'channel': get_store_channel(shop_cd)
                    }
                
                store_cumulative[shop_cd]['prev_cumulative_net_sales'] += value
    else:
        print(f"  [경고] 전체 데이터베이스 파일을 찾을 수 없습니다.")
        # 개별 파일로 시도
        for period_short in prev_year_periods:
            pl_csv_path = find_pl_csv(period_short)
            if not pl_csv_path:
                continue
            
            print(f"  [파일] {period_short}: {pl_csv_path}")
            with open(pl_csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('CNTRY_CD', '') != 'TW':
                        continue
                    if row.get('BRD_CD', '') != 'M':
                        continue
                    shop_cd = row.get('SHOP_CD', '')
                    if shop_cd.startswith('TE') or shop_cd == 'T99':
                        continue
                    account_nm = row.get('ACCOUNT_NM', '').strip()
                    if account_nm != '실매출액':
                        continue
                    period_full = row.get('PERIOD', '')
                    if not period_full or str(period_full) != f"20{period_short}":
                        continue
                    value = clean_number(row.get('VALUE', 0))
                    if shop_cd not in store_cumulative:
                        store_cumulative[shop_cd] = {
                            'shop_code': shop_cd,
                            'current_cumulative_net_sales': 0,
                            'prev_cumulative_net_sales': 0,
                            'channel': get_store_channel(shop_cd)
                        }
                    store_cumulative[shop_cd]['prev_cumulative_net_sales'] += value
    
    # 직접이익 계산 (당년 누적)
    print(f"\n당년 누적 직접이익 계산 중...")
    
    if db_path_current:
        with open(db_path_current, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('CNTRY_CD', '') != 'TW':
                    continue
                if row.get('BRD_CD', '') != 'M':
                    continue
                shop_cd = row.get('SHOP_CD', '')
                if shop_cd.startswith('TE') or shop_cd == 'T99':
                    continue
                
                if shop_cd not in store_cumulative:
                    continue
                
                account_nm = row.get('ACCOUNT_NM', '').strip()
                if account_nm != '영업이익':
                    continue
                
                period_full = row.get('PERIOD', '')
                if not period_full:
                    continue
                
                # Period 형식 확인
                period_str = str(period_full).strip()
                if len(period_str) == 6:  # 202501 형식
                    period_year = int(period_str[:4])
                    period_month = int(period_str[4:6])
                    period_short = f"{period_year % 100:02d}{period_month:02d}"
                elif len(period_str) == 4:  # 2501 형식
                    period_short = period_str
                else:
                    continue
                
                # 당년 Period만 처리
                if period_short not in current_year_periods:
                    continue
                
                value = clean_number(row.get('VALUE', 0))
                if 'current_cumulative_direct_profit' not in store_cumulative[shop_cd]:
                    store_cumulative[shop_cd]['current_cumulative_direct_profit'] = 0
                store_cumulative[shop_cd]['current_cumulative_direct_profit'] += value
    else:
        # Fallback: 개별 파일로 시도
        for period_short in current_year_periods:
            pl_csv_path = find_pl_csv(period_short)
            if not pl_csv_path:
                continue
            
            with open(pl_csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('CNTRY_CD', '') != 'TW':
                        continue
                    if row.get('BRD_CD', '') != 'M':
                        continue
                    shop_cd = row.get('SHOP_CD', '')
                    if shop_cd.startswith('TE') or shop_cd == 'T99':
                        continue
                    
                    if shop_cd not in store_cumulative:
                        continue
                    
                    account_nm = row.get('ACCOUNT_NM', '').strip()
                    period_full = row.get('PERIOD', '')
                    if not period_full or str(period_full) != f"20{period_short}":
                        continue
                    
                    # 영업이익을 직접이익으로 사용
                    if account_nm == '영업이익':
                        value = clean_number(row.get('VALUE', 0))
                        if 'current_cumulative_direct_profit' not in store_cumulative[shop_cd]:
                            store_cumulative[shop_cd]['current_cumulative_direct_profit'] = 0
                        store_cumulative[shop_cd]['current_cumulative_direct_profit'] += value
    
    # 직접이익 계산 (전년 누적) - 전체 데이터베이스 파일에서
    print(f"\n전년 누적 직접이익 계산 중...")
    # 당년 데이터와 동일한 소스 파일 사용
    db_paths = [
        f'../Dashboard_Raw_Data/TW/{target_period}/TWPL_{target_period}.csv',
        f'../Dashboard_Raw_Data/TW/{target_period}/TW_PL_{target_period}.csv',
        '../Dashboard_Raw_Data/hmd_pl_database.csv',
        '../Dashboard_Raw_Data/TW/hmd_pl_database.csv'
    ]
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if db_path:
        with open(db_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('CNTRY_CD', '') != 'TW':
                    continue
                if row.get('BRD_CD', '') != 'M':
                    continue
                shop_cd = row.get('SHOP_CD', '')
                if shop_cd.startswith('TE') or shop_cd == 'T99':
                    continue
                
                if shop_cd not in store_cumulative:
                    continue
                
                account_nm = row.get('ACCOUNT_NM', '').strip()
                if account_nm != '영업이익':
                    continue
                
                period_full = row.get('PERIOD', '')
                if not period_full:
                    continue
                
                # Period 형식 확인
                period_str = str(period_full).strip()
                if len(period_str) == 6:  # 202401 형식
                    period_year = int(period_str[:4])
                    period_month = int(period_str[4:6])
                    period_short = f"{period_year % 100:02d}{period_month:02d}"
                elif len(period_str) == 4:  # 2401 형식
                    period_short = period_str
                else:
                    continue
                
                # 전년 Period만 처리
                if period_short not in prev_year_periods:
                    continue
                
                value = clean_number(row.get('VALUE', 0))
                if 'prev_cumulative_direct_profit' not in store_cumulative[shop_cd]:
                    store_cumulative[shop_cd]['prev_cumulative_direct_profit'] = 0
                store_cumulative[shop_cd]['prev_cumulative_direct_profit'] += value
    else:
        # 개별 파일로 시도
        for period_short in prev_year_periods:
            pl_csv_path = find_pl_csv(period_short)
            if not pl_csv_path:
                continue
            
            with open(pl_csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('CNTRY_CD', '') != 'TW':
                        continue
                    if row.get('BRD_CD', '') != 'M':
                        continue
                    shop_cd = row.get('SHOP_CD', '')
                    if shop_cd.startswith('TE') or shop_cd == 'T99':
                        continue
                    
                    if shop_cd not in store_cumulative:
                        continue
                    
                    account_nm = row.get('ACCOUNT_NM', '').strip()
                    period_full = row.get('PERIOD', '')
                    if not period_full or str(period_full) != f"20{period_short}":
                        continue
                    
                    if account_nm == '영업이익':
                        value = clean_number(row.get('VALUE', 0))
                        if 'prev_cumulative_direct_profit' not in store_cumulative[shop_cd]:
                            store_cumulative[shop_cd]['prev_cumulative_direct_profit'] = 0
                        store_cumulative[shop_cd]['prev_cumulative_direct_profit'] += value
    
    # 누락된 필드 초기화
    for shop_cd in store_cumulative:
        if 'current_cumulative_direct_profit' not in store_cumulative[shop_cd]:
            store_cumulative[shop_cd]['current_cumulative_direct_profit'] = 0
        if 'prev_cumulative_direct_profit' not in store_cumulative[shop_cd]:
            store_cumulative[shop_cd]['prev_cumulative_direct_profit'] = 0
    
    # CSV 저장
    output_csv = f'../Dashboard_Raw_Data/TW/{target_period}/TW_Store_Cumulative_{target_period}.csv'
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    
    print(f"\n[저장] CSV 저장 중: {output_csv}")
    with open(output_csv, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = ['shop_code', 'channel', 'current_cumulative_net_sales', 'prev_cumulative_net_sales', 
                     'current_cumulative_direct_profit', 'prev_cumulative_direct_profit']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for shop_cd in sorted(store_cumulative.keys()):
            writer.writerow(store_cumulative[shop_cd])
    
    print(f"[완료] CSV 저장 완료: {len(store_cumulative)}개 매장")
    
    # JSON 업데이트
    pl_json_path = f'public/dashboard/taiwan-pl-data-{target_period}.json'
    if os.path.exists(pl_json_path):
        print(f"\n[저장] JSON 업데이트 중: {pl_json_path}")
        with open(pl_json_path, 'r', encoding='utf-8') as f:
            pl_data = json.load(f)
        
        # channel_direct_profit.stores에 누적 데이터 추가
        if 'channel_direct_profit' not in pl_data:
            pl_data['channel_direct_profit'] = {}
        if 'stores' not in pl_data['channel_direct_profit']:
            pl_data['channel_direct_profit']['stores'] = {}
        
        for shop_cd, data in store_cumulative.items():
            if shop_cd not in pl_data['channel_direct_profit']['stores']:
                pl_data['channel_direct_profit']['stores'][shop_cd] = {}
            
            # CSV 데이터가 이미 1K HKD 단위이므로 그대로 저장
            # (PL CSV의 VALUE 컬럼은 이미 환율 적용 및 1000으로 나눈 값)
            pl_data['channel_direct_profit']['stores'][shop_cd]['cumulative_net_sales'] = round(
                data['current_cumulative_net_sales'], 2
            )
            pl_data['channel_direct_profit']['stores'][shop_cd]['cumulative_net_sales_prev'] = round(
                data['prev_cumulative_net_sales'], 2
            )
            pl_data['channel_direct_profit']['stores'][shop_cd]['cumulative_direct_profit'] = round(
                data['current_cumulative_direct_profit'], 2
            )
            pl_data['channel_direct_profit']['stores'][shop_cd]['cumulative_direct_profit_prev'] = round(
                data['prev_cumulative_direct_profit'], 2
            )
        
        with open(pl_json_path, 'w', encoding='utf-8') as f:
            json.dump(pl_data, f, ensure_ascii=False, indent=2)
        
        print(f"[완료] JSON 업데이트 완료")
    else:
        print(f"⚠️  JSON 파일 없음: {pl_json_path}")
    
    print(f"\n{'='*80}")
    print(f"[완료] 대만 매장별 누적 데이터 생성 완료!")
    print(f"{'='*80}\n")
    
    # 요약 출력
    print(f"[요약] 요약:")
    print(f"  - 총 매장 수: {len(store_cumulative)}개")
    retail_count = sum(1 for s in store_cumulative.values() if s['channel'] == 'Retail')
    outlet_count = sum(1 for s in store_cumulative.values() if s['channel'] == 'Outlet')
    print(f"  - 리테일: {retail_count}개")
    print(f"  - 아울렛: {outlet_count}개")
    
    total_current = sum(s['current_cumulative_net_sales'] for s in store_cumulative.values())
    total_prev = sum(s['prev_cumulative_net_sales'] for s in store_cumulative.values())
    total_current_profit = sum(s.get('current_cumulative_direct_profit', 0) for s in store_cumulative.values())
    total_prev_profit = sum(s.get('prev_cumulative_direct_profit', 0) for s in store_cumulative.values())
    print(f"  - 당년 누적 실판매출: {total_current:,.0f}K HKD")
    print(f"  - 전년 누적 실판매출: {total_prev:,.0f}K HKD")
    print(f"  - 당년 누적 직접이익: {total_current_profit:,.0f}K HKD")
    print(f"  - 전년 누적 직접이익: {total_prev_profit:,.0f}K HKD")

if __name__ == '__main__':
    target_period = sys.argv[1] if len(sys.argv) > 1 else '2512'
    calculate_cumulative_store_data(target_period)
