/**
 * TV Media - Contact Form & Studio Intake Handler (java/contact.js)
 * Asynchronous dispatch to Google Apps Script Web App with on-page confirmation modal.
 */
(() => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5LGQen09VBiqT-Q88UMfVg_jTulpfZTRqmI2RNSXKYpHgm3LDuULusyvUou4LRaJW/exec';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn ? submitBtn.querySelector('.btn-submit-text') : null;
  const errorBanner = document.getElementById('form-error-banner');
  const modal = document.getElementById('contact-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');
  const modalRecap = document.getElementById('modal-recap');

  // Handle URL query parameters to pre-check service chips (e.g., ?type=workshop)
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = (urlParams.get('type') || urlParams.get('service') || '').toLowerCase();
  if (typeParam) {
    const chips = form.querySelectorAll('input[name="services"]');
    chips.forEach(chip => {
      const val = chip.value.toLowerCase();
      if (
        (typeParam === 'workshop' && val.includes('workshop')) ||
        (typeParam === 'consulting' && val.includes('consulting')) ||
        (typeParam === 'social' && val.includes('social')) ||
        (typeParam === 'sprint' && val.includes('sprint')) ||
        (typeParam === 'content' && val.includes('content')) ||
        (typeParam === 'audit' && val.includes('audit'))
      ) {
        chip.checked = true;
      }
    });
  }

  // Field validation helpers
  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('has-error'));
    if (errorBanner) {
      errorBanner.hidden = true;
      errorBanner.textContent = '';
    }
  }

  function showError(fieldId, errorId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(errorId);
    if (input) input.classList.add('has-error');
    if (errorEl) errorEl.textContent = message;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Modal helpers
  function openModal(data) {
    if (!modal) return;
    if (modalRecap) {
      modalRecap.innerHTML = `
        <div class="recap-row"><strong>Selected Services:</strong> <span>${escapeHtml(data.services || 'Consulting')}</span></div>
        <div class="recap-row"><strong>Name:</strong> <span>${escapeHtml(data.name)}</span></div>
        <div class="recap-row"><strong>Email:</strong> <span>${escapeHtml(data.email)}</span></div>
        ${data.business ? `<div class="recap-row"><strong>Business / Website:</strong> <span>${escapeHtml(data.business)}</span></div>` : ''}
        <div class="recap-row"><strong>TV Media Newsletter:</strong> <span>${data.newsletter ? 'Subscribed' : 'Not opted in'}</span></div>
      `;
    }
    modal.hidden = false;
    document.body.classList.add('modal-active');
    if (modalCloseBtn) modalCloseBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-active');
    if (submitBtn) submitBtn.focus();
  }

  // Modal event listeners
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const notesInput = document.getElementById('contact-notes');
    const businessInput = document.getElementById('contact-business');
    const newsletterInput = document.getElementById('contact-newsletter');

    const name = (nameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    const notes = (notesInput?.value || '').trim();
    const business = (businessInput?.value || '').trim();
    const newsletter = newsletterInput?.checked ? 'true' : 'false';

    let hasErrors = false;

    if (!name) {
      showError('contact-name', 'name-error', 'Please enter your name.');
      hasErrors = true;
    }

    if (!email) {
      showError('contact-email', 'email-error', 'Please enter your email address.');
      hasErrors = true;
    } else if (!validateEmail(email)) {
      showError('contact-email', 'email-error', 'Please provide a valid email format (e.g. name@domain.com).');
      hasErrors = true;
    }

    if (!notes) {
      showError('contact-notes', 'notes-error', 'Please describe your business and the bottleneck you would like to solve.');
      hasErrors = true;
    }

    if (hasErrors) {
      const firstError = form.querySelector('.has-error');
      if (firstError) firstError.focus();
      return;
    }

    // Collect selected service chips
    const selectedChips = Array.from(
      form.querySelectorAll('input[name="services"]:checked')
    ).map(cb => cb.value);
    const servicesString = selectedChips.length > 0 ? selectedChips.join(', ') : 'Consulting';

    // Prepare FormData payload for Google Apps Script Web App
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('business', business);
    formData.append('services', servicesString);
    formData.append('notes', notes);
    formData.append('newsletter', newsletter);
    formData.append('timestamp', new Date().toISOString());
    formData.append('source', 'tvmediasolutions.com/contact');

    // UI Loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }
    if (btnText) {
      btnText.textContent = 'TRANSMITTING DISPATCH...';
    }

    try {
      // Send async POST to Google Apps Script Web App endpoint
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });

      // Show confirmation modal with summary
      openModal({
        name,
        email,
        business,
        services: servicesString,
        notes,
        newsletter: newsletterInput?.checked
      });

      // Reset form
      form.reset();

      // Ensure newsletter defaults to checked after reset
      if (newsletterInput) newsletterInput.checked = true;

    } catch (err) {
      console.error('Submission failed:', err);
      if (errorBanner) {
        errorBanner.hidden = false;
        errorBanner.textContent = 'Dispatch transmission interrupted. Please check your connection or email Tyler directly at tvmediama@gmail.com.';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
      if (btnText) {
        btnText.textContent = 'SEND INQUIRY DISPATCH ->';
      }
    }
  });
})();

