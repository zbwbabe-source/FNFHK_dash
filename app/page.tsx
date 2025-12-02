'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import hongkongDashboardData from '@/components/dashboard/hongkong-dashboard-data.json';
import taiwanDashboardData from '@/components/dashboard/taiwan-dashboard-data.json';

export default function Home() {
  const [hkData, setHkData] = useState<any>(null);
  const [twData, setTwData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('2510'); // 기본값: 25년 10월
  const [showHkmcDetail, setShowHkmcDetail] = useState(false);
  const [showTwDetail, setShowTwDetail] = useState(false);

  useEffect(() => {
    setHkData(hongkongDashboardData);
    setTwData(taiwanDashboardData);
  }, []);

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Math.round(Number(num)).toString();
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Math.round(Number(num) / 1000).toLocaleString('ko-KR');
  };

  // 기간 옵션 생성 (24년 1월 ~ 25년 12월)
  const generatePeriodOptions = () => {
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
  };

  const periodOptions = generatePeriodOptions();

  // 선택된 기간에서 년도와 월 추출
  const selectedYear = selectedPeriod.substring(0, 2);
  const selectedMonth = parseInt(selectedPeriod.substring(2, 4));
  const periodLabel = `${selectedYear}년 ${selectedMonth}월`;

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
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* 1. 홍콩마카오법인 10월 실적 */}
          <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">HK</span>
                  <span className="text-xl font-bold text-gray-900">MC</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                홍콩마카오법인
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {selectedMonth}월 실판매출 YOY
              </p>
              <p className="text-xs text-gray-400 mb-3">단위: 1K HKD</p>
              
              {/* HKMC 요약 */}
              <div>
                {/* 합계 (항상 표시) */}
                <div className="pt-2 border-t border-gray-200 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-900">합계</span>
                    <span className={`text-base font-bold ${hkmcTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(hkmcTotalYoy)}%
                    </span>
                  </div>
                  <div className="text-right text-xs text-gray-500 font-semibold">
                    {formatNumber(hkmcTotalCurrent)}K
                  </div>
                </div>

                  {/* 토글 버튼 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowHkmcDetail(!showHkmcDetail);
                    }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mb-2 w-full text-left"
                  >
                    {showHkmcDetail ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>상세보기</span>
                  </button>

                  {/* 상세 정보 (토글) */}
                  {showHkmcDetail && (
                    <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-700 font-medium">HK 오프라인</span>
                          <span className={`text-sm font-bold ${hkOfflineYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(hkOfflineYoy)}%
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {formatNumber(hkOfflineCurrent)}K
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-700 font-medium">HK 온라인</span>
                          <span className={`text-sm font-bold ${hkOnlineYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(hkOnlineYoy)}%
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {formatNumber(hkOnlineCurrent)}K
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-700 font-medium">마카오</span>
                          <span className={`text-sm font-bold ${mcYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(mcYoy)}%
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {formatNumber(mcCurrent)}K
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            
              {/* 대시보드 바로가기 버튼 */}
              <div className="mt-4 pt-3 border-t border-blue-200">
                <Link 
                  href="/hongkong"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-3 rounded-lg text-sm font-semibold transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  대시보드 바로가기
                </Link>
              </div>
            </div>
          </div>

          {/* 2. 대만법인 10월 실적 */}
          <div className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-lg overflow-hidden hover:border-purple-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <span className="text-xl font-bold text-gray-900">TW</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                대만법인
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {selectedMonth}월 실판매출 YOY
              </p>
              <p className="text-xs text-gray-400 mb-3">단위: 1K HKD</p>
              
              {/* 대만 요약 */}
              <div>
                {/* 합계 (항상 표시) */}
                <div className="pt-2 border-t border-gray-200 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-900">합계</span>
                    <span className={`text-base font-bold ${twTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(twTotalYoy)}%
                    </span>
                  </div>
                  <div className="text-right text-xs text-gray-500 font-semibold">
                    {formatNumber(twTotalCurrent)}K
                  </div>
                </div>

                  {/* 토글 버튼 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowTwDetail(!showTwDetail);
                    }}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium mb-2 w-full text-left"
                  >
                    {showTwDetail ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>상세보기</span>
                  </button>

                  {/* 상세 정보 (토글) */}
                  {showTwDetail && (
                    <div className="space-y-2 pl-4 border-l-2 border-purple-200">
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-700 font-medium">대만 오프라인</span>
                          <span className={`text-sm font-bold ${twOfflineYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(twOfflineYoy)}%
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {formatNumber(twOfflineCurrent)}K
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-700 font-medium">대만 온라인</span>
                          <span className={`text-sm font-bold ${twOnlineYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(twOnlineYoy)}%
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {formatNumber(twOnlineCurrent)}K
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            
              {/* 대시보드 바로가기 버튼 */}
              <div className="mt-4 pt-3 border-t border-purple-200">
                <Link 
                  href="/taiwan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-purple-500 hover:bg-purple-600 text-white text-center py-2 px-3 rounded-lg text-sm font-semibold transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  대시보드 바로가기
                </Link>
              </div>
            </div>
          </div>

          {/* 3. 홍마대 BS / 현금흐름 / 자본계획 */}
          <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-lg overflow-hidden hover:border-green-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">📈</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                홍마대 BS / 현금흐름 / 자본계획
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Balance Sheet / Cash Flow / Capital Plan
              </p>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-green-600 font-semibold mb-1">
                  재무상태표 / 현금흐름표 / 자본계획
                </p>
                <p className="text-xs text-gray-500 italic">
                  작업중
                </p>
              </div>
              
              {/* 대시보드 바로가기 버튼 */}
              <div className="mt-4 pt-3 border-t border-green-200">
                <Link 
                  href="/bs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-2 px-3 rounded-lg text-sm font-semibold transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  대시보드 바로가기
          </Link>
              </div>
            </div>
          </div>

          {/* 4. 2026년 계획 */}
          <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-lg overflow-hidden hover:border-orange-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">🎯</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                2026년 계획
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Business Plan 2026
                </p>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-orange-600 font-semibold mb-1">
                  연간 예상 PL / 예상 물량표
                </p>
                <p className="text-xs text-gray-500 italic">
                  작업중 (매출계획 수신완료)
                  </p>
                </div>
              
              {/* 대시보드 바로가기 버튼 */}
              <div className="mt-4 pt-3 border-t border-orange-200">
                <Link 
                  href="/plan-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-2 px-3 rounded-lg text-sm font-semibold transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  대시보드 바로가기
                </Link>
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
