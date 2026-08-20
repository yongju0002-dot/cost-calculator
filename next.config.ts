import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지에 넣을 자체 실행 가능한 .next/standalone 빌드를 만든다.
  output: "standalone",
  experimental: {
    // /prices/[slug] 정적 생성 워커가 여러 개면 프로세스마다 캐시가 따로 놀아서
    // KAMIS API 요청이 동시에 몰리고 429 로 막힌다(agromarket.ts 의 요청 큐는
    // 프로세스 하나 안에서만 유효). 빌드가 조금 느려지더라도 워커를 하나로 묶는다.
    cpus: 1,
  },
};

export default nextConfig;
