const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const form = $("#orderForm");
const statusEl = $("#formStatus");

// ===== Has upload dropdown (instructions) =====
const hasUpload = $("#hasUpload");
const uploadInstructions = $("#uploadInstructions");
const fileLink = $("#fileLink"); // inside the instructions box

function toggleUploadInstructions() {
  const yes = hasUpload.value === "Yes";
  uploadInstructions.classList.toggle("hidden", !yes);
}
hasUpload.addEventListener("change", toggleUploadInstructions);
toggleUploadInstructions();

// ===== Color dropdown (max 4) =====
const dropdownBtn = $("#colorDropdownBtn");
const dropdownContent = $("#colorDropdownContent");
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

dropdownBtn.addEventListener("click", () => {
  const isOpen = dropdownContent.style.display === "block";
  setDropdownOpen(!isOpen);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#colorDropdown")) setDropdownOpen(false);
});

$$('input[name="Color"]').forEach((cb) => {
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

// ===== Scroll-to-bottom enables terms checkbox =====
const termsBox = $("#termsBox");
const agreeTerms = $("#agreeTerms");
const termsError = $("#termsError");

function enableTermsIfScrolled() {
  const atBottom = termsBox.scrollTop + termsBox.clientHeight >= termsBox.scrollHeight - 2;
  if (atBottom) agreeTerms.disabled = false;
}
termsBox.addEventListener("scroll", enableTermsIfScrolled);
enableTermsIfScrolled();

// ===== Mailto submit =====
const typedSignature = $("#typedSignature");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  statusEl.textContent = "";
  termsError.textContent = "";

  // Require Yes/No selection
  if (!hasUpload.value) {
    statusEl.textContent = "Please select whether you have an image/file to include.";
    hasUpload.focus();
    return;
  }

  // Validate colors
  const selectedColors = getSelectedColors();
  if (selectedColors.length === 0) {
    colorError.textContent = "Please select at least one color.";
    return;
  }
  colorError.textContent = "";

  // Validate terms
  if (agreeTerms.disabled || !agreeTerms.checked) {
    termsError.textContent = "Please scroll to the bottom and agree to the terms.";
    return;
  }

  // Validate required fields via HTML validity
  const requiredIds = ["fullName", "email", "itemDesc", "quantity", "typedSignature"];
  for (const id of requiredIds) {
    const el = $("#" + id);
    if (!el.checkValidity()) {
      statusEl.textContent = "Please fill out all required fields correctly.";
      el.focus();
      return;
    }
  }

  if (!typedSignature.value.trim()) {
    statusEl.textContent = "Please type your digital signature (full name).";
    typedSignature.focus();
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
    if (key === "Color") return; // already included
    if (String(value).trim() === "") return;
    lines.push(`${key}: ${value}`);
    lines.push("");
  });

  // If they said Yes, add clear instructions + accepted file types
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
