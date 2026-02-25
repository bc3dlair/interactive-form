// ===== Helpers =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const form = $("#orderForm");
const statusEl = $("#formStatus");

// ===== Color dropdown (max 4) =====
const dropdown = $("#colorDropdown");
const dropdownBtn = $("#colorDropdownBtn");
const dropdownContent = $("#colorDropdownContent");
const colorCheckboxes = $$('input[name="Color"]');
const colorError = $("#colorError");

function getSelectedColors() {
  return $$('input[name="Color"]:checked').map((c) => c.value);
}

function updateColorButtonText() {
  const selected = getSelectedColors();
  dropdownBtn.textContent = selected.length ? selected.join(", ") : "Select Colors";
}

function setDropdownOpen(open) {
  dropdownContent.style.display = open ? "block" : "none";
  dropdownBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

if (dropdown && dropdownBtn && dropdownContent) {
  dropdownBtn.addEventListener("click", () => {
    const isOpen = dropdownContent.style.display === "block";
    setDropdownOpen(!isOpen);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#colorDropdown")) setDropdownOpen(false);
  });

  colorCheckboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      const selected = getSelectedColors();

      if (selected.length > 4) {
        cb.checked = false;
        colorError.textContent = "You can select up to 4 colors only.";
        return;
      }

      colorError.textContent = "";
      updateColorButtonText();
    });
  });
}

// ===== File upload validation =====
const fileInput = $("#uploadFile");
const allowedExt = new Set(["stl", "3mf", "obj", "amf", "png", "jpg", "jpeg", "pdf"]);

fileInput?.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (!f) return;

  const ext = f.name.split(".").pop().toLowerCase();
  if (!allowedExt.has(ext)) {
    alert("Invalid file type. Allowed: STL, 3MF, OBJ, AMF, PNG, JPEG, PDF.");
    fileInput.value = "";
  }
});

// ===== Scroll-to-bottom enables Terms checkbox =====
const termsBox = $("#termsBox");
const agreeTerms = $("#agreeTerms");
const termsError = $("#termsError");

function enableTermsIfScrolled() {
  if (!termsBox || !agreeTerms) return;
  const atBottom = termsBox.scrollTop + termsBox.clientHeight >= termsBox.scrollHeight - 2;
  if (atBottom) agreeTerms.disabled = false;
}

termsBox?.addEventListener("scroll", enableTermsIfScrolled);
enableTermsIfScrolled();

// ===== Signature canvas (optional drawn) =====
const typedSignature = $("#typedSignature");
const sigCanvas = $("#sigCanvas");
const sigClear = $("#sigClear");
const signatureDataUrl = $("#signatureDataUrl");

let drawing = false;
let hasInk = false;

function canvasPos(e) {
  const rect = sigCanvas.getBoundingClientRect();
  const touch = e.touches?.[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDraw(e) {
  drawing = true;
  hasInk = true;
  const ctx = sigCanvas.getContext("2d");
  const p = canvasPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  e.preventDefault?.();
}

function draw(e) {
  if (!drawing) return;
  const ctx = sigCanvas.getContext("2d");
  const p = canvasPos(e);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  e.preventDefault?.();
}

function endDraw() {
  drawing = false;
}

function clearSignature() {
  if (!sigCanvas) return;
  const ctx = sigCanvas.getContext("2d");
  ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasInk = false;
  if (signatureDataUrl) signatureDataUrl.value = "";
}

if (sigCanvas) {
  sigCanvas.addEventListener("mousedown", startDraw);
  sigCanvas.addEventListener("mousemove", draw);
  sigCanvas.addEventListener("mouseup", endDraw);
  sigCanvas.addEventListener("mouseleave", endDraw);

  sigCanvas.addEventListener("touchstart", startDraw, { passive: false });
  sigCanvas.addEventListener("touchmove", draw, { passive: false });
  sigCanvas.addEventListener("touchend", endDraw);
}

sigClear?.addEventListener("click", clearSignature);

// ===== Timestamp fields =====
const agreementTimestamp = $("#agreementTimestamp");
const agreementTimestampISO = $("#agreementTimestampISO");

function setTimestamps() {
  const now = new Date();
  if (agreementTimestamp) agreementTimestamp.value = now.toLocaleString();
  if (agreementTimestampISO) agreementTimestampISO.value = now.toISOString();
}

// ===== Submit (Formspree fetch) =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";

  // Validate colors (at least 1, max 4 already enforced)
  const selectedColors = getSelectedColors();
  if (selectedColors.length === 0) {
    colorError.textContent = "Please select at least one color.";
    return;
  }
  colorError.textContent = "";

  // Validate terms (must scroll to bottom to enable)
  if (!agreeTerms || agreeTerms.disabled || !agreeTerms.checked) {
    termsError.textContent = "Please scroll to the bottom and agree to the terms.";
    return;
  }
  termsError.textContent = "";

  // Typed signature required
  if (!typedSignature?.value.trim()) {
    statusEl.textContent = "Please type your digital signature (full name).";
    return;
  }

  // Built-in required fields validation (basic)
  // If you want stricter validation, we can add it.
  const requiredFields = ["#fullName", "#email", "#itemDesc", "#quantity", "#typedSignature"];
  for (const sel of requiredFields) {
    const el = $(sel);
    if (el && !el.checkValidity()) {
      statusEl.textContent = "Please fill out all required fields correctly.";
      el.focus();
      return;
    }
  }

  // Fill timestamps
  setTimestamps();

  // Capture drawn signature (optional)
  if (sigCanvas && signatureDataUrl) {
    signatureDataUrl.value = hasInk ? sigCanvas.toDataURL("image/png") : "";
  }

  statusEl.textContent = "Sending...";

  const formData = new FormData(form);

  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    });

    if (res.ok) {
      statusEl.textContent = "Request submitted successfully!";
      form.reset();
      updateColorButtonText();
      setDropdownOpen(false);
      if (agreeTerms) agreeTerms.disabled = true; // re-lock until scrolled next time
      clearSignature();
      // Reset button label
      dropdownBtn.textContent = "Select Colors";
      // Reset scroll lock state (user must scroll again)
      setTimeout(() => {
        termsBox.scrollTop = 0;
      }, 0);
    } else {
      statusEl.textContent = "There was an error submitting the form. Please try again.";
    }
  } catch (err) {
    statusEl.textContent = "Network error. Please try again.";
  }
});
