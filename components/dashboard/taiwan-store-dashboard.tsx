'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import storeAreasData from './taiwan-store-areas.json';

type StoreCategoryKey = 'large_profit' | 'small_medium_profit' | 'loss';

interface TaiwanStoreRow {
  store_code: string;
  store_name: string;
  net_sales: number;
  direct_profit: number;
  area: number;
  sales_per_pyeong: number;
  yoy: number;
  category: StoreCategoryKey;
  rent?: number;
  labor_cost?: number;
  depreciation?: number;
  rent_rate: number;
  labor_rate: number;
  depreciation_rate: number;
}

const CATEGORY_LABEL: Record<StoreCategoryKey, string> = {
  large_profit: '대형 흑자매장 (≥100K)',
  small_medium_profit: '중소형 흑자매장 (<100K)',
  loss: '적자매장',
};

interface TaiwanStoreDashboardProps {
  period?: string;
}

const TaiwanStoreDashboard: React.FC<TaiwanStoreDashboardProps> = ({ period = '2511' }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['large_profit', 'small_medium_profit', 'loss']));
  const [editingAiAnalysis, setEditingAiAnalysis] = useState<boolean>(false);
  const [aiAnalysisText, setAiAnalysisText] = useState<string>('');
  
  // 동적 데이터 로드
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [plData, setPlData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Dashboard 데이터 로드
        const dashboardResponse = await fetch(`/dashboard/taiwan-dashboard-data-${period}.json`);
        if (!dashboardResponse.ok) {
          throw new Error(`Failed to load dashboard data for period ${period}`);
        }
        const dashData = await dashboardResponse.json();
        setDashboardData(dashData);
        
        // PL 데이터 로드
        const plResponse = await fetch(`/dashboard/taiwan-pl-data-${period}.json`);
        if (!plResponse.ok) {
          throw new Error(`Failed to load PL data for period ${period}`);
        }
        const plDataResult = await plResponse.json();
        setPlData(plDataResult);
        
      } catch (error) {
        console.error('Error loading data:', error);
        // 폴백: 기본 데이터 로드 시도
        try {
          const fallbackDashboard = await fetch('/dashboard/taiwan-dashboard-data.json');
          const fallbackPl = await fetch('/dashboard/taiwan-pl-data.json');
          
          if (fallbackDashboard.ok) {
            const dashData = await fallbackDashboard.json();
            setDashboardData(dashData);
          }
          if (fallbackPl.ok) {
            const plDataResult = await fallbackPl.json();
            setPlData(plDataResult);
          }
        } catch (fallbackError) {
          console.error('Error loading fallback data:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [period]);

  // 페이지 타이틀 설정
  useEffect(() => {
    document.title = "대만법인 평당매출 분석";
  }, []);

  // 매장명 포맷 함수 (한글 이름으로 변환)
  const formatStoreName = (storeName: string) => {
    const mapping: { [key: string]: string } = {
      "T08 HANSHIN ARENA": "한신아레나",
      "T03 TAIPEI 101": "Taipei 101",
      "T12 TAIMALL": "TAIMALL",
      "T06 台中中友百貨": "중우백화점",
      "T11 Nanfang TS MALL": "TS Mall",
      "T10 Banqiao Megacity": "반치아오",
      "T18 LALAPORT Taichung": "라라포트 타이중",
      "T17 LALAPORT Nangang": "라라포트 난강",
      "T02 新光三越南西3": "난징3",
      "T14 Metrowalk": "Metrowalk",
      "T01 MLB忠孝旗艦店": "종샤오",
      "T13 SKM TAINAN": "SKM Tainan",
      "T16 ZhongXiao SOGO": "Sogo종샤오",
      "T09 Taichung Eslite": "성품서적 타이중",
      "T07 新竹巨城": "신주 빅시티",
      "T04 新光三越A11": "A11",
      "T15 Xindian Yulong City": "신디엔",
      "TU3 Gloria Outlet": "글로리아 (아)",
      "TU1 Mitsui Outlet Taichung": "미츠이 타이중 (아)",
      "TU2 Mitsui Outlet Park Linkou": "미츠이 린커우 (아)",
      "TE1 TW MOMO online store": "MOMO",
      "TE2 TW 91APP": "91APP",
      "TE3 SHOPEE": "SHOPEE",
      "T05 新光三越中港": "중강",
      "T99 TW BACK OFFICE": "Back Office",
      "TE4 LINE GIFTSHOP": "LINE GIFTSHOP",
      "WTE TW EC warehouse": "EC창고",
      "WTM TW MAIN WAREHOUSE": "메인창고",
    };
    return mapping[storeName] || storeName.replace(/T\d{2,3}\s?/, '').replace(/MLB\s?/, '').trim();
  };

  // 로컬스토리지에서 AI 분석 로드
  useEffect(() => {
    const saved = localStorage.getItem('taiwan-store-ai-analysis');
    if (saved) {
      try {
        setAiAnalysisText(saved);
      } catch (e) {
        console.error('Failed to parse AI analysis from localStorage', e);
      }
    }
  }, []);

  // AI 분석 저장
  const saveAiAnalysis = (text: string) => {
    setAiAnalysisText(text);
    localStorage.setItem('taiwan-store-ai-analysis', text);
    setEditingAiAnalysis(false);
  };

  // 매장 데이터 처리
  const allStores: TaiwanStoreRow[] = useMemo(() => {
    if (!dashboardData || !plData) return [];
    
    const result: TaiwanStoreRow[] = [];
    const storeAreas = (storeAreasData as any)?.store_areas || {};
    const plStores = plData?.channel_direct_profit?.stores || {};
    const storeSummary = dashboardData?.store_summary || {};

    // store_summary의 각 매장을 순회
    Object.entries(storeSummary).forEach(([storeCode, storeInfo]: [string, any]) => {
      // 온라인 매장 제외 (TE로 시작하는 매장만 제외, TU는 아울렛이므로 포함)
      if (storeCode.startsWith('TE')) return;

      const area = storeAreas[storeCode] || 0;
      if (area === 0) return; // 면적 정보 없으면 제외

      const plStoreData = plStores[storeCode];
      if (!plStoreData) return;

      const netSales = plStoreData.net_sales || 0;
      
      // 폐점 매장 제외 (매출이 0인 매장)
      if (netSales === 0) return;
      
      const directProfit = plStoreData.direct_profit || 0;
      const salesPerPyeong = area > 0 ? netSales / area : 0;

      const netSalesPrev = plStoreData.net_sales_prev || 0;
      const yoy = netSalesPrev > 0 ? (netSales / netSalesPrev) * 100 : 0;

      const rent = plStoreData.rent || 0;
      const laborCost = plStoreData.labor_cost || 0;
      const depreciation = plStoreData.depreciation || 0;
      const rentRate = netSales > 0 ? (rent / netSales) * 100 : 0;
      const laborRate = netSales > 0 ? (laborCost / netSales) * 100 : 0;
      const depreciationRate = netSales > 0 ? (depreciation / netSales) * 100 : 0;

      // 카테고리 분류
      let category: StoreCategoryKey;
      if (directProfit >= 100) {
        category = 'large_profit';
      } else if (directProfit > 0) {
        category = 'small_medium_profit';
      } else {
        category = 'loss';
      }

      result.push({
        store_code: storeCode,
        store_name: storeInfo.store_name || storeCode,
        net_sales: netSales,
        direct_profit: directProfit,
        area: area,
        sales_per_pyeong: salesPerPyeong,
        yoy: yoy,
        category: category,
        rent: rent,
        labor_cost: laborCost,
        depreciation: depreciation,
        rent_rate: rentRate,
        labor_rate: laborRate,
        depreciation_rate: depreciationRate,
      });
    });

    // 평당매출 기준 내림차순 정렬
    return result.sort((a, b) => b.sales_per_pyeong - a.sales_per_pyeong);
  }, [dashboardData, plData]);

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString('ko-KR');
  };

  const formatPercent = (num: number) => {
    return num.toFixed(1) + '%';
  };

  // 히트맵 색상 계산
  const getHeatmapColor = (value: number, min: number, max: number) => {
    const ratio = max > min ? (value - min) / (max - min) : 0.5;

    if (ratio >= 0.8) return { bg: 'bg-green-600', text: 'text-white' };
    if (ratio >= 0.6) return { bg: 'bg-green-400', text: 'text-white' };
    if (ratio >= 0.4) return { bg: 'bg-green-200', text: 'text-gray-800' };
    if (ratio >= 0.3) return { bg: 'bg-yellow-200', text: 'text-gray-800' };
    if (ratio >= 0.2) return { bg: 'bg-yellow-100', text: 'text-gray-800' };
    if (ratio >= 0.1) return { bg: 'bg-red-100', text: 'text-gray-800' };
    if (ratio >= 0.05) return { bg: 'bg-red-200', text: 'text-gray-800' };
    return { bg: 'bg-red-300', text: 'text-gray-800' };
  };

  // 통계 계산
  const stats = useMemo(() => {
    const validStores = allStores.filter(s => s.sales_per_pyeong > 0);
    const profitStores = allStores.filter(s => s.direct_profit > 0 && s.sales_per_pyeong > 0);
    const lossStores = allStores.filter(s => s.direct_profit < 0 && s.sales_per_pyeong > 0);

    const maxSalesPerPyeong = validStores.length > 0
      ? Math.max(...validStores.map(s => s.sales_per_pyeong))
      : 0;
    const minSalesPerPyeong = validStores.length > 0
      ? Math.min(...validStores.map(s => s.sales_per_pyeong))
      : 0;

    // 최고/최저 매장 찾기
    const maxStore = validStores.find(s => s.sales_per_pyeong === maxSalesPerPyeong);
    const minStore = validStores.find(s => s.sales_per_pyeong === minSalesPerPyeong);

    const avgProfitSalesPerPyeong = profitStores.length > 0
      ? profitStores.reduce((sum, s) => sum + s.sales_per_pyeong, 0) / profitStores.length
      : 0;

    const minProfitSalesPerPyeong = profitStores.length > 0
      ? Math.min(...profitStores.map(s => s.sales_per_pyeong))
      : 0;

    const maxLossSalesPerPyeong = lossStores.length > 0
      ? Math.max(...lossStores.map(s => s.sales_per_pyeong))
      : 0;

    const breakEvenThreshold = Math.max(minProfitSalesPerPyeong, maxLossSalesPerPyeong);

    return {
      maxSalesPerPyeong,
      minSalesPerPyeong,
      maxStore,
      minStore,
      avgProfitSalesPerPyeong,
      breakEvenThreshold,
      profitStoresCount: profitStores.length,
    };
  }, [allStores]);

  // 카테고리별 그룹화
  const categoryGroups: Record<StoreCategoryKey, TaiwanStoreRow[]> = useMemo(() => {
    return {
      large_profit: allStores.filter(s => s.category === 'large_profit'),
      small_medium_profit: allStores.filter(s => s.category === 'small_medium_profit'),
      loss: allStores.filter(s => s.category === 'loss'),
    };
  }, [allStores]);

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(catKey)) {
        newSet.delete(catKey);
      } else {
        newSet.add(catKey);
      }
      return newSet;
    });
  };

  const toggleAllCategories = () => {
    const allCategoryKeys: StoreCategoryKey[] = ['large_profit', 'small_medium_profit', 'loss'];
    if (expandedCategories.size === allCategoryKeys.length) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(allCategoryKeys));
    }
  };

  const defaultAiText = `평당매출이 ${formatNumber(stats.breakEvenThreshold)} HKD/평 이상이어야 흑자 전환 가능성이 높습니다. 현재 흑자 매장(${stats.profitStoresCount}개)의 평균 평당매출은 ${formatNumber(stats.avgProfitSalesPerPyeong)} HKD/평입니다.`;
  const displayAiText = aiAnalysisText || defaultAiText;

  // 로딩 중 표시
  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Period 표시를 위한 포맷팅
  const periodYear = period.substring(0, 2);
  const periodMonth = period.substring(2, 4);
  const periodLabel = `${periodYear}년 ${periodMonth}월`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">대만법인 평당매출 분석 ({periodLabel}, {period})</h1>
          <p className="text-purple-100">(단위: 1K HKD)</p>
        </div>

        {/* 매장별 평당매출 분석 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">매장별 평당매출 분석</h2>
            <button
              type="button"
              onClick={toggleAllCategories}
              className="px-3 py-1.5 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {expandedCategories.size === 3 ? '전체 접기' : '전체 펼치기'}
            </button>
          </div>

          {/* AI 분석 */}
          <div className="mb-4 p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
            {editingAiAnalysis ? (
              <div>
                <textarea
                  className="w-full text-xs p-2 border border-purple-300 rounded"
                  rows={3}
                  value={displayAiText}
                  onChange={(e) => setAiAnalysisText(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => saveAiAnalysis(displayAiText)}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setAiAnalysisText('');
                      localStorage.removeItem('taiwan-store-ai-analysis');
                      setEditingAiAnalysis(false);
                    }}
                    className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    기본값으로 복원
                  </button>
                  <button
                    onClick={() => setEditingAiAnalysis(false)}
                    className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <p className="text-xs text-gray-700 flex-1">
                  <span className="font-semibold text-purple-700">💡 AI 분석:</span> {displayAiText}
                </p>
                <button
                  onClick={() => setEditingAiAnalysis(true)}
                  className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  수정
                </button>
              </div>
            )}
          </div>

          {/* 통계 요약 */}
          <div className="mb-4 grid grid-cols-4 gap-3 text-xs">
            <div className="bg-green-50 rounded p-3 border border-green-200">
              <div className="text-gray-600 mb-1">최고 평당매출</div>
              <div className="font-bold text-green-600 text-lg">
                {formatNumber(stats.maxSalesPerPyeong)} HKD/평
              </div>
              {stats.maxStore && (
                <div className="text-xs text-gray-600 mt-1">
                  {formatStoreName(stats.maxStore.store_name)}
                </div>
              )}
            </div>
            <div className="bg-red-50 rounded p-3 border border-red-200">
              <div className="text-gray-600 mb-1">최저 평당매출</div>
              <div className="font-bold text-red-600 text-lg">
                {formatNumber(stats.minSalesPerPyeong)} HKD/평
              </div>
              {stats.minStore && (
                <div className="text-xs text-gray-600 mt-1">
                  {formatStoreName(stats.minStore.store_name)}
                </div>
              )}
            </div>
            <div className="bg-blue-50 rounded p-3 border border-blue-200">
              <div className="text-gray-600 mb-1">흑자매장 평균</div>
              <div className="font-bold text-blue-600 text-lg">
                {formatNumber(stats.avgProfitSalesPerPyeong)} HKD/평
              </div>
            </div>
            <div className="bg-purple-50 rounded p-3 border border-purple-200">
              <div className="text-gray-600 mb-1">손익분기점 기준</div>
              <div className="font-bold text-purple-600 text-lg">
                {formatNumber(stats.breakEvenThreshold)} HKD/평
              </div>
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <div className="flex justify-end mb-2">
              <span className="text-xs text-gray-600 font-semibold">단위: 1K HKD</span>
            </div>
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-200 border-b-2 border-gray-400">
                  <th className="p-2 text-left font-semibold">매장명</th>
                  <th className="p-2 text-right font-semibold">실판매출</th>
                  <th className="p-2 text-right font-semibold">면적<br/>(평)</th>
                  <th className="p-2 text-right font-semibold">평당매출<br/>(/평)</th>
                  <th className="p-2 text-right font-semibold">매출YOY<br/>(vs 2410)</th>
                  <th className="p-2 text-right font-semibold">직접이익</th>
                  <th className="p-2 text-right font-semibold">임차료율</th>
                  <th className="p-2 text-right font-semibold">인건비율</th>
                  <th className="p-2 text-right font-semibold">감가상각비율</th>
                  <th className="p-2 text-right font-semibold">순위</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryGroups).map(([catKey, stores]) => {
                  if (stores.length === 0) return null;
                  const categoryName = CATEGORY_LABEL[catKey as StoreCategoryKey];
                  const isExpanded = expandedCategories.has(catKey);

                  // 카테고리별 합계 계산
                  const totalSales = stores.reduce((sum, s) => sum + s.net_sales, 0);
                  const totalDirectProfit = stores.reduce((sum, s) => sum + s.direct_profit, 0);
                  const totalArea = stores.reduce((sum, s) => sum + s.area, 0);
                  const avgSalesPerPyeong = totalArea > 0 ? totalSales / totalArea : 0;
                  const avgRentRate = stores.reduce((sum, s) => sum + s.rent_rate, 0) / stores.length;
                  const avgLaborRate = stores.reduce((sum, s) => sum + s.labor_rate, 0) / stores.length;
                  const avgDepreciationRate = stores.reduce((sum, s) => sum + s.depreciation_rate, 0) / stores.length;
                  const avgYoy = stores.reduce((sum, s) => sum + s.yoy, 0) / stores.length;

                  return (
                    <React.Fragment key={catKey}>
                      {/* 카테고리 합계 행 */}
                      <tr
                        className="border-b-2 border-gray-400 bg-gray-100 hover:bg-gray-200 font-bold cursor-pointer"
                        onClick={() => toggleCategory(catKey)}
                      >
                        <td className="p-2 font-semibold border-r border-gray-300">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span>{categoryName}</span>
                            <span className="text-xs font-normal text-gray-600">({stores.length}개)</span>
                          </div>
                        </td>
                        <td className="p-2 text-right border-r border-gray-300 bg-white">
                          {formatNumber(totalSales)}
                        </td>
                        <td className="p-2 text-right border-r border-gray-300 bg-white">
                          {formatNumber(totalArea)}
                        </td>
                        <td className={`p-2 text-right border-r border-gray-300 font-bold ${getHeatmapColor(avgSalesPerPyeong, stats.minSalesPerPyeong, stats.maxSalesPerPyeong).bg} ${getHeatmapColor(avgSalesPerPyeong, stats.minSalesPerPyeong, stats.maxSalesPerPyeong).text}`}>
                          {formatNumber(avgSalesPerPyeong)}
                        </td>
                        <td className={`p-2 text-right border-r border-gray-300 bg-white ${
                          avgYoy >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercent(avgYoy)}
                        </td>
                        <td className={`p-2 text-right border-r border-gray-300 bg-white font-semibold ${
                          totalDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatNumber(totalDirectProfit)}
                        </td>
                        <td className="p-2 text-right border-r border-gray-300 bg-white">
                          {formatPercent(avgRentRate)}
                        </td>
                        <td className="p-2 text-right border-r border-gray-300 bg-white">
                          {formatPercent(avgLaborRate)}
                        </td>
                        <td className="p-2 text-right border-r border-gray-300 bg-white">
                          {avgDepreciationRate === 0 ? (
                            <span className="text-gray-400 text-[10px]">상각완료</span>
                          ) : (
                            formatPercent(avgDepreciationRate)
                          )}
                        </td>
                        <td className="p-2 text-right border-r border-gray-300 bg-white">-</td>
                      </tr>

                      {/* 매장별 행 */}
                      {isExpanded && stores.map((store, index) => {
                        const globalRank = allStores.findIndex(s => s.store_code === store.store_code) + 1;
                        const colorStyle = getHeatmapColor(store.sales_per_pyeong, stats.minSalesPerPyeong, stats.maxSalesPerPyeong);

                        const isNewStore = store.store_code === 'T17' || store.store_code === 'T18';
                        
                        return (
                          <tr key={store.store_code} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2 text-gray-600 pl-8">
                              {formatStoreName(store.store_name)}
                              {isNewStore && (
                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">신규</span>
                              )}
                            </td>
                            <td className="p-2 text-right bg-white">{formatNumber(store.net_sales)}</td>
                            <td className="p-2 text-right bg-white">{formatNumber(store.area)}</td>
                            <td className={`p-2 text-right font-bold ${colorStyle.bg} ${colorStyle.text}`}>
                              {formatNumber(store.sales_per_pyeong)}
                            </td>
                            <td className="p-2 text-right bg-white">
                              {isNewStore ? (
                                <span className="text-gray-400 text-[10px]">신규</span>
                              ) : (
                                <span className={store.yoy >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {formatPercent(store.yoy)}
                                </span>
                              )}
                            </td>
                            <td className={`p-2 text-right bg-white font-semibold ${
                              store.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatNumber(store.direct_profit)}
                            </td>
                            <td className="p-2 text-right bg-white">{formatPercent(store.rent_rate)}</td>
                            <td className="p-2 text-right bg-white">{formatPercent(store.labor_rate)}</td>
                            <td className="p-2 text-right bg-white">
                              {store.depreciation_rate === 0 || (store.depreciation || 0) === 0 ? (
                                <span className="text-gray-400 text-[10px]">상각완료</span>
                              ) : (
                                formatPercent(store.depreciation_rate)
                              )}
                            </td>
                            <td className="p-2 text-right bg-white text-gray-500">
                              #{globalRank}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 뒤로가기 */}
        <div className="text-center">
          <button
            onClick={() => window.close()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            창 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaiwanStoreDashboard;

