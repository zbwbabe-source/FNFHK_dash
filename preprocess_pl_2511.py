import pandas as pd
import numpy as np

# ?�력 ?�일 경로
input_file = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard_Raw_Data\HKMC\2511\HKMC PL 2511.csv"

# 출력 ?�일 경로
output_mlb = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\PL_MLB_2511_preprocessed.csv"
output_brand = r"D:\Cursor_work_space\HKMCTW_Dashboard\Dashboard\PL_Brand_Summary_2511.csv"

# CSV ?�기
df = pd.read_csv(input_file, encoding='utf-8-sig')

# VALUE�??�자�?변??
df['VALUE'] = pd.to_numeric(df['VALUE'], errors='coerce').fillna(0)

# PERIOD�??�수�?변??(202511 ?�식)
df['PERIOD'] = pd.to_numeric(df['PERIOD'], errors='coerce').astype('Int64')

# ?�판매출�?Tag매출???�터�?
net_sales = df[df['ACCOUNT_NM'] == '?�매출액'].copy()
tag_sales = df[df['ACCOUNT_NM'] == 'Tag매출??].copy()

# ========================================
# 1. MLB ?�용 ?�이??(채널�?
# ========================================

# MLB�??�터�?
mlb_net = net_sales[net_sales['BRD_CD'] == 'M'].groupby(['PERIOD', 'CHNL_CD'])['VALUE'].sum().reset_index()
mlb_tag = tag_sales[tag_sales['BRD_CD'] == 'M'].groupby(['PERIOD', 'CHNL_CD'])['VALUE'].sum().reset_index()

# 채널별로 집계
channels = mlb_net['CHNL_CD'].unique()
mlb_results = []

for channel in channels:
    channel_net = mlb_net[mlb_net['CHNL_CD'] == channel]
    channel_tag = mlb_tag[mlb_tag['CHNL_CD'] == channel]
    
    # ?�판매출
    net_cur_month = channel_net[channel_net['PERIOD'] == 202511]['VALUE'].sum()
    net_prev_month = channel_net[channel_net['PERIOD'] == 202411]['VALUE'].sum()
    net_cur_ytd = channel_net[(channel_net['PERIOD'] >= 202501) & 
                               (channel_net['PERIOD'] <= 202511)]['VALUE'].sum()
    net_prev_ytd = channel_net[(channel_net['PERIOD'] >= 202401) & 
                                (channel_net['PERIOD'] <= 202411)]['VALUE'].sum()
    
    # Tag매출??
    tag_cur_month = channel_tag[channel_tag['PERIOD'] == 202511]['VALUE'].sum()
    tag_prev_month = channel_tag[channel_tag['PERIOD'] == 202411]['VALUE'].sum()
    tag_cur_ytd = channel_tag[(channel_tag['PERIOD'] >= 202501) & 
                               (channel_tag['PERIOD'] <= 202511)]['VALUE'].sum()
    tag_prev_ytd = channel_tag[(channel_tag['PERIOD'] >= 202401) & 
                                (channel_tag['PERIOD'] <= 202411)]['VALUE'].sum()
    
    # ?�인??계산
    discount_cur_month = round(1 - (net_cur_month / tag_cur_month), 4) if tag_cur_month > 0 else 0
    discount_prev_month = round(1 - (net_prev_month / tag_prev_month), 4) if tag_prev_month > 0 else 0
    discount_cur_ytd = round(1 - (net_cur_ytd / tag_cur_ytd), 4) if tag_cur_ytd > 0 else 0
    discount_prev_ytd = round(1 - (net_prev_ytd / tag_prev_ytd), 4) if tag_prev_ytd > 0 else 0
    
    mlb_results.append({
        'BRAND': 'MLB',
        'CHANNEL': channel,
        'CUR_MONTH_PERIOD': '2512',
        'PREV_MONTH_PERIOD': '2412',
        'NET_PREV_MONTH': net_prev_month,
        'NET_CUR_MONTH': net_cur_month,
        'NET_PREV_YTD': net_prev_ytd,
        'NET_CUR_YTD': net_cur_ytd,
        'TAG_PREV_MONTH': tag_prev_month,
        'TAG_CUR_MONTH': tag_cur_month,
        'TAG_PREV_YTD': tag_prev_ytd,
        'TAG_CUR_YTD': tag_cur_ytd,
        'DISCOUNT_RATE_PREV_MONTH': discount_prev_month,
        'DISCOUNT_RATE_CUR_MONTH': discount_cur_month,
        'DISCOUNT_RATE_PREV_YTD': discount_prev_ytd,
        'DISCOUNT_RATE_CUR_YTD': discount_cur_ytd
    })

mlb_df = pd.DataFrame(mlb_results)
mlb_df.to_csv(output_mlb, index=False, encoding='utf-8-sig')

# ========================================
# 2. 브랜???�약 ?�이??(MLB + Discovery)
# ========================================

# 브랜?�별�?집계 (채널 구분 ?�이)
brand_net = net_sales.groupby(['PERIOD', 'BRD_CD'])['VALUE'].sum().reset_index()
brand_tag = tag_sales.groupby(['PERIOD', 'BRD_CD'])['VALUE'].sum().reset_index()

brand_mapping = {'M': 'MLB', 'X': 'Discovery'}
brands = ['M', 'X']
brand_results = []

for brand_code in brands:
    b_net = brand_net[brand_net['BRD_CD'] == brand_code]
    b_tag = brand_tag[brand_tag['BRD_CD'] == brand_code]
    
    # ?�판매출
    net_cur_month = b_net[b_net['PERIOD'] == 202511]['VALUE'].sum()
    net_prev_month = b_net[b_net['PERIOD'] == 202411]['VALUE'].sum()
    net_cur_ytd = b_net[(b_net['PERIOD'] >= 202501) & 
                        (b_net['PERIOD'] <= 202511)]['VALUE'].sum()
    net_prev_ytd = b_net[(b_net['PERIOD'] >= 202401) & 
                         (b_net['PERIOD'] <= 202411)]['VALUE'].sum()
    
    # Tag매출??
    tag_cur_month = b_tag[b_tag['PERIOD'] == 202511]['VALUE'].sum()
    tag_prev_month = b_tag[b_tag['PERIOD'] == 202411]['VALUE'].sum()
    tag_cur_ytd = b_tag[(b_tag['PERIOD'] >= 202501) & 
                        (b_tag['PERIOD'] <= 202511)]['VALUE'].sum()
    tag_prev_ytd = b_tag[(b_tag['PERIOD'] >= 202401) & 
                         (b_tag['PERIOD'] <= 202411)]['VALUE'].sum()
    
    # ?�인??계산
    discount_cur_month = round(1 - (net_cur_month / tag_cur_month), 4) if tag_cur_month > 0 else 0
    discount_prev_month = round(1 - (net_prev_month / tag_prev_month), 4) if tag_prev_month > 0 else 0
    discount_cur_ytd = round(1 - (net_cur_ytd / tag_cur_ytd), 4) if tag_cur_ytd > 0 else 0
    discount_prev_ytd = round(1 - (net_prev_ytd / tag_prev_ytd), 4) if tag_prev_ytd > 0 else 0
    
    brand_results.append({
        'BRAND': brand_mapping.get(brand_code, brand_code),
        'CUR_MONTH_PERIOD': '2512',
        'PREV_MONTH_PERIOD': '2412',
        'NET_PREV_MONTH': net_prev_month,
        'NET_CUR_MONTH': net_cur_month,
        'NET_PREV_YTD': net_prev_ytd,
        'NET_CUR_YTD': net_cur_ytd,
        'TAG_PREV_MONTH': tag_prev_month,
        'TAG_CUR_MONTH': tag_cur_month,
        'TAG_PREV_YTD': tag_prev_ytd,
        'TAG_CUR_YTD': tag_cur_ytd,
        'DISCOUNT_RATE_PREV_MONTH': discount_prev_month,
        'DISCOUNT_RATE_CUR_MONTH': discount_cur_month,
        'DISCOUNT_RATE_PREV_YTD': discount_prev_ytd,
        'DISCOUNT_RATE_CUR_YTD': discount_cur_ytd
    })

brand_df = pd.DataFrame(brand_results)
brand_df.to_csv(output_brand, index=False, encoding='utf-8-sig')

print(f"?�료: {output_mlb}")
print(f"?�료: {output_brand}")
