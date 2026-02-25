const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const form = $("#orderForm");
const statusEl = $("#formStatus");

// ===== Has upload dropdown (instructions) =====
const hasUpload = $("#hasUpload");
const uploadInstructions = $("#uploadInstructions");
const fileLink = $("#fileLink");

function toggleUploadInstructions() {
  if (!hasUpload || !uploadInstructions) return;
  const yes = hasUpload.value === "Yes";
  uploadInstructions.classList.toggle("hidden", !yes);
}

hasUpload?.addEventListener("change", () => {
  statusEl.textContent = "";
  toggleUploadInstructions();
});
toggleUploadInstructions();

// ===== Color dropdown (max 4) =====
const dropdownBtn = $("#colorDropdownBtn");
const dropdownContent = $("#colorDropdownContent");
const colorError = $("#colorError");

function getSelectedColors() {
  return $$('input[name="Color"]:checked').map((c) => c.value);
}

function updateColorButtonText() {
  if (!dropdownBtn) return;
  const selected = getSelectedColors();
  dropdownBtn.textContent = selected.length ? selected.join(", ") : "Select Colors";
}

function setDropdownOpen(open) {
  if (!dropdownContent || !dropdownBtn) return;
  dropdownContent.style.display = open ? "block" : "none";
  dropdownBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

dropdownBtn?.addEventListener("click", () => {
  const isOpen = dropdownContent?.style.display === "block";
  setDropdownOpen(!isOpen);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#colorDropdown")) setDropdownOpen(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setDropdownOpen(false);
});

$$('input[name="Color"]').forEach((cb) => {
  cb.addEventListener("change", () => {
    const selected = getSelectedColors();
    if (selected.length > 4) {
      cb.checked = false;
      if (colorError) colorError.textContent = "You can select up to 4 colors only.";
      return;
    }
    if (colorError) colorError.textContent = "";
    updateColorButtonText();
  });
});

updateColorButtonText();

// ===== Scroll-to-bottom enables terms checkbox =====
const termsBox = $("#termsBox");
const agreeTerms = $("#agreeTerms");
const termsError = $("#termsError");

function enableTermsIfScrolled() {
  if (!termsBox || !agreeTerms) return;
  const atBottom = termsBox.scrollTop + termsBox.clientHeight >= termsBox.scrollHeight - 2;
  if (atBottom) agreeTerms.disabled = false;
}

termsBox?.addEventListener("scroll", () => {
  enableTermsIfScrolled();
  if (termsError) termsError.textContent = "";
});
agreeTerms?.addEventListener("change", () => {
  if (termsError) termsError.textContent = "";
});
enableTermsIfScrolled();

// ===== Mailto submit =====
const typedSignature = $("#typedSignature");

form?.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!statusEl) return;

  statusEl.textContent = "";
  if (termsError) termsError.textContent = "";
  if (colorError) colorError.textContent = "";

  // Require Yes/No selection
  if (!hasUpload || !hasUpload.value) {
    statusEl.textContent = "Please select whether you have an image/file to include.";
    hasUpload?.focus();
    return;
  }

  // Validate colors
  const selectedColors = getSelectedColors();
  if (selectedColors.length === 0) {
    if (colorError) colorError.textContent = "Please select at least one color.";
    return;
  }

  // Validate terms
  if (!agreeTerms || agreeTerms.disabled || !agreeTerms.checked) {
    if (termsError) termsError.textContent = "Please scroll to the bottom and agree to the terms.";
    return;
  }

  // Validate required fields via HTML validity
  const requiredIds = ["fullName", "email", "itemDesc", "quantity", "typedSignature"];
  for (const id of requiredIds) {
    const el = $("#" + id);
    if (el && !el.checkValidity()) {
      statusEl.textContent = "Please fill out all required fields correctly.";
      el.focus();
      return;
    }
  }

  if (!typedSignature || !typedSignature.value.trim()) {
    statusEl.textContent = "Please type your digital signature (full name).";
    typedSignature?.focus();
    return;
  }

  // Build email body
  const now = new Date();
  const localTime = now.toLocaleString();
  const isoTime = now.toISOString();

  const lines = [];
  lines.push("NEW CUSTOM 3D ORDER REQUEST");
  lines.push("");
  lines.push(`Agreement Timestamp (Local): ${localTime}`);
  lines.push(`Agreement Timestamp (ISO): ${isoTime}`);
  lines.push(`Preferred Colors: ${selectedColors.join(", ")}`);
  lines.push("");

  const fd = new FormData(form);
  fd.forEach((value, key) => {
    if (key === "Color") return;
    if (String(value).trim() === "") return;
    lines.push(`${key}: ${value}`);
    lines.push("");
  });

  if (hasUpload.value === "Yes") {
    const linkVal = (fileLink?.value || "").trim();
    lines.push("FILE/IMAGE INSTRUCTIONS:");
    lines.push("- Accepted file types: STL, 3MF, OBJ, AMF, PNG, JPG/JPEG, PDF");
    lines.push("- Please attach your file/image to this email before sending.");
    lines.push("- If you cannot attach it, include a Google Drive/Dropbox share link.");
    if (linkVal) lines.push(`- Share link provided: ${linkVal}`);
    lines.push("");
  }

  lines.push("NOTE: Your email app opened with this message. Please click SEND to complete your request.");

  const subject = "New Custom 3D Order Request";
  const body = lines.join("\n");
  const mailto = `mailto:bc.3d.lair@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  statusEl.textContent = "Opening your email app...";
  window.location.href = mailto;
});
