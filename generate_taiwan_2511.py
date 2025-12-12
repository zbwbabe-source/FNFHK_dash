#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대만 대시보드 2511 데이터 생성 스크립트
"""
import sys
import os

# 현재 디렉토리 설정
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("=" * 80)
print("대만 대시보드 2511 데이터 생성")
print("=" * 80)

try:
    # 환율 업데이트: 2511 = 4.03
    from generate_taiwan_dashboard_data import generate_dashboard_data
    
    # 2511 데이터 생성
    csv_file = '../Dashboard_Raw_Data/TW/2511/TW_Inventory_2511.csv'
    output_file = 'components/dashboard/taiwan-dashboard-data-2511.json'
    
    print(f"CSV 파일: {csv_file}")
    print(f"출력 파일: {output_file}")
    print("=" * 80)
    
    # TWD to HKD 환율 설정
    import generate_taiwan_dashboard_data as gen
    gen.TWD_TO_HKD_RATE = 4.03  # 2511 환율
    
    print(f"환율 설정: {gen.TWD_TO_HKD_RATE}")
    print("=" * 80)
    
    # 데이터 생성
    generate_dashboard_data(csv_file, output_file, target_period='2511')
    
    # Public 폴더 복사
    import json
    import shutil
    public_output = output_file.replace('components/dashboard', 'public/dashboard')
    os.makedirs(os.path.dirname(public_output), exist_ok=True)
    shutil.copy(output_file, public_output)
    
    print(f"\n✅ 대만 대시보드 2511 데이터 생성 완료!")
    print(f"✅ Public 폴더 복사 완료: {public_output}")
    
except Exception as e:
    print(f"\n❌ 에러: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

