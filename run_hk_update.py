#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""홍콩 대시보드 업데이트 실행 스크립트"""
import sys
import os
import traceback

# 현재 디렉토리를 스크립트 디렉토리로 변경
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print(f"작업 디렉토리: {os.getcwd()}")
print(f"Python 버전: {sys.version}")

try:
    # update_hongkong_dashboard 모듈 import
    from update_hongkong_dashboard import generate_dashboard_data
    
    csv_dir = '../Dashboard_Raw_Data'
    output_file = 'components/dashboard/hongkong-dashboard-data.json'
    
    print(f"\nCSV 디렉토리: {csv_dir}")
    print(f"출력 파일: {output_file}")
    print(f"CSV 디렉토리 존재: {os.path.exists(csv_dir)}")
    print(f"출력 디렉토리 존재: {os.path.exists(os.path.dirname(output_file))}")
    
    # CSV 파일 확인
    import glob
    csv_pattern = os.path.join(csv_dir, '*홍콩재고수불.csv')
    csv_files = glob.glob(csv_pattern)
    print(f"\n발견된 CSV 파일: {len(csv_files)}개")
    for f in csv_files:
        print(f"  - {f}")
    
    if not csv_files:
        print("❌ CSV 파일을 찾을 수 없습니다!")
        sys.exit(1)
    
    print("\n" + "=" * 80)
    print("홍콩 대시보드 데이터 생성 시작")
    print("=" * 80)
    
    # 대시보드 데이터 생성
    generate_dashboard_data(csv_dir, output_file)
    
    # 결과 확인
    import json
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("\n" + "=" * 80)
        print("✅ 업데이트 완료!")
        print("=" * 80)
        print(f"last_period: {data['metadata']['last_period']}")
        print(f"previous_period: {data['metadata']['previous_period']}")
        print(f"generated_at: {data['metadata']['generated_at']}")
        print("=" * 80)
    else:
        print(f"\n❌ 출력 파일이 생성되지 않았습니다: {output_file}")
        sys.exit(1)
        
except Exception as e:
    print("\n" + "=" * 80)
    print("❌ 에러 발생!")
    print("=" * 80)
    print(f"에러: {str(e)}")
    print("\n상세 에러:")
    traceback.print_exc()
    print("=" * 80)
    sys.exit(1)

