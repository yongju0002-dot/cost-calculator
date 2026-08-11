'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { PasswordField, TextField } from '@/components/ui/Field';
import { LoginGate } from '@/components/layout/LoginGate';
import { Modal } from '@/components/ui/Modal';
import { IconCheck } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { changePassword, deleteAccount, signOut, useAuth, verifyPassword } from '@/lib/auth/auth';
import { LIMIT_LABELS, PLAN_LABELS, type LimitTarget } from '@/lib/domain/limits';
import { useData } from '@/lib/store/data';
import { useProfile } from '@/lib/store/profile';

const MIN_PASSWORD_LENGTH = 6;
const LIMIT_TARGETS: LimitTarget[] = ['ingredients', 'preps', 'menus', 'supplies'];

export function AccountClient() {
  const router = useRouter();
  const { user, ready: authReady, isServerAuth } = useAuth();
  const { profile, ready: profileReady, plan } = useProfile();
  const { ingredients, preps, menus, supplies, limits } = useData();
  const { showToast } = useToast();

  if (!authReady) return null;
  if (!user) {
    return (
      <LoginGate
        title="내 계정은 로그인 후 볼 수 있어요"
        description="비밀번호 변경, 요금제 확인, 회원 탈퇴는 로그인한 뒤 이용할 수 있습니다."
        next="/account"
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">내 계정</h1>
        <p className="mt-1 text-[15px] text-ink-500">{user.name} 사장님, 안녕하세요.</p>
      </div>

      {isServerAuth ? (
        <ProfileSection
          key={profile ? 'loaded' : 'loading'}
          email={user.email}
          ready={profileReady}
          name={profile?.name ?? user.name}
          storeName={profile?.storeName ?? ''}
          phone={profile?.phone ?? ''}
          avatarUrl={profile?.avatarUrl ?? ''}
        />
      ) : (
        <Card>
          <CardTitle>계정 정보</CardTitle>
          <dl className="flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-ink-500">이름</dt>
              <dd className="font-semibold text-ink-900">{user.name}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card>
        <CardTitle>내 데이터</CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['재료', ingredients.length],
            ['프렙', preps.length],
            ['부자재', supplies.length],
            ['메뉴', menus.length],
          ] as const).map(([label, count]) => (
            <div key={label} className="rounded-xl bg-ink-50 px-3 py-4 text-center">
              <p className="text-2xl font-extrabold tnum text-ink-900">{count}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-500">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle
          action={<Badge tone="brand">{PLAN_LABELS[plan]}</Badge>}
        >
          현재 플랜
        </CardTitle>
        <div className="flex flex-col gap-3">
          {LIMIT_TARGETS.map((target) => {
            const status = limits[target];
            const pct = status.max > 0 ? Math.min(100, Math.round((status.count / status.max) * 100)) : 0;
            return (
              <div key={target}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-500">
                  <span>{LIMIT_LABELS[target]}</span>
                  <span className="tnum">
                    {status.count} / {status.max}개
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full ${status.atLimit ? 'bg-amber-500' : 'bg-brand-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {plan === 'FREE' ? (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500">
            더 많은 재료·메뉴가 필요하신가요? PRO/BUSINESS 플랜은 준비 중입니다. 출시되면 이곳에서 바로
            안내해드릴게요.
          </p>
        ) : null}
      </Card>

      {isServerAuth ? <SecuritySection /> : null}

      <Card>
        <CardTitle>데이터 관리</CardTitle>
        <p className="mb-3 text-sm text-ink-500">
          내 재료·프렙·부자재·메뉴 데이터를 파일로 내려받는 기능을 준비하고 있습니다.
        </p>
        <Button variant="secondary" disabled>
          내 데이터 내보내기 (준비 중)
        </Button>
      </Card>

      {isServerAuth ? <DangerZone /> : null}

      <Button
        variant="secondary"
        size="lg"
        onClick={() => {
          signOut();
          showToast('로그아웃되었습니다.');
          router.push('/');
        }}
      >
        로그아웃
      </Button>
    </div>
  );
}

function ProfileSection({
  email,
  ready,
  name: initialName,
  storeName: initialStoreName,
  phone: initialPhone,
  avatarUrl: initialAvatarUrl,
}: {
  email: string;
  ready: boolean;
  name: string;
  storeName: string;
  phone: string;
  avatarUrl: string;
}) {
  const { updateProfile } = useProfile();
  const { showToast } = useToast();
  const [unlocked, setUnlocked] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editable = ready && unlocked;

  const handleSave = async () => {
    setError(null);
    setPending(true);
    try {
      await updateProfile({ name, storeName, phone, avatarUrl });
      showToast('저장되었습니다.', 'success');
      setUnlocked(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 문제가 발생했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardTitle
        action={
          !unlocked ? (
            <Button variant="secondary" size="sm" disabled={!ready} onClick={() => setGateOpen(true)}>
              정보 수정
            </Button>
          ) : null
        }
      >
        계정 정보
      </CardTitle>
      <div className="flex flex-col gap-3">
        <TextField label="이메일" value={email} disabled hint="이메일은 변경할 수 없습니다." />
        <TextField
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!editable}
          required
        />
        <TextField
          label="가게 이름 (선택)"
          placeholder="예) 행복식당"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          disabled={!editable}
        />
        <TextField
          label="연락처 (선택)"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={!editable}
        />
        <TextField
          label="프로필 사진 URL (선택)"
          placeholder="https://..."
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          disabled={!editable}
        />
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        {unlocked ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={pending} className="self-start">
              {pending ? '저장 중...' : '저장'}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setName(initialName);
                setStoreName(initialStoreName);
                setPhone(initialPhone);
                setAvatarUrl(initialAvatarUrl);
                setError(null);
                setUnlocked(false);
              }}
            >
              취소
            </Button>
          </div>
        ) : null}
      </div>

      <PasswordGateModal
        open={gateOpen}
        title="본인 확인"
        description="계정 정보를 수정하려면 비밀번호를 입력해주세요."
        onClose={() => setGateOpen(false)}
        onVerified={() => {
          setGateOpen(false);
          setUnlocked(true);
        }}
      />
    </Card>
  );
}

function PasswordGateModal({
  open,
  title,
  description,
  onClose,
  onVerified,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await verifyPassword(password);
      setPassword('');
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setPassword('');
        setError(null);
        onClose();
      }}
      title={title}
      description={description}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <PasswordField
          label="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? '확인 중...' : '확인'}
        </Button>
      </form>
    </Modal>
  );
}

function SecuritySection() {
  const { showToast } = useToast();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <Card>
      <CardTitle>계정 보안</CardTitle>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" className="justify-start" onClick={() => setPasswordModalOpen(true)}>
          비밀번호 변경
        </Button>
      </div>

      <PasswordChangeModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => {
          setPasswordModalOpen(false);
          showToast('비밀번호가 변경되었습니다.', 'success');
        }}
      />
    </Card>
  );
}

function PasswordChangeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setError(null);
  };

  const passwordLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = newPassword.length > 0 && newPassword === newPasswordConfirm;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!passwordLongEnough) {
      setError('새 비밀번호는 6자 이상으로 입력해주세요.');
      return;
    }
    if (!passwordsMatch) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setPending(true);
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="비밀번호 변경"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <PasswordField
          label="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <PasswordField
          label="새 비밀번호"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          hint="6자 이상으로 입력해주세요."
          required
        />
        {newPassword.length > 0 ? (
          <p
            className={`-mt-1.5 flex items-center gap-1 pl-1 text-xs font-semibold ${
              passwordLongEnough ? 'text-emerald-600' : 'text-ink-400'
            }`}
          >
            <IconCheck
              width={13}
              height={13}
              strokeWidth={3}
              className={passwordLongEnough ? 'opacity-100' : 'opacity-30'}
            />
            6자 이상 입력해주세요
          </p>
        ) : null}
        <PasswordField
          label="새 비밀번호 확인"
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? '변경 중...' : '비밀번호 변경'}
        </Button>
      </form>
    </Modal>
  );
}

function DangerZone() {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setError(null);
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    setPending(true);
    try {
      await deleteAccount(password);
      showToast('탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '탈퇴 처리 중 문제가 발생했습니다.');
      setPending(false);
    }
  };

  return (
    <Card className="border-red-200">
      <CardTitle>위험 영역</CardTitle>
      <p className="mb-3 text-sm text-ink-500">
        회원 탈퇴 시 재료·프렙·부자재·메뉴 등 저장된 모든 데이터가 영구적으로 삭제되며 되돌릴 수
        없습니다.
      </p>
      <Button variant="danger" onClick={() => setConfirmOpen(true)}>
        회원 탈퇴
      </Button>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPassword('');
          setError(null);
        }}
        title="정말 탈퇴하시겠어요?"
        description="계정과 저장된 모든 데이터가 영구적으로 삭제되며 되돌릴 수 없습니다."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false);
                setPassword('');
                setError(null);
              }}
            >
              취소
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={pending}>
              {pending ? '탈퇴 처리 중...' : '탈퇴하기'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-ink-600">
            본인 확인을 위해 현재 비밀번호를 입력해주세요.
          </p>
          <PasswordField
            label="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}
        </div>
      </Modal>
    </Card>
  );
}
