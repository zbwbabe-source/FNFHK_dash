#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""생성된 CSV 파일 검증"""

import pandas as pd
import os

OUTPUT_DIR = '../Dashboard_Raw_Data/TW/2512/processed/'

print("=" * 80)
print("생성된 CSV 파일 검증")
print("=" * 80)

files = [
    '2512_당시즌판매율.csv',
    '2512_ACC재고주수.csv',
    '2512_기말재고_TAG.csv',
    '2512_아이템별판매_TAG.csv',
    '2512_과시즌재고_TAG.csv'
]

for filename in files:
    filepath = os.path.join(OUTPUT_DIR, filename)
    print(f"\n[{filename}]")
    df = pd.read_csv(filepath, encoding='utf-8-sig')
    print(df.to_string(index=False))
    print(f"\n총 {len(df)} rows")

print("\n" + "=" * 80)
print("검증 완료")
print("=" * 80)
