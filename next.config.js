/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 15의 동적 API 경고 억제 (개발 모드에서만)
  experimental: {
    // 경고를 로그로만 표시하고 빌드는 계속 진행
  },
  // 로그 레벨 조정
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Webpack 설정: 큰 파일 처리
  webpack: (config, { dev, isServer }) => {
    // 개발 모드에서 청크 로딩 타임아웃 증가
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // 큰 컴포넌트를 별도 청크로 분리
            dashboard: {
              name: 'dashboard',
              test: /[\\/]components[\\/]dashboard[\\/]/,
              priority: 10,
            },
          },
        },
      };
    }
    return config;
  },
  // 개발 서버 설정
  devIndicators: {
    buildActivityPosition: 'bottom-right',
  },
}

module.exports = nextConfig



