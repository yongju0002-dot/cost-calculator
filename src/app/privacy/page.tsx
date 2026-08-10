import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: 'WongaGo 개인정보처리방침입니다.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = '2026년 8월 10일';
const CONTACT_EMAIL = 'yongju0002@gmail.com';

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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-ink-500">시행일: {EFFECTIVE_DATE}</p>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
        WongaGo(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」 등
        관계 법령을 준수합니다. 이 방침은 서비스가 어떤 개인정보를 수집하고, 어떻게 이용·보관하며,
        이용자가 어떤 권리를 행사할 수 있는지 안내합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <p className="font-semibold text-ink-700">이메일 회원가입 시</p>
        <ul className="ml-4 list-disc">
          <li>필수: 이메일 주소, 비밀번호(암호화되어 저장되며 서비스도 원문을 알 수 없습니다), 이름 또는 가게 이름</li>
        </ul>
        <p className="mt-2 font-semibold text-ink-700">구글 소셜 로그인 시</p>
        <ul className="ml-4 list-disc">
          <li>구글 계정이 제공하는 이메일, 이름, 프로필 사진(제공되는 경우)</li>
        </ul>
        <p className="mt-2 font-semibold text-ink-700">서비스 이용 과정에서</p>
        <ul className="ml-4 list-disc">
          <li>회원 계정에 연결되어 저장되는 재료·메뉴·가격 등 이용자가 직접 입력한 사업 운영 정보</li>
          <li>서비스 접속 로그, 접속 기기·브라우저 정보(오류 대응 및 서비스 개선 목적)</li>
        </ul>
        <p className="mt-2 rounded-xl bg-ink-50 p-3 text-sm">
          로그인하지 않고 원가 계산기를 사용하는 경우, 입력하신 재료·메뉴 정보는 이용자의 브라우저(로컬
          저장소)에만 저장되며 서비스 서버로 전송되지 않습니다.
        </p>
      </Section>

      <Section title="2. 개인정보의 수집 및 이용 목적">
        <ul className="ml-4 list-disc">
          <li>회원 가입 의사 확인, 회원제 서비스 제공, 부정 이용 방지</li>
          <li>원가 계산 서비스 제공 (재료·메뉴 저장, 원가·원가율 계산, 대시보드 제공, 가격 변동 시 관련 메뉴 원가 재계산)</li>
          <li>문의 대응 및 서비스 개선</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        <p>
          회원 탈퇴 시 개인정보는 지체 없이 파기합니다. 다만 관계 법령에 따라 보존할 의무가 있는 경우
          해당 법령에서 정한 기간 동안 별도로 보관합니다.
        </p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 법령에 따른 요청이
          있거나 이용자가 사전에 동의한 경우는 예외로 합니다.
        </p>
      </Section>

      <Section title="5. 개인정보 처리의 위탁">
        <p>서비스는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.</p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-ink-500">
                <th className="py-2 pr-3 font-semibold">수탁업체</th>
                <th className="py-2 pr-3 font-semibold">위탁업무</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink-100">
                <td className="py-2 pr-3 font-semibold text-ink-800">Supabase, Inc.</td>
                <td className="py-2 pr-3">회원 인증 및 데이터베이스 호스팅 (서울 리전)</td>
              </tr>
              <tr className="border-b border-ink-100">
                <td className="py-2 pr-3 font-semibold text-ink-800">Google LLC</td>
                <td className="py-2 pr-3">구글 소셜 로그인 제공</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-semibold text-ink-800">Railway Corp.</td>
                <td className="py-2 pr-3">애플리케이션 서버 호스팅</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="6. 정보주체의 권리와 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.
          아래 문의처로 이메일을 보내주시면 지체 없이 조치합니다. 회원 탈퇴는 로그인 후 문의처로
          요청하시면 처리해드립니다.
        </p>
      </Section>

      <Section title="7. 개인정보의 파기">
        <p>
          전자적 파일 형태로 저장된 개인정보는 복구할 수 없는 방법으로 영구 삭제합니다. 파기 사유가
          발생하였음에도 다른 법령에 따라 보존해야 하는 정보는 별도의 데이터베이스로 옮겨 보관 후
          파기합니다.
        </p>
      </Section>

      <Section title="8. 쿠키 및 브라우저 저장소">
        <p>
          서비스는 로그인 상태 유지를 위해 브라우저 저장소를 사용합니다. 로그인하지 않은 상태에서
          원가 계산기를 사용할 때 입력한 값도 같은 방식으로 이용자의 브라우저에만 저장됩니다. 브라우저
          설정에서 저장된 정보를 삭제할 수 있으며, 이 경우 로그인 상태나 임시로 입력한 계산 내용이
          함께 삭제될 수 있습니다.
        </p>
      </Section>

      <Section title="9. 개인정보의 안전성 확보조치">
        <ul className="ml-4 list-disc">
          <li>비밀번호는 암호화하여 저장합니다.</li>
          <li>이용자 본인의 데이터만 조회·수정할 수 있도록 데이터베이스 접근 권한을 제한합니다.</li>
          <li>이용자와 서버 간 통신 구간은 HTTPS로 암호화됩니다.</li>
        </ul>
      </Section>

      <Section title="10. 개인정보 보호책임자 및 문의처">
        <p>
          개인정보 처리에 관한 문의, 불만 처리, 열람·정정·삭제 요청은 아래 이메일로 접수해주시면
          지체 없이 답변드립니다.
        </p>
        <p className="rounded-xl bg-ink-50 p-3 font-semibold text-ink-800">
          운영자: WongaGo &nbsp;·&nbsp; 이메일: {CONTACT_EMAIL}
        </p>
      </Section>

      <Section title="11. 고지의 의무">
        <p>
          이 방침의 내용이 변경되는 경우 변경사항의 시행일 최소 7일 전부터 서비스 화면을 통해
          공지합니다.
        </p>
      </Section>

      <p className="mt-10 text-sm text-ink-400">부칙 · 이 방침은 {EFFECTIVE_DATE}부터 시행합니다.</p>
    </div>
  );
}
