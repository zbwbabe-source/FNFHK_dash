#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 데이터 품질 검증 스크립트
새로운 Period 추가 전 반드시 실행!

사용법:
    python validate_csv_data.py 2511
"""

import pandas as pd
import sys
import os

def validate_hongkong_csv(period):
    """홍콩 CSV 데이터 검증"""
    print(f"\n{'='*80}")
    print(f"[홍콩] {period} 데이터 검증 중...")
    print(f"{'='*80}\n")
    
    # CSV 파일 찾기
    possible_paths = [
        f'../Dashboard_Raw_Data/홍콩재고수불_{period}.csv',
        f'../Dashboard_Raw_Data/24012{period} 홍콩재고수불.csv'
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        print(f"❌ CSV 파일을 찾을 수 없습니다.")
        print(f"   확인 경로:")
        for path in possible_paths:
            print(f"   - {path}")
        return False
    
    print(f"✅ CSV 파일 발견: {csv_path}\n")
    
    # CSV 읽기
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        print(f"❌ CSV 파일 읽기 실패: {str(e)}")
        return False
    
    # Period 필터링
    period_int = int(period)
    df_period = df[df['Period'] == period_int]
    
    # 검증 1: 데이터 존재
    print(f"📊 데이터 행 수: {len(df_period):,}개")
    if len(df_period) == 0:
        print(f"❌ {period} Period 데이터가 없습니다!")
        print(f"   CSV에 존재하는 Period: {sorted(df['Period'].unique())}")
        return False
    print(f"✅ 검증 1 통과: 데이터 존재\n")
    
    # 검증 2: 주요 컬럼 NULL/Zero 비율
    critical_cols = ['Net_Sales', 'Gross_Sales', 'Stock_Price', 'Stock_Cost']
    print(f"📋 주요 컬럼 데이터 품질:")
    
    failed = False
    for col in critical_cols:
        if col not in df_period.columns:
            print(f"❌ {col} 컬럼이 없습니다!")
            failed = True
            continue
        
        null_count = df_period[col].isnull().sum()
        null_ratio = null_count / len(df_period) * 100
        zero_count = (df_period[col] == 0).sum()
        zero_ratio = zero_count / len(df_period) * 100
        
        status = "✅" if null_ratio < 50 else "❌"
        print(f"  {status} {col:20s}: NULL {null_ratio:5.1f}% ({null_count:,}개), Zero {zero_ratio:5.1f}% ({zero_count:,}개)")
        
        if null_ratio >= 50:
            print(f"     ⚠️  경고: NULL 비율이 너무 높습니다!")
            failed = True
    
    if failed:
        print(f"\n❌ 검증 2 실패: 데이터 품질 불량\n")
        return False
    print(f"\n✅ 검증 2 통과: 데이터 품질 양호\n")
    
    # 검증 3: 총 매출 합리성
    total_sales = df_period['Net_Sales'].sum()
    print(f"💰 총 실판매출: {total_sales:,.0f} HKD")
    
    if total_sales < 1000000:  # 100만 미만이면 이상
        print(f"❌ 총 매출이 너무 낮습니다! (최소 1,000,000 HKD 필요)")
        return False
    print(f"✅ 검증 3 통과: 총 매출 합리적\n")
    
    # 검증 4: 전월 대비 비교 (있으면)
    prev_period = period_int - 1
    df_prev = df[df['Period'] == prev_period]
    if len(df_prev) > 0:
        prev_sales = df_prev['Net_Sales'].sum()
        yoy_ratio = (total_sales / prev_sales) * 100 if prev_sales > 0 else 0
        
        print(f"📈 전월 대비:")
        print(f"   전월 ({prev_period}) 매출: {prev_sales:,.0f} HKD")
        print(f"   당월 ({period}) 매출: {total_sales:,.0f} HKD")
        print(f"   비율: {yoy_ratio:.1f}%")
        
        if yoy_ratio < 50 or yoy_ratio > 200:
            print(f"   ⚠️  경고: 전월 대비 변동이 큽니다. 데이터를 확인하세요.")
        else:
            print(f"   ✅ 전월 대비 합리적 범위")
    
    print(f"\n{'='*80}")
    print(f"✅ [홍콩] {period} 데이터 검증 완료 - 모든 테스트 통과!")
    print(f"{'='*80}\n")
    return True


def validate_taiwan_csv(period):
    """대만 CSV 데이터 검증"""
    print(f"\n{'='*80}")
    print(f"[대만] {period} 데이터 검증 중...")
    print(f"{'='*80}\n")
    
    # CSV 파일 찾기
    possible_paths = [
        f'../Dashboard_Raw_Data/대만재고수불_{period}.csv',
        '../Dashboard_Raw_Data/대만재고수불.csv'
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        print(f"❌ CSV 파일을 찾을 수 없습니다.")
        return False
    
    print(f"✅ CSV 파일 발견: {csv_path}\n")
    
    # CSV 읽기
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        print(f"❌ CSV 파일 읽기 실패: {str(e)}")
        return False
    
    # Period 필터링
    period_int = int(period)
    df_period = df[df['Period'] == period_int]
    
    # 검증
    print(f"📊 데이터 행 수: {len(df_period):,}개")
    if len(df_period) == 0:
        print(f"❌ {period} Period 데이터가 없습니다!")
        return False
    
    total_sales = df_period['Net_Sales'].sum()
    print(f"💰 총 실판매출: {total_sales:,.0f} TWD")
    
    if total_sales < 10000000:  # 1000만 미만이면 이상
        print(f"❌ 총 매출이 너무 낮습니다!")
        return False
    
    print(f"\n{'='*80}")
    print(f"✅ [대만] {period} 데이터 검증 완료!")
    print(f"{'='*80}\n")
    return True


def validate_pl_database(period):
    """PL 데이터베이스 검증"""
    print(f"\n{'='*80}")
    print(f"[PL Database] {period} 데이터 검증 중...")
    print(f"{'='*80}\n")
    
    # CSV 파일 찾기 (period별 파일 우선, 없으면 기본 파일)
    possible_paths = [
        f'../Dashboard_Raw_Data/hmd_pl_database_{period}.csv',
        '../Dashboard_Raw_Data/hmd_pl_database.csv'
    ]
    
    csv_path = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_path = path
            break
    
    if not csv_path:
        print(f"❌ PL 데이터베이스 파일을 찾을 수 없습니다.")
        print(f"   확인 경로:")
        for path in possible_paths:
            print(f"   - {path}")
        return False
    
    print(f"✅ 파일 발견: {csv_path}\n")
    
    # CSV 읽기
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {str(e)}")
        return False
    
    # Period 필터링 (202511 형식)
    period_full = int(f"20{period}")
    df_period = df[df['PERIOD'] == period_full]
    
    print(f"📊 데이터 행 수: {len(df_period):,}개")
    if len(df_period) == 0:
        print(f"❌ {period_full} Period 데이터가 없습니다!")
        print(f"   CSV에 존재하는 Period: {sorted(df['PERIOD'].unique())}")
        return False
    
    # 국가별 분포
    print(f"\n📋 국가별 데이터 분포:")
    country_counts = df_period['CNTRY_CD'].value_counts()
    for country, count in country_counts.items():
        print(f"   {country}: {count:,}개")
    
    print(f"\n{'='*80}")
    print(f"✅ [PL Database] {period} 데이터 검증 완료!")
    print(f"{'='*80}\n")
    return True


def main():
    if len(sys.argv) < 2:
        print("사용법: python validate_csv_data.py <period>")
        print("예시: python validate_csv_data.py 2511")
        sys.exit(1)
    
    period = sys.argv[1]
    
    print("\n" + "="*80)
    print("CSV 데이터 품질 검증 시작")
    print("="*80)
    print(f"Period: {period}")
    print("="*80)
    
    results = {
        '홍콩': validate_hongkong_csv(period),
        '대만': validate_taiwan_csv(period),
        'PL': validate_pl_database(period)
    }
    
    # 최종 결과
    print("\n" + "="*80)
    print("최종 검증 결과")
    print("="*80)
    
    all_passed = True
    for name, passed in results.items():
        status = "✅ 통과" if passed else "❌ 실패"
        print(f"{name:10s}: {status}")
        if not passed:
            all_passed = False
    
    print("="*80)
    
    if all_passed:
        print("\n🎉 모든 검증 통과! 대시보드 업데이트를 진행하세요.")
        sys.exit(0)
    else:
        print("\n⚠️  일부 검증 실패! CSV 데이터를 확인하고 수정한 후 다시 시도하세요.")
        sys.exit(1)


if __name__ == '__main__':
    main()












