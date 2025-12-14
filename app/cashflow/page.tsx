'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface CFItem {
  prev_year: number;
  current_1_11: number;  // 2025년 1~11월 (실적)
  current_12: number;    // 2025년 12월 (E)
  current_total: number; // 2025년 (E)
}

interface CFData {
  period: string;
  summary: {
    beginning_cash: {
      prev_year: number;
      current: number;
    };
    operating_cash_flow: CFItem;
    investing_cash_flow: CFItem;
    financing_cash_flow: CFItem;
    ending_cash: {
      prev_year: number;
      current_1_11: number;  // 2025년 1~11월 (실적)
      current_12: number;    // 2025년 12월 (E)
      current_total: number; // 2025년 (E)
    };
  };
  operating_activities: {
    sales_collection: CFItem;
    goods_and_duties: CFItem;
    operating_expenses: CFItem;
    other_income: CFItem;
    corporate_tax: CFItem;
  };
  investing_activities: {
    hk_capex: CFItem;
    tw_capex: CFItem;
  };
  financing_activities: {
    total: CFItem;
  };
  ending_cash_detail: {
    hk_ending_cash: CFItem;
    tw_ending_cash: CFItem;
  };
}

function CashFlowPageContent() {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get('period') || '2511';
  const [selectedPeriod, setSelectedPeriod] = useState(periodParam || '2511');
  const [cfData, setCfData] = useState<CFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showDetailColumns, setShowDetailColumns] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/dashboard/cf-data-${selectedPeriod}.json`);
        if (!response.ok) {
          throw new Error('데이터를 불러올 수 없습니다');
        }
        const data = await response.json();
        setCfData(data);
      } catch (error) {
        console.error('Error loading cash flow data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod]);

  const formatNumber = (value: number): string => {
    if (value === 0) return '0';
    return Math.abs(value).toLocaleString();
  };

  const formatChange = (value: number): string => {
    if (value === 0) return '0';
    const sign = value > 0 ? '+' : '△';
    return `${sign}${Math.abs(value).toLocaleString()}`;
  };

  const getChangeClass = (value: number): string => {
    if (value === 0) return 'text-gray-500';
    return value > 0 ? 'text-green-600' : 'text-red-600';
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleAll = () => {
    if (expandedSections.size >= 3) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(['opcf', 'invcf', 'fincf']));
    }
  };

  const renderRow = (
    label: string,
    item: CFItem | undefined,
    indent: number = 0,
    isHeader: boolean = false,
    note?: string
  ) => {
    if (!item) return null;

    const indentClass = indent > 0 ? `pl-${indent * 8}` : '';
    const fontClass = isHeader ? 'font-bold' : 'font-semibold';
    const bgClass = isHeader ? 'bg-blue-50' : '';

    const yoy = item.current_total - item.prev_year;
    const yoyPercent = item.prev_year !== 0 
      ? Math.round((item.current_total / item.prev_year) * 100) 
      : 0;

    return (
      <tr className={`hover:bg-gray-100 ${bgClass}`}>
        <td className={`px-2 py-3 border border-gray-300 ${indentClass} ${fontClass}`}>{label}</td>
        <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} text-gray-900`}>
          {formatNumber(item.prev_year)}
        </td>
        {showDetailColumns && (
          <>
            <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} text-gray-900`}>
              {formatNumber(item.current_1_11)}
            </td>
            <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} text-gray-900`}>
              {formatNumber(item.current_12)}
            </td>
          </>
        )}
        <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} text-gray-900`}>
          {formatNumber(item.current_total)}
        </td>
        <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} ${getChangeClass(yoy)}`}>
          {formatChange(yoy)} ({yoyPercent}%)
        </td>
        <td className={`px-4 py-3 border border-gray-300 text-left ${fontClass} text-gray-700 text-sm`}>
          {note || ''}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">데이터 로딩 중...</div>
      </div>
    );
  }

  if (!cfData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">데이터를 불러올 수 없습니다</div>
      </div>
    );
  }

  const { summary, operating_activities, investing_activities, financing_activities, ending_cash_detail } = cfData;

  // 요약 계산
  const opcfYoy = summary.operating_cash_flow.current_total - summary.operating_cash_flow.prev_year;
  const opcfYoyPercent = summary.operating_cash_flow.prev_year !== 0
    ? Math.round((summary.operating_cash_flow.current_total / summary.operating_cash_flow.prev_year) * 100)
    : 0;

  // 현금 순유출 계산 (영업활동 + 투자활동 + 재무활동)
  const currentNetCashFlow = summary.operating_cash_flow.current_total + summary.investing_cash_flow.current_total + financing_activities.total.current_total;
  const prevNetCashFlow = summary.operating_cash_flow.prev_year + summary.investing_cash_flow.prev_year + financing_activities.total.prev_year;
  const netCashFlowYoy = currentNetCashFlow - prevNetCashFlow;
  const netCashFlowYoyPercent = prevNetCashFlow !== 0
    ? Math.round((currentNetCashFlow / prevNetCashFlow) * 100)
    : 0;

  // 영업활동 항목별 증감 계산
  const salesCollectionYoy = operating_activities.sales_collection.current_total - operating_activities.sales_collection.prev_year;
  const otherIncomeYoy = operating_activities.other_income.current_total - operating_activities.other_income.prev_year;
  const goodsDutiesYoy = operating_activities.goods_and_duties.current_total - operating_activities.goods_and_duties.prev_year;
  const operatingExpensesYoy = operating_activities.operating_expenses.current_total - operating_activities.operating_expenses.prev_year;
  const corporateTaxYoy = operating_activities.corporate_tax.current_total - operating_activities.corporate_tax.prev_year;

  // 영업활동 비고 생성
  const operatingNote = (() => {
    const netAmount = summary.operating_cash_flow.current_total;
    const isNetInflow = netAmount > 0;
    const prefix = isNetInflow ? '순유입' : '순유출';
    const netAmountStr = `${prefix} ${(Math.abs(netAmount) / 1000).toFixed(1)}백만 HKD`;
    
    const inflows: string[] = [];
    const outflows: string[] = [];

    if (salesCollectionYoy !== 0) {
      inflows.push(`매출수금 ${salesCollectionYoy > 0 ? '+' : '△'}${(Math.abs(salesCollectionYoy) / 1000).toFixed(1)}백만`);
    }
    if (otherIncomeYoy !== 0) {
      inflows.push(`기타수입 ${otherIncomeYoy > 0 ? '+' : '△'}${(Math.abs(otherIncomeYoy) / 1000).toFixed(1)}백만`);
    }
    if (goodsDutiesYoy !== 0) {
      outflows.push(`상품대 및 관세 ${goodsDutiesYoy > 0 ? '+' : '△'}${(Math.abs(goodsDutiesYoy) / 1000).toFixed(1)}백만`);
    }
    if (operatingExpensesYoy !== 0) {
      outflows.push(`운영비 ${operatingExpensesYoy > 0 ? '+' : '△'}${(Math.abs(operatingExpensesYoy) / 1000).toFixed(1)}백만`);
    }
    if (corporateTaxYoy !== 0) {
      outflows.push(`법인세 ${corporateTaxYoy > 0 ? '+' : '△'}${(Math.abs(corporateTaxYoy) / 1000).toFixed(1)}백만`);
    }

    const parts: string[] = [];
    if (inflows.length > 0) {
      parts.push(`유입: ${inflows.join(', ')}`);
    }
    if (outflows.length > 0) {
      parts.push(`유출: ${outflows.join(', ')}`);
    }

    const details = parts.length > 0 ? `, ${parts.join(' / ')}` : '';
    return `${netAmountStr}${details}`;
  })();

  const invcfYoy = summary.investing_cash_flow.current_total - summary.investing_cash_flow.prev_year;
  const invcfYoyPercent = summary.investing_cash_flow.prev_year !== 0
    ? Math.round((invcfYoy / Math.abs(summary.investing_cash_flow.prev_year)) * 100)
    : 0;

  // 투자활동 비고 생성
  const investingNote = (() => {
    const netAmount = summary.investing_cash_flow.current_total;
    const isNetInflow = netAmount > 0;
    const prefix = isNetInflow ? '순유입' : '순유출';
    const netAmountStr = `${prefix} ${(Math.abs(netAmount) / 1000).toFixed(1)}백만 HKD`;
    
    const hkCapexYoy = investing_activities.hk_capex.current_total - investing_activities.hk_capex.prev_year;
    const twCapexYoy = investing_activities.tw_capex.current_total - investing_activities.tw_capex.prev_year;
    
    const details: string[] = [];
    if (hkCapexYoy !== 0) {
      details.push(`홍콩 자산성지출 ${hkCapexYoy > 0 ? '+' : '△'}${(Math.abs(hkCapexYoy) / 1000).toFixed(1)}백만`);
    }
    if (twCapexYoy !== 0) {
      details.push(`대만 자산성지출 ${twCapexYoy > 0 ? '+' : '△'}${(Math.abs(twCapexYoy) / 1000).toFixed(1)}백만`);
    }
    
    const detailsStr = details.length > 0 ? `, ${details.join(', ')}` : '';
    return `${netAmountStr}${detailsStr}`;
  })();

  // 재무활동 비고 생성
  const financingNote = (() => {
    const netAmount = financing_activities.total.current_total;
    const isNetInflow = netAmount > 0;
    const prefix = isNetInflow ? '순유입' : '순유출';
    const netAmountStr = `${prefix} ${(Math.abs(netAmount) / 1000).toFixed(1)}백만 HKD`;
    
    if (netAmount === 0 && financing_activities.total.prev_year === 0) {
      return `${netAmountStr}, 차입금 입출금 없음. 무차입 경영 유지`;
    }
    
    const financingYoy = financing_activities.total.current_total - financing_activities.total.prev_year;
    const details = financingYoy !== 0 ? `, ${financingYoy > 0 ? '+' : '△'}${(Math.abs(financingYoy) / 1000).toFixed(1)}백만` : '';
    return `${netAmountStr}${details}`;
  })();

  const endingCashYoy = summary.ending_cash.current_total - summary.ending_cash.prev_year;
  const endingCashYoyPercent = summary.ending_cash.prev_year !== 0
    ? Math.round((summary.ending_cash.current_total / summary.ending_cash.prev_year) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">현금흐름표</h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold"
            >
              <option value="2511">2511</option>
            </select>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold hover:bg-gray-100 transition"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 한줄 요약 */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
            <div className="text-center">
              <div className="text-sm font-semibold mb-3 opacity-90 text-blue-900">
                📌 현금흐름 한줄 요약 (24년 → 25년 E)
              </div>
              <div className="text-base font-bold leading-relaxed text-gray-800 space-y-2">
                <div>
                  <span className="text-red-600">1. 현금 순유출</span> {(Math.abs(currentNetCashFlow) / 1000).toFixed(1)}백만 HKD
                  (전년비 {netCashFlowYoy > 0 ? '+' : '△'}{(Math.abs(netCashFlowYoy) / 1000).toFixed(1)}백만 {netCashFlowYoy < 0 ? '감소' : '증가'})
                  (기말현금 {(summary.ending_cash.current_total / 1000).toFixed(1)}백만, YOY {endingCashYoyPercent}%)
                </div>
                <div>
                  <span className="text-blue-700">2. 영업활동</span> {summary.operating_cash_flow.current_total > 0 ? '순유입' : '순유출'} {(Math.abs(summary.operating_cash_flow.current_total) / 1000).toFixed(1)}백만 HKD
                  (전년비 {opcfYoy > 0 ? '+' : '△'}{(Math.abs(opcfYoy) / 1000).toFixed(1)}백만, YOY {opcfYoyPercent}%)
                </div>
                <div>
                  <span className="text-purple-700">3. 투자활동</span> 순유출 {(Math.abs(summary.investing_cash_flow.current_total) / 1000).toFixed(1)}백만 HKD
                  (전년비 {invcfYoy > 0 ? '+' : '△'}{(Math.abs(invcfYoy) / 1000).toFixed(1)}백만 {invcfYoy < 0 ? '유출 증가' : '유출 감소'}, 홍콩 {(Math.abs(investing_activities.hk_capex.current_total) / 1000).toFixed(1)}백만, 대만 {(Math.abs(investing_activities.tw_capex.current_total) / 1000).toFixed(1)}백만)
                </div>
              </div>
            </div>
          </div>

          {/* 전체 접기/펴기 버튼 */}
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={() => setShowDetailColumns(!showDetailColumns)}
              className="px-6 py-2 bg-gradient-to-r from-purple-900 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-800 hover:to-purple-600 transition"
            >
              {showDetailColumns ? '25년 1~11월/12월 컬럼 숨기기' : '25년 1~11월/12월 컬럼 보이기'}
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-semibold">단위: 1k HKD</span>
              <button
                onClick={toggleAll}
                className="px-6 py-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-blue-600 transition"
              >
                전체 접기/펴기
              </button>
            </div>
          </div>

          {/* 현금흐름표 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-3 border border-gray-300 bg-gray-100 font-bold text-center" style={{ width: '15%' }}>
                    구분
                  </th>
                  <th className="px-2 py-3 border border-gray-300 bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-center" style={{ width: '9%' }}>
                    2024년
                  </th>
                  {showDetailColumns && (
                    <>
                      <th className="px-2 py-3 border border-gray-300 bg-gray-500 text-white font-bold text-center" style={{ width: '9%' }}>
                        25년 1~11월 (실적)
                      </th>
                      <th className="px-2 py-3 border border-gray-300 bg-gray-500 text-white font-bold text-center" style={{ width: '9%' }}>
                        25년 12월 (E)
                      </th>
                    </>
                  )}
                  <th className="px-2 py-3 border border-gray-300 bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-center" style={{ width: '9%' }}>
                    2025년 (E)
                  </th>
                  <th className="px-2 py-3 border border-gray-300 bg-gray-100 font-bold text-center" style={{ width: '7%' }}>
                    YOY
                  </th>
                  <th className="px-4 py-3 border border-gray-300 bg-gray-100 font-bold text-center" style={{ width: showDetailColumns ? '30%' : '40%' }}>
                    비고
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 기초현금 */}
                <tr className="bg-yellow-50 font-bold">
                  <td className="px-2 py-3 border border-gray-300 text-center text-blue-900">기초현금</td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.beginning_cash.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.beginning_cash.current)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.beginning_cash.current)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.beginning_cash.current)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(summary.beginning_cash.current - summary.beginning_cash.prev_year)}`}>
                    {formatChange(summary.beginning_cash.current - summary.beginning_cash.prev_year)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm"></td>
                </tr>

                {/* 영업활동 현금흐름 */}
                <tr
                  className="bg-blue-50 font-bold cursor-pointer"
                  onClick={() => toggleSection('opcf')}
                >
                  <td className="px-2 py-3 border border-gray-300">
                    1. 영업활동 현금흐름 {expandedSections.has('opcf') ? '▼' : '▶'}
                  </td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.operating_cash_flow.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.operating_cash_flow.current_1_11)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.operating_cash_flow.current_12)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.operating_cash_flow.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(opcfYoy)}`}>
                    {formatChange(opcfYoy)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {operatingNote}
                  </td>
                </tr>

                {expandedSections.has('opcf') && (
                  <>
                    {renderRow('+ 매출수금', operating_activities.sales_collection, 1)}
                    {renderRow('+ 기타수입', operating_activities.other_income, 1)}
                    {renderRow('△ 상품대 및 관세', operating_activities.goods_and_duties, 1)}
                    {renderRow('△ 운영비', operating_activities.operating_expenses, 1)}
                    {renderRow('△ 법인세', operating_activities.corporate_tax, 1)}
                  </>
                )}

                {/* 투자활동 현금흐름 */}
                <tr
                  className="bg-blue-50 font-bold cursor-pointer"
                  onClick={() => toggleSection('invcf')}
                >
                  <td className="px-2 py-3 border border-gray-300">
                    2. 투자활동 현금흐름 {expandedSections.has('invcf') ? '▼' : '▶'}
                  </td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.investing_cash_flow.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.investing_cash_flow.current_1_11)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.investing_cash_flow.current_12)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.investing_cash_flow.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(invcfYoy)}`}>
                    {formatChange(invcfYoy)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {investingNote}
                  </td>
                </tr>

                {expandedSections.has('invcf') && (
                  <>
                    {renderRow('△ 홍콩 자산성지출', investing_activities.hk_capex, 1, false, 'ISquare LCX 베네시안 세나도 리뉴얼, 디스커버리 1호점 오픈')}
                    {renderRow('△ 대만 자산성지출', investing_activities.tw_capex, 1, false, '디스커버리 2개점, 라라포트 난강, 타이중점 오픈')}
                  </>
                )}

                {/* 재무활동 현금흐름 */}
                <tr
                  className="bg-blue-50 font-bold cursor-pointer"
                  onClick={() => toggleSection('fincf')}
                >
                  <td className="px-2 py-3 border border-gray-300">
                    3. 재무활동 현금흐름 {expandedSections.has('fincf') ? '▼' : '▶'}
                  </td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(financing_activities.total.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(financing_activities.total.current_1_11)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(financing_activities.total.current_12)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(financing_activities.total.current_total)}
                  </td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-500">
                    0
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {financingNote}
                  </td>
                </tr>

                {/* 기말현금 */}
                <tr className="bg-yellow-100 font-bold">
                  <td className="px-2 py-3 border border-gray-300">기말현금</td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.ending_cash.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.ending_cash.current_1_11)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.ending_cash.current_12)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right bg-yellow-200 font-bold text-gray-900">
                    {formatNumber(summary.ending_cash.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(endingCashYoy)}`}>
                    {formatChange(endingCashYoy)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {endingCashYoy < 0 ? `전년비 ${Math.abs(endingCashYoyPercent)}% 감소 (${(Math.abs(endingCashYoy) / 1000).toFixed(1)}M HKD 감소). 영업현금 감소 및 투자 확대로 인한 현금 감소` : `전년비 ${endingCashYoyPercent}% 증가 (${(endingCashYoy / 1000).toFixed(1)}M HKD 증가). 현금 보유액 증가`}
                  </td>
                </tr>

                {expandedSections.has('ending') && (
                  <>
                    {renderRow('홍콩 기말현금', ending_cash_detail.hk_ending_cash, 1)}
                    {renderRow('대만 기말현금', ending_cash_detail.tw_ending_cash, 1)}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* 현금흐름 분석 */}
          <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
            <h3 className="text-green-900 mb-5 text-lg font-bold">
              <span className="text-xl mr-2">💵</span>현금흐름 분석
            </h3>
            <div className="grid grid-cols-3 gap-5 text-sm">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">영업활동 현금흐름</div>
                <div className="text-2xl font-bold text-red-600">
                  {(summary.operating_cash_flow.current_total / 1000).toFixed(1)}백만 HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: {(summary.operating_cash_flow.prev_year / 1000).toFixed(1)}백만 HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(opcfYoy)}`}>
                  {opcfYoy > 0 ? '△' : ''}{(Math.abs(opcfYoy) / 1000).toFixed(1)}백만 HKD ({opcfYoyPercent}%)
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">투자활동 현금흐름</div>
                <div className="text-2xl font-bold text-red-600">
                  {(Math.abs(summary.investing_cash_flow.current_total) / 1000).toFixed(1)}백만 HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: {(Math.abs(summary.investing_cash_flow.prev_year) / 1000).toFixed(1)}백만 HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(invcfYoy)}`}>
                  {invcfYoy > 0 ? '△' : ''}{(Math.abs(invcfYoy) / 1000).toFixed(1)}백만 HKD ({invcfYoyPercent}%)
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">기말 현금 보유액</div>
                <div className="text-2xl font-bold text-red-600">
                  {(summary.ending_cash.current_total / 1000).toFixed(1)}백만 HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: {(summary.ending_cash.prev_year / 1000).toFixed(1)}백만 HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(endingCashYoy)}`}>
                  {endingCashYoy > 0 ? '△' : ''}{(Math.abs(endingCashYoy) / 1000).toFixed(1)}백만 HKD ({endingCashYoyPercent}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">데이터 로딩 중...</div>
      </div>
    }>
      <CashFlowPageContent />
    </Suspense>
  );
}

