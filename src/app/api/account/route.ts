import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

/**
 * 회원 탈퇴.
 *
 * 클라이언트가 자기 access token 을 Authorization 헤더로 보내면, 그 토큰이
 * 정말 유효한지 Supabase Auth 서버에 직접 물어봐서(getUser) 확인한 뒤,
 * 그렇게 확인된 사용자 id 로만 삭제한다. 요청 바디에 담긴 id 는 절대
 * 신뢰하지 않는다 — 그렇지 않으면 다른 사람이 남의 계정 id 를 넣어 탈퇴시킬
 * 수 있는 심각한 취약점이 된다.
 *
 * auth.users 를 지우면 profiles/app_data 는 FK on delete cascade 로 함께
 * 정리된다 (schema.sql / 002_app_data.sql 참고).
 */
export async function DELETE(request: NextRequest) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { message: '탈퇴 기능이 아직 설정되지 않았습니다. 관리자에게 문의해주세요.' },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!token) {
    return NextResponse.json({ message: '로그인이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { message: '탈퇴 기능이 아직 설정되지 않았습니다. 관리자에게 문의해주세요.' },
      { status: 503 },
    );
  }

  const { data: userResult, error: userError } = await admin.auth.getUser(token);
  const userId = userResult?.user?.id;
  if (userError || !userId) {
    return NextResponse.json({ message: '로그인이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json(
      { message: '탈퇴 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
