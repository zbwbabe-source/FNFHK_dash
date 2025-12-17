#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
대만 대시보드 2510 데이터 생성 스크립트
2511과 독립적으로 동작하며, 2510 데이터만 처리합니다.
"""
import sys
import os

# 현재 디렉토리 설정
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("=" * 80)
print("대만 대시보드 2510 데이터 생성")
print("=" * 80)

try:
    # 환율 업데이트: 2510 = 4.05 (예상값, 실제 데이터 확인 필요)
    from generate_taiwan_dashboard_data import generate_dashboard_data
    
    # 2510 데이터 생성
    csv_file = '../Dashboard_Raw_Data/TW/2510/TW Inventory_2510.csv'
    output_file = 'components/dashboard/taiwan-dashboard-data-2510.json'
    
    print(f"CSV 파일: {csv_file}")
    print(f"출력 파일: {output_file}")
    
    # CSV 파일 존재 확인
    if not os.path.exists(csv_file):
        print(f"\n경고: CSV 파일을 찾을 수 없습니다: {csv_file}")
        print("대안 경로를 시도합니다...")
        
        # 대안 경로들
        alternative_paths = [
            '../Dashboard_Raw_Data/TAIWAN/2510/TW_Inventory_2510.csv',
            '../Dashboard_Raw_Data/TW_Inventory_2510.csv',
            '../Dashboard_Raw_Data/tw_inventory_2510.csv'
        ]
        
        csv_file = None
        for path in alternative_paths:
            if os.path.exists(path):
                csv_file = path
                print(f"찾음: {csv_file}")
                break
        
        if not csv_file:
            print("\n오류: 2510 CSV 파일을 찾을 수 없습니다.")
            print("다음 경로를 확인하세요:")
            for path in alternative_paths:
                print(f"  - {path}")
            sys.exit(1)
    
    print("=" * 80)
    
    # 데이터 생성
    generate_dashboard_data(csv_file, output_file, target_period='2510')
    
    # Public 폴더 복사
    import json
    import shutil
    public_output = output_file.replace('components/dashboard', 'public/dashboard')
    os.makedirs(os.path.dirname(public_output), exist_ok=True)
    shutil.copy(output_file, public_output)
    
    print(f"\n[OK] 대만 대시보드 2510 데이터 생성 완료!")
    print(f"[OK] Public 폴더 복사 완료: {public_output}")
    
except Exception as e:
    print(f"\n오류: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
