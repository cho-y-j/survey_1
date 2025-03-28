/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // API 재작성 규칙 추가
  async rewrites() {
    return [
      {
        source: '/api/distributions/:path*',
        destination: '/api/survey_distributions/:path*'
      }
    ]
  },

  // 환경 변수 추가
  env: {
    NEXT_PUBLIC_SURVEY_DISTRIBUTION_TABLE: 'survey_distributions'
  }
}

module.exports = nextConfig 