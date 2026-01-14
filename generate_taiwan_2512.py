#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대만 대시보드 2512 데이터 생성 스크립트
"""
import sys
import os

# 현재 디렉토리 설정
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("=" * 80)
print("대만 대시보드 2512 데이터 생성")
print("=" * 80)

try:
    # 환율 업데이트: 2512 = 4.02
    import generate_taiwan_dashboard_data as gen
    gen.TWD_TO_HKD_RATE = 4.02  # 2512 환율
    
    from generate_taiwan_dashboard_data import generate_dashboard_data
    
    # 2512 데이터 생성 (원본 CSV 사용)
    csv_file = 'D:/Cursor_work_space/HKMCTW_Dashboard/Dashboard_Raw_Data/TW/2512/TW_Inventory_2312_2512_v5_2_updated.csv'
    output_file = 'components/dashboard/taiwan-dashboard-data-2512.json'
    
    print(f"CSV 파일: {csv_file}")
    print(f"출력 파일: {output_file}")
    print("=" * 80)
    
    print(f"환율 설정: {gen.TWD_TO_HKD_RATE}")
    print(f"VAT 설정: {gen.VAT_EXCLUSION_RATE}")
    print("=" * 80)
    
    # 데이터 생성
    generate_dashboard_data(csv_file, output_file, target_period='2512')
    
    # Period별 파일명이 중복으로 생성되는 경우 처리
    period_file = output_file.replace('.json', '-2512.json')
    if os.path.exists(period_file) and not os.path.exists(output_file):
        import shutil
        shutil.copy(period_file, output_file)
    
    # Public 폴더 복사
    import json
    import shutil
    public_output = output_file.replace('components/dashboard', 'public/dashboard')
    os.makedirs(os.path.dirname(public_output), exist_ok=True)
    
    # components 폴더에 있는 파일 찾기
    if os.path.exists(output_file):
        shutil.copy(output_file, public_output)
    elif os.path.exists(period_file):
        shutil.copy(period_file, public_output)
        # period 파일도 components에 복사
        shutil.copy(period_file, output_file)
    
    print(f"\n대만 대시보드 2512 데이터 생성 완료!")
    print(f"Public 폴더 복사 완료: {public_output}")
    
except Exception as e:
    print(f"\n❌ 에러: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

