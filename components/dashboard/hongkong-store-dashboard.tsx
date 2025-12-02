'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import storeStatusData from './hongkong-store-status.json';
import dashboardData from './hongkong-dashboard-data.json';

type StoreCategoryKey = 'profit_improving' | 'profit_deteriorating' | 'loss_improving' | 'loss_deteriorating';

interface StoreRecord {
  shop_cd: string;
  shop_nm: string;
  country: string;
  current: {
    net_sales: number;
    direct_profit: number;
    rent_labor_ratio: number;
  };
  previous?: {
    net_sales?: number;
    direct_profit?: number;
  };
  yoy: number;
  category: StoreCategoryKey;
}

interface FlattenedStoreRow {
  store_code: string;
  store_name: string;
  category: StoreCategoryKey;
  net_sales: number;
  direct_profit: number;
  yoy: number;
  rent_labor_ratio: number;
}

const CATEGORY_LABEL: Record<StoreCategoryKey, string> = {
  profit_improving: '흑자 & 매출개선',
  profit_deteriorating: '흑자 & 매출악화',
  loss_improving: '적자 & 매출개선',
  loss_deteriorating: '적자 & 매출악화',
};

const HongKongStoreDashboard: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  
  const allStores: FlattenedStoreRow[] = useMemo(() => {
    const categories = ['profit_improving', 'profit_deteriorating', 'loss_improving', 'loss_deteriorating'] as StoreCategoryKey[];
    const result: FlattenedStoreRow[] = [];

    categories.forEach((cat) => {
      const catData = (storeStatusData as any)?.categories?.[cat];
      if (!catData?.stores) return;
      (catData.stores as StoreRecord[]).forEach((s) => {
        result.push({
          store_code: s.shop_cd,
          store_name: s.shop_nm.trim(),
          category: cat,
          net_sales: s.current?.net_sales ?? 0,
          direct_profit: s.current?.direct_profit ?? 0,
          yoy: s.yoy ?? 0,
          rent_labor_ratio: s.current?.rent_labor_ratio ?? 0,
        });
      });
    });

    return result;
  }, []);

  // 기본값 설정
  useEffect(() => {
    // 기본값은 '전체' 선택
    if (!selectedStore) {
      setSelectedStore('ALL');
    }
  }, [selectedStore]);


  const formatNumber = (num: number) =>
    (Number.isFinite(num) ? Math.round(num).toLocaleString('ko-KR') : '0');
  const formatPercent = (num: number) =>
    (Number.isFinite(num) ? `${Math.round(num)}%` : '0%');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-lg p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">홍콩 오프라인 매장 상세 대시보드 (25년 10월 기준)</h1>
            <p className="text-sm text-slate-200">
              매장별 실판매출, 직접이익, YOY 및 효율성을 한눈에 보는 상세 분석 화면입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* 매장별 1~10월 YOY 추세 테이블 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">매장별 2025년 YOY 추세</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2 font-semibold">매장명</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                  <th key={m} className="text-center p-2 font-semibold">{m}월</th>
                ))}
                <th className="text-center p-2 font-semibold">추세</th>
              </tr>
            </thead>
            <tbody>
              {allStores.map((store) => {
                const monthlyData = (dashboardData as any)?.store_monthly_trends?.[store.store_code] || [];
                
                return (
                  <tr key={store.store_code} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 font-medium">{store.store_name}</td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((month) => {
                      const monthData = monthlyData.find((d: any) => d.month === month);
                      const yoy = monthData?.yoy || 0;
                      let colorClass = 'text-gray-400';
                      if (yoy >= 100) colorClass = 'text-green-600 font-semibold';
                      else if (yoy >= 90) colorClass = 'text-gray-600';
                      else if (yoy > 0) colorClass = 'text-red-600';
                      
                      return (
                        <td key={month} className={`text-center p-2 ${colorClass}`}>
                          {yoy > 0 ? `${yoy}%` : '-'}
                        </td>
                      );
                    })}
                    <td className="text-center p-2">
                      {(() => {
                        // 3Q(7,8,9월) vs 10월 비교
                        const q3Data = monthlyData.filter((d: any) => [7, 8, 9].includes(d.month));
                        const octData = monthlyData.find((d: any) => d.month === 10);
                        if (q3Data.length === 0 || !octData) return '-';
                        
                        const q3Avg = q3Data.reduce((sum: number, d: any) => sum + d.yoy, 0) / q3Data.length;
                        const trend = octData.yoy > q3Avg;
                        
                        return trend ? (
                          <TrendingUp className="w-4 h-4 text-green-600 inline" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 inline" />
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 매장 선택 → 아이템 버블 차트 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">당시즌 (25F) 아이템별 판매 분석 (버블 차트) - 실판매출 TOP 10</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">매장 선택:</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="ALL">전체</option>
              {allStores.map((s) => (
                <option key={s.store_code} value={s.store_code}>
                  {s.store_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
            {(() => {
              if (!selectedStore) {
                return <div className="flex items-center justify-center h-full text-gray-500 text-sm">매장을 선택해주세요</div>;
              }
              
              // 25F 아이템 서브카테고리 목록 가져오기
              const seasonSales = (dashboardData as any)?.season_sales?.current_season_f;
              const subcategoryTop5 = seasonSales?.october?.subcategory_top5 || [];
              const subcategory25F = new Set(subcategoryTop5.map((item: any) => item.subcategory_code));
              
              const storeItemAll = (dashboardData as any)?.store_item_all || {};
              let rawData: any[] = [];
              let totalSales = 0;

              if (selectedStore === 'ALL') {
                // 모든 매장 데이터를 서브카테고리별로 합산 (25F만)
                const aggregated: Record<string, { net_sales: number; prev_sales: number }> = {};

                Object.values(storeItemAll).forEach((storeData: any) => {
                  if (Array.isArray(storeData)) {
                    storeData.forEach((item: any) => {
                      // 25F 서브카테고리만 필터링
                      if (item.item_name !== '합계' && subcategory25F.has(item.item_name)) {
                        if (!aggregated[item.item_name]) {
                          aggregated[item.item_name] = { net_sales: 0, prev_sales: 0 };
                        }
                        aggregated[item.item_name].net_sales += item.net_sales || 0;
                        // YOY 계산을 위한 전년 매출 추정
                        // YOY = (현재 / 전년) * 100 이므로, 전년 = 현재 * 100 / YOY
                        const currentSales = item.net_sales || 0;
                        const yoy = item.yoy || 0;
                        const prevSales = yoy > 0 && yoy < 10000 ? (currentSales * 100) / yoy : 0;
                        aggregated[item.item_name].prev_sales += prevSales;
                      }
                    });
                  }
                });

                // 합산된 데이터를 배열로 변환
                rawData = Object.entries(aggregated).map(([item_name, data]) => {
                  const yoy = data.prev_sales > 0 ? (data.net_sales / data.prev_sales) * 100 : 0;
                  return {
                    item_name,
                    net_sales: data.net_sales,
                    yoy: Number.isFinite(yoy) ? yoy : 0,
                  };
                });

                totalSales = rawData.reduce((sum: number, d: any) => sum + (d.net_sales || 0), 0);
              } else {
                // 개별 매장: 25F 서브카테고리만 필터링
                const allItems = storeItemAll?.[selectedStore] || [];
                rawData = allItems.filter((item: any) => 
                  item.item_name !== '합계' && subcategory25F.has(item.item_name)
                );
                totalSales = rawData.reduce((sum: number, d: any) => sum + (d.net_sales || 0), 0);
              }

              if (rawData.length === 0) {
                return <div className="flex items-center justify-center h-full text-gray-500 text-sm">데이터가 없습니다</div>;
              }
              // 합계 레코드 분리 및 TOP 10 정렬
              const itemData = rawData
                .filter((d: any) => d.item_name !== '합계')
                .sort((a: any, b: any) => (b.net_sales || 0) - (a.net_sales || 0))
                .slice(0, 10);
              
              if (itemData.length === 0) {
                return <div className="flex items-center justify-center h-full text-gray-500 text-sm">데이터가 없습니다</div>;
              }

              // 버블 차트 데이터 준비: X축(YOY), Y축(판매율), 크기(매출액)
              const colors = [
                '#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
                '#D97706', '#CA8A04', '#65A30D', '#059669', '#0891B2',
              ];
              
              // 최소/최대 매출액 계산 (버블 크기 계산용)
              const salesValues = itemData.map((d: any) => d.net_sales || 0);
              const minSales = Math.min(...salesValues);
              const maxSales = Math.max(...salesValues);
              const salesRange = maxSales - minSales || 1; // 0으로 나누기 방지
              
              const data = itemData.map((d: any, idx: number) => {
                const netSales = d.net_sales || 0;
                // 버블 크기: 최소 10px, 최대 50px로 정규화
                const bubbleSize = salesRange > 0 
                  ? 10 + ((netSales - minSales) / salesRange) * 40 
                  : 20;
                
                return {
                  name: d.item_name,
                  x: d.yoy || 0, // X축: YOY
                  y: totalSales > 0 ? parseFloat(((netSales / totalSales) * 100).toFixed(2)) : 0, // Y축: 판매율 (%)
                  z: netSales, // Z축(버블 크기): 매출액 (툴팁용)
                  net_sales: netSales,
                  ratio: totalSales > 0 ? ((netSales / totalSales) * 100).toFixed(1) : '0.0',
                  fill: colors[idx % colors.length], // 각 포인트별 색상
                  bubbleSize: bubbleSize, // 계산된 버블 크기
                };
              });

              return (
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="YOY"
                    label={{ value: 'YOY (%)', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="판매율"
                    label={{ value: '판매율 (%)', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 10 }}
                  />
                  <ZAxis
                    type="number"
                    dataKey="z"
                    range={[10, 50]} // 버블 크기 범위 (픽셀)
                    name="매출액"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-900 text-white p-3 rounded shadow-lg text-xs">
                          <div className="font-semibold mb-1">{data.name}</div>
                          <div>매출액: {formatNumber(data.net_sales)}K HKD</div>
                          <div>비중: {data.ratio}%</div>
                          <div>YOY: {formatPercent(data.x)}</div>
                        </div>
                      );
                    }}
                  />
                  {data.map((item: any, index: number) => (
                    <Scatter
                      key={`scatter-${index}`}
                      name={item.name}
                      data={[item]}
                      fill={item.fill}
                      shape={(props: any) => {
                        const { cx, cy, payload } = props;
                        // payload.bubbleSize를 사용하여 크기 설정
                        const radius = payload.bubbleSize || 20;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill={payload.fill || '#4F46E5'}
                            opacity={selectedItem === payload.name ? 1 : 0.7}
                            stroke={selectedItem === payload.name ? '#000' : '#fff'}
                            strokeWidth={selectedItem === payload.name ? 2 : 1}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedItem(payload.name)}
                          />
                        );
                      }}
                    />
                  ))}
                </ScatterChart>
              );
            })()}
          </ResponsiveContainer>
          </div>
          
          {/* 매장별 판매 순위 */}
          <div className="lg:col-span-1">
            {selectedItem ? (
              <div className="bg-white rounded-lg shadow-md p-4 h-80 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {selectedItem} 매장별 판매 순위
                </h3>
                {(() => {
                  const storeItemAll = (dashboardData as any)?.store_item_all || {};
                  const storeRankings: Array<{ store_name: string; store_code: string; net_sales: number; yoy: number }> = [];

                  Object.entries(storeItemAll).forEach(([storeCode, storeData]: [string, any]) => {
                    if (Array.isArray(storeData)) {
                      const itemData = storeData.find((d: any) => d.item_name === selectedItem);
                      if (itemData) {
                        const storeName = allStores.find((s) => s.store_code === storeCode)?.store_name || storeCode;
                        storeRankings.push({
                          store_name: storeName,
                          store_code: storeCode,
                          net_sales: itemData.net_sales || 0,
                          yoy: itemData.yoy || 0,
                        });
                      }
                    }
                  });

                  // 매출액 기준 내림차순 정렬
                  storeRankings.sort((a, b) => (b.net_sales || 0) - (a.net_sales || 0));

                  if (storeRankings.length === 0) {
                    return (
                      <div className="text-center text-gray-500 text-sm py-8">
                        해당 아이템을 판매한 매장이 없습니다.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {storeRankings.map((store, index) => (
                        <div
                          key={store.store_code}
                          className={`flex items-center justify-between p-2 rounded ${
                            index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                            index < 3 ? 'bg-gray-50 border border-gray-200' :
                            'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${
                              index === 0 ? 'text-yellow-600' :
                              index < 3 ? 'text-gray-600' :
                              'text-gray-400'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-xs text-gray-900 font-medium truncate max-w-[120px]">
                              {store.store_name}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-gray-900">
                              {formatNumber(store.net_sales)}K
                            </div>
                            <div className="text-[10px] text-gray-500">
                              YOY {formatPercent(store.yoy)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg shadow-md p-4 h-80 flex items-center justify-center">
                <div className="text-center text-gray-400 text-sm">
                  버블을 클릭하면<br />매장별 판매 순위가 표시됩니다
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-2">
          * X축: YOY (%), Y축: 판매율 (%), 원의 크기: 매출액 (1K HKD)
          {(() => {
            const storeItemAll = (dashboardData as any)?.store_item_all || {};
            let totalRecord: any = null;

            if (selectedStore === 'ALL') {
              // 모든 매장의 합계 레코드 합산
              let totalNetSales = 0;
              let totalPrevSales = 0;

              Object.values(storeItemAll).forEach((storeData: any) => {
                if (Array.isArray(storeData)) {
                  const storeTotal = storeData.find((d: any) => d.item_name === '합계');
                  if (storeTotal) {
                    totalNetSales += storeTotal.net_sales || 0;
                    const prevSales = storeTotal.yoy > 0 ? (storeTotal.net_sales || 0) / (storeTotal.yoy / 100) : 0;
                    totalPrevSales += prevSales;
                  }
                }
              });

              totalRecord = {
                net_sales: totalNetSales,
                yoy: totalPrevSales > 0 ? (totalNetSales / totalPrevSales) * 100 : 0,
              };
            } else {
              const rawData = storeItemAll?.[selectedStore] || [];
              totalRecord = rawData.find((d: any) => d.item_name === '합계');
            }

            if (!totalRecord) return null;

            return (
              <span className="ml-2 font-semibold text-gray-700">
                합계: {formatNumber(totalRecord.net_sales)}K HKD, YOY {formatPercent(totalRecord.yoy)}
              </span>
            );
          })()}
        </p>
      </div>
      </div>
    </div>
  );
};

export default HongKongStoreDashboard;


