'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, LabelList, ReferenceLine, Cell, Layer } from 'recharts';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import dashboardData from './hongkong-dashboard-data.json';
import plData from './hongkong-pl-data.json';
import storeStatusData from './hongkong-store-status.json';

const HongKongCEODashboard = () => {
  useEffect(() => {
    document.title = "홍콩법인 25년 10월 경영실적";
  }, []);

  // ============================================================
  // STATE 관리 - 상세보기 토글 상태
  // ============================================================
  const [showSalesDetail, setShowSalesDetail] = useState(false);
  const [showProfitDetail, setShowProfitDetail] = useState(false);
  const [showItemProfitDetail, setShowItemProfitDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showOtherDetail, setShowOtherDetail] = useState(false);  // 당월 기타 상세
  const [showOtherDetailCumulative, setShowOtherDetailCumulative] = useState(false);  // 누적 기타 상세
  const [showDiscountDetail, setShowDiscountDetail] = useState(false);
  const [showStoreDetail, setShowStoreDetail] = useState(false);
  const [showSeasonSalesDetail, setShowSeasonSalesDetail] = useState(false);
  const [showAccInventoryDetail, setShowAccInventoryDetail] = useState(false);
  const [showEndInventoryDetail, setShowEndInventoryDetail] = useState(false);
  const [showPastSeasonDetail, setShowPastSeasonDetail] = useState(false);
  const [showCurrentSeasonDetail, setShowCurrentSeasonDetail] = useState(false);
  const [showDiscoveryDetail, setShowDiscoveryDetail] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expenseType, setExpenseType] = useState<'당월' | '누적'>('당월');
  const [opexType, setOpexType] = useState<'당월' | '누적'>('당월');
  const [showDirectCostItemAnalysis, setShowDirectCostItemAnalysis] = useState<{[key: string]: boolean}>({});
  const [showOperatingExpenseItemAnalysis, setShowOperatingExpenseItemAnalysis] = useState<{[key: string]: boolean}>({});
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);  // 선택된 채널 (범례 클릭 시)
  const [salesPriceType, setSalesPriceType] = useState<'실판' | '택가' | '할인율'>('실판');  // 아이템별 추세 가격 타입
  const [selectedItem, setSelectedItem] = useState<string | null>(null);  // 선택된 아이템 (범례 클릭 시)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);  // 선택된 재고 아이템 (범례 클릭 시)
  const [expandedStoreCategories, setExpandedStoreCategories] = useState<{[key: string]: {stores: boolean, rentLabor: boolean}}>({
    profit_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    profit_deteriorating: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_deteriorating: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    mc_summary: {stores: true, rentLabor: false}  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
  });
  const [expandedSummary, setExpandedSummary] = useState({
    calculationBasis: false,
    hkDetails: false,
    mcDetails: false,
    excludedStores: false,
    insights: false
  });

  // ============================================================
  // 헬퍼 함수
  // ============================================================
  const toggleAllDetails = () => {
    const newState = !showSalesDetail;
    setShowSalesDetail(newState);
    setShowProfitDetail(newState);
    setShowExpenseDetail(newState);
    setShowStoreDetail(newState);
    setShowSeasonSalesDetail(newState);
    setShowAccInventoryDetail(newState);
    setShowEndInventoryDetail(newState);
    setShowPastSeasonDetail(newState);
  };

  const toggleActionItem = (index: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // ============================================================
  // 데이터 추출
  // ============================================================
  // 디버깅: 데이터 확인
  useEffect(() => {
    console.log('dashboardData:', dashboardData);
    console.log('plData:', plData);
    console.log('storeStatusData:', storeStatusData);
  }, []);
  
  const salesSummary = dashboardData?.sales_summary || {};
  const countryChannel = dashboardData?.country_channel_summary || {};
  const offlineEfficiency = dashboardData?.offline_store_efficiency || {};
  const storeEfficiencySummary = offlineEfficiency?.total;
  const totalStoreCurrent = storeEfficiencySummary?.current?.store_count ?? storeStatusData?.summary?.total_stores ?? 0;
  const totalStorePrevious = storeEfficiencySummary?.previous?.store_count ?? offlineEfficiency?.total?.previous?.store_count ?? storeStatusData?.summary?.total_stores ?? 0;
  const totalSalesPerStore = storeEfficiencySummary?.current?.sales_per_store ?? storeStatusData?.summary?.sales_per_store ?? 0;
  const prevSalesPerStore = storeEfficiencySummary?.previous?.sales_per_store ?? offlineEfficiency?.total?.previous?.sales_per_store ?? storeStatusData?.summary?.sales_per_store ?? 0;
  const totalSalesPerStoreYoy = offlineEfficiency?.total?.yoy ?? (prevSalesPerStore ? (totalSalesPerStore / prevSalesPerStore) * 100 : 0);

  const allHKStores = useMemo(() => {
    if (!storeStatusData?.categories) return [];
    return [
      ...(storeStatusData?.categories?.profit_improving?.stores || []),
      ...(storeStatusData?.categories?.profit_deteriorating?.stores || []),
      ...(storeStatusData?.categories?.loss_improving?.stores || []),
      ...(storeStatusData?.categories?.loss_deteriorating?.stores || [])
    ];
  }, [storeStatusData]);

  const activeHKStores = useMemo(
    () => allHKStores.filter((store: any) => (store?.current?.net_sales || 0) > 0),
    [allHKStores]
  );
  const seasonSales = dashboardData?.season_sales || {};
  const accStock = dashboardData?.acc_stock_summary || {};
  const endingInventory = dashboardData?.ending_inventory || {};
  const pastSeasonFW = endingInventory?.past_season_fw || {};
  const pl = plData?.current_month?.total || {};
  const plYoy = plData?.current_month?.yoy || {};
  const plChange = plData?.current_month?.change || {};

  // 채널별 데이터
  const hkRetail = countryChannel?.HK_Retail || {};
  const hkOutlet = countryChannel?.HK_Outlet || {};
  const hkOnline = countryChannel?.HK_Online || {};
  const mcRetail = countryChannel?.MO_Retail || {};
  const mcOutlet = countryChannel?.MO_Outlet || {};

  // 숫자 포맷팅 헬퍼
  const formatNumber = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Math.round(num).toFixed(decimals);
  };

  // 재고주수 포맷팅 (소수점 첫째자리까지)
  const formatStockWeeks = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  // 전년비 증감금액 포맷팅 (증가: +, 감소: △, 색상 강조)
  const formatChange = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return { text: '0', className: 'text-gray-600' };
    const value = Math.round(num);
    if (value > 0) {
      return { text: `+${formatNumber(value)}`, className: 'text-green-600 font-semibold' };
    } else if (value < 0) {
      return { text: `△${formatNumber(Math.abs(value))}`, className: 'text-red-600 font-semibold' };
    } else {
      return { text: '0', className: 'text-gray-600' };
    }
  };

  // YOY 포맷팅 (소수점 없이)
  const formatYoy = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Math.round(num).toString();
  };

  // 비율 포맷팅 (소수점 첫째 자리까지)
  const formatRate = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">홍콩법인 25년 10월 경영실적</h1>
            <p className="text-slate-200">(보고일 : 2025년 11월 17일)</p>
          </div>
        </div>
      </div>

      {/* 실적 요약 및 CEO 인사이트 */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실적 요약 및 CEO 인사이트</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* 핵심 성과 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">💡</span>
                핵심 성과
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span>
                    <span className="font-semibold">매장효율성 개선:</span> 점당매출 {formatNumber(offlineEfficiency?.total?.current?.sales_per_store)}K 
                    (<span className="bg-green-100 px-1 rounded font-bold">YOY {formatPercent(offlineEfficiency?.total?.yoy)}%</span>) 
                    LCX(리뉴얼 10/13-11/7), WTC(10/11 영업종료) 계산제외
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span>
                    <span className="font-semibold">당시즌 판매율 개선:</span> 
                    <span className="bg-green-100 px-1 rounded font-bold">{formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate, 1)}%</span>로 
                    전년 대비 <span className="bg-green-100 px-1 rounded font-bold">+{formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate_change, 1)}%p</span> 상승 (25F 의류)
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span>
                    <span className="font-semibold">입고 효율화:</span> 25FW 입고 YOY {formatPercent(seasonSales?.current_season_f?.accumulated?.net_acp_p_yoy)}%, 
                    판매금액 YOY {formatPercent(seasonSales?.current_season_f?.accumulated?.ac_sales_gross_yoy)}% 달성 
                    (재고 부족 방지를 위해 <span className="bg-yellow-100 px-1 rounded font-bold">26SS 조기운영 예정</span>)
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span>
                    <span className="font-semibold">온라인 성장:</span> 매출 {formatNumber((hkOnline?.current?.net_sales || 0) / 1000)}K 
                    (<span className="bg-blue-100 px-1 rounded font-bold">YOY {formatPercent(hkOnline?.yoy)}%</span>, 비중 {formatPercent(((hkOnline?.current?.net_sales || 0) / (salesSummary?.total_net_sales || 1)) * 100, 1)}%), 
                    직접이익 {formatNumber(plData?.channel_direct_profit?.hk_online?.direct_profit || 0)}K ({formatPercent(plData?.channel_direct_profit?.hk_online?.yoy || 0)}%) - 
                    비중 <span className="bg-blue-100 px-1 rounded font-bold">5.0%초과 목표</span>
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span>
                    <span className="font-semibold">재고 안정화:</span> 총재고 YOY {formatPercent(((endingInventory?.total?.current || 0) / (endingInventory?.total?.previous || 1)) * 100)}% 
                    (전년 {formatNumber(endingInventory?.total?.previous)}K → {formatNumber(endingInventory?.total?.current)}K)
                  </span>
                </div>
              </div>
            </div>

            {/* 주요 리스크 */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border-l-4 border-orange-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                주요 리스크
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">영업손실 확대:</span> 
                    <span className="bg-red-200 px-1 rounded font-bold">{formatNumber(pl?.operating_profit)}K</span> 
                    (전년 -196K), 적자 <span className="bg-red-200 px-1 rounded font-bold">{formatNumber(Math.abs(plChange?.operating_profit || 0))}K 증가</span>
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">과시즌 FW 재고:</span> {formatNumber(pastSeasonFW?.total?.current || 0)}K 
                    (<span className="bg-red-200 px-1 rounded font-bold">YOY {formatPercent(pastSeasonFW?.total?.yoy || 0)}%</span>), 
                    1년차 24FW {formatNumber((pastSeasonFW?.by_year?.['1년차']?.current?.stock_price || 0) / 1000)}K ({formatPercent(pastSeasonFW?.by_year?.['1년차']?.yoy || 0)}%), 
                    2년차 23FW {formatNumber((pastSeasonFW?.by_year?.['2년차']?.current?.stock_price || 0) / 1000)}K 
                    (<span className="bg-red-200 px-1 rounded font-bold">{formatPercent(pastSeasonFW?.by_year?.['2년차']?.yoy || 0)}%</span>)
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">마카오 부진:</span> 매출 {formatNumber(((mcRetail?.current?.net_sales || 0) + (mcOutlet?.current?.net_sales || 0)) / 1000)}K 
                    (<span className="bg-orange-200 px-1 rounded font-bold">YOY {formatPercent(((mcRetail?.yoy || 0) + (mcOutlet?.yoy || 0)) / 2)}%</span>), 
                    직접이익 {formatNumber(plData?.channel_direct_profit?.mc_offline?.direct_profit || 0)}K 
                    (<span className="bg-orange-200 px-1 rounded font-bold">{formatPercent(plData?.channel_direct_profit?.mc_offline?.yoy || 0)}%</span>)
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">영업비 증가:</span> {formatNumber(pl?.sg_a)}K 
                    (<span className="bg-orange-200 px-1 rounded font-bold">YOY {formatPercent(plYoy?.sg_a)}%</span>), 
                    급여+164K, 마케팅비+111K
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">적자매장 9개:</span> HK Retail 6개(최대 Yoho 
                    <span className="bg-red-200 px-1 rounded font-bold">-210K</span>), Outlet 3개, MC 1개 
                    <span className="text-gray-600 text-xs">(LCX·WTC 비정상운영 제외)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* CEO 전략 방향 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">🎯</span>
                CEO 전략 방향
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">1.</span>
                  <span>
                    <span className="font-semibold">수익성 회복:</span> 영업비율 
                    <span className="bg-purple-100 px-1 rounded font-bold">{formatPercent(pl.operating_profit_rate, 1)}% → 5.0%</span> 목표, 
                    매출 개선을 통해 달성
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">2.</span>
                  <span>
                    <span className="font-semibold">과시즌 FW 소진:</span> 
                    <span className="bg-purple-100 px-1 rounded font-bold">
                      MT({formatPercent(pastSeasonFW?.['1year_subcategory']?.MT?.yoy || 0)}%), 
                      JP({formatPercent(pastSeasonFW?.['1year_subcategory']?.JP?.yoy || 0)}%)
                    </span> 집중 프로모션
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">3.</span>
                  <span>
                    <span className="font-semibold">마카오 회복 전략:</span> VMD 직원 현지 발탁 및 컬러 프린트 현지 구비로 프로모션 대응 속도 개선
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">4.</span>
                  <span>
                    <span className="font-semibold">적자매장 개선:</span> 
                    <span className="bg-purple-100 px-1 rounded font-bold">Yoho(-210K), Time Square(-174K), NTP3(-167K)</span> 적자개선 액션플랜 도출 필요
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">5.</span>
                  <span>
                    <span className="font-semibold">온라인 확대:</span> 
                    <span className="bg-purple-100 px-1 rounded font-bold">YOY {formatPercent(hkOnline.yoy)}%</span> 성장 모멘텀 유지, 디지털 마케팅 강화
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 홍콩법인 경영실적 (5개 카드) */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🏢</span>
              홍콩법인 경영실적 (MLB 기준)
            </h2>
            <button
              onClick={toggleAllDetails}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-semibold"
            >
              <span>{showSalesDetail ? '전체 접기' : '전체 펼치기'}</span>
              {showSalesDetail ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* 첫 번째 줄 */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            {/* 실판매출 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📊</span>
                <h3 className="text-sm font-semibold text-gray-600">실판매출 (1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatNumber(pl?.net_sales)}
              </div>
              <div className="text-sm text-red-600 font-semibold mb-3">
                YOY {formatPercent(plYoy?.net_sales)}% (△{formatNumber(Math.abs(plChange?.net_sales || 0))})
              </div>
              
              {/* 채널별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowSalesDetail(!showSalesDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 상세보기</span>
                  {showSalesDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showSalesDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                    <span>HK (홍콩)</span>
                    <span className="text-red-600">
                      {formatNumber(((hkRetail?.current?.net_sales || 0) + (hkOutlet?.current?.net_sales || 0) + (hkOnline?.current?.net_sales || 0)) / 1000)} 
                      ({formatPercent(((hkRetail?.yoy || 0) + (hkOutlet?.yoy || 0) + (hkOnline?.yoy || 0)) / 3)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">
                      {formatNumber((hkRetail?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(hkRetail?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">
                      {formatNumber((hkOutlet?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(hkOutlet?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold">
                      {formatNumber((hkOnline?.current?.net_sales || 0) / 1000)} 
                      <span className="text-green-600"> ({formatPercent(hkOnline?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                    <span>MC (마카오)</span>
                    <span className="text-red-600">
                      {formatNumber(((mcRetail?.current?.net_sales || 0) + (mcOutlet?.current?.net_sales || 0)) / 1000)} 
                      ({formatPercent(((mcRetail?.yoy || 0) + (mcOutlet?.yoy || 0)) / 2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">
                      {formatNumber((mcRetail?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(mcRetail?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">
                      {formatNumber((mcOutlet?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(mcOutlet?.yoy || 0)}%)</span>
                    </span>
                  </div>
                </div>
              )}
              
              {/* 전년 동일매장 기준 YOY */}
              <div className="mt-3 pt-3 border-t">
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xs font-semibold text-blue-800 mb-1">📌 전년 동일매장 기준</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">실판매출 YOY (종료매장 제외)</span>
                    <span className="text-sm font-bold text-blue-900">{formatPercent(salesSummary?.same_store_yoy)}%</span>
                  </div>
                  <div className="text-[10px] text-blue-600 mt-1 italic">
                    * 종료매장 제외 (온라인 포함 {salesSummary?.same_store_count || 0}개 매장 기준)
                  </div>
                </div>
              </div>
            </div>

            {/* 영업이익 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">💰</span>
                <h3 className="text-sm font-semibold text-gray-600">영업이익 (1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatNumber(pl?.operating_profit)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-red-600">적자악화</span> | <span className="text-red-600">이익률 {formatPercent(pl?.operating_profit_rate, 1)}%</span>
              </div>
              
              {/* 채널별 직접이익[이익률] */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowProfitDetail(!showProfitDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 직접이익[이익률]</span>
                  {showProfitDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showProfitDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK 오프라인</span>
                    <span className="font-semibold text-red-600">
                      {formatNumber(plData?.channel_direct_profit?.hk_offline?.direct_profit || 0)} 
                      <span className="text-green-600"> ({plData?.channel_direct_profit?.hk_offline?.status || ''})</span> 
                      <span className="text-red-600"> [{formatPercent(plData?.channel_direct_profit?.hk_offline?.direct_profit_rate || 0, 1)}%]</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">MC 오프라인</span>
                    <span className="font-semibold">
                      {formatNumber(plData?.channel_direct_profit?.mc_offline?.direct_profit || 0)} 
                      <span className="text-red-600"> ({formatPercent(plData?.channel_direct_profit?.mc_offline?.yoy || 0)}%)</span> 
                      <span className="text-blue-600"> [{formatPercent(plData?.channel_direct_profit?.mc_offline?.direct_profit_rate || 0, 1)}%]</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK 온라인</span>
                    <span className="font-semibold">
                      {formatNumber(plData?.channel_direct_profit?.hk_online?.direct_profit || 0)} 
                      <span className="text-green-600"> ({formatPercent(plData?.channel_direct_profit?.hk_online?.yoy || 0)}%)</span> 
                      <span className="text-blue-600"> [{formatPercent(plData?.channel_direct_profit?.hk_online?.direct_profit_rate || 0, 1)}%]</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t">
                    <span className="text-gray-700">전체 직접이익</span>
                    <span className="text-red-600">
                      {formatNumber(plData?.channel_direct_profit?.total?.direct_profit || 0)} 
                      ({formatPercent(plData?.channel_direct_profit?.total?.yoy || 0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">직접이익률</span>
                    <span className="text-red-600">{formatPercent(plData?.channel_direct_profit?.total?.direct_profit_rate || 0)}%</span>
                  </div>
                </div>
              )}
              
              {/* 손익 구조 */}
              <div className="border-t pt-3 mt-3">
                <button 
                  onClick={() => setShowItemProfitDetail(!showItemProfitDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>손익 구조</span>
                  {showItemProfitDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showItemProfitDetail && (
                <div className="mt-3 pt-3 border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">항목</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">금액</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">YOY</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">전년비</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700">택매출</td>
                          <td className="text-right py-1 px-2 font-semibold">{formatNumber(pl?.tag_sales)}</td>
                          <td className="text-right py-1 px-2 text-red-600 font-semibold">{formatPercent(plYoy?.tag_sales)}%</td>
                          <td className="text-right py-1 px-2 text-red-600 font-semibold">△{formatNumber(Math.abs(plChange?.tag_sales || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 할인 ({formatPercent(pl?.discount_rate)}%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.discount)}</td>
                          <td className="text-right py-1 px-2 text-green-600">{formatPercent(plYoy?.discount)}%</td>
                          <td className="text-right py-1 px-2 text-green-600">△{formatNumber(Math.abs(plChange?.discount || 0))}</td>
                        </tr>
                        <tr className="bg-blue-50 font-semibold">
                          <td className="py-1.5 px-2 text-blue-800 border-t border-blue-200">= 실판매출</td>
                          <td className="text-right py-1.5 px-2 text-blue-800 border-t border-blue-200">{formatNumber(pl?.net_sales)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-blue-200">{formatPercent(plYoy?.net_sales)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-blue-200">△{formatNumber(Math.abs(plChange?.net_sales || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 매출원가 ({formatPercent(pl?.cogs_rate)}%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.cogs)}</td>
                          <td className="text-right py-1 px-2 text-red-600">{formatPercent(plYoy?.cogs)}%</td>
                          <td className="text-right py-1 px-2 text-red-600">△{formatNumber(Math.abs(plChange?.cogs || 0))}</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="py-1.5 px-2 text-green-800 border-t border-green-200">= 매출총이익 ({formatPercent(pl?.gross_profit_rate)}%)</td>
                          <td className="text-right py-1.5 px-2 text-green-800 border-t border-green-200">{formatNumber(pl?.gross_profit)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-green-200">{formatPercent(plYoy?.gross_profit)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-green-200">△{formatNumber(Math.abs(plChange?.gross_profit || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 직접비</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.direct_cost)}</td>
                          <td className="text-right py-1 px-2 text-green-600">{formatPercent(plYoy?.direct_cost)}%</td>
                          <td className="text-right py-1 px-2 text-green-600">△{formatNumber(Math.abs(plChange?.direct_cost || 0))}</td>
                        </tr>
                        <tr className="bg-yellow-50 font-semibold">
                          <td className="py-1.5 px-2 text-orange-800 border-t border-yellow-200">= 직접이익 ({formatPercent(pl?.direct_profit_rate)}%)</td>
                          <td className="text-right py-1.5 px-2 text-orange-800 border-t border-yellow-200">{formatNumber(pl?.direct_profit)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-yellow-200">{formatPercent(plYoy?.direct_profit)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-yellow-200">△{formatNumber(Math.abs(plChange?.direct_profit || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 영업비</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.sg_a)}</td>
                          <td className="text-right py-1 px-2 text-red-600">{formatPercent(plYoy?.sg_a)}%</td>
                          <td className="text-right py-1 px-2 text-red-600">+{formatNumber(plChange?.sg_a || 0)}</td>
                        </tr>
                        <tr className="bg-red-50 font-bold">
                          <td className="py-1.5 px-2 text-red-800 border-t-2 border-red-300">= 영업이익 ({formatPercent(pl?.operating_profit_rate)}%)</td>
                          <td className="text-right py-1.5 px-2 text-red-800 border-t-2 border-red-300">{formatNumber(pl?.operating_profit)}</td>
                          <td className="text-right py-1.5 px-2 text-red-700 border-t-2 border-red-300">적자악화</td>
                          <td className="text-right py-1.5 px-2 text-red-700 border-t-2 border-red-300">△{formatNumber(Math.abs(plChange?.operating_profit || 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* 디스커버리 참고 실적 */}
              {plData.discovery && (
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowDiscoveryDetail(!showDiscoveryDetail)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between mb-2"
                  >
                    <span>📊 참고: 디스커버리 실적 (1K HKD)</span>
                    {showDiscoveryDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {showDiscoveryDetail && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-[10px] text-purple-600 mb-2">
                        온라인{plData?.discovery?.store_count?.online || 0}개, 오프라인{plData?.discovery?.store_count?.offline || 0}개 (10/1 영업개시)
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-purple-700">실판매출</span>
                          <span className="font-semibold text-purple-900">
                            {formatNumber(plData?.discovery?.net_sales)} 
                            <span className="text-purple-600"> (할인율 {formatPercent(plData?.discovery?.discount_rate)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-700">직접비</span>
                          <span className="font-semibold text-purple-900">{formatNumber(plData?.discovery?.direct_cost)}</span>
                        </div>
                        <div className="flex justify-between font-semibold bg-purple-100 px-2 py-1 rounded">
                          <span className="text-purple-800">직접손실</span>
                          <span className="text-red-700">{formatNumber(plData?.discovery?.direct_profit)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] pl-2">
                          <span className="text-purple-600">• 마케팅비</span>
                          <span className="text-purple-700">{formatNumber(plData?.discovery?.marketing)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] pl-2">
                          <span className="text-purple-600">• 여비교통비</span>
                          <span className="text-purple-700">{formatNumber(plData?.discovery?.travel)}</span>
                        </div>
                        <div className="flex justify-between font-bold bg-red-100 px-2 py-1 rounded mt-1">
                          <span className="text-red-800">영업손실</span>
                          <span className="text-red-700">{formatNumber(plData?.discovery?.operating_profit)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 영업비 카드 - 다음 파일에서 계속 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📈</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업비 (1K HKD)</h3>
                </div>
                
                {/* 당월/누적 토글 */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setExpenseType('당월')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                      expenseType === '당월'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    당월
                  </button>
                  <button
                    onClick={() => setExpenseType('누적')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                      expenseType === '누적'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    누적
                  </button>
                </div>
              </div>
              
              {expenseType === '당월' ? (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {formatNumber(pl?.sg_a)}
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY {formatPercent(plYoy?.sg_a)}%</span> | 
                    <span className="text-blue-600"> 영업비율 {formatPercent(((pl?.sg_a || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  
                  {/* 영업비 상세보기 */}
                  <div className="border-t pt-3">
                    <button 
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>영업비 상세보기</span>
                      {showExpenseDetail ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showExpenseDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {(() => {
                        // 영업비 상세 데이터 (plData에서 추출)
                        const expenseDetail = plData?.current_month?.total?.expense_detail || {};
                        const expenseDetailPrev = plData?.current_month?.prev_month?.total?.expense_detail || {};
                        
                        console.log('당월 영업비 상세 렌더링:', {
                          expenseDetail,
                          expenseDetailKeys: Object.keys(expenseDetail),
                          other_detail: expenseDetail.other_detail
                        });
                        
                        // 상세 항목 정의
                        const expenseItems = [
                          { key: 'salary', label: '급여', color: 'red' },
                          { key: 'marketing', label: '마케팅비', color: 'red' },
                          { key: 'fee', label: '지급수수료', color: 'green' },
                          { key: 'rent', label: '임차료', color: 'green' },
                          { key: 'insurance', label: '보험료', color: 'red' },
                          { key: 'travel', label: '여비교통비', color: 'red' },
                          { key: 'other', label: '기타', color: 'gray' }
                        ];
                        
                        // 데이터가 있는지 확인
                        const hasData = expenseItems.some(item => (expenseDetail as any)[item.key] !== undefined);
                        
                        if (!hasData) {
                          // 데이터가 없으면 기본 구조만 표시
                          const otherDetailLabels: {[key: string]: string} = {
                            'depreciation': '감가상각비',
                            'duty_free': '면세점 직접비',
                            'govt_license': '정부세금 및 라이센스',
                            'logistics': '운반비',
                            'maintenance': '유지보수비',
                            'other_fee': '기타 수수료',
                            'rent_free': '임대료 면제/할인',
                            'retirement': '퇴직연금',
                            'supplies': '소모품비',
                            'transport': '운반비(기타)',
                            'uniform': '피복비(유니폼)',
                            'utilities': '수도광열비',
                            'var_rent': '매출연동 임대료',
                            'communication': '통신비',
                            'bonus': '최종지급금'
                          };
                          
                          return (
                            <div className="space-y-1">
                              {expenseItems.map((item) => {
                                console.log('expenseItems.map - item:', item.key, item);
                                const current = (expenseDetail as any)[item.key] || 0;
                                const previous = (expenseDetailPrev as any)[item.key] || 0;
                                // YOY 계산: previous가 0이 아니면 계산 (음수도 포함)
                                let yoy = 0;
                                let showYoy = false;
                                if (previous !== 0) {
                                  yoy = (current / previous) * 100;
                                  showYoy = true;
                                } else if (previous === 0 && current !== 0) {
                                  // 전년도가 0이고 현재가 0이 아니면 증가로 표시
                                  yoy = Infinity;
                                  showYoy = true;
                                }
                                const colorClass = yoy >= 100 ? 'text-red-600' : 'text-green-600';
                                
                                // 기타 항목인 경우 토글 기능 추가
                                if (item.key === 'other') {
                                  const otherDetail = expenseDetail.other_detail || {};
                                  const otherDetailPrev = expenseDetailPrev.other_detail || {};
                                  // otherDetail에 0보다 큰 값이 있는지 확인
                                  const hasOtherDetail = otherDetail && 
                                    Object.keys(otherDetail).length > 0 && 
                                    Object.values(otherDetail).some((val: any) => {
                                      const numVal = Number(val);
                                      return !isNaN(numVal) && numVal > 0;
                                    });
                                  
                                  // 디버깅 로그
                                  console.log('기타 항목 렌더링:', { 
                                    itemKey: item.key,
                                    hasOtherDetail, 
                                    otherDetailKeys: Object.keys(otherDetail),
                                    otherDetailValues: Object.values(otherDetail),
                                    showOtherDetail,
                                    otherDetail
                                  });
                                  
                                  return (
                                    <div key={item.key}>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('기타 토글 클릭:', { 
                                            showOtherDetail, 
                                            hasOtherDetail, 
                                            otherDetail,
                                            currentShowOtherDetail: showOtherDetail
                                          });
                                          setShowOtherDetail(!showOtherDetail);
                                        }}
                                        className="flex justify-between items-center w-full text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                      >
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="font-semibold flex items-center gap-1">
                                          {formatNumber(current)} 
                                          {showYoy && (
                                            <span className={colorClass}>
                                              ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                            </span>
                                          )}
                                          {hasOtherDetail ? (
                                            showOtherDetail ? (
                                              <ChevronDown className="w-3 h-3 text-gray-400" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 text-gray-400" />
                                            )
                                          ) : null}
                                        </span>
                                      </button>
                                      {showOtherDetail && hasOtherDetail && (
                                        <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                                          {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                            if (value === 0) return null;
                                            const prevValue = (otherDetailPrev as any)[key] || 0;
                                            let detailYoy = 0;
                                            let showDetailYoy = false;
                                            if (prevValue !== 0) {
                                              detailYoy = (value / prevValue) * 100;
                                              showDetailYoy = true;
                                            } else if (prevValue === 0 && value !== 0) {
                                              detailYoy = Infinity;
                                              showDetailYoy = true;
                                            }
                                            const detailColorClass = detailYoy >= 100 ? 'text-red-600' : 'text-green-600';
                                            
                                            return (
                                              <div key={key} className="flex justify-between text-[10px]">
                                                <span className="text-gray-500">{otherDetailLabels[key] || key}</span>
                                                <span className="font-semibold">
                                                  {formatNumber(value)}
                                                  {showDetailYoy && (
                                                    <span className={`ml-1 ${detailColorClass}`}>
                                                      ({detailYoy === Infinity ? '신규' : formatPercent(detailYoy)}%)
                                                    </span>
                                                  )}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={item.key} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-semibold">
                                      {formatNumber(current)} 
                                      {showYoy && (
                                        <span className={`ml-1 ${colorClass}`}>
                                          ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        
                        // 데이터가 있으면 실제 값 표시
                        return (
                          <div className="space-y-1">
                            {expenseItems.map((item) => {
                              console.log('expenseItems.map (hasData=true) - item:', item.key, item);
                              const current = (expenseDetail as any)[item.key] || 0;
                              const previous = (expenseDetailPrev as any)[item.key] || 0;
                              const yoy = previous > 0 ? ((current / previous) * 100) : 0;
                              const colorClass = yoy >= 100 ? 'text-red-600' : 'text-green-600';
                              
                              // 기타 항목인 경우 토글 기능 추가
                              if (item.key === 'other') {
                                console.log('기타 항목 처리 시작:', { itemKey: item.key, current, previous });
                                const otherDetail = expenseDetail.other_detail || {};
                                const otherDetailPrev = expenseDetailPrev.other_detail || {};
                                const hasOtherDetail = otherDetail && 
                                  Object.keys(otherDetail).length > 0 && 
                                  Object.values(otherDetail).some((val: any) => {
                                    const numVal = Number(val);
                                    return !isNaN(numVal) && numVal > 0;
                                  });
                                
                                console.log('기타 항목 렌더링 (hasData=true):', { 
                                  hasOtherDetail, 
                                  otherDetailKeys: Object.keys(otherDetail),
                                  otherDetailValues: Object.values(otherDetail),
                                  showOtherDetail,
                                  otherDetail
                                });
                                
                                return (
                                  <div key={item.key}>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('기타 토글 클릭 (hasData=true):', { 
                                          showOtherDetail, 
                                          hasOtherDetail, 
                                          otherDetail,
                                          currentShowOtherDetail: showOtherDetail
                                        });
                                        setShowOtherDetail(!showOtherDetail);
                                      }}
                                      className="flex justify-between items-center w-full text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                    >
                                      <span className="text-gray-600">{item.label}</span>
                                      <span className="font-semibold flex items-center gap-1">
                                        {formatNumber(current)} 
                                        {yoy > 0 && (
                                          <span className={colorClass}>
                                            ({formatPercent(yoy)}%)
                                          </span>
                                        )}
                                        {hasOtherDetail ? (
                                          showOtherDetail ? (
                                            <ChevronDown className="w-3 h-3 text-gray-400" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3 text-gray-400" />
                                          )
                                        ) : null}
                                      </span>
                                    </button>
                                    {showOtherDetail && hasOtherDetail && (
                                      <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                                        {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                          if (value === 0) return null;
                                          const prevValue = (otherDetailPrev as any)[key] || 0;
                                          const detailYoy = prevValue > 0 ? ((value / prevValue) * 100) : 0;
                                          const detailColorClass = detailYoy >= 100 ? 'text-red-600' : 'text-green-600';
                                          
                                          const otherDetailLabels: {[key: string]: string} = {
                                            'depreciation': '감가상각비',
                                            'duty_free': '면세점 직접비',
                                            'govt_license': '정부세금 및 라이센스',
                                            'logistics': '운반비',
                                            'maintenance': '유지보수비',
                                            'other_fee': '기타 수수료',
                                            'rent_free': '임대료 면제/할인',
                                            'retirement': '퇴직연금',
                                            'supplies': '소모품비',
                                            'transport': '운반비(기타)',
                                            'uniform': '피복비(유니폼)',
                                            'utilities': '수도광열비',
                                            'var_rent': '매출연동 임대료',
                                            'communication': '통신비',
                                            'bonus': '최종지급금'
                                          };
                                          
                                          return (
                                            <div key={key} className="flex justify-between text-[10px]">
                                              <span className="text-gray-500">{otherDetailLabels[key] || key}</span>
                                              <span className="font-semibold">
                                                {formatNumber(value)}
                                                {prevValue > 0 && (
                                                  <span className={`ml-1 ${detailColorClass}`}>
                                                    ({formatPercent(detailYoy)}%)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={item.key} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{item.label}</span>
                                  <span className="font-semibold">
                                    {formatNumber(current)} 
                                    {yoy > 0 && (
                                      <span className={`ml-1 ${colorClass}`}>
                                        ({formatPercent(yoy)}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {formatNumber(plData?.cumulative?.total?.sg_a || 0)}
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}%</span> | 
                    <span className="text-blue-600"> 영업비율 {formatPercent(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  
                  {/* 영업비 상세보기 */}
                  <div className="border-t pt-3">
                    <button 
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>영업비 상세보기</span>
                      {showExpenseDetail ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showExpenseDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {(() => {
                        // 누적 영업비 상세 데이터
                        const expenseDetail = plData?.cumulative?.total?.expense_detail || {};
                        const expenseDetailPrev = plData?.cumulative?.prev_cumulative?.total?.expense_detail || {};
                        
                        // 상세 항목 정의
                        const expenseItems = [
                          { key: 'salary', label: '급여', color: 'red' },
                          { key: 'marketing', label: '마케팅비', color: 'red' },
                          { key: 'fee', label: '지급수수료', color: 'green' },
                          { key: 'rent', label: '임차료', color: 'green' },
                          { key: 'insurance', label: '보험료', color: 'red' },
                          { key: 'travel', label: '여비교통비', color: 'red' },
                          { key: 'other', label: '기타', color: 'gray' }
                        ];
                        
                        const otherDetailLabels: {[key: string]: string} = {
                          'depreciation': '감가상각비',
                          'duty_free': '면세점 직접비',
                          'govt_license': '정부세금 및 라이센스',
                          'logistics': '운반비',
                          'maintenance': '유지보수비',
                          'other_fee': '기타 수수료',
                          'rent_free': '임대료 면제/할인',
                          'retirement': '퇴직연금',
                          'supplies': '소모품비',
                          'transport': '운반비(기타)',
                          'uniform': '피복비(유니폼)',
                          'utilities': '수도광열비',
                          'var_rent': '매출연동 임대료',
                          'communication': '통신비',
                          'bonus': '최종지급금'
                        };
                        
                        return (
                          <div className="space-y-1">
                            {expenseItems.map((item) => {
                              const current = (expenseDetail as any)[item.key] || 0;
                              const previous = (expenseDetailPrev as any)[item.key] || 0;
                              // YOY 계산: previous가 0이 아니면 계산 (음수도 포함)
                              let yoy = 0;
                              let showYoy = false;
                              if (previous !== 0) {
                                yoy = (current / previous) * 100;
                                showYoy = true;
                              } else if (previous === 0 && current !== 0) {
                                // 전년도가 0이고 현재가 0이 아니면 증가로 표시
                                yoy = Infinity;
                                showYoy = true;
                              }
                              const colorClass = yoy >= 100 ? 'text-red-600' : 'text-green-600';
                              
                              // 기타 항목인 경우 토글 기능 추가
                              if (item.key === 'other') {
                                const otherDetail = expenseDetail.other_detail || {};
                                const otherDetailPrev = expenseDetailPrev.other_detail || {};
                                
                                return (
                                  <div key={item.key}>
                                    <button
                                      onClick={() => setShowOtherDetailCumulative(!showOtherDetailCumulative)}
                                      className="flex justify-between items-center w-full text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                    >
                                      <span className="text-gray-600">{item.label}</span>
                                      <span className="font-semibold flex items-center gap-1">
                                        {formatNumber(current)} 
                                        {showYoy && (
                                          <span className={colorClass}>
                                            ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                          </span>
                                        )}
                                        {showOtherDetailCumulative ? (
                                          <ChevronDown className="w-3 h-3 text-gray-400" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 text-gray-400" />
                                        )}
                                      </span>
                                    </button>
                                    {(showOtherDetailCumulative && otherDetail && Object.keys(otherDetail).length > 0) && (
                                      <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                                        {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                          if (value === 0) return null;
                                          const prevValue = (otherDetailPrev as any)[key] || 0;
                                          let detailYoy = 0;
                                          let showDetailYoy = false;
                                          if (prevValue !== 0) {
                                            detailYoy = (value / prevValue) * 100;
                                            showDetailYoy = true;
                                          } else if (prevValue === 0 && value !== 0) {
                                            detailYoy = Infinity;
                                            showDetailYoy = true;
                                          }
                                          const detailColorClass = detailYoy >= 100 ? 'text-red-600' : 'text-green-600';
                                          
                                          return (
                                            <div key={key} className="flex justify-between text-[10px]">
                                              <span className="text-gray-500">{otherDetailLabels[key] || key}</span>
                                              <span className="font-semibold">
                                                {formatNumber(value)}
                                                {showDetailYoy && (
                                                  <span className={`ml-1 ${detailColorClass}`}>
                                                    ({detailYoy === Infinity ? '신규' : formatPercent(detailYoy)}%)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={item.key} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{item.label}</span>
                                  <span className="font-semibold">
                                    {formatNumber(current)} 
                                    {showYoy && (
                                      <span className={`ml-1 ${colorClass}`}>
                                        ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 할인율 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏷️</span>
                <h3 className="text-sm font-semibold text-gray-600">할인율</h3>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {formatPercent(pl?.discount_rate || 0)}%
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatPercent((plData?.current_month?.prev_month?.total as any)?.discount_rate || 0)}%</span> | 
                <span className="text-green-600"> 전년비 {formatPercent((pl?.discount_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.discount_rate || 0))}%p</span>
              </div>
              
              {/* 할인 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowDiscountDetail(!showDiscountDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 할인율</span>
                  {showDiscountDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showDiscountDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK (홍콩)</span>
                    <span className="font-semibold text-purple-600">
                      {formatPercent(plData?.current_month?.hk?.discount_rate || 0)}%
                      <span className="text-gray-500"> (전년비 {formatPercent((plData?.current_month?.hk?.discount_rate || 0) - (plData?.current_month?.prev_month?.hk?.discount_rate || 0))}%p)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">
                      {formatPercent(plData?.current_month?.hk?.discount_rate || 0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">
                      {formatPercent(plData?.current_month?.hk?.discount_rate || 0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold">
                      {formatPercent(plData?.current_month?.hk?.discount_rate || 0)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-3 pt-2 border-t">
                    <span className="text-gray-700">MC (마카오)</span>
                    <span className="text-purple-600">
                      {formatPercent(plData?.current_month?.mc?.discount_rate || 0)}%
                      <span className="text-gray-500"> (전년비 {formatPercent((plData?.current_month?.mc?.discount_rate || 0) - (plData?.current_month?.prev_month?.mc?.discount_rate || 0))}%p)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">
                      {formatPercent(plData?.current_month?.mc?.discount_rate || 0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">
                      {formatPercent(plData?.current_month?.mc?.discount_rate || 0)}%
                    </span>
                  </div>
                  
                  {/* 할인 금액 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">할인 금액 (1K HKD)</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">당월 할인</span>
                      <span className="font-semibold text-purple-600">
                        {formatNumber(pl?.discount || 0)}K
                        <span className="text-green-600"> (YOY {formatPercent(plYoy?.discount || 0)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">누적 할인</span>
                      <span className="font-semibold text-purple-600">
                        {formatNumber((plData?.cumulative?.total as any)?.discount || 0)}K
                        <span className="text-gray-500"> (전년비 {formatPercent((plData?.cumulative?.total?.discount_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.discount_rate || 0))}%p)</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 매장효율성 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏪</span>
                <h3 className="text-sm font-semibold text-gray-600">매장효율성</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(offlineEfficiency?.total?.current?.sales_per_store)}
              </div>
              <div className="text-sm text-green-600 font-semibold mb-3">
                YOY {formatPercent(offlineEfficiency?.total?.yoy)}% 
                (전년 {formatNumber(offlineEfficiency?.total?.previous?.sales_per_store)})
              </div>
              <div className="text-xs text-gray-600 mb-3">
                매장수: {offlineEfficiency?.total?.current?.store_count || 0}개 
                (전년 {offlineEfficiency?.total?.previous?.store_count || 0}개)
              </div>
              
              {/* 매장효율성 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowStoreDetail(!showStoreDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 효율성</span>
                  {showStoreDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showStoreDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {Object.entries(offlineEfficiency?.by_channel || {}).map(([key, channel]: [string, any]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          {channel?.country === 'HK' ? 'HK' : 'MC'} {channel?.channel}
                        </span>
                        <span className="font-semibold">
                          {formatNumber(channel?.current?.sales_per_store)} 
                          <span className={(channel?.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({formatPercent(channel?.yoy || 0)}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* 계산근거 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-indigo-50 rounded p-2">
                      <div className="text-xs font-semibold text-indigo-800 mb-1">📌 계산근거</div>
                      <div className="text-xs text-indigo-700 space-y-0.5">
                        <div>• <span className="font-semibold">당월:</span> M08, M20, M05, M12 제외</div>
                        <div className="pl-4 text-xs">- M05 (LCX): 리뉴얼 10/13-11/7</div>
                        <div className="pl-4 text-xs">- M12 (WTC): 10/11 영업종료</div>
                        <div className="pl-4 text-xs">- M08, M20: 종료매장</div>
                        <div>• <span className="font-semibold">전년 동월:</span> 모든 매장 포함 (M08, M20 포함)</div>
                        <div>• <span className="font-semibold">온라인 채널:</span> 제외 (오프라인 매장 효율성)</div>
                        <div>• <span className="font-semibold">계산식:</span> 오프라인 실판매출 ÷ 오프라인 매장수</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 두 번째 줄: 5개 카드 추가 */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            {/* 당시즌 판매 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📈</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매 (25F 의류)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(seasonSales?.current_season_f?.october?.total_net_sales || 0)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatNumber(seasonSales?.previous_season_f?.october?.total_net_sales || 0)}</span> | 
                <span className="text-green-600"> YOY {formatPercent(((seasonSales?.current_season_f?.october?.total_net_sales || 0) / (seasonSales?.previous_season_f?.october?.total_net_sales || 1)) * 100)}%</span>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowSeasonSalesDetail(!showSeasonSalesDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>카테고리별 판매금액 TOP 5</span>
                  {showSeasonSalesDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showSeasonSalesDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {(seasonSales?.current_season_f?.october?.subcategory_top5 || []).map((item: any, idx: number) => {
                      const prevItem = seasonSales?.previous_season_f?.october?.subcategory_top5?.find((p: any) => p.subcategory_code === item.subcategory_code);
                      const yoy = prevItem ? ((item.net_sales / prevItem.net_sales) * 100) : 999;
                      return (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-600">{item.subcategory_code}</span>
                          <span className="font-semibold">
                            {formatNumber(item.net_sales)} 
                            <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(yoy)}%)</span>
                          </span>
                        </div>
                      );
                    })}
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      * 판매금액 YOY
                    </div>
                  </div>
                  
                  {/* 25S 참고 */}
                  <div className="mt-3 pt-3 border-t bg-gray-50 rounded p-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">📊 참고: 25S 성과</div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">판매금액</span>
                      <span className="font-semibold text-blue-600">
                        {formatNumber(seasonSales?.current_season_s?.accumulated?.total_net_sales || 0)} 
                        <span className="text-gray-500"> (YOY {formatPercent(((seasonSales?.current_season_s?.accumulated?.total_net_sales || 0) / (seasonSales?.previous_season_s?.accumulated?.total_net_sales || 1)) * 100)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">입고금액</span>
                      <span className="font-semibold text-blue-600">
                        {formatNumber(seasonSales?.current_season_f?.accumulated?.net_acp_p || 0)} 
                        <span className="text-gray-500"> (YOY {formatPercent(seasonSales?.current_season_f?.accumulated?.net_acp_p_yoy || 0)}%)</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 당시즌 판매율(25F) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🎯</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매율 (25F)</h3>
              </div>
              
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                {formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate || 0)}%
              </div>
              <div className="text-sm font-semibold text-green-600 mb-3">
                (전년비 +{formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0)}%p)
              </div>
              
              {/* 시각적 표현 개선 */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">입고</span>
                  <span className="text-sm font-bold text-red-600">
                    {formatNumber(seasonSales?.current_season_f?.accumulated?.net_acp_p || 0)} 
                    ({formatPercent(seasonSales?.current_season_f?.accumulated?.net_acp_p_yoy || 0)}%) 🔽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">판매금액</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatNumber(seasonSales?.current_season_f?.accumulated?.ac_sales_gross || 0)} 
                    ({formatPercent(seasonSales?.current_season_f?.accumulated?.ac_sales_gross_yoy || 0)}%) ✓
                  </span>
                </div>
              </div>
              
              {/* 상세보기 토글 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowCurrentSeasonDetail(!showCurrentSeasonDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>상세 분석</span>
                  {showCurrentSeasonDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {showCurrentSeasonDetail && (
                <>
                  {/* 재고 경보 및 대응 전략 */}
                  <div className="mt-3 pt-3 border-t bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-3 border-2 border-orange-500">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="text-xs text-red-700 leading-tight space-y-1">
                          {(() => {
                            const subcategoryDetail = seasonSales?.current_season_f?.accumulated?.subcategory_detail || [];
                            const tsItem = subcategoryDetail.find((item: any) => item.subcategory_code === 'TS');
                            const ptItem = subcategoryDetail.find((item: any) => item.subcategory_code === 'PT');
                            return (
                              <>
                                {tsItem && (
                                  <div>
                                    • <span className="font-semibold">T/SHIRTS</span>: 판매율 {formatPercent(tsItem.sales_rate)}% 
                                    <span className="bg-red-300 px-1 rounded font-bold">재고일수 {formatNumber(tsItem.stock_days)}일</span>
                                  </div>
                                )}
                                {ptItem && (
                                  <div>
                                    • <span className="font-semibold">PANTS</span>: 판매율 {formatPercent(ptItem.sales_rate)}% 
                                    <span className="bg-orange-300 px-1 rounded font-bold">재고일수 {formatNumber(ptItem.stock_days)}일</span>
                                  </div>
                                )}
                                <div className="pt-1 border-t border-red-300">→ <span className="font-semibold">26SS 조기운영</span>으로 대응 (12월-1월 투입)</div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
              
                  {/* 카테고리별 입고/판매율 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">카테고리별 입고YOY/판매율</div>
                    <div className="space-y-1">
                      {(() => {
                        const subcategoryDetail = seasonSales?.current_season_f?.accumulated?.subcategory_detail || [];
                        // 입고 높은순으로 정렬
                        const sorted = [...subcategoryDetail].sort((a: any, b: any) => (b.net_acp_p || 0) - (a.net_acp_p || 0));
                        // 상위 5개만 표시
                        return sorted.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-600">{item.subcategory_code}</span>
                            <span className="font-semibold">
                              <span className={(item.net_acp_p_yoy || 0) < 80 ? 'text-red-600' : 'text-orange-600'}>{formatPercent(item.net_acp_p_yoy || 0)}%</span> / 
                              <span className={(item.sales_rate || 0) > 30 ? 'text-green-600' : 'text-red-600'}> {formatPercent(item.sales_rate || 0)}%</span>
                            </span>
                          </div>
                        ));
                      })()}
                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        * 입고YOY / 판매율 (입고 높은순)
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ACC 재고주수 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">ACC 재고주수</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatStockWeeks(accStock?.total?.current?.stock_weeks || 0)}주
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatStockWeeks(accStock?.total?.previous?.stock_weeks || 0)}주</span> | 
                <span className="text-green-600"> YOY △{formatStockWeeks((accStock?.total?.current?.stock_weeks || 0) - (accStock?.total?.previous?.stock_weeks || 0))}주</span>
              </div>
              
              <div className="bg-pink-50 rounded p-2 mb-3">
                <div className="text-xs text-pink-800">
                  <span className="font-semibold">📌 계산기준:</span> 직전 6개월간 누적매출 기준
                </div>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowAccInventoryDetail(!showAccInventoryDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>아이템별 재고주수</span>
                  {showAccInventoryDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showAccInventoryDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {(() => {
                      const categories = ['SHO', 'HEA', 'BAG'];
                      return categories.map((key) => {
                        const item = accStock?.by_category ? (accStock.by_category as any)[key] : undefined;
                        if (!item) return null;
                        return (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-gray-600">{item.category_name || key}</span>
                            <span className="font-semibold text-green-600">
                              {formatStockWeeks(item.current?.stock_weeks || 0)}주 
                              <span className="text-gray-500"> (△{formatStockWeeks((item.current?.stock_weeks || 0) - (item.previous?.stock_weeks || 0))}주)</span>
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* 당월 판매 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">당월 판매 (1K HKD)</div>
                    <div className="space-y-1">
                      {(() => {
                        const categories = ['SHO', 'HEA', 'BAG'];
                        return categories.map((key) => {
                          const item = accStock?.by_category ? (accStock.by_category as any)[key] : undefined;
                          const sales = accStock?.october_sales ? (accStock.october_sales as any)[key] : undefined;
                          if (!item || !sales) return null;
                          return (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-600">{item.category_name || key}</span>
                              <span className="font-semibold">
                                {formatNumber((sales.net_sales || 0) / 1000)} 
                                <span className={(sales.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(sales.yoy || 0)}%)</span>
                              </span>
                            </div>
                          );
                        });
                      })()}
                      <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                        <span className="text-gray-700">악세 합계</span>
                        <span className="text-indigo-600">
                          {formatNumber((() => {
                            const categories = ['SHO', 'HEA', 'BAG'];
                            return categories.reduce((sum, key) => sum + ((accStock?.october_sales ? ((accStock.october_sales as any)[key]?.net_sales || 0) : 0) / 1000), 0);
                          })())} 
                          <span className="text-red-600"> (84%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 기말재고 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-amber-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏭</span>
                <h3 className="text-sm font-semibold text-gray-600">기말재고 (TAG, 1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(endingInventory?.total?.current)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatNumber(endingInventory?.total?.previous)}</span> | 
                <span className="text-green-600"> YOY {formatPercent(endingInventory?.total?.yoy || 0)}%</span>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowEndInventoryDetail(!showEndInventoryDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>아이템별 기말재고</span>
                  {showEndInventoryDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showEndInventoryDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">당시즌 의류 (25F)</span>
                    <span className="font-semibold">
                      {formatNumber((endingInventory?.by_season?.['당시즌_의류']?.current?.stock_price || 0) / 1000)} 
                      <span className={(endingInventory?.by_season?.['당시즌_의류']?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(endingInventory?.by_season?.['당시즌_의류']?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">당시즌 SS (25S)</span>
                    <span className="font-semibold">
                      {formatNumber((endingInventory?.by_season?.['당시즌_SS']?.current?.stock_price || 0) / 1000)} 
                      <span className={(endingInventory?.by_season?.['당시즌_SS']?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(endingInventory?.by_season?.['당시즌_SS']?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 FW</span>
                    <span className="font-semibold">
                      {formatNumber((endingInventory?.by_season?.['과시즌_FW']?.current?.stock_price || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(endingInventory?.by_season?.['과시즌_FW']?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 SS</span>
                    <span className="font-semibold">
                      {formatNumber((endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(endingInventory?.by_season?.['과시즌_SS']?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">악세 합계</span>
                    <span className="font-semibold">
                      {formatNumber(((endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.BAG?.current?.stock_price || 0)) / 1000)} 
                      <span className="text-green-600"> ({formatPercent((((endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.BAG?.current?.stock_price || 0)) / 
                        ((endingInventory?.acc_by_category?.SHO?.previous?.stock_price || 1) + 
                        (endingInventory?.acc_by_category?.HEA?.previous?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.BAG?.previous?.stock_price || 0))) * 100)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">신발 (SHO)</span>
                    <span className="font-semibold">
                      {formatNumber((endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0) / 1000)} 
                      <span className="text-green-600"> ({formatPercent(endingInventory?.acc_by_category?.SHO?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">모자 (HEA)</span>
                    <span className="font-semibold">
                      {formatNumber((endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0) / 1000)} 
                      <span className="text-green-600"> ({formatPercent(endingInventory?.acc_by_category?.HEA?.yoy || 0)}%)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 과시즌 FW 재고 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">과시즌 FW 재고 (TAG, 1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatNumber(pastSeasonFW?.total?.current || 0)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatNumber(pastSeasonFW?.total?.previous || 0)}</span> | 
                <span className="text-red-600"> YOY {formatPercent(pastSeasonFW?.total?.yoy || 0)}% 🔴</span>
              </div>
              
              {/* 재고 시즌별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowPastSeasonDetail(!showPastSeasonDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>시즌별 재고</span>
                  {showPastSeasonDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showPastSeasonDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">1년차 (24FW)</span>
                      <span className="font-semibold">
                        {formatNumber((pastSeasonFW?.by_year?.['1년차']?.current?.stock_price || 0) / 1000)} 
                        <span className="text-green-600"> ({formatPercent(pastSeasonFW?.by_year?.['1년차']?.yoy || 0)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">2년차 (23FW)</span>
                      <span className="font-semibold">
                        {formatNumber((pastSeasonFW?.by_year?.['2년차']?.current?.stock_price || 0) / 1000)} 
                        <span className="text-red-600"> ({formatPercent(pastSeasonFW?.by_year?.['2년차']?.yoy || 0)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">3년차 이상 (22FW~)</span>
                      <span className="font-semibold">
                        {formatNumber((pastSeasonFW?.by_year?.['3년차_이상']?.current?.stock_price || 0) / 1000)} 
                        <span className="text-red-600"> (+{formatNumber((pastSeasonFW?.by_year?.['3년차_이상']?.change || 0) / 1000)})</span>
                      </span>
                    </div>
                  </div>
              
                  {/* 핵심 인사이트 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-red-50 rounded p-2">
                      <div className="text-xs font-semibold text-red-800 mb-2">⚠️ 25년 1년차 과시즌재고</div>
                      <div className="text-xs text-red-700 space-y-1">
                        {pastSeasonFW?.['1year_subcategory']?.MT && (
                          <div className="flex justify-between items-center">
                            <span>• SWEAT SHIRTS (MT)</span>
                            <span className="font-semibold text-red-600">
                              YOY {formatPercent(pastSeasonFW['1year_subcategory'].MT.yoy)}% 
                              (당월 {formatNumber(pastSeasonFW['1year_subcategory'].MT.current.stock_price / 1000)}K, 
                              전년 {formatNumber(pastSeasonFW['1year_subcategory'].MT.previous.stock_price / 1000)}K)
                            </span>
                          </div>
                        )}
                        {pastSeasonFW?.['1year_subcategory']?.JP && (
                          <div className="flex justify-between items-center">
                            <span>• JUMPER (JP)</span>
                            <span className="font-semibold text-red-600">
                              YOY {formatPercent(pastSeasonFW['1year_subcategory'].JP.yoy)}% 
                              (당월 {formatNumber(pastSeasonFW['1year_subcategory'].JP.current.stock_price / 1000)}K, 
                              전년 {formatNumber(pastSeasonFW['1year_subcategory'].JP.previous.stock_price / 1000)}K)
                            </span>
                          </div>
                        )}
                        {pastSeasonFW?.['1year_subcategory']?.KC && (
                          <div className="flex justify-between items-center">
                            <span>• Knit Cardigan (KC)</span>
                            <span className="font-semibold text-red-600">
                              YOY {formatPercent(pastSeasonFW['1year_subcategory'].KC.yoy)}% 
                              (당월 {formatNumber(pastSeasonFW['1year_subcategory'].KC.current.stock_price / 1000)}K, 
                              전년 {formatNumber(pastSeasonFW['1year_subcategory'].KC.previous.stock_price / 1000)}K)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 손익요약 */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            손익요약 (단위: 1K HKD)
          </h3>
          
          {/* 요약 박스 */}
          <div className="space-y-2 mb-4">
            <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                <strong>당월:</strong> 영업손실 {formatNumber(Math.abs(pl?.operating_profit || 0))}K HKD, 영업이익률 {formatPercent(pl?.operating_profit_rate || 0)}%
              </p>
              <p className="text-xs text-gray-700">
                적자 악화 원인: ① 매출 YOY {formatPercent(plYoy?.net_sales || 0)}% (MC 오프라인 YOY {formatPercent((plData?.current_month?.mc?.net_sales || 0) / (plData?.current_month?.prev_month?.mc?.net_sales || 1) * 100)}%) ② 영업비 YOY {formatPercent(plYoy?.sg_a || 0)}% (+{formatNumber(plChange?.sg_a || 0)}K) ③ 직접이익 YOY {formatPercent(plYoy?.direct_profit || 0)}% (직접이익률 {formatPercent(pl?.direct_profit_rate || 0, 1)}% → {formatPercent((plData?.current_month?.prev_month?.total as any)?.direct_profit_rate || 0, 1)}%)
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                <strong>누적:</strong> 영업손실 {formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))}K HKD, 영업이익률 {formatPercent(plData?.cumulative?.total?.operating_profit_rate || 0)}%
              </p>
              <p className="text-xs text-gray-700">
                적자 지속: ① 매출 YOY {formatPercent(plData?.cumulative?.yoy?.net_sales || 0)}% (전년비 △{formatNumber(plData?.cumulative?.change?.net_sales || 0)}K) ② 영업비 YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}% (+{formatNumber(plData?.cumulative?.change?.sg_a || 0)}K) ③ 직접이익 YOY {formatPercent(plData?.cumulative?.yoy?.direct_profit || 0)}% (직접이익률 {formatPercent(plData?.cumulative?.total?.direct_profit_rate || 0)}% → {formatPercent((plData?.cumulative?.prev_cumulative?.total as any)?.direct_profit_rate || 0)}%)
              </p>
            </div>
          </div>

          {/* 상세 테이블 */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left p-2 font-semibold border-r border-gray-300">항목</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300">당월</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300">당월 전년비</th>
                  <th className="text-center p-2 font-semibold border-r border-gray-300">YOY</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300">누적</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300">누적 전년비</th>
                  <th className="text-center p-2 font-semibold">누적 YOY</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="p-1 border-r border-gray-300"></th>
                  <th className="p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center border-r border-gray-300"></th>
                  <th className="p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {/* TAG */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">TAG</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.tag_sales || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.tag_sales || 0) - (plData?.current_month?.prev_month?.hk?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.tag_sales || 0) - (plData?.current_month?.prev_month?.mc?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.tag_sales || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.tag_sales || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.tag_sales || 0)}</td>
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.tag_sales || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.mc?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.tag_sales || 0)}%</td>
                </tr>
                {/* 실판 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">실판</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.net_sales || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.net_sales || 0) - (plData?.current_month?.prev_month?.hk?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.net_sales || 0) - (plData?.current_month?.prev_month?.mc?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.net_sales || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.net_sales || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.net_sales || 0)}</td>
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.net_sales || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.mc?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.net_sales || 0)}%</td>
                </tr>
                {/* 할인율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">할인율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.discount_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.discount_rate || 0) - (plData?.current_month?.prev_month?.hk?.discount_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.discount_rate || 0) - (plData?.current_month?.prev_month?.mc?.discount_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.total?.discount_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.discount_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.discount_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.discount_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.discount_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.discount_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.discount_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.discount_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.discount_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* (Tag 원가율) */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">(Tag 원가율)</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.cogs_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.cogs_rate || 0) - (plData?.current_month?.prev_month?.hk?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.cogs_rate || 0) - (plData?.current_month?.prev_month?.mc?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.total?.cogs_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.cogs_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.cogs_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.cogs_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.cogs_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 매출총이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.gross_profit || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.gross_profit || 0) - (plData?.current_month?.prev_month?.hk?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.gross_profit || 0) - (plData?.current_month?.prev_month?.mc?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.gross_profit || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.gross_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.gross_profit || 0)}</td>
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.gross_profit || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.gross_profit || 0)}%</td>
                </tr>
                {/* 매출총이익률 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익률</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.gross_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.gross_profit_rate || 0) - (plData?.current_month?.prev_month?.hk?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.gross_profit_rate || 0) - (plData?.current_month?.prev_month?.mc?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.total?.gross_profit_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.gross_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.gross_profit_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 직접비 합계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접비 합계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_cost || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.direct_cost || 0) - (plData?.current_month?.prev_month?.hk?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.direct_cost || 0) - (plData?.current_month?.prev_month?.mc?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.direct_cost || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.direct_cost || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_cost || 0)}</td>
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.direct_cost || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.direct_cost || 0)}%</td>
                </tr>
                {/* 직접이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_profit || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.direct_profit || 0) - (plData?.current_month?.prev_month?.hk?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.direct_profit || 0) - (plData?.current_month?.prev_month?.mc?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.direct_profit || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.direct_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_profit || 0)}</td>
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.direct_profit || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.direct_profit || 0)}%</td>
                </tr>
                {/* 직접이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.direct_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.direct_profit_rate || 0) - (plData?.current_month?.prev_month?.hk?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.direct_profit_rate || 0) - (plData?.current_month?.prev_month?.mc?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.total?.direct_profit_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.direct_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.direct_profit_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 영업비 소계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업비 소계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(pl?.sg_a || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.sg_a || 0) - (plData?.current_month?.prev_month?.hk?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.sg_a || 0) - (plData?.current_month?.prev_month?.mc?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.sg_a || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.sg_a || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.sg_a || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.hk?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.mc?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.sg_a || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.sg_a || 0)}%</td>
                </tr>
                {/* 영업이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익</td>
                  <td className="p-2 text-right border-r border-gray-300">({formatNumber(Math.abs(plData?.current_month?.hk?.operating_profit || 0))})</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.operating_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">({formatNumber(Math.abs(plData?.current_month?.total?.operating_profit || 0))})</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.operating_profit || 0) - (plData?.current_month?.prev_month?.hk?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.operating_profit || 0) - (plData?.current_month?.prev_month?.mc?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plChange?.operating_profit || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300 text-red-600">적자악화</td>
                  <td className="p-2 text-right border-r border-gray-300">({formatNumber(Math.abs(plData?.cumulative?.hk?.operating_profit || 0))})</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.operating_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">({formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))})</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange(plData?.cumulative?.change?.operating_profit || 0);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right text-red-600">적자전환</td>
                </tr>
                {/* 영업이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.operating_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.operating_profit_rate || 0) - (plData?.current_month?.prev_month?.hk?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.operating_profit_rate || 0) - (plData?.current_month?.prev_month?.mc?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.total?.operating_profit_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.operating_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.total?.operating_profit_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 월별 추세 그래프 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* 월별 채널별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            2025년 채널별 실판매출 추세 (1K HKD)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={(dashboardData?.monthly_channel_data || []).map((item: any) => ({
                month: `${item.period.slice(2, 4)}월`,
                'HK Retail': Math.round((item.HK_Retail || 0) / 1000),
                'HK Outlet': Math.round((item.HK_Outlet || 0) / 1000),
                'HK Online': Math.round((item.HK_Online || 0) / 1000),
                'MC Retail': Math.round((item.MC_Retail || 0) / 1000),
                'MC Outlet': Math.round((item.MC_Outlet || 0) / 1000),
                total: Math.round((item.total || 0) / 1000)
              }))} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const channelName = data.activePayload[0].dataKey;
                  setSelectedChannel(selectedChannel === channelName ? null : channelName);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 50000]} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip 
                formatter={(value: any, name: string) => [`${Math.round(value).toLocaleString()}K HKD`, name]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="HK Retail" stackId="a" fill="#93C5FD">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const hkRetail = (item.HK_Retail || 0) / 1000;
                  const pct = total > 0 ? ((hkRetail / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-hk-retail-${index}`} 
                      x={47 + index * 94} 
                      y={140 + (index % 2) * 15} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="HK Outlet" stackId="a" fill="#C4B5FD">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const hkOutlet = (item.HK_Outlet || 0) / 1000;
                  const pct = total > 0 ? ((hkOutlet / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-hk-outlet-${index}`} 
                      x={47 + index * 94} 
                      y={215 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="HK Online" stackId="a" fill="#F9A8D4">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const hkOnline = (item.HK_Online || 0) / 1000;
                  const pct = total > 0 ? ((hkOnline / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-hk-online-${index}`} 
                      x={47 + index * 94} 
                      y={240 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="MC Retail" stackId="a" fill="#FCD34D">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const mcRetail = (item.MC_Retail || 0) / 1000;
                  const pct = total > 0 ? ((mcRetail / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-mc-retail-${index}`} 
                      x={47 + index * 94} 
                      y={265 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="MC Outlet" stackId="a" fill="#FCA5A5">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const mcOutlet = (item.MC_Outlet || 0) / 1000;
                  const pct = total > 0 ? ((mcOutlet / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-mc-outlet-${index}`} 
                      x={47 + index * 94} 
                      y={290 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* 채널 선택 버튼 */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', color: '#E5E7EB' },
              { name: 'HK Retail', color: '#93C5FD' },
              { name: 'HK Outlet', color: '#C4B5FD' },
              { name: 'HK Online', color: '#F9A8D4' },
              { name: 'MC Retail', color: '#FCD34D' },
              { name: 'MC Outlet', color: '#FCA5A5' },
            ].map((channel) => (
              <button
                key={channel.name}
                onClick={() => {
                  setSelectedChannel(selectedChannel === channel.name ? null : channel.name);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  selectedChannel === channel.name
                    ? 'ring-2 ring-blue-600 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: channel.color,
                  color: '#000000'
                }}
              >
                {channel.name}
              </button>
            ))}
          </div>
          
          {/* YOY 꺾은선 그래프 (채널 선택 시) */}
          {selectedChannel && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-gray-600">
                선택된 채널: {selectedChannel}
              </div>
              {selectedChannel === '전체' ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_channel_data || []).map((item: any, idx: number) => ({
                      month: `${item.period.slice(2, 4)}월`,
                      hkRetail: dashboardData?.monthly_channel_yoy?.['HK_Retail']?.[idx] || 0,
                      hkOutlet: dashboardData?.monthly_channel_yoy?.['HK_Outlet']?.[idx] || 0,
                      hkOnline: dashboardData?.monthly_channel_yoy?.['HK_Online']?.[idx] || 0,
                      mcRetail: dashboardData?.monthly_channel_yoy?.['MC_Retail']?.[idx] || 0,
                      mcOutlet: dashboardData?.monthly_channel_yoy?.['MC_Outlet']?.[idx] || 0,
                    }))} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="hkRetail" stroke="#93C5FD" strokeWidth={2} name="HK Retail" />
                    <Line type="monotone" dataKey="hkOutlet" stroke="#C4B5FD" strokeWidth={2} name="HK Outlet" />
                    <Line type="monotone" dataKey="hkOnline" stroke="#F9A8D4" strokeWidth={2} name="HK Online" />
                    <Line type="monotone" dataKey="mcRetail" stroke="#FCD34D" strokeWidth={2} name="MC Retail" />
                    <Line type="monotone" dataKey="mcOutlet" stroke="#FCA5A5" strokeWidth={2} name="MC Outlet" />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_channel_data || []).map((item: any, idx: number) => {
                      // 채널 이름을 언더스코어 형식으로 변환 (예: 'HK Retail' -> 'HK_Retail')
                      const channelKey = selectedChannel.replace(' ', '_');
                      return {
                        month: `${item.period.slice(2, 4)}월`,
                        yoy: dashboardData?.monthly_channel_yoy?.[channelKey]?.[idx] || 0
                      };
                    })} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="yoy" stroke="#3B82F6" strokeWidth={2} name={`${selectedChannel} YOY`} />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {/* YOY 테이블 */}
              <div className="mt-4">
                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-left font-semibold">{selectedChannel === '전체' ? '채널' : selectedChannel}</th>
                      {(dashboardData?.monthly_channel_data || []).map((item: any) => (
                        <th key={item.period} className="border border-gray-300 px-1 py-1 text-center font-semibold">{`${item.period.slice(2, 4)}월`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChannel === '전체' ? (
                      <>
                        {['HK Retail', 'HK Outlet', 'HK Online', 'MC Retail', 'MC Outlet'].map((channel) => {
                          const channelKey = channel.replace(' ', '_');
                          return (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">{channel}</td>
                              {(dashboardData?.monthly_channel_yoy?.[channelKey] || []).map((yoy: number, idx: number) => (
                                <td 
                                  key={idx} 
                                  className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {yoy}%
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">YOY</td>
                        {(dashboardData?.monthly_channel_yoy?.[selectedChannel.replace(' ', '_')] || []).map((yoy: number, idx: number) => (
                          <td 
                            key={idx} 
                            className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {yoy}%
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* 주요 인사이트 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            {selectedChannel === null || selectedChannel === '전체' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const totals = monthlyData.map((item: any) => Math.round((item.total || 0) / 1000));
                      const maxTotal = Math.max(...totals);
                      const minTotal = Math.min(...totals);
                      const maxMonth = monthlyData[totals.indexOf(maxTotal)]?.period?.slice(2, 4) || '';
                      const minMonth = monthlyData[totals.indexOf(minTotal)]?.period?.slice(2, 4) || '';
                      const latestTotal = totals[totals.length - 1] || 0;
                      const prevTotal = totals[totals.length - 2] || 0;
                      
                      return (
                        <>
                          <div>• {maxMonth}월 최대 {maxTotal.toLocaleString()}K</div>
                          <div>• {minMonth}월 최저 {minTotal.toLocaleString()}K</div>
                          {latestTotal > prevTotal ? (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 회복세</div>
                          ) : (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 하락세</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 채널 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latest = monthlyData[monthlyData.length - 1] || {};
                      const total = (latest.total || 0) / 1000;
                      const hkRetail = (latest.HK_Retail || 0) / 1000;
                      const hkOnline = (latest.HK_Online || 0) / 1000;
                      const mcRetail = (latest.MC_Retail || 0) / 1000;
                      
                      const hkRetailPct = total > 0 ? ((hkRetail / total) * 100).toFixed(1) : '0';
                      const hkOnlinePct = total > 0 ? ((hkOnline / total) * 100).toFixed(1) : '0';
                      const mcRetailPct = total > 0 ? ((mcRetail / total) * 100).toFixed(1) : '0';
                      
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const hkOnlineYoy = yoyData['HK_Online']?.[yoyData['HK_Online'].length - 1] || 0;
                      
                      return (
                        <>
                          <div>• HK Retail: 최대 비중 ({hkRetailPct}%)</div>
                          {hkOnlineYoy > 200 ? (
                            <div>• HK Online: 고성장 (YOY {hkOnlineYoy}%)</div>
                          ) : (
                            <div>• HK Online: 성장세 (YOY {hkOnlineYoy}%)</div>
                          )}
                          <div>• MC Retail: 안정적 기여 ({mcRetailPct}%)</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const hkOnlineYoy = yoyData['HK_Online']?.[yoyData['HK_Online'].length - 1] || 0;
                      const mcRetailYoy = yoyData['MC_Retail']?.[yoyData['MC_Retail'].length - 1] || 0;
                      
                      const insights = [];
                      if (hkOnlineYoy > 200) {
                        insights.push('• 온라인 채널 집중 육성');
                      }
                      if (mcRetailYoy < 100) {
                        insights.push('• MC 시장 회복 전략');
                      }
                      insights.push('• 채널별 차별화 전략');
                      
                      return insights.map((insight, idx) => <div key={idx}>{insight}</div>);
                    })()}
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Retail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Retail 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const hkRetailValues = monthlyData.map((item: any) => Math.round((item.HK_Retail || 0) / 1000));
                      const maxValue = Math.max(...hkRetailValues);
                      const maxMonth = monthlyData[hkRetailValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Retail'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].HK_Retail || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 최대 비중 채널 ({latestPct}%)</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% 수준</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Retail'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const firstYoy = yoyValues[0] || 0;
                      const midYoy = yoyValues.length > 5 ? yoyValues[5] : yoyValues[Math.floor(yoyValues.length / 2)] || 0;
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      
                      return (
                        <>
                          <div>• 1월 {firstYoy}% {firstYoy >= 100 ? '강한 출발' : '부진'}</div>
                          <div>• 중반기 {midYoy}% {midYoy >= 100 ? '회복세' : '부진'}</div>
                          <div>• 10월 {latestYoy}% {latestYoy >= 100 ? '회복세' : '하락세'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Retail'] || [];
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const avgYoy = yoyValues.length > 0 ? yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length : 0;
                      
                      const actions = [];
                      if (avgYoy < 100) {
                        actions.push('• 상반기 매출 회복 전략');
                      }
                      actions.push('• 주력 채널 강화 필요');
                      if (latestYoy >= 100) {
                        actions.push('• 모멘텀 지속화');
                      } else {
                        actions.push('• 하반기 회복 전략');
                      }
                      
                      return actions.map((action, idx) => <div key={idx}>{action}</div>);
                    })()}
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const hkOutletValues = monthlyData.map((item: any) => Math.round((item.HK_Outlet || 0) / 1000));
                      const maxValue = Math.max(...hkOutletValues);
                      const maxMonth = monthlyData[hkOutletValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Outlet'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].HK_Outlet || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 전체의 {latestPct}% 비중</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% 수준</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Outlet'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const firstYoy = yoyValues[0] || 0;
                      const secondYoy = yoyValues[1] || 0;
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const midYoy = yoyValues.length > 6 ? yoyValues[6] : yoyValues[Math.floor(yoyValues.length / 2)] || 0;
                      
                      return (
                        <>
                          <div>• 1월 {firstYoy}% {firstYoy >= 100 ? '양호' : '부진'}</div>
                          <div>• 2월 {secondYoy}% {secondYoy < 60 ? '급감' : '안정'}</div>
                          <div>• {yoyValues.length > 6 ? '7~8월' : '중반기'} {midYoy >= 100 ? `${midYoy}% 회복` : `${midYoy}% 부진`}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 소진 효율화</div>
                    <div>• 할인 전략 최적화</div>
                    <div>• 부진 원인 분석</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Online' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Online 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const hkOnlineValues = monthlyData.map((item: any) => Math.round((item.HK_Online || 0) / 1000));
                      const maxValue = Math.max(...hkOnlineValues);
                      const maxMonth = monthlyData[hkOnlineValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Online'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].HK_Online || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 비중 {latestPct}% 고성장</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% 폭발 성장</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Online'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const prevYoy = yoyValues.length > 1 ? yoyValues[yoyValues.length - 2] : 0;
                      const prevPrevYoy = yoyValues.length > 2 ? yoyValues[yoyValues.length - 3] : 0;
                      
                      return (
                        <>
                          {prevPrevYoy > 200 ? <div>• {yoyValues.length - 2}월 {prevPrevYoy}% 급성장</div> : null}
                          {prevYoy > 200 ? <div>• {yoyValues.length - 1}월 {prevYoy}% 지속</div> : null}
                          <div>• 10월 {latestYoy}% {latestYoy > 200 ? '역대 최고' : '성장세'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 온라인 투자 확대</div>
                    <div>• 성장 모멘텀 극대화</div>
                    <div>• 디지털 마케팅 강화</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'MC Retail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC Retail 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const mcRetailValues = monthlyData.map((item: any) => Math.round((item.MC_Retail || 0) / 1000));
                      const maxValue = Math.max(...mcRetailValues);
                      const maxMonth = monthlyData[mcRetailValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Retail'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].MC_Retail || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 전체의 {latestPct}% 비중</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% {avgYoy < 100 ? '부진' : '안정'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Retail'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const allBelow100 = yoyValues.every((y: number) => y < 100);
                      
                      return (
                        <>
                          {allBelow100 ? <div>• 연중 100% 미달</div> : null}
                          <div>• 10월 {latestYoy}% {latestYoy >= 100 ? '회복세' : '부진 지속'}</div>
                          <div>• 안정적 기여도 유지</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• MC 시장 회복 전략</div>
                    <div>• 지역별 맞춤 전략</div>
                    <div>• 매출 회복 프로그램</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'MC Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const mcOutletValues = monthlyData.map((item: any) => Math.round((item.MC_Outlet || 0) / 1000));
                      const maxValue = Math.max(...mcOutletValues);
                      const maxMonth = monthlyData[mcOutletValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Outlet'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].MC_Outlet || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 최소 비중 채널 ({latestPct}%)</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% {avgYoy >= 100 ? '양호' : '부진'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Outlet'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const firstYoy = yoyValues[0] || 0;
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      
                      return (
                        <>
                          <div>• 1월 {firstYoy}% {firstYoy >= 150 ? '강한 출발' : '부진'}</div>
                          <div>• 10월 {latestYoy}% {latestYoy >= 100 ? '회복세' : '하락세'}</div>
                          <div>• 변동성 큰 채널</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 관리 최적화</div>
                    <div>• 할인 전략 재검토</div>
                    <div>• 안정화 전략 수립</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        
        {/* 2025년 아이템별 추세 (1K HKD) */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              2025년 아이템별 실판매출 추세 (1K HKD)
            </h3>
            
            {/* 실판가/택가/할인율 토글 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setSalesPriceType('실판')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  salesPriceType === '실판'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                실판가
              </button>
              <button
                onClick={() => setSalesPriceType('택가')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  salesPriceType === '택가'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                택가
              </button>
              <button
                onClick={() => setSalesPriceType('할인율')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  salesPriceType === '할인율'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                할인율
              </button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            {salesPriceType === '할인율' ? (
              <LineChart 
                data={(dashboardData?.monthly_item_data || []).map((item: any) => {
                  const calculateDiscount = (gross: number, net: number) => {
                    if (gross === 0) return 0;
                    return ((gross - net) / gross * 100).toFixed(1);
                  };
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    '당시즌의류': parseFloat(calculateDiscount(item.당시즌의류.gross_sales, item.당시즌의류.net_sales)),
                    '과시즌의류': parseFloat(calculateDiscount(item.과시즌의류.gross_sales, item.과시즌의류.net_sales)),
                    '모자': parseFloat(calculateDiscount(item.모자.gross_sales, item.모자.net_sales)),
                    '신발': parseFloat(calculateDiscount(item.신발.gross_sales, item.신발.net_sales)),
                    '가방외': parseFloat(calculateDiscount(item.가방외.gross_sales, item.가방외.net_sales)),
                  };
                })} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 70]} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${value}%`, name]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                />
                <Line type="monotone" dataKey="당시즌의류" stroke="#34D399" strokeWidth={3} dot={{ r: 4 }} name="당시즌의류" />
                <Line type="monotone" dataKey="과시즌의류" stroke="#FCA5A5" strokeWidth={3} dot={{ r: 4 }} name="과시즌의류" />
                <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={3} dot={{ r: 4 }} name="모자" />
                <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} name="신발" />
                <Line type="monotone" dataKey="가방외" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} name="가방외" />
              </LineChart>
            ) : (
              <BarChart 
                data={(dashboardData?.monthly_item_data || []).map((item: any) => {
                  const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                  const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                  const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                  const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                  const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                  const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    '당시즌의류': 당시즌의류,
                    '과시즌의류': 과시즌의류,
                    '모자': 모자,
                    '신발': 신발,
                    '가방외': 가방외,
                    total: total
                  };
                })} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const itemName = data.activePayload[0].dataKey;
                    setSelectedItem(selectedItem === itemName ? null : itemName);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  domain={[0, 50000]} 
                  tickFormatter={(value) => value.toLocaleString()}
                  allowDecimals={false}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${Math.round(value).toLocaleString()}K HKD`, name]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="당시즌의류" stackId="a" fill="#34D399">
                  {(dashboardData?.monthly_item_data || []).map((item: any, index: number) => {
                    const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                    const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                    const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                    const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                    const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                    const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                    const pct = total > 0 ? ((당시즌의류 / total) * 100).toFixed(1) : '0.0';
                    return (
                      <text 
                        key={`label-당시즌의류-${index}`} 
                        x={47 + index * 94} 
                        y={140 + (index % 2) * 15} 
                        textAnchor="middle" 
                        fill="#000000" 
                        fontSize="9" 
                        fontWeight="700"
                      >
                        {pct}%
                      </text>
                    );
                  })}
                </Bar>
                <Bar dataKey="과시즌의류" stackId="a" fill="#FCA5A5">
                  {(dashboardData?.monthly_item_data || []).map((item: any, index: number) => {
                    const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                    const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                    const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                    const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                    const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                    const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                    const pct = total > 0 ? ((과시즌의류 / total) * 100).toFixed(1) : '0.0';
                    return (
                      <text 
                        key={`label-과시즌의류-${index}`} 
                        x={47 + index * 94} 
                        y={215 + (index % 2) * 3} 
                        textAnchor="middle" 
                        fill="#000000" 
                        fontSize="9" 
                        fontWeight="700"
                      >
                        {pct}%
                      </text>
                    );
                  })}
                </Bar>
                <Bar dataKey="모자" stackId="a" fill="#93C5FD">
                  {(dashboardData?.monthly_item_data || []).map((item: any, index: number) => {
                    const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                    const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                    const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                    const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                    const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                    const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                    const pct = total > 0 ? ((모자 / total) * 100).toFixed(1) : '0.0';
                    return (
                      <text 
                        key={`label-모자-${index}`} 
                        x={47 + index * 94} 
                        y={240 + (index % 2) * 3} 
                        textAnchor="middle" 
                        fill="#000000" 
                        fontSize="9" 
                        fontWeight="700"
                      >
                        {pct}%
                      </text>
                    );
                  })}
                </Bar>
                <Bar dataKey="신발" stackId="a" fill="#FCD34D">
                  {(dashboardData?.monthly_item_data || []).map((item: any, index: number) => {
                    const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                    const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                    const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                    const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                    const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                    const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                    const pct = total > 0 ? ((신발 / total) * 100).toFixed(1) : '0.0';
                    return (
                      <text 
                        key={`label-신발-${index}`} 
                        x={47 + index * 94} 
                        y={265 + (index % 2) * 3} 
                        textAnchor="middle" 
                        fill="#000000" 
                        fontSize="9" 
                        fontWeight="700"
                      >
                        {pct}%
                      </text>
                    );
                  })}
                </Bar>
                <Bar dataKey="가방외" stackId="a" fill="#C4B5FD">
                  {(dashboardData?.monthly_item_data || []).map((item: any, index: number) => {
                    const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                    const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                    const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                    const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                    const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                    const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                    const pct = total > 0 ? ((가방외 / total) * 100).toFixed(1) : '0.0';
                    return (
                      <text 
                        key={`label-가방외-${index}`} 
                        x={47 + index * 94} 
                        y={290 + (index % 2) * 3} 
                        textAnchor="middle" 
                        fill="#000000" 
                        fontSize="9" 
                        fontWeight="700"
                      >
                        {pct}%
                      </text>
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
          
          {/* 아이템 선택 버튼 */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', color: '#E5E7EB' },
              { name: '당시즌의류', color: '#34D399' },
              { name: '과시즌의류', color: '#FCA5A5' },
              { name: '모자', color: '#93C5FD' },
              { name: '신발', color: '#FCD34D' },
              { name: '가방외', color: '#C4B5FD' },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setSelectedItem(selectedItem === item.name ? null : item.name);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  selectedItem === item.name
                    ? 'ring-2 ring-orange-600 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: item.color,
                  color: '#000000'
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
          
          {/* YOY 꺾은선 그래프 (아이템 선택 시) */}
          {selectedItem && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-gray-600">
                선택된 아이템: {selectedItem}
              </div>
              {selectedItem === '전체' ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_item_data || []).map((item: any, idx: number) => ({
                      month: `${item.period.slice(2, 4)}월`,
                      당시즌의류: dashboardData?.monthly_item_yoy?.['당시즌의류']?.[idx] || 0,
                      과시즌의류: dashboardData?.monthly_item_yoy?.['과시즌의류']?.[idx] || 0,
                      모자: dashboardData?.monthly_item_yoy?.['모자']?.[idx] || 0,
                      신발: dashboardData?.monthly_item_yoy?.['신발']?.[idx] || 0,
                      가방외: dashboardData?.monthly_item_yoy?.['가방외']?.[idx] || 0,
                    }))} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="당시즌의류" stroke="#34D399" strokeWidth={2} name="당시즌의류" />
                    <Line type="monotone" dataKey="과시즌의류" stroke="#FCA5A5" strokeWidth={2} name="과시즌의류" />
                    <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={2} name="모자" />
                    <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={2} name="신발" />
                    <Line type="monotone" dataKey="가방외" stroke="#C4B5FD" strokeWidth={2} name="가방외" />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_item_data || []).map((item: any, idx: number) => ({
                      month: `${item.period.slice(2, 4)}월`,
                      yoy: dashboardData?.monthly_item_yoy?.[selectedItem]?.[idx] || 0
                    }))} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="yoy" stroke="#F59E0B" strokeWidth={2} name={`${selectedItem} YOY`} />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {/* YOY 테이블 */}
              <div className="mt-4">
                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-left font-semibold">{selectedItem === '전체' ? '아이템' : selectedItem}</th>
                      {(dashboardData?.monthly_item_data || []).map((item: any) => (
                        <th key={item.period} className="border border-gray-300 px-1 py-1 text-center font-semibold">{`${item.period.slice(2, 4)}월`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem === '전체' ? (
                      <>
                        {['당시즌의류', '과시즌의류', '모자', '신발', '가방외'].map((item) => (
                          <tr key={item}>
                            <td className="border border-gray-300 px-1 py-1 font-semibold bg-orange-50">{item}</td>
                            {(dashboardData?.monthly_item_yoy?.[item] || []).map((yoy: number, idx: number) => (
                              <td 
                                key={idx} 
                                className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {yoy}%
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold bg-orange-50">YOY</td>
                        {(dashboardData?.monthly_item_yoy?.[selectedItem] || []).map((yoy: number, idx: number) => (
                          <td 
                            key={idx} 
                            className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {yoy}%
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* 주요 인사이트 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            {selectedItem === null || selectedItem === '전체' ? (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-orange-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-orange-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const totals = monthlyData.map((item: any) => {
                        const 당시즌의류 = Math.round(salesPriceType === '실판' ? item.당시즌의류.net_sales : item.당시즌의류.gross_sales);
                        const 과시즌의류 = Math.round(salesPriceType === '실판' ? item.과시즌의류.net_sales : item.과시즌의류.gross_sales);
                        const 모자 = Math.round(salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales);
                        const 신발 = Math.round(salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales);
                        const 가방외 = Math.round(salesPriceType === '실판' ? item.가방외.net_sales : item.가방외.gross_sales);
                        return 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                      });
                      const maxTotal = Math.max(...totals);
                      const minTotal = Math.min(...totals);
                      const maxMonth = monthlyData[totals.indexOf(maxTotal)]?.period?.slice(2, 4) || '';
                      const minMonth = monthlyData[totals.indexOf(minTotal)]?.period?.slice(2, 4) || '';
                      const latestTotal = totals[totals.length - 1] || 0;
                      const prevTotal = totals[totals.length - 2] || 0;
                      
                      return (
                        <>
                          <div>• {maxMonth}월 최대 {maxTotal.toLocaleString()}K</div>
                          <div>• {minMonth}월 최저 {minTotal.toLocaleString()}K</div>
                          {latestTotal > prevTotal ? (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 회복세</div>
                          ) : (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 하락세</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 아이템 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latest = monthlyData[monthlyData.length - 1] || {};
                      const 당시즌의류 = Math.round(salesPriceType === '실판' ? latest.당시즌의류?.net_sales : latest.당시즌의류?.gross_sales) || 0;
                      const 과시즌의류 = Math.round(salesPriceType === '실판' ? latest.과시즌의류?.net_sales : latest.과시즌의류?.gross_sales) || 0;
                      const 모자 = Math.round(salesPriceType === '실판' ? latest.모자?.net_sales : latest.모자?.gross_sales) || 0;
                      const 신발 = Math.round(salesPriceType === '실판' ? latest.신발?.net_sales : latest.신발?.gross_sales) || 0;
                      const 가방외 = Math.round(salesPriceType === '실판' ? latest.가방외?.net_sales : latest.가방외?.gross_sales) || 0;
                      const total = 당시즌의류 + 과시즌의류 + 모자 + 신발 + 가방외;
                      
                      const 당시즌의류Pct = total > 0 ? ((당시즌의류 / total) * 100).toFixed(1) : '0';
                      const 모자Pct = total > 0 ? ((모자 / total) * 100).toFixed(1) : '0';
                      const 신발Pct = total > 0 ? ((신발 / total) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 당시즌의류: 최대 비중 ({당시즌의류Pct}%)</div>
                          <div>• 모자: 안정적 기여 ({모자Pct}%)</div>
                          <div>• 신발: 주요 아이템 ({신발Pct}%)</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 당시즌 의류 집중 육성</div>
                    <div>• 액세서리 라인 강화</div>
                    <div>• 아이템별 차별화 전략</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        
        {/* 월별 아이템별 재고 추세 그래프 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              2025년 월별 아이템별 재고 추세 (TAG, 1K HKD)
            </h3>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={(dashboardData?.monthly_inventory_data || []).map((item: any) => ({
                month: `${item.period.slice(2, 4)}월`,
                'F당시즌': Math.round(item.F당시즌?.stock_price || 0),
                'S당시즌': Math.round(item.S당시즌?.stock_price || 0),
                '과시즌FW': Math.round(item.과시즌FW?.stock_price || 0),
                '과시즌SS': Math.round(item.과시즌SS?.stock_price || 0),
                '모자': Math.round(item.모자?.stock_price || 0),
                '신발': Math.round(item.신발?.stock_price || 0),
                '가방외': Math.round(item.가방외?.stock_price || 0),
                // 재고주수는 레이블용으로만 저장
                '모자_weeks': item.모자?.stock_weeks || 0,
                '신발_weeks': item.신발?.stock_weeks || 0,
                '가방외_weeks': item.가방외?.stock_weeks || 0,
              }))} 
              margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis 
                tick={{ fontSize: 11 }} 
                domain={[0, 'dataMax']} 
                tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                allowDecimals={false}
                width={80}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name.includes('_weeks')) return null;
                  return [`${Math.round(value).toLocaleString()} HKD`, name];
                }}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="F당시즌" stackId="a" fill="#EF4444" />
              <Bar dataKey="S당시즌" stackId="a" fill="#34D399" />
              <Bar dataKey="과시즌FW" stackId="a" fill="#93C5FD" />
              <Bar dataKey="과시즌SS" stackId="a" fill="#60A5FA" />
              <Bar dataKey="모자" stackId="a" fill="#60A5FA" />
              <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
              <Bar dataKey="가방외" stackId="a" fill="#C4B5FD" />
              {/* 재고주수 레이블 - 맨 마지막에 렌더링하여 막대 위에 표시 */}
              <Layer>
                {(dashboardData?.monthly_inventory_data || []).map((item: any, index: number) => {
                  const chartData = (dashboardData?.monthly_inventory_data || []);
                  if (chartData.length === 0) return null;
                  
                  const mappedData = chartData.map((d: any) => ({
                    F당시즌: Math.round(d.F당시즌?.stock_price || 0),
                    S당시즌: Math.round(d.S당시즌?.stock_price || 0),
                    과시즌FW: Math.round(d.과시즌FW?.stock_price || 0),
                    과시즌SS: Math.round(d.과시즌SS?.stock_price || 0),
                    모자: Math.round(d.모자?.stock_price || 0),
                    신발: Math.round(d.신발?.stock_price || 0),
                    가방외: Math.round(d.가방외?.stock_price || 0),
                  }));
                  
                  const maxValue = Math.max(...mappedData.map((d: any) => 
                    d.F당시즌 + d.S당시즌 + d.과시즌FW + d.과시즌SS + d.모자 + d.신발 + d.가방외
                  ));
                  
                  const chartHeight = 205;
                  const marginTop = 40;
                  const yBase = marginTop + chartHeight;
                  
                  const 모자Weeks = item.모자?.stock_weeks || 0;
                  const 신발Weeks = item.신발?.stock_weeks || 0;
                  const 가방외Weeks = item.가방외?.stock_weeks || 0;
                  
                  if (!모자Weeks && !신발Weeks && !가방외Weeks) return null;
                  
                  const F당시즌 = mappedData[index].F당시즌;
                  const S당시즌 = mappedData[index].S당시즌;
                  const 과시즌FW = mappedData[index].과시즌FW;
                  const 과시즌SS = mappedData[index].과시즌SS;
                  const 모자 = mappedData[index].모자;
                  const 신발 = mappedData[index].신발;
                  const 가방외 = mappedData[index].가방외;
                  
                  const 누적_모자 = F당시즌 + S당시즌 + 과시즌FW + 과시즌SS + 모자;
                  const 누적_신발 = 누적_모자 + 신발;
                  const 누적_가방외 = 누적_신발 + 가방외;
                  
                  const 모자Y = yBase - (누적_모자 / maxValue * chartHeight) - 5;
                  const 신발Y = yBase - (누적_신발 / maxValue * chartHeight) - 5;
                  const 가방외Y = yBase - (누적_가방외 / maxValue * chartHeight) - 5;
                  
                  const barX = 47 + index * 94;
                  
                  return (
                    <g key={`labels-${index}`}>
                      {모자Weeks > 0 && (
                        <g>
                          {/* 흰색 배경 - 레이블이 막대 위에 보이도록 */}
                          <rect
                            x={barX - 12}
                            y={모자Y - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={모자Y} 
                            textAnchor="middle" 
                            fill="#000000" 
                            fontSize="9" 
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(모자Weeks)}주
                          </text>
                        </g>
                      )}
                      {신발Weeks > 0 && (
                        <g>
                          <rect
                            x={barX - 12}
                            y={신발Y - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={신발Y} 
                            textAnchor="middle" 
                            fill="#000000" 
                            fontSize="9" 
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(신발Weeks)}주
                          </text>
                        </g>
                      )}
                      {가방외Weeks > 0 && (
                        <g>
                          <rect
                            x={barX - 12}
                            y={가방외Y - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={가방외Y} 
                            textAnchor="middle" 
                            fill="#000000" 
                            fontSize="9" 
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(가방외Weeks)}주
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </Layer>
            </BarChart>
          </ResponsiveContainer>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#E5E7EB' },
                { name: 'F당시즌', color: '#EF4444' },
                { name: 'S당시즌', color: '#34D399' },
                { name: '과시즌FW', color: '#93C5FD' },
                { name: '과시즌SS', color: '#60A5FA' },
                { name: '모자', color: '#60A5FA' },
                { name: '신발', color: '#FCD34D' },
                { name: '가방외', color: '#C4B5FD' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedInventoryItem(selectedInventoryItem === item.name ? null : item.name);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedInventoryItem === item.name
                      ? 'ring-2 ring-purple-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#000000'
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {selectedInventoryItem && (
              <div className="mt-4">
                {(() => {
                  const months = (dashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                  const inventoryYOY = dashboardData?.monthly_inventory_yoy || {};
                  
                  if (selectedInventoryItem === '전체') {
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={months.map((month, idx) => ({
                          month,
                          fSeason: inventoryYOY['F당시즌']?.[idx] ?? null,
                          sSeason: inventoryYOY['S당시즌']?.[idx] ?? null,
                          pastFW: inventoryYOY['과시즌FW']?.[idx] ?? null,
                          pastSS: inventoryYOY['과시즌SS']?.[idx] ?? null,
                          cap: inventoryYOY['모자']?.[idx] ?? null,
                          shoes: inventoryYOY['신발']?.[idx] ?? null,
                          bagEtc: inventoryYOY['가방외']?.[idx] ?? null
                        }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            formatter={(value: any, name: string) => value !== null ? [`${value}%`, name] : ['N/A', name]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                          />
                          <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                          <Line type="monotone" dataKey="fSeason" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls name="F당시즌" />
                          <Line type="monotone" dataKey="sSeason" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="S당시즌" />
                          <Line type="monotone" dataKey="pastFW" stroke="#9CA3AF" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌FW" />
                          <Line type="monotone" dataKey="pastSS" stroke="#D1D5DB" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌SS" />
                          <Line type="monotone" dataKey="cap" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="모자" />
                          <Line type="monotone" dataKey="shoes" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} connectNulls name="신발" />
                          <Line type="monotone" dataKey="bagEtc" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} connectNulls name="가방외" />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  } else {
                    const itemKey = selectedInventoryItem;
                    const yoyData = inventoryYOY[itemKey] || [];
                    const itemColors: { [key: string]: string } = {
                      'F당시즌': '#EF4444',
                      'S당시즌': '#10B981',
                      '과시즌FW': '#9CA3AF',
                      '과시즌SS': '#D1D5DB',
                      '모자': '#3B82F6',
                      '신발': '#FCD34D',
                      '가방외': '#C4B5FD'
                    };
                    
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={months.map((month, idx) => ({
                          month,
                          value: yoyData[idx] ?? null
                        }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            formatter={(value: any) => value !== null ? [`${value}%`, selectedInventoryItem] : ['N/A', selectedInventoryItem]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                          />
                          <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={itemColors[itemKey] || '#000000'} 
                            strokeWidth={3} 
                            dot={{ r: 4 }} 
                            connectNulls 
                            name={selectedInventoryItem}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  }
                })()}
              </div>
            )}
            
            {/* 재고 YOY 데이터 테이블 - 범례 클릭 시에만 표시 */}
            {selectedInventoryItem && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">재고 YOY 데이터</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold">아이템</th>
                        {(() => {
                          const months = (dashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                          return months.map((month: string) => (
                            <th key={month} className="border border-gray-300 px-1 py-1 text-center font-semibold">{month}</th>
                          ));
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const months = (dashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                        const inventoryYOY = dashboardData?.monthly_inventory_yoy || {};
                        const itemKeys = selectedInventoryItem === '전체' 
                          ? ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외']
                          : [selectedInventoryItem];
                        
                        return itemKeys.map((itemKey: string) => (
                          <tr key={itemKey} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-1 py-1 font-semibold bg-gray-50">{itemKey}</td>
                            {months.map((month: string, idx: number) => {
                              const yoyValue = inventoryYOY[itemKey]?.[idx];
                              const displayValue = yoyValue !== null && yoyValue !== undefined ? `${yoyValue}%` : '-';
                              const isPositive = yoyValue !== null && yoyValue !== undefined && yoyValue < 100;
                              const isNegative = yoyValue !== null && yoyValue !== undefined && yoyValue > 100;
                              
                              return (
                                <td 
                                  key={month}
                                  className={`border border-gray-300 px-1 py-1 text-center ${
                                    isPositive ? 'text-green-600 font-semibold' : 
                                    isNegative ? 'text-red-600 font-semibold' : 
                                    'text-gray-700'
                                  }`}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* 주요 인사이트 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="bg-red-50 border border-red-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-red-800 mb-1">▲ Critical Alert</h4>
              <div className="space-y-0.5 text-xs text-red-700">
                <div>• 과시즌FW 재고 YOY {Math.round((dashboardData?.ending_inventory?.past_season_fw?.total?.yoy || 0))}% 급증</div>
                <div>• 과시즌SS 재고 YOY {Math.round((dashboardData?.ending_inventory?.by_season?.과시즌_SS?.yoy || 0))}% 증가</div>
                <div>• 총재고 {Math.round((dashboardData?.ending_inventory?.total?.current || 0))}K (YOY {Math.round((dashboardData?.ending_inventory?.total?.yoy || 0))}%)</div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-orange-800 mb-1">▲ Risk Monitoring</h4>
              <div className="space-y-0.5 text-xs text-orange-700">
                <div>• 신발 재고주수 {formatStockWeeks(dashboardData?.acc_stock_summary?.by_category?.SHO?.current?.stock_weeks || 0)}주 (전년 {formatStockWeeks(dashboardData?.acc_stock_summary?.by_category?.SHO?.previous?.stock_weeks || 0)}주)</div>
                {(() => {
                  const current = dashboardData?.acc_stock_summary?.by_category?.BAG?.current?.stock_weeks || 0;
                  const previous = dashboardData?.acc_stock_summary?.by_category?.BAG?.previous?.stock_weeks || 0;
                  const isIncrease = current > previous;
                  return (
                    <div>• 가방외 재고주수 {formatStockWeeks(current)}주 (전년 {formatStockWeeks(previous)}주) {isIncrease ? '증가' : '감소'}</div>
                  );
                })()}
                <div>• F당시즌 YOY {Math.round((dashboardData?.ending_inventory?.by_season?.당시즌_의류?.yoy || 0))}% 정상화 중</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-green-800 mb-1">✓ Positive Sign</h4>
              <div className="space-y-0.5 text-xs text-green-700">
                <div>• 신발 재고 YOY {Math.round((dashboardData?.ending_inventory?.acc_by_category?.SHO?.yoy || 0))}% 개선</div>
                <div>• 가방외 재고 YOY {Math.round((dashboardData?.ending_inventory?.acc_by_category?.BAG?.yoy || 0))}% 개선</div>
                <div>• 9월 임시매장 운영으로 과시즌SS 대폭 소진</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 오프라인 매장별 현황 */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              오프라인 매장별 현황 (실판V-, 25년 10월 기준)
            </h3>
            <button className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors">
              YOY 추세 분석
            </button>
          </div>
          
          <div className="grid grid-cols-6 gap-3 w-full" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
            {/* 전체 매장 요약 */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 min-w-0">
              <h4 className="text-sm font-bold text-gray-800 mb-3">전체 매장 요약</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-semibold text-gray-700">
                    {totalStoreCurrent}개 매장
                  </div>
                  <div className="text-[10px] text-gray-500">
                    (전년 {totalStorePrevious}개)
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">점당매출</div>
                  <div className="font-bold text-gray-900">
                    {formatNumber(totalSalesPerStore)}K
                  </div>
                  <div className="text-blue-600">
                    (YOY {formatPercent(totalSalesPerStoreYoy)}% | 전년 {formatNumber(prevSalesPerStore)}K)
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => setExpandedSummary(prev => ({ ...prev, calculationBasis: !prev.calculationBasis }))}
                    className="text-[10px] text-gray-600 hover:text-gray-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>Calculation Basis:</span>
                    {expandedSummary.calculationBasis ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {expandedSummary.calculationBasis && (
                    <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                      <div>온라인/폐점 매장 제외</div>
                      <div>(LCX, WTC 제외)</div>
                      <div>정상운영 {totalStoreCurrent}개 매장 기준</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="text-gray-600">전체 직접이익</div>
                  <div className={`font-bold ${(storeStatusData?.summary?.total_direct_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(storeStatusData?.summary?.total_direct_profit || 0)}K HKD
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => setExpandedSummary(prev => ({ ...prev, hkDetails: !prev.hkDetails }))}
                    className="text-gray-600 font-semibold text-xs flex items-center w-full justify-between mb-1"
                  >
                    <span>홍콩 오프라인 ({storeStatusData?.summary?.hk_stores || 0}개, 리뉴얼 1개 포함)</span>
                    {expandedSummary.hkDetails ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {expandedSummary.hkDetails && (
                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-green-600">✓</span>
                        <span>흑자 & 개선: {storeStatusData?.categories?.profit_improving?.count || 0}개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-orange-600">▲</span>
                        <span>흑자 & 악화: {storeStatusData?.categories?.profit_deteriorating?.count || 0}개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-600">■</span>
                        <span>적자 & 개선: {storeStatusData?.categories?.loss_improving?.count || 0}개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-red-600">✗</span>
                        <span>적자 & 악화: {storeStatusData?.categories?.loss_deteriorating?.count || 0}개</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => setExpandedSummary(prev => ({ ...prev, mcDetails: !prev.mcDetails }))}
                    className="text-gray-600 font-semibold text-xs flex items-center w-full justify-between mb-1"
                  >
                    <span>마카오 매장 ({storeStatusData?.summary?.mc_stores || 0}개)</span>
                    {expandedSummary.mcDetails ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {expandedSummary.mcDetails && (
                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="text-green-600">✓</span>
                        <span>흑자: {(() => {
                          const mcStores = storeStatusData?.mc_summary?.stores || [];
                          return mcStores.filter((s: any) => s.current.direct_profit > 0).length;
                        })()}개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-red-600">✗</span>
                        <span>적자: {(() => {
                          const mcStores = storeStatusData?.mc_summary?.stores || [];
                          return mcStores.filter((s: any) => s.current.direct_profit <= 0).length;
                        })()}개</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="text-gray-600 text-[10px]">최고YOY</div>
                  <div className="font-bold text-green-600 text-xs">
                    {(() => {
                    if (activeHKStores.length === 0) return '-';
                    const maxStore = activeHKStores.reduce((max: any, s: any) => s.yoy > max.yoy ? s : max, activeHKStores[0]);
                      return `${maxStore.shop_nm} ${Math.round(maxStore.yoy)}%`;
                    })()}
                  </div>
                </div>
                <div className="mt-1">
                  <div className="text-gray-600 text-[10px]">최저YOY</div>
                  <div className="font-bold text-red-600 text-xs">
                    {(() => {
                    if (activeHKStores.length === 0) return '-';
                    const minStore = activeHKStores.reduce((min: any, s: any) => s.yoy < min.yoy ? s : min, activeHKStores[0]);
                      return `${minStore.shop_nm} ${Math.round(minStore.yoy)}%`;
                    })()}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => setExpandedSummary(prev => ({ ...prev, excludedStores: !prev.excludedStores }))}
                    className="text-gray-600 font-semibold text-xs flex items-center w-full justify-between mb-1"
                  >
                    <span>분석 제외 매장 ({storeStatusData?.excluded_stores?.count || 0}개)</span>
                    {expandedSummary.excludedStores ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {expandedSummary.excludedStores && storeStatusData?.excluded_stores?.stores && (
                    <div className="space-y-1 text-[10px] mt-1">
                      {storeStatusData.excluded_stores.stores.map((store: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-1 bg-gray-100 rounded px-2 py-1">
                          <span className="text-gray-500">○</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-700">{store.shop_nm}</div>
                            <div className="text-gray-500 text-[9px]">{store.exclusion_reason}</div>
                            <div className="flex justify-between mt-0.5">
                              <span className="text-gray-600">직접손익: {Math.round(store.current.direct_profit)}K</span>
                              <span className="text-gray-600">YOY {Math.round(store.yoy)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <button
                    onClick={() => setExpandedSummary(prev => ({ ...prev, insights: !prev.insights }))}
                    className="text-gray-600 font-semibold text-[10px] flex items-center w-full justify-between mb-1"
                  >
                    <span>전략 인사이트</span>
                    {expandedSummary.insights ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  {expandedSummary.insights && (
                    <div className="text-[10px] text-gray-600 space-y-1">
                      <div>• 적자매장 {((storeStatusData?.categories?.loss_improving?.count || 0) + (storeStatusData?.categories?.loss_deteriorating?.count || 0))}개 집중 관리 필요</div>
                      <div>• Yoho-NTP3 성장 모멘텀 활용한 흑자 전략 수립</div>
                      <div>• BEP 목표: 임차료+인건비 비율 45% 이하 유지</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 흑자 & 매출개선 */}
            {(() => {
              const cat = storeStatusData?.categories?.profit_improving;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-400 min-w-0">
                  <h4 className="text-sm font-bold text-green-800 mb-2">흑자 & 매출개선</h4>
                  <div className="text-xs text-green-700 mb-1 font-semibold">최우수</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-green-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-green-700">직접이익 합계</div>
                      <div className="font-bold text-green-900">+{Math.round(cat.total_direct_profit)}K</div>
                      <div className="text-green-600">| 평균 YOY: {Math.round(cat.avg_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-green-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_improving: { ...prev.profit_improving, stores: !prev.profit_improving.stores }
                      }))}
                      className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.profit_improving.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.profit_improving.stores && (
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                          <span className="font-semibold text-green-900">{store.shop_nm}</span>
                          <div className="text-right">
                            <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {store.current.direct_profit >= 0 ? '+' : ''}{Math.round(store.current.direct_profit)}K
                            </div>
                            <div className="text-green-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-green-300">
                    <div className="text-green-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-green-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_improving: { ...prev.profit_improving, rentLabor: !prev.profit_improving.rentLabor }
                      }))}
                      className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.profit_improving.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.profit_improving.rentLabor && (
                      <>
                        <div className="text-[10px] text-green-600 mt-1">
                          임차료율: {(() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%, 인건비율: {(() => {
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const totalRatio = parseFloat(rentRatio) + parseFloat(laborRatio);
                            let efficiency = '';
                            if (totalRatio < 35) efficiency = '우수';
                            else if (totalRatio < 45) efficiency = '효율적';
                            else if (totalRatio < 55) efficiency = '양호';
                            else efficiency = '비용 관리 필요';
                            return (
                              <div key={idx} className="text-[9px] text-green-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio}%</span>
                                <span className={totalRatio < 45 ? 'text-green-700' : 'text-orange-600'}>({efficiency})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <div className="text-green-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-green-600">
                      성공 모델 분석하여 타 매장 확산, 베스트 프랙티스 공유
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 흑자 & 매출악화 */}
            {(() => {
              const cat = storeStatusData?.categories?.profit_deteriorating;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-400 min-w-0">
                  <h4 className="text-sm font-bold text-blue-800 mb-2">흑자 & 매출악화</h4>
                  <div className="text-xs text-blue-700 mb-1 font-semibold">▲주의</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-blue-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-blue-700">직접이익 합계</div>
                      <div className="font-bold text-blue-900">+{Math.round(cat.total_direct_profit)}K</div>
                      <div className="text-blue-600">| 평균 YOY: {Math.round(cat.avg_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-blue-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_deteriorating: { ...prev.profit_deteriorating, stores: !prev.profit_deteriorating.stores }
                      }))}
                      className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.profit_deteriorating.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.profit_deteriorating.stores && (
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                          <span className="font-semibold text-blue-900">{store.shop_nm}</span>
                          <div className="text-right">
                            <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {store.current.direct_profit >= 0 ? '+' : ''}{Math.round(store.current.direct_profit)}K
                            </div>
                            <div className="text-blue-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-blue-300">
                    <div className="text-blue-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-blue-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_deteriorating: { ...prev.profit_deteriorating, rentLabor: !prev.profit_deteriorating.rentLabor }
                      }))}
                      className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.profit_deteriorating.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.profit_deteriorating.rentLabor && (
                      <>
                        <div className="text-[10px] text-blue-600 mt-1">
                          임차료율: {(() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%, 인건비율: {(() => {
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const totalRatio = parseFloat(rentRatio) + parseFloat(laborRatio);
                            let efficiency = '';
                            if (totalRatio < 35) efficiency = '우수';
                            else if (totalRatio < 45) efficiency = '효율적';
                            else if (totalRatio < 55) efficiency = '양호';
                            else efficiency = '비용 관리 필요';
                            return (
                              <div key={idx} className="text-[9px] text-blue-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio}%</span>
                                <span className={totalRatio < 45 ? 'text-blue-700' : 'text-orange-600'}>({efficiency})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <div className="text-blue-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-blue-600">
                      흑자 유지에도 트래픽 감소 원인 분석, 강화된 프로모션으로 매출 반등 유도
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 적자 & 매출개선 */}
            {(() => {
              const cat = storeStatusData?.categories?.loss_improving;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-yellow-50 rounded-lg p-3 border-2 border-yellow-400 min-w-0">
                  <h4 className="text-sm font-bold text-yellow-800 mb-2">적자 & 매출개선</h4>
                  <div className="text-xs text-yellow-700 mb-1 font-semibold">개선중</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-yellow-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-yellow-700">직접손실 합계</div>
                      <div className="font-bold text-red-600">{Math.round(cat.total_direct_profit)}K</div>
                      <div className="text-yellow-600">| 평균 YOY: {Math.round(cat.avg_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-yellow-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_improving: { ...prev.loss_improving, stores: !prev.loss_improving.stores }
                      }))}
                      className="text-xs text-yellow-700 hover:text-yellow-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.loss_improving.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.loss_improving.stores && (
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                          <span className="font-semibold text-yellow-900">{store.shop_nm}</span>
                          <div className="text-right">
                            <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {store.current.direct_profit >= 0 ? '+' : ''}{Math.round(store.current.direct_profit)}K
                            </div>
                            <div className="text-yellow-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-yellow-300">
                    <div className="text-yellow-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-yellow-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_improving: { ...prev.loss_improving, rentLabor: !prev.loss_improving.rentLabor }
                      }))}
                      className="text-xs text-yellow-700 hover:text-yellow-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.loss_improving.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.loss_improving.rentLabor && (
                      <>
                        <div className="text-[10px] text-yellow-600 mt-1">
                          임차료율: {(() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%, 인건비율: {(() => {
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const totalRatio = parseFloat(rentRatio) + parseFloat(laborRatio);
                            let efficiency = '';
                            if (totalRatio < 60) efficiency = '매출 확대 시 개선 가능';
                            else if (totalRatio < 100) efficiency = '고비용 구조';
                            else efficiency = '특수 매장, 과재고 소진 목적';
                            return (
                              <div key={idx} className="text-[9px] text-yellow-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio}%</span>
                                <span className="text-orange-600">({efficiency})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <div className="text-yellow-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-yellow-600">
                      고성장 모멘텀 유지, 직접비 효율 개선으로 조기 BEP 달성
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 적자 & 매출악화 */}
            {(() => {
              const cat = storeStatusData?.categories?.loss_deteriorating;
              if (!cat || cat.count === 0) return null;
              // LCX 제외 (리뉴얼 중)
              const storesWithoutLCX = cat.stores.filter((s: any) => s.shop_cd !== 'M05');
              const avgYoyWithoutLCX = storesWithoutLCX.length > 0 
                ? storesWithoutLCX.reduce((sum: number, s: any) => sum + s.yoy, 0) / storesWithoutLCX.length 
                : 0;
              return (
                <div className="bg-red-50 rounded-lg p-3 border-2 border-red-400 min-w-0">
                  <h4 className="text-sm font-bold text-red-800 mb-2">적자 & 매출악화</h4>
                  <div className="text-xs text-red-700 mb-1 font-semibold">긴급</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-red-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-red-700">직접손실 합계</div>
                      <div className="font-bold text-red-600">{Math.round(cat.total_direct_profit)}K</div>
                      <div className="text-red-600">| 평균 YOY: {Math.round(avgYoyWithoutLCX)}% (LCX 제외)</div>
                    </div>
                  </div>
                  <div className="border-t border-red-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_deteriorating: { ...prev.loss_deteriorating, stores: !prev.loss_deteriorating.stores }
                      }))}
                      className="text-xs text-red-700 hover:text-red-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.loss_deteriorating.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.loss_deteriorating.stores && (
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => (
                        <div key={idx} className={`flex justify-between items-center rounded px-2 py-1 ${store.shop_cd === 'M05' ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                          <span className={`font-semibold ${store.shop_cd === 'M05' ? 'text-gray-500' : 'text-red-900'}`}>
                            {store.shop_nm}{store.shop_cd === 'M05' ? ' (리뉴얼)' : ''}
                          </span>
                          <div className="text-right">
                            <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {store.current.direct_profit >= 0 ? '+' : ''}{Math.round(store.current.direct_profit)}K
                            </div>
                            <div className="text-red-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-red-300">
                    <div className="text-red-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-red-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_deteriorating: { ...prev.loss_deteriorating, rentLabor: !prev.loss_deteriorating.rentLabor }
                      }))}
                      className="text-xs text-red-700 hover:text-red-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.loss_deteriorating.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.loss_deteriorating.rentLabor && (
                      <>
                        <div className="text-[10px] text-red-600 mt-1">
                          임차료율: {(() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%, 인건비율: {(() => {
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.filter((s: any) => s.shop_cd !== 'M05').map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const totalRatio = parseFloat(rentRatio) + parseFloat(laborRatio);
                            let note = '';
                            if (totalRatio >= 40) note = '임차료율 40% 이상';
                            if (store.shop_cd === 'M05' || store.shop_cd === 'M12') note = '종료/리뉴얼';
                            return (
                              <div key={idx} className="text-[9px] text-red-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio}%</span>
                                {note && <span className="text-orange-600">({note})</span>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-300">
                    <div className="text-red-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-red-600">
                      Time Square-Yoho-Hysan 우선 개선, 임차료 협상 및 직접비 절감 집중
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 마카오 매장 종합 */}
            {(() => {
              const mc = storeStatusData?.mc_summary;
              if (!mc || mc.count === 0) return null;
              return (
                <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-400 min-w-0">
                  <h4 className="text-sm font-bold text-purple-800 mb-2">마카오 매장 종합</h4>
                  <div className="text-xs text-purple-700 mb-1 font-semibold">MC:</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-purple-900">{mc.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-purple-700">직접이익 합계</div>
                      <div className={`font-bold ${mc.total_direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mc.total_direct_profit >= 0 ? '+' : ''}{Math.round(mc.total_direct_profit)}K
                      </div>
                      <div className="text-purple-600">| 전체 YOY: {Math.round(mc.overall_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-purple-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        mc_summary: { ...prev.mc_summary, stores: !prev.mc_summary.stores }
                      }))}
                      className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.mc_summary.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.mc_summary.stores && (
                    <div className="space-y-1 text-xs mb-3">
                      {mc.stores.map((store: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                          <span className="font-semibold text-purple-900">{store.shop_nm}</span>
                          <div className="text-right">
                            <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {store.current.direct_profit >= 0 ? '+' : ''}{Math.round(store.current.direct_profit)}K
                            </div>
                            <div className="text-purple-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-purple-300">
                    <div className="text-purple-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-purple-900 text-xs mb-2">{mc.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        mc_summary: { ...prev.mc_summary, rentLabor: !prev.mc_summary.rentLabor }
                      }))}
                      className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.mc_summary.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.mc_summary.rentLabor && (
                      <>
                        <div className="text-[10px] text-purple-600 mt-1">
                          임차료율: {(() => {
                            const totalRent = mc.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = mc.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%, 인건비율: {(() => {
                            const totalLabor = mc.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                            const totalSales = mc.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                            return totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                          })()}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {mc.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100).toFixed(1) : '0.0';
                            const totalRatio = parseFloat(rentRatio) + parseFloat(laborRatio);
                            return (
                              <div key={idx} className="text-[9px] text-purple-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-purple-300">
                    <div className="text-purple-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-purple-600">
                      현지 VMD 채용 및 프로모션 대응 속도 개선으로 전체 매출 반등 유도
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 직접비 상세 (오프라인 매장별 현황 아래) */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            직접비 상세 (1K HKD)
          </h3>
        </div>
        
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* 전체 직접비용 */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-md p-4 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-indigo-800">전체 직접비용</div>
              
              {/* 당월/누적 토글 버튼 */}
              <div className="flex gap-1">
                <button
                  onClick={() => setExpenseType('당월')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    expenseType === '당월'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  당월
                </button>
                <button
                  onClick={() => setExpenseType('누적')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    expenseType === '누적'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  누적
                </button>
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">11,686K</div>
                <div className="text-xs mb-3 text-red-600">YOY 97% (▼ 391K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">58.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+2.4%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">115,680K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 95% (▼ 6,426K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">57.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+5.1%p</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 급여 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">급여</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-cyan-100 text-cyan-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">2,275K</div>
                <div className="text-xs mb-3 text-green-600">YOY 106% (▲ 134K)</div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">11.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                    <span className="text-xs font-semibold text-red-600 text-right">+1.9%p</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                    className="w-full flex items-center justify-between text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showDirectCostItemAnalysis.salary ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.salary && (() => {
                    // 당월 데이터 추출
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    
                    // 직접비 급여는 매장별 데이터에서 계산되어야 하지만, 일단 구조만 만들기
                    const current = 2275;
                    const prev = 2141;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-cyan-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">인건비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">인원수 변화 및 매출 대비 효율성 분석</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">21,390K</div>
                <div className="text-xs mb-3 text-green-600">YOY 100% (▲ 36K)</div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">10.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                    <span className="text-xs font-semibold text-red-600 text-right">+1.6%p</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                    className="w-full flex items-center justify-between text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showDirectCostItemAnalysis.salary ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.salary && (() => {
                    // 누적 데이터 추출
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    
                    // 직접비는 매장별 데이터에서 계산되어야 하지만, 일단 구조만 만들기
                    const current = 21390;
                    const prev = 21354;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-cyan-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">인건비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 임차료 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-teal-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">임차료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-teal-100 text-teal-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">5,844K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 96% (▼ 257K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">30.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+1.9%p</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, rent: !prev.rent }))}
                    className="w-full flex items-center justify-between text-xs text-teal-600 hover:text-teal-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showDirectCostItemAnalysis.rent ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.rent && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const current = 5844;
                    const prev = 6101;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold text-teal-800 mb-1">임차료 할인효과</div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">임차료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">LCX, Yuenlong, Megamall 할인 및 폐점 매장 효과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">59,221K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 96% (▼ 2,739K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">29.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+3.1%p</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, rent: !prev.rent }))}
                    className="w-full flex items-center justify-between text-xs text-teal-600 hover:text-teal-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showDirectCostItemAnalysis.rent ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.rent && (() => {
                    const current = 59221;
                    const prev = 61960;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold text-teal-800 mb-1">임차료 할인효과</div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">임차료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 물류비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-amber-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">물류비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,105K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 78% (▼ 305K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">4.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.8%p</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, logistics: !prev.logistics }))}
                    className="w-full flex items-center justify-between text-xs text-amber-600 hover:text-amber-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showDirectCostItemAnalysis.logistics ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.logistics && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const current = 1105;
                    const prev = 1410;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-amber-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">물류비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">보관비, 취급비, 배송비 절감으로 총 {formatNumber(Math.abs(change))}K 절감</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">재고 고갈 및 재고 효율성 개선 효과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">12,035K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 88% (▼ 1,596K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">4.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.1%p</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 기타 직접비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">기타 직접비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">2,462K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 101% (▲ 37K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매장관리비</span>
                    <span className="text-xs font-semibold text-gray-800">1,081K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">708K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">지급수수료</span>
                    <span className="text-xs font-semibold text-gray-800">385K</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showDirectCostItemAnalysis.other ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.other && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const current = 2462;
                    const prev = 2425;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">기타 직접비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매장관리비, 감가상각비, 지급수수료 등 상세 항목 변화</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">23,034K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 95% (▼ 1,163K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매장관리비</span>
                    <span className="text-xs font-semibold text-gray-800">9,867K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">7,036K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">지급수수료</span>
                    <span className="text-xs font-semibold text-gray-800">3,210K</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showDirectCostItemAnalysis.other ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.other && (() => {
                    const current = 23034;
                    const prev = 24197;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">기타 직접비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 영업비 상세 (오프라인 매장별 현황 아래) */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            영업비 상세 (1K HKD)
          </h3>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {/* 전체 */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-md p-4 border-l-4 border-emerald-600">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-emerald-800">전체 영업비</div>
              
              {/* 당월/누적 토글 버튼 */}
              <div className="flex gap-1">
                <button
                  onClick={() => setOpexType('당월')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    opexType === '당월'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  당월
                </button>
                <button
                  onClick={() => setOpexType('누적')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    opexType === '누적'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  누적
                </button>
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">1,451K</div>
                <div className="text-xs mb-3 text-red-600">YOY 130% (+333K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">7.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">5.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 악화</span>
                    <span className="text-xs font-semibold text-red-600">▲ 2.0%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">13,385K</div>
                <div className="text-xs mb-3 text-red-600">YOY 103% (+403K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">6.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">5.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 악화</span>
                    <span className="text-xs font-semibold text-red-600">▲ 1.1%p</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 급여 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">급여</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">605K</div>
                <div className="text-xs mb-3 text-red-600">YOY 137% (+164K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">41.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">3.0%</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                    className="w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.salary ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.salary && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).salary || 0;
                    const prev = (expenseDetailPrev as any).salary || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">HK Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">인원수 변화 및 신규 채용 효과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">5,232K</div>
                <div className="text-xs mb-3 text-red-600">YOY 114% (+626K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">39.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">2.6%</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                    className="w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.salary ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.salary && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).salary || 0;
                    const prev = (expenseDetailPrev as any).salary || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">HK Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 마케팅비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">마케팅비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">417K</div>
                <div className="text-xs mb-3 text-red-600">YOY 136% (+111K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">28.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">2.1%</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.marketing ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.marketing && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).marketing || 0;
                    const prev = (expenseDetailPrev as any).marketing || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">마케팅비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">소셜 마케팅 및 구글 광고비 변화</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,137K</div>
                <div className="text-xs mb-3 text-green-600">YOY 76% (▼ 1,000K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">23.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">1.5%</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.marketing ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.marketing && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).marketing || 0;
                    const prev = (expenseDetailPrev as any).marketing || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">마케팅비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">소셜 마케팅 및 구글 광고비 변화</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 지급수수료 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">지급수수료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">131K</div>
                <div className="text-xs mb-3 text-red-600">YOY 243% (+77K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">9.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">0.7%</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, fee: !prev.fee }))}
                    className="w-full flex items-center justify-between text-xs text-orange-600 hover:text-orange-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.fee ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.fee && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).fee || 0;
                    const prev = (expenseDetailPrev as any).fee || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;
                    
                    // 전체 영업비 대비 비율
                    const currentOpex = currentMonthData?.sg_a || 0;
                    const prevOpex = prevMonthData?.sg_a || 0;
                    const currentOpexRatio = currentOpex !== 0 ? (current / currentOpex) * 100 : 0;
                    const prevOpexRatio = prevOpex !== 0 ? (prev / prevOpex) * 100 : 0;
                    const opexRatioChange = currentOpexRatio - prevOpexRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">지급수수료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">전체 영업비 대비: {formatPercent(currentOpexRatio)}% (전년 대비 {opexRatioChange >= 0 ? '+' : ''}{formatPercent(opexRatioChange)}%p)</span>
                          </div>
                          {Math.abs(changeRate) > 50 && (
                            <div className="flex items-start">
                              <span className="text-orange-600 mr-1">•</span>
                              <span className="text-gray-700">지급수수료가 전년 대비 {Math.abs(changeRate) > 100 ? '크게' : '상당히'} {change >= 0 ? '증가' : '감소'}하여 주의 필요</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,964K</div>
                <div className="text-xs mb-3 text-red-600">YOY 194% (+1,010K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">14.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">1.0%</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, fee: !prev.fee }))}
                    className="w-full flex items-center justify-between text-xs text-orange-600 hover:text-orange-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.fee ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.fee && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).fee || 0;
                    const prev = (expenseDetailPrev as any).fee || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">지급수수료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">지급수수료 변화는 다양한 수수료 항목의 종합 결과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 기타 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-pink-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">기타</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-pink-100 text-pink-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">298K</div>
                <div className="text-xs mb-3 text-red-600">YOY 140% (+87K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">물류비</span>
                    <span className="text-xs font-semibold text-gray-800">102K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">85K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">59K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">47K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">17K</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-xs text-pink-600 hover:text-pink-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.other ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.other && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.current_month?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).other || 0;
                    const prev = (expenseDetailPrev as any).other || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    // other_detail 분석
                    const otherDetail = expenseDetail.other_detail || {};
                    const otherDetailPrev = expenseDetailPrev.other_detail || {};
                    const otherDetailLabels: {[key: string]: string} = {
                      'depreciation': '감가상각비',
                      'duty_free': '면세점 직접비',
                      'govt_license': '정부세금 및 라이센스',
                      'logistics': '운반비',
                      'maintenance': '유지보수비',
                      'other_fee': '기타 수수료',
                      'rent_free': '임대료 면제/할인',
                      'retirement': '퇴직연금',
                      'supplies': '소모품비',
                      'transport': '운반비(기타)',
                      'uniform': '피복비(유니폼)',
                      'utilities': '수도광열비',
                      'var_rent': '매출연동 임대료',
                      'communication': '통신비',
                      'bonus': '최종지급금'
                    };

                    return (
                      <div className="mt-3 pt-3 border-t bg-pink-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">기타 영업비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          {Object.keys(otherDetail).length > 0 && (
                            <>
                              <div className="font-semibold text-pink-800 mb-1 mt-2">상세 항목:</div>
                              {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                const prevValue = (otherDetailPrev as any)[key] || 0;
                                if (value === 0 && prevValue === 0) return null;
                                const itemChange = value - prevValue;
                                const itemChangeRate = prevValue !== 0 ? (itemChange / prevValue) * 100 : 0;
                                return (
                                  <div key={key} className="flex items-start pl-2">
                                    <span className="text-pink-600 mr-1">-</span>
                                    <span className="text-gray-700">
                                      {otherDetailLabels[key] || key}: {formatNumber(value)}K 
                                      {prevValue !== 0 && (
                                        <span className={itemChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                                          {' '}({itemChange >= 0 ? '+' : ''}{formatNumber(itemChange)}K, {formatPercent(itemChangeRate)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,052K</div>
                <div className="text-xs mb-3 text-red-600">YOY 95% (+152K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">물류비</span>
                    <span className="text-xs font-semibold text-gray-800">1,204K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">1,001K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">708K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">430K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">184K</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-xs text-pink-600 hover:text-pink-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.other ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.other && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).other || 0;
                    const prev = (expenseDetailPrev as any).other || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    // other_detail 분석
                    const otherDetail = expenseDetail.other_detail || {};
                    const otherDetailPrev = expenseDetailPrev.other_detail || {};
                    const otherDetailLabels: {[key: string]: string} = {
                      'depreciation': '감가상각비',
                      'duty_free': '면세점 직접비',
                      'govt_license': '정부세금 및 라이센스',
                      'logistics': '운반비',
                      'maintenance': '유지보수비',
                      'other_fee': '기타 수수료',
                      'rent_free': '임대료 면제/할인',
                      'retirement': '퇴직연금',
                      'supplies': '소모품비',
                      'transport': '운반비(기타)',
                      'uniform': '피복비(유니폼)',
                      'utilities': '수도광열비',
                      'var_rent': '매출연동 임대료',
                      'communication': '통신비',
                      'bonus': '최종지급금'
                    };

                    return (
                      <div className="mt-3 pt-3 border-t bg-pink-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">기타 영업비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          {Object.keys(otherDetail).length > 0 && (
                            <>
                              <div className="font-semibold text-pink-800 mb-1 mt-2">상세 항목:</div>
                              {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                const prevValue = (otherDetailPrev as any)[key] || 0;
                                if (value === 0 && prevValue === 0) return null;
                                const itemChange = value - prevValue;
                                const itemChangeRate = prevValue !== 0 ? (itemChange / prevValue) * 100 : 0;
                                return (
                                  <div key={key} className="flex items-start pl-2">
                                    <span className="text-pink-600 mr-1">-</span>
                                    <span className="text-gray-700">
                                      {otherDetailLabels[key] || key}: {formatNumber(value)}K 
                                      {prevValue !== 0 && (
                                        <span className={itemChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                                          {' '}({itemChange >= 0 ? '+' : ''}{formatNumber(itemChange)}K, {formatPercent(itemChangeRate)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HongKongCEODashboard;

