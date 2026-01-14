import json

pl_path = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\public\dashboard\taiwan-pl-data-2512.json"

with open(pl_path, 'r', encoding='utf-8') as f:
    pl_data = json.load(f)

print("누적 (cumulative) 데이터:")
cum = pl_data['cumulative']

print("\n  total:")
for key, value in cum['total'].items():
    if isinstance(value, (int, float)):
        print(f"    - {key}: {value}")

print("\n  yoy:")
for key, value in cum['yoy'].items():
    if isinstance(value, (int, float)):
        print(f"    - {key}: {value}")
