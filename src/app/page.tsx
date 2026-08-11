import type { Metadata } from 'next';
import { HomeClient } from './HomeClient';
import { JsonLd, faqJsonLd, webApplicationJsonLd } from '@/lib/seo';

const TITLE = 'WongaGo | 음식점 원가 계산기 & 무료 원가관리';
const DESCRIPTION =
  '음식점 사장님을 위한 무료 원가 계산기. 재료, 프렙, 부자재를 관리하고 메뉴 원가, 원가율, 예상 이익을 쉽게 계산하세요.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/' },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export const HOME_FAQ_ITEMS = [
  {
    question: '원가 계산은 무료인가요?',
    answer: '네. 기본적인 원가 계산과 원가율 계산은 무료로 사용할 수 있습니다.',
  },
  {
    question: '회원가입 없이 사용할 수 있나요?',
    answer: '네. 기본 원가 계산은 회원가입 없이 바로 사용할 수 있습니다.',
  },
  {
    question: '계산한 데이터를 저장할 수 있나요?',
    answer: '회원가입하면 재료, 프렙, 부자재, 메뉴를 저장하고 관리할 수 있습니다.',
  },
  {
    question: '프렙도 원가에 포함할 수 있나요?',
    answer: '네. 프렙의 재료 원가를 계산하고 메뉴 원가에 자동으로 반영할 수 있습니다.',
  },
  {
    question: '부자재도 메뉴 원가에 포함할 수 있나요?',
    answer: '네. 용기, 포장재, 젓가락 등 부자재의 비용도 메뉴 원가에 포함할 수 있습니다.',
  },
  {
    question: '식자재 가격이 바뀌면 어떻게 하나요?',
    answer:
      '내 재료에 저장한 식재료의 구매가격을 수정하면 그 재료를 사용하는 모든 메뉴의 원가가 자동으로 다시 계산됩니다.',
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={webApplicationJsonLd()} />
      <JsonLd data={faqJsonLd(HOME_FAQ_ITEMS)} />
      <HomeClient faqItems={HOME_FAQ_ITEMS} />
    </>
  );
}
