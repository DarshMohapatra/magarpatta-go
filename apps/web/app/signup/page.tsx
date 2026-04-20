import { SignUpClient } from './signup-client';
import { AuthShell } from '@/components/auth/auth-shell';

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Create your account · Magarpatta only"
      title={
        <>
          Let&rsquo;s get you
          <br />
          <span className="italic text-[color:var(--color-saffron-soft)]">sorted.</span>
        </>
      }
      subtitle="Three quick steps — your name, your phone, your flat. We'll text you a one-time code to verify the number, then you're in."
    >
      <SignUpClient />
    </AuthShell>
  );
}
