#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2510 대시보드 데이터 생성 스크립트
홍콩재고수불_2511.csv와 대만재고수불_2511.csv에서 2510 period 데이터를 추출하여 생성
"""
import sys
import os
import json
import shutil

# 현재 디렉토리 설정
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("=" * 80)
print("2510 대시보드 데이터 생성")
print("=" * 80)

try:
    # 1. 홍콩 2510 데이터 생성
    print("\n1. 홍콩 2510 데이터 생성 중...")
    from update_hongkong_dashboard import generate_dashboard_data as gen_hk
    
    csv_dir = '../Dashboard_Raw_Data'
    output_file = 'components/dashboard/hongkong-dashboard-data-2510.json'
    
    # 2510 데이터 생성 (target_period 지정)
    gen_hk(csv_dir, output_file, target_period='2510')
    
    # Public 폴더 복사
    public_output = output_file.replace('components/dashboard', 'public/dashboard')
    os.makedirs(os.path.dirname(public_output), exist_ok=True)
    shutil.copy(output_file, public_output)
    
    print(f"✅ 홍콩 2510 데이터 생성 완료: {output_file}")
    print(f"✅ Public 폴더 복사: {public_output}")
    
    # 2. 대만 2510 데이터 생성
    print("\n2. 대만 2510 데이터 생성 중...")
    from generate_taiwan_dashboard_data import generate_dashboard_data as gen_taiwan
    import generate_taiwan_dashboard_data as tw_gen
    
    # 2510 환율 설정 (필요시 수정)
    tw_gen.TWD_TO_HKD_RATE = 3.92  # 2510 환율
    
    # 대만 CSV에서 2510 데이터 생성
    tw_csv = '../Dashboard_Raw_Data/TW/2511/TW_Inventory_2511.csv'
    tw_output = 'components/dashboard/taiwan-dashboard-data-2510.json'
    
    gen_taiwan(tw_csv, tw_output, target_period='2510')
    
    # Public 폴더 복사
    tw_public = tw_output.replace('components/dashboard', 'public/dashboard')
    os.makedirs(os.path.dirname(tw_public), exist_ok=True)
    shutil.copy(tw_output, tw_public)
    
    print(f"✅ 대만 2510 데이터 생성 완료: {tw_output}")
    print(f"✅ Public 폴더 복사: {tw_public}")
    
    print("\n" + "=" * 80)
    print("✅ 2510 대시보드 데이터 생성 완료!")
    print("=" * 80)
    
except Exception as e:
    print(f"\n❌ 에러: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
