import pandas as pd

df = pd.read_csv('../Dashboard_Raw_Data/TW/2512/processed/2512_당시즌판매율.csv', encoding='utf-8-sig')

print("컬럼 상세:")
for i, col in enumerate(df.columns):
    print(f"  [{i}] {col}")

print("\n\n첫 3행 전체 데이터:")
for idx in range(min(3, len(df))):
    print(f"\n--- Row {idx} ---")
    for col_idx, col in enumerate(df.columns):
        val = df.iloc[idx, col_idx]
        print(f"  [{col_idx}] {col}: {val}")

print("\n\nRow 1 (TOTAL) 상세:")
row1 = df.iloc[1]
for col_idx, col in enumerate(df.columns):
    val = row1.iloc[col_idx]
    print(f"  [{col_idx}] {col}: '{val}' (type: {type(val).__name__})")

print("\n\nRow 2 (첫 카테고리) 상세:")
row2 = df.iloc[2]
for col_idx, col in enumerate(df.columns):
    val = row2.iloc[col_idx]
    print(f"  [{col_idx}] {col}: '{val}' (type: {type(val).__name__})")
