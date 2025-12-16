#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
재무상태표(Balance Sheet) 데이터 생성 스크립트 (신규)
CSV 파일에서 Financial Position 데이터를 읽어 JSON으로 변환
"""

import pandas as pd
import json
import os
import sys

def clean_number(value):
    """CSV의 숫자 문자열을 float로 변환"""
    if pd.isna(value) or value == '':
        return 0
    
    value_str = str(value).strip().replace(',', '').replace(' ', '')
    
    if value_str == '' or value_str == '-':
        return 0
    
    try:
        return float(value_str)
    except:
        return 0

def parse_bs_csv_simple(csv_path):
    """CSV 파일에서 재무상태표 데이터 파싱 (단순화 버전)"""
    
    # CSV 읽기
    df = pd.read_csv(csv_path, header=None, encoding='utf-8-sig')
    
    # Financial Position 섹션 찾기
    bs_start_idx = None
    for idx, row in df.iterrows():
        if pd.notna(row[0]) and 'Financial Position' in str(row[0]):
            bs_start_idx = idx
            break
    
    if bs_start_idx is None:
        raise ValueError("Financial Position 섹션을 찾을 수 없습니다")
    
    # 컬럼 정의
    COL_PREV = 1     # 2412 (24년 12월)
    COL_CURRENT = 12  # 2511
    COL_YEAR_END = 13 # 2512 (25년 12월)
    
    def make_item(row_idx):
        """행 인덱스로부터 아이템 생성"""
        return {
            'prev_year': clean_number(df.iloc[row_idx, COL_PREV]),
            'current_month': clean_number(df.iloc[row_idx, COL_CURRENT]),
            'year_end': clean_number(df.iloc[row_idx, COL_YEAR_END]),
            'yoy_krw': 0,  # 프론트엔드에서 계산
            'note': ''
        }
    
    start = bs_start_idx + 1
    
    # BS 데이터 구조 생성
    bs_data = {
        'assets': {
            'total': make_item(start),
            'current_assets': {
                'total': make_item(start+1),
                'cash': make_item(start+2),
                'receivables': make_item(start+3),
                'inventory': make_item(start+4),
                'other_current': make_item(start+5)
            },
            'non_current_assets': {
                'total': make_item(start+6),
                'right_of_use': make_item(start+7),
                'tangible': make_item(start+8),
                'intangible': make_item(start+9),
                'deposits': make_item(start+10),
                'other_non_current': make_item(start+11)
            }
        },
        'liabilities': {
            'total': make_item(start+12),
            'current_liabilities': {
                'total': make_item(start+13),
                'accounts_payable': make_item(start+14),
                'accounts_payable_tp': make_item(start+15),
                'accrued': make_item(start+16),
                'lease_liabilities_current': make_item(start+17),
                'payables_other': make_item(start+18),
                'other_current': make_item(start+19)
            },
            'non_current_liabilities': {
                'total': make_item(start+20),
                'lease_liabilities_non_current': make_item(start+21),
                'restoration_provision': make_item(start+22)
            }
        },
        'equity': {
            'total': make_item(start+23),
            'capital': make_item(start+24),
            'other_capital': make_item(start+25),
            'retained_earnings': make_item(start+26)
        }
    }
    
    # 운전자본 데이터 생성
    wc_data = {
        'summary': {},  # 나중에 계산
        'receivables': {
            'total': {},  # 나중에 계산
            'accounts_receivable': make_item(start+3),  # BS에서는 receivables, 여기서는 accounts_receivable
            'inventory': make_item(start+4)
        },
        'payables': {
            'total': {},  # 나중에 계산
            'accounts_payable': {  # 매입채무 (부채이므로 -)
                'prev_year': -clean_number(df.iloc[start+14, COL_PREV]),
                'current_month': -clean_number(df.iloc[start+14, COL_CURRENT]),
                'year_end': -clean_number(df.iloc[start+14, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            },
            'accounts_payable_tp': {  # 매입채무(TP) (부채이므로 -)
                'prev_year': -clean_number(df.iloc[start+15, COL_PREV]),
                'current_month': -clean_number(df.iloc[start+15, COL_CURRENT]),
                'year_end': -clean_number(df.iloc[start+15, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            },
            'cash': {  # 현금 (자산이므로 +)
                'prev_year': clean_number(df.iloc[start+2, COL_PREV]),
                'current_month': clean_number(df.iloc[start+2, COL_CURRENT]),
                'year_end': clean_number(df.iloc[start+2, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            },
            'borrowings': {'prev_year': 0, 'current_month': 0, 'year_end': 0, 'yoy_krw': 0, 'note': ''}  # CSV에 없음
        },
        'profit_creation': {
            'total': {},  # 나중에 계산
            'retained_earnings': {  # 이익잉여금 (CSV 값이 이미 음수)
                'prev_year': clean_number(df.iloc[start+26, COL_PREV]),
                'current_month': clean_number(df.iloc[start+26, COL_CURRENT]),
                'year_end': clean_number(df.iloc[start+26, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            },
            'accounts_payable_tp': {  # 매입채무(TP) (부채이므로 -)
                'prev_year': -clean_number(df.iloc[start+15, COL_PREV]),
                'current_month': -clean_number(df.iloc[start+15, COL_CURRENT]),
                'year_end': -clean_number(df.iloc[start+15, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            }
        },
        'other_wc_items': {
            'total': {},  # 나중에 계산
            'prepaid': make_item(start+5),  # 기타유동자산 (선급비용으로 간주, 자산이므로 +)
            'accrued': {  # 미지급금 (부채이므로 -)
                'prev_year': -clean_number(df.iloc[start+16, COL_PREV]),
                'current_month': -clean_number(df.iloc[start+16, COL_CURRENT]),
                'year_end': -clean_number(df.iloc[start+16, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            },
            'fixed_assets': make_item(start+10),  # 비유동보증금 (자산이므로 +)
            'net_other': {  # 기타유동부채 (부채이므로 -)
                'prev_year': -clean_number(df.iloc[start+19, COL_PREV]),
                'current_month': -clean_number(df.iloc[start+19, COL_CURRENT]),
                'year_end': -clean_number(df.iloc[start+19, COL_YEAR_END]),
                'yoy_krw': 0,
                'note': ''
            }
        },
        'lease_related': {
            'total': {},  # 나중에 계산
            'right_of_use': make_item(start+7),
            'lease_liabilities': {
                'prev_year': -(clean_number(df.iloc[start+18, COL_PREV]) + clean_number(df.iloc[start+21, COL_PREV])),
                'current_month': -(clean_number(df.iloc[start+18, COL_CURRENT]) + clean_number(df.iloc[start+21, COL_CURRENT])),
                'year_end': -(clean_number(df.iloc[start+18, COL_YEAR_END]) + clean_number(df.iloc[start+21, COL_YEAR_END])),
                'yoy_krw': 0,
                'note': ''
            }
        },
        'balance_check': {'prev_year': 0, 'current_month': 0, 'year_end': 0, 'yoy_krw': 0, 'note': ''}
    }
    
    # 운전자본 합계 계산
    # receivables total = accounts_receivable + inventory
    wc_data['receivables']['total'] = {
        'prev_year': wc_data['receivables']['accounts_receivable']['prev_year'] + wc_data['receivables']['inventory']['prev_year'],
        'current_month': wc_data['receivables']['accounts_receivable']['current_month'] + wc_data['receivables']['inventory']['current_month'],
        'year_end': wc_data['receivables']['accounts_receivable']['year_end'] + wc_data['receivables']['inventory']['year_end'],
        'yoy_krw': 0,
        'note': ''
    }
    
    # payables total = accounts_payable + accounts_payable_tp + cash (이미 음수 처리됨)
    wc_data['payables']['total'] = {
        'prev_year': wc_data['payables']['accounts_payable']['prev_year'] + wc_data['payables']['accounts_payable_tp']['prev_year'] + wc_data['payables']['cash']['prev_year'],
        'current_month': wc_data['payables']['accounts_payable']['current_month'] + wc_data['payables']['accounts_payable_tp']['current_month'] + wc_data['payables']['cash']['current_month'],
        'year_end': wc_data['payables']['accounts_payable']['year_end'] + wc_data['payables']['accounts_payable_tp']['year_end'] + wc_data['payables']['cash']['year_end'],
        'yoy_krw': 0,
        'note': ''
    }
    
    # profit_creation total = retained_earnings + accounts_payable_tp
    wc_data['profit_creation']['total'] = {
        'prev_year': wc_data['profit_creation']['retained_earnings']['prev_year'] + wc_data['profit_creation']['accounts_payable_tp']['prev_year'],
        'current_month': wc_data['profit_creation']['retained_earnings']['current_month'] + wc_data['profit_creation']['accounts_payable_tp']['current_month'],
        'year_end': wc_data['profit_creation']['retained_earnings']['year_end'] + wc_data['profit_creation']['accounts_payable_tp']['year_end'],
        'yoy_krw': 0,
        'note': ''
    }
    
    # other_wc_items total = prepaid + accrued + fixed_assets + net_other + payables_other + other (부호 그대로 합계)
    # payables_other와 other는 JSON에만 있고 스크립트에는 없으므로, JSON에서 직접 계산 필요
    # 일단 스크립트에서는 기본 4개 항목만 계산 (JSON에서 수동으로 payables_other와 other 추가 필요)
    wc_data['other_wc_items']['total'] = {
        'prev_year': wc_data['other_wc_items']['prepaid']['prev_year'] + wc_data['other_wc_items']['accrued']['prev_year'] + wc_data['other_wc_items']['fixed_assets']['prev_year'] + wc_data['other_wc_items']['net_other']['prev_year'],
        'current_month': wc_data['other_wc_items']['prepaid']['current_month'] + wc_data['other_wc_items']['accrued']['current_month'] + wc_data['other_wc_items']['fixed_assets']['current_month'] + wc_data['other_wc_items']['net_other']['current_month'],
        'year_end': wc_data['other_wc_items']['prepaid']['year_end'] + wc_data['other_wc_items']['accrued']['year_end'] + wc_data['other_wc_items']['fixed_assets']['year_end'] + wc_data['other_wc_items']['net_other']['year_end'],
        'yoy_krw': 0,
        'note': ''
    }
    
    # lease_related total = right_of_use + lease_liabilities (이미 음수 처리됨)
    wc_data['lease_related']['total'] = {
        'prev_year': wc_data['lease_related']['right_of_use']['prev_year'] + wc_data['lease_related']['lease_liabilities']['prev_year'],
        'current_month': wc_data['lease_related']['right_of_use']['current_month'] + wc_data['lease_related']['lease_liabilities']['current_month'],
        'year_end': wc_data['lease_related']['right_of_use']['year_end'] + wc_data['lease_related']['lease_liabilities']['year_end'],
        'yoy_krw': 0,
        'note': ''
    }
    
    # summary = 매출채권 + 재고 - 매입채무 (단순 운전자본 계산)
    # accounts_receivable + inventory + accounts_payable (payables는 이미 음수로 저장됨)
    wc_data['summary'] = {
        'prev_year': (wc_data['receivables']['accounts_receivable']['prev_year'] + 
                     wc_data['receivables']['inventory']['prev_year'] + 
                     wc_data['payables']['accounts_payable']['prev_year']),
        'current_month': (wc_data['receivables']['accounts_receivable']['current_month'] + 
                         wc_data['receivables']['inventory']['current_month'] + 
                         wc_data['payables']['accounts_payable']['current_month']),
        'year_end': (wc_data['receivables']['accounts_receivable']['year_end'] + 
                    wc_data['receivables']['inventory']['year_end'] + 
                    wc_data['payables']['accounts_payable']['year_end']),
        'yoy_krw': 0,
        'note': ''
    }
    
    bs_data['working_capital'] = wc_data
    
    # 재무비율 (하드코딩 - CSV에 없음)
    bs_data['financial_ratios'] = {
        'debt_ratio': {'value': 0, 'prev_year': 0, 'note': ''},
        'current_ratio': {'value': 0, 'prev_year': 0, 'note': ''},
        'quick_ratio': {'value': 0, 'prev_year': 0, 'note': ''},
        'equity_ratio': {'value': 0, 'prev_year': 0, 'note': ''}
    }
    
    return bs_data

def generate_bs_json(period):
    """BS JSON 파일 생성"""
    
    print("\n" + "="*60)
    print(f"재무상태표(BS) JSON 생성 - Period: {period}")
    print("="*60 + "\n")
    
    # CSV 파일 경로
    csv_path = os.path.join('..', '..', 'Dashboard_Raw_Data', 'HKMCTW BS', period, f'HKMCTW BS_{period}.csv')
    csv_path = os.path.abspath(csv_path)
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return False
    
    print(f"📂 CSV 파일 읽기: {csv_path}")
    
    try:
        # BS 데이터 파싱
        bs_data = parse_bs_csv_simple(csv_path)
        
        # JSON 파일 경로
        output_path = os.path.join('..', 'public', 'dashboard', f'bs-data-{period}.json')
        output_path = os.path.abspath(output_path)
        
        # JSON 파일 생성
        result = {
            'period': period,
            'balance_sheet': bs_data
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"✅ JSON 생성 완료: {output_path}")
        print(f"📊 총자산: {bs_data['assets']['total']['current_month']:,.0f} (25.11)")
        print(f"📊 총부채: {bs_data['liabilities']['total']['current_month']:,.0f} (25.11)")
        print(f"📊 총자본: {bs_data['equity']['total']['current_month']:,.0f} (25.11)")
        print("\n✅ 완료!")
        
        return True
        
    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python generate_bs_data_new.py <period>")
        print("예시: python generate_bs_data_new.py 2511")
        sys.exit(1)
    
    period = sys.argv[1]
    success = generate_bs_json(period)
    
    sys.exit(0 if success else 1)

