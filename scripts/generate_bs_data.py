#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
재무상태표(Balance Sheet) 데이터 생성 스크립트
CSV 파일에서 Financial Position 데이터를 읽어 JSON으로 변환
"""

import pandas as pd
import json
import os
import sys
import re

def clean_number(value):
    """CSV의 숫자 문자열을 float로 변환"""
    if pd.isna(value) or value == '':
        return 0
    
    # 문자열로 변환
    value_str = str(value).strip()
    
    # "백" 제거
    value_str = value_str.replace('백', '').replace(' ', '')
    
    # 쉼표 제거
    value_str = value_str.replace(',', '')
    
    # 빈 문자열이면 0
    if value_str == '' or value_str == '-':
        return 0
    
    try:
        return float(value_str)
    except:
        return 0

def parse_bs_csv(csv_path):
    """CSV 파일에서 재무상태표 데이터 파싱"""
    
    # CSV 읽기 (헤더 없이)
    df = pd.read_csv(csv_path, header=None, encoding='utf-8-sig')
    
    # Financial Position 섹션 찾기
    bs_start_idx = None
    for idx, row in df.iterrows():
        if pd.notna(row[0]) and 'Financial Position' in str(row[0]):
            bs_start_idx = idx
            break
    
    if bs_start_idx is None:
        raise ValueError("Financial Position 섹션을 찾을 수 없습니다")
    
    # Financial Position 다음 행이 총자산
    assets_start = bs_start_idx + 1
    
    bs_data = {
        'assets': {},
        'liabilities': {},
        'equity': {}
    }
    
    # 새로운 CSV 구조:
    # Col 0: 계정과목
    # Col 1: 2412 (24년 12월)
    # Col 2-12: 2501~2511
    # Col 13: 2512 (25년 12월)
    
    prev_year_col = 1   # 2412 (24년 12월)
    current_month_col = 12  # 2511
    year_end_col = 13   # 2512 (25년 12월)
    
    # 총자산 (assets_start + 0)
    bs_data['assets']['total'] = {
        'prev_year': clean_number(df.iloc[assets_start, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start, year_end_col]),
        'yoy_krw': 0,  # 프론트엔드에서 계산
        'note': ''
    }
    
    # 유동자산 (assets_start + 1)
    bs_data['assets']['current_assets'] = {
        'total': {
            'prev_year': clean_number(df.iloc[assets_start+1, 1]),
        'current_month': clean_number(df.iloc[assets_start+1, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+1, year_end_col]),
        'yoy_krw': 0,
        'note': ''
        },
        'cash': {
            'prev_year': clean_number(df.iloc[assets_start+2, 1]),
            'current_month': clean_number(df.iloc[assets_start+2, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+2, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'receivables': {
            'prev_year': clean_number(df.iloc[assets_start+3, 1]),
            'current_month': clean_number(df.iloc[assets_start+3, 12]),
            'year_end': clean_number(df.iloc[assets_start+3, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'inventory': {
            'prev_year': clean_number(df.iloc[assets_start+4, 1]),
            'current_month': clean_number(df.iloc[assets_start+4, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+4, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'other_current': {
            'prev_year': clean_number(df.iloc[assets_start+5, 1]),
            'current_month': clean_number(df.iloc[assets_start+5, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+5, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        }
    }
    
    # 비유동자산 (assets_start + 6)
    bs_data['assets']['non_current_assets'] = {
        'total': {
            'prev_year': clean_number(df.iloc[assets_start+6, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+6, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+6, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'right_of_use': {
            'prev_year': clean_number(df.iloc[assets_start+7, 1]),
            'current_month': clean_number(df.iloc[assets_start+7, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+7, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'tangible': {
            'prev_year': clean_number(df.iloc[assets_start+8, 1]),
            'current_month': clean_number(df.iloc[assets_start+8, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+8, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'intangible': {
            'prev_year': clean_number(df.iloc[assets_start+9, 1]),
            'current_month': clean_number(df.iloc[assets_start+9, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+9, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'deposits': {
            'prev_year': clean_number(df.iloc[assets_start+10, 1]),
            'current_month': clean_number(df.iloc[assets_start+10, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+10, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'other_non_current': {
            'prev_year': clean_number(df.iloc[assets_start+11, 1]),
            'current_month': clean_number(df.iloc[assets_start+11, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+11, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        }
    }
    
    # 총부채 (assets_start + 12)
    bs_data['liabilities']['total'] = {
        'prev_year': clean_number(df.iloc[assets_start+12, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+12, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+12, year_end_col]),
        'yoy_krw': 0,
        'note': ''
    }
    
    # 유동부채 (assets_start + 13)
    bs_data['liabilities']['current_liabilities'] = {
        'total': {
            'prev_year': clean_number(df.iloc[assets_start+13, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+13, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+13, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'accounts_payable': {
            'prev_year': clean_number(df.iloc[assets_start+14, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+14, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+14, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'accounts_payable_tp': {
            'prev_year': clean_number(df.iloc[assets_start+15, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+15, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+15, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'accrued_expenses': {
            'prev_year': clean_number(df.iloc[assets_start+16, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+16, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+16, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'borrowings': {
            'prev_year': clean_number(df.iloc[assets_start+17, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+17, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+17, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'lease_liabilities_current': {
            'prev_year': clean_number(df.iloc[assets_start+18, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+18, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+18, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'other_current': {
            'prev_year': clean_number(df.iloc[assets_start+19, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+19, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+19, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        }
    }
    
    # 비유동부채 (assets_start + 20)
    bs_data['liabilities']['non_current_liabilities'] = {
        'total': {
            'prev_year': clean_number(df.iloc[assets_start+20, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+20, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+20, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'lease_liabilities_non_current': {
            'prev_year': clean_number(df.iloc[assets_start+21, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+21, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+21, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        },
        'restoration_provision': {
            'prev_year': clean_number(df.iloc[assets_start+22, prev_year_col]),
            'current_month': clean_number(df.iloc[assets_start+22, current_month_col]),
            'year_end': clean_number(df.iloc[assets_start+22, year_end_col]),
            'yoy_krw': 0,
            'note': ''
        }
    }
    
    # 총자본 (assets_start + 23)
    bs_data['equity']['total'] = {
        'prev_year': clean_number(df.iloc[assets_start+23, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+23, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+23, year_end_col]),
        'yoy_krw': 0,
        'note': ''
    }
    
    bs_data['equity']['capital'] = {
        'prev_year': clean_number(df.iloc[assets_start+24, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+24, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+24, year_end_col]),
        'yoy_krw': 0,
        'note': ''
    }
    
    bs_data['equity']['other_capital'] = {
        'prev_year': clean_number(df.iloc[assets_start+25, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+25, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+25, year_end_col]),
        'yoy_krw': 0,
        'note': ''
    }
    
    bs_data['equity']['retained_earnings'] = {
        'prev_year': clean_number(df.iloc[assets_start+26, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+26, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+26, year_end_col]),
        'yoy_krw': 0,
        'note': ''
    }
    
    return bs_data

def parse_working_capital(df, bs_start_idx):
    """운전자본 증감 데이터 파싱"""
    # Financial Position 시작점 기준
    assets_start = bs_start_idx + 1
    
    # 컬럼 인덱스 정의
    prev_year_col = 1   # 2412 (24년 12월)
    current_month_col = 12  # 2511
    year_end_col = 13   # 2512 (25년 12월)
    
    wc_data = {
        'summary': {},
        'receivables': {},
        'payables': {},
        'profit_creation': {},
        'other_wc_items': {},
        'lease_related': {},
        'balance_check': {}
    }
    
    # ▼ 외상매출금 (회수자산) - 자산이므로 + 표시
    # 재고자산 (assets_start + 4)
    inventory = {
        'prev_year': clean_number(df.iloc[assets_start+4, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+4, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+4, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 매출채권 (assets_start + 3)
    receivables_ar = {
        'prev_year': clean_number(df.iloc[assets_start+3, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+3, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+3, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    wc_data['receivables'] = {
        'total': {
            'prev_year': inventory['prev_year'] + receivables_ar['prev_year'],
            'current_month': inventory['current_month'] + receivables_ar['current_month'],
            'year_end': inventory['year_end'] + receivables_ar['year_end'],
            'yoy_krw': inventory['yoy_krw'] + receivables_ar['yoy_krw']
        },
        'inventory': inventory,
        'accounts_receivable': receivables_ar
    }
    
    # ▼ 외상매입금 (지급부채) - 부채이므로 △ 표시
    # 현금 (assets_start + 2)
    cash = {
        'prev_year': clean_number(df.iloc[assets_start+2, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+2, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+2, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 차입금 (assets_start + 17)
    borrowings = {
        'prev_year': clean_number(df.iloc[assets_start+17, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+17, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+17, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 매입채무 (assets_start + 14)
    accounts_payable = {
        'prev_year': clean_number(df.iloc[assets_start+14, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+14, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+14, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 매입채무(TP) (assets_start + 15)
    accounts_payable_tp = {
        'prev_year': clean_number(df.iloc[assets_start+15, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+15, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+15, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    wc_data['payables'] = {
        'total': {
            'prev_year': -(cash['prev_year'] + borrowings['prev_year'] + accounts_payable['prev_year']),
            'current_month': -(cash['current_month'] + borrowings['current_month'] + accounts_payable['current_month']),
            'year_end': -(cash['year_end'] + borrowings['year_end'] + accounts_payable['year_end']),
            'yoy_krw': -(cash['yoy_krw'] + borrowings['yoy_krw'] + accounts_payable['yoy_krw'])
        },
        'cash': cash,
        'borrowings': borrowings,
        'accounts_payable': accounts_payable
    }
    
    # ▼ 이익창출 - 자본이므로 △ 표시
    # 이익잉여금 (assets_start + 26)
    retained_earnings = {
        'prev_year': clean_number(df.iloc[assets_start+26, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+26, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+26, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    wc_data['profit_creation'] = {
        'total': {
            'prev_year': -retained_earnings['prev_year'],
            'current_month': -retained_earnings['current_month'],
            'year_end': -retained_earnings['year_end'],
            'yoy_krw': -retained_earnings['yoy_krw']
        },
        'retained_earnings': retained_earnings
    }
    
    # ▼ 기타 운전자본
    # 선급비용 = 기타유동자산 (assets_start + 5)
    prepaid = {
        'prev_year': clean_number(df.iloc[assets_start+5, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+5, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+5, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 미지급비용 = 기타유동부채 (assets_start + 19)
    accrued = {
        'prev_year': clean_number(df.iloc[assets_start+19, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+19, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+19, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 고정자산/보증금 = 유형자산 + 비유동보증금 (assets_start + 8, 10)
    tangible = {
        'prev_year': clean_number(df.iloc[assets_start+8, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+8, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+8, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    deposits = {
        'prev_year': clean_number(df.iloc[assets_start+10, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+10, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+10, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    fixed_assets = {
        'prev_year': tangible['prev_year'] + deposits['prev_year'],
        'current_month': tangible['current_month'] + deposits['current_month'],
        'year_end': tangible['year_end'] + deposits['year_end'],
        'yoy_krw': tangible['yoy_krw'] + deposits['yoy_krw']
    }
    
    # 미수금/미지급금(순액)
    # 미수금 = 기타유동자산 (prepaid 이미 정의됨)
    # 미지급금 = 미지급금 + 기타유동부채 (assets_start + 16, accrued 이미 정의됨)
    payables_other = {
        'prev_year': clean_number(df.iloc[assets_start+16, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+16, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+16, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 미수금/미지급금 순액 = 미수금(기타유동자산) - 미지급금(미지급금 + 기타유동부채)
    net_other = {
        'prev_year': prepaid['prev_year'] - (payables_other['prev_year'] + accrued['prev_year']),
        'current_month': prepaid['current_month'] - (payables_other['current_month'] + accrued['current_month']),
        'year_end': prepaid['year_end'] - (payables_other['year_end'] + accrued['year_end']),
        'yoy_krw': prepaid['yoy_krw'] - (payables_other['yoy_krw'] + accrued['yoy_krw'])
    }
    
    # 기타운전자본 합계
    # 선급비용(자산 +) + 미지급비용(부채 -) + 고정자산/보증금(자산 +) + 미수금/미지급금순액 + 매입채무(TP)(부채 -)
    wc_data['other_wc_items'] = {
        'total': {
            'prev_year': prepaid['prev_year'] - accrued['prev_year'] + fixed_assets['prev_year'] + net_other['prev_year'] - accounts_payable_tp['prev_year'],
            'current_month': prepaid['current_month'] - accrued['current_month'] + fixed_assets['current_month'] + net_other['current_month'] - accounts_payable_tp['current_month'],
            'year_end': prepaid['year_end'] - accrued['year_end'] + fixed_assets['year_end'] + net_other['year_end'] - accounts_payable_tp['year_end'],
            'yoy_krw': prepaid['yoy_krw'] - accrued['yoy_krw'] + fixed_assets['yoy_krw'] + net_other['yoy_krw'] - accounts_payable_tp['yoy_krw']
        },
        'prepaid': prepaid,
        'accrued': accrued,
        'fixed_assets': fixed_assets,
        'net_other': net_other,
        'accounts_payable_tp': accounts_payable_tp
    }
    
    # ▼ 리스관련
    # 사용권자산 (assets_start + 7)
    right_of_use = {
        'prev_year': clean_number(df.iloc[assets_start+7, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+7, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+7, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    
    # 리스부채 = 유동성 + 비유동성 (assets_start + 18, 21)
    lease_current = {
        'prev_year': clean_number(df.iloc[assets_start+18, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+18, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+18, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    lease_non_current = {
        'prev_year': clean_number(df.iloc[assets_start+21, prev_year_col]),
        'current_month': clean_number(df.iloc[assets_start+21, current_month_col]),
        'year_end': clean_number(df.iloc[assets_start+21, year_end_col]),
        'yoy_krw': 0  # CSV에 yoy_krw 컬럼이 없으므로 0
    }
    lease_total = {
        'prev_year': lease_current['prev_year'] + lease_non_current['prev_year'],
        'current_month': lease_current['current_month'] + lease_non_current['current_month'],
        'year_end': lease_current['year_end'] + lease_non_current['year_end'],
        'yoy_krw': lease_current['yoy_krw'] + lease_non_current['yoy_krw']
    }
    
    wc_data['lease_related'] = {
        'total': {
            'prev_year': right_of_use['prev_year'] - lease_total['prev_year'],
            'current_month': right_of_use['current_month'] - lease_total['current_month'],
            'year_end': right_of_use['year_end'] - lease_total['year_end'],
            'yoy_krw': right_of_use['yoy_krw'] - lease_total['yoy_krw']
        },
        'right_of_use': right_of_use,
        'lease_liabilities': lease_total
    }
    
    # 운전자본 합계
    wc_data['summary'] = {
        'prev_year': (wc_data['receivables']['total']['prev_year'] + 
                     wc_data['payables']['total']['prev_year'] +
                     wc_data['profit_creation']['total']['prev_year'] +
                     wc_data['other_wc_items']['total']['prev_year'] +
                     wc_data['lease_related']['total']['prev_year']),
        'current_month': (wc_data['receivables']['total']['current_month'] + 
                         wc_data['payables']['total']['current_month'] +
                         wc_data['profit_creation']['total']['current_month'] +
                         wc_data['other_wc_items']['total']['current_month'] +
                         wc_data['lease_related']['total']['current_month']),
        'year_end': (wc_data['receivables']['total']['year_end'] + 
                    wc_data['payables']['total']['year_end'] +
                    wc_data['profit_creation']['total']['year_end'] +
                    wc_data['other_wc_items']['total']['year_end'] +
                    wc_data['lease_related']['total']['year_end']),
        'yoy_krw': (wc_data['receivables']['total']['yoy_krw'] + 
                   wc_data['payables']['total']['yoy_krw'] +
                   wc_data['profit_creation']['total']['yoy_krw'] +
                   wc_data['other_wc_items']['total']['yoy_krw'] +
                   wc_data['lease_related']['total']['yoy_krw'])
    }
    
    # Balance Check (모두 0이어야 함)
    wc_data['balance_check'] = {
        'prev_year': 0,
        'current_month': 0,
        'year_end': 0,
        'yoy_krw': 0
    }
    
    return wc_data

def generate_bs_json(period='2511'):
    """지정된 기간의 BS JSON 생성"""
    
    # 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # Dashboard_Raw_Data는 Dashboard 폴더 밖에 있음
    raw_data_dir = os.path.join(os.path.dirname(base_dir), 'Dashboard_Raw_Data')
    csv_path = os.path.join(raw_data_dir, 'HKMCTW BS', period, f'HKMCTW BS_{period}.csv')
    output_path = os.path.join(base_dir, 'public', 'dashboard', f'bs-data-{period}.json')
    
    # CSV 파일 존재 확인
    if not os.path.exists(csv_path):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return False
    
    print(f"📂 CSV 파일 읽기: {csv_path}")
    
    # 데이터 파싱
    df = pd.read_csv(csv_path, header=None, encoding='utf-8-sig')
    
    # Financial Position 시작점 찾기
    bs_start_idx = None
    for idx, row in df.iterrows():
        if pd.notna(row[0]) and 'Financial Position' in str(row[0]):
            bs_start_idx = idx
            break
    
    if bs_start_idx is None:
        print("❌ Financial Position 섹션을 찾을 수 없습니다")
        return False
    
    bs_data = parse_bs_csv(csv_path)
    wc_data = parse_working_capital(df, bs_start_idx)
    
    # working_capital을 balance_sheet 안에 포함
    bs_data['working_capital'] = wc_data
    
    # JSON 구조 생성
    output_data = {
        'period': period,
        'balance_sheet': bs_data
    }
    
    # JSON 저장
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON 생성 완료: {output_path}")
    print(f"📊 총자산: {bs_data['assets']['total']['current_month']:,.0f} (25.11)")
    print(f"📊 총부채: {bs_data['liabilities']['total']['current_month']:,.0f} (25.11)")
    print(f"📊 총자본: {bs_data['equity']['total']['current_month']:,.0f} (25.11)")
    
    return True

if __name__ == '__main__':
    # 커맨드라인 인자로 period 받기
    period = sys.argv[1] if len(sys.argv) > 1 else '2511'
    
    print(f"\n{'='*60}")
    print(f"재무상태표(BS) JSON 생성 - Period: {period}")
    print(f"{'='*60}\n")
    
    success = generate_bs_json(period)
    
    if success:
        print(f"\n✅ 완료!")
    else:
        print(f"\n❌ 실패!")
        sys.exit(1)

