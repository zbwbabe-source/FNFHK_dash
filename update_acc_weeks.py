import pandas as pd
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. ACC 재고주수 CSV 읽기
acc_weeks_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed\ACC_Inventory_Weeks_2512.csv"
df_acc = pd.read_csv(acc_weeks_path, encoding='utf-8-sig')

print("ACC 재고주수 데이터:")
print(df_acc.to_string(index=False))

# 2. 기존 JSON 파일 읽기
json_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\taiwan-dashboard-data-2512.json"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 3. acc_stock_weeks 구조 생성
acc_stock_weeks = {}

for _, row in df_acc.iterrows():
    acc_type = row['ACC_TYPE']
    weeks_2512 = float(row['WEEKS_2512'])
    weeks_2412 = float(row['WEEKS_2412'])
    weeks_diff = float(row['WEEKS_DIFF'])
    
    # 한글 카테고리명 매핑
    if acc_type == 'ACC 전체':
        category = 'total'
    elif acc_type == '모자':
        category = 'hat'
    elif acc_type == '신발':
        category = 'shoes'
    elif acc_type == '가방':
        category = 'bag'
    elif acc_type == '기타ACC':
        category = 'etc'
    else:
        continue
    
    acc_stock_weeks[category] = {
        'current': {
            'weeks': round(weeks_2512, 1)
        },
        'previous': {
            'weeks': round(weeks_2412, 1)
        },
        'weeks_change': round(weeks_diff, 1)
    }

# 4. JSON 업데이트
data['acc_stock_weeks'] = acc_stock_weeks

# 5. 저장
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nJSON 업데이트 완료!")
print("\n생성된 acc_stock_weeks 구조:")
print(json.dumps(acc_stock_weeks, ensure_ascii=False, indent=2))
