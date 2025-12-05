'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Home() {
  const [hkData, setHkData] = useState<any>(null);
  const [twData, setTwData] = useState<any>(null);
  const [hkPlData, setHkPlData] = useState<any>(null);
  const [twPlData, setTwPlData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('2510'); // 기본값: 25년 10월
  const [isLoading, setIsLoading] = useState(true);
  const [showHkmcDetail, setShowHkmcDetail] = useState(false);
  const [showTwDetail, setShowTwDetail] = useState(false);

  // Period별 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Period별 파일명 생성
        const hkDashboardPath = `/dashboard/hongkong-dashboard-data-${selectedPeriod}.json`;
        const twDashboardPath = `/dashboard/taiwan-dashboard-data-${selectedPeriod}.json`;
        const hkPlPath = `/dashboard/hongkong-pl-data.json`; // PL 데이터는 period별 파일 없음
        const twPlPath = `/dashboard/taiwan-pl-data.json`; // PL 데이터는 period별 파일 없음

        // Period별 파일 로드 시도, 없으면 기본 파일 사용
        const loadWithFallback = async (periodPath: string, defaultPath: string) => {
          try {
            const res = await fetch(periodPath);
            if (res.ok) {
              return await res.json();
            }
          } catch (e) {
            console.warn(`Period 파일 로드 실패 (${periodPath}), 기본 파일 사용`);
          }
          // 기본 파일 로드
          const defaultRes = await fetch(defaultPath);
          if (defaultRes.ok) {
            return await defaultRes.json();
          }
          throw new Error(`파일을 찾을 수 없습니다: ${defaultPath}`);
        };

        // 모든 데이터 병렬 로드
        const [hkDashboard, twDashboard, hkPl, twPl] = await Promise.all([
          loadWithFallback(hkDashboardPath, '/dashboard/hongkong-dashboard-data.json'),
          loadWithFallback(twDashboardPath, '/dashboard/taiwan-dashboard-data.json'),
          fetch(hkPlPath).then(r => r.json()),
          fetch(twPlPath).then(r => r.json())
        ]);

        // ending_inventory는 components 폴더에서 import
        let hkDefaultData = null;
        let twDefaultData = null;
        try {
          const [hkModule, twModule] = await Promise.all([
            import('@/components/dashboard/hongkong-dashboard-data.json'),
            import('@/components/dashboard/taiwan-dashboard-data.json')
          ]);
          hkDefaultData = hkModule.default || hkModule;
          twDefaultData = twModule.default || twModule;
        } catch (e) {
          console.warn('Components 폴더에서 ending_inventory 로드 실패:', e);
        }

        // 디버깅: 로드된 데이터 확인
        console.log('Period별 파일 로드 결과:', {
          hkDashboard: !!hkDashboard,
          hkHasEndingInventory: !!hkDashboard?.ending_inventory,
          hkDefaultData: !!hkDefaultData,
          hkDefaultHasEndingInventory: !!hkDefaultData?.ending_inventory,
          hkDefaultEndingInventory: hkDefaultData?.ending_inventory?.total
        });

        // period별 파일에 ending_inventory가 없으면 기본 파일에서 가져오기
        if (hkDashboard && !hkDashboard.ending_inventory && hkDefaultData?.ending_inventory) {
          console.log('홍콩 ending_inventory 병합:', hkDefaultData.ending_inventory);
          hkDashboard.ending_inventory = hkDefaultData.ending_inventory;
        }
        if (twDashboard && !twDashboard.ending_inventory && twDefaultData?.ending_inventory) {
          console.log('대만 ending_inventory 병합:', twDefaultData.ending_inventory);
          twDashboard.ending_inventory = twDefaultData.ending_inventory;
        }

        console.log('홍콩 데이터 로드 완료:', {
          hasEndingInventory: !!hkDashboard?.ending_inventory,
          endingInventoryTotal: hkDashboard?.ending_inventory?.total
        });

        setHkData(hkDashboard);
        setTwData(twDashboard);
        setHkPlData(hkPl);
        setTwPlData(twPl);
      } catch (e) {
        console.error('데이터 로드 오류:', e);
        // 에러 발생 시 components 폴더에서 동적 import 시도
        try {
          const [hkModule, twModule, hkPlModule, twPlModule] = await Promise.all([
            import('@/components/dashboard/hongkong-dashboard-data.json'),
            import('@/components/dashboard/taiwan-dashboard-data.json'),
            import('@/components/dashboard/hongkong-pl-data.json'),
            import('@/components/dashboard/taiwan-pl-data.json')
          ]);
          
          setHkData(hkModule.default || hkModule);
          setTwData(twModule.default || twModule);
          setHkPlData(hkPlModule.default || hkPlModule);
          setTwPlData(twPlModule.default || twPlModule);
        } catch (fallbackError) {
          console.error('기본 데이터 로드 오류:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedPeriod]);

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(Number(num))) return '0';
    const value = Number(num);
    if (!isFinite(value)) return '0';
    return Math.round(value).toString();
  };

  const formatNumber = (num: number | undefined | null) => {
    try {
      if (num === undefined || num === null || isNaN(Number(num))) return '0';
      const value = Number(num);
      if (!isFinite(value)) return '0';
      const rounded = Math.round(value / 1000);
      return typeof rounded.toLocaleString === 'function' 
        ? rounded.toLocaleString('ko-KR') 
        : rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } catch (e) {
      return '0';
    }
  };

  // PL 데이터용 포맷 (이미 1K HKD 단위)
  const formatPlNumber = (num: number | undefined | null) => {
    try {
      if (num === undefined || num === null || isNaN(Number(num))) return '0';
      const value = Number(num);
      if (!isFinite(value)) return '0';
      const rounded = Math.round(value);
      return typeof rounded.toLocaleString === 'function' 
        ? rounded.toLocaleString('ko-KR') 
        : rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } catch (e) {
      return '0';
    }
  };

  // 기간 옵션 생성 (24년 1월 ~ 25년 12월)
  const periodOptions = useMemo(() => {
    const options = [];
    // 24년 1월 ~ 12월
    for (let month = 1; month <= 12; month++) {
      const period = `24${String(month).padStart(2, '0')}`;
      const label = `24년 ${month}월`;
      options.push({ value: period, label });
    }
    // 25년 1월 ~ 12월
    for (let month = 1; month <= 12; month++) {
      const period = `25${String(month).padStart(2, '0')}`;
      const label = `25년 ${month}월`;
      options.push({ value: period, label });
    }
    return options;
  }, []);

  // 선택된 기간에서 년도와 월 추출
  const selectedYear = selectedPeriod.substring(0, 2);
  const selectedMonth = parseInt(selectedPeriod.substring(2, 4));
  const periodLabel = `${selectedYear}년 ${selectedMonth}월`;

  // 데이터 로드 확인
  if (isLoading || !hkData || !twData || !hkPlData || !twPlData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600 mb-2">
            {isLoading ? '데이터를 불러오는 중...' : '데이터를 불러올 수 없습니다'}
          </div>
          {isLoading && (
            <div className="mt-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 홍콩 YOY 계산 (net_sales 기준)
  const hkRetail = hkData?.country_channel_summary?.HK_Retail;
  const hkOutlet = hkData?.country_channel_summary?.HK_Outlet;
  const hkOnline = hkData?.country_channel_summary?.HK_Online;
  const moRetail = hkData?.country_channel_summary?.MO_Retail;
  const moOutlet = hkData?.country_channel_summary?.MO_Outlet;

  // 홍콩 오프라인 (Retail + Outlet)
  const hkOfflineCurrent = (hkRetail?.current?.net_sales || 0) + (hkOutlet?.current?.net_sales || 0);
  const hkOfflinePrevious = (hkRetail?.previous?.net_sales || 0) + (hkOutlet?.previous?.net_sales || 0);
  const hkOfflineYoy = hkOfflinePrevious > 0 ? (hkOfflineCurrent / hkOfflinePrevious) * 100 : 0;

  // 홍콩 온라인
  const hkOnlineCurrent = hkOnline?.current?.net_sales || 0;
  const hkOnlinePrevious = hkOnline?.previous?.net_sales || 0;
  const hkOnlineYoy = hkOnlinePrevious > 0 ? (hkOnlineCurrent / hkOnlinePrevious) * 100 : 0;

  // 마카오 (Retail + Outlet)
  const mcCurrent = (moRetail?.current?.net_sales || 0) + (moOutlet?.current?.net_sales || 0);
  const mcPrevious = (moRetail?.previous?.net_sales || 0) + (moOutlet?.previous?.net_sales || 0);
  const mcYoy = mcPrevious > 0 ? (mcCurrent / mcPrevious) * 100 : 0;

  // 홍콩마카오법인 합계
  const hkmcTotalCurrent = hkOfflineCurrent + hkOnlineCurrent + mcCurrent;
  const hkmcTotalPrevious = hkOfflinePrevious + hkOnlinePrevious + mcPrevious;
  const hkmcTotalYoy = hkmcTotalPrevious > 0 ? (hkmcTotalCurrent / hkmcTotalPrevious) * 100 : 0;

  // 홍콩 PL 데이터
  const hkPlCurrent = hkPlData?.current_month?.total;
  const hkPlCumulative = hkPlData?.cumulative?.total;
  const hkPlPrevMonth = hkPlData?.current_month?.prev_month?.total;
  const hkPlPrevCumulative = hkPlData?.cumulative?.prev_cumulative?.total;
  
  // 홍콩 누적 YOY 계산
  const hkCumulativeNetSales = hkPlCumulative?.net_sales || 0;
  const hkPrevCumulativeNetSales = hkPlPrevCumulative?.net_sales || 0;
  const hkCumulativeYoy = hkPrevCumulativeNetSales > 0 
    ? (hkCumulativeNetSales / hkPrevCumulativeNetSales) * 100 
    : 0;

  // 홍콩 재고 데이터 (전체 기말재고)
  const hkStockCurrent = hkData?.ending_inventory?.total?.current || 0;
  const hkStockPrevious = hkData?.ending_inventory?.total?.previous || 0;
  const hkStockYoy = hkStockPrevious > 0 ? (hkStockCurrent / hkStockPrevious) * 100 : 0;
  
  // 디버깅: 재고 데이터 확인
  console.log('홍콩 재고 데이터:', {
    hkStockCurrent,
    hkStockPrevious,
    hkStockYoy,
    rawData: hkData?.ending_inventory
  });

  // 대만 PL 데이터
  const twPlCurrent = twPlData?.current_month?.total;
  const twPlCumulative = twPlData?.cumulative?.total;
  const twPlPrevCumulative = twPlData?.cumulative?.prev_cumulative?.total;
  
  // 대만 누적 YOY 계산
  const twCumulativeNetSales = twPlCumulative?.net_sales || 0;
  const twPrevCumulativeNetSales = twPlPrevCumulative?.net_sales || 0;
  const twCumulativeYoy = twPrevCumulativeNetSales > 0 
    ? (twCumulativeNetSales / twPrevCumulativeNetSales) * 100 
    : 0;

  // 대만 재고 데이터
  const twStockCurrent = twData?.ending_inventory?.total?.current || 0;
  const twStockPrevious = twData?.ending_inventory?.total?.previous || 0;
  const twStockYoy = twStockPrevious > 0 ? (twStockCurrent / twStockPrevious) * 100 : 0;

  // 대만 YOY 계산
  const twRetail = twData?.country_channel_summary?.TW_Retail;
  const twOutlet = twData?.country_channel_summary?.TW_Outlet;
  const twOnline = twData?.country_channel_summary?.TW_Online;

  // 대만 오프라인 (Retail + Outlet)
  const twOfflineCurrent = (twRetail?.current?.net_sales || 0) + (twOutlet?.current?.net_sales || 0);
  const twOfflinePrevious = (twRetail?.previous?.net_sales || 0) + (twOutlet?.previous?.net_sales || 0);
  const twOfflineYoy = twOfflinePrevious > 0 ? (twOfflineCurrent / twOfflinePrevious) * 100 : 0;

  // 대만 온라인
  const twOnlineCurrent = twOnline?.current?.net_sales || 0;
  const twOnlinePrevious = twOnline?.previous?.net_sales || 0;
  const twOnlineYoy = twOnlinePrevious > 0 ? (twOnlineCurrent / twOnlinePrevious) * 100 : 0;

  // 대만법인 합계
  const twTotalCurrent = twOfflineCurrent + twOnlineCurrent;
  const twTotalPrevious = twOfflinePrevious + twOnlinePrevious;
  const twTotalYoy = twTotalPrevious > 0 ? (twTotalCurrent / twTotalPrevious) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 히어로 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 leading-tight mb-1">
                {periodLabel} 홍콩법인 경영대시보드
              </h2>
              <p className="text-sm text-gray-500">
                보고일자 11월 17일 월요일
              </p>
            </div>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-lg px-4 py-2 text-lg font-semibold text-gray-900 hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer pr-10 shadow-sm hover:shadow-md transition-all"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 대시보드 선택 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* 법인 섹션 */}
          <div className="col-span-2 bg-blue-100 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 1. 홍콩마카오법인 카드 - 브랜드 스타일 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 + 상태 배지 */}
              <div className="flex items-start justify-between mb-4">
                {/* 브랜드 아이콘 */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">HKMC</span>
                </div>
                
                {/* 상태 배지 */}
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    hkmcTotalYoy >= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    매출 {hkmcTotalYoy >= 100 ? '↑' : '↓'}
                  </span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">홍콩마카오법인</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedMonth}월 실적 요약</p>
              
              {/* 주요 지표 배지 */}
              <div className="flex gap-3 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">매출 </span>
                  <span className={`text-lg font-bold ${
                    hkmcTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(hkmcTotalYoy)}%
                  </span>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">재고 </span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatPercent(hkStockYoy)}%
                  </span>
                </div>
              </div>

              {/* 핵심 지표 카드들 */}
              <div className="space-y-3 mb-6">
                {/* 실판매출 */}
                <div className="bg-gradient-to-r from-blue-50 to-transparent rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-blue-900">💰 실판매출</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatNumber(hkmcTotalCurrent)}
                      </div>
                      <div className={`text-xs font-semibold ${
                        hkmcTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        YOY {formatPercent(hkmcTotalYoy)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPlNumber(hkPlCumulative?.net_sales || 0)}
                      </div>
                      <div className="text-xs font-semibold text-green-600">
                        YOY {formatPercent(hkCumulativeYoy)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 영업이익 */}
                <div className="bg-gradient-to-r from-red-50 to-transparent rounded-xl p-4 border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-red-900">📉 영업이익</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className={`text-xl font-bold ${
                        (hkPlCurrent?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(hkPlCurrent?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(hkPlCurrent?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className={`text-xl font-bold ${
                        (hkPlCumulative?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(hkPlCumulative?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(hkPlCumulative?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 재고 */}
                <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-900">📦 기말재고</div>
                    <div className="text-xs text-gray-500">Tag 기준 (1K HKD)</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPlNumber(hkStockCurrent)}
                    </div>
                    <div className="text-sm font-semibold text-purple-600">
                      YOY {formatPercent(hkStockYoy)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 상세보기 토글 */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowHkmcDetail(!showHkmcDetail);
                  }}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <span>채널별 상세보기</span>
                  {showHkmcDetail ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                
                {showHkmcDetail && (
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">HK 오프라인</span>
                      <div>
                        <span className="text-sm font-bold text-gray-900 mr-2">
                          {formatNumber(hkOfflineCurrent)}K
                        </span>
                        <span className={`text-xs font-bold ${
                          hkOfflineYoy >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercent(hkOfflineYoy)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">HK 온라인</span>
                      <div>
                        <span className="text-sm font-bold text-gray-900 mr-2">
                          {formatNumber(hkOnlineCurrent)}K
                        </span>
                        <span className={`text-xs font-bold ${
                          hkOnlineYoy >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercent(hkOnlineYoy)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">마카오</span>
                      <div>
                        <span className="text-sm font-bold text-gray-900 mr-2">
                          {formatNumber(mcCurrent)}K
                        </span>
                        <span className={`text-xs font-bold ${
                          mcYoy >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercent(mcYoy)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 대시보드 버튼 */}
              <Link
                href="/hongkong"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>

              {/* 2. 대만법인 카드 - 브랜드 스타일 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-purple-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 + 상태 배지 */}
              <div className="flex items-start justify-between mb-4">
                {/* 브랜드 아이콘 */}
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">TW</span>
                </div>
                
                {/* 상태 배지 */}
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    twTotalYoy >= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    매출 {twTotalYoy >= 100 ? '↑' : '↓'}
                  </span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">대만법인</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedMonth}월 실적 요약</p>
              
              {/* 주요 지표 배지 */}
              <div className="flex gap-3 mb-6">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">매출 </span>
                  <span className={`text-lg font-bold ${
                    twTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(twTotalYoy)}%
                  </span>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">재고 </span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatPercent(twStockYoy)}%
                  </span>
                </div>
              </div>

              {/* 핵심 지표 카드들 */}
              <div className="space-y-3 mb-6">
                {/* 실판매출 */}
                <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-900">💰 실판매출</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatNumber(twTotalCurrent)}
                      </div>
                      <div className={`text-xs font-semibold ${
                        twTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        YOY {formatPercent(twTotalYoy)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPlNumber(twPlCumulative?.net_sales || 0)}
                      </div>
                      <div className="text-xs font-semibold text-green-600">
                        YOY {formatPercent(twCumulativeYoy)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 영업이익 */}
                <div className="bg-gradient-to-r from-green-50 to-transparent rounded-xl p-4 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-green-900">📈 영업이익</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className={`text-xl font-bold ${
                        (twPlCurrent?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(twPlCurrent?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(twPlCurrent?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className={`text-xl font-bold ${
                        (twPlCumulative?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(twPlCumulative?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(twPlCumulative?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 재고 */}
                <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-900">📦 기말재고</div>
                    <div className="text-xs text-gray-500">Tag 기준 (1K HKD)</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPlNumber(twStockCurrent)}
                    </div>
                    <div className="text-sm font-semibold text-purple-600">
                      YOY {formatPercent(twStockYoy)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 상세보기 토글 */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowTwDetail(!showTwDetail);
                  }}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <span>채널별 상세보기</span>
                  {showTwDetail ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                
                {showTwDetail && (
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">대만 오프라인</span>
                      <div>
                        <span className="text-sm font-bold text-gray-900 mr-2">
                          {formatNumber(twOfflineCurrent)}K
                        </span>
                        <span className={`text-xs font-bold ${
                          twOfflineYoy >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercent(twOfflineYoy)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">대만 온라인</span>
                      <div>
                        <span className="text-sm font-bold text-gray-900 mr-2">
                          {formatNumber(twOnlineCurrent)}K
                        </span>
                        <span className={`text-xs font-bold ${
                          twOnlineYoy >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercent(twOnlineYoy)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 대시보드 버튼 */}
              <Link
                href="/taiwan"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>
            </div>
          </div>

          {/* 기타 섹션 */}
          <div className="col-span-2 bg-green-100 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 3. 홍마대 BS / 현금흐름 / 자본계획 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-green-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📈</span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                홍마대 BS / 현금흐름
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Balance Sheet / Cash Flow / Capital Plan
              </p>

              {/* 정보 카드 */}
              <div className="bg-gradient-to-r from-green-50 to-transparent rounded-xl p-4 border border-green-100 mb-6">
                <div className="text-sm font-semibold text-green-900 mb-2">
                  재무상태표 / 현금흐름표 / 자본계획
                </div>
                <div className="text-xs text-gray-500 italic">
                  작업중
                </div>
              </div>

              {/* 대시보드 버튼 */}
              <Link
                href="/bs"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>

              {/* 4. 2026년 계획 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                2026년 계획
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Business Plan 2026
              </p>

              {/* 정보 카드 */}
              <div className="bg-gradient-to-r from-orange-50 to-transparent rounded-xl p-4 border border-orange-100 mb-6">
                <div className="text-sm font-semibold text-orange-900 mb-2">
                  연간 예상 PL / 예상 물량표
                </div>
                <div className="text-xs text-gray-500 italic">
                  작업중 (매출계획 수신완료)
                </div>
              </div>

              {/* 대시보드 버튼 */}
              <Link
                href="/plan-2026"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 각 항목을 클릭하여 상세 정보를 확인할 수 있습니다
            </p>
        </div>
      </main>
    </div>
  );
}
