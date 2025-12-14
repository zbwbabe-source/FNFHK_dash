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
}

module.exports = nextConfig



