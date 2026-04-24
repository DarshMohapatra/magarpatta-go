import { redirect } from 'next/navigation';

// The OTP flow is now inline on /signin. This legacy Firebase verify step
// redirects so any cached bookmarks still land somewhere sensible.
export default function VerifyPage() {
  redirect('/signin');
}
