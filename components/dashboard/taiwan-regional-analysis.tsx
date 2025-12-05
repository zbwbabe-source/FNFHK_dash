'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import plData from './taiwan-pl-data.json';
import storeAreasData from './taiwan-store-areas.json';
import dashboardData from './taiwan-dashboard-data.json';
import storeLocationsData from './taiwan-store-locations.json';

interface RegionalData {
  region: string;
  region_kr: string;
  store_count: number;
  store_count_prev: number;
  total_sales: number;
  total_sales_prev: number;
  total_area: number;
  total_area_prev: number;
  total_direct_profit: number;
  total_direct_profit_prev: number;
  total_rent: number;
  total_rent_prev: number;
  total_labor_cost: number;
  total_labor_cost_prev: number;
  sales_per_pyeong: number;
  sales_per_pyeong_prev: number;
  direct_profit_per_pyeong: number;
  direct_profit_per_pyeong_prev: number;
  rent_per_pyeong: number;
  rent_per_pyeong_prev: number;
  labor_cost_per_pyeong: number;
  labor_cost_per_pyeong_prev: number;
  daily_sales_per_pyeong: number;
  daily_sales_per_pyeong_prev: number;
  yoy: number;
}

// 지역 순서를 상수로 정의 (북부 -> 중부 -> 남부)
const REGION_ORDER = ['북부', '중부', '남부'] as const;
const REGION_ORDER_MAP: Record<string, number> = {
  '북부': 0,
  '중부': 1,
  '남부': 2,
};

const TaiwanRegionalAnalysis: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [cityOnlyMode, setCityOnlyMode] = useState(false);
  const [showStoresMode, setShowStoresMode] = useState(false);
  const [showClosedStores, setShowClosedStores] = useState(false);
  const [showNewStores, setShowNewStores] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(region)) {
        newSet.delete(region);
      } else {
        newSet.add(region);
      }
      return newSet;
    });
  };

  const toggleCity = (cityKey: string) => {
    setExpandedCities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cityKey)) {
        newSet.delete(cityKey);
      } else {
        newSet.add(cityKey);
      }
      return newSet;
    });
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString('ko-KR');
  };

  const formatDecimal = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals);
  };

  // 지역별 데이터 계산 (전년 대비)
  const regionalData: RegionalData[] = useMemo(() => {
    const storeLocations = (storeLocationsData as any).store_locations;
    const regionSummary = (storeLocationsData as any).region_summary || {};
    const plStores = (plData as any)?.channel_direct_profit?.stores || {};
    const storeAreas = (storeAreasData as any)?.store_areas || {};

    // 현재 월 일수 (10월 = 31일)
    // 참고: channel_direct_profit.stores는 월별 데이터이므로 월별 일수로 나눔
    const currentMonthDays = 31;

    // REGION_ORDER 상수 순서대로 명시적으로 생성
    const data = REGION_ORDER.map((region, index) => {
      const regionData = regionSummary[region] || {};
      const storeCodes = regionData.store_codes || [];
      
      // 금년 (2510) 데이터
      let totalSales = 0;
      let totalArea = 0;
      let totalDirectProfit = 0;
      let totalRent = 0;
      let totalLaborCost = 0;
      let activeStoreCount = 0;

      // 전년 (2410) 데이터 (폐점 매장 포함)
      let totalSalesPrev = 0;
      let totalAreaPrev = 0;
      let totalDirectProfitPrev = 0;
      let totalRentPrev = 0;
      let totalLaborCostPrev = 0;
      let activeStoreCountPrev = 0;

      storeCodes.forEach((storeCode: string) => {
        // 온라인 제외
        if (storeCode.startsWith('TE')) return;
        
        const plStore = plStores[storeCode];
        const area = storeAreas[storeCode] || 0;
        
        if (!plStore || area === 0) return;
        
        const netSales = plStore.net_sales || 0;
        const netSalesPrev = plStore.net_sales_prev || 0;

        // 금년 데이터 (영업중인 매장만)
        if (netSales > 0) {
          totalSales += netSales;
          totalArea += area;
          totalDirectProfit += plStore.direct_profit || 0;
          totalRent += plStore.rent || 0;
          totalLaborCost += plStore.labor_cost || 0;
          activeStoreCount++;
        }

        // 전년 데이터 (폐점 매장 포함)
        if (netSalesPrev > 0) {
          totalSalesPrev += netSalesPrev;
          totalAreaPrev += area;
          totalDirectProfitPrev += plStore.direct_profit_prev || 0;
          totalRentPrev += plStore.rent_prev || 0;
          totalLaborCostPrev += plStore.labor_cost_prev || 0;
          activeStoreCountPrev++;
        }
      });

      const salesPerPyeong = totalArea > 0 ? totalSales / totalArea : 0;
      const salesPerPyeongPrev = totalAreaPrev > 0 ? totalSalesPrev / totalAreaPrev : 0;
      const directProfitPerPyeong = totalArea > 0 ? totalDirectProfit / totalArea : 0;
      const directProfitPerPyeongPrev = totalAreaPrev > 0 ? totalDirectProfitPrev / totalAreaPrev : 0;
      const rentPerPyeong = totalArea > 0 ? totalRent / totalArea : 0;
      const rentPerPyeongPrev = totalAreaPrev > 0 ? totalRentPrev / totalAreaPrev : 0;
      const laborCostPerPyeong = totalArea > 0 ? totalLaborCost / totalArea : 0;
      const laborCostPerPyeongPrev = totalAreaPrev > 0 ? totalLaborCostPrev / totalAreaPrev : 0;
      
      // 일평균 평당매출 (월별 기준)
      const dailySalesPerPyeong = (salesPerPyeong * 1000) / currentMonthDays;
      const dailySalesPerPyeongPrev = (salesPerPyeongPrev * 1000) / currentMonthDays;

      // YOY 계산
      const yoy = salesPerPyeongPrev > 0 ? ((salesPerPyeong - salesPerPyeongPrev) / salesPerPyeongPrev) * 100 : 0;

      return {
        region,
        region_kr: region,
        store_count: activeStoreCount,
        store_count_prev: activeStoreCountPrev,
        total_sales: totalSales,
        total_sales_prev: totalSalesPrev,
        total_area: totalArea,
        total_area_prev: totalAreaPrev,
        total_direct_profit: totalDirectProfit,
        total_direct_profit_prev: totalDirectProfitPrev,
        total_rent: totalRent,
        total_rent_prev: totalRentPrev,
        total_labor_cost: totalLaborCost,
        total_labor_cost_prev: totalLaborCostPrev,
        sales_per_pyeong: salesPerPyeong,
        sales_per_pyeong_prev: salesPerPyeongPrev,
        direct_profit_per_pyeong: directProfitPerPyeong,
        direct_profit_per_pyeong_prev: directProfitPerPyeongPrev,
        rent_per_pyeong: rentPerPyeong,
        rent_per_pyeong_prev: rentPerPyeongPrev,
        labor_cost_per_pyeong: laborCostPerPyeong,
        labor_cost_per_pyeong_prev: laborCostPerPyeongPrev,
        daily_sales_per_pyeong: dailySalesPerPyeong,
        daily_sales_per_pyeong_prev: dailySalesPerPyeongPrev,
        yoy: yoy,
        _order: index,
      };
    });

    return data.sort((a, b) => {
      const orderA = REGION_ORDER_MAP[a.region_kr] ?? 999;
      const orderB = REGION_ORDER_MAP[b.region_kr] ?? 999;
      return orderA - orderB;
    });
  }, []);

  // 폐점 및 신규 매장 분석
  const storePortfolioAnalysis = useMemo(() => {
    const plStores = (plData as any)?.channel_direct_profit?.stores || {};
    const storeAreas = (storeAreasData as any)?.store_areas || {};
    const storeLocations = (storeLocationsData as any).store_locations;
    const storeSummary = (dashboardData as any)?.store_summary || {};

    const allClosedStores: any[] = []; // 모든 폐점 매장
    const inefficientStores: any[] = []; // 비효율 매장 (T15만)
    const reviewStores: any[] = []; // 재계약 검토중 (T04, T07, T09)
    const newStores: any[] = [];
    const currentMonthDays = 31;

    Object.keys(plStores).forEach((storeCode: string) => {
      if (storeCode.startsWith('TE')) return; // 온라인 제외

      const plStore = plStores[storeCode];
      const area = storeAreas[storeCode] || 0;
      const locationInfo = storeLocations[storeCode];
      const storeInfo = storeSummary[storeCode];
      
      if (!plStore || area === 0) return;

      const netSales = plStore.net_sales || 0;
      const netSalesPrev = plStore.net_sales_prev || 0;

      // 폐점 매장: 전년 매출 있고, 금년 매출 없음
      if (netSalesPrev > 0 && netSales === 0) {
        const salesPerPyeongPrev = netSalesPrev / area;
        const directProfitPrev = plStore.direct_profit_prev || 0;
        const directProfitPerPyeongPrev = directProfitPrev / area;
        const dailySalesPerPyeongPrev = (salesPerPyeongPrev * 1000) / currentMonthDays;

        const storeData = {
          storeCode,
          storeName: locationInfo?.store_name || storeCode,
          area,
          region: locationInfo?.region || '',
          netSalesPrev,
          salesPerPyeongPrev,
          directProfitPrev,
          directProfitPerPyeongPrev,
          dailySalesPerPyeongPrev,
        };

        allClosedStores.push(storeData);

        // 비효율 매장: T15만
        if (storeCode === 'T15') {
          inefficientStores.push(storeData);
        } else {
          // 나머지는 재계약 검토중
          reviewStores.push(storeData);
        }
      }

      // 신규 매장: 전년 매출 없고, 금년 매출 있음
      if (netSalesPrev === 0 && netSales > 0) {
        const salesPerPyeong = netSales / area;
        const directProfit = plStore.direct_profit || 0;
        const directProfitPerPyeong = directProfit / area;
        const dailySalesPerPyeong = (salesPerPyeong * 1000) / currentMonthDays;

        newStores.push({
          storeCode,
          storeName: locationInfo?.store_name || storeCode,
          area,
          region: locationInfo?.region || '',
          netSales,
          salesPerPyeong,
          directProfit,
          directProfitPerPyeong,
          dailySalesPerPyeong,
        });
      }
    });

    // 비효율 매장 평균 계산 (T15만)
    const inefficientAvg = inefficientStores.length > 0 ? {
      avgSalesPerPyeong: inefficientStores.reduce((sum, s) => sum + s.salesPerPyeongPrev, 0) / inefficientStores.length,
      avgDirectProfitPerPyeong: inefficientStores.reduce((sum, s) => sum + s.directProfitPerPyeongPrev, 0) / inefficientStores.length,
      avgDailySalesPerPyeong: inefficientStores.reduce((sum, s) => sum + s.dailySalesPerPyeongPrev, 0) / inefficientStores.length,
      totalSales: inefficientStores.reduce((sum, s) => sum + s.netSalesPrev, 0),
      totalArea: inefficientStores.reduce((sum, s) => sum + s.area, 0),
    } : null;

    const newAvg = newStores.length > 0 ? {
      avgSalesPerPyeong: newStores.reduce((sum, s) => sum + s.salesPerPyeong, 0) / newStores.length,
      avgDirectProfitPerPyeong: newStores.reduce((sum, s) => sum + s.directProfitPerPyeong, 0) / newStores.length,
      avgDailySalesPerPyeong: newStores.reduce((sum, s) => sum + s.dailySalesPerPyeong, 0) / newStores.length,
      totalSales: newStores.reduce((sum, s) => sum + s.netSales, 0),
      totalArea: newStores.reduce((sum, s) => sum + s.area, 0),
    } : null;

    return {
      allClosedStores, // 모든 폐점 매장
      inefficientStores, // 비효율 매장 (T15만)
      reviewStores, // 재계약 검토중
      newStores,
      inefficientAvg, // 비효율 매장 평균
      newAvg,
    };
  }, []);

  // 지역별 매장 데이터 (도시별로 그룹화)
  const regionalStores = useMemo(() => {
    const storeLocations = (storeLocationsData as any).store_locations;
    const regionSummary = (storeLocationsData as any).region_summary;
    const plStores = (plData as any)?.channel_direct_profit?.stores || {};
    const storeAreas = (storeAreasData as any)?.store_areas || {};
    const storeSummary = (dashboardData as any)?.store_summary || {};

    const result: Record<string, any> = {
      '북부': {},
      '중부': {},
      '남부': {}
    };

    // REGION_ORDER 순서대로 처리
    REGION_ORDER.forEach(region => {
      const storeCodes = regionSummary[region]?.store_codes || [];
      
      storeCodes.forEach((storeCode: string) => {
        if (storeCode.startsWith('TE')) return; // 온라인 제외
        
        const plStore = plStores[storeCode];
        const area = storeAreas[storeCode] || 0;
        const storeInfo = storeSummary[storeCode];
        const locationInfo = storeLocations[storeCode];
        
        if (!plStore || area === 0 || !locationInfo) return;
        
        const netSales = plStore.net_sales || 0;
        if (netSales === 0) return; // 폐점 제외

        const netSalesPrev = plStore.net_sales_prev || 0;
        const city = locationInfo.city || 'Unknown';
        const currentMonthDays = 31;
        
        // 금년 데이터
        const salesPerPyeong = netSales / area;
        const directProfit = plStore.direct_profit || 0;
        const directProfitPerPyeong = directProfit / area;
        const rent = plStore.rent || 0;
        const rentPerPyeong = rent / area;
        const laborCost = plStore.labor_cost || 0;
        const laborCostPerPyeong = laborCost / area;
        const dailySalesPerPyeong = (salesPerPyeong * 1000) / currentMonthDays;

        // 전년 데이터
        const salesPerPyeongPrev = netSalesPrev > 0 ? netSalesPrev / area : 0;
        const directProfitPrev = plStore.direct_profit_prev || 0;
        const directProfitPerPyeongPrev = netSalesPrev > 0 ? directProfitPrev / area : 0;
        const rentPrev = plStore.rent_prev || 0;
        const rentPerPyeongPrev = netSalesPrev > 0 ? rentPrev / area : 0;
        const laborCostPrev = plStore.labor_cost_prev || 0;
        const laborCostPerPyeongPrev = netSalesPrev > 0 ? laborCostPrev / area : 0;
        const dailySalesPerPyeongPrev = netSalesPrev > 0 ? (salesPerPyeongPrev * 1000) / currentMonthDays : 0;
        
        // YOY 계산
        // 평당매출 YOY
        const yoy = salesPerPyeongPrev > 0 ? ((salesPerPyeong - salesPerPyeongPrev) / salesPerPyeongPrev) * 100 : 0;
        // 실판매출 YOY
        const netSalesYoy = netSalesPrev > 0 ? ((netSales - netSalesPrev) / netSalesPrev) * 100 : 0;

        // 도시별로 그룹화
        if (!result[region][city]) {
          result[region][city] = {
            stores: [],
            total_sales: 0,
            total_sales_prev: 0,
            total_area: 0,
            total_area_prev: 0,
            total_direct_profit: 0,
            total_direct_profit_prev: 0,
            total_rent: 0,
            total_rent_prev: 0,
            total_labor_cost: 0,
            total_labor_cost_prev: 0,
          };
        }

        const storeData = {
          storeCode,
          storeName: storeInfo?.store_name || storeCode,
          city,
          netSales,
          netSalesPrev,
          area,
          salesPerPyeong,
          salesPerPyeongPrev,
          directProfit,
          directProfitPerPyeong,
          directProfitPerPyeongPrev,
          rentPerPyeong,
          rentPerPyeongPrev,
          laborCostPerPyeong,
          laborCostPerPyeongPrev,
          dailySalesPerPyeong,
          dailySalesPerPyeongPrev,
          yoy, // 평당매출 YOY
          netSalesYoy, // 실판매출 YOY (검증용: 면적이 동일하면 yoy와 같아야 함)
        };

        result[region][city].stores.push(storeData);
        result[region][city].total_sales += netSales;
        result[region][city].total_sales_prev += netSalesPrev;
        result[region][city].total_area += area;
        result[region][city].total_area_prev += area; // 면적은 동일
        result[region][city].total_direct_profit += directProfit;
        result[region][city].total_direct_profit_prev += directProfitPrev;
        result[region][city].total_rent += rent;
        result[region][city].total_rent_prev += rentPrev;
        result[region][city].total_labor_cost += laborCost;
        result[region][city].total_labor_cost_prev += laborCostPrev;
      });

      // 각 도시의 매장을 평당매출 기준 내림차순 정렬
      Object.keys(result[region]).forEach(city => {
        result[region][city].stores.sort((a: any, b: any) => b.salesPerPyeong - a.salesPerPyeong);
      });
    });

    return result;
  }, []);

  // 지역별 색상
  const getRegionColor = (region: string) => {
    if (region === '북부') return '#3B82F6'; // 파란색
    if (region === '중부') return '#10B981'; // 초록색
    if (region === '남부') return '#F59E0B'; // 주황색
    return '#6B7280';
  };

  // 효율성 등급
  const getEfficiencyRating = (score: number) => {
    if (score >= 20) return '★★★★★';
    if (score >= 15) return '★★★★☆';
    if (score >= 10) return '★★★☆☆';
    if (score >= 5) return '★★☆☆☆';
    return '★☆☆☆☆';
  };

  // 매장 마커 데이터
  const storeMarkers = useMemo(() => {
    const storeLocations = (storeLocationsData as any).store_locations;
    const plStores = (plData as any)?.channel_direct_profit?.stores || {};
    const storeAreas = (storeAreasData as any)?.store_areas || {};
    const markers: any[] = [];

    Object.keys(storeLocations).forEach(storeCode => {
      if (storeCode.startsWith('TE')) return; // 온라인 제외
      
      const location = storeLocations[storeCode];
      const plStore = plStores[storeCode];
      const area = storeAreas[storeCode] || 0;
      
      if (!location.latitude || !location.longitude || !plStore || area === 0) return;
      
      const netSales = plStore.net_sales || 0;
      if (netSales === 0) return; // 폐점 제외

      const salesPerPyeong = netSales / area;
      const directProfit = plStore.direct_profit || 0;
      
      markers.push({
        storeCode,
        storeName: location.store_name,
        lat: location.latitude,
        lng: location.longitude,
        region: location.region,
        salesPerPyeong,
        directProfit,
        netSales,
      });
    });

    return markers;
  }, []);

  // 전체 합계 계산 (전년 대비)
  const totalSummary = useMemo(() => {
    const currentMonthDays = 31;
    
    const total = regionalData.reduce((acc, region) => {
      return {
        store_count: acc.store_count + region.store_count,
        store_count_prev: acc.store_count_prev + region.store_count_prev,
        total_sales: acc.total_sales + region.total_sales,
        total_sales_prev: acc.total_sales_prev + region.total_sales_prev,
        total_area: acc.total_area + region.total_area,
        total_area_prev: acc.total_area_prev + region.total_area_prev,
        total_direct_profit: acc.total_direct_profit + region.total_direct_profit,
        total_direct_profit_prev: acc.total_direct_profit_prev + region.total_direct_profit_prev,
        total_rent: acc.total_rent + region.total_rent,
        total_rent_prev: acc.total_rent_prev + region.total_rent_prev,
        total_labor_cost: acc.total_labor_cost + region.total_labor_cost,
        total_labor_cost_prev: acc.total_labor_cost_prev + region.total_labor_cost_prev,
      };
    }, {
      store_count: 0,
      store_count_prev: 0,
      total_sales: 0,
      total_sales_prev: 0,
      total_area: 0,
      total_area_prev: 0,
      total_direct_profit: 0,
      total_direct_profit_prev: 0,
      total_rent: 0,
      total_rent_prev: 0,
      total_labor_cost: 0,
      total_labor_cost_prev: 0,
    });

    const salesPerPyeong = total.total_area > 0 ? total.total_sales / total.total_area : 0;
    const salesPerPyeongPrev = total.total_area_prev > 0 ? total.total_sales_prev / total.total_area_prev : 0;
    const directProfitPerPyeong = total.total_area > 0 ? total.total_direct_profit / total.total_area : 0;
    const directProfitPerPyeongPrev = total.total_area_prev > 0 ? total.total_direct_profit_prev / total.total_area_prev : 0;
    const rentPerPyeong = total.total_area > 0 ? total.total_rent / total.total_area : 0;
    const rentPerPyeongPrev = total.total_area_prev > 0 ? total.total_rent_prev / total.total_area_prev : 0;
    const laborCostPerPyeong = total.total_area > 0 ? total.total_labor_cost / total.total_area : 0;
    const laborCostPerPyeongPrev = total.total_area_prev > 0 ? total.total_labor_cost_prev / total.total_area_prev : 0;
    const dailySalesPerPyeong = (salesPerPyeong * 1000) / currentMonthDays;
    const dailySalesPerPyeongPrev = (salesPerPyeongPrev * 1000) / currentMonthDays;
    const yoy = salesPerPyeongPrev > 0 ? ((salesPerPyeong - salesPerPyeongPrev) / salesPerPyeongPrev) * 100 : 0;

    return {
      ...total,
      sales_per_pyeong: salesPerPyeong,
      sales_per_pyeong_prev: salesPerPyeongPrev,
      direct_profit_per_pyeong: directProfitPerPyeong,
      direct_profit_per_pyeong_prev: directProfitPerPyeongPrev,
      rent_per_pyeong: rentPerPyeong,
      rent_per_pyeong_prev: rentPerPyeongPrev,
      labor_cost_per_pyeong: laborCostPerPyeong,
      labor_cost_per_pyeong_prev: laborCostPerPyeongPrev,
      daily_sales_per_pyeong: dailySalesPerPyeong,
      daily_sales_per_pyeong_prev: dailySalesPerPyeongPrev,
      yoy: yoy,
    };
  }, [regionalData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">대만법인 지역별 분석 (전년 대비)</h1>
          <p className="text-blue-100">2510 vs 2410 (누적 기준, 단위: 1K HKD)</p>
        </div>

        {/* 매장 포트폴리오 변화 분석 */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 매장 포트폴리오 최적화 분석</h3>
          <div className="space-y-4 text-sm text-gray-700">
            {/* 핵심 성과 */}
            <div className="space-y-2">
              <p className="font-semibold text-gray-800">📊 핵심 성과</p>
              {(() => {
                const totalPrev = regionalData.reduce((acc, r) => ({
                  count: acc.count + r.store_count_prev,
                  sales: acc.sales + r.total_sales_prev,
                  area: acc.area + r.total_area_prev,
                  profit: acc.profit + r.total_direct_profit_prev,
                }), { count: 0, sales: 0, area: 0, profit: 0 });
                
                const totalCurr = regionalData.reduce((acc, r) => ({
                  count: acc.count + r.store_count,
                  sales: acc.sales + r.total_sales,
                  area: acc.area + r.total_area,
                  profit: acc.profit + r.total_direct_profit,
                }), { count: 0, sales: 0, area: 0, profit: 0 });

                const avgSalesPerPyeongPrev = totalPrev.area > 0 ? totalPrev.sales / totalPrev.area : 0;
                const avgSalesPerPyeongCurr = totalCurr.area > 0 ? totalCurr.sales / totalCurr.area : 0;
                const avgDailySalesPrev = (avgSalesPerPyeongPrev * 1000) / 31;
                const avgDailySalesCurr = (avgSalesPerPyeongCurr * 1000) / 31;
                const yoy = avgSalesPerPyeongPrev > 0 ? ((avgSalesPerPyeongCurr - avgSalesPerPyeongPrev) / avgSalesPerPyeongPrev) * 100 : 0;
                const profitRatePrev = totalPrev.sales > 0 ? (totalPrev.profit / totalPrev.sales) * 100 : 0;
                const profitRateCurr = totalCurr.sales > 0 ? (totalCurr.profit / totalCurr.sales) * 100 : 0;

                return (
                  <>
                    <p>
                      • <strong className="text-red-600">비효율 매장 정리</strong>: T15 (신디엔)
                      {storePortfolioAnalysis.inefficientAvg && (
                        <> - 평당매출 <span className="font-bold text-red-600">{formatDecimal(storePortfolioAnalysis.inefficientAvg.avgSalesPerPyeong)}K</span></>
                      )}
                    </p>
                    <p>
                      • <strong className="text-green-600">우수 입지 확보</strong>: {storePortfolioAnalysis.newStores.length}개 신규 오픈
                      {storePortfolioAnalysis.newAvg && (
                        <> (평균 평당매출 <span className="font-bold text-green-600">{formatDecimal(storePortfolioAnalysis.newAvg.avgSalesPerPyeong)}K</span>)</>
                      )}
                    </p>
                    <p>
                      • <strong className="text-purple-600">일평균 평당매출</strong>: {formatNumber(avgDailySalesPrev)} HKD → {formatNumber(avgDailySalesCurr)} HKD 
                      (<span className="font-semibold text-green-600">{yoy >= 0 ? '+' : ''}{formatNumber(avgDailySalesCurr - avgDailySalesPrev)} HKD, 
                      {yoy >= 0 ? '+' : ''}{formatDecimal(yoy)}%</span>)
                    </p>
                  </>
                );
              })()}
            </div>

            {/* 폐점 매장 상세 */}
            {storePortfolioAnalysis.allClosedStores.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-purple-200">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-gray-600"
                  onClick={() => setShowClosedStores(!showClosedStores)}
                >
                  {showClosedStores ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <p className="font-semibold text-gray-800">🔴 폐점 매장 ({storePortfolioAnalysis.allClosedStores.length}개)</p>
                </div>
                {showClosedStores && (
                  <>
                    {/* 비효율 매장 (T15) */}
                    {storePortfolioAnalysis.inefficientStores.map((store: any) => (
                      <p key={store.storeCode} className="text-xs pl-6">
                        • <strong>{store.storeName}</strong> ({store.storeCode}, {store.region}) - 비효율 매장: 
                        평당매출 {formatDecimal(store.salesPerPyeongPrev)}K, 
                        직접이익 {formatDecimal(store.directProfitPrev)}K, 
                        일평균 {formatNumber(store.dailySalesPerPyeongPrev)} HKD/평
                      </p>
                    ))}
                    {/* 재계약 검토중 매장 */}
                    {storePortfolioAnalysis.reviewStores.map((store: any) => (
                      <p key={store.storeCode} className="text-xs pl-6">
                        • <strong>{store.storeName}</strong> ({store.storeCode}, {store.region}) - 추후 재계약 검토중: 
                        평당매출 {formatDecimal(store.salesPerPyeongPrev)}K, 
                        직접이익 {formatDecimal(store.directProfitPrev)}K, 
                        일평균 {formatNumber(store.dailySalesPerPyeongPrev)} HKD/평
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* 신규 매장 상세 */}
            {storePortfolioAnalysis.newStores.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-purple-200">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-gray-600"
                  onClick={() => setShowNewStores(!showNewStores)}
                >
                  {showNewStores ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <p className="font-semibold text-gray-800">🟢 신규 오픈 매장 ({storePortfolioAnalysis.newStores.length}개)</p>
                </div>
                {showNewStores && (
                  <>
                    {storePortfolioAnalysis.newStores.map((store: any) => (
                      <p key={store.storeCode} className="text-xs pl-6">
                        • <strong>{store.storeName}</strong> ({store.storeCode}, {store.region}): 
                        평당매출 {formatDecimal(store.salesPerPyeong)}K, 
                        직접이익 {formatDecimal(store.directProfit)}K, 
                        일평균 {formatNumber(store.dailySalesPerPyeong)} HKD/평
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* 전략 제언 */}
            <div className="space-y-2 pt-3 border-t border-purple-200">
              <p className="font-semibold text-gray-800">🎯 향후 전략 제언 (인구수/인구밀도 기반)</p>
              <p>
                • <strong className="text-green-600">포트폴리오 최적화 지속</strong>: 
                저효율 매장 정리와 우수 입지 확보 전략이 효과적으로 작동하고 있음. 
                평당매출 기준 하위 20% 매장에 대한 지속적인 모니터링 및 개선/철수 검토 필요
              </p>
              <p>
                • <strong className="text-blue-600">북부 지역 전략적 확장</strong>: 
                대만 최대 인구 밀집 지역(약 890만명, 인구밀도 최고)으로 <span className="font-semibold text-green-600">매장 밀도가 상대적으로 낮음</span>. 
                신베이(400만명), 타오위안(230만명) 등 인구 대비 매장 수 부족 지역에 
                <span className="font-semibold">전략적 입점 검토</span> 권장. 
                기존 고수익 매장(라라포트 난강, 원동 반치아오) 운영 노하우를 저성과 매장에 전파하여 평균 매출 상향 평준화 집중
              </p>
              <p>
                • <strong className="text-orange-600">남부 지역 최우선 확장</strong>: 
                평당직접이익이 가장 높고 인구 규모도 충분(약 465만명)하여 <span className="font-semibold text-green-600">신규 매장 확장 최우선 검토</span>. 
                가오슝(277만명) 중심으로 대형 쇼핑몰 입점 전략 지속 추진. 
                한신아레나, TS Mall 등 성공 사례를 바탕으로 추가 입점 기회 모색
              </p>
              <p>
                • <strong className="text-purple-600">중부 지역 선택적 확장</strong>: 
                인구 대비 매장 수가 적절하나(약 280만명), 타이중(280만명) 상권 성장세를 고려하여 
                <span className="font-semibold text-blue-600">선택적 추가 입점 기회 모색</span> (백화점, 아울렛 위주). 
                인구 밀도 대비 현재 매장 효율성이 양호하므로 신중한 입점 검토 필요
              </p>
              <p className="text-xs text-gray-600 mt-2 italic">
                ※ 인구 밀도와 평당직접이익을 종합 고려 시, 북부 지역의 인구 대비 매장 확장 잠재력이 가장 높음
              </p>
            </div>
          </div>
        </div>

        {/* 지역별 비교 테이블 */}
        {mounted && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">지역별 상세 비교</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (cityOnlyMode) {
                      // 도시별 모드 해제 → 지역 접기
                      setCityOnlyMode(false);
                      setExpandedRegions(new Set());
                      setShowStoresMode(false);
                    } else {
                      // 도시별 모드 활성화 → 지역 펼치기, 매장 숨김
                      setCityOnlyMode(true);
                      setExpandedRegions(new Set(REGION_ORDER));
                      setShowStoresMode(false);
                    }
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    cityOnlyMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  도시별
                </button>
                <button
                  onClick={() => {
                    if (!expandedRegions.size) {
                      // 지역이 접혀있으면 먼저 펼치기
                      setExpandedRegions(new Set(REGION_ORDER));
                    }
                    // 매장 표시 토글
                    setShowStoresMode(!showStoresMode);
                    // 도시별 모드는 해제
                    setCityOnlyMode(false);
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    showStoresMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  매장별
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="p-2 text-left font-semibold">구분</th>
                    <th className="p-2 text-right font-semibold">매장수</th>
                    <th className="p-2 text-right font-semibold">평당매출<br/>(K/평)</th>
                    <th className="p-2 text-right font-semibold border-l-2 border-r-2 border-t-2 border-red-500">1일 평당매출<br/>(HKD/평)</th>
                    <th className="p-2 text-right font-semibold">YOY<br/>(%)</th>
                    <th className="p-2 text-right font-semibold">평당직접이익<br/>(K/평)</th>
                    <th className="p-2 text-right font-semibold">평당임차료<br/>(K/평)</th>
                    <th className="p-2 text-right font-semibold">평당인건비<br/>(K/평)</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalData
                    .sort((a, b) => {
                      const orderA = REGION_ORDER_MAP[a.region_kr] ?? 999;
                      const orderB = REGION_ORDER_MAP[b.region_kr] ?? 999;
                      return orderA - orderB;
                    })
                    .map(region => {
                  const isExpanded = expandedRegions.has(region.region_kr);
                  const stores = regionalStores[region.region_kr] || [];

                  return (
                    <React.Fragment key={region.region_kr}>
                      {/* 지역 금년 행 */}
                      <tr 
                        className="border-b border-gray-300 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                        onClick={() => toggleRegion(region.region_kr)}
                      >
                        <td className="p-2 font-semibold" style={{ color: getRegionColor(region.region_kr) }}>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span>{region.region_kr}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right">{region.store_count}개</td>
                        <td className="p-2 text-right font-semibold">{formatDecimal(region.sales_per_pyeong)}</td>
                        <td className="p-2 text-right font-semibold border-l-2 border-r-2 border-red-500">{formatNumber(region.daily_sales_per_pyeong)}</td>
                        <td className={`p-2 text-right font-semibold ${region.yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {region.yoy >= 0 ? '+' : ''}{formatDecimal(region.yoy, 1)}%
                        </td>
                        <td className={`p-2 text-right font-semibold ${region.direct_profit_per_pyeong >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatDecimal(region.direct_profit_per_pyeong)}
                        </td>
                        <td className="p-2 text-right">{formatDecimal(region.rent_per_pyeong)}</td>
                        <td className="p-2 text-right">{formatDecimal(region.labor_cost_per_pyeong)}</td>
                      </tr>

                      {/* 도시별/매장별 행 */}
                      {isExpanded && Object.keys(stores).map((city) => {
                        const cityData = stores[city];
                        const cityStores = cityData.stores || [];
                        const currentMonthDays = 31;
                        
                        // 도시별 금년 데이터
                        const citySalesPerPyeong = cityData.total_area > 0 ? cityData.total_sales / cityData.total_area : 0;
                        const cityDirectProfitPerPyeong = cityData.total_area > 0 ? cityData.total_direct_profit / cityData.total_area : 0;
                        const cityRentPerPyeong = cityData.total_area > 0 ? cityData.total_rent / cityData.total_area : 0;
                        const cityLaborCostPerPyeong = cityData.total_area > 0 ? cityData.total_labor_cost / cityData.total_area : 0;
                        const cityDailySalesPerPyeong = (citySalesPerPyeong * 1000) / currentMonthDays;
                        
                        // 도시별 전년 데이터
                        const citySalesPerPyeongPrev = cityData.total_area_prev > 0 ? cityData.total_sales_prev / cityData.total_area_prev : 0;
                        const cityDailySalesPerPyeongPrev = citySalesPerPyeongPrev > 0 ? (citySalesPerPyeongPrev * 1000) / currentMonthDays : 0;
                        
                        // 도시별 YOY
                        const cityYoy = citySalesPerPyeongPrev > 0 ? ((citySalesPerPyeong - citySalesPerPyeongPrev) / citySalesPerPyeongPrev) * 100 : 0;
                        
                        return (
                          <React.Fragment key={city}>
                            {/* 도시 합계 행 */}
                            <tr className="border-b border-gray-300 bg-blue-50">
                              <td className="p-2 pl-6 font-semibold text-blue-700 text-xs">
                                📍 {city}
                              </td>
                              <td className="p-2 text-right text-xs">{cityStores.length}개</td>
                              <td className="p-2 text-right text-xs font-semibold">{formatDecimal(citySalesPerPyeong)}</td>
                              <td className="p-2 text-right text-xs font-semibold border-l-2 border-r-2 border-red-500">{formatNumber(cityDailySalesPerPyeong)}</td>
                              <td className={`p-2 text-right text-xs font-semibold ${cityYoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {cityYoy !== 0 ? (cityYoy >= 0 ? '+' : '') + formatDecimal(cityYoy, 1) + '%' : '-'}
                              </td>
                              <td className={`p-2 text-right text-xs font-semibold ${cityDirectProfitPerPyeong >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatDecimal(cityDirectProfitPerPyeong)}
                              </td>
                              <td className="p-2 text-right text-xs">{formatDecimal(cityRentPerPyeong)}</td>
                              <td className="p-2 text-right text-xs">{formatDecimal(cityLaborCostPerPyeong)}</td>
                            </tr>
                            
                            {/* 매장별 행 */}
                            {!cityOnlyMode && showStoresMode && cityStores.map((store: any) => (
                              <tr key={store.storeCode} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-2 pl-10 text-gray-600 text-xs">{store.storeName}</td>
                                <td className="p-2 text-right text-gray-400 text-xs">-</td>
                                <td className="p-2 text-right text-xs">{formatDecimal(store.salesPerPyeong)}</td>
                                <td className="p-2 text-right text-xs border-l-2 border-r-2 border-red-500">{formatNumber(store.dailySalesPerPyeong)}</td>
                                <td className={`p-2 text-right text-xs ${store.yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {store.yoy !== 0 ? (store.yoy >= 0 ? '+' : '') + formatDecimal(store.yoy, 1) + '%' : '-'}
                                </td>
                                <td className={`p-2 text-right text-xs ${store.directProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatDecimal(store.directProfitPerPyeong)}
                                </td>
                                <td className="p-2 text-right text-xs">{formatDecimal(store.rentPerPyeong)}</td>
                                <td className="p-2 text-right text-xs">{formatDecimal(store.laborCostPerPyeong)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                
                {/* 전체 합계 금년 행 */}
                <tr className="border-t-4 border-gray-600 bg-gray-800 text-white">
                  <td className="p-2 font-bold">전체 합계</td>
                  <td className="p-2 text-right font-bold">{totalSummary.store_count}개</td>
                  <td className="p-2 text-right font-bold">{formatDecimal(totalSummary.sales_per_pyeong)}</td>
                  <td className="p-2 text-right font-bold border-l-2 border-r-2 border-red-500">{formatNumber(totalSummary.daily_sales_per_pyeong)}</td>
                  <td className={`p-2 text-right font-bold ${totalSummary.yoy >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {totalSummary.yoy >= 0 ? '+' : ''}{formatDecimal(totalSummary.yoy, 1)}%
                  </td>
                  <td className={`p-2 text-right font-bold ${totalSummary.direct_profit_per_pyeong >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {formatDecimal(totalSummary.direct_profit_per_pyeong)}
                  </td>
                  <td className="p-2 text-right font-bold">{formatDecimal(totalSummary.rent_per_pyeong)}</td>
                  <td className="p-2 text-right font-bold">{formatDecimal(totalSummary.labor_cost_per_pyeong)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* 대만 지도 */}
        {mounted && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">대만 매장 분포도</h2>
            <p className="text-xs text-gray-600 mb-3">
              • 마커 크기: 평당매출 비례 | 색상: 지역별 (북부=파랑, 중부=초록, 남부=주황)
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* 지도 - SVG 도식화 */}
              <div className="lg:col-span-3" style={{ height: '700px' }}>
                <svg viewBox="0 0 500 700" className="w-full h-full bg-blue-50 rounded-lg">
                  {/* 대만 지도 (직사각형) */}
                  <rect
                    x="100"
                    y="50"
                    width="300"
                    height="600"
                    fill="#e5e7eb"
                    stroke="#9ca3af"
                    strokeWidth="3"
                    rx="10"
                  />
                  
                  {/* 지역 구분선 */}
                  <line x1="100" y1="250" x2="400" y2="250" stroke="#6b7280" strokeWidth="3" strokeDasharray="8,8" />
                  <line x1="100" y1="450" x2="400" y2="450" stroke="#6b7280" strokeWidth="3" strokeDasharray="8,8" />
                  
                  {/* 지역 배경 영역 */}
                  <rect x="100" y="50" width="300" height="200" fill="#3B82F6" opacity="0.2" rx="10" />
                  <rect x="100" y="250" width="300" height="200" fill="#10B981" opacity="0.2" />
                  <rect x="100" y="450" width="300" height="200" fill="#F59E0B" opacity="0.2" rx="10" />
                  
                  {/* 지역 레이블 (왼쪽) */}
                  <text x="50" y="150" textAnchor="middle" className="text-2xl font-bold" fill="#3B82F6" fontSize="24">
                    북부
                  </text>
                  <text x="50" y="350" textAnchor="middle" className="text-2xl font-bold" fill="#10B981" fontSize="24">
                    중부
                  </text>
                  <text x="50" y="550" textAnchor="middle" className="text-2xl font-bold" fill="#F59E0B" fontSize="24">
                    남부
                  </text>
                  
                  {/* 도시별 구분선 및 레이블 */}
                  {REGION_ORDER.map(regionName => {
                    const region = regionalData.find(r => r.region_kr === regionName);
                    if (!region) return null;
                    const stores = regionalStores[regionName] || {};
                    const cities = Object.keys(stores);
                    
                    const regionTop = regionName === '북부' ? 50 : regionName === '중부' ? 250 : 450;
                    const regionBottom = regionName === '북부' ? 250 : regionName === '중부' ? 450 : 650;
                    const regionHeight = regionBottom - regionTop;
                    
                    // 도시별로 영역 나누기
                    let currentY = regionTop;
                    return cities.map((city, cityIdx) => {
                      const cityData = stores[city];
                      const cityStores = cityData.stores || [];
                      const cityHeight = (cityStores.length / region.store_count) * regionHeight;
                      const cityCenterY = currentY + cityHeight / 2;
                      
                      const elements = [];
                      
                      // 도시 구분선 (첫 번째 도시가 아닐 때)
                      if (cityIdx > 0) {
                        elements.push(
                          <line
                            key={`${regionName}-${city}-line`}
                            x1="100"
                            y1={currentY}
                            x2="400"
                            y2={currentY}
                            stroke="#9ca3af"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            opacity="0.5"
                          />
                        );
                      }
                      
                      // 도시 레이블 (오른쪽만)
                      elements.push(
                        <text
                          key={`${regionName}-${city}-label-right`}
                          x="410"
                          y={cityCenterY + 5}
                          textAnchor="start"
                          className="text-sm font-semibold"
                          fill={getRegionColor(regionName)}
                          fontSize="12"
                        >
                          {city} ({cityStores.length})
                        </text>
                      );
                      
                      currentY += cityHeight;
                      return <React.Fragment key={`${regionName}-${city}`}>{elements}</React.Fragment>;
                    });
                  })}
                  
                  {/* 매장 마커 */}
                  {storeMarkers.map((marker, idx) => {
                    // 매장이 속한 도시 찾기
                    const regionName = marker.region; // 이미 한글("북부", "중부", "남부")
                    const stores = regionalStores[regionName] || {};
                    const cities = Object.keys(stores);
                    
                    let cityName = '';
                    let cityStores: any[] = [];
                    for (const city of cities) {
                      const cityData = stores[city];
                      if (cityData.stores.find((s: any) => s.storeCode === marker.storeCode)) {
                        cityName = city;
                        cityStores = cityData.stores || [];
                        break;
                      }
                    }
                    
                    if (!cityName) return null;
                    
                    // 지역별 Y 위치 범위
                    const regionTop = regionName === '북부' ? 50 : regionName === '중부' ? 250 : 450;
                    const regionBottom = regionName === '북부' ? 250 : regionName === '중부' ? 450 : 650;
                    const regionHeight = regionBottom - regionTop;
                    
                    // 도시별 영역 계산
                    const region = regionalData.find(r => r.region_kr === regionName);
                    if (!region) return null;
                    
                    let currentY = regionTop;
                    let cityTop = regionTop;
                    let cityBottom = regionTop;
                    for (const city of cities) {
                      const cityData = stores[city];
                      const cityStoreList = cityData.stores || [];
                      const cityHeight = (cityStoreList.length / region.store_count) * regionHeight;
                      cityBottom = currentY + cityHeight;
                      
                      if (city === cityName) {
                        cityTop = currentY;
                        break;
                      }
                      currentY += cityHeight;
                    }
                    
                    const cityCenterY = (cityTop + cityBottom) / 2;
                    const cityHeight = cityBottom - cityTop;
                    
                    // 같은 도시 내 매장 인덱스
                    const indexInCity = cityStores.findIndex((s: any) => s.storeCode === marker.storeCode);
                    const totalInCity = cityStores.length;
                    
                    // X축: 좌우로 분산 (100~400 범위)
                    const xSpacing = 300 / (totalInCity + 1);
                    const x = 100 + xSpacing * (indexInCity + 1);
                    
                    // Y축: 도시 영역 내에서 약간 분산
                    const yOffset = (indexInCity % 2 === 0 ? -1 : 1) * (cityHeight * 0.15) * Math.floor(indexInCity / 2);
                    const y = cityCenterY + yOffset;
                    
                    // 마커 크기 (평당매출 비례)
                    const size = Math.max(10, Math.min(30, marker.salesPerPyeong * 1.2));
                    
                    return (
                      <g key={marker.storeCode}>
                        <circle
                          cx={x}
                          cy={y}
                          r={size}
                          fill={getRegionColor(marker.region)}
                          stroke="white"
                          strokeWidth="2"
                          opacity="0.8"
                          className="hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <title>
                            {marker.storeName}
                            {'\n'}평당매출: {formatDecimal(marker.salesPerPyeong)} K HKD/평
                            {'\n'}매출액: {formatNumber(marker.netSales)} K HKD
                            {'\n'}직접이익: {formatNumber(marker.directProfit)} K HKD
                          </title>
                        </circle>
                        {/* 매장명 표시 (모든 매장) */}
                        <text
                          x={x}
                          y={y + size + 12}
                          textAnchor="middle"
                          className="text-xs font-medium"
                          fill="#374151"
                          fontSize="9"
                        >
                          {marker.storeName.length > 10 ? marker.storeName.substring(0, 10) : marker.storeName}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* 범례 */}
                  <g transform="translate(15, 680)">
                    <text x="0" y="0" className="text-sm font-semibold" fill="#6b7280" fontSize="14">
                      원 크기 = 평당매출
                    </text>
                  </g>
                </svg>
              </div>

              {/* 정보 테이블 */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4 h-full overflow-y-auto" style={{ maxHeight: '700px' }}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">지역별 요약</h3>
                  <div className="space-y-3">
                    {regionalData
                      .sort((a, b) => {
                        const orderA = REGION_ORDER_MAP[a.region_kr] ?? 999;
                        const orderB = REGION_ORDER_MAP[b.region_kr] ?? 999;
                        return orderA - orderB;
                      })
                      .map(region => {
                      const stores = regionalStores[region.region_kr] || [];
                      return (
                        <div 
                          key={region.region_kr}
                          className="bg-white rounded-lg p-3 border-l-4 shadow-sm"
                          style={{ borderLeftColor: getRegionColor(region.region_kr) }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm" style={{ color: getRegionColor(region.region_kr) }}>
                              {region.region_kr}
                            </h4>
                            <span className="text-xs text-gray-600">{region.store_count}개 매장</span>
                          </div>
                          
                          {/* 요약 정보 */}
                          <div className="space-y-1 text-xs mb-3 pb-2 border-b">
                            <div className="flex justify-between">
                              <span className="text-gray-600">평당매출/1일</span>
                              <span className="font-semibold">{formatNumber(region.sales_per_pyeong * 1000 / 31)} HKD/평</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">평당직접이익</span>
                              <span className={`font-semibold ${region.direct_profit_per_pyeong >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatDecimal(region.direct_profit_per_pyeong)}K/평
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">총매출</span>
                              <span className="font-semibold">{formatNumber(region.total_sales)}K</span>
                            </div>
                          </div>

                          {/* 매장 리스트 (도시별) */}
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-700 mb-1">매장 목록</div>
                            {Object.keys(stores).map(city => {
                              const cityData = stores[city];
                              const cityStores = cityData.stores || [];
                              const cityKey = `${region.region_kr}-${city}`;
                              const isCityExpanded = expandedCities.has(cityKey);
                              const citySalesPerPyeong = cityData.total_area > 0 ? cityData.total_sales / cityData.total_area : 0;
                              const cityDirectProfitPerPyeong = cityData.total_area > 0 ? cityData.total_direct_profit / cityData.total_area : 0;
                              
                              return (
                                <div key={city} className="space-y-1">
                                  <div 
                                    className="flex items-center justify-between text-xs font-semibold text-blue-600 mt-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                                    onClick={() => toggleCity(cityKey)}
                                  >
                                    <div className="flex items-center gap-1">
                                      {isCityExpanded ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                      <span>📍 {city}</span>
                                    </div>
                                    <span className="text-gray-600 text-xs">{cityStores.length}개</span>
                                  </div>
                                  
                                  {/* 도시별 지표 */}
                                  {isCityExpanded && (
                                    <div className="ml-4 space-y-1 text-xs bg-blue-50 px-2 py-1 rounded mb-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">평당매출/1일</span>
                                        <span className="font-semibold">{formatNumber(citySalesPerPyeong * 1000 / 31)} HKD/평</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">평당직접이익</span>
                                        <span className={`font-semibold ${cityDirectProfitPerPyeong >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatDecimal(cityDirectProfitPerPyeong)}K/평
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">총매출</span>
                                        <span className="font-semibold">{formatNumber(cityData.total_sales)}K</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 매장 리스트 */}
                                  {isCityExpanded && cityStores.map((store: any) => (
                                    <div key={store.storeCode} className="flex justify-between text-xs bg-gray-50 px-2 py-1 rounded ml-4">
                                      <span className="text-gray-700 truncate flex-1">{store.storeName}</span>
                                      <span className="text-gray-900 font-medium ml-2">{formatNumber(store.netSales)}K</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* 뒤로가기 */}
        <div className="text-center">
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaiwanRegionalAnalysis;

