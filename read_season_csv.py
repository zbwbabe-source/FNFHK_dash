#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pandas as pd
from pathlib import Path
import os

# 폴더 내 모든 파일 확인
folder = Path(r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\TW\2512\processed")

print("폴더 내 파일 목록:")
for file in folder.iterdir():
    print(f"  - {file.name}")
    if "TAG" in file.name and "시즌" in file.name:
        print(f"\n시즌별판매 TAG CSV 파일 발견: {file.name}")
        df = pd.read_csv(file, encoding='utf-8')
        print("\n데이터:")
        print(df.to_string())
        break
