'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, LabelList, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

const TaiwanReport = () => {
  // Title is handled by Next.js metadata

  // Scroll to section function with highlight effect
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight animation
      element.classList.add('highlight-flash');
      setTimeout(() => {
        element.classList.remove('highlight-flash');
      }, 5000); // Remove after 5 seconds
    }
  };

  const [showSalesDetail, setShowSalesDetail] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [showProfitDetail, setShowProfitDetail] = useState(false);
  const [showItemProfitDetail, setShowItemProfitDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAccExpenseDetail, setShowAccExpenseDetail] = useState(false);
  const [showDiscountDetail, setShowDiscountDetail] = useState(false);
  const [showItemDiscountDetail, setShowItemDiscountDetail] = useState(false);
  const [showStoreDetail, setShowStoreDetail] = useState(false);
  const [showStoreTable, setShowStoreTable] = useState(false);
  const [showStoreCalcModal, setShowStoreCalcModal] = useState(false);
  const [showStoreListInModal, setShowStoreListInModal] = useState(false);
  const [showRetailLoss, setShowRetailLoss] = useState(false);
  const [showOutletLoss, setShowOutletLoss] = useState(false);
  const [showGloriaDetail, setShowGloriaDetail] = useState(false);
  const [showZhongxiaoDetail, setShowZhongxiaoDetail] = useState(false);
  const [showMitsuiDetail, setShowMitsuiDetail] = useState(false);
  const [showLinkouDetail, setShowLinkouDetail] = useState(false);
  const [calcYearView, setCalcYearView] = useState('2025'); // '2025' 또는 '2024'
  const [showSeasonSalesDetail, setShowSeasonSalesDetail] = useState(false);
  const [showMuDetail, setShowMuDetail] = useState(false);
  const [showAccInventoryDetail, setShowAccInventoryDetail] = useState(false);
  const [showEndInventoryDetail, setShowEndInventoryDetail] = useState(false);
  const [showPastSeasonDetail, setShowPastSeasonDetail] = useState(false);
  const [showCurrentSeasonDetail, setShowCurrentSeasonDetail] = useState(false);
  const [showDiscoveryDetail, setShowDiscoveryDetail] = useState(false);
  const [showProfitStores, setShowProfitStores] = useState(false);
  const [showLossStores, setShowLossStores] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [muType, setMuType] = useState('발주'); // '발주' 또는 '매출'
  const [costType, setCostType] = useState('발주'); // '발주' 또는 '매출' (25FW 원가현황)
  const [expenseType, setExpenseType] = useState('당월'); // '당월' 또는 '누적' (비용요약)
  const [opexType, setOpexType] = useState('당월'); // '당월' 또는 '누적' (영업비 카드)
  const [selectedChannel, setSelectedChannel] = useState(null); // 채널별 매출 선택
  const [selectedSalesItem, setSelectedSalesItem] = useState(null); // 아이템별 매출 선택
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null); // 아이템별 재고 선택
  const [salesPriceType, setSalesPriceType] = useState('실판'); // '실판', '택가', '할인율'
  const [showOnlineRatioDetail, setShowOnlineRatioDetail] = useState(false);
  const [showManagementPoint, setShowManagementPoint] = useState(false);
  const [showNewStoreDetail, setShowNewStoreDetail] = useState(false);
  const [showLowGrowthDetail, setShowLowGrowthDetail] = useState(false);
  const [showCostStructureDetail, setShowCostStructureDetail] = useState(false);

  // 채널별 YOY 데이터 (2024 vs 2025)
  const channelYOY = {
    'Retail': [140, 64, 81, 88, 124, 111, 116, 122, 100, 115],
    'Outlet': [193, 63, 91, 88, 95, 81, 97, 100, 90, 107],
    'Online': [85, 109, 112, 91, 117, 123, 113, 101, 113, 129]
  };

  // 아이템별 매출 YOY 데이터 (실제 데이터 기반 계산)
  const salesItemYOY = {
    '당시즌의류': [
      Math.round(((8162+1207)/(4750+1133))*100), // 1월
      Math.round(((2792+1301)/(2392+2529))*100), // 2월
      Math.round(((867+2337)/(633+3176))*100), // 3월
      Math.round(((0+3536)/(0+4271))*100), // 4월
      Math.round(((0+4958)/(0+3907))*100), // 5월
      Math.round(((0+3789)/(0+3421))*100), // 6월
      Math.round(((392+2987)/(531+2579))*100), // 7월
      Math.round(((1419+2195)/(1202+1706))*100), // 8월
      Math.round(((2166+872)/(2062+908))*100), // 9월
      Math.round(((4593+406)/(4080+501))*100)  // 10월
    ],
    '과시즌의류': [
      Math.round(((939+483)/(1747+284))*100),   // 1월
      Math.round(((331+380)/(1363+732))*100),   // 2월
      Math.round(((131+974)/(411+682))*100),   // 3월
      Math.round(((364+1336)/(388+1304))*100),  // 4월
      Math.round(((199+1455)/(274+1493))*100),  // 5월
      Math.round(((201+1465)/(230+1332))*100),  // 6월
      Math.round(((217+1220)/(211+1234))*100),  // 7월
      Math.round(((442+934)/(381+1029))*100),  // 8월
      Math.round(((496+673)/(679+791))*100),  // 9월
      Math.round(((1285+653)/(1256+500))*100)   // 10월
    ],
    '모자': [
      Math.round((2438/1646)*100), // 1월
      Math.round((2305/2567)*100), // 2월
      Math.round((2834/2407)*100), // 3월
      Math.round((2647/2568)*100), // 4월
      Math.round((3668/2529)*100), // 5월
      Math.round((3108/2477)*100), // 6월
      Math.round((3360/2540)*100), // 7월
      Math.round((3347/2579)*100), // 8월
      Math.round((2637/2091)*100), // 9월
      Math.round((3529/2121)*100)  // 10월
    ],
    '신발': [
      Math.round((4816/3840)*100), // 1월
      Math.round((3571/5030)*100), // 2월
      Math.round((2399/3371)*100), // 3월
      Math.round((2547/3027)*100), // 4월
      Math.round((2923/2818)*100), // 5월
      Math.round((2736/2834)*100), // 6월
      Math.round((2647/2557)*100), // 7월
      Math.round((2889/2944)*100), // 8월
      Math.round((2458/2590)*100), // 9월
      Math.round((2712/2660)*100)  // 10월
    ],
    '가방외': [
      Math.round((873/783)*100), // 1월
      Math.round((841/1147)*100), // 2월
      Math.round((885/882)*100), // 3월
      Math.round((608/880)*100), // 4월
      Math.round((859/944)*100), // 5월
      Math.round((829/930)*100), // 6월
      Math.round((838/786)*100), // 7월
      Math.round((759/809)*100), // 8월
      Math.round((842/828)*100), // 9월
      Math.round((791/769)*100)  // 10월
    ],
    '합계': [
      Math.round((18918/14183)*100), // 1월
      Math.round((11522/15760)*100), // 2월
      Math.round((10427/11562)*100), // 3월
      Math.round((11038/12438)*100), // 4월
      Math.round((14061/11965)*100), // 5월
      Math.round((12128/11224)*100), // 6월
      Math.round((11662/10439)*100), // 7월
      Math.round((11986/10650)*100), // 8월
      Math.round((10143/9949)*100), // 9월
      Math.round((13969/11887)*100)  // 10월
    ]
  };

  // 아이템별 재고 YOY 데이터 (25년/24년 * 100)
  const inventoryItemYOY = {
    'F당시즌': [null, null, 100, 100, 162, 118, 90, 63, 56, 54],
    'S당시즌': [137, 94, 84, 88, 87, 87, 84, 84, 84, 84],
    '과시즌FW': [130, 138, 140, 141, 140, 140, 140, 140, 138, 139],
    '과시즌SS': [129, 127, 129, 133, 135, 138, 138, 132, 122, 122],
    '모자': [116, 81, 87, 86, 88, 85, 79, 78, 86, 91],
    '신발': [69, 60, 65, 70, 67, 69, 64, 84, 82, 86],
    '가방외': [68, 76, 78, 83, 84, 80, 81, 76, 75, 75]
  };

  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월'];

  // 전체 상세보기 토글
  const toggleAllDetails = () => {
    const newState = !showSalesDetail;
    setShowSalesDetail(newState);
    setShowItemDetail(newState);
    setShowProfitDetail(newState);
    setShowItemProfitDetail(newState);
    setShowExpenseDetail(newState);
    setShowDiscountDetail(newState);
    setShowItemDiscountDetail(newState);
    setShowStoreDetail(newState);
    setShowSeasonSalesDetail(newState);
    setShowMuDetail(newState);
    setShowAccInventoryDetail(newState);
    setShowEndInventoryDetail(newState);
  };

  const toggleActionItem = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
                  <span><span className="font-semibold">매장효율성 개선:</span> 점당매출 608K (<span className="bg-green-100 px-1 rounded font-bold">YOY 128%</span>), 16개 매장 기준 (전년 18개 → 당월 16개)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">당시즌 판매율:</span> <span className="bg-green-100 px-1 rounded font-bold">16.4%</span> (25F), 입고 YOY 110%, 판매 YOY 107%로 안정적 판매 중</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">신규매장 성공:</span> 라라포트 타이중(+68K), 난강(+54K) 빠른 흑자 안정화</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">온라인 성장:</span> 매출 3,569K (<span className="bg-blue-100 px-1 rounded font-bold">YOY 129%</span>, 비중 26.8%), 직접이익 1,024K (28.7%) - 고수익 채널</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">재고 개선:</span> 총재고 YOY 97% (전년 210,020K → 204,394K), 과시즌FW YOY 81%</span>
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
                  <span><span className="font-semibold">디스커버리 적자:</span> <span className="bg-red-200 px-1 rounded font-bold">-256K</span> (영업손실률 -19.1%), 오프라인 3개 매장 <span className="bg-red-200 px-1 rounded font-bold">-278K</span></span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">과시즌 FW 재고:</span> 35,998K (YOY 81%), 2년차 23FW 18,449K (<span className="bg-red-200 px-1 rounded font-bold">175%</span>) 집중 소진 필요</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">과시즌 SS 재고:</span> 20,057K (<span className="bg-orange-200 px-1 rounded font-bold">YOY 127%</span>) 증가, 소진 전략 필요</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">영업비 증가:</span> 906K (<span className="bg-orange-200 px-1 rounded font-bold">YOY 120%</span>), 마케팅비+110K, 급여+37K</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">적자매장 4개:</span> Gloria(-50K), Zhongxiao(-20K), Mitsui(-8K), 린커우(-2K)</span>
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
                  <span><span className="font-semibold">수익성 회복:</span> 영업이익률 <span className="bg-purple-100 px-1 rounded font-bold">10.11%</span> 유지, 직접이익률 16.9% 개선 지속</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">2.</span>
                  <span><span className="font-semibold">과시즌 재고 소진:</span> 23FW(175%) 및 과시즌SS(127%) 집중 프로모션</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">3.</span>
                  <span><span className="font-semibold">디스커버리 회복:</span> BEP 달성 위해 매출 <span className="bg-purple-100 px-1 rounded font-bold">+26%</span> 필요, 오프라인 개선 집중</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">4.</span>
                  <span><span className="font-semibold">적자매장 개선:</span> <span className="bg-purple-100 px-1 rounded font-bold">Gloria(-50K), Zhongxiao(-20K)</span> 비용구조 개선 및 매출 회복</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">5.</span>
                  <span><span className="font-semibold">온라인 확대:</span> <span className="bg-purple-100 px-1 rounded font-bold">YOY 129%</span> 성장 모멘텀 유지, 자사몰 고수익(39.1%) 집중 육성</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 홍콩법인 경영실적 (5개 카드 x 2줄) */}
      <div className="mb-4">
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🏢</span>
              대만법인 경영실적 (MLB 기준, 1K HKD)
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
            {/* 실판매출 */}
            <div 
              onClick={() => scrollToSection('sales-channel-chart')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500 hover:shadow-xl transition-shadow min-h-[400px] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📊</span>
                  <h3 className="text-sm font-semibold text-gray-600">실판매출 (1K HKD, V-)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('sales-channel-chart');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                13,304
              </div>
              <div className="text-sm text-green-600 font-semibold mb-3">
                YOY 118% (+1,983)
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
                    <span>오프라인</span>
                    <span className="text-green-600">9,735 (114%)</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 리테일 13개</span>
                    <span className="font-semibold">7,890</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛 3개</span>
                    <span className="font-semibold">1,845</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                    <span>온라인</span>
                    <span className="text-green-600">3,569 (129%)</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 온라인몰 3개</span>
                    <span className="font-semibold">3,569</span>
                  </div>
                </div>
              )}
              
              {/* 전년 동일매장 기준 YOY */}
              <div className="mt-3 pt-3 border-t">
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xs font-semibold text-blue-800 mb-1">📌 전년 동일매장 기준</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">실판매출 YOY (신규/종료 제외)</span>
                    <span className="text-sm font-bold text-blue-900">119%</span>
                  </div>
                  <div className="text-[10px] text-blue-600 mt-1 italic">
                    * 동일매장 11개 기준 (리테일 8개 + 아울렛 3개)
                  </div>
                </div>
              </div>
            </div>

            {/* 영업이익 */}
            <div 
              onClick={() => scrollToSection('profit-detail-section')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500 hover:shadow-xl transition-shadow min-h-[400px] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💰</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업이익 (1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('profit-detail-section');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                1,345
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-green-600">흑자 개선</span> | <span className="text-blue-600">이익률 10.11%</span>
              </div>
              
              {/* 채널별 직접이익[이익률] */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowProfitDetail(!showProfitDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 영업이익[이익률]</span>
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
                    <span className="text-gray-600">오프라인</span>
                    <span className="font-semibold text-green-600">564 <span className="text-green-600">(140%)</span> <span className="text-blue-600">[5.8%]</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">온라인</span>
                    <span className="font-semibold">781 <span className="text-green-600">(138%)</span> <span className="text-blue-600">[21.9%]</span></span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t">
                    <span className="text-gray-700">전체 영업이익</span>
                    <span className="text-green-600">1,345 (140%)</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">영업이익률</span>
                    <span className="text-blue-600">10.11%</span>
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
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">전년비</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700">택매출</td>
                          <td className="text-right py-1 px-2 font-semibold">17,992</td>
                          <td className="text-right py-1 px-2 text-green-600 font-semibold">119%</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 할인 (22.4%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">4,688</td>
                          <td className="text-right py-1 px-2 text-green-600">121%</td>
                        </tr>
                        <tr className="bg-blue-50 font-semibold">
                          <td className="py-1.5 px-2 text-blue-800 border-t border-blue-200">= 실판매출</td>
                          <td className="text-right py-1.5 px-2 text-blue-800 border-t border-blue-200">13,304</td>
                          <td className="text-right py-1.5 px-2 text-green-600 border-t border-blue-200">118%</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 매출원가 (46.7%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">6,207</td>
                          <td className="text-right py-1 px-2 text-red-600">+0.6%p</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="py-1.5 px-2 text-green-800 border-t border-green-200">= 매출총이익 (53.3%)</td>
                          <td className="text-right py-1.5 px-2 text-green-800 border-t border-green-200">7,097</td>
                          <td className="text-right py-1.5 px-2 text-blue-600 border-t border-green-200">△0.6%p</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 직접비 (36.4%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">4,846</td>
                          <td className="text-right py-1 px-2 text-blue-600">△2.4%p</td>
                        </tr>
                        <tr className="bg-yellow-50 font-semibold">
                          <td className="py-1.5 px-2 text-orange-800 border-t border-yellow-200">= 직접이익 (16.9%)</td>
                          <td className="text-right py-1.5 px-2 text-orange-800 border-t border-yellow-200">2,251</td>
                          <td className="text-right py-1.5 px-2 text-green-600 border-t border-yellow-200">+1.7%p</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 영업비</td>
                          <td className="text-right py-1 px-2 text-gray-600">906</td>
                          <td className="text-right py-1 px-2 text-green-600">120%</td>
                        </tr>
                        <tr className="bg-green-100 font-bold">
                          <td className="py-1.5 px-2 text-green-800 border-t-2 border-green-300">= 영업이익 (10.11%)</td>
                          <td className="text-right py-1.5 px-2 text-green-800 border-t-2 border-green-300">1,345</td>
                          <td className="text-right py-1.5 px-2 text-green-700 border-t-2 border-green-300">+1.6%p</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* 디스커버리 참고 실적 */}
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
                      25년 10월 당월 (오프라인 3개 + 온라인 2개)
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-purple-700">실판매출</span>
                        <span className="font-semibold text-purple-900">1,342</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">매출총이익</span>
                        <span className="font-semibold text-purple-900">765 <span className="text-blue-600">[57.0%]</span></span>
                      </div>
                      
                      {/* 직접비 토글 */}
                      <div className="border-t pt-1 mt-1">
                        <button 
                          onClick={() => setShowPastSeasonDetail(!showPastSeasonDetail)}
                          className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                        >
                          <span>직접비 935 (69.7%)</span>
                          {showPastSeasonDetail ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {showPastSeasonDetail && (
                        <div className="pl-3 space-y-0.5 text-[10px] text-purple-700">
                          <div className="flex justify-between">
                            <span>• 임차료</span>
                            <span>246</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 감가상각비</span>
                            <span>186</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 급여</span>
                            <span>132</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 광고비</span>
                            <span>118</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 기타</span>
                            <span>253</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-semibold bg-purple-100 px-2 py-1 rounded">
                        <span className="text-purple-800">직접손실</span>
                        <span className="text-red-700">-170 (-12.7%)</span>
                      </div>
                      
                      {/* 영업비 토글 */}
                      <div className="border-t pt-1 mt-1">
                        <button 
                          onClick={() => setShowEndInventoryDetail(!showEndInventoryDetail)}
                          className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                        >
                          <span>영업비 85 (6.4%)</span>
                          {showEndInventoryDetail ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {showEndInventoryDetail && (
                        <div className="pl-3 space-y-0.5 text-[10px] text-purple-700">
                          <div className="flex justify-between">
                            <span>• 마케팅비</span>
                            <span>60</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 지급수수료</span>
                            <span>25</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-bold bg-red-100 px-2 py-1 rounded">
                        <span className="text-red-800">영업손실</span>
                        <span className="text-red-700">-256 (-19.1%)</span>
                      </div>
                      
                      {/* 채널별 영업손익 */}
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs font-semibold text-purple-800 mb-1">📊 채널별 영업손익</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between bg-red-50 px-2 py-1 rounded">
                            <span className="text-purple-700">오프라인 (3개)</span>
                            <span className="font-bold text-red-700">-278 (-25.8%)</span>
                          </div>
                          <div className="flex justify-between bg-green-50 px-2 py-1 rounded">
                            <span className="text-purple-700">온라인 (2개)</span>
                            <span className="font-bold text-green-700">+22 (+8.3%)</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-purple-600 mt-2 pt-2 border-t italic">
                        전월비: 오프 352% / 온 121%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 영업비 */}
            <div 
              onClick={() => scrollToSection('profit-detail-section')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-shadow min-h-[400px] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📈</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업비 (1K HKD)</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToSection('profit-detail-section');
                    }}
                    className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    상세내역
                  </button>
                  
                  {/* 당월/누적 토글 */}
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
              </div>
              
              {expenseType === '당월' ? (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    906
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY 120%</span> | <span className="text-blue-600">영업비율 6.8%</span>
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
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">급여</span>
                        <span className="font-semibold">342 <span className="text-red-600">(112%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">마케팅비</span>
                        <span className="font-semibold">288 <span className="text-red-600">(161%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">지급수수료</span>
                        <span className="font-semibold">121 <span className="text-green-600">(97%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">임차료</span>
                        <span className="font-semibold">83 <span className="text-green-600">(104%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">보험료</span>
                        <span className="font-semibold">38 <span className="text-red-600">(110%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">여비교통비</span>
                        <span className="font-semibold">34 <span className="text-red-600">(106%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">감가상각비</span>
                        <span className="font-semibold">0 <span className="text-gray-500">(-)</span></span>
                      </div>
                      
                      {/* 증감액 분석 */}
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="text-xs font-semibold text-orange-800 mb-1">
                          당월 전년비 +151K 주요 증감 내역
                        </div>
                        <div className="space-y-0.5 text-xs text-orange-700">
                          <div className="flex justify-between">
                            <span>• 마케팅비</span>
                            <span className="font-semibold text-red-700">+110K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 급여</span>
                            <span className="font-semibold text-red-700">+37K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 보험료</span>
                            <span className="font-semibold text-red-700">+3K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 임차료</span>
                            <span className="font-semibold text-red-700">+3K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 여비교통비</span>
                            <span className="font-semibold text-red-700">+2K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 지급수수료 감소</span>
                            <span className="font-semibold text-blue-700">-4K</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  

                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    9,227
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY 135%</span> | <span className="text-blue-600">영업비율 7.8%</span>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-3 bg-blue-50 p-2 rounded">
                    매출YOY 105% vs 영업비YOY 135%
                  </div>
                  
                  {/* 영업비 누적 상세보기 */}
                  <div className="border-t pt-3">
                    <button 
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>영업비 누적 상세보기</span>
                      {showExpenseDetail ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showExpenseDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">급여</span>
                        <span className="font-semibold">3,694 <span className="text-red-600">(133%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">마케팅비</span>
                        <span className="font-semibold">2,371 <span className="text-red-600">(139%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">지급수수료</span>
                        <span className="font-semibold">1,471 <span className="text-red-600">(173%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">임차료</span>
                        <span className="font-semibold">849 <span className="text-red-600">(106%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">여비교통비</span>
                        <span className="font-semibold">453 <span className="text-red-600">(127%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">보험료</span>
                        <span className="font-semibold">388 <span className="text-red-600">(133%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">감가상각비</span>
                        <span className="font-semibold">0 <span className="text-blue-600">(0%)</span></span>
                      </div>
                      
                      {/* 누적 증감액 분석 */}
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="text-xs font-semibold text-orange-800 mb-1">
                          누적 전년비 +2,412K 주요 증감 내역
                        </div>
                        <div className="space-y-0.5 text-xs text-orange-700">
                          <div className="flex justify-between">
                            <span>• 급여</span>
                            <span className="font-semibold text-red-700">+915K (133%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 마케팅비</span>
                            <span className="font-semibold text-red-700">+666K (139%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 지급수수료</span>
                            <span className="font-semibold text-red-700">+620K (173%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 보험료</span>
                            <span className="font-semibold text-red-700">+96K (133%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 여비교통비</span>
                            <span className="font-semibold text-red-700">+95K (127%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 임차료</span>
                            <span className="font-semibold text-red-700">+47K (106%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 감가상각비 감소</span>
                            <span className="font-semibold text-blue-700">-27K (0%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 누적 요약 */}
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">전년 누적</span>
                        <span className="font-semibold">6,815</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">전년비</span>
                        <span className="font-semibold text-red-600">+2,412</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 할인율 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏷️</span>
                  <h3 className="text-sm font-semibold text-gray-600">할인율</h3>
                </div>
                
                {/* 당월/누적 토글 */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setOpexType('당월')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                      opexType === '당월'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    당월
                  </button>
                  <button
                    onClick={() => setOpexType('누적')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                      opexType === '누적'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    누적
                  </button>
                </div>
              </div>
              
              {opexType === '당월' ? (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    22.4%
                  </div>
                  <div className="text-sm text-red-600 font-semibold mb-3">
                    전년비 +1.1%p
                  </div>
                  
                  {/* 채널별 할인율 상세보기 */}
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
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>오프라인</span>
                        <span className="text-red-600">21.8% <span className="text-gray-500">(전년 21.0%, +0.8%p)</span></span>
                      </div>
                      
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                        <span>온라인</span>
                        <span className="text-red-600">23.7% <span className="text-gray-500">(전년 22.0%, +1.7%p)</span></span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    21.9%
                  </div>
                  <div className="text-sm text-red-600 font-semibold mb-3">
                    전년비 +0.9%p
                  </div>
                  
                  {/* 채널별 누적 할인율 상세보기 */}
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
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>오프라인</span>
                        <span className="text-green-600">21.4% <span className="text-gray-500">(전년 21.6%, △0.2%p)</span></span>
                      </div>
                      
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                        <span>온라인</span>
                        <span className="text-red-600">23.4% <span className="text-gray-500">(전년 19.3%, +4.0%p)</span></span>
                      </div>
                    </div>
                  )}
                  
                  {/* 누적 분석 */}
                  <div className="border-t pt-3 mt-3">
                    <div className="bg-purple-50 rounded p-2">
                      <div className="text-xs font-semibold text-purple-800 mb-1">누적 할인율 인사이트</div>
                      <div className="space-y-0.5 text-xs text-purple-700">
                        <div className="flex items-start">
                          <span className="text-purple-600 mr-1">✓</span>
                          <span>오프라인 할인율 개선 (△0.2%p)</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-orange-600 mr-1">•</span>
                          <span>온라인 할인율 상승 (+4.0%p)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 매장 효율성 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏪</span>
                  <h3 className="text-sm font-semibold text-gray-600">매장 효율성 (1K HKD)</h3>
                </div>
                <button
                  onClick={() => setShowStoreCalcModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold transition-colors"
                >
                  계산근거
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                608
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 18개, 점당 476</span> | <span className="text-green-600">당월 16개, 점당 608 (YOY 128%)</span>
              </div>
              
              {/* 매장 효율성 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowStoreDetail(!showStoreDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>매장 효율성보기</span>
                  {showStoreDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showStoreDetail && (
                <>
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs bg-red-50 p-2 rounded">
                      <div className="font-semibold text-gray-700 mb-1">채널별 매장수 & 점당매출 (1K HKD)</div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span>TW Retail 13개(△2개)</span>
                          <span className="font-bold text-right">607 <span className="text-green-600">(128%)</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span>TW Outlet 3개(±0개)</span>
                          <span className="font-bold text-right">615 <span className="text-green-600">(107%)</span></span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-700">오프라인 TOTAL 16개</span>
                          <span className="text-green-600">점당 608 (128%)</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold mt-1">
                          <span className="text-gray-700">전년 오프라인 18개</span>
                          <span className="text-gray-500">점당 475</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t text-gray-600 text-xs">
                        * 괄호 안은 전년비 매장수 증감<br/>
                        * 온라인 채널 제외 (오프라인 매장 효율성)<br/>
                        * 정상운영 매장만 계산
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-red-600 font-semibold">전년 18개</span>
                      <span className="mx-1">→</span>
                      <span className="text-red-600 font-semibold">당월 16개</span>
                    </div>
                    <div className="mt-2 bg-blue-50 rounded p-2">
                      <div className="text-xs font-semibold text-blue-800 mb-1">📍 매장 변동 (점당매출 계산 기준)</div>
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>신규 오픈: 2개</span>
                        <span className="text-red-600">영업 종료: 4개</span>
                      </div>
                      <div className="text-xs mt-1">
                        <div className="text-green-600 mb-1">
                          <strong>신규 오픈 (계산 포함):</strong><br/>
                          • 라라포트 타이중: 513K<br/>
                          • 라라포트 난강: 469K
                        </div>
                        <div className="text-red-600 mt-2">
                          <strong>영업 종료:</strong><br/>
                          • 성품타이중: 391K<br/>
                          • 신주빅시티: 486K<br/>
                          • A11: 438K<br/>
                          • 신디엔: 127K
                        </div>
                      </div>
                      <div className="text-xs text-orange-600 mt-2 bg-orange-50 rounded p-1.5 border border-orange-200">
                        <strong>📊 점당매출 효율:</strong><br/>
                        • 전년 18개 → 당월 16개 (순감소 2개)<br/>
                        • 점당매출: 476K → 608K (<span className="text-green-600 font-bold">+128%</span>)<br/>
                        → 매장수 감소, 매장당 효율 대폭 개선
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* 디스커버리 참고 - 토글 가능 */}
              <div className="mt-3 border-t pt-3">
                <button 
                  onClick={() => setShowDiscoveryDetail(!showDiscoveryDetail)}
                  className="w-full text-left"
                >
                  <div className="bg-purple-50 rounded p-2 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-purple-800">📊 참고: 디스커버리 오프라인 (3개 매장)</div>
                      {showDiscoveryDetail ? (
                        <ChevronDown className="w-4 h-4 text-purple-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </div>
                </button>
                
                {showDiscoveryDetail && (
                  <div className="bg-purple-50 rounded-b p-2 border-x border-b border-purple-200 -mt-1">
                    <div className="space-y-1 text-xs text-purple-700">
                      <div className="flex justify-between">
                        <span>실판매출</span>
                        <span className="font-semibold">1,076K</span>
                      </div>
                      <div className="flex justify-between">
                        <span>점당매출</span>
                        <span className="font-semibold text-purple-900">359K (MLB 대비 59%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>영업이익</span>
                        <span className="font-semibold text-red-600">-278K</span>
                      </div>
                      <div className="flex justify-between items-start pt-1 border-t border-purple-200 mt-1">
                        <span className="font-semibold text-purple-900">BEP 달성 필요:</span>
                        <span className="font-bold text-orange-600">매출 +26% 필요</span>
                      </div>
                      <div className="text-[10px] text-purple-600 mt-1 italic">
                        * 전월비 352% 급성장 중
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 두 번째 줄: 5개 카드 추가 */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            {/* 당시즌 판매 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📈</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매 (25F 의류, 1K HKD, 실판 V-)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                4,374
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 3,886</span> | <span className="text-green-600">YOY 113%</span>
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
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">TS</span>
                      <span className="font-semibold">688 <span className="text-green-600">(138%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">BN</span>
                      <span className="font-semibold">686 <span className="text-red-600">(495%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">MT</span>
                      <span className="font-semibold">448 <span className="text-green-600">(78%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">TR</span>
                      <span className="font-semibold">296 <span className="text-green-600">(114%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">PT</span>
                      <span className="font-semibold">286 <span className="text-green-600">(103%)</span></span>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      * 판매금액 YOY (전년 24F 대비), 단위: 1K HKD
                    </div>
                  </div>
                  
                  {/* 25S 참고 */}
                  <div className="mt-3 pt-3 border-t bg-gray-50 rounded p-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">📊 참고: 25S 성과</div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">판매율</span>
                      <span className="font-semibold text-blue-600">56.2% <span className="text-gray-500">(전년 24S: 52.0%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">판매금액(Tag)</span>
                      <span className="font-semibold text-blue-600">27,885 <span className="text-gray-500">(YOY 97%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">입고금액(Tag)</span>
                      <span className="font-semibold text-blue-600">48,261 <span className="text-gray-500">(YOY 90%)</span></span>
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
                16.4%
              </div>
              <div className="text-sm font-semibold text-red-600 mb-3">
                (전년비 △0.4%p)
              </div>
              
              {/* 시각적 표현 개선 */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">누적입고(Tag)</span>
                  <span className="text-sm font-bold text-green-600">59,498 (110%) ✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">누적판매(Tag)</span>
                  <span className="text-sm font-bold text-green-600">9,745 (107%) ✓</span>
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
                  {/* 상세 분석 */}
                  <div className="mt-3 pt-3 border-t bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-3 border border-blue-300">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="text-xs text-blue-700 leading-tight space-y-1">
                          <div>• <span className="font-semibold">입고 전년비 110%</span>로 전년 대비 증가</div>
                          <div>• <span className="font-semibold">판매 전년비 107%</span>로 안정적 판매 중</div>
                          <div>• 판매율 <span className="bg-yellow-200 px-1 rounded font-bold">16.4%</span>로 전년 16.8% 대비 소폭 하락</div>
                          <div className="pt-1 border-t border-blue-300">→ 입고 증가에도 불구하고 판매 속도는 양호, 지속 모니터링 필요</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* 카테고리별 판매율 분석 - 독립 토글 */}
              <div className="mt-3 pt-3 border-t">
                <button 
                  onClick={() => setShowPastSeasonDetail(!showPastSeasonDetail)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>카테고리별 판매율</span>
                  {showPastSeasonDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showPastSeasonDetail && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs font-semibold text-gray-700 mb-2">입고YOY / 판매율</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs items-center py-1">
                      <span className="text-gray-600">BN</span>
                      <span className="font-semibold"><span className="text-orange-600">183%</span> / <span className="text-green-600">17.9%</span></span>
                    </div>
                    <div className="flex justify-between text-xs items-center py-1 bg-red-50 px-2 rounded">
                      <span className="text-gray-700 font-semibold">DJ</span>
                      <span className="font-semibold"><span className="text-orange-600">183%</span> / <span className="text-red-600">2.3%</span></span>
                    </div>
                    <div className="flex justify-between text-xs items-center py-1">
                      <span className="text-gray-600">TS</span>
                      <span className="font-semibold"><span className="text-orange-600">136%</span> / <span className="text-orange-600">4.7%</span></span>
                    </div>
                    <div className="flex justify-between text-xs items-center py-1">
                      <span className="text-gray-600">PT</span>
                      <span className="font-semibold"><span className="text-green-600">83%</span> / <span className="text-green-600">13.8%</span></span>
                    </div>
                    <div className="flex justify-between text-xs items-center py-1">
                      <span className="text-gray-600">MT</span>
                      <span className="font-semibold"><span className="text-green-600">74%</span> / <span className="text-green-600">10.6%</span></span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-[10px] text-gray-500 italic">
                    * 입고금액(Tag) 높은 순 정렬
                  </div>
                  <div className="mt-2 bg-orange-50 rounded p-2 border-l-2 border-orange-400">
                    <div className="text-xs text-orange-800">
                      <span className="font-semibold">⚠️ 주의:</span> DJ 판매율 2.3%로 입고 대비 저조, 판촉 전략 필요
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACC 재고주수 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">ACC 재고주수</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                41.1주
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 47.6주</span> | <span className="text-green-600">YOY △6.5주</span>
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
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">신발</span>
                      <span className="font-semibold text-green-600">48.1주 <span className="text-gray-500">(△1.4주)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">가방외</span>
                      <span className="font-semibold text-green-600">43.9주 <span className="text-gray-500">(△17.4주)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">모자</span>
                      <span className="font-semibold text-green-600">33.7주 <span className="text-gray-500">(△6.2주)</span></span>
                    </div>
                  </div>
                  
                  {/* 당월 판매 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">당월 판매 (V-, 1K HKD)</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">신발</span>
                        <span className="font-semibold">2,583 <span className="text-green-600">(102%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">모자</span>
                        <span className="font-semibold">3,361 <span className="text-green-600">(166%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">가방외</span>
                        <span className="font-semibold">753 <span className="text-green-600">(103%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                        <span className="text-gray-700">악세 합계</span>
                        <span className="text-indigo-600">6,697 <span className="text-green-600">(127%)</span></span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 기말재고 */}
            <div 
              onClick={() => scrollToSection('inventory-chart')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-amber-500 hover:shadow-xl transition-shadow min-h-[150px] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏭</span>
                  <h3 className="text-sm font-semibold text-gray-600">기말재고 (TAG, 1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('inventory-chart');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                204,394
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 210,020</span> | <span className="text-green-600">YOY 97%</span>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
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
                    <span className="font-semibold">49,753 <span className="text-red-600">(111%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">당시즌 SS (25S)</span>
                    <span className="font-semibold">21,140 <span className="text-green-600">(82%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 FW</span>
                    <span className="font-semibold">35,998 <span className="text-green-600">(81%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 SS</span>
                    <span className="font-semibold">20,057 <span className="text-red-600">(127%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">악세 합계</span>
                    <span className="font-semibold">77,446 <span className="text-green-600">(98%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">신발 (SHO)</span>
                    <span className="font-semibold">37,954 <span className="text-green-600">(96%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">모자 (HEA)</span>
                    <span className="font-semibold">28,120 <span className="text-red-600">(114%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">가방외</span>
                    <span className="font-semibold">11,372 <span className="text-green-600">(77%)</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* 과시즌 FW 재고 */}
            <div 
              onClick={() => scrollToSection('inventory-chart')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[150px] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📦</span>
                  <h3 className="text-sm font-semibold text-gray-600">과시즌 FW 재고 (TAG, 1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('inventory-chart');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                35,998
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 44,552</span> | <span className="text-green-600">YOY 81% ✅</span>
              </div>
              
              {/* 재고 시즌별 상세보기 */}
              <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
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
                      <span className="font-semibold">17,549 <span className="text-green-600">(52%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">2년차 (23FW)</span>
                      <span className="font-semibold">18,449 <span className="text-red-600">(175%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">3년차 이상 (22FW~)</span>
                      <span className="font-semibold">0 <span className="text-blue-600">(완료)</span></span>
                    </div>
                  </div>
              
                  {/* 전년 참고 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2">📊 전년 (24년 10월) 참고</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>• 1년차 (23FW)</span>
                          <span className="font-semibold">33,985K</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• 2년차 (22FW)</span>
                          <span className="font-semibold">10,566K</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• 3년차 이상 (21F~)</span>
                          <span className="font-semibold">2K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 핵심 인사이트 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-orange-50 rounded p-2 border-l-2 border-orange-400">
                      <div className="text-xs font-semibold text-orange-800 mb-2">⚠️ 재고 관리 현황</div>
                      <div className="text-xs text-orange-700 space-y-1">
                        <div className="flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          <span>전체 과시즌FW <span className="font-bold text-green-600">YOY 81%</span> (△8,554K 감소)</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          <span>1년차(24FW) <span className="font-bold text-green-600">52%</span> → 효율적 입고</span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          <span>3년차 이상 재고 <span className="font-bold text-green-600">완전 소진</span></span>
                        </div>
                        <div className="flex items-start">
                          <span className="text-orange-600 mr-1">⚠</span>
                          <span>2년차(23FW) <span className="font-bold text-red-600">175%</span> → 소진 필요 (18,449K)</span>
                        </div>
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
      <div className="mb-4" id="profit-detail-section">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            손익요약 (단위: 1K HKD)
          </h3>
          <div className="space-y-1 mb-2">
            <p className="text-sm text-gray-600 bg-green-50 p-2 rounded border-l-4 border-green-500">
              <strong>당월:</strong> 영업이익 1,345K HKD, 영업이익률 10.11% | 흑자 개선: ① 매출 YOY 118% (+1,983K) ② 직접이익 YOY 131% (직접이익률 15.2%→16.9%) ③ 영업비 YOY 120% (+151K)
            </p>
            <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
              <strong>누적:</strong> 영업이익 9,119K HKD, 영업이익률 7.68% | 흑자 유지: ① 매출 YOY 105% (+5,842K) ② 직접이익 YOY 111% (직접이익률 14.66%→15.45%) ③ 영업비 YOY 135% (+2,412K)
            </p>
          </div>
          <div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th rowSpan="2" className="text-left py-2 px-2 text-gray-700 font-semibold border-r border-gray-300 min-w-[100px]">항목<br/>(1K TWD)</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r border-gray-300">당월</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r border-gray-300">당월 전년비</th>
                    <th rowSpan="2" className="text-center py-2 px-2 text-gray-700 font-semibold bg-purple-50 border-r border-gray-300">YOY</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r border-gray-300">누적</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r border-gray-300">누적 전년비</th>
                    <th rowSpan="2" className="text-center py-2 px-2 text-gray-700 font-semibold bg-indigo-50">누적<br/>YOY</th>
                  </tr>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r">오프라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r">온라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r border-gray-300">합계</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r">오프라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r">온라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r border-gray-300">합계</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r">오프라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r">온라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r border-gray-300">합계</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r">오프라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r">온라인</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r border-gray-300">합계</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">TAG</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">13,077</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">4,915</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">17,992</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">1,691</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">1,200</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50 border-r border-gray-300">2,891</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-purple-50 border-r border-gray-300">119%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">117,915</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">41,711</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">159,626</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">4,273</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">5,293</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50 border-r border-gray-300">9,566</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-indigo-50">106%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">실판</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">9,735</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">3,569</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">13,304</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50">1,174</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50">810</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50 border-r border-gray-300">1,983</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-purple-50 border-r border-gray-300">118%</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">88,279</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">30,445</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">118,724</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50">3,378</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50">2,464</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50 border-r border-gray-300">5,842</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-indigo-50">105%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-cyan-600 font-semibold italic border-r border-gray-200">할인율</td>
                    <td className="text-center py-1 px-1 text-cyan-600 italic bg-white">21.8%</td>
                    <td className="text-center py-1 px-1 text-cyan-600 italic bg-white">23.7%</td>
                    <td className="text-center py-1 px-1 text-cyan-600 italic bg-white border-r border-gray-300">22.4%</td>
                    <td className="text-center py-1 px-1 text-red-600 italic bg-orange-50">+0.8%p</td>
                    <td className="text-center py-1 px-1 text-red-600 italic bg-orange-50">+1.7%p</td>
                    <td className="text-center py-1 px-1 text-red-600 italic bg-orange-50 border-r border-gray-300">+1.1%p</td>
                    <td className="text-center py-1 px-1 text-gray-600 italic bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-cyan-600 italic bg-white">21.4%</td>
                    <td className="text-center py-1 px-1 text-cyan-600 italic bg-white">23.4%</td>
                    <td className="text-center py-1 px-1 text-cyan-600 italic bg-white border-r border-gray-300">21.9%</td>
                    <td className="text-center py-1 px-1 text-blue-600 italic bg-amber-50">△0.2%p</td>
                    <td className="text-center py-1 px-1 text-red-600 italic bg-amber-50">+4.0%p</td>
                    <td className="text-center py-1 px-1 text-red-600 italic bg-amber-50 border-r border-gray-300">+0.9%p</td>
                    <td className="text-center py-1 px-1 text-gray-600 italic bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">매출총이익</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">5,223</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">1,874</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">7,097</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50">590</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50">396</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50 border-r border-gray-300">986</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-purple-50 border-r border-gray-300">116%</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">47,598</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">16,055</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">63,653</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50">1,904</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50">638</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50 border-r border-gray-300">2,542</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-indigo-50">104%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">매출총이익률</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">53.7%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">52.5%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">53.3%</td>
                    <td className="text-center py-1 px-1 text-red-600 bg-orange-50">△0.5%p</td>
                    <td className="text-center py-1 px-1 text-red-600 bg-orange-50">△1.1%p</td>
                    <td className="text-center py-1 px-1 text-red-600 bg-orange-50 border-r border-gray-300">△0.6%p</td>
                    <td className="text-center py-1 px-1 text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">53.9%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">52.7%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">53.6%</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">+0.1%p</td>
                    <td className="text-center py-1 px-1 text-red-600 bg-amber-50">△2.4%p</td>
                    <td className="text-center py-1 px-1 text-red-600 bg-amber-50 border-r border-gray-300">△0.5%p</td>
                    <td className="text-center py-1 px-1 text-gray-600 bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">직접비 합계</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">3,996</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">850</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">4,846</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">332</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">121</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50 border-r border-gray-300">453</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-purple-50 border-r border-gray-300">110%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">37,660</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">7,647</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">45,307</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">825</td>
                    <td className="text-center py-1 px-1 text-blue-600 bg-amber-50">△79</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50 border-r border-gray-300">660</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-indigo-50">102%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">직접이익</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">1,227</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">1,024</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">2,251</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50">258</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50">275</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-orange-50 border-r border-gray-300">533</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-purple-50 border-r border-gray-300">131%</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">9,938</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">8,408</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">18,346</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50">1,079</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50">717</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-amber-50 border-r border-gray-300">1,795</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-indigo-50">111%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">직접이익율</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">12.6%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">28.7%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">16.9%</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">+1.3%p</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">+1.6%p</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50 border-r border-gray-300">+1.7%p</td>
                    <td className="text-center py-1 px-1 text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">11.26%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">27.62%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">15.45%</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">+0.8%p</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">+0.1%p</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50 border-r border-gray-300">+0.8%p</td>
                    <td className="text-center py-1 px-1 text-gray-600 bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">영업비 소계</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">663</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">243</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">906</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">92</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50">59</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-orange-50 border-r border-gray-300">151</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-purple-50 border-r border-gray-300">120%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">6,861</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">2,366</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">9,227</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">1,735</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50">677</td>
                    <td className="text-center py-1 px-1 text-green-600 bg-amber-50 border-r border-gray-300">2,412</td>
                    <td className="text-center py-1 px-1 font-semibold text-green-600 bg-indigo-50">135%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-bold border-r border-gray-200 bg-gray-100">영업이익</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">564</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">781</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white border-r border-gray-300">1,345</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-orange-50">166</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-orange-50">216</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-orange-50 border-r border-gray-300">382</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-purple-50 border-r border-gray-300">140%</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">3,077</td>
                    <td className="text-center py-1 px-1 font-bold text-cyan-700 bg-white">6,042</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white border-r border-gray-300">9,119</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△656</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-amber-50">40</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50 border-r border-gray-300">△616</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-indigo-50">94%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-bold border-r border-gray-200 bg-gray-100">영업이익율</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">5.80%</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">21.87%</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white border-r border-gray-300">10.11%</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-orange-50">+1.1%p</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-orange-50">+1.4%p</td>
                    <td className="text-center py-1 px-1 font-bold text-green-600 bg-orange-50 border-r border-gray-300">+1.6%p</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">3.49%</td>
                    <td className="text-center py-1 px-1 font-bold text-cyan-700 bg-white">19.85%</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white border-r border-gray-300">7.68%</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△0.9%p</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△1.6%p</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50 border-r border-gray-300">△0.9%p</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-600 bg-indigo-50">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 월별 추세 그래프 3개 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* 월별 채널별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4" id="sales-channel-chart">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            2025년 월별 채널별 매출 추세 (실판 V-, 1K HKD)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { month: '1월', 'Retail': 10646, 'Outlet': 4174, 'Online': 3197, total: 18017 },
              { month: '2월', 'Retail': 5811, 'Outlet': 1849, 'Online': 3313, total: 10973 },
              { month: '3월', 'Retail': 5260, 'Outlet': 1490, 'Online': 3182, total: 9932 },
              { month: '4월', 'Retail': 5982, 'Outlet': 1837, 'Online': 2694, total: 10513 },
              { month: '5월', 'Retail': 8370, 'Outlet': 1777, 'Online': 3245, total: 13392 },
              { month: '6월', 'Retail': 6621, 'Outlet': 1691, 'Online': 3239, total: 11551 },
              { month: '7월', 'Retail': 6518, 'Outlet': 1671, 'Online': 2917, total: 11106 },
              { month: '8월', 'Retail': 7080, 'Outlet': 1833, 'Online': 2502, total: 11415 },
              { month: '9월', 'Retail': 5282, 'Outlet': 1522, 'Online': 2855, total: 9659 },
              { month: '10월', 'Retail': 7890, 'Outlet': 1845, 'Online': 3569, total: 13304 }
            ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 12000]} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip 
                formatter={(value, name) => [`${value.toLocaleString()}K HKD`, name]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="Retail" stackId="a" fill="#93C5FD">
                {[
                  { pct: 59.1, y: 140 }, { pct: 53.0, y: 154 }, { pct: 53.0, y: 154 }, { pct: 56.9, y: 148 }, { pct: 62.5, y: 135 }, 
                  { pct: 57.3, y: 147 }, { pct: 58.7, y: 144 }, { pct: 62.0, y: 136 }, { pct: 54.7, y: 151 }, { pct: 59.3, y: 142 }
                ].map((entry, index) => (
                  <text key={`label-retail-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
              <Bar dataKey="Outlet" stackId="a" fill="#C4B5FD">
                {[
                  { pct: 23.2, y: 205 }, { pct: 16.9, y: 213 }, { pct: 15.0, y: 217 }, { pct: 17.5, y: 212 }, { pct: 13.3, y: 218 }, 
                  { pct: 14.6, y: 216 }, { pct: 15.0, y: 217 }, { pct: 16.1, y: 214 }, { pct: 15.8, y: 215 }, { pct: 13.9, y: 218 }
                ].map((entry, index) => (
                  <text key={`label-outlet-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
              <Bar dataKey="Online" stackId="a" fill="#F9A8D4">
                {[
                  { pct: 17.7, y: 237 }, { pct: 30.2, y: 224 }, { pct: 32.0, y: 221 }, { pct: 25.6, y: 229 }, { pct: 24.2, y: 231 }, 
                  { pct: 28.0, y: 226 }, { pct: 26.3, y: 228 }, { pct: 21.9, y: 233 }, { pct: 29.6, y: 225 }, { pct: 26.8, y: 227 }
                ].map((entry, index) => (
                  <text key={`label-online-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#A78BFA' },
                { name: 'Retail', color: '#93C5FD' },
                { name: 'Outlet', color: '#C4B5FD' },
                { name: 'Online', color: '#F9A8D4' }
              ].map(channel => (
                <button
                  key={channel.name}
                  onClick={() => {
                    console.log('Clicked channel:', channel.name);
                    setSelectedChannel(selectedChannel === channel.name ? null : channel.name);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedChannel === channel.name
                      ? 'ring-2 ring-blue-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: channel.color,
                    color: '#1F2937'
                  }}
                >
                  {channel.name}
                </button>
              ))}
            </div>
            
            {selectedChannel && (
              <div className="mt-4">
                <div className="mb-2 text-xs text-gray-600">
                  선택된 채널: {selectedChannel}
                </div>
                {selectedChannel === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      retail: channelYOY['Retail'][idx],
                      outlet: channelYOY['Outlet'][idx],
                      online: channelYOY['Online'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 250]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                      <Line type="monotone" dataKey="retail" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="Retail" />
                      <Line type="monotone" dataKey="outlet" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="Outlet" />
                      <Line type="monotone" dataKey="online" stroke="#EC4899" strokeWidth={3} dot={{ r: 4 }} connectNulls name="Online" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: channelYOY[selectedChannel]?.[idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{selectedChannel === '전체' ? '채널' : selectedChannel}</th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChannel === '전체' ? (
                        <>
                          {['Retail', 'Outlet', 'Online'].map(channel => (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-blue-50">{channel}</td>
                              {channelYOY[channel].map((yoy, idx) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {yoy}%
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold bg-blue-50">YOY</td>
                          {channelYOY[selectedChannel].map((yoy, idx) => (
                            <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
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
          
          <div className="mt-3 grid grid-cols-3 gap-1">
            {selectedChannel === null || selectedChannel === '전체' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 1월 최대 18,017</div>
                    <div>• 9월 최저 9,659</div>
                    <div>• 10월 회복 13,304</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 채널 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• Retail: 최대 비중 유지 (59%)</div>
                    <div>• Online: 고성장 (YOY 129%)</div>
                    <div>• Outlet: 안정적 기여</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 온라인 채널 집중 육성</div>
                    <div>• 9월 비수기 대응 전략</div>
                    <div>• Retail 효율성 제고</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'Retail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Retail 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 최대 비중 채널 (50~60%)</div>
                    <div>• 8월 최고 12,216K</div>
                    <div>• YOY 평균 90% 수준</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 1월 114% 강한 출발</div>
                    <div>• 2~6월 부진 (50~87%)</div>
                    <div>• 9월 회복세 (117%)</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 상반기 매출 회복 전략</div>
                    <div>• 주력 채널 강화 필요</div>
                    <div>• 9월 모멘텀 지속화</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 전체의 14~18% 비중</div>
                    <div>• 1월 최고 5,479K</div>
                    <div>• YOY 평균 80% 수준</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 1월 114% 양호</div>
                    <div>• 2월 급감 54%</div>
                    <div>• 7~8월 회복 (105~106%)</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 소진 효율화</div>
                    <div>• 할인 전략 최적화</div>
                    <div>• 2~6월 부진 원인 분석</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Online' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Online 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 비중 작지만 고성장 (1~5%)</div>
                    <div>• 10월 최고 943K</div>
                    <div>• YOY 평균 140% 폭발 성장</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 8월 294% 급성장</div>
                    <div>• 9월 251% 지속</div>
                    <div>• 10월 318% 역대 최고</div>
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
                    <div>• 전체의 19~28% 비중</div>
                    <div>• 1월 최고 7,631K</div>
                    <div>• YOY 평균 75% 부진</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 연중 100% 미달</div>
                    <div>• 2월 최저 51%</div>
                    <div>• 8월 유일 103% 달성</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 마카오 시장 회복 전략</div>
                    <div>• 현지 마케팅 강화</div>
                    <div>• 관광객 유치 방안</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'MC Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 최소 비중 채널 (2.6~4.5%)</div>
                    <div>• 1월 최고 1,365K</div>
                    <div>• YOY 평균 100% 수준</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 1월 183% 강세</div>
                    <div>• 상반기 안정적 (94~109%)</div>
                    <div>• 10월 63% 급감</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 10월 급감 원인 파악</div>
                    <div>• 재고 운영 최적화</div>
                    <div>• 소규모 채널 효율성 제고</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* 월별 아이템별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              2025년 월별 아이템별 매출 추세 ({salesPriceType === '실판' ? '실판 V-' : salesPriceType === '택가' ? '택가 V+' : '할인율'}, {salesPriceType === '할인율' ? '%' : '1K HKD'})
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
          
          {/* 통합 데이터 구조 */}
          {(() => {
            const salesData = [
              { 
                month: '1월',
                실판_과시즌의류: Math.round((938508+482803)/1.05/1000),
                실판_당시즌의류: Math.round((1207393+8161943)/1.05/1000),
                실판_모자: Math.round(2438031/1.05/1000),
                실판_신발: Math.round(4816185/1.05/1000),
                실판_가방외: Math.round(872936/1.05/1000),
                택가_과시즌의류: Math.round((2613630+750231)/1000),
                택가_당시즌의류: Math.round((1392314+10532503)/1000),
                택가_모자: Math.round(2727949/1000),
                택가_신발: Math.round(6406724/1000),
                택가_가방외: Math.round(1112600/1000),
                할인율_과시즌의류: ((1-(938508+482803)/(2613630+750231))*100).toFixed(1),
                할인율_당시즌의류: ((1-(1207393+8161943)/(1392314+10532503))*100).toFixed(1),
                할인율_모자: ((1-2438031/2727949)*100).toFixed(1),
                할인율_신발: ((1-4816185/6406724)*100).toFixed(1),
                할인율_가방외: ((1-872936/1112600)*100).toFixed(1)
              },
              { 
                month: '2월',
                실판_과시즌의류: Math.round((331255+380420)/1.05/1000),
                실판_당시즌의류: Math.round((1300566+2792195)/1.05/1000),
                실판_모자: Math.round(2305202/1.05/1000),
                실판_신발: Math.round(3571247/1.05/1000),
                실판_가방외: Math.round(840657/1.05/1000),
                택가_과시즌의류: Math.round((919310+564553)/1000),
                택가_당시즌의류: Math.round((1501083+3681997)/1000),
                택가_모자: Math.round(2562172/1000),
                택가_신발: Math.round(4454762/1000),
                택가_가방외: Math.round(1022979/1000),
                할인율_과시즌의류: ((1-(331255+380420)/(919310+564553))*100).toFixed(1),
                할인율_당시즌의류: ((1-(1300566+2792195)/(1501083+3681997))*100).toFixed(1),
                할인율_모자: ((1-2305202/2562172)*100).toFixed(1),
                할인율_신발: ((1-3571247/4454762)*100).toFixed(1),
                할인율_가방외: ((1-840657/1022979)*100).toFixed(1)
              },
              { 
                month: '3월',
                실판_과시즌의류: Math.round((131289+973970)/1.05/1000),
                실판_당시즌의류: Math.round((2337092+867441)/1.05/1000),
                실판_모자: Math.round(2833659/1.05/1000),
                실판_신발: Math.round(2398964/1.05/1000),
                실판_가방외: Math.round(885044/1.05/1000),
                택가_과시즌의류: Math.round((355892+1543544)/1000),
                택가_당시즌의류: Math.round((2676819+1219780)/1000),
                택가_모자: Math.round(3568166/1000),
                택가_신발: Math.round(3099466/1000),
                택가_가방외: Math.round(1237593/1000),
                할인율_과시즌의류: ((1-(131289+973970)/(355892+1543544))*100).toFixed(1),
                할인율_당시즌의류: ((1-(2337092+867441)/(2676819+1219780))*100).toFixed(1),
                할인율_모자: ((1-2833659/3568166)*100).toFixed(1),
                할인율_신발: ((1-2398964/3099466)*100).toFixed(1),
                할인율_가방외: ((1-885044/1237593)*100).toFixed(1)
              },
              { 
                month: '4월',
                실판_과시즌의류: Math.round((363510+1336104)/1.05/1000),
                실판_당시즌의류: Math.round((3535832+0)/1.05/1000),
                실판_모자: Math.round(2647197/1.05/1000),
                실판_신발: Math.round(2546993/1.05/1000),
                실판_가방외: Math.round(608222/1.05/1000),
                택가_과시즌의류: Math.round((599549+2233868)/1000),
                택가_당시즌의류: Math.round((4073136+0)/1000),
                택가_모자: Math.round(2987106/1000),
                택가_신발: Math.round(3394287/1000),
                택가_가방외: Math.round(770352/1000),
                할인율_과시즌의류: ((1-(363510+1336104)/(599549+2233868))*100).toFixed(1),
                할인율_당시즌의류: ((1-(3535832+0)/(4073136+0))*100).toFixed(1),
                할인율_모자: ((1-2647197/2987106)*100).toFixed(1),
                할인율_신발: ((1-2546993/3394287)*100).toFixed(1),
                할인율_가방외: ((1-608222/770352)*100).toFixed(1)
              },
              { 
                month: '5월',
                실판_과시즌의류: Math.round((198765+1454545)/1.05/1000),
                실판_당시즌의류: Math.round((4958048+0)/1.05/1000),
                실판_모자: Math.round(3668064/1.05/1000),
                실판_신발: Math.round(2922669/1.05/1000),
                실판_가방외: Math.round(858840/1.05/1000),
                택가_과시즌의류: Math.round((298202+2468528)/1000),
                택가_당시즌의류: Math.round((5766900+0)/1000),
                택가_모자: Math.round(4174667/1000),
                택가_신발: Math.round(3780463/1000),
                택가_가방외: Math.round(1059909/1000),
                할인율_과시즌의류: ((1-(198765+1454545)/(298202+2468528))*100).toFixed(1),
                할인율_당시즌의류: ((1-(4958048+0)/(5766900+0))*100).toFixed(1),
                할인율_모자: ((1-3668064/4174667)*100).toFixed(1),
                할인율_신발: ((1-2922669/3780463)*100).toFixed(1),
                할인율_가방외: ((1-858840/1059909)*100).toFixed(1)
              },
              { 
                month: '6월',
                실판_과시즌의류: Math.round((200915+1465353)/1.05/1000),
                실판_당시즌의류: Math.round((3788816+0)/1.05/1000),
                실판_모자: Math.round(3107821/1.05/1000),
                실판_신발: Math.round(2736255/1.05/1000),
                실판_가방외: Math.round(828698/1.05/1000),
                택가_과시즌의류: Math.round((298379+2673081)/1000),
                택가_당시즌의류: Math.round((4304851+0)/1000),
                택가_모자: Math.round(3491689/1000),
                택가_신발: Math.round(3503865/1000),
                택가_가방외: Math.round(1033968/1000),
                할인율_과시즌의류: ((1-(200915+1465353)/(298379+2673081))*100).toFixed(1),
                할인율_당시즌의류: ((1-(3788816+0)/(4304851+0))*100).toFixed(1),
                할인율_모자: ((1-3107821/3491689)*100).toFixed(1),
                할인율_신발: ((1-2736255/3503865)*100).toFixed(1),
                할인율_가방외: ((1-828698/1033968)*100).toFixed(1)
              },
              { 
                month: '7월',
                실판_과시즌의류: Math.round((217410+1220460)/1.05/1000),
                실판_당시즌의류: Math.round((2986861+392125)/1.05/1000),
                실판_모자: Math.round(3360314/1.05/1000),
                실판_신발: Math.round(2647340/1.05/1000),
                실판_가방외: Math.round(837697/1.05/1000),
                택가_과시즌의류: Math.round((329405+2196464)/1000),
                택가_당시즌의류: Math.round((3380019+444303)/1000),
                택가_모자: Math.round(3762902/1000),
                택가_신발: Math.round(3414993/1000),
                택가_가방외: Math.round(1086689/1000),
                할인율_과시즌의류: ((1-(217410+1220460)/(329405+2196464))*100).toFixed(1),
                할인율_당시즌의류: ((1-(2986861+392125)/(3380019+444303))*100).toFixed(1),
                할인율_모자: ((1-3360314/3762902)*100).toFixed(1),
                할인율_신발: ((1-2647340/3414993)*100).toFixed(1),
                할인율_가방외: ((1-837697/1086689)*100).toFixed(1)
              },
              { 
                month: '8월',
                실판_과시즌의류: Math.round((442093+933800)/1.05/1000),
                실판_당시즌의류: Math.round((2195264+1419141)/1.05/1000),
                실판_모자: Math.round(3347379/1.05/1000),
                실판_신발: Math.round(2888719/1.05/1000),
                실판_가방외: Math.round(759440/1.05/1000),
                택가_과시즌의류: Math.round((685841+1726152)/1000),
                택가_당시즌의류: Math.round((2471121+1603549)/1000),
                택가_모자: Math.round(3724243/1000),
                택가_신발: Math.round(3640430/1000),
                택가_가방외: Math.round(961319/1000),
                할인율_과시즌의류: ((1-(442093+933800)/(685841+1726152))*100).toFixed(1),
                할인율_당시즌의류: ((1-(2195264+1419141)/(2471121+1603549))*100).toFixed(1),
                할인율_모자: ((1-3347379/3724243)*100).toFixed(1),
                할인율_신발: ((1-2888719/3640430)*100).toFixed(1),
                할인율_가방외: ((1-759440/961319)*100).toFixed(1)
              },
              { 
                month: '9월',
                실판_과시즌의류: Math.round((495910+672604)/1.05/1000),
                실판_당시즌의류: Math.round((871663+2166421)/1.05/1000),
                실판_모자: Math.round(2636617/1.05/1000),
                실판_신발: Math.round(2458013/1.05/1000),
                실판_가방외: Math.round(842073/1.05/1000),
                택가_과시즌의류: Math.round((786265+1265529)/1000),
                택가_당시즌의류: Math.round((992257+2464462)/1000),
                택가_모자: Math.round(3012557/1000),
                택가_신발: Math.round(3127126/1000),
                택가_가방외: Math.round(1385981/1000),
                할인율_과시즌의류: ((1-(495910+672604)/(786265+1265529))*100).toFixed(1),
                할인율_당시즌의류: ((1-(871663+2166421)/(992257+2464462))*100).toFixed(1),
                할인율_모자: ((1-2636617/3012557)*100).toFixed(1),
                할인율_신발: ((1-2458013/3127126)*100).toFixed(1),
                할인율_가방외: ((1-842073/1385981)*100).toFixed(1)
              },
              { 
                month: '10월',
                실판_과시즌의류: Math.round((1284655+653373)/1.05/1000),
                실판_당시즌의류: Math.round((406187+4593134)/1.05/1000),
                실판_모자: Math.round(3529424/1.05/1000),
                실판_신발: Math.round(2711686/1.05/1000),
                실판_가방외: Math.round(790738/1.05/1000),
                택가_과시즌의류: Math.round((2228501+1213371)/1000),
                택가_당시즌의류: Math.round((468154+5232711)/1000),
                택가_모자: Math.round(4009047/1000),
                택가_신발: Math.round(3487441/1000),
                택가_가방외: Math.round(1352438/1000),
                할인율_과시즌의류: ((1-(1284655+653373)/(2228501+1213371))*100).toFixed(1),
                할인율_당시즌의류: ((1-(406187+4593134)/(468154+5232711))*100).toFixed(1),
                할인율_모자: ((1-3529424/4009047)*100).toFixed(1),
                할인율_신발: ((1-2711686/3487441)*100).toFixed(1),
                할인율_가방외: ((1-790738/1352438)*100).toFixed(1)
              }
            ];

            // 현재 선택된 타입에 따라 데이터 변환
            const chartData = salesData.map(item => ({
              month: item.month,
              '과시즌의류': salesPriceType === '할인율' ? item.할인율_과시즌의류 : (salesPriceType === '실판' ? item.실판_과시즌의류 : item.택가_과시즌의류),
              '당시즌의류': salesPriceType === '할인율' ? item.할인율_당시즌의류 : (salesPriceType === '실판' ? item.실판_당시즌의류 : item.택가_당시즌의류),
              '모자': salesPriceType === '할인율' ? item.할인율_모자 : (salesPriceType === '실판' ? item.실판_모자 : item.택가_모자),
              '신발': salesPriceType === '할인율' ? item.할인율_신발 : (salesPriceType === '실판' ? item.실판_신발 : item.택가_신발),
              '가방외': salesPriceType === '할인율' ? item.할인율_가방외 : (salesPriceType === '실판' ? item.실판_가방외 : item.택가_가방외)
            }));

            return (
              <ResponsiveContainer width="100%" height={250}>
                {salesPriceType === '할인율' ? (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 30]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value, name) => [`${value}%`, name]}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="과시즌의류" stroke="#FCA5A5" strokeWidth={3} dot={{ r: 4 }} name="과시즌의류" />
                    <Line type="monotone" dataKey="당시즌의류" stroke="#34D399" strokeWidth={3} dot={{ r: 4 }} name="당시즌의류" connectNulls />
                    <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={3} dot={{ r: 4 }} name="모자" />
                    <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} name="신발" />
                    <Line type="monotone" dataKey="가방외" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} name="가방외" />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 26500]} tickFormatter={(value) => value.toLocaleString()} />
                    <Tooltip 
                      formatter={(value, name) => [`${value.toLocaleString()} HKD`, name]}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Bar dataKey="과시즌의류" stackId="a" fill="#FCA5A5" />
                    <Bar dataKey="당시즌의류" stackId="a" fill="#34D399" />
                    <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
                    <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
                    <Bar dataKey="가방외" stackId="a" fill="#C4B5FD" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            );
          })()}
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#FB923C' },
                { name: '당시즌의류', color: '#34D399' },
                { name: '과시즌의류', color: '#FCA5A5' },
                { name: '모자', color: '#93C5FD' },
                { name: '신발', color: '#FCD34D' },
                { name: '가방외', color: '#C4B5FD' }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => setSelectedSalesItem(selectedSalesItem === item.name ? null : item.name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedSalesItem === item.name
                      ? 'ring-2 ring-orange-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#1F2937'
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {selectedSalesItem && (
              <div className="mt-4">
                {selectedSalesItem === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      currSeason: salesItemYOY['당시즌의류'][idx],
                      pastSeason: salesItemYOY['과시즌의류'][idx],
                      cap: salesItemYOY['모자'][idx],
                      shoes: salesItemYOY['신발'][idx],
                      bagEtc: salesItemYOY['가방외'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="currSeason" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="당시즌의류" />
                      <Line type="monotone" dataKey="pastSeason" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌의류" />
                      <Line type="monotone" dataKey="cap" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="모자" />
                      <Line type="monotone" dataKey="shoes" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} connectNulls name="신발" />
                      <Line type="monotone" dataKey="bagEtc" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="가방외" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: salesItemYOY[selectedSalesItem]?.[idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#EA580C" strokeWidth={3} dot={{ r: 4 }} connectNulls name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{selectedSalesItem === '전체' ? '아이템' : selectedSalesItem}</th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSalesItem === '전체' ? (
                        <>
                          {['당시즌의류', '과시즌의류', '모자', '신발', '가방외'].map(item => (
                            <tr key={item}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-orange-50">{item}</td>
                              {salesItemYOY[item].map((yoy, idx) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {yoy === null ? '-' : `${yoy}%`}
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                            <td className="border border-gray-300 px-2 py-1 text-blue-900">합계</td>
                            {salesItemYOY['합계'].map((yoy, idx) => (
                              <td key={idx} className={`border border-gray-300 px-2 py-1 text-center ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {yoy}%
                              </td>
                            ))}
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1 font-semibold bg-orange-50">YOY</td>
                            {salesItemYOY[selectedSalesItem].map((yoy, idx) => (
                              <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {yoy === null ? '-' : `${yoy}%`}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-red-800 mb-1">🔥 시즌 트렌드 (실판 V-, 1K HKD)</h4>
              <div className="space-y-0.5 text-xs text-red-700">
                <div>• 1~3월: 24FW 9,165K → 25FW 전환기</div>
                <div>• 4~6월: 25SS 주력 11,253K (최대)</div>
                <div>• 7~10월: 25FW 본격화 10,876K</div>
                <div className="font-semibold mt-1">10월 의류: 과시즌 1,846K / 당시즌 4,761K</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-blue-800 mb-1">👔 ACC 카테고리 분석 (실판 V-)</h4>
              <div className="space-y-0.5 text-xs text-blue-700">
                <div>• 신발: 1월 4,587K → 10월 2,583K (YOY 102%)</div>
                <div>• 모자: 1월 2,322K → 10월 3,361K (YOY 166%)</div>
                <div>• 가방외: 1월 831K → 10월 753K (YOY 103%)</div>
                <div className="font-semibold mt-1">10월 악세 합계: 6,697K (YOY 127%)</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-amber-800 mb-1">⚡ 핵심 액션 아이템</h4>
              <div className="space-y-0.5 text-xs text-amber-700">
                <div>• 과시즌의류: 1,846K 집중 소진</div>
                <div className="pl-2">→ 과FW 1,224K + 과SS 622K</div>
                <div>• 당시즌FW: 4,761K 판매 가속화</div>
                <div className="pl-2">→ 입고 YOY 110%, 판매율 16.4% 안정</div>
                <div>• 모자: 3,361K 고성장 유지</div>
                <div className="pl-2">→ YOY 166%, 재고주수 33.7주 안정</div>
              </div>
            </div>
          </div>
        </div>

        {/* 월별 아이템별 재고 추세 (이동됨) */}
        <div className="bg-white rounded-lg shadow-md p-4" id="inventory-chart">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            2025년 월별 아이템별 재고 추세 (TAG, 1K HKD)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { month: '1월', 'F당시즌': Math.round(44822806.39/1000), 'S당시즌': Math.round(17019205.76/1000), '과시즌FW': Math.round(6060436.812/1000), '과시즌SS': Math.round(37941846.04/1000), '모자': Math.round(24371314.77/1000), '신발': Math.round(37766627.89/1000), '가방외': Math.round(14793727.52/1000), total: Math.round(182775965.2/1000), capWeeks: '40.0주', shoeWeeks: '41.6주', bagWeeks: '62.1주' },
              { month: '2월', 'F당시즌': Math.round(41182636.3/1000), 'S당시즌': Math.round(28650239.85/1000), '과시즌FW': Math.round(4874958.429/1000), '과시즌SS': Math.round(37503148.65/1000), '모자': Math.round(23719069.79/1000), '신발': Math.round(35485514.2/1000), '가방외': Math.round(15200544.77/1000), total: Math.round(186616112/1000), capWeeks: '39.6주', shoeWeeks: '38.2주', bagWeeks: '65.4주' },
              { month: '3월', 'F당시즌': Math.round(39946784.03/1000), 'S당시즌': Math.round(37346040.13/1000), '과시즌FW': Math.round(4285207.604/1000), '과시즌SS': Math.round(35831272.73/1000), '모자': Math.round(22505395.88/1000), '신발': Math.round(35069192.3/1000), '가방외': Math.round(14080618.41/1000), total: Math.round(189064511.1/1000), capWeeks: '36.0주', shoeWeeks: '37.9주', bagWeeks: '57.9주' },
              { month: '4월', 'F당시즌': Math.round(173964.6787/1000), 'S당시즌': Math.round(37573085.29/1000), '과시즌FW': Math.round(43493110.54/1000), '과시즌SS': Math.round(33576393.5/1000), '모자': Math.round(21039496.18/1000), '신발': Math.round(32689870.63/1000), '가방외': Math.round(13170863.35/1000), total: Math.round(181542819.5/1000), capWeeks: '33.5주', shoeWeeks: '36.0주', bagWeeks: '56.1주' },
              { month: '5월', 'F당시즌': Math.round(2610223.275/1000), 'S당시즌': Math.round(32085080.67/1000), '과시즌FW': Math.round(39158009.2/1000), '과시즌SS': Math.round(30781121.42/1000), '모자': Math.round(18132910.26/1000), '신발': Math.round(32345590.49/1000), '가방외': Math.round(12466467.89/1000), total: Math.round(165143144.6/1000), capWeeks: '26.1주', shoeWeeks: '35.1주', bagWeeks: '54.0주' },
              { month: '6월', 'F당시즌': Math.round(11628132.91/1000), 'S당시즌': Math.round(27826433.53/1000), '과시즌FW': Math.round(38857433.78/1000), '과시즌SS': Math.round(27641265.95/1000), '모자': Math.round(18903813.01/1000), '신발': Math.round(30440682.57/1000), '가방외': Math.round(12119850.12/1000), total: Math.round(158399702.2/1000), capWeeks: '25.7주', shoeWeeks: '32.8주', bagWeeks: '51.6주' },
              { month: '7월', 'F당시즌': Math.round(33365309.89/1000), 'S당시즌': Math.round(24389429.46/1000), '과시즌FW': Math.round(38419754.84/1000), '과시즌SS': Math.round(24993706.4/1000), '모자': Math.round(18871225.27/1000), '신발': Math.round(32161181.06/1000), '가방외': Math.round(11632800.58/1000), total: Math.round(162096230.5/1000), capWeeks: '24.4주', shoeWeeks: '39.5주', bagWeeks: '49.8주' },
              { month: '8월', 'F당시즌': Math.round(43087895.5/1000), 'S당시즌': Math.round(22039021.03/1000), '과시즌FW': Math.round(37697130.97/1000), '과시즌SS': Math.round(22825086.74/1000), '모자': Math.round(20520586.72/1000), '신발': Math.round(31569638.48/1000), '가방외': Math.round(11728777.08/1000), total: Math.round(179745550.9/1000), capWeeks: '25.1주', shoeWeeks: '40.3주', bagWeeks: '50.7주' },
              { month: '9월', 'F당시즌': Math.round(49752573.88/1000), 'S당시즌': Math.round(21062642.44/1000), '과시즌FW': Math.round(37041155.9/1000), '과시즌SS': Math.round(21429613.95/1000), '모자': Math.round(21979289.07/1000), '신발': Math.round(36412557.57/1000), '가방외': Math.round(11728279.23/1000), total: Math.round(192741433.7/1000), capWeeks: '27.6주', shoeWeeks: '46.4주', bagWeeks: '49.5주' },
              { month: '10월', 'F당시즌': Math.round(49752573.88/1000), 'S당시즌': Math.round(21140110.02/1000), '과시즌FW': Math.round(35998153.78/1000), '과시즌SS': Math.round(20057156.02/1000), '모자': Math.round(28120236.16/1000), '신발': Math.round(37953700.95/1000), '가방외': Math.round(11371800.49/1000), total: Math.round(204393731.3/1000), capWeeks: '33.7주', shoeWeeks: '48.1주', bagWeeks: '43.9주' }
            ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 220000]} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'total') return null;
                  return [`${value.toLocaleString()}K HKD`, name];
                }}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="F당시즌" stackId="a" fill="#FCA5A5" />
              <Bar dataKey="S당시즌" stackId="a" fill="#86EFAC" />
              <Bar dataKey="과시즌FW" stackId="a" fill="#D1D5DB" />
              <Bar dataKey="과시즌SS" stackId="a" fill="#E5E7EB" />
              <Bar dataKey="모자" stackId="a" fill="#93C5FD">
                <LabelList dataKey="capWeeks" position="center" fill="#000" fontSize={9} />
              </Bar>
              <Bar dataKey="신발" stackId="a" fill="#FCD34D">
                <LabelList dataKey="shoeWeeks" position="center" fill="#000" fontSize={9} />
              </Bar>
              <Bar dataKey="가방외" stackId="a" fill="#C4B5FD">
                <LabelList dataKey="bagWeeks" position="center" fill="#000" fontSize={9} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#A855F7' },
                { name: 'F당시즌', color: '#FCA5A5' },
                { name: 'S당시즌', color: '#86EFAC' },
                { name: '과시즌FW', color: '#D1D5DB' },
                { name: '과시즌SS', color: '#E5E7EB' },
                { name: '모자', color: '#93C5FD' },
                { name: '신발', color: '#FCD34D' },
                { name: '가방외', color: '#C4B5FD' }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => setSelectedInventoryItem(selectedInventoryItem === item.name ? null : item.name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedInventoryItem === item.name
                      ? 'ring-2 ring-purple-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#1F2937'
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {selectedInventoryItem && (
              <div className="mt-4">
                {selectedInventoryItem === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      fSeason: inventoryItemYOY['F당시즌'][idx],
                      sSeason: inventoryItemYOY['S당시즌'][idx],
                      pastFW: inventoryItemYOY['과시즌FW'][idx],
                      pastSS: inventoryItemYOY['과시즌SS'][idx],
                      cap: inventoryItemYOY['모자'][idx],
                      shoes: inventoryItemYOY['신발'][idx],
                      bagEtc: inventoryItemYOY['가방외'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="fSeason" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls name="F당시즌" />
                      <Line type="monotone" dataKey="sSeason" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="S당시즌" />
                      <Line type="monotone" dataKey="pastFW" stroke="#9CA3AF" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌FW" />
                      <Line type="monotone" dataKey="pastSS" stroke="#D1D5DB" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌SS" />
                      <Line type="monotone" dataKey="cap" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="모자" />
                      <Line type="monotone" dataKey="shoes" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} connectNulls name="신발" />
                      <Line type="monotone" dataKey="bagEtc" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="가방외" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: inventoryItemYOY[selectedInventoryItem]?.[idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#9333EA" strokeWidth={3} dot={{ r: 4 }} connectNulls name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{selectedInventoryItem === '전체' ? '아이템' : selectedInventoryItem}</th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInventoryItem === '전체' ? (
                        <>
                          {['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외'].map(item => (
                            <tr key={item}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-purple-50">{item}</td>
                              {inventoryItemYOY[item].map((yoy, idx) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                                  {yoy === null ? '-' : `${yoy}%`}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold bg-purple-50">YOY</td>
                          {inventoryItemYOY[selectedInventoryItem].map((yoy, idx) => (
                            <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                              {yoy === null ? '-' : `${yoy}%`}
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
          
          {/* 인사이트 카드 이동 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="bg-red-50 border border-red-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-red-800 mb-1">🚨 Critical Alert</h4>
              <div className="space-y-0.5 text-xs text-red-700">
                <div>• 과시즌FW 재고 36,000K (전년 44,552K, YOY 81%)</div>
                <div>• 과시즌SS 재고 20,057K (전년 15,752K, YOY 127%)</div>
                <div>• 총재고 204,394K (전년 210,020K, YOY 97%)</div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-orange-800 mb-1">⚠️ Risk Monitoring</h4>
              <div className="space-y-0.5 text-xs text-orange-700">
                <div>• 신발 재고주수 48.1주 (전년 49.5주)</div>
                <div>• 가방외 재고주수 43.9주 (전년 61.3주, 개선)</div>
                <div>• F당시즌 0K (시즌 전환 완료)</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-green-800 mb-1">✅ Positive Sign</h4>
              <div className="space-y-0.5 text-xs text-green-700">
                <div>• 신발 재고 YOY 96% 개선 중</div>
                <div>• 가방외 재고 YOY 77% 대폭 개선</div>
                <div>• 모자 재고주수 33.7주로 안정적</div>
              </div>
            </div>
          </div>
        </div>
      </div>




      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            오프라인 매장별 현황 (실판V-, 25년 10월 기준)
          </h3>
                      <a
            href="https://claude.ai/public/artifacts/c89f59a1-4655-45a2-8788-16a8b7b3049a"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2"
          >
            <span>월별 YOY추세</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* 전체 매장 요약 */}
          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg shadow-md p-4 border-l-4 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-200">오프라인 매장 요약</div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-white">16개 매장</div>
            <div className="text-xs mb-2 text-gray-300">실판매출 YOY 114%</div>
            <div className="text-[10px] text-gray-400 mb-3 italic">* 종료매장·온라인 제외</div>
            
            <div className="border-t pt-3 space-y-1.5 border-gray-600 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-300">전체 직접이익</span>
                <span className="text-xs font-semibold text-green-300">1,227K HKD</span>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600 mb-3">
              <div className="text-xs text-gray-300 mb-2 font-semibold">채널별 구분</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-gray-600 px-2 py-1 rounded">
                  <span className="text-xs text-gray-200">리테일</span>
                  <span className="text-xs font-semibold text-gray-200">13개 | YOY 115% | +1,287K</span>
                </div>
                <div className="flex justify-between items-center bg-gray-600 px-2 py-1 rounded">
                  <span className="text-xs text-gray-200">아울렛</span>
                  <span className="text-xs font-semibold text-red-300">3개 | YOY 107% | -60K</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600">
              <div className="text-xs text-gray-300 w-full space-y-1">
                <button
                  onClick={() => setShowProfitStores(!showProfitStores)}
                  className="flex justify-between gap-1 py-1 border-b-2 border-gray-500 font-semibold w-full hover:bg-gray-600 px-1 rounded transition-colors"
                >
                  <span className="w-20">흑자매장:</span>
                  <span className="w-16 text-right font-bold text-green-300">12개 {showProfitStores ? '▼' : '▶'}</span>
                </button>
                
                {showProfitStores && (
                  <div className="pl-3 space-y-0.5 text-[10px] bg-gray-800 rounded p-2 mt-1">
                    <div className="text-gray-400 font-semibold mb-1">리테일 (12개)</div>
                    <div className="flex justify-between pl-2">
                      <span>한신아레나</span>
                      <span className="text-green-300">+216K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Nanjing</span>
                      <span className="text-green-300">+186K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Taimall</span>
                      <span className="text-green-300">+165K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>원동반치아오</span>
                      <span className="text-green-300">+164K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>TS Mall</span>
                      <span className="text-green-300">+163K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Taipei101</span>
                      <span className="text-green-300">+128K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Metrowalk</span>
                      <span className="text-green-300">+69K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>라라포트 타이중</span>
                      <span className="text-green-300">+68K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>라라포트 난강</span>
                      <span className="text-green-300">+54K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>타이중중우</span>
                      <span className="text-green-300">+52K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>SKM Tainan</span>
                      <span className="text-green-300">+29K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Sogo 종샤오</span>
                      <span className="text-green-300">+13K</span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setShowLossStores(!showLossStores)}
                  className="flex justify-between gap-1 py-0.5 w-full hover:bg-gray-600 px-1 rounded transition-colors"
                >
                  <span className="w-20">적자매장:</span>
                  <span className="w-16 text-right font-semibold text-red-300">4개 {showLossStores ? '▼' : '▶'}</span>
                </button>
                
                {showLossStores && (
                  <div className="pl-3 space-y-0.5 text-[10px] bg-gray-800 rounded p-2 mt-1">
                    <div className="text-gray-400 font-semibold mb-1">리테일 (1개)</div>
                    <div className="flex justify-between pl-2">
                      <span>Zhongxiao</span>
                      <span className="text-red-300">-20K</span>
                    </div>
                    
                    <div className="text-gray-400 font-semibold mb-1 mt-2">아울렛 (3개)</div>
                    <div className="flex justify-between pl-2">
                      <span>Gloria</span>
                      <span className="text-red-300">-50K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Mitsui</span>
                      <span className="text-red-300">-8K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>린커우</span>
                      <span className="text-red-300">-2K</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between gap-1 py-0.5">
                  <span className="w-20">채널 YOY:</span>
                  <span className="w-16 text-right font-semibold text-green-300">리테일 133% | 아웃렛 107%</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOP 성과 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">TOP 성과 매장</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                흑자+성장률
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">Nanjing</span>
                  <span className="text-lg font-bold text-green-700">161%</span>
                </div>
                <div className="text-xs text-green-600">
                  직접이익: +186K HKD | 연간 흑자 전환
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  최고 성장률 + 대폭 흑자 개선
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">SKM Tainan</span>
                  <span className="text-lg font-bold text-green-700">148%</span>
                </div>
                <div className="text-xs text-green-600">
                  직접이익: +29K HKD | 고성장
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  신규점 중 고성장 매장
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">Taipei101</span>
                  <span className="text-lg font-bold text-green-700">142%</span>
                </div>
                <div className="text-xs text-green-600">
                  직접이익: +128K HKD | 안정 흑자
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  고성장 + 높은 수익성
                </div>
              </div>
            </div>
          </div>

          {/* 직접이익 우수 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">직접이익 우수</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                10월 직접이익
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">한신아레나</span>
                  <span className="text-lg font-bold text-blue-700">+216K</span>
                </div>
                <div className="text-xs text-blue-600">
                  10월 YOY: 136% | 매출 1,239K
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">Nanjing</span>
                  <span className="text-lg font-bold text-blue-700">+186K</span>
                </div>
                <div className="text-xs text-blue-600">
                  10월 YOY: 161% | 매출 869K
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">Taimall</span>
                  <span className="text-lg font-bold text-blue-700">+165K</span>
                </div>
                <div className="text-xs text-blue-600">
                  10월 YOY: 132% | 매출 734K
                </div>
              </div>
            </div>
          </div>

          {/* 관리 필요 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">관리 필요 매장</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                총 적자 4개
              </div>
            </div>
            
            <div className="space-y-2">
              {/* Gloria 아울렛 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border-l-4 border-red-600">
                <button 
                  onClick={() => setShowGloriaDetail(!showGloriaDetail)}
                  className="w-full p-3 flex justify-between items-center hover:bg-red-100 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">Gloria 아울렛</span>
                    <span className="text-lg font-bold text-red-600">-50K</span>
                    <span className="text-xs text-green-600 font-semibold">YOY 112%</span>
                  </div>
                  {showGloriaDetail ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                {showGloriaDetail && (
                  <div className="px-3 pb-3 text-xs text-gray-700 space-y-1 border-t border-red-200 pt-2">
                    <div>💰 매출: <span className="font-semibold">975K</span> <span className="text-blue-600">(최대)</span></div>
                    <div className="bg-red-100 rounded p-1.5 text-xs mt-1">
                      ⚠️ 임차료율 <span className="font-bold text-red-700">12.1%</span> + 비용 과다
                    </div>
                  </div>
                )}
              </div>

              {/* Zhongxiao 리테일 */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border-l-4 border-orange-600">
                <button 
                  onClick={() => setShowZhongxiaoDetail(!showZhongxiaoDetail)}
                  className="w-full p-3 flex justify-between items-center hover:bg-orange-100 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">Zhongxiao</span>
                    <span className="text-lg font-bold text-red-600">-20K</span>
                    <span className="text-xs text-red-600 font-semibold">YOY 79%</span>
                  </div>
                  {showZhongxiaoDetail ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                {showZhongxiaoDetail && (
                  <div className="px-3 pb-3 text-xs text-gray-700 space-y-1 border-t border-orange-200 pt-2">
                    <div>💰 매출: <span className="font-semibold">422K</span></div>
                    <div className="bg-yellow-100 rounded p-1.5 text-xs mt-1">
                      ⚠️ 임차료율 <span className="font-bold text-red-700">41.9%</span> + 인건비율 <span className="font-bold text-red-700">10.7%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mitsui 아울렛 */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-l-4 border-orange-500">
                <button 
                  onClick={() => setShowMitsuiDetail(!showMitsuiDetail)}
                  className="w-full p-3 flex justify-between items-center hover:bg-orange-100 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">Mitsui 아울렛</span>
                    <span className="text-lg font-bold text-red-600">-8K</span>
                    <span className="text-xs text-green-600 font-semibold">YOY 127%</span>
                  </div>
                  {showMitsuiDetail ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                {showMitsuiDetail && (
                  <div className="px-3 pb-3 text-xs text-gray-700 space-y-1 border-t border-orange-200 pt-2">
                    <div>💰 매출: <span className="font-semibold">536K</span></div>
                    <div className="bg-blue-100 rounded p-1.5 text-xs italic mt-1">
                      📈 고성장 중이나 소폭 적자
                    </div>
                  </div>
                )}
              </div>

              {/* 린커우 아울렛 */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-l-4 border-orange-500">
                <button 
                  onClick={() => setShowLinkouDetail(!showLinkouDetail)}
                  className="w-full p-3 flex justify-between items-center hover:bg-orange-100 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">린커우 아울렛</span>
                    <span className="text-lg font-bold text-red-600">-2K</span>
                    <span className="text-xs text-red-600 font-semibold">YOY 76%</span>
                  </div>
                  {showLinkouDetail ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                {showLinkouDetail && (
                  <div className="px-3 pb-3 text-xs text-gray-700 space-y-1 border-t border-orange-200 pt-2">
                    <div>💰 매출: <span className="font-semibold">334K</span></div>
                    <div className="bg-orange-100 rounded p-1.5 text-xs mt-1">
                      📉 저성장 + 소폭 적자
                    </div>
                  </div>
                )}
              </div>

              {/* 관리 인사이트 */}
              <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-lg border-l-4 border-red-600 mt-3">
                <button 
                  onClick={() => setShowManagementPoint(!showManagementPoint)}
                  className="w-full p-3 flex justify-between items-center hover:bg-red-200 transition-colors rounded-lg"
                >
                  <div className="text-sm font-bold text-red-900 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>관리 포인트</span>
                  </div>
                  {showManagementPoint ? (
                    <ChevronDown className="w-4 h-4 text-red-900" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-red-900" />
                  )}
                </button>
                
                {showManagementPoint && (
                  <div className="px-3 pb-3 text-xs text-red-800 space-y-1.5 border-t border-red-300 pt-2">
                    <div className="flex items-start gap-1">
                      <span className="text-red-600 font-bold">•</span>
                      <span>아울렛 3개 전체 적자 <span className="font-bold">(-60K)</span></span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-red-600 font-bold">•</span>
                      <span>Gloria 과도한 비용 구조</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-red-600 font-bold">•</span>
                      <span>Zhongxiao 임차료율 42% 과다</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-red-600 font-bold">•</span>
                      <span className="font-semibold">비용 효율화 전략 시급</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 대만 매장 특징 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">대만 매장 특징</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                전략 포인트
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg border border-purple-200">
                <button 
                  onClick={() => setShowNewStoreDetail(!showNewStoreDetail)}
                  className="w-full p-2 flex justify-between items-center hover:bg-purple-100 transition-colors rounded-lg"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-bold text-purple-800">신규 매장 2개</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-700">흑자</span>
                      {showNewStoreDetail ? (
                        <ChevronDown className="w-4 h-4 text-purple-800" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-purple-800" />
                      )}
                    </div>
                  </div>
                </button>
                {showNewStoreDetail && (
                  <div className="px-2 pb-2 border-t border-purple-200">
                    <div className="text-xs text-purple-600 mt-2">
                      라라포트 타이중: +68K | 라라포트 난강: +54K
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      신규점 빠른 안정화
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-purple-50 rounded-lg border border-purple-200">
                <button 
                  onClick={() => setShowLowGrowthDetail(!showLowGrowthDetail)}
                  className="w-full p-2 flex justify-between items-center hover:bg-purple-100 transition-colors rounded-lg"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-bold text-purple-800">저성장 매장</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-orange-700">76-79%</span>
                      {showLowGrowthDetail ? (
                        <ChevronDown className="w-4 h-4 text-purple-800" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-purple-800" />
                      )}
                    </div>
                  </div>
                </button>
                {showLowGrowthDetail && (
                  <div className="px-2 pb-2 border-t border-purple-200">
                    <div className="text-xs text-purple-600 mt-2">
                      린커우 76% | Zhongxiao 79%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      매출 회복 전략 필요
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-purple-50 rounded-lg border border-purple-200">
                <button 
                  onClick={() => setShowCostStructureDetail(!showCostStructureDetail)}
                  className="w-full p-2 flex justify-between items-center hover:bg-purple-100 transition-colors rounded-lg"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-bold text-purple-800">비용 구조</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-purple-700">26.8%</span>
                      {showCostStructureDetail ? (
                        <ChevronDown className="w-4 h-4 text-purple-800" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-purple-800" />
                      )}
                    </div>
                  </div>
                </button>
                {showCostStructureDetail && (
                  <div className="px-2 pb-2 border-t border-purple-200">
                    <div className="text-xs text-purple-600 mt-2">
                      임차료율 18.8% + 인건비율 8.0%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      평균 비용율 (전체 평균)
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="text-xs text-purple-700">
                <div className="font-semibold mb-1">🎯 주요 전략</div>
                <div className="text-purple-600">• 신규점 성공 모델 확대 적용</div>
                <div className="text-purple-600">• 저성장 매장 VMD 개선</div>
                <div className="text-purple-600">• 적자점 비용 구조 재검토</div>
              </div>
            </div>
          </div>
        </div>
      </div>

                {/* 온라인 채널별 현황 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></div>
            온라인 채널별 현황 (실판V-, 25년 10월 기준, 1K HKD)
          </h3>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {/* 전체 온라인 요약 */}
          <div className="bg-gradient-to-br from-cyan-700 to-cyan-900 rounded-lg shadow-md p-4 border-l-4 border-cyan-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-cyan-200">온라인 채널 요약</div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-white">3개 채널</div>
            <div className="text-xs mb-2 text-cyan-300">실판매출 YOY 129%</div>
            
            <div className="border-t pt-3 space-y-1.5 border-cyan-600 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-cyan-300">당월 매출</span>
                <span className="text-xs font-semibold text-white">3,569K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-cyan-300">전년 매출</span>
                <span className="text-xs font-semibold text-cyan-200">2,759K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-cyan-300">증가액</span>
                <span className="text-xs font-semibold text-green-300">+810K</span>
              </div>
            </div>
            
            <div className="border-t pt-3 border-cyan-600 mb-3">
              <button 
                onClick={() => setShowOnlineRatioDetail(!showOnlineRatioDetail)}
                className="w-full flex justify-between items-center text-xs text-cyan-300 mb-2 font-semibold hover:text-cyan-100 transition-colors"
              >
                <span>전체 매출 대비 온라인 비중</span>
                {showOnlineRatioDetail ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {showOnlineRatioDetail && (
                <div className="space-y-1.5">
                  <div className="bg-cyan-600 px-2 py-2 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-cyan-200">당월 (25년 10월)</span>
                      <span className="text-sm font-bold text-white">26.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cyan-200">전년 (24년 10월)</span>
                      <span className="text-xs font-semibold text-cyan-200">24.4%</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-cyan-500">
                      <span className="text-xs text-cyan-200">비중 변화</span>
                      <span className="text-sm font-bold text-green-300">+2.4%p ↑</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t pt-3 border-cyan-600 mb-3">
              <div className="text-xs text-cyan-300 mb-2 font-semibold">채널별 직접이익</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-cyan-600 px-2 py-1 rounded">
                  <span className="text-xs text-cyan-200">자사몰</span>
                  <span className="text-xs font-semibold text-white">622K (39.1%)</span>
                </div>
                <div className="flex justify-between items-center bg-cyan-600 px-2 py-1 rounded">
                  <span className="text-xs text-cyan-200">Momo</span>
                  <span className="text-xs font-semibold text-white">224K (18.1%)</span>
                </div>
                <div className="flex justify-between items-center bg-cyan-600 px-2 py-1 rounded">
                  <span className="text-xs text-cyan-200">Shopee</span>
                  <span className="text-xs font-semibold text-white">178K (23.9%)</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-3 border-cyan-600">
              <div className="flex justify-between items-center">
                <span className="text-xs text-cyan-300">전체 직접이익</span>
                <span className="text-xs font-semibold text-green-300">1,024K (28.7%)</span>
              </div>
            </div>
          </div>

          {/* 자사몰 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">자사몰</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                최고수익
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">실매출</span>
                  <span className="text-lg font-bold text-green-700">1,590K</span>
                </div>
                <div className="text-xs text-green-600">
                  YOY 141% | 전년 대비 +591K
                </div>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">광고비</span>
                  <span className="font-semibold">11K (0.7%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">수수료</span>
                  <span className="font-semibold">101K (6.4%)</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 italic">
                  <span>└ 전년 수수료율</span>
                  <span>6.0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">물류비</span>
                  <span className="font-semibold">82K (5.1%)</span>
                </div>
              </div>
              
              <div className="bg-green-100 rounded-lg p-2 border border-green-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-900">직접이익</span>
                  <span className="text-lg font-bold text-green-800">622K</span>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  직접이익률 39.1% (최고)
                </div>
              </div>
            </div>
          </div>

          {/* Momo */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">Momo</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                안정채널
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">실매출</span>
                  <span className="text-lg font-bold text-blue-700">1,234K</span>
                </div>
                <div className="text-xs text-blue-600">
                  YOY 116% | 전년 대비 +168K
                </div>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">광고비</span>
                  <span className="font-semibold">98K (7.9%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">수수료</span>
                  <span className="font-semibold text-orange-600">168K (13.6%)</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 italic">
                  <span>└ 전년 수수료율</span>
                  <span>14.4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">물류비</span>
                  <span className="font-semibold">97K (7.8%)</span>
                </div>
              </div>
              
              <div className="bg-blue-100 rounded-lg p-2 border border-blue-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-900">직접이익</span>
                  <span className="text-lg font-bold text-blue-800">224K</span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  직접이익률 18.1%
                </div>
              </div>
            </div>
          </div>

          {/* Shopee */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">Shopee</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                고성장
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-purple-800">실매출</span>
                  <span className="text-lg font-bold text-purple-700">745K</span>
                </div>
                <div className="text-xs text-purple-600">
                  YOY 130% | 전년 대비 +173K
                </div>
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">광고비</span>
                  <span className="font-semibold text-red-600">118K (15.8%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">수수료</span>
                  <span className="font-semibold">66K (8.8%)</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 italic">
                  <span>└ 전년 수수료율</span>
                  <span>9.4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">물류비</span>
                  <span className="font-semibold">42K (5.6%)</span>
                </div>
              </div>
              
              <div className="bg-purple-100 rounded-lg p-2 border border-purple-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-900">직접이익</span>
                  <span className="text-lg font-bold text-purple-800">178K</span>
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  직접이익률 23.9%
                </div>
              </div>
            </div>
          </div>

          {/* 온라인 인사이트 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">채널 인사이트</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                전략 포인트
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="text-xs font-bold text-green-800 mb-1">✓ 강점</div>
                <div className="text-xs text-green-700 space-y-0.5">
                  <div>• 자사몰 고수익 (39.1%)</div>
                  <div>• 전채널 YOY 116~141%</div>
                  <div>• 온라인 비중 17.5%</div>
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="text-xs font-bold text-orange-800 mb-1">⚠️ 관리 포인트</div>
                <div className="text-xs text-orange-700 space-y-0.5">
                  <div>• Shopee 광고비 15.8%</div>
                  <div>• Momo 수수료 13.6%</div>
                  <div>• 물류비 평균 6.2%</div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="text-xs font-bold text-blue-800 mb-1">🎯 전략 방향</div>
                <div className="text-xs text-blue-700 space-y-0.5">
                  <div>• 자사몰 확대 집중</div>
                  <div>• 광고효율 개선</div>
                  <div>• 채널별 최적화</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 매장 운영 전략 & 액션 플랜 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <button
          onClick={() => setShowStoreTable(!showStoreTable)}
          className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            🎯 매장 운영 전략 & 액션 플랜
          </h3>
          {showStoreTable ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </button>
        
        {showStoreTable && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {/* 프로모션 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🎯</span>
                프로모션
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">카리나 FW 포스터 증정</div>
                  <div>11/13부터 진행 (구매금액 TWD 2,100 이상)</div>
                </div>
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">TWS 포토카드</div>
                  <div>11월말 (구매금액 TWD 650)</div>
                  <div className="text-blue-600 mt-1">→ 카리나 포스터 증정 완료 후 진행 예정</div>
                </div>
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">주력 상품 집중 홍보</div>
                  <div>카리나 커브 다운 중심 VM 전환</div>
                </div>
              </div>
            </div>

            {/* 핫 아이템 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-500">
              <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🔥</span>
                핫 아이템
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-green-200">
                  <div className="font-semibold text-green-800 mb-1">미야오 비니 판매 호조</div>
                  <div className="space-y-1">
                    <div>• 4주간 <span className="font-bold text-green-700">2,224개</span> 판매</div>
                    <div>• 초도 수량: 2,400개</div>
                    <div>• 리오더: <span className="font-bold text-green-700">3,800개</span> 진행</div>
                    <div className="text-green-600 mt-1">→ 12월 초 ETD 예정</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 제품 교육 & 미팅 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center">
                <span className="text-lg mr-2">📚</span>
                제품 교육 & 미팅
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-purple-200">
                  <div className="font-semibold text-purple-800 mb-1">11월 제품 교육</div>
                  <div>• 8월: FW 전체 시즌, 전매장 대상 진행</div>
                  <div className="mt-1">• 11월: 북부 매장 지역 위주 판매 리뷰 진행</div>
                </div>
              </div>
            </div>

            {/* 매장별 주요 액션 */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border-l-4 border-orange-500">
              <h4 className="text-sm font-bold text-orange-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🏬</span>
                매장별 주요 액션
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-orange-200">
                  <div className="font-semibold text-orange-800">온라인 1111 프로모션</div>
                  <div>11/13 누계 실적: <span className="font-bold text-green-700">6.7억</span></div>
                  <div className="text-green-600">전년비 <span className="font-bold">25% 성장</span> 중</div>
                </div>
                <div className="bg-white rounded p-2 border border-orange-200">
                  <div className="font-semibold text-orange-800">부진매장 DP 개선</div>
                  <div className="mt-1">• SKM TAINAN / 종샤오 SOGO</div>
                  <div className="text-green-600 mt-1">→ 전년비 전체실적 <span className="font-bold">20% 성장</span> 중</div>
                  <div className="text-green-600">→ 25FW WEAR <span className="font-bold">25% 성장</span> 중</div>
                  <div className="text-blue-600 mt-1 italic">* 주차별 DP 업데이트 진행</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 점당매출 계산근거 모달 */}
      {showStoreCalcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowStoreCalcModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl p-3 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">📊 점당매출 계산근거</h3>
              <button
                onClick={() => setShowStoreCalcModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* 2025/2024 토글 버튼 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCalcYearView('2025')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded transition-colors ${
                  calcYearView === '2025'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                2025년 10월 (당월)
              </button>
              <button
                onClick={() => setCalcYearView('2024')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded transition-colors ${
                  calcYearView === '2024'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                2024년 10월 (전년)
              </button>
            </div>
            
            <div className="space-y-3">
              {calcYearView === '2025' ? (
                <>
                  {/* 2025년 10월 계산 */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border-l-4 border-green-500">
                <h4 className="text-sm font-bold text-green-900 mb-2">2025년 10월 (당월)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">총 매출</span>
                    <span className="font-bold text-gray-900">13,304K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">온라인 제외</span>
                    <span className="font-bold text-red-600">- 3,569K</span>
                  </div>
                  <div className="flex justify-between items-center bg-green-100 p-1.5 rounded border border-green-400">
                    <span className="text-green-800 font-semibold">오프라인 매출</span>
                    <span className="font-bold text-green-900">9,735K</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">정상운영 매장 수</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">÷ 16개</span>
                      <button
                        onClick={() => setShowStoreListInModal(!showStoreListInModal)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        {showStoreListInModal ? '숨기기' : '매장보기'}
                      </button>
                    </div>
                  </div>
                  {showStoreListInModal && (
                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                      <div className="font-semibold text-gray-700 mb-1">TW Retail (13개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• 한신아레나</div>
                        <div>• Taipei101</div>
                        <div>• Taimall</div>
                        <div>• 타이중중우</div>
                        <div>• TS Mall</div>
                        <div>• 원동반치아오</div>
                        <div>• 라라포트 타이중</div>
                        <div>• 라라포트 난강</div>
                        <div>• Nanjing</div>
                        <div>• Metrowalk</div>
                        <div>• Zhongxiao</div>
                        <div>• SKM Tainan</div>
                        <div>• Sogo 종샤오</div>
                      </div>
                      <div className="font-semibold text-gray-700 mt-2 mb-1">TW Outlet (3개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• Gloria 아울렛</div>
                        <div>• Mitsui 아울렛</div>
                        <div>• 린커우 아울렛</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-300 text-red-600 font-semibold">
                        종료 매장 (점당매출 계산 제외):
                      </div>
                      <div className="pl-2 text-red-600 text-xs">
                        <div>• 성품타이중: 0K (종료)</div>
                        <div>• 신주빅시티: 0K (종료)</div>
                        <div>• A11: 0K (종료)</div>
                        <div>• 신디엔: 0K (종료)</div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-gradient-to-r from-green-200 to-emerald-200 p-2 rounded border-2 border-green-600">
                    <span className="text-green-900 font-bold">점당 매출 (9,735 ÷ 16개)</span>
                    <span className="font-bold text-green-900 text-lg">608K</span>
                  </div>
                </div>
              </div>
                </>
              ) : (
                <>
                  {/* 2024년 10월 계산 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border-l-4 border-blue-500">
                <h4 className="text-sm font-bold text-blue-900 mb-2">2024년 10월 (전년)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">총 매출</span>
                    <span className="font-bold text-gray-900">11,321K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">온라인 제외</span>
                    <span className="font-bold text-red-600">- 2,760K</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-100 p-1.5 rounded border border-blue-400">
                    <span className="text-blue-800 font-semibold">오프라인 매출</span>
                    <span className="font-bold text-blue-900">8,561K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">매장 수</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">÷ 18개</span>
                      <button
                        onClick={() => setShowStoreListInModal2024(!showStoreListInModal2024)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        {showStoreListInModal2024 ? '숨기기' : '매장보기'}
                      </button>
                    </div>
                  </div>
                  {showStoreListInModal2024 && (
                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                      <div className="font-semibold text-gray-700 mb-1">TW Retail (15개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• 한신아레나: 913K</div>
                        <div>• Taipei101: 504K</div>
                        <div>• Taimall: 554K</div>
                        <div>• 타이중중우: 362K</div>
                        <div>• TS Mall: 456K</div>
                        <div>• 원동반치아오: 725K</div>
                        <div>• Nanjing: 541K</div>
                        <div>• Metrowalk: 416K</div>
                        <div>• Zhongxiao: 533K</div>
                        <div>• SKM Tainan: 204K</div>
                        <div>• Sogo 종샤오: 183K</div>
                        <div>• 성품타이중: 391K</div>
                        <div>• 신주빅시티: 486K</div>
                        <div>• A11: 438K</div>
                        <div>• 신디엔: 127K</div>
                      </div>
                      <div className="font-semibold text-gray-700 mt-2 mb-1 pt-1 border-t">리테일 소계: 6,832K</div>
                      
                      <div className="font-semibold text-gray-700 mt-2 mb-1">TW Outlet (3개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• Gloria 아울렛: 867K</div>
                        <div>• Mitsui 아울렛: 423K</div>
                        <div>• 린커우 아울렛: 438K</div>
                      </div>
                      <div className="font-semibold text-gray-700 mt-2 mb-1 pt-1 border-t">아웃렛 소계: 1,729K</div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-300 text-blue-600 font-semibold">
                        총 18개 매장 | 오프라인 합계: 8,561K
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-gradient-to-r from-blue-200 to-indigo-200 p-2 rounded border-2 border-blue-600">
                    <span className="text-blue-900 font-bold">점당 매출 (8,561 ÷ 18개)</span>
                    <span className="font-bold text-blue-900 text-lg">476K</span>
                  </div>
                </div>
              </div>
                </>
              )}

              {/* YOY 계산 - 항상 표시 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-l-4 border-purple-500">
                <h4 className="text-sm font-bold text-purple-900 mb-2">YOY 비교</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">당월 점당매출</span>
                    <span className="font-bold text-green-600">608K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">전년 점당매출</span>
                    <span className="font-bold text-blue-600">476K</span>
                  </div>
                  <div className="flex justify-between items-center bg-gradient-to-r from-purple-200 to-pink-200 p-2 rounded border-2 border-purple-600">
                    <span className="text-purple-900 font-bold">YOY (608 ÷ 476)</span>
                    <span className="font-bold text-purple-900 text-lg">128% ✅</span>
                  </div>
                </div>
              </div>

              {/* 참고사항 */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
                <p className="text-xs text-yellow-800">
                  <strong>📌 참고:</strong> 온라인 제외. 정상 운영 16개 매장만 계산 (신규 2개 포함). 전년 18개 → 당월 16개 (신규 +2개, 종료 -4개 = 순감소 2개). 신규 라라포트 타이중/난강은 정상 운영으로 점당매출 계산 포함.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowStoreCalcModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직접비 & 유통수수료 요약 섹션 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            직접비 요약 (1K HKD)
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
                <div className="text-2xl font-bold mb-2 text-indigo-900">4,846K</div>
                <div className="text-xs mb-3 text-green-600">YOY 110% (▲453K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">36.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△2.4%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">45,307K</div>
                <div className="text-xs mb-3 text-green-600">YOY 102% (+746K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">38.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△1.3%p</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">777K</div>
                <div className="text-xs mb-3 text-green-600">YOY 112% (▲84K)</div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">8.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                    <span className="text-xs font-semibold text-blue-600 text-right">△0.1%p</span>
                  </div>
                </div>
                
                {/* 당월 증감내용 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowAccExpenseDetail(!showAccExpenseDetail)}
                    className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showAccExpenseDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showAccExpenseDetail && (
                  <div className="mt-3 pt-3 border-t bg-cyan-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-cyan-600 mr-1">•</span>
                        <span className="text-gray-700">급여 전년비 112%, 매출대비 급여율 전년 대비 △0.1%p 개선</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-cyan-600 mr-1">•</span>
                        <span className="text-gray-700">매장 인원 효율성 개선으로 매출 증가 대비 급여 상승률 낮음</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">7,607K</div>
                <div className="text-xs mb-3 text-green-600">YOY 108% (+592K)</div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">8.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                    <span className="text-xs font-semibold text-green-600 text-right">+0.3%p</span>
                  </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">1,830K</div>
                <div className="text-xs mb-3 text-green-600">YOY 110% (+171K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">18.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.6%p</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowDiscountDetail(!showDiscountDetail)}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showDiscountDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showDiscountDetail && (
                  <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                    <div className="text-xs font-semibold text-teal-800 mb-2">임차료 구성</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 고정 임차료</span>
                        <span className="font-semibold">316K (3.2%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 턴오버 임차료</span>
                        <span className="font-semibold">1,514K (15.5%)</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-teal-200 text-xs text-teal-800">
                      → 신규매장 증가로 총 임차료 상승, 매출 대비 비율은 개선
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">16,880K</div>
                <div className="text-xs mb-3 text-green-600">YOY 102% (+394K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">19.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.3%p</span>
                  </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">618K</div>
                <div className="text-xs mb-3 text-green-600">YOY 107% (+39K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">3.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.4%p</span>
                  </div>
                </div>
                
                {/* 당월 증감내역 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowItemDiscountDetail(!showItemDiscountDetail)}
                    className="text-xs text-amber-600 hover:text-amber-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showItemDiscountDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showItemDiscountDetail && (
                  <div className="mt-3 pt-3 border-t bg-amber-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span className="text-gray-700">매출 증가(YOY 118%)에 따른 물류비 증가</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span className="text-gray-700">매출 대비 비율은 △0.4%p 개선</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">5,674K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 98% (▼127K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">3.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.3%p</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">1,621K</div>
                <div className="text-xs mb-3 text-green-600">YOY 107% (+159K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매장관리비</span>
                    <span className="text-xs font-semibold text-gray-800">200K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">광고비</span>
                    <span className="text-xs font-semibold text-gray-800">370K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">지급수수료</span>
                    <span className="text-xs font-semibold text-gray-800">494K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">198K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">기타</span>
                    <span className="text-xs font-semibold text-gray-800">360K</span>
                  </div>
                </div>
                
                {/* 당월 증감내역 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowMuDetail(!showMuDetail)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showMuDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showMuDetail && (
                  <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 매장관리비</span>
                        <span className="font-semibold text-green-600">+83K (171%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 광고비</span>
                        <span className="font-semibold text-green-600">+47K (115%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 지급수수료</span>
                        <span className="font-semibold text-green-600">+78K (119%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 감가상각비</span>
                        <span className="font-semibold text-blue-600">△17K (92%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 기타</span>
                        <span className="font-semibold text-blue-600">△32K (92%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">15,146K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 101% (▼113K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매장관리비</span>
                    <span className="text-xs font-semibold text-gray-800">2,152K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">광고비</span>
                    <span className="text-xs font-semibold text-gray-800">3,113K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">지급수수료</span>
                    <span className="text-xs font-semibold text-gray-800">4,174K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">2,337K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">기타</span>
                    <span className="text-xs font-semibold text-gray-800">3,371K</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 영업비 요약 섹션 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            영업비 요약 (1K HKD)
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
                <div className="text-2xl font-bold mb-2 text-emerald-900">906K</div>
                <div className="text-xs mb-3 text-red-600">YOY 120% (+151K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">6.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">6.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 악화</span>
                    <span className="text-xs font-semibold text-red-600">▲ 0.1%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">9,227K</div>
                <div className="text-xs mb-3 text-red-600">YOY 135% (+2,412K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">7.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">6.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 악화</span>
                    <span className="text-xs font-semibold text-red-600">▲ 1.8%p</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">342K</div>
                <div className="text-xs mb-3 text-red-600">YOY 112% (+37K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">37.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">2.6%</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowSeasonSalesDetail(!showSeasonSalesDetail)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showSeasonSalesDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showSeasonSalesDetail && (
                  <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-blue-600 mr-1">•</span>
                        <span className="text-gray-700">본사 급여 전년비 112%, 안정적 수준</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-blue-600 mr-1">•</span>
                        <span className="text-gray-700">매출 증가(YOY 118%) 대비 급여 상승률 낮음</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,694K</div>
                <div className="text-xs mb-3 text-red-600">YOY 133% (+915K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">40.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">3.1%</span>
                  </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">288K</div>
                <div className="text-xs mb-3 text-red-600">YOY 161% (+111K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">31.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출 대비</span>
                    <span className="text-xs font-semibold text-gray-800">2.2%</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowCurrentSeasonDetail(!showCurrentSeasonDetail)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showCurrentSeasonDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showCurrentSeasonDetail && (
                  <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-purple-600 mr-1">•</span>
                        <span className="text-gray-700">온라인 마케팅 강화로 전년 대비 대폭 증가</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-purple-600 mr-1">•</span>
                        <span className="text-gray-700">디지털 광고비 집중 투자 (온라인 YOY 129%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">2,371K</div>
                <div className="text-xs mb-3 text-red-600">YOY 139% (+666K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">25.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출 대비</span>
                    <span className="text-xs font-semibold text-gray-800">2.0%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 지급수수료 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-pink-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">지급수수료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-pink-100 text-pink-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">121K</div>
                <div className="text-xs mb-3 text-green-600">YOY 97% (▼4K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">13.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출 대비</span>
                    <span className="text-xs font-semibold text-gray-800">0.9%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,471K</div>
                <div className="text-xs mb-3 text-red-600">YOY 173% (+620K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">15.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출 대비</span>
                    <span className="text-xs font-semibold text-gray-800">1.2%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 기타 영업비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">기타 영업비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">155K</div>
                <div className="text-xs mb-3 text-green-600">YOY 107% (+11K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">83K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">34K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">38K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">0K</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,691K</div>
                <div className="text-xs mb-3 text-green-600">YOY 120% (+284K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">849K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">453K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">388K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">0K</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaiwanReport;