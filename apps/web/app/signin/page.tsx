import { SignInClient } from './signin-client';
import { AuthShell } from '@/components/auth/auth-shell';

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Sign in · Magarpatta only"
      title={
        <>
          Welcome back,
          <br />
          <span className="italic text-[color:var(--color-saffron-soft)]">neighbour.</span>
        </>
      }
      subtitle="Enter your phone number. We'll send a 6-digit code via SMS. That's it — no passwords, no forgotten emails."
    >
      <SignInClient />
    </AuthShell>
  );
}
