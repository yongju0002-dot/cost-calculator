import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관',
  description: 'WongaGo 서비스 이용약관입니다.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = '2026년 8월 10일';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-[15px] leading-relaxed text-ink-600">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">이용약관</h1>
      <p className="mt-2 text-sm text-ink-500">시행일: {EFFECTIVE_DATE}</p>

      <Section title="제1조 (목적)">
        <p>
          이 약관은 WongaGo(이하 &ldquo;서비스&rdquo;)가 제공하는 음식 원가 계산 서비스의 이용조건 및
          절차, 서비스 운영자와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 (정의)">
        <p>
          &ldquo;이용자&rdquo;란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말하며,
          &ldquo;회원&rdquo;이란 이메일 또는 소셜 계정으로 가입하여 서비스를 계속적으로 이용할 수 있는
          자를 말합니다.
        </p>
      </Section>

      <Section title="제3조 (약관의 효력 및 변경)">
        <p>
          이 약관은 서비스 화면에 게시하여 공지함으로써 효력이 발생합니다. 서비스는 관련 법령을
          위반하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여
          적용일 7일 전부터 서비스 내에 공지합니다.
        </p>
      </Section>

      <Section title="제4조 (서비스의 제공)">
        <p>
          서비스는 식재료 단위 원가 계산, 메뉴 원가·원가율 계산, 적정 판매가격 계산, 재료·메뉴 저장 및
          관리, 대시보드 등을 제공합니다. 기본적인 원가 계산 기능은 회원가입 없이 무료로 이용할 수
          있으며, 재료·메뉴 저장 등 일부 기능은 회원가입이 필요합니다.
        </p>
      </Section>

      <Section title="제5조 (서비스의 변경 및 중단)">
        <p>
          서비스는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 중단할
          수 있습니다. 이 경우 사전에 서비스 내 공지를 원칙으로 하되, 긴급한 장애 등 부득이한 경우
          사후에 공지할 수 있습니다.
        </p>
      </Section>

      <Section title="제6조 (회원가입)">
        <p>
          회원가입은 이용자가 이메일 또는 구글 계정으로 신청하고 서비스가 이를 승낙함으로써 체결됩니다.
          만 14세 미만은 회원가입을 할 수 없습니다.
        </p>
      </Section>

      <Section title="제7조 (회원 탈퇴 및 자격 상실)">
        <p>
          회원은 언제든지 서비스 하단에 안내된 연락처로 탈퇴를 요청할 수 있으며, 서비스는 지체 없이
          이를 처리합니다. 회원이 타인의 정보를 도용하거나 서비스 운영을 고의로 방해하는 등 이 약관을
          위반한 경우, 서비스는 사전 통지 후 이용을 제한하거나 회원자격을 상실시킬 수 있습니다.
        </p>
      </Section>

      <Section title="제8조 (이용자의 의무)">
        <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>가입 신청 또는 정보 변경 시 허위 내용을 등록하는 행위</li>
          <li>타인의 계정을 도용하는 행위</li>
          <li>서비스의 운영을 고의로 방해하는 행위</li>
          <li>서비스를 통해 얻은 정보를 서비스의 사전 동의 없이 복제·유통하거나 영리 목적으로 이용하는 행위</li>
        </ul>
      </Section>

      <Section title="제9조 (이용자가 입력한 정보)">
        <p>
          이용자가 서비스에 입력한 재료·메뉴·가격 등 정보에 대한 권리는 이용자 본인에게 있습니다.
          서비스는 원가 계산 기능 제공, 오류 대응, 서비스 개선 목적 범위 내에서만 이를 처리합니다.
        </p>
      </Section>

      <Section title="제10조 (면책조항)">
        <p>
          서비스가 제공하는 원가, 원가율, 적정 판매가격 등 계산 결과는 이용자가 입력한 값을 기준으로 한
          참고용 정보이며, 실제 인건비·임대료·공과금 등은 반영되어 있지 않습니다. 이를 바탕으로 한
          가격 결정, 메뉴 구성 등 사업상 의사결정과 그 결과에 대한 책임은 이용자 본인에게 있습니다.
        </p>
        <p>
          서비스는 무료로 제공되며, 관계 법령에서 정한 경우를 제외하고 천재지변, 이용자의 귀책사유,
          서비스의 고의 또는 중과실이 없는 장애 등으로 인한 서비스 이용 장애에 대해 책임을 지지
          않습니다.
        </p>
      </Section>

      <Section title="제11조 (저작권)">
        <p>
          서비스가 제작한 화면 구성, 디자인, 로고 등에 대한 저작권 및 지식재산권은 서비스 운영자에게
          귀속됩니다. 이용자가 직접 입력한 데이터에 대한 권리는 제9조에 따라 이용자에게 있습니다.
        </p>
      </Section>

      <Section title="제12조 (분쟁 해결)">
        <p>
          서비스와 이용자 간 발생한 분쟁에 대해 소송이 제기될 경우 대한민국 법을 준거법으로 하며,
          민사소송법상의 관할 법원에 제기합니다.
        </p>
      </Section>

      <p className="mt-10 text-sm text-ink-400">부칙 · 이 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
    </div>
  );
}
