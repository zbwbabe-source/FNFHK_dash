#!/usr/bin/env python3
"""
홍콩/마카오 매장별 직접비 데이터 생성 - 2510용 (간단 버전)
2511 매장별 비율을 사용하여 2510 총액을 배분
"""
import json
from collections import defaultdict

def distribute_costs_by_ratio(total_cost, store_ratios):
    """총 비용을 매장별 비율로 배분"""
    distributed = {}
    for store_code, ratio in store_ratios.items():
        distributed[store_code] = total_cost * ratio
    return distributed

def main():
    print("=" * 80)
    print("홍콩/마카오 2510 매장별 직접비 데이터 생성 (간단 버전)")
    print("=" * 80)
    
    # 1. 2511 매장별 데이터 로드 (비율 계산용)
    print("\n1. 2511 매장별 데이터 로드 중...")
    with open('public/dashboard/hongkong-pl-stores-2511.json', 'r', encoding='utf-8') as f:
        data_2511 = json.load(f)
    
    stores_2511 = data_2511['stores']
    opex_2511 = data_2511['opex']
    
    print(f"   2511 매장 수: {len(stores_2511)}")
    
    # 2. 2510 PL 총액 데이터 로드
    print("\n2. 2510 PL 총액 데이터 로드 중...")
    with open('public/dashboard/hongkong-pl-data-2510.json', 'r', encoding='utf-8') as f:
        pl_2510 = json.load(f)
    
    # 당월 총액
    current_month_2510 = pl_2510.get('current_month', {})
    total_2510 = current_month_2510.get('total', {})
    expense_detail_2510 = total_2510.get('expense_detail', {})
    other_detail_2510 = expense_detail_2510.get('other_detail', {})
    
    print(f"   2510 총 직접비: {total_2510.get('direct_cost', 0):,.2f}K")
    
    # 3. 2511 매장별 비율 계산
    print("\n3. 2511 매장별 비율 계산 중...")
    
    # 각 비용 항목별 총액 계산 (2511)
    cost_items = ['labor_cost', 'rent', 'logistics', 'other_fee', 'marketing', 
                  'fee', 'maintenance', 'insurance', 'utilities', 'supplies', 
                  'travel', 'communication', 'uniform', 'depreciation']
    
    totals_2511 = {}
    for item in cost_items:
        total = sum(store.get(item, 0) for store in stores_2511.values())
        totals_2511[item] = total
        if total > 0:
            print(f"   2511 {item}: {total:,.2f}K")
    
    # 각 매장의 항목별 비율 계산
    store_ratios = {}
    for store_code, store_data in stores_2511.items():
        store_ratios[store_code] = {}
        for item in cost_items:
            total = totals_2511.get(item, 0)
            if total > 0:
                store_ratios[store_code][item] = store_data.get(item, 0) / total
            else:
                store_ratios[store_code][item] = 0
    
    # 4. 2510 총액을 매장별로 배분
    print("\n4. 2510 비용을 매장별로 배분 중...")
    
    # 2510의 각 비용 항목 총액 (이미 1K HKD 단위이므로 그대로 사용)
    # expense_detail에서 가져오기
    salary_2510 = expense_detail_2510.get('salary', 0)
    rent_2510 = expense_detail_2510.get('rent', 0)
    marketing_2510 = expense_detail_2510.get('marketing', 0)
    fee_2510 = expense_detail_2510.get('fee', 0)
    insurance_2510 = expense_detail_2510.get('insurance', 0)
    travel_2510 = expense_detail_2510.get('travel', 0)
    
    # other_detail에서 가져오기
    logistics_2510 = other_detail_2510.get('logistics', 0)
    maintenance_2510 = other_detail_2510.get('maintenance', 0)
    utilities_2510 = other_detail_2510.get('utilities', 0)
    supplies_2510 = other_detail_2510.get('supplies', 0)
    communication_2510 = other_detail_2510.get('communication', 0)
    uniform_2510 = other_detail_2510.get('uniform', 0)
    depreciation_2510 = other_detail_2510.get('depreciation', 0)
    other_fee_2510 = other_detail_2510.get('other_fee', 0)
    
    # M99 본사 비용 제외 (매장에만 배분)
    # 본사 비용은 opex로 별도 관리
    
    stores_2510 = {}
    for store_code in stores_2511.keys():
        if store_code in ['M99', 'H99']:  # 본사는 제외
            continue
            
        ratios = store_ratios[store_code]
        
        stores_2510[store_code] = {
            'labor_cost': salary_2510 * ratios.get('labor_cost', 0),
            'labor_cost_prev': 0,  # 전년 데이터는 별도 계산 필요
            'rent': rent_2510 * ratios.get('rent', 0),
            'rent_prev': 0,
            'logistics': logistics_2510 * ratios.get('logistics', 0),
            'logistics_prev': 0,
            'other_fee': other_fee_2510 * ratios.get('other_fee', 0),
            'other_fee_prev': 0,
            'marketing': marketing_2510 * ratios.get('marketing', 0),
            'marketing_prev': 0,
            'fee': fee_2510 * ratios.get('fee', 0),
            'fee_prev': 0,
            'maintenance': maintenance_2510 * ratios.get('maintenance', 0),
            'maintenance_prev': 0,
            'insurance': insurance_2510 * ratios.get('insurance', 0),
            'insurance_prev': 0,
            'utilities': utilities_2510 * ratios.get('utilities', 0),
            'utilities_prev': 0,
            'supplies': supplies_2510 * ratios.get('supplies', 0),
            'supplies_prev': 0,
            'travel': travel_2510 * ratios.get('travel', 0),
            'travel_prev': 0,
            'communication': communication_2510 * ratios.get('communication', 0),
            'communication_prev': 0,
            'uniform': uniform_2510 * ratios.get('uniform', 0),
            'uniform_prev': 0,
            'depreciation': depreciation_2510 * ratios.get('depreciation', 0),
            'depreciation_prev': 0
        }
    
    # 5. 본사 영업비 (opex)
    opex_2510 = {
        'salary': expense_detail_2510.get('salary', 0),
        'marketing': expense_detail_2510.get('marketing', 0),
        'fee': expense_detail_2510.get('fee', 0),
        'rent': expense_detail_2510.get('rent', 0),
        'insurance': expense_detail_2510.get('insurance', 0),
        'travel': expense_detail_2510.get('travel', 0),
        'other': expense_detail_2510.get('other', 0)
    }
    
    print(f"   배분 완료: {len(stores_2510)}개 매장")
    
    # 6. JSON 저장 (당월)
    output_data = {
        'stores': stores_2510,
        'opex': opex_2510
    }
    
    output_file = 'public/dashboard/hongkong-pl-stores-2510.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n[OK] 당월 데이터 저장: {output_file}")
    
    # 7. 누적 데이터 생성
    print("\n5. 누적 데이터 생성 중...")
    
    # 2510 누적 PL 데이터에서 가져오기
    cumulative_2510 = pl_2510.get('cumulative', {})
    cumulative_total_2510 = cumulative_2510.get('total', {})
    cumulative_expense_detail_2510 = cumulative_total_2510.get('expense_detail', {})
    cumulative_other_detail_2510 = cumulative_expense_detail_2510.get('other_detail', {})
    
    # 누적 비용 항목 (이미 1K HKD 단위이므로 그대로 사용)
    cum_salary_2510 = cumulative_expense_detail_2510.get('salary', 0)
    cum_rent_2510 = cumulative_expense_detail_2510.get('rent', 0)
    cum_marketing_2510 = cumulative_expense_detail_2510.get('marketing', 0)
    cum_fee_2510 = cumulative_expense_detail_2510.get('fee', 0)
    cum_insurance_2510 = cumulative_expense_detail_2510.get('insurance', 0)
    cum_travel_2510 = cumulative_expense_detail_2510.get('travel', 0)
    cum_logistics_2510 = cumulative_other_detail_2510.get('logistics', 0)
    cum_maintenance_2510 = cumulative_other_detail_2510.get('maintenance', 0)
    cum_utilities_2510 = cumulative_other_detail_2510.get('utilities', 0)
    cum_supplies_2510 = cumulative_other_detail_2510.get('supplies', 0)
    cum_communication_2510 = cumulative_other_detail_2510.get('communication', 0)
    cum_uniform_2510 = cumulative_other_detail_2510.get('uniform', 0)
    cum_depreciation_2510 = cumulative_other_detail_2510.get('depreciation', 0)
    cum_other_fee_2510 = cumulative_other_detail_2510.get('other_fee', 0)
    
    cumulative_stores_2510 = {}
    for store_code in stores_2511.keys():
        if store_code in ['M99', 'H99']:  # 본사는 제외
            continue
            
        ratios = store_ratios[store_code]
        
        cumulative_stores_2510[store_code] = {
            'labor_cost': cum_salary_2510 * ratios.get('labor_cost', 0),
            'labor_cost_prev': 0,
            'rent': cum_rent_2510 * ratios.get('rent', 0),
            'rent_prev': 0,
            'logistics': cum_logistics_2510 * ratios.get('logistics', 0),
            'logistics_prev': 0,
            'other_fee': cum_other_fee_2510 * ratios.get('other_fee', 0),
            'other_fee_prev': 0,
            'marketing': cum_marketing_2510 * ratios.get('marketing', 0),
            'marketing_prev': 0,
            'fee': cum_fee_2510 * ratios.get('fee', 0),
            'fee_prev': 0,
            'maintenance': cum_maintenance_2510 * ratios.get('maintenance', 0),
            'maintenance_prev': 0,
            'insurance': cum_insurance_2510 * ratios.get('insurance', 0),
            'insurance_prev': 0,
            'utilities': cum_utilities_2510 * ratios.get('utilities', 0),
            'utilities_prev': 0,
            'supplies': cum_supplies_2510 * ratios.get('supplies', 0),
            'supplies_prev': 0,
            'travel': cum_travel_2510 * ratios.get('travel', 0),
            'travel_prev': 0,
            'communication': cum_communication_2510 * ratios.get('communication', 0),
            'communication_prev': 0,
            'uniform': cum_uniform_2510 * ratios.get('uniform', 0),
            'uniform_prev': 0,
            'depreciation': cum_depreciation_2510 * ratios.get('depreciation', 0),
            'depreciation_prev': 0
        }
    
    # 누적 본사 영업비
    cumulative_opex_2510 = {
        'salary': cumulative_expense_detail_2510.get('salary', 0),
        'marketing': cumulative_expense_detail_2510.get('marketing', 0),
        'fee': cumulative_expense_detail_2510.get('fee', 0),
        'rent': cumulative_expense_detail_2510.get('rent', 0),
        'insurance': cumulative_expense_detail_2510.get('insurance', 0),
        'travel': cumulative_expense_detail_2510.get('travel', 0),
        'other': cumulative_expense_detail_2510.get('other', 0)
    }
    
    print(f"   누적 데이터 배분 완료: {len(cumulative_stores_2510)}개 매장")
    
    # 8. 누적 JSON 저장
    cumulative_output_data = {
        'cumulative_stores': cumulative_stores_2510,
        'cumulative_opex': cumulative_opex_2510
    }
    
    cumulative_output_file = 'public/dashboard/hongkong-pl-cumulative-2510.json'
    with open(cumulative_output_file, 'w', encoding='utf-8') as f:
        json.dump(cumulative_output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n[OK] 누적 데이터 저장: {cumulative_output_file}")
    
    print("\n" + "=" * 80)
    print("[OK] 2510 매장별 직접비 데이터 생성 완료!")
    print("=" * 80)
    
    # 검증: 합계 확인
    print("\n검증: 매장별 합계 vs PL 총액")
    total_labor = sum(store['labor_cost'] for store in stores_2510.values())
    total_rent = sum(store['rent'] for store in stores_2510.values())
    total_logistics = sum(store['logistics'] for store in stores_2510.values())
    
    print(f"  급여 합계: {total_labor:,.2f} (PL: {salary_2510:,.2f})")
    print(f"  임차료 합계: {total_rent:,.2f} (PL: {rent_2510:,.2f})")
    print(f"  물류비 합계: {total_logistics:,.2f} (PL: {logistics_2510:,.2f})")

if __name__ == '__main__':
    main()
