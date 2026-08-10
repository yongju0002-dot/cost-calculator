# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci 는 package-lock.json 이 package.json 과 정확히 일치해야 한다.
# 로컬에서 npm install 을 돌릴 수 없는 상태로 의존성을 추가했기 때문에
# 잠금 파일을 컨테이너에서 다시 만들도록 install 을 쓴다.
# 로컬 환경이 복구되면 npm install 로 잠금 파일을 갱신하고 npm ci 로 되돌릴 것.
RUN npm install --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 값은 빌드 시점에 클라이언트 코드로 인라인된다.
# 여기에 ARG 로 선언한 것만 배포 플랫폼에서 전달받으므로, 새 공개 환경변수를 추가할 때는
# 반드시 이 목록에도 함께 추가해야 한다.
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
