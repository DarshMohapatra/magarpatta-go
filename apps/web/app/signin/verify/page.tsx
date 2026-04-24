import { VerifyClient } from './verify-client';
import { AuthShell } from '@/components/auth/auth-shell';

export default function VerifyPage() {
  return (
    <AuthShell
      eyebrow="Verify · one more step"
      title={
        <>
          Enter the
          <br />
          <span className="italic text-[color:var(--color-saffron-soft)]">6-digit code.</span>
        </>
      }
      subtitle="We just SMSed a code to your phone. Enter it below and you're in."
    >
      <VerifyClient />
    </AuthShell>
  );
}
