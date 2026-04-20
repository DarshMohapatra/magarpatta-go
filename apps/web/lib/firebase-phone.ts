'use client';

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { firebaseAuth } from './firebase-client';

let verifier: RecaptchaVerifier | null = null;

function clearContainerDom(containerId: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

/**
 * Mount (or reuse) an invisible reCAPTCHA on the given container id.
 * Firebase requires this for phone-number sign-in from a browser.
 *
 * If a previous verifier left stale reCAPTCHA markup in the DOM (common after
 * a failed send — billing error, invalid config, etc.), we wipe the container
 * before mounting a fresh one. Otherwise Firebase throws
 * "reCAPTCHA has already been rendered in this element".
 */
export function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  if (verifier) return verifier;
  clearContainerDom(containerId);
  verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
  });
  return verifier;
}

/** Reset if a previous OTP attempt expired / failed. */
export function resetRecaptcha(containerId?: string) {
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      // clear() can throw if the widget was never fully rendered; safe to ignore.
    }
    verifier = null;
  }
  if (containerId) clearContainerDom(containerId);
}

export async function sendPhoneOtp(phoneE164: string, containerId: string): Promise<ConfirmationResult> {
  const v = ensureRecaptcha(containerId);
  return signInWithPhoneNumber(firebaseAuth, phoneE164, v);
}
