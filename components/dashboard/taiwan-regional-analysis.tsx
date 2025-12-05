'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight } from 'lucide-react';
import plData from './taiwan-pl-data.json';
import storeAreasData from './taiwan-store-areas.json';
import dashboardData from './taiwan-dashboard-data.json';
import storeLocationsData from './taiwan-store-locations.json';

// Leaflet을 동적으로 import (SSR 방지)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface RegionalData {
  region: string;
  region_kr: string;
  store_count: number;
  total_sales: number;
  total_area: number;
  total_direct_profit: number;
  total_rent: number;
  total_labor_cost: number;
  sales_per_pyeong: number;
  direct_profit_per_pyeong: number;
  rent_per_pyeong: number;
  labor_cost_per_pyeong: number;
  efficiency_score: number;
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

  // 지역별 데이터 계산
  const regionalData: RegionalData[] = useMemo(() => {
    const storeLocations = (storeLocationsData as any).store_locations;
    const regionSummary = (storeLocationsData as any).region_summary || {};
    const plStores = (plData as any)?.channel_direct_profit?.stores || {};
    const storeAreas = (storeAreasData as any)?.store_areas || {};

    // REGION_ORDER 상수 순서대로 명시적으로 생성
    const data = REGION_ORDER.map((region, index) => {
      const regionData = regionSummary[region] || {};
      const storeCodes = regionData.store_codes || [];
      
      let totalSales = 0;
      let totalArea = 0;
      let totalDirectProfit = 0;
      let totalRent = 0;
      let totalLaborCost = 0;
      let activeStoreCount = 0;

      storeCodes.forEach((storeCode: string) => {
        // 온라인 제외
        if (storeCode.startsWith('TE')) return;
        
        const plStore = plStores[storeCode];
        const area = storeAreas[storeCode] || 0;
        
        if (!plStore || area === 0) return;
        
        const netSales = plStore.net_sales || 0;
        if (netSales === 0) return; // 폐점 매장 제외

        totalSales += netSales;
        totalArea += area;
        totalDirectProfit += plStore.direct_profit || 0;
        totalRent += plStore.rent || 0;
        totalLaborCost += plStore.labor_cost || 0;
        activeStoreCount++;
      });

      const salesPerPyeong = totalArea > 0 ? totalSales / totalArea : 0;
      const directProfitPerPyeong = totalArea > 0 ? totalDirectProfit / totalArea : 0;
      const rentPerPyeong = totalArea > 0 ? totalRent / totalArea : 0;
      const laborCostPerPyeong = totalArea > 0 ? totalLaborCost / totalArea : 0;
      const efficiencyScore = totalSales > 0 ? (totalDirectProfit / totalSales) * 100 : 0;

      return {
        region,
        region_kr: region,
        store_count: activeStoreCount,
        total_sales: totalSales,
        total_area: totalArea,
        total_direct_profit: totalDirectProfit,
        total_rent: totalRent,
        total_labor_cost: totalLaborCost,
        sales_per_pyeong: salesPerPyeong,
        direct_profit_per_pyeong: directProfitPerPyeong,
        rent_per_pyeong: rentPerPyeong,
        labor_cost_per_pyeong: laborCostPerPyeong,
        efficiency_score: efficiencyScore,
        _order: index, // 순서 보장을 위한 인덱스
      };
    });

    // REGION_ORDER 순서대로 이미 생성되었지만, 확실히 보장하기 위해 정렬
    return data.sort((a, b) => {
      const orderA = REGION_ORDER_MAP[a.region_kr] ?? 999;
      const orderB = REGION_ORDER_MAP[b.region_kr] ?? 999;
      return orderA - orderB;
    });
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

        const city = locationInfo.city || 'Unknown';
        const salesPerPyeong = netSales / area;
        const directProfit = plStore.direct_profit || 0;
        const directProfitPerPyeong = directProfit / area;
        const rent = plStore.rent || 0;
        const rentPerPyeong = rent / area;
        const laborCost = plStore.labor_cost || 0;
        const laborCostPerPyeong = laborCost / area;

        // 도시별로 그룹화
        if (!result[region][city]) {
          result[region][city] = {
            stores: [],
            total_sales: 0,
            total_area: 0,
            total_direct_profit: 0,
            total_rent: 0,
            total_labor_cost: 0,
          };
        }

        const storeData = {
          storeCode,
          storeName: storeInfo?.store_name || storeCode,
          city,
          netSales,
          area,
          salesPerPyeong,
          directProfit,
          directProfitPerPyeong,
          rentPerPyeong,
          laborCostPerPyeong,
        };

        result[region][city].stores.push(storeData);
        result[region][city].total_sales += netSales;
        result[region][city].total_area += area;
        result[region][city].total_direct_profit += directProfit;
        result[region][city].total_rent += rent;
        result[region][city].total_labor_cost += laborCost;
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

  // 전체 합계 계산
  const totalSummary = useMemo(() => {
    const total = regionalData.reduce((acc, region) => {
      return {
        store_count: acc.store_count + region.store_count,
        total_sales: acc.total_sales + region.total_sales,
        total_area: acc.total_area + region.total_area,
        total_direct_profit: acc.total_direct_profit + region.total_direct_profit,
        total_rent: acc.total_rent + region.total_rent,
        total_labor_cost: acc.total_labor_cost + region.total_labor_cost,
      };
    }, {
      store_count: 0,
      total_sales: 0,
      total_area: 0,
      total_direct_profit: 0,
      total_rent: 0,
      total_labor_cost: 0,
    });

    const salesPerPyeong = total.total_area > 0 ? total.total_sales / total.total_area : 0;
    const directProfitPerPyeong = total.total_area > 0 ? total.total_direct_profit / total.total_area : 0;
    const rentPerPyeong = total.total_area > 0 ? total.total_rent / total.total_area : 0;
    const laborCostPerPyeong = total.total_area > 0 ? total.total_labor_cost / total.total_area : 0;

    return {
      ...total,
      sales_per_pyeong: salesPerPyeong,
      direct_profit_per_pyeong: directProfitPerPyeong,
      rent_per_pyeong: rentPerPyeong,
      labor_cost_per_pyeong: laborCostPerPyeong,
    };
  }, [regionalData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">대만법인 지역별 분석 (2510 기준)</h1>
          <p className="text-blue-100">Taiwan Regional Analysis - 지역별 효율성 비교 (단위: 1K HKD)</p>
        </div>

        {/* AI 인사이트 */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 지역별 분석 인사이트</h3>
          <div className="space-y-3 text-sm text-gray-700">
            {/* 지역별 현황 */}
            <div className="space-y-2">
              <p className="font-semibold text-gray-800">📍 지역별 현황</p>
              {REGION_ORDER.map(regionName => {
                const region = regionalData.find(r => r.region_kr === regionName);
                if (!region) return null;
                const dailySales = Math.round(region.sales_per_pyeong * 1000 / 31);
                return (
                  <p key={region.region_kr}>
                    • <strong className={
                      region.region_kr === '남부' ? 'text-orange-600' : 
                      region.region_kr === '북부' ? 'text-blue-600' : 'text-green-600'
                    }>{region.region_kr}</strong>: {region.store_count}개 매장, 
                    1일 평당매출 {formatNumber(dailySales)} HKD, 
                    평당직접이익 {formatDecimal(region.direct_profit_per_pyeong)}K HKD
                  </p>
                );
              })}
            </div>
            
            {/* 영업 인사이트 */}
            <div className="space-y-2 pt-3 border-t border-purple-200">
              <p className="font-semibold text-gray-800">💼 영업 전략 제언</p>
              <p>
                • <strong className="text-orange-600">남부 지역</strong>: 
                평당직접이익이 가장 높아 <span className="font-semibold text-green-600">신규 매장 확장 최우선 검토 권장</span>. 
                한신아레나, TS Mall 등 대형 쇼핑몰 입점 전략 지속 추진
              </p>
              <p>
                • <strong className="text-blue-600">북부 지역</strong>: 
                매장 수가 가장 많지만(10개) 평당이익률 개선 필요. 
                고수익 매장(라라포트 난강, 원동 반치아오) 운영 노하우를 저성과 매장에 전파하여 
                <span className="font-semibold">평균 매출 상향 평준화</span> 집중
              </p>
              <p>
                • <strong className="text-green-600">중부 지역</strong>: 
                매장 수 대비 양호한 평당매출. 타이중 상권 성장세를 고려하여 
                <span className="font-semibold text-blue-600">추가 입점 기회 모색</span> (백화점, 아울렛 위주)
              </p>
              <p className="text-xs text-gray-600 mt-2">
                ※ 1일 평당매출 500 HKD 이상 매장 위주로 추가 투자 및 확장 검토 권장
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
                  {showStoresMode ? '매장별 접기' : '매장별'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="p-2 text-left font-semibold">매장명</th>
                    <th className="p-2 text-right font-semibold">매장수</th>
                    <th className="p-2 text-right font-semibold">실판매출</th>
                    <th className="p-2 text-right font-semibold">면적<br/>(평)</th>
                    <th className="p-2 text-right font-semibold">직접이익</th>
                    <th className="p-2 text-right font-semibold">평당매출<br/>(K/평)</th>
                    <th className="p-2 text-right font-semibold border-l-2 border-r-2 border-t-2 border-red-500">1일 평당매출<br/>(HKD/평)</th>
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
                      {/* 지역 합계 행 */}
                      <tr 
                        className="border-b-2 border-gray-400 bg-gray-100 hover:bg-gray-200 cursor-pointer"
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
                        <td className="p-2 text-right font-semibold">{formatNumber(region.total_sales)}</td>
                        <td className="p-2 text-right">{formatDecimal(region.total_area, 0)}</td>
                        <td className={`p-2 text-right font-semibold ${region.total_direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(region.total_direct_profit)}
                        </td>
                        <td className="p-2 text-right font-semibold">{formatDecimal(region.sales_per_pyeong)}</td>
                        <td className="p-2 text-right font-semibold border-l-2 border-r-2 border-red-500">{formatNumber(region.sales_per_pyeong * 1000 / 31)}</td>
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
                        const citySalesPerPyeong = cityData.total_area > 0 ? cityData.total_sales / cityData.total_area : 0;
                        const cityDirectProfitPerPyeong = cityData.total_area > 0 ? cityData.total_direct_profit / cityData.total_area : 0;
                        const cityRentPerPyeong = cityData.total_area > 0 ? cityData.total_rent / cityData.total_area : 0;
                        const cityLaborCostPerPyeong = cityData.total_area > 0 ? cityData.total_labor_cost / cityData.total_area : 0;
                        
                        return (
                          <React.Fragment key={city}>
                            {/* 도시 합계 행 */}
                            <tr className="border-b border-gray-300 bg-blue-50">
                              <td className="p-2 pl-6 font-semibold text-blue-700 text-xs">
                                📍 {city}
                              </td>
                              <td className="p-2 text-right text-xs">{cityStores.length}개</td>
                              <td className="p-2 text-right text-xs font-semibold">{formatNumber(cityData.total_sales)}</td>
                              <td className="p-2 text-right text-xs">{formatDecimal(cityData.total_area, 0)}</td>
                              <td className={`p-2 text-right text-xs font-semibold ${cityData.total_direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatNumber(cityData.total_direct_profit)}
                              </td>
                              <td className="p-2 text-right text-xs font-semibold">{formatDecimal(citySalesPerPyeong)}</td>
                              <td className="p-2 text-right text-xs font-semibold border-l-2 border-r-2 border-red-500">{formatNumber(citySalesPerPyeong * 1000 / 31)}</td>
                              <td className={`p-2 text-right text-xs font-semibold ${cityDirectProfitPerPyeong >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatDecimal(cityDirectProfitPerPyeong)}
                              </td>
                              <td className="p-2 text-right text-xs">{formatDecimal(cityRentPerPyeong)}</td>
                              <td className="p-2 text-right text-xs">{formatDecimal(cityLaborCostPerPyeong)}</td>
                            </tr>
                            
                            {/* 매장별 행 */}
                            {!cityOnlyMode && showStoresMode && cityStores.map((store: any) => (
                              <tr key={store.storeCode} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-2 pl-10 text-gray-600">{store.storeName}</td>
                                <td className="p-2 text-right text-gray-400">-</td>
                                <td className="p-2 text-right">{formatNumber(store.netSales)}</td>
                                <td className="p-2 text-right">{formatDecimal(store.area, 0)}</td>
                                <td className={`p-2 text-right ${store.directProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatNumber(store.directProfit)}
                                </td>
                                <td className="p-2 text-right">{formatDecimal(store.salesPerPyeong)}</td>
                                <td className="p-2 text-right border-l-2 border-r-2 border-red-500">{formatNumber(store.salesPerPyeong * 1000 / 31)}</td>
                                <td className={`p-2 text-right ${store.directProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatDecimal(store.directProfitPerPyeong)}
                                </td>
                                <td className="p-2 text-right">{formatDecimal(store.rentPerPyeong)}</td>
                                <td className="p-2 text-right">{formatDecimal(store.laborCostPerPyeong)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                
                {/* 전체 합계 행 */}
                <tr className="border-t-4 border-gray-600 bg-gray-800 text-white">
                  <td className="p-2 font-bold">전체 합계</td>
                  <td className="p-2 text-right font-bold">{totalSummary.store_count}개</td>
                  <td className="p-2 text-right font-bold">{formatNumber(totalSummary.total_sales)}</td>
                  <td className="p-2 text-right font-bold">{formatDecimal(totalSummary.total_area, 0)}</td>
                  <td className={`p-2 text-right font-bold ${totalSummary.total_direct_profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {formatNumber(totalSummary.total_direct_profit)}
                  </td>
                  <td className="p-2 text-right font-bold">{formatDecimal(totalSummary.sales_per_pyeong)}</td>
                  <td className="p-2 text-right font-bold border-l-2 border-r-2 border-b-2 border-red-500">{formatNumber(totalSummary.sales_per_pyeong * 1000 / 31)}</td>
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
                  {/* 대만 섬 형태 (실제 모양에 가깝게) */}
                  <path
                    d="M 250,50 
                       C 265,57 280,72 288,95
                       L 302,140
                       C 310,180 318,220 318,260
                       L 325,330
                       C 328,385 325,440 320,495
                       L 315,550
                       C 310,590 300,630 285,660
                       L 270,685
                       C 255,698 240,702 225,700
                       L 210,695
                       C 195,688 183,673 177,655
                       L 170,625
                       C 163,590 158,550 156,510
                       L 154,455
                       C 152,405 154,355 160,305
                       L 168,250
                       C 174,205 183,160 195,120
                       L 210,85
                       C 220,67 235,55 250,50 Z"
                    fill="#e5e7eb"
                    stroke="#9ca3af"
                    strokeWidth="3"
                  />
                  
                  {/* 지역 구분선 */}
                  <line x1="168" y1="250" x2="325" y2="250" stroke="#6b7280" strokeWidth="3" strokeDasharray="8,8" />
                  <line x1="154" y1="455" x2="320" y2="455" stroke="#6b7280" strokeWidth="3" strokeDasharray="8,8" />
                  
                  {/* 지역 배경 영역 */}
                  <path d="M 250,50 C 265,57 280,72 288,95 L 302,140 C 310,180 318,220 318,250 L 168,250 C 174,205 183,160 195,120 L 210,85 C 220,67 235,55 250,50 Z" 
                    fill="#3B82F6" opacity="0.2" />
                  <path d="M 168,250 L 325,250 L 325,330 C 328,385 325,440 320,455 L 154,455 C 152,405 154,355 160,305 L 168,250 Z" 
                    fill="#10B981" opacity="0.2" />
                  <path d="M 154,455 L 320,455 L 315,550 C 310,590 300,630 285,660 L 270,685 C 255,698 240,702 225,700 L 210,695 C 195,688 183,673 177,655 L 170,625 C 163,590 158,550 156,510 L 154,455 Z" 
                    fill="#F59E0B" opacity="0.2" />
                  
                  {/* 지역 레이블 */}
                  <text x="250" y="140" textAnchor="middle" className="text-2xl font-bold" fill="#3B82F6">
                    북부 (10개)
                  </text>
                  <text x="250" y="355" textAnchor="middle" className="text-2xl font-bold" fill="#10B981">
                    중부 (3개)
                  </text>
                  <text x="250" y="575" textAnchor="middle" className="text-2xl font-bold" fill="#F59E0B">
                    남부 (3개)
                  </text>
                  
                  {/* 매장 마커 */}
                  {storeMarkers.map((marker, idx) => {
                    // 지역별 Y 위치와 분산
                    const regionY = marker.region === '북부' ? 150 : marker.region === '중부' ? 355 : 575;
                    const regionHeight = marker.region === '북부' ? 90 : marker.region === '중부' ? 95 : 110;
                    
                    // 매장을 원형으로 배치
                    const storesInRegion = storeMarkers.filter(m => m.region === marker.region);
                    const indexInRegion = storesInRegion.findIndex(m => m.storeCode === marker.storeCode);
                    const totalInRegion = storesInRegion.length;
                    
                    const angle = (indexInRegion / totalInRegion) * Math.PI * 2 - Math.PI / 2;
                    const radiusX = marker.region === '북부' ? 70 : marker.region === '중부' ? 75 : 65;
                    const radiusY = regionHeight * 0.6;
                    
                    const x = 250 + radiusX * Math.cos(angle);
                    const y = regionY + radiusY * Math.sin(angle);
                    
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

                  {/* 범례 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">범례</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                        <span className="text-gray-600">북부</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                        <span className="text-gray-600">중부</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
                        <span className="text-gray-600">남부</span>
                      </div>
                    </div>
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

