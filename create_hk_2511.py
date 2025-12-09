#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os

# 작업 디렉토리 확인
print("Current directory:", os.getcwd())
print("Script directory:", os.path.dirname(os.path.abspath(__file__)))

# CSV 파일 확인
import glob
csv_pattern = os.path.join('../Dashboard_Raw_Data', '*홍콩재고수불*.csv')
csv_files = glob.glob(csv_pattern)
print(f"\nCSV files found: {len(csv_files)}")
for f in csv_files:
    print(f"  - {f}")

# update_hongkong_dashboard import
try:
    from update_hongkong_dashboard import generate_dashboard_data
    print("\n✅ Successfully imported generate_dashboard_data")
    
    # 2511 데이터 생성
    csv_dir = '../Dashboard_Raw_Data'
    output_file = 'components/dashboard/hongkong-dashboard-data-2511.json'
    
    print(f"\nGenerating: {output_file}")
    generate_dashboard_data(csv_dir, output_file)
    
    print(f"\n✅ File created: {output_file}")
    print(f"File exists: {os.path.exists(output_file)}")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

