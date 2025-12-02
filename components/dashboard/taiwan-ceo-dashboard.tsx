'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, LabelList, ReferenceLine, Cell, Layer } from 'recharts';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import dashboardData from './taiwan-dashboard-data.json';
import plData from './taiwan-pl-data.json';

const TaiwanCEODashboard = () => {
  useEffect(() => {
    document.title = "대만법인 25년 10월 경영실적";
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
  const [showYear1Detail, setShowYear1Detail] = useState(false);
  const [showYear2Detail, setShowYear2Detail] = useState(false);
  const [showYear1OthersDetail, setShowYear1OthersDetail] = useState(false);
  const [showYear2OthersDetail, setShowYear2OthersDetail] = useState(false);
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
  const [expandedStoreCategories, setExpandedStoreCategories] = useState<{[key: string]: {stores: boolean | {[store_code: string]: boolean}, rentLabor: boolean}}>({
    large_profit: {stores: {}, rentLabor: false},  // 매장별 상세: 접힘, 임차료/인건비율 상세: 접힘
    small_medium_profit: {stores: {}, rentLabor: false},  // 매장별 상세: 접힘, 임차료/인건비율 상세: 접힘
    profit_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    profit_deteriorating: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_deteriorating: {stores: {}, rentLabor: false},  // 매장별 상세: 접힘, 임차료/인건비율 상세: 접힘
    mc_summary: {stores: true, rentLabor: false}  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
  });
  const [expandedSummary, setExpandedSummary] = useState({
    calculationBasis: false,
    excludedStores: false,
    insights: false,
    yoyTrend: false
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
  }, []);
  
  const salesSummary = dashboardData?.sales_summary || {};
  const countryChannel = dashboardData?.country_channel_summary || {};
  const offlineEfficiency = dashboardData?.offline_store_efficiency || {};
  const storeEfficiencySummary = offlineEfficiency?.total;
  const totalStoreCurrent = storeEfficiencySummary?.current?.store_count ?? 0;
  const totalStorePrevious = storeEfficiencySummary?.previous?.store_count ?? 0;
  const totalSalesPerStore = storeEfficiencySummary?.current?.sales_per_store ?? 0;
  const prevSalesPerStore = storeEfficiencySummary?.previous?.sales_per_store ?? 0;
  const totalSalesPerStoreYoy = offlineEfficiency?.total?.yoy ?? (prevSalesPerStore ? (totalSalesPerStore / prevSalesPerStore) * 100 : 0);

  // 대만은 매장 데이터가 dashboardData에 포함되어 있음
  const allTWStores = useMemo(() => {
    if (!dashboardData?.store_summary) return [];
    return Object.values(dashboardData.store_summary);
  }, [dashboardData]);

  // 채널별 매장 효율성 계산
  const channelEfficiency = useMemo(() => {
    const channels: { [key: string]: { current: { net_sales: number, store_count: number, sales_per_store: number }, previous: { net_sales: number, store_count: number, sales_per_store: number }, yoy: number } } = {
      Retail: { current: { net_sales: 0, store_count: 0, sales_per_store: 0 }, previous: { net_sales: 0, store_count: 0, sales_per_store: 0 }, yoy: 0 },
      Outlet: { current: { net_sales: 0, store_count: 0, sales_per_store: 0 }, previous: { net_sales: 0, store_count: 0, sales_per_store: 0 }, yoy: 0 }
    };

    allTWStores.forEach((store: any) => {
      const channel = store.channel;
      if (channel === 'Retail' || channel === 'Outlet') {
        // 당월 데이터 (온라인 제외, 정상 운영 매장만)
        if (store.current && store.current.net_sales > 0 && !store.closed) {
          channels[channel].current.net_sales += store.current.net_sales || 0;
          channels[channel].current.store_count += 1;
        }
        // 전년 데이터
        if (store.previous && store.previous.net_sales > 0) {
          channels[channel].previous.net_sales += store.previous.net_sales || 0;
          channels[channel].previous.store_count += 1;
        }
      }
    });

    // 점당매출 계산
    Object.keys(channels).forEach((key) => {
      const channel = channels[key];
      if (channel.current.store_count > 0) {
        channel.current.sales_per_store = channel.current.net_sales / channel.current.store_count;
      }
      if (channel.previous.store_count > 0) {
        channel.previous.sales_per_store = channel.previous.net_sales / channel.previous.store_count;
      }
      if (channel.previous.sales_per_store > 0) {
        channel.yoy = (channel.current.sales_per_store / channel.previous.sales_per_store) * 100;
      }
    });

    return channels;
  }, [allTWStores]);

  // 전년 대비 변동된 매장 계산
  const storeChanges = useMemo(() => {
    const newStores: string[] = []; // 신규 매장
    const closedStores: string[] = []; // 종료 매장
    const renovatedStores: string[] = []; // 리뉴얼 매장

    allTWStores.forEach((store: any) => {
      // 온라인 매장 제외
      if (store.channel === 'Online') return;

      const hasCurrentSales = store.current && store.current.net_sales > 0;
      const hasPreviousSales = store.previous && store.previous.net_sales > 0;
      const isClosed = store.closed || false;

      // 신규 매장: 당월에만 매출이 있고 전년에 매출이 없음
      if (hasCurrentSales && !hasPreviousSales) {
        newStores.push(store.store_name || store.store_code);
      }
      
      // 종료 매장: 전년에만 매출이 있고 당월에 매출이 없음
      if (hasPreviousSales && !hasCurrentSales && !isClosed) {
        closedStores.push(store.store_name || store.store_code);
      }

      // 리뉴얼 매장: 전년에 매출이 있었지만 당월에 매출이 0이고 closed가 true
      if (hasPreviousSales && !hasCurrentSales && isClosed) {
        renovatedStores.push(store.store_name || store.store_code);
      }
    });

    return { newStores, closedStores, renovatedStores };
  }, [allTWStores]);

  const activeTWStores = useMemo(
    () => allTWStores
      .filter((store: any) => (store?.current?.net_sales || 0) > 0 && !store.closed && store.channel !== 'Online')
      .map((store: any) => {
        const currentNet = store?.current?.net_sales || 0;
        const previousNet = store?.previous?.net_sales || 0;
        const yoy = previousNet > 0 ? (currentNet / previousNet) * 100 : 0;
        // 직접이익 계산
        let directProfit = 0;
        let directProfitPrev = 0;
        if (plData?.channel_direct_profit?.stores?.[store.store_code as keyof typeof plData.channel_direct_profit.stores]) {
          const storeData = plData.channel_direct_profit.stores[store.store_code as keyof typeof plData.channel_direct_profit.stores];
          directProfit = storeData.direct_profit || 0;
          directProfitPrev = storeData.direct_profit_prev || 0;
        }
        return {
          ...store,
          shop_nm: store.store_name || store.store_code,
          shop_cd: store.store_code,
          yoy: yoy,
          direct_profit: directProfit,
          current: {
            ...store.current,
            direct_profit: directProfit
          }
        };
      })
      .sort((a: any, b: any) => b.yoy - a.yoy), // YOY 높은 순으로 정렬
    [allTWStores, plData]
  );

  // 카테고리 통계 계산 함수
  const calculateCategoryStats = (stores: any[]) => {
    if (stores.length === 0) return null;
    const totalDirectProfit = stores.reduce((sum, s) => sum + (s.direct_profit || 0), 0);
    const avgYoy = stores.reduce((sum, s) => sum + s.yoy, 0) / stores.length;

    // 임차료/인건비/감가상각비율 계산
    const totalRent = stores.reduce((sum, s) => sum + ((plData?.channel_direct_profit?.stores as any)?.[s.store_code]?.rent || 0), 0);
    const totalLabor = stores.reduce((sum, s) => sum + ((plData?.channel_direct_profit?.stores as any)?.[s.store_code]?.labor_cost || 0), 0);
    const totalDepreciation = stores.reduce((sum, s) => sum + ((plData?.channel_direct_profit?.stores as any)?.[s.store_code]?.depreciation || 0), 0);
    const totalSales = stores.reduce((sum, s) => sum + ((s.current?.net_sales || 0) / 1000), 0); // 1K HKD 단위로 변환

    const rentRate = totalSales > 0 ? (totalRent / totalSales) * 100 : 0;
    const laborRate = totalSales > 0 ? (totalLabor / totalSales) * 100 : 0;
    const depreciationRate = totalSales > 0 ? (totalDepreciation / totalSales) * 100 : 0;
    const avgRentLaborRatio = rentRate + laborRate;

    return {
      count: stores.length,
      stores: stores,
      total_direct_profit: totalDirectProfit,
      total_net_sales: totalSales,
      avg_yoy: avgYoy,
      avg_rent_labor_ratio: avgRentLaborRatio,
      rent_rate: rentRate,
      labor_rate: laborRate,
      depreciation_rate: depreciationRate
    };
  };

  // 매장 카테고리 계산
  const storeCategories = useMemo(() => {

    // 대형 흑자매장 (직접이익 >= 100K)
    const largeProfitStores = activeTWStores.filter((s: any) => (s.direct_profit || 0) >= 100);
    
    // 중소형 흑자매장 (직접이익 > 0 && < 100K)
    const smallMediumProfitStores = activeTWStores.filter((s: any) => (s.direct_profit || 0) > 0 && (s.direct_profit || 0) < 100);
    
    // 적자매장 (직접이익 < 0)
    const lossStores = activeTWStores.filter((s: any) => (s.direct_profit || 0) < 0);
    
    // 매출개선 적자매장 (적자이지만 YOY >= 100)
    const lossImproving = lossStores.filter((s: any) => s.yoy >= 100);
    
    // 매출악화 적자매장 (적자이고 YOY < 100)
    const lossDeteriorating = lossStores.filter((s: any) => s.yoy < 100);

    // 적자매장 통합
    const allLossStores = [...lossImproving, ...lossDeteriorating];
    const lossTotal = calculateCategoryStats(allLossStores);
    
    return {
      large_profit: calculateCategoryStats(largeProfitStores),
      small_medium_profit: calculateCategoryStats(smallMediumProfitStores),
      loss_improving: calculateCategoryStats(lossImproving),
      loss_deteriorating: calculateCategoryStats(lossDeteriorating),
      loss_all: lossTotal ? {
        ...lossTotal,
        improving_stores: lossImproving,
        deteriorating_stores: lossDeteriorating
      } : null
    };
  }, [activeTWStores, plData]);
  const seasonSales = dashboardData?.season_sales || {};
  const accStock = dashboardData?.acc_stock_summary || {};
  const endingInventory = dashboardData?.ending_inventory || {};
  const pastSeasonFW = endingInventory?.past_season_fw || {};

  // 아이템별 기말재고 YOY는 ending_inventory 기준 사용 (TAG 재고 기준)
  const yoySeasonF = endingInventory?.by_season?.['당시즌_의류']?.yoy || 0;      // 당시즌 의류 (25F)
  const yoySeasonS = endingInventory?.by_season?.['당시즌_SS']?.yoy || 0;      // 당시즌 SS (25S)
  const yoyPastF = endingInventory?.by_season?.['과시즌_FW']?.yoy || 0;         // 과시즌 FW
  const yoyPastS = endingInventory?.by_season?.['과시즌_SS']?.yoy || 0;         // 과시즌 SS
  const yoyShoes = endingInventory?.acc_by_category?.SHO?.yoy || 0;             // 신발
  const yoyHat = endingInventory?.acc_by_category?.HEA?.yoy || 0;               // 모자

  const pl = plData?.current_month?.total || {};
  const plYoy = plData?.current_month?.yoy || {};
  const plChange = plData?.current_month?.change || {};

  // 전년 할인율 계산 (prev_month에 discount_rate가 없는 경우)
  const prevMonthDiscountRate = useMemo(() => {
    const prevMonth = plData?.current_month?.prev_month?.total;
    if (!prevMonth) return 0;
    if ((prevMonth as any).discount_rate !== undefined) return (prevMonth as any).discount_rate;
    if (prevMonth.tag_sales > 0) {
      return ((prevMonth.tag_sales - prevMonth.net_sales) / prevMonth.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // 누적 할인 금액 계산 (cumulative에 discount가 없는 경우)
  const cumulativeDiscount = useMemo(() => {
    const cumulative = plData?.cumulative?.total;
    if (!cumulative) return 0;
    if ((cumulative as any).discount !== undefined) return (cumulative as any).discount;
    if (cumulative.tag_sales > 0) {
      return cumulative.tag_sales - cumulative.net_sales;
    }
    return 0;
  }, [plData]);

  // 전년 누적 할인율 계산
  const prevCumulativeDiscountRate = useMemo(() => {
    const prevCumulative = plData?.cumulative?.prev_cumulative?.total;
    if (!prevCumulative) return 0;
    if ((prevCumulative as any).discount_rate !== undefined) return (prevCumulative as any).discount_rate;
    if (prevCumulative.tag_sales > 0) {
      return ((prevCumulative.tag_sales - prevCumulative.net_sales) / prevCumulative.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // 채널별 데이터
  const twRetail = countryChannel?.TW_Retail || {};
  const twOutlet = countryChannel?.TW_Outlet || {};
  const twOnline = countryChannel?.TW_Online || {};

  // 채널별 할인율 계산
  const channelDiscountRates = useMemo(() => {
    const channelTotals: { [key: string]: { currentGross: number, currentNet: number, previousGross: number, previousNet: number } } = {
      Retail: { currentGross: 0, currentNet: 0, previousGross: 0, previousNet: 0 },
      Outlet: { currentGross: 0, currentNet: 0, previousGross: 0, previousNet: 0 },
      Online: { currentGross: 0, currentNet: 0, previousGross: 0, previousNet: 0 }
    };

    allTWStores.forEach((store: any) => {
      const channel = store.channel;
      if (channel && channelTotals[channel]) {
        // 당월 데이터
        if (store.current && store.current.gross_sales > 0) {
          channelTotals[channel].currentGross += (store.current.gross_sales || 0);
          channelTotals[channel].currentNet += (store.current.net_sales || 0);
        }
        // 전년 데이터 (2410)
        if (store.previous && store.previous.gross_sales > 0) {
          channelTotals[channel].previousGross += (store.previous.gross_sales || 0);
          channelTotals[channel].previousNet += (store.previous.net_sales || 0);
        }
      }
    });

    // 최종 할인율 계산: (gross - net) / gross * 100
    const result: { [key: string]: { current: number, previous: number } } = {};
    Object.keys(channelTotals).forEach(channel => {
      const totals = channelTotals[channel];
      result[channel] = {
        current: totals.currentGross > 0 ? ((totals.currentGross - totals.currentNet) / totals.currentGross) * 100 : 0,
        previous: totals.previousGross > 0 ? ((totals.previousGross - totals.previousNet) / totals.previousGross) * 100 : 0
      };
    });

    return result;
  }, [allTWStores]);

  // 숫자 포맷팅 헬퍼
  const formatNumber = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toFixed(decimals);
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
            <h1 className="text-2xl font-bold mb-1">대만법인 25년 10월 경영실적</h1>
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
                    <span className="font-semibold">온라인 성장:</span> 매출 {formatNumber((twOnline?.current?.net_sales || 0) / 1000)}K 
                    (<span className="bg-blue-100 px-1 rounded font-bold">YOY {formatPercent(twOnline?.yoy)}%</span>, 비중 {formatPercent(((twOnline?.current?.net_sales || 0) / (salesSummary?.total_net_sales || 1)) * 100, 1)}%), 
                    직접이익 {formatNumber(plData?.channel_direct_profit?.tw_online?.direct_profit || 0)}K ({formatPercent(plData?.channel_direct_profit?.tw_online?.yoy || 0)}%) - 
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
                    <span className="font-semibold">{(pl?.operating_profit || 0) >= 0 ? '영업이익' : '영업손실'} {(pl?.operating_profit || 0) >= 0 && (plChange?.operating_profit || 0) >= 0 ? '개선' : (pl?.operating_profit || 0) < 0 ? '악화' : '전환'}:</span> 
                    <span className={`px-1 rounded font-bold ${(pl?.operating_profit || 0) >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>{formatNumber(pl?.operating_profit || 0)}K</span> 
                    (전년 {formatNumber(plData?.current_month?.prev_month?.total?.operating_profit || 0)}K), {(pl?.operating_profit || 0) >= 0 ? '흑자' : '적자'} <span className={`px-1 rounded font-bold ${(plChange?.operating_profit || 0) >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>{formatNumber(Math.abs(plChange?.operating_profit || 0))}K {(plChange?.operating_profit || 0) >= 0 ? '증가' : '감소'}</span>
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">과시즌 FW 재고:</span> {formatNumber(pastSeasonFW?.total?.current || 0)}K 
                    (<span className="bg-red-200 px-1 rounded font-bold">YOY {formatPercent(pastSeasonFW?.total?.yoy || 0)}%</span>), 
                    1년차 24FW {formatNumber(pastSeasonFW?.by_year?.['1년차']?.current?.stock_price || 0)}K ({formatPercent(pastSeasonFW?.by_year?.['1년차']?.yoy || 0)}%), 
                    2년차 23FW {formatNumber(pastSeasonFW?.by_year?.['2년차']?.current?.stock_price || 0)}K 
                    (<span className="bg-red-200 px-1 rounded font-bold">{formatPercent(pastSeasonFW?.by_year?.['2년차']?.yoy || 0)}%</span>)
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">오프라인 성장:</span> 매출 {formatNumber(((twRetail?.current?.net_sales || 0) + (twOutlet?.current?.net_sales || 0)) / 1000)}K 
                    (<span className="bg-orange-200 px-1 rounded font-bold">YOY {formatPercent(((twRetail?.yoy || 0) + (twOutlet?.yoy || 0)) / 2)}%</span>), 
                    직접이익 {formatNumber(plData?.channel_direct_profit?.tw_offline?.direct_profit || 0)}K 
                    (<span className="bg-orange-200 px-1 rounded font-bold">{formatPercent(plData?.channel_direct_profit?.tw_offline?.yoy || 0)}%</span>)
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
                    <span className="font-semibold">적자매장:</span> TW Retail 및 Outlet 매장 모니터링 필요
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
                      MT({formatPercent((pastSeasonFW as any)?.['1year_subcategory']?.MT?.yoy || 0)}%), 
                      JP({formatPercent((pastSeasonFW as any)?.['1year_subcategory']?.JP?.yoy || 0)}%)
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
                    <span className="bg-purple-100 px-1 rounded font-bold">YOY {formatPercent(twOnline?.yoy || 0)}%</span> 성장 모멘텀 유지, 디지털 마케팅 강화
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 대만법인 경영실적 (5개 카드) */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🏢</span>
              대만법인 경영실적 (MLB 기준)
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
                    <span>TW (대만)</span>
                    <span className="text-red-600">
                      {formatNumber(((twRetail?.current?.net_sales || 0) + (twOutlet?.current?.net_sales || 0) + (twOnline?.current?.net_sales || 0)) / 1000)} 
                      ({formatPercent(((twRetail?.yoy || 0) + (twOutlet?.yoy || 0) + (twOnline?.yoy || 0)) / 3)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">
                      {formatNumber((twRetail?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(twRetail?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">
                      {formatNumber((twOutlet?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(twOutlet?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold">
                      {formatNumber((twOnline?.current?.net_sales || 0) / 1000)} 
                      <span className="text-green-600"> ({formatPercent(twOnline?.yoy || 0)}%)</span>
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
              <div className={`text-3xl font-bold mb-2 ${(pl?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(pl?.operating_profit || 0)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className={(pl?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {(pl?.operating_profit || 0) >= 0 ? '흑자' : '적자'}{(pl?.operating_profit || 0) >= 0 && (plChange?.operating_profit || 0) >= 0 ? '개선' : (pl?.operating_profit || 0) < 0 ? '악화' : '전환'}
                </span> | <span className={(pl?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>이익률 {formatPercent((pl as any)?.operating_profit_rate, 1)}%</span>
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
                    <span className="text-gray-600">TW 오프라인</span>
                    <span className="font-semibold text-red-600">
                      {formatNumber(plData?.channel_direct_profit?.tw_offline?.direct_profit || 0)} 
                      <span className="text-green-600"> ({plData?.channel_direct_profit?.tw_offline?.status || ''})</span> 
                      <span className="text-red-600"> [{formatPercent(plData?.channel_direct_profit?.tw_offline?.direct_profit_rate || 0, 1)}%]</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">TW 온라인</span>
                    <span className="font-semibold">
                      {formatNumber(plData?.channel_direct_profit?.tw_online?.direct_profit || 0)} 
                      <span className="text-green-600"> ({formatPercent(plData?.channel_direct_profit?.tw_online?.yoy || 0)}%)</span> 
                      <span className="text-blue-600"> [{formatPercent(plData?.channel_direct_profit?.tw_online?.direct_profit_rate || 0, 1)}%]</span>
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
                          <td className="py-1 px-2 text-gray-700 pl-4">- 할인 ({formatPercent((pl as any)?.discount_rate)}%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber((pl as any)?.discount)}</td>
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
                          <td className="py-1 px-2 text-gray-700 pl-4">- 매출원가 ({formatPercent((pl as any)?.cogs_rate)}%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.cogs)}</td>
                          <td className="text-right py-1 px-2 text-red-600">{formatPercent(plYoy?.cogs)}%</td>
                          <td className="text-right py-1 px-2 text-red-600">△{formatNumber(Math.abs(plChange?.cogs || 0))}</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="py-1.5 px-2 text-green-800 border-t border-green-200">= 매출총이익 ({formatPercent((pl as any)?.gross_profit_rate)}%)</td>
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
                          <td className="py-1.5 px-2 text-orange-800 border-t border-yellow-200">= 직접이익 ({formatPercent((pl as any)?.direct_profit_rate)}%)</td>
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
                          <td className="py-1.5 px-2 text-red-800 border-t-2 border-red-300">= 영업이익 ({formatPercent((pl as any)?.operating_profit_rate)}%)</td>
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
                                          const prevValue = otherDetailPrev[key] || 0;
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
                                          const prevValue = otherDetailPrev[key] || 0;
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
                {formatPercent((pl as any)?.discount_rate || 0)}%
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatPercent(prevMonthDiscountRate)}%</span> | 
                <span className="text-green-600"> 전년비 {formatPercent(((pl as any)?.discount_rate || 0) - prevMonthDiscountRate)}%p</span>
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
                    <span className="text-gray-600">TW (대만)</span>
                    <span className="font-semibold text-purple-600">
                      {formatPercent(plData?.current_month?.total?.discount_rate || 0)}%
                      <span className="text-gray-500"> (전년비 {formatPercent(((plData?.current_month?.total as any)?.discount_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.discount_rate || 0))}%p)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">
                      {formatPercent(channelDiscountRates?.Retail?.current || 0)}%
                      <span className="text-gray-500"> (전년 {formatPercent(channelDiscountRates?.Retail?.previous || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">
                      {formatPercent(channelDiscountRates?.Outlet?.current || 0)}%
                      <span className="text-gray-500"> (전년 {formatPercent(channelDiscountRates?.Outlet?.previous || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold">
                      {formatPercent(channelDiscountRates?.Online?.current || 0)}%
                      <span className="text-gray-500"> (전년 {formatPercent(channelDiscountRates?.Online?.previous || 0)}%)</span>
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
                        {formatNumber(cumulativeDiscount)}K
                        <span className="text-gray-500"> (전년비 {formatPercent((plData?.cumulative?.total?.discount_rate || 0) - prevCumulativeDiscountRate)}%p)</span>
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
                {formatNumber((offlineEfficiency?.total?.current?.sales_per_store || 0) / 1000)}
              </div>
              <div className="text-sm text-green-600 font-semibold mb-3">
                YOY {formatPercent(offlineEfficiency?.total?.yoy)}% 
                (전년 {formatNumber((offlineEfficiency?.total?.previous?.sales_per_store || 0) / 1000)})
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
                    {Object.entries(channelEfficiency).map(([key, channel]: [string, any]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-600">
                          TW {key}
                        </span>
                        <span className="font-semibold">
                          {formatNumber((channel?.current?.sales_per_store || 0) / 1000)} 
                          <span className="text-gray-500"> (전년 {formatNumber((channel?.previous?.sales_per_store || 0) / 1000)})</span>
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
                        <div>• <span className="font-semibold">당월:</span> 정상 운영 매장만 포함 (종료/리뉴얼 매장 제외)</div>
                        <div>• <span className="font-semibold">전년 동월:</span> 모든 매장 포함</div>
                        <div>• <span className="font-semibold">온라인 채널:</span> 제외 (오프라인 매장 효율성)</div>
                        <div>• <span className="font-semibold">계산식:</span> 오프라인 실판매출 ÷ 오프라인 매장수</div>
                        {(storeChanges.newStores.length > 0 || storeChanges.closedStores.length > 0 || storeChanges.renovatedStores.length > 0) && (
                          <div className="mt-2 pt-2 border-t border-indigo-200">
                            {storeChanges.newStores.length > 0 && (
                              <div className="mb-1">
                                <span className="font-semibold text-green-700">신규 매장:</span> {storeChanges.newStores.join(', ')}
                              </div>
                            )}
                            {storeChanges.closedStores.length > 0 && (
                              <div className="mb-1">
                                <span className="font-semibold text-red-700">종료 매장:</span> {storeChanges.closedStores.join(', ')}
                              </div>
                            )}
                            {storeChanges.renovatedStores.length > 0 && (
                              <div>
                                <span className="font-semibold text-orange-700">리뉴얼 매장:</span> {storeChanges.renovatedStores.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
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
                      // 전년 데이터는 subcategory_top5 또는 subcategory_detail에서 찾기
                      const prevItemTop5 = seasonSales?.previous_season_f?.october?.subcategory_top5?.find((p: any) => p.subcategory_code === item.subcategory_code);
                      const prevItemDetail = seasonSales?.previous_season_f?.october?.subcategory_detail?.find((p: any) => p.subcategory_code === item.subcategory_code);
                      const prevItem = prevItemTop5 || prevItemDetail;
                      const yoy = prevItem && prevItem.net_sales > 0 ? ((item.net_sales / prevItem.net_sales) * 100) : 999;
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
                {formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate || 0, 1)}%
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatPercent(seasonSales?.previous_season_f?.accumulated?.sales_rate || 0, 1)}%</span> | 
                <span className={(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}> 
                  전년비 {(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0) >= 0 ? '+' : ''}{formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0, 1)}%p
                </span>
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
                                    • <span className="font-semibold">T/SHIRTS</span>: 판매율 {formatPercent(tsItem.sales_rate, 1)}%
                                  </div>
                                )}
                                {ptItem && (
                                  <div>
                                    • <span className="font-semibold">PANTS</span>: 판매율 {formatPercent(ptItem.sales_rate, 1)}%
                                  </div>
                                )}
                                <div className="pt-1 border-t border-red-300">→ <span className="font-semibold">26SS 조기운영</span>으로 대응 (대만 시장 특성 반영)</div>
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
                              <span className={(item.sales_rate || 0) > 30 ? 'text-green-600' : 'text-red-600'}> {formatPercent(item.sales_rate || 0, 1)}%</span>
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
                                {formatNumber(sales.net_sales || 0)} 
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
                            return categories.reduce((sum, key) => sum + (accStock?.october_sales ? ((accStock.october_sales as any)[key]?.net_sales || 0) : 0), 0);
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
                      {formatNumber(endingInventory?.by_season?.['당시즌_의류']?.current?.stock_price || 0)} 
                      <span className={yoySeasonF >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(yoySeasonF)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">당시즌 SS (25S)</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.by_season?.['당시즌_SS']?.current?.stock_price || 0)} 
                      <span className={yoySeasonS >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(yoySeasonS)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 FW</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.by_season?.['과시즌_FW']?.current?.stock_price || 0)} 
                      <span className="text-red-600"> ({formatPercent(yoyPastF)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 SS</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0)} 
                      <span className="text-red-600"> ({formatPercent(yoyPastS)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">악세 합계</span>
                    <span className="font-semibold">
                      {formatNumber(((endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.BAG?.current?.stock_price || 0)))} 
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
                      {formatNumber(endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0)} 
                      <span className="text-green-600"> ({formatPercent(yoyShoes)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">모자 (HEA)</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0)} 
                      <span className="text-green-600"> ({formatPercent(yoyHat)}%)</span>
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
                    <div>
                      <button
                        onClick={() => setShowYear1Detail(!showYear1Detail)}
                        className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                      >
                        <span className="text-gray-600">1년차 (24FW)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatNumber(pastSeasonFW?.by_year?.['1년차']?.current?.stock_price || 0)} 
                            <span className="text-green-600"> ({formatPercent(pastSeasonFW?.by_year?.['1년차']?.yoy || 0)}%)</span>
                          </span>
                          {showYear1Detail ? (
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                      </button>
                      {/* 1년차 subcategory top5 */}
                      {showYear1Detail && (pastSeasonFW?.by_year?.['1년차']?.subcategory_top5 || []).length > 0 && (
                        <div className="mt-2 ml-2 pt-2 border-l-2 border-gray-200 pl-2 space-y-1">
                          {(pastSeasonFW?.by_year?.['1년차']?.subcategory_top5 || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600">{item.subcategory_code}</span>
                              <span className="font-semibold">
                                {formatNumber(item.stock_price || 0)}K
                                <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                              </span>
                            </div>
                          ))}
                          {/* Top5 제외 나머지 */}
                          {pastSeasonFW?.by_year?.['1년차']?.others && (
                            <div className="pt-1 border-t border-gray-200 mt-1">
                              <button
                                onClick={() => setShowYear1OthersDetail(!showYear1OthersDetail)}
                                className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                              >
                                <span className="text-gray-500 italic">기타</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {formatNumber(pastSeasonFW.by_year['1년차'].others.stock_price || 0)}K
                                    <span className={pastSeasonFW.by_year['1년차'].others.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(pastSeasonFW.by_year['1년차'].others.yoy || 0)}%)</span>
                                  </span>
                                  {showYear1OthersDetail ? (
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                              </button>
                              {/* 기타 항목 상세 내역 */}
                              {showYear1OthersDetail && (pastSeasonFW?.by_year?.['1년차']?.others?.subcategory_top5 || []).length > 0 && (
                                <div className="mt-1 ml-3 pt-1 border-l-2 border-gray-300 pl-2 space-y-1">
                                  {(pastSeasonFW.by_year['1년차'].others.subcategory_top5 || []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span className="text-gray-600">{item.subcategory_code}</span>
                                      <span className="font-semibold">
                                        {formatNumber(item.stock_price || 0)}K
                                        <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => setShowYear2Detail(!showYear2Detail)}
                        className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                      >
                        <span className="text-gray-600">2년차 (23FW)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatNumber(pastSeasonFW?.by_year?.['2년차']?.current?.stock_price || 0)} 
                            <span className="text-red-600"> ({formatPercent(pastSeasonFW?.by_year?.['2년차']?.yoy || 0)}%)</span>
                          </span>
                          {showYear2Detail ? (
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                      </button>
                      {/* 2년차 subcategory top5 */}
                      {showYear2Detail && (pastSeasonFW?.by_year?.['2년차']?.subcategory_top5 || []).length > 0 && (
                        <div className="mt-2 ml-2 pt-2 border-l-2 border-gray-200 pl-2 space-y-1">
                          {(pastSeasonFW?.by_year?.['2년차']?.subcategory_top5 || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600">{item.subcategory_code}</span>
                              <span className="font-semibold">
                                {formatNumber(item.stock_price || 0)}K
                                <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                              </span>
                            </div>
                          ))}
                          {/* Top5 제외 나머지 */}
                          {pastSeasonFW?.by_year?.['2년차']?.others && (
                            <div className="pt-1 border-t border-gray-200 mt-1">
                              <button
                                onClick={() => setShowYear2OthersDetail(!showYear2OthersDetail)}
                                className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                              >
                                <span className="text-gray-500 italic">기타</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {formatNumber(pastSeasonFW.by_year['2년차'].others.stock_price || 0)}K
                                    <span className={pastSeasonFW.by_year['2년차'].others.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(pastSeasonFW.by_year['2년차'].others.yoy || 0)}%)</span>
                                  </span>
                                  {showYear2OthersDetail ? (
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                              </button>
                              {/* 기타 항목 상세 내역 */}
                              {showYear2OthersDetail && (pastSeasonFW?.by_year?.['2년차']?.others?.subcategory_top5 || []).length > 0 && (
                                <div className="mt-1 ml-3 pt-1 border-l-2 border-gray-300 pl-2 space-y-1">
                                  {(pastSeasonFW.by_year['2년차'].others.subcategory_top5 || []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span className="text-gray-600">{item.subcategory_code}</span>
                                      <span className="font-semibold">
                                        {formatNumber(item.stock_price || 0)}K
                                        <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">3년차 이상 (22FW~)</span>
                      <span className="font-semibold">
                        {formatNumber(pastSeasonFW?.by_year?.['3년차 이상']?.current?.stock_price || 0)} 
                        <span className="text-red-600"> ({formatPercent(pastSeasonFW?.by_year?.['3년차 이상']?.yoy || 0)}%)</span>
                      </span>
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
            <div className={`p-3 rounded border-l-4 ${(pl?.operating_profit || 0) >= 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                <strong>당월:</strong> {(pl?.operating_profit || 0) >= 0 ? '영업이익' : '영업손실'} {formatNumber(Math.abs(pl?.operating_profit || 0))}K HKD, 영업이익률 {formatPercent((pl as any)?.operating_profit_rate || 0)}%
              </p>
              <p className="text-xs text-gray-700">
                {(pl?.operating_profit || 0) >= 0 ? '흑자' : '적자'} {(pl?.operating_profit || 0) >= 0 && (plChange?.operating_profit || 0) >= 0 ? '개선' : (pl?.operating_profit || 0) < 0 ? '악화' : '전환'} 원인: ① 매출 YOY {formatPercent(plYoy?.net_sales || 0)}% (오프라인 YOY {formatPercent((plData?.current_month?.offline?.net_sales || 0) / (plData?.current_month?.prev_month?.offline?.net_sales || 1) * 100)}%) ② 영업비 YOY {formatPercent(plYoy?.sg_a || 0)}% (+{formatNumber(plChange?.sg_a || 0)}K) ③ 직접이익 YOY {formatPercent(plYoy?.direct_profit || 0)}% (직접이익률 {formatPercent((pl as any)?.direct_profit_rate || 0, 1)}% → {formatPercent((plData?.current_month?.prev_month?.total as any)?.direct_profit_rate || 0, 1)}%)
              </p>
            </div>
            <div className={`p-3 rounded border-l-4 ${(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                <strong>누적:</strong> {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? '영업이익' : '영업손실'} {formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))}K HKD, 영업이익률 {formatPercent((plData?.cumulative?.total as any)?.operating_profit_rate || 0)}%
              </p>
              <p className="text-xs text-gray-700">
                {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? '흑자' : '적자'} {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? '유지' : '지속'}: ① 매출 YOY {formatPercent(plData?.cumulative?.yoy?.net_sales || 0)}% (전년비 △{formatNumber(plData?.cumulative?.change?.net_sales || 0)}K) ② 영업비 YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}% (+{formatNumber(plData?.cumulative?.change?.sg_a || 0)}K) ③ 직접이익 YOY {formatPercent(plData?.cumulative?.yoy?.direct_profit || 0)}% (직접이익률 {formatPercent((plData?.cumulative?.total as any)?.direct_profit_rate || 0)}% → {formatPercent((plData?.cumulative?.prev_cumulative?.total as any)?.direct_profit_rate || 0)}%)
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
                  <th className="p-1 text-center border-r border-gray-300">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center border-r border-gray-300">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center border-r border-gray-300"></th>
                  <th className="p-1 text-center border-r border-gray-300">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center border-r border-gray-300">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300">합계</th>
                  <th className="p-1 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {/* TAG */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">TAG</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.tag_sales || 0) - (plData?.current_month?.prev_month?.offline?.tag_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.tag_sales || 0) - (plData?.current_month?.prev_month?.online?.tag_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.tag_sales || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.offline?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.offline?.tag_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.online?.tag_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber((plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.tag_sales || 0))}</td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.tag_sales || 0)}%</td>
                </tr>
                {/* 실판 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">실판</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.net_sales || 0) - (plData?.current_month?.prev_month?.offline?.net_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.net_sales || 0) - (plData?.current_month?.prev_month?.online?.net_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.net_sales || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.offline?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.offline?.net_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.online?.net_sales || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber((plData?.cumulative?.total?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.net_sales || 0))}</td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.net_sales || 0)}%</td>
                </tr>
                {/* 할인율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">할인율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.offline?.discount_rate || 0) - (plData?.current_month?.prev_month?.offline?.discount_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(((plData?.current_month?.online as any)?.discount_rate || 0) - ((plData?.current_month?.prev_month?.online as any)?.discount_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.current_month?.total as any)?.discount_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.discount_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.offline?.discount_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.discount_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.online?.discount_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.discount_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.cumulative?.total as any)?.discount_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.discount_rate || 0))}%p</td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* (Tag 원가율) */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">(Tag 원가율)</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.offline?.cogs_rate || 0) - (plData?.current_month?.prev_month?.offline?.cogs_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.online?.cogs_rate || 0) - (plData?.current_month?.prev_month?.online?.cogs_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.current_month?.total as any)?.cogs_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.cogs_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.offline?.cogs_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.cogs_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.online?.cogs_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.cogs_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.cumulative?.total as any)?.cogs_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.cogs_rate || 0))}%p</td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 매출총이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.gross_profit || 0) - (plData?.current_month?.prev_month?.offline?.gross_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.gross_profit || 0) - (plData?.current_month?.prev_month?.online?.gross_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.gross_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.change?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.gross_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber((plData?.cumulative?.total?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.gross_profit || 0))}</td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.gross_profit || 0)}%</td>
                </tr>
                {/* 매출총이익률 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익률</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.offline?.gross_profit_rate || 0) - (plData?.current_month?.prev_month?.offline?.gross_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.online?.gross_profit_rate || 0) - (plData?.current_month?.prev_month?.online?.gross_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.current_month?.total as any)?.gross_profit_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.gross_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.offline?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.gross_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.online?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.gross_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.cumulative?.total as any)?.gross_profit_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.gross_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 직접비 합계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접비 합계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.direct_cost || 0) - (plData?.current_month?.prev_month?.offline?.direct_cost || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.direct_cost || 0) - (plData?.current_month?.prev_month?.online?.direct_cost || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.direct_cost || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.change?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_cost || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber((plData?.cumulative?.total?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0))}</td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.direct_cost || 0)}%</td>
                </tr>
                {/* 직접이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.direct_profit || 0) - (plData?.current_month?.prev_month?.offline?.direct_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.direct_profit || 0) - (plData?.current_month?.prev_month?.online?.direct_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.direct_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.change?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber((plData?.cumulative?.total?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_profit || 0))}</td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.direct_profit || 0)}%</td>
                </tr>
                {/* 직접이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.offline?.direct_profit_rate || 0) - (plData?.current_month?.prev_month?.offline?.direct_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.online?.direct_profit_rate || 0) - (plData?.current_month?.prev_month?.online?.direct_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.current_month?.total as any)?.direct_profit_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.direct_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.offline?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.direct_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.online?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.cumulative?.total as any)?.direct_profit_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.direct_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 영업비 소계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업비 소계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(pl?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.sg_a || 0) - (plData?.current_month?.prev_month?.offline?.sg_a || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.sg_a || 0) - (plData?.current_month?.prev_month?.online?.sg_a || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.sg_a || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.offline?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.offline?.sg_a || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.online?.sg_a || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.change?.sg_a || 0)}</td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}%</td>
                </tr>
                {/* 영업이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익</td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.offline?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.current_month?.offline?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.current_month?.offline?.operating_profit || 0))}{(plData?.current_month?.offline?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.online?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.current_month?.online?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.current_month?.online?.operating_profit || 0))}{(plData?.current_month?.online?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 font-semibold ${(plData?.current_month?.total?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.current_month?.total?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.current_month?.total?.operating_profit || 0))}{(plData?.current_month?.total?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.offline?.operating_profit || 0) - (plData?.current_month?.prev_month?.offline?.operating_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.current_month?.online?.operating_profit || 0) - (plData?.current_month?.prev_month?.online?.operating_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plChange?.operating_profit || 0)}</td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(pl?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(pl?.operating_profit || 0) >= 0 ? '흑자' : '적자'}{(pl?.operating_profit || 0) >= 0 && (plChange?.operating_profit || 0) >= 0 ? '개선' : (pl?.operating_profit || 0) < 0 ? '악화' : '전환'}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.cumulative?.offline?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.cumulative?.offline?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.cumulative?.offline?.operating_profit || 0))}{(plData?.cumulative?.offline?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.cumulative?.online?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.cumulative?.online?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.cumulative?.online?.operating_profit || 0))}{(plData?.cumulative?.online?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 font-semibold ${(plData?.cumulative?.total?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.cumulative?.total?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))}{(plData?.cumulative?.total?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.offline?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.offline?.operating_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber((plData?.cumulative?.online?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.operating_profit || 0))}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.change?.operating_profit || 0)}</td>
                  <td className={`p-2 text-right ${(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? '흑자유지' : '적자전환'}
                  </td>
                </tr>
                {/* 영업이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.offline?.operating_profit_rate || 0) - (plData?.current_month?.prev_month?.offline?.operating_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.current_month?.online?.operating_profit_rate || 0) - (plData?.current_month?.prev_month?.online?.operating_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.current_month?.total as any)?.operating_profit_rate || 0) - ((plData?.current_month?.prev_month?.total as any)?.operating_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.offline?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.operating_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent((plData?.cumulative?.online?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.operating_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(((plData?.cumulative?.total as any)?.operating_profit_rate || 0) - ((plData?.cumulative?.prev_cumulative?.total as any)?.operating_profit_rate || 0))}%p</td>
                  <td className="p-2 text-right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 월별 추세 그래프 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* ① 2025년 채널별 실판매출 추세 (1K HKD) */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            2025년 채널별 실판매출 추세 (1K HKD)
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={(dashboardData?.monthly_channel_data || []).map((item: any) => ({
                month: `${item.period.slice(2, 4)}월`,
                'TW Retail': Math.round((item.TW_Retail || 0) / 1000),
                'TW Outlet': Math.round((item.TW_Outlet || 0) / 1000),
                'TW Online': Math.round((item.TW_Online || 0) / 1000),
                total: Math.round((item.total || 0) / 1000),
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
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 26000]}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                formatter={(value: any, name: string) => [
                  `${Math.round(value).toLocaleString()}K HKD`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '11px',
                }}
              />

              {/* 비중 % 레이블 */}
              <Bar dataKey="TW Retail" stackId="a" fill="#93C5FD">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const v = (item.TW_Retail || 0) / 1000;
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text
                      key={`label-tw-retail-${index}`}
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
              <Bar dataKey="TW Outlet" stackId="a" fill="#C4B5FD">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const v = (item.TW_Outlet || 0) / 1000;
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text
                      key={`label-tw-outlet-${index}`}
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
              <Bar dataKey="TW Online" stackId="a" fill="#F9A8D4">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const v = (item.TW_Online || 0) / 1000;
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text
                      key={`label-tw-online-${index}`}
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
            </BarChart>
          </ResponsiveContainer>

          {/* 채널 선택 버튼 */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', color: '#E5E7EB' },
              { name: 'TW Retail', color: '#93C5FD' },
              { name: 'TW Outlet', color: '#C4B5FD' },
              { name: 'TW Online', color: '#F9A8D4' },
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
                  color: '#000000',
                }}
              >
                {channel.name}
              </button>
            ))}
          </div>

          {/* 채널 YOY 라인차트 + 테이블 (홍콩 구조 그대로, 키만 TW로) */}
          {selectedChannel && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-gray-600">선택된 채널: {selectedChannel}</div>
              {selectedChannel === '전체' ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={(dashboardData?.monthly_channel_data || []).map((item: any, idx: number) => ({
                      month: `${item.period.slice(2, 4)}월`,
                      twRetail: dashboardData?.monthly_channel_yoy?.['TW_Retail']?.[idx] || 0,
                      twOutlet: dashboardData?.monthly_channel_yoy?.['TW_Outlet']?.[idx] || 0,
                      twOnline: dashboardData?.monthly_channel_yoy?.['TW_Online']?.[idx] || 0,
                    }))}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="twRetail"
                      stroke="#93C5FD"
                      strokeWidth={2}
                      name="TW Retail"
                    />
                    <Line
                      type="monotone"
                      dataKey="twOutlet"
                      stroke="#C4B5FD"
                      strokeWidth={2}
                      name="TW Outlet"
                    />
                    <Line
                      type="monotone"
                      dataKey="twOnline"
                      stroke="#F9A8D4"
                      strokeWidth={2}
                      name="TW Online"
                    />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={(dashboardData?.monthly_channel_data || []).map((item: any, idx: number) => {
                      const channelKey = selectedChannel.replace(' ', '_'); // 'TW Retail' -> 'TW_Retail'
                      return {
                        month: `${item.period.slice(2, 4)}월`,
                        yoy: dashboardData?.monthly_channel_yoy ? ((dashboardData.monthly_channel_yoy as any)[channelKey]?.[idx] || 0) : 0,
                      };
                    })}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="yoy"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name={`${selectedChannel} YOY`}
                    />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* YOY 테이블 */}
              <div className="mt-4">
                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-left font-semibold">
                        {selectedChannel === '전체' ? '채널' : selectedChannel}
                      </th>
                      {(dashboardData?.monthly_channel_data || []).map((item: any) => (
                        <th
                          key={item.period}
                          className="border border-gray-300 px-1 py-1 text-center font-semibold"
                        >
                          {`${item.period.slice(2, 4)}월`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChannel === '전체' ? (
                      <>
                        {['TW Retail', 'TW Outlet', 'TW Online'].map((channel) => {
                          const channelKey = channel.replace(' ', '_');
                          return (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">
                                {channel}
                              </td>
                              {((dashboardData?.monthly_channel_yoy ? (dashboardData.monthly_channel_yoy as any)[channelKey] : undefined) || []).map(
                                (yoy: number, idx: number) => (
                                  <td
                                    key={idx}
                                    className={`border border-gray-300 px-1 py-1 text-center font-bold ${
                                      yoy >= 100 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {yoy}%
                                  </td>
                                ),
                              )}
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">
                          YOY
                        </td>
                        {((dashboardData?.monthly_channel_yoy ? (dashboardData.monthly_channel_yoy as any)[selectedChannel.replace(' ', '_')] : undefined) || []
                        ).map((yoy: number, idx: number) => (
                          <td
                            key={idx}
                            className={`border border-gray-300 px-1 py-1 text-center font-bold ${
                              yoy >= 100 ? 'text-green-600' : 'text-red-600'
                            }`}
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
        </div>

        {/* ② 2025년 아이템별 실판매출 추세 (1K HKD) */}
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
            {(!dashboardData?.monthly_item_data ||
              dashboardData.monthly_item_data.length === 0) ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                monthly_item_data가 없습니다. 데이터를 생성해주세요.
              </div>
            ) : salesPriceType === '할인율' ? (
              <LineChart
                data={(dashboardData?.monthly_item_data || []).map((item: any) => {
                  const calc = (gross: number, net: number): string => {
                    if (gross === 0) return "0";
                    return ((gross - net) / gross * 100).toFixed(1);
                  };
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    당시즌F: parseFloat(calc(item.당시즌F?.gross_sales || 0, item.당시즌F?.net_sales || 0)),
                    당시즌S: parseFloat(calc(item.당시즌S?.gross_sales || 0, item.당시즌S?.net_sales || 0)),
                    과시즌F: parseFloat(calc(item.과시즌F?.gross_sales || 0, item.과시즌F?.net_sales || 0)),
                    과시즌S: parseFloat(calc(item.과시즌S?.gross_sales || 0, item.과시즌S?.net_sales || 0)),
                    모자: parseFloat(calc(item.모자.gross_sales, item.모자.net_sales)),
                    신발: parseFloat(calc(item.신발.gross_sales, item.신발.net_sales)),
                    가방외: parseFloat(calc(item.가방외.gross_sales, item.가방외.net_sales)),
                  };
                })}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 70]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [`${value}%`, name]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="당시즌F"
                  stroke="#34D399"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="당시즌F"
                />
                <Line
                  type="monotone"
                  dataKey="당시즌S"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="당시즌S"
                />
                <Line
                  type="monotone"
                  dataKey="과시즌F"
                  stroke="#FCA5A5"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="과시즌F"
                />
                <Line
                  type="monotone"
                  dataKey="과시즌S"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="과시즌S"
                />
                <Line
                  type="monotone"
                  dataKey="모자"
                  stroke="#93C5FD"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="모자"
                />
                <Line
                  type="monotone"
                  dataKey="신발"
                  stroke="#FCD34D"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="신발"
                />
                <Line
                  type="monotone"
                  dataKey="가방외"
                  stroke="#C4B5FD"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="가방외"
                />
              </LineChart>
            ) : (
              <BarChart
                data={(dashboardData?.monthly_item_data || []).map((item: any) => {
                  const 당시즌F = Math.round(
                    (salesPriceType === '실판'
                      ? item.당시즌F?.net_sales
                      : item.당시즌F?.gross_sales || 0) / 1000,
                  );
                  const 당시즌S = Math.round(
                    (salesPriceType === '실판'
                      ? item.당시즌S?.net_sales
                      : item.당시즌S?.gross_sales || 0) / 1000,
                  );
                  const 과시즌F = Math.round(
                    (salesPriceType === '실판'
                      ? item.과시즌F?.net_sales
                      : item.과시즌F?.gross_sales || 0) / 1000,
                  );
                  const 과시즌S = Math.round(
                    (salesPriceType === '실판'
                      ? item.과시즌S?.net_sales
                      : item.과시즌S?.gross_sales || 0) / 1000,
                  );
                  const 모자 = Math.round(
                    (salesPriceType === '실판' ? item.모자.net_sales : item.모자.gross_sales) /
                      1000,
                  );
                  const 신발 = Math.round(
                    (salesPriceType === '실판' ? item.신발.net_sales : item.신발.gross_sales) /
                      1000,
                  );
                  const 가방외 = Math.round(
                    (salesPriceType === '실판'
                      ? item.가방외.net_sales
                      : item.가방외.gross_sales) / 1000,
                  );
                  const total =
                    당시즌F + 당시즌S + 과시즌F + 과시즌S + 모자 + 신발 + 가방외;
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    당시즌F,
                    당시즌S,
                    과시즌F,
                    과시즌S,
                    모자,
                    신발,
                    가방외,
                    total,
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
                  domain={[0, 26000]}
                  ticks={[0, 13000, 26000]}
                  tickFormatter={(value) => value.toLocaleString()}
                  allowDecimals={false}
                  width={60}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${Math.round(value).toLocaleString()}K HKD`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '11px',
                  }}
                />
                {/* 레이블 부분은 기존 대만 코드 그대로 써도 무방 */}
                <Bar dataKey="당시즌F" stackId="a" fill="#34D399" />
                <Bar dataKey="당시즌S" stackId="a" fill="#10B981" />
                <Bar dataKey="과시즌F" stackId="a" fill="#FCA5A5" />
                <Bar dataKey="과시즌S" stackId="a" fill="#EF4444" />
                <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
                <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
                <Bar dataKey="가방외" stackId="a" fill="#C4B5FD" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* ③ 2025년 월별 아이템별 재고 추세 (TAG, 1K HKD) */}
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
                    const yoyData = (inventoryYOY as any)[itemKey] || [];
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
                              const yoyValue = (inventoryYOY as any)[itemKey]?.[idx];
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
          </div>
          
          <div className="grid grid-cols-4 gap-4 w-full">
            {/* 전체 매장 요약 */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 min-w-0">
              <h4 className="text-sm font-bold text-gray-800 mb-3">오프라인 매장 요약</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {totalStoreCurrent}개 매장
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    실판매출 YOY {formatYoy(totalSalesPerStoreYoy)}%
                  </div>
                  <div className="text-[10px] text-gray-400 italic mb-3">
                    * 종료매장·온라인 제외
                  </div>
                </div>
                <div className="border-t pt-3 space-y-1.5 border-gray-300 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 직접이익</span>
                    <span className={`text-xs font-semibold ${(plData?.channel_direct_profit?.total?.direct_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumber(plData?.channel_direct_profit?.total?.direct_profit || 0)}K HKD
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3 border-gray-300 mb-3">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">채널별 구분</div>
                  <div className="space-y-1.5">
                    {(() => {
                      const retailStores = activeTWStores.filter((s: any) => s.channel === 'Retail');
                      const outletStores = activeTWStores.filter((s: any) => s.channel === 'Outlet');
                      const retailYoy = retailStores.length > 0 
                        ? retailStores.reduce((sum: number, s: any) => sum + s.yoy, 0) / retailStores.length 
                        : 0;
                      const outletYoy = outletStores.length > 0 
                        ? outletStores.reduce((sum: number, s: any) => sum + s.yoy, 0) / outletStores.length 
                        : 0;
                      const retailProfit = retailStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
                      const outletProfit = outletStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
                      return (
                        <>
                          <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                            <span className="text-xs text-gray-700">리테일</span>
                            <span className="text-xs font-semibold text-gray-700">
                              {retailStores.length}개 | YOY {formatYoy(retailYoy)}% | {retailProfit >= 0 ? '+' : ''}{formatNumber(retailProfit)}K
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                            <span className="text-xs text-gray-700">아울렛</span>
                            <span className={`text-xs font-semibold ${outletProfit >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                              {outletStores.length}개 | YOY {formatYoy(outletYoy)}% | {outletProfit >= 0 ? '+' : ''}{formatNumber(outletProfit)}K
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="border-t pt-3 border-gray-300">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">수익성별 매장 수</div>
                  <div className="space-y-1.5">
                    {(() => {
                      const profitableCount = activeTWStores.filter((s: any) => (s.direct_profit || 0) > 0).length;
                      const unprofitableCount = activeTWStores.filter((s: any) => (s.direct_profit || 0) < 0).length;
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">흑자매장</span>
                            <span className="text-xs font-semibold text-green-600">{profitableCount}개</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">적자매장</span>
                            <span className="text-xs font-semibold text-red-600">{unprofitableCount}개</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 대형 흑자매장 */}
            {(() => {
              const cat = storeCategories?.large_profit;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400 min-w-0">
                  <h4 className="text-sm font-bold text-yellow-800 mb-2">대형 흑자매장</h4>
                  <div className="text-xs text-yellow-700 mb-2 font-semibold">직접이익 100K+</div>
                  <div className="space-y-2 text-xs mb-3">
                    {cat.stores.map((store: any, idx: number) => {
                      const netSales = (store.current?.net_sales || 0) / 1000;
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                          <span className="font-semibold text-yellow-900 text-xs">{store.shop_nm}</span>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-600">YOY {formatYoy(store.yoy)}%</div>
                            <div className="text-[10px] text-gray-600">매출 {formatNumber(netSales, 0)}K</div>
                            <div className="font-bold text-yellow-600 text-xs">+{Math.round(store.direct_profit)}K</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-yellow-300 pt-2 mt-3">
                    <div className="text-xs text-yellow-700 mb-1">
                      <span className="font-semibold">대형 흑자매장 ({cat.count}개)</span>: +{formatNumber(cat.total_direct_profit, 0)}K
                    </div>
                    <div className="text-[10px] text-yellow-600">
                      기여도: 전체 직접이익의 {cat.total_direct_profit > 0 && (plData?.channel_direct_profit?.total?.direct_profit || 0) > 0 
                        ? formatRate((cat.total_direct_profit / (plData?.channel_direct_profit?.total?.direct_profit || 1)) * 100)
                        : '0.0'}% 기여
                    </div>
                  </div>
                </div>
              );
            })()}
          
            {/* 중소형 흑자매장 */}
            {(() => {
              const cat = storeCategories?.small_medium_profit;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400 min-w-0">
                  <h4 className="text-sm font-bold text-yellow-800 mb-2">중소형 흑자매장</h4>
                  <div className="text-xs text-yellow-700 mb-2 font-semibold">성장 잠재력</div>
                  <div className="space-y-2 text-xs mb-3">
                    {cat.stores.map((store: any, idx: number) => {
                      const netSales = (store.current?.net_sales || 0) / 1000;
                      const isNewStore = !store.previous || store.previous.net_sales === 0;
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                          <span className="font-semibold text-yellow-900 text-xs">
                            {store.shop_nm}
                            {isNewStore && <span className="text-blue-600 ml-1">(신규)</span>}
                            {store.yoy >= 140 && <span className="text-green-600 ml-1">★</span>}
                          </span>
                          <div className="text-right">
                            <div className="text-[10px] text-gray-600">YOY {isNewStore ? '신규' : formatYoy(store.yoy) + '%'}</div>
                            <div className="text-[10px] text-gray-600">매출 {formatNumber(netSales, 0)}K</div>
                            <div className="font-bold text-yellow-600 text-xs">+{Math.round(store.direct_profit)}K</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-yellow-300 pt-2 mt-3">
                    <div className="text-xs text-yellow-700 mb-1">
                      <span className="font-semibold">중소형 흑자매장 ({cat.count}개)</span>: +{formatNumber(cat.total_direct_profit, 0)}K
                    </div>
                    <div className="text-[10px] text-yellow-600 space-y-0.5">
                      {(() => {
                        const newStores = cat.stores.filter((s: any) => !s.previous || s.previous.net_sales === 0);
                        const highGrowthStores = cat.stores.filter((s: any) => s.yoy >= 140);
                        const notes: string[] = [];
                        if (newStores.length > 0) {
                          notes.push(`${newStores.length}개 신규 매장 빠른 흑자 전환`);
                        }
                        if (highGrowthStores.length > 0) {
                          notes.push(`SKM Tainan 고성장 (YOY ${formatYoy(highGrowthStores[0]?.yoy)}%)`);
                        }
                        notes.push('평균 이익률 개선 여지 큼');
                        return notes.map((note, idx) => (
                          <div key={idx}>• {note}</div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          
            {/* 적자매장 */}
            {(() => {
              const lossCat = storeCategories?.loss_all;
              if (!lossCat || lossCat.count === 0) return null;
              
              const improvingStores = lossCat.improving_stores || [];
              const deterioratingStores = lossCat.deteriorating_stores || [];
              
              return (
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-400 min-w-0">
                  <h4 className="text-sm font-bold text-red-800 mb-2">적자매장</h4>
                  <div className="text-xs text-red-700 mb-3 font-semibold">{lossCat.count}개 매장</div>
                  
                  {/* 매출개선 적자매장 */}
                  {improvingStores.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-red-700 mb-1.5 font-semibold">매출개선 ({improvingStores.length}개)</div>
                      <div className="space-y-1.5">
                        {improvingStores.map((store: any, idx: number) => {
                          const netSales = (store.current?.net_sales || 0) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                              <span className="font-semibold text-red-900 text-xs">{store.shop_nm}</span>
                              <div className="text-right">
                                <div className="text-[10px] text-green-600">YOY {formatYoy(store.yoy)}% ↑</div>
                                <div className="text-[10px] text-gray-600">매출 {formatNumber(netSales, 0)}K</div>
                                <div className="font-bold text-red-600 text-xs">손실 {formatNumber(Math.abs(store.direct_profit || 0), 0)}K</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* 매출악화 적자매장 */}
                  {deterioratingStores.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-red-700 mb-1.5 font-semibold">매출악화 ({deterioratingStores.length}개)</div>
                      <div className="space-y-1.5">
                        {deterioratingStores.map((store: any, idx: number) => {
                          const netSales = (store.current?.net_sales || 0) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                              <span className="font-semibold text-red-900 text-xs">{store.shop_nm}</span>
                              <div className="text-right">
                                <div className="text-[10px] text-red-600">YOY {formatYoy(store.yoy)}% ↓</div>
                                <div className="text-[10px] text-gray-600">매출 {formatNumber(netSales, 0)}K</div>
                                <div className="font-bold text-red-600 text-xs">손실 {formatNumber(Math.abs(store.direct_profit || 0), 0)}K</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-red-300 pt-2 mt-3">
                    <div className="text-xs text-red-700 mb-1">
                      <span className="font-semibold">적자매장 ({lossCat.count}개)</span>: {formatNumber(Math.abs(lossCat.total_direct_profit || 0), 0)}K 손실
                    </div>
                    <div className="text-[10px] text-red-600 flex items-center">
                      <span>우선 조치 계획</span>
                      <span className="ml-1">→</span>
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
                <div className="text-2xl font-bold mb-2 text-indigo-900">{formatNumber(pl?.direct_cost)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.direct_cost || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plYoy?.direct_cost)}% ({plChange?.direct_cost >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(plChange?.direct_cost || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">{formatPercent(((pl?.direct_cost || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">
                      {((pl?.direct_cost || 0) / (pl?.net_sales || 1) * 100) - ((plData?.current_month?.prev_month?.total?.direct_cost || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? '+' : ''}
                      {formatPercent(((pl?.direct_cost || 0) / (pl?.net_sales || 1) * 100) - ((plData?.current_month?.prev_month?.total?.direct_cost || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1) * 100), 1)}%p
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">{formatNumber(plData?.cumulative?.total?.direct_cost)}K</div>
                <div className={`text-xs mb-3 ${(plData?.cumulative?.yoy?.direct_cost || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plData?.cumulative?.yoy?.direct_cost)}% ({plData?.cumulative?.change?.direct_cost >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(plData?.cumulative?.change?.direct_cost || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">{formatPercent(((plData?.cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">
                      {((plData?.cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? '+' : ''}
                      {formatPercent(((plData?.cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100), 1)}%p
                    </span>
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
                    const current: number = 2275;
                    const prev: number = 2141;
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
                    const current: number = 21390;
                    const prev: number = 21354;
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
                    const current: number = 5844;
                    const prev: number = 6101;
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
                    const current: number = 59221;
                    const prev: number = 61960;
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
                    const current: number = 1105;
                    const prev: number = 1410;
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
                    const current: number = 2462;
                    const prev: number = 2425;
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
                    const current: number = 23034;
                    const prev: number = 24197;
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
                <div className="text-2xl font-bold mb-2 text-emerald-900">{formatNumber(pl?.sg_a)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plYoy?.sg_a)}% ({plChange?.sg_a >= 0 ? '+' : ''}{formatNumber(plChange?.sg_a || 0)}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((pl?.sg_a || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((plData?.current_month?.prev_month?.total?.sg_a || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 {((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.current_month?.prev_month?.total?.sg_a || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? '악화' : '개선'}</span>
                    <span className={`text-xs font-semibold ${((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.current_month?.prev_month?.total?.sg_a || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.current_month?.prev_month?.total?.sg_a || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.current_month?.prev_month?.total?.sg_a || 0) / (plData?.current_month?.prev_month?.total?.net_sales || 1) * 100)), 1)}%p
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">{formatNumber(plData?.cumulative?.total?.sg_a)}K</div>
                <div className={`text-xs mb-3 ${(plData?.cumulative?.yoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plData?.cumulative?.yoy?.sg_a)}% ({plData?.cumulative?.change?.sg_a >= 0 ? '+' : ''}{formatNumber(plData?.cumulative?.change?.sg_a || 0)}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 {((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? '악화' : '개선'}</span>
                    <span className={`text-xs font-semibold ${((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100)), 1)}%p
                    </span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.salary)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.salary || 0) / (plData?.current_month?.prev_month?.total?.expense_detail?.salary || 1) * 100)}% ({((pl?.expense_detail?.salary || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.salary || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.salary || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.salary || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.salary || 0) / (pl?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.salary || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
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
                            <span className="text-gray-700">TW Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.salary)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 1) * 100) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.salary || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 0)) >= 0 ? '+' : ''}{formatNumber((plData?.cumulative?.total?.expense_detail?.salary || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.total?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
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
                            <span className="text-gray-700">TW Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.marketing)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.marketing || 0) / (plData?.current_month?.prev_month?.total?.expense_detail?.marketing || 1) * 100)}% ({((pl?.expense_detail?.marketing || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.marketing || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.marketing || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.marketing || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.marketing || 0) / (pl?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.marketing || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.marketing)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 1) * 100) >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.marketing || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 0)) >= 0 ? '+' : '▼'} {formatNumber(Math.abs((plData?.cumulative?.total?.expense_detail?.marketing || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 0)))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.total?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.fee)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.fee || 0) / (plData?.current_month?.prev_month?.total?.expense_detail?.fee || 1) * 100)}% ({((pl?.expense_detail?.fee || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.fee || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.fee || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.fee || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.fee || 0) / (pl?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.fee || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.fee)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 1) * 100) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.fee || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 0)) >= 0 ? '+' : ''}{formatNumber((plData?.cumulative?.total?.expense_detail?.fee || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.total?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.other)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.other || 0) / (plData?.current_month?.prev_month?.total?.expense_detail?.other || 1) * 100)}% ({((pl?.expense_detail?.other || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.other || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.other || 0) - (plData?.current_month?.prev_month?.total?.expense_detail?.other || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">운반비</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(pl?.expense_detail?.other_detail?.logistics || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(pl?.expense_detail?.rent || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(pl?.expense_detail?.other_detail?.depreciation || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(pl?.expense_detail?.travel || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(pl?.expense_detail?.insurance || 0)}K</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.other)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.other || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 1) * 100) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.other || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.other || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 0)) >= 0 ? '+' : ''}{formatNumber((plData?.cumulative?.total?.expense_detail?.other || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">운반비</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.other_detail?.logistics || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.rent || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.other_detail?.depreciation || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.travel || 0)}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.insurance || 0)}K</span>
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

export default TaiwanCEODashboard;


