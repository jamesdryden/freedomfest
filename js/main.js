/* ============================================================
   FreedomFest — interactions
   ============================================================ */

/* ---- CONFIG: paste your Google Apps Script Web App URL here ----
   See README.md for the 5-minute setup. Until this is set, the
   form shows a friendly "not wired up yet" message instead of
   pretending to submit. */
const SHEET_ENDPOINT = '';

/* ===== Mobile nav ===== */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') navLinks.classList.remove('open');
});

/* ===== Gallery lightbox ===== */
const galleryImgs = Array.from(document.querySelectorAll('.g-item img'));
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
let currentIdx = 0;

function showImage(idx) {
  currentIdx = (idx + galleryImgs.length) % galleryImgs.length;
  lightboxImg.src = galleryImgs[currentIdx].src;
  lightboxImg.alt = galleryImgs[currentIdx].alt;
}

galleryImgs.forEach((img, idx) => {
  img.parentElement.addEventListener('click', () => {
    showImage(idx);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev').addEventListener('click', () => showImage(currentIdx - 1));
document.getElementById('lightboxNext').addEventListener('click', () => showImage(currentIdx + 1));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') showImage(currentIdx - 1);
  if (e.key === 'ArrowRight') showImage(currentIdx + 1);
});

/* ===== Sign-up form ===== */
const form = document.getElementById('signupForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'form-status';
  statusEl.textContent = '';

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    statusEl.classList.add('err');
    statusEl.textContent = 'Please give us your name and a valid email so we can find you! ✋';
    return;
  }

  if (!SHEET_ENDPOINT) {
    statusEl.classList.add('err');
    statusEl.textContent = 'Sign-ups aren’t wired up yet — the organiser needs to add the Google Sheet link (see README).';
    return;
  }

  const extras = Array.from(form.querySelectorAll('input[name="extras"]:checked'))
    .map((c) => c.value)
    .join(', ');

  const payload = {
    name,
    email,
    adults: form.adults.value,
    children: form.children.value.trim(),
    dogs: form.dogs.value.trim(),
    accommodation: form.accommodation.value,
    dietary: form.dietary.value.trim(),
    extras,
    message: form.message.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending… ✨';

  try {
    // Apps Script web apps don't return CORS headers for cross-origin
    // POSTs, so we fire-and-forget with no-cors. The script still
    // receives and stores the data.
    await fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    statusEl.classList.add('ok');
    statusEl.textContent = 'You’re on the list! 🎉 We’ll be in touch when plans firm up.';
    form.reset();
  } catch (err) {
    statusEl.classList.add('err');
    statusEl.textContent = 'Hmm, that didn’t send. Check your connection and try again?';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Count Me In! 🎉';
  }
});
