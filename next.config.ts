import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지에 넣을 자체 실행 가능한 .next/standalone 빌드를 만든다.
  output: "standalone",
};

export default nextConfig;
