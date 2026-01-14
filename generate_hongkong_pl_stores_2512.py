import pandas as pd
import json
import os

def generate_pl_stores():
    pl_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2512\HKMC PL 2512.csv"
    
    if not os.path.exists(pl_file):
        print(f"파일이 없습니다: {pl_file}")
        return

    df = pd.read_csv(pl_file, encoding='utf-8-sig')
    df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)
    
    # MLB 브랜드 필터링 (BRD_CD == 'M')
    # 홍콩/마카오 필터링 (CNTRY_CD in ['HK', 'MC'])
    df_mlb = df[(df['BRD_CD'] == 'M') & (df['CNTRY_CD'].isin(['HK', 'MC']))]
    
    # 계정 매핑
    account_map = {
        '1. 급 여': 'labor_cost',
        '4. 임차료': 'rent',
        '11. 운반비': 'logistics',
        '9. 광고선전비': 'marketing',
        '10. 지급수수료': 'fee',
        '5. 유지보수비': 'maintenance',
        '13. 보험료': 'insurance',
        '6. 수도광열비': 'utilities',
        '7. 소모품비': 'supplies',
        '2. TRAVEL & MEAL': 'travel',
        '8. 통신비': 'communication',
        '3. 피복비(유니폼)': 'uniform',
        '14. 감가상각비': 'depreciation',
        '12. 기타 수수료(매장관리비 외)': 'other_fee'
    }
    
    stores_data = {}
    
    # 모든 고유 매장 코드 추출 (H99, M99 오피스 제외)
    shop_codes = [c for c in df_mlb['SHOP_CD'].unique() if c not in ['H99', 'M99']]
    
    for shop_cd in shop_codes:
        store_record = {}
        for acc_nm, json_key in account_map.items():
            # 당월 (2512)
            cur_val = df_mlb[(df_mlb['SHOP_CD'] == shop_cd) & 
                             (df_mlb['PERIOD'] == 202512) & 
                             (df_mlb['ACCOUNT_NM'] == acc_nm)]['VALUE'].sum()
            store_record[json_key] = float(cur_val)
            
            # 전년동월 (2412)
            prev_val = df_mlb[(df_mlb['SHOP_CD'] == shop_cd) & 
                              (df_mlb['PERIOD'] == 202412) & 
                              (df_mlb['ACCOUNT_NM'] == acc_nm)]['VALUE'].sum()
            store_record[f"{json_key}_prev"] = float(prev_val)
            
        stores_data[shop_cd] = store_record
        
    # 오피스 비용 (H99, M99) - opex 섹션용
    opex_data = {}
    for acc_nm, json_key in account_map.items():
        # opex는 'salary', 'marketing' 등의 키를 사용 (labor_cost 대신 salary)
        opex_key = json_key if json_key != 'labor_cost' else 'salary'
        if opex_key == 'other_fee': opex_key = 'other' # opex는 other 키 사용
        
        # 당월 합계 (H99 + M99)
        cur_val = df_mlb[(df_mlb['SHOP_CD'].isin(['H99', 'M99'])) & 
                         (df_mlb['PERIOD'] == 202512) & 
                         (df_mlb['ACCOUNT_NM'] == acc_nm)]['VALUE'].sum()
        opex_data[opex_key] = float(cur_val)

    # 최종 JSON 구조
    output = {
        "stores": stores_data,
        "opex": opex_data
    }
    
    output_file = 'public/dashboard/hongkong-pl-stores-2512.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        
    print(f"성공: {output_file} 생성 완료")

if __name__ == "__main__":
    generate_pl_stores()
