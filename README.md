# 원가계산기 — 무료 음식 원가 · 원가율 계산 서비스

음식점 · 카페 · 분식집 · 베이커리 사장님이 식재료 가격과 사용량만 입력하면
메뉴 원가, 원가율, 적정 판매가격을 바로 확인할 수 있는 웹 서비스입니다.

> 우리 가게 음식 원가, 무료로 계산하세요.

## 화면

| 경로 | 설명 | 로그인 |
| --- | --- | --- |
| `/` | 홈 (히어로 · 계산 예시 · 기능 · FAQ) | 불필요 |
| `/calculator` | 원가 계산기 (핵심 기능) | 불필요 |
| `/calculator/[menuId]` | 저장된 메뉴 수정 | 필요 |
| `/ingredients` | 내 재료 관리 (단위 원가 · 가격 변경) | 필요 |
| `/menus` | 내 메뉴 관리 (검색 · 카테고리 · 복사 · 삭제) | 필요 |
| `/dashboard` | 요약 대시보드 (평균 원가율 · 원가 변동) | 필요 |
| `/guide` | 원가 계산 방법 안내 (SEO 콘텐츠) | 불필요 |
| `/login` | 이메일 로그인 · 무료 회원가입 | - |

## 계산 규칙

```
단위 원가   = 구매가격 ÷ 구매수량          예) 45,000원 ÷ 5kg → 9원/g
재료별 금액 = 단위 원가 × 사용량            예) 9원/g × 200g → 1,800원
재료 원가   = 재료별 금액의 합              예) 2,920원
원가율(%)   = 재료 원가 ÷ 판매가격 × 100    예) 2,920 ÷ 12,000 → 24.3%
적정 판매가 = 재료 원가 ÷ 목표 원가율       예) 3,000 ÷ 30% → 10,000원
```

- kg↔g, L↔ml 는 자동 환산합니다. 개/봉/팩/박스는 서로 환산하지 않습니다.
- 모든 반올림은 `roundTo()` 를 거쳐 부동소수점 오차를 보정합니다.
- 화면에 보이는 줄별 금액을 그대로 더하면 총 원가가 되도록, 줄 단위로 반올림한 뒤 합산합니다.
- 원가율 구간(낮음 30% 미만 / 보통 30~40% / 높음 40~50% / 매우 높음 50% 이상)은 참고용 안내입니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드
npm test         # 계산 로직 검증 (33개 항목)
npm run lint
```

## 구조

```
src/
  app/                     화면 (서버 컴포넌트에서 metadata 정의 → 클라이언트 컴포넌트 렌더)
  components/
    calculator/            계산기 화면 (입력 상태 draft, 재료 줄, 재료 선택 모달)
    layout/                헤더 · 모바일 하단 탭 · 푸터 · 로그인 안내
    ui/                    버튼 · 카드 · 입력 · 모달 · 토스트 등 공통 UI
  lib/
    domain/                계산 로직 (UI 와 완전히 분리, 순수 함수)
      units.ts             단위 정의와 환산
      money.ts             반올림 · 통화/퍼센트 표기 · 입력 파싱
      cost.ts              단위 원가 · 메뉴 원가 · 원가율 · 적정 판매가 · 원가 변동
      types.ts             데이터 모델
      menuView.ts          목록/대시보드용 표시 계산
      categories.ts        기본 카테고리
      sample.ts            예시 데이터
    store/                 상태 저장소 (useSyncExternalStore 기반)
      externalStore.ts     공통 외부 스토어
      data.ts              재료 · 메뉴 CRUD, 가격 변경 시 메뉴 원가 재계산
      draftStore.ts        계산기 입력 임시 저장
    auth/auth.ts           로그인 · 회원가입
    storage/local.ts       localStorage 접근 지점 (교체 지점)
tests/cost.test.ts         계산 로직 테스트
```

### 데이터 저장

현재 버전은 **브라우저 localStorage** 에 계정별로 저장합니다. 서버 없이 바로 배포해 쓸 수 있고,
입력한 매장 정보가 외부로 나가지 않습니다.

서버 DB 로 옮길 때 손대야 할 곳은 두 군데입니다.

- `src/lib/storage/local.ts` — 읽기/쓰기 어댑터
- `src/lib/store/data.ts` 의 `readData` / `mutate` — 저장 방식

도메인 타입(`src/lib/domain/types.ts`)과 화면 코드는 그대로 재사용할 수 있습니다.

### 로그인

두 가지 방식을 지원하며, 환경변수 유무로 자동 전환됩니다.

| 조건 | 동작 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 있음 | **Supabase 서버 로그인** (이메일 + 구글). 다른 기기에서도 같은 계정 |
| 없음 | 브라우저 로컬 계정 (서버 없이 동작하는 대비책) |

덕분에 코드를 먼저 배포해 빌드를 확인한 뒤, 환경변수를 넣는 순간 로그인이 켜집니다.
문제가 생기면 환경변수를 지우는 것만으로 즉시 되돌릴 수 있습니다.

**Supabase 쪽 설정 (한 번만)**

1. `supabase/schema.sql` 을 SQL Editor 에서 실행 (테이블 + RLS)
2. Authentication → Providers → Google 활성화 후 Google Cloud 에서 발급한 클라이언트 ID/시크릿 입력
3. Authentication → URL Configuration
   - Site URL: `https://wongago.com`
   - Redirect URLs: `https://wongago.com/auth/callback`, `http://localhost:3000/auth/callback`

3번을 빼먹으면 구글 로그인 후 엉뚱한 주소로 돌아가 로그인이 완료되지 않습니다.

## 향후 확장을 고려한 부분

재고 관리, 매출 관리, 월별 이익 분석, 엑셀/PDF 내보내기, 여러 매장, 직원 계정, POS 연동 등을
붙이기 쉽도록 다음을 미리 반영했습니다.

- 모든 레코드에 `ownerId` 를 두어 계정/매장 단위 분리가 가능
- 재료는 `priceHistory`, 메뉴는 `costHistory` 를 축적 (가격·원가 추이 분석의 기반)
- 레시피 항목은 저장된 재료와 연결(`ingredientId`)되거나 직접 입력 모두 지원
- 계산 로직이 순수 함수로 분리되어 있어 서버/배치/리포트에서 그대로 재사용 가능

## 배포

`Dockerfile` + `railway.json` 이 준비되어 있습니다 (mylifepdf / mylifeimg 와 동일한 구성).

```bash
# 1. GitHub 저장소에 올리기
git add -A
git commit -m "원가계산기 초기 버전"
gh repo create cost-calculator --private --source=. --push
```

2. Railway → New Project → Deploy from GitHub repo → `cost-calculator` 선택
   (`railway.json` 덕분에 Dockerfile 빌더가 자동 선택됩니다)
3. Variables 에 `NEXT_PUBLIC_SITE_URL = https://실제도메인` 추가
   → **빌드 시점에 주입되는 값이라, 값을 바꾸면 반드시 재배포해야 반영됩니다.**
4. Settings → Networking → 도메인 연결 (Railway 도메인 또는 커스텀 도메인)

`/calculator/[menuId]` 가 요청 시 렌더되는 동적 경로라서 Node 런타임이 필요합니다.
정적 호스팅(S3, GitHub Pages 등)에는 그대로 올릴 수 없고, Railway·Vercel 같은 Node 실행 환경이 필요합니다.

로컬에서 배포 산출물을 그대로 확인하려면:

```bash
npm run build && node .next/standalone/server.js
```

(단, `.next/static` 과 `public` 을 `.next/standalone/` 아래로 복사해야 CSS 가 적용됩니다. Dockerfile 이 그 작업을 합니다.)

### 배포 전 체크리스트

- `NEXT_PUBLIC_SITE_URL` 을 실제 도메인으로 설정 (`sitemap.xml`, `robots.txt`, canonical 에 사용)
- `src/app/favicon.ico`, `opengraph-image` 교체
- 필요 시 Google 로그인 연동
- 배포 후 Google Search Console 에 `https://도메인/sitemap.xml` 제출
