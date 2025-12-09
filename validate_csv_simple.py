#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
간단한 CSV 검증 스크립트 (출력 파일로 저장)
"""
import pandas as pd
import sys
import os

def validate_csv(period):
    """CSV 파일 검증"""
    results = []
    
    # 홍콩 CSV 검증
    hk_path = f'../Dashboard_Raw_Data/홍콩재고수불_{period}.csv'
    if os.path.exists(hk_path):
        try:
            df = pd.read_csv(hk_path, encoding='utf-8')
            df_period = df[df['Period'] == int(period)]
            total_sales = df_period['Net_Sales'].sum() if 'Net_Sales' in df_period.columns else 0
            results.append(f"✅ 홍콩 CSV: {len(df_period):,}행, 총 매출: {total_sales:,.0f} HKD")
        except Exception as e:
            results.append(f"❌ 홍콩 CSV 오류: {str(e)}")
    else:
        results.append(f"❌ 홍콩 CSV 파일 없음: {hk_path}")
    
    # 대만 CSV 검증
    tw_path = f'../Dashboard_Raw_Data/대만재고수불_{period}.csv'
    if os.path.exists(tw_path):
        try:
            df = pd.read_csv(tw_path, encoding='utf-8')
            df_period = df[df['Period'] == int(period)]
            total_sales = df_period['Net_Sales'].sum() if 'Net_Sales' in df_period.columns else 0
            results.append(f"✅ 대만 CSV: {len(df_period):,}행, 총 매출: {total_sales:,.0f} TWD")
        except Exception as e:
            results.append(f"❌ 대만 CSV 오류: {str(e)}")
    else:
        results.append(f"❌ 대만 CSV 파일 없음: {tw_path}")
    
    # PL Database 검증
    pl_paths = [
        f'../Dashboard_Raw_Data/hmd_pl_database_{period}.csv',
        '../Dashboard_Raw_Data/hmd_pl_database.csv'
    ]
    pl_found = False
    for pl_path in pl_paths:
        if os.path.exists(pl_path):
            try:
                df = pd.read_csv(pl_path, encoding='utf-8')
                period_full = int(f"20{period}")
                df_period = df[df['PERIOD'] == period_full]
                if len(df_period) > 0:
                    results.append(f"✅ PL Database ({os.path.basename(pl_path)}): {len(df_period):,}행")
                    pl_found = True
                    break
            except Exception as e:
                continue
    
    if not pl_found:
        results.append(f"❌ PL Database 파일 없음 또는 {period} 데이터 없음")
    
    # 결과 출력
    output = "\n".join(results)
    print(output)
    
    # 파일로 저장
    with open('csv_validation_result.txt', 'w', encoding='utf-8') as f:
        f.write(f"CSV 검증 결과 - Period: {period}\n")
        f.write("=" * 80 + "\n")
        f.write(output)
    
    print(f"\n검증 결과가 csv_validation_result.txt 파일에 저장되었습니다.")

if __name__ == '__main__':
    period = sys.argv[1] if len(sys.argv) > 1 else '2511'
    validate_csv(period)

