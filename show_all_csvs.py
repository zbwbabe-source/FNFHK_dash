import pandas as pd
import os
import glob

# 모든 CSV 파일 찾기
csv_files = glob.glob('../Dashboard_Raw_Data/TW/2512/processed/*.csv')

print("전처리 폴더의 CSV 파일:")
for i, filepath in enumerate(csv_files, 1):
    filename = os.path.basename(filepath)
    print(f"\n{i}. {filename}")
    
    try:
        df = pd.read_csv(filepath, encoding='utf-8-sig')
        print(f"   컬럼: {list(df.columns)}")
        print(f"   행 수: {len(df)}")
        
        # 첫 3행 출력
        print(df.head(3).to_string(index=False))
    except Exception as e:
        print(f"   에러: {e}")
    
    print("-" * 80)
