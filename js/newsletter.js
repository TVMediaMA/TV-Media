/**
 * TV Media Newsletter Preview Gate & Archive Script (js/newsletter.js)
 * Handles email preview gate unlocking and localStorage persistence ('tvm_newsletter_unlocked').
 */
document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'tvm_newsletter_unlocked';
  const LEGACY_KEY = 'tvmedia_newsletter_unlocked';
  const GAS_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbw5LGQen09VBiqT-Q88UMfVg_jTulpfZTRqmI2RNSXKYpHgm3LDuULusyvUou4LRaJW/exec';

  const gatedBody = document.querySelector('.gated-article-body');
  const gateOverlay = document.getElementById('gate-overlay-container');
  const unlockForm = document.getElementById('gate-unlock-form');
  const emailInput = document.getElementById('gate-email-input');
  const gateError = document.getElementById('gate-error-msg');
  const unlockedBanner = document.getElementById('unlocked-status-banner');

  function applyUnlockState() {
    if (gatedBody) {
      gatedBody.classList.remove('is-locked');
      gatedBody.classList.add('is-unlocked');
      gatedBody.removeAttribute('aria-hidden');
    }
    if (gateOverlay) {
      gateOverlay.hidden = true;
    }
    if (unlockedBanner) {
      unlockedBanner.hidden = false;
    }
  }

  // Auto-unblur for returning readers if localStorage has tvm_newsletter_unlocked === 'true'
  try {
    if (
      localStorage.getItem(STORAGE_KEY) === 'true' ||
      localStorage.getItem(LEGACY_KEY) === 'true'
    ) {
      applyUnlockState();
    }
  } catch (_) {
    // Ignore storage access errors in strict private modes
  }

  if (unlockForm && emailInput) {
    unlockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userEmail = emailInput.value.trim();
      const validPattern = /^[^\s@]+@[^\s@]+\.(com|org|edu|net|io|co)$/i;

      if (!userEmail || !validPattern.test(userEmail)) {
        if (gateError) {
          gateError.textContent =
            'Please enter a valid email ending in .com, .org, .edu, .net, .io, or .co.';
          gateError.hidden = false;
        }
        emailInput.focus();
        return;
      }

      if (gateError) {
        gateError.hidden = true;
      }

      try {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.setItem(LEGACY_KEY, 'true');
        localStorage.setItem('tvm_subscriber_email', userEmail);
      } catch (_) {
        // Ignore storage errors
      }

      applyUnlockState();

      // Fire background intake POST to Google Apps Script endpoint
      try {
        fetch(GAS_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            email: userEmail,
            newsletter: 'Yes',
            optin_newsletter: 'true',
            source: 'newsletter_preview_gate'
          })
        }).catch(() => {});
      } catch (_) {
        // Non-blocking background sync
      }
    });
  }
});

