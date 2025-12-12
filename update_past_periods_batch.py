#!/usr/bin/env python3
"""
과거 Period 데이터 일괄 업데이트 배치 스크립트
2410부터 2509까지 모든 Period를 순차적으로 업데이트

사용법:
    python update_past_periods_batch.py
    python update_past_periods_batch.py --start 2410 --end 2509
    python update_past_periods_batch.py --period 2410  # 특정 Period만
"""
import sys
import subprocess
import argparse
from datetime import datetime
import os

def generate_periods(start_period, end_period):
    """Period 리스트 생성 (예: 2410, 2411, ..., 2509)"""
    periods = []
    start_year = 2000 + int(start_period[:2])
    start_month = int(start_period[2:])
    end_year = 2000 + int(end_period[:2])
    end_month = int(end_period[2:])
    
    current_year = start_year
    current_month = start_month
    
    while (current_year < end_year) or (current_year == end_year and current_month <= end_month):
        period = f"{current_year % 100:02d}{current_month:02d}"
        periods.append(period)
        
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1
    
    return periods

def run_script(script_name, period=None):
    """스크립트 실행"""
    cmd = [sys.executable, script_name]
    if period:
        # 스크립트가 target_period를 인자로 받을 수 있도록 수정 필요
        # 현재는 스크립트 내부에서 처리하도록 구현
        pass
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5분 타임아웃
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "스크립트 실행 시간 초과 (5분)"
    except Exception as e:
        return False, "", str(e)

def update_hongkong_period(period):
    """홍콩마카오 대시보드 Period 업데이트"""
    print(f"\n{'='*80}")
    print(f"[홍콩마카오] {period} Period 업데이트 중...")
    print(f"{'='*80}")
    
    # CSV 파일 경로 (홍콩은 하나의 파일에 모든 Period가 포함되어 있을 수 있음)
    # 실제 파일명 확인 필요 - 여러 파일이면 해당 Period 파일, 하나면 전체 파일
    csv_file = '../Dashboard_Raw_Data/HKMC/2511/HKMC_Inventory_2511.csv'  # 기본값
    
    # Period별 파일이 있다면 시도
    period_csv = f'../Dashboard_Raw_Data/2401{period} 홍콩재고수불.csv'
    if os.path.exists(period_csv):
        csv_file = period_csv
    
    # 파일 존재 확인
    if not os.path.exists(csv_file):
        print(f"⚠️  CSV 파일이 없습니다: {csv_file}")
        print(f"   대체 파일 확인: {period_csv}")
        return False
    
    # generate_hongkong_dashboard_data.py 수정 필요: target_period 파라미터를 받도록
    # 임시로 스크립트를 직접 호출하는 대신, 함수를 import해서 사용
    try:
        from generate_hongkong_dashboard_data import generate_dashboard_data
        output_file = 'components/dashboard/hongkong-dashboard-data.json'
        generate_dashboard_data(csv_file, output_file, target_period=period)
        
        # PL Summary 생성
        from generate_pl_summary import main as generate_pl_main
        generate_pl_main(target_period_short=period)
        
        print(f"✅ [홍콩마카오] {period} 업데이트 완료")
        return True
    except Exception as e:
        print(f"❌ [홍콩마카오] {period} 업데이트 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def update_taiwan_period(period):
    """대만 대시보드 Period 업데이트"""
    print(f"\n{'='*80}")
    print(f"[대만] {period} Period 업데이트 중...")
    print(f"{'='*80}")
    
    # CSV 파일 경로 (대만은 파일명이 다를 수 있음)
    csv_file = '../Dashboard_Raw_Data/TW/2511/TW_Inventory_2511.csv'
    
    # 파일 존재 확인
    if not os.path.exists(csv_file):
        print(f"⚠️  CSV 파일이 없습니다: {csv_file}")
        return False
    
    try:
        from generate_taiwan_dashboard_data import generate_dashboard_data
        output_file = 'components/dashboard/taiwan-dashboard-data.json'
        generate_dashboard_data(csv_file, output_file, target_period=period)
        
        # PL Summary 생성
        from generate_taiwan_pl_summary import main as generate_pl_main
        generate_pl_main(target_period_short=period)
        
        print(f"✅ [대만] {period} 업데이트 완료")
        return True
    except Exception as e:
        print(f"❌ [대만] {period} 업데이트 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description='과거 Period 데이터 일괄 업데이트')
    parser.add_argument('--start', type=str, default='2410', help='시작 Period (예: 2410)')
    parser.add_argument('--end', type=str, default='2509', help='종료 Period (예: 2509)')
    parser.add_argument('--period', type=str, help='특정 Period만 업데이트 (예: 2410)')
    parser.add_argument('--hk-only', action='store_true', help='홍콩마카오만 업데이트')
    parser.add_argument('--tw-only', action='store_true', help='대만만 업데이트')
    parser.add_argument('--yes', '-y', action='store_true', help='확인 없이 자동 진행')
    
    args = parser.parse_args()
    
    if args.period:
        periods = [args.period]
    else:
        periods = generate_periods(args.start, args.end)
    
    print("="*80)
    print("과거 Period 데이터 일괄 업데이트")
    print("="*80)
    print(f"기간: {periods[0]} ~ {periods[-1]}")
    print(f"총 {len(periods)}개 Period 업데이트 예정")
    print(f"홍콩마카오: {'포함' if not args.tw_only else '제외'}")
    print(f"대만: {'포함' if not args.hk_only else '제외'}")
    print("="*80)
    
    # 확인
    if not args.yes:
        response = input("\n계속하시겠습니까? (y/n): ")
        if response.lower() != 'y':
            print("취소되었습니다.")
            return
    else:
        print("\n자동 진행 모드: 확인 없이 진행합니다.")
    
    # 결과 추적
    hk_success = []
    hk_failed = []
    tw_success = []
    tw_failed = []
    
    start_time = datetime.now()
    
    # 각 Period별로 업데이트
    for i, period in enumerate(periods, 1):
        print(f"\n[{i}/{len(periods)}] {period} Period 처리 중...")
        
        # 홍콩마카오 업데이트
        if not args.tw_only:
            if update_hongkong_period(period):
                hk_success.append(period)
            else:
                hk_failed.append(period)
        
        # 대만 업데이트
        if not args.hk_only:
            if update_taiwan_period(period):
                tw_success.append(period)
            else:
                tw_failed.append(period)
    
    end_time = datetime.now()
    elapsed = (end_time - start_time).total_seconds()
    
    # 결과 요약
    print("\n" + "="*80)
    print("업데이트 완료 요약")
    print("="*80)
    
    if not args.tw_only:
        print(f"\n[홍콩마카오]")
        print(f"  성공: {len(hk_success)}/{len(periods)}")
        if hk_success:
            print(f"  성공 Period: {', '.join(hk_success[:5])}{'...' if len(hk_success) > 5 else ''}")
        if hk_failed:
            print(f"  실패: {len(hk_failed)}/{len(periods)}")
            print(f"  실패 Period: {', '.join(hk_failed)}")
    
    if not args.hk_only:
        print(f"\n[대만]")
        print(f"  성공: {len(tw_success)}/{len(periods)}")
        if tw_success:
            print(f"  성공 Period: {', '.join(tw_success[:5])}{'...' if len(tw_success) > 5 else ''}")
        if tw_failed:
            print(f"  실패: {len(tw_failed)}/{len(periods)}")
            print(f"  실패 Period: {', '.join(tw_failed)}")
    
    print(f"\n총 소요 시간: {elapsed/60:.1f}분")
    print("="*80)

if __name__ == '__main__':
    main()

