const FALLBACK_SITE_URL = 'https://wonga-calculator.example.com';

/**
 * 배포 도메인. NEXT_PUBLIC_SITE_URL 로 지정한다.
 *
 * 이 값은 metadataBase(new URL)에 그대로 들어가므로 잘못된 값이면 빌드가 실패한다.
 * 실수하기 쉬운 경우를 모두 흡수한다.
 *  - 값이 없거나 빈 문자열 (Docker 의 ARG 미지정 시 빈 문자열이 들어온다)
 *  - http(s):// 를 빼먹은 경우
 *  - 끝에 경로나 슬래시가 붙은 경우
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = 'WongaGo';

export const FAQ_ITEMS = [
  {
    question: '음식 원가는 어떻게 계산하나요?',
    answer:
      '재료의 구매가격을 구매수량으로 나눠 단위 원가(1g당 가격 등)를 구한 뒤, 메뉴에 들어가는 사용량을 곱해 더하면 됩니다. WongaGo 음식 원가 계산기에서는 재료 가격과 사용량만 입력하면 자동으로 계산됩니다.',
  },
  {
    question: '음식점 원가율은 어떻게 구하나요?',
    answer:
      '원가율은 재료 원가 ÷ 판매가격 × 100 으로 계산합니다. 예를 들어 재료 원가가 2,920원이고 판매가격이 12,000원이면 원가율은 24.3%입니다.',
  },
  {
    question: '적정 판매가격은 어떻게 정하나요?',
    answer:
      '목표 원가율을 정한 뒤 재료 원가 ÷ 목표 원가율로 계산합니다. 재료 원가가 3,000원이고 목표 원가율이 30%라면 적정 판매가격은 10,000원입니다.',
  },
  {
    question: '회원가입을 해야 사용할 수 있나요?',
    answer:
      '기본 원가 계산은 회원가입 없이 무료로 사용할 수 있습니다. 재료와 메뉴를 저장하고 원가 변동을 관리하려면 무료 회원가입이 필요합니다.',
  },
  {
    question: '식재료 가격이 오르면 메뉴 원가도 자동으로 바뀌나요?',
    answer:
      '내 재료에 저장한 식재료의 구매가격을 수정하면 그 재료를 사용하는 모든 메뉴의 원가가 자동으로 다시 계산되고, 변경된 메뉴 개수를 알려드립니다.',
  },
];

export function webApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'WongaGo 음식 원가 계산기',
    alternateName: ['WongaGo', '원가계산기'],
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko-KR',
    description:
      '식재료 가격과 사용량만 입력하면 음식 원가, 원가율, 적정 판매가격을 무료로 계산할 수 있는 음식점·카페 원가 관리 서비스입니다.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '음식 원가 계산',
      '메뉴 원가율 계산',
      '적정 판매가격 계산',
      '식재료 단위 원가 관리',
      '원가 변동 관리',
    ],
  };
}

export function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD 는 정적으로 생성되는 데이터라 안전하다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
