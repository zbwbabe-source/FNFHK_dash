#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
홍콩 대시보드 2510 데이터 생성 스크립트
2510 원본 CSV 데이터를 제대로 전처리하여 정확한 대시보드 데이터 생성
"""
import sys
import os
import traceback
from datetime import datetime

# 현재 디렉토리를 스크립트 디렉토리로 변경
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("=" * 80)
print("홍콩 대시보드 2510 데이터 생성")
print("=" * 80)
print(f"작업 디렉토리: {os.getcwd()}")
print(f"Python 버전: {sys.version}")
print(f"시작 시간: {datetime.now().isoformat()}")
print("=" * 80)

try:
    # update_hongkong_dashboard 모듈 import
    from update_hongkong_dashboard import generate_dashboard_data
    
    csv_dir = '../Dashboard_Raw_Data'
    output_file = 'components/dashboard/hongkong-dashboard-data-2510.json'
    
    print(f"\nCSV 디렉토리: {csv_dir}")
    print(f"출력 파일: {output_file}")
    print(f"CSV 디렉토리 존재: {os.path.exists(csv_dir)}")
    print(f"출력 디렉토리 존재: {os.path.exists(os.path.dirname(output_file))}")
    
    # CSV 파일 확인 (HKMC 폴더 구조 지원)
    import glob
    hkmc_dir = os.path.join(csv_dir, 'HKMC', '2510')
    if os.path.exists(hkmc_dir):
        csv_pattern = os.path.join(hkmc_dir, '*2510*.csv')
    else:
        csv_pattern = os.path.join(csv_dir, '*홍콩재고수불*.csv')
    csv_files = [f for f in glob.glob(csv_pattern) if 'Inventory' in f or '홍콩재고수불' in f]
    print(f"\n발견된 CSV 파일: {len(csv_files)}개")
    for f in sorted(csv_files):
        print(f"  - {os.path.basename(f)}")
    
    if not csv_files:
        print("\n경고: 재고수불 CSV 파일을 찾을 수 없습니다!")
        print("PL CSV만 사용합니다.")
    
    print("\n" + "=" * 80)
    print("대시보드 데이터 생성 시작...")
    print("=" * 80 + "\n")
    
    # 대시보드 데이터 생성 (2510 기간 지정)
    generate_dashboard_data(csv_dir, output_file, target_period='2510')
    
    # 결과 확인
    import json
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        file_size = os.path.getsize(output_file) / 1024 / 1024  # MB
        
        print("\n" + "=" * 80)
        print("[OK] 홍콩 대시보드 2510 데이터 생성 완료!")
        print("=" * 80)
        print(f"파일: {output_file}")
        print(f"파일 크기: {file_size:.2f} MB")
        print(f"Period: {data['metadata']['last_period']}")
        print(f"전년 동월: {data['metadata']['previous_period']}")
        print(f"생성 시간: {data['metadata']['generated_at']}")
        print("=" * 80)
        
        # public 폴더에도 복사
        public_output = output_file.replace('components/dashboard', 'public/dashboard')
        os.makedirs(os.path.dirname(public_output), exist_ok=True)
        with open(public_output, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Public 폴더 복사 완료: {public_output}")
        print("=" * 80)
        
    else:
        print(f"\n오류: 출력 파일이 생성되지 않았습니다: {output_file}")
        sys.exit(1)
        
except Exception as e:
    print("\n" + "=" * 80)
    print("오류 발생!")
    print("=" * 80)
    print(f"에러: {str(e)}")
    print("\n상세 에러:")
    traceback.print_exc()
    print("=" * 80)
    sys.exit(1)

print("\n완료!")
