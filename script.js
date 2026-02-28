const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const form = $("#orderForm");
const statusEl = $("#formStatus");

// ===============================
// Upload Dropdown Logic
// ===============================
const hasUpload = $("#hasUpload");
const uploadInstructions = $("#uploadInstructions");
const fileLink = $("#fileLink");

function toggleUploadInstructions() {
  if (!hasUpload || !uploadInstructions) return;
  uploadInstructions.classList.toggle("hidden", hasUpload.value !== "Yes");
}

hasUpload?.addEventListener("change", () => {
  statusEl.textContent = "";
  toggleUploadInstructions();
});
toggleUploadInstructions();

// ===============================
// Color Dropdown (Max 4)
// ===============================
const dropdownBtn = $("#colorDropdownBtn");
const dropdownContent = $("#colorDropdownContent");
const colorError = $("#colorError");

function getSelectedColors() {
  return $$('input[name="Color"]:checked').map(cb => cb.value);
}

function updateColorButton() {
  if (!dropdownBtn) return;
  const selected = getSelectedColors();
  dropdownBtn.textContent = selected.length
    ? selected.join(", ")
    : "Select Colors";
}

function toggleDropdown(open) {
  if (!dropdownContent || !dropdownBtn) return;
  dropdownContent.style.display = open ? "block" : "none";
  dropdownBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

dropdownBtn?.addEventListener("click", () => {
  const isOpen = dropdownContent.style.display === "block";
  toggleDropdown(!isOpen);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#colorDropdown")) toggleDropdown(false);
});

$$('input[name="Color"]').forEach(cb => {
  cb.addEventListener("change", () => {
    const selected = getSelectedColors();
    if (selected.length > 4) {
      cb.checked = false;
      colorError.textContent = "You can select up to 4 colors only.";
      return;
    }
    colorError.textContent = "";
    updateColorButton();
  });
});

updateColorButton();

// ===============================
// Terms Scroll-to-Enable
// ===============================
const termsBox = $("#termsBox");
const agreeTerms = $("#agreeTerms");
const termsError = $("#termsError");

function enableTermsIfScrolled() {
  if (!termsBox || !agreeTerms) return;
  const atBottom =
    termsBox.scrollTop + termsBox.clientHeight >= termsBox.scrollHeight - 2;
  if (atBottom) agreeTerms.disabled = false;
}

termsBox?.addEventListener("scroll", enableTermsIfScrolled);
agreeTerms?.addEventListener("change", () => {
  termsError.textContent = "";
});
enableTermsIfScrolled();

// ===============================
// Mailto Submission
// ===============================
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  statusEl.textContent = "";
  colorError.textContent = "";
  termsError.textContent = "";

  if (!hasUpload.value) {
    statusEl.textContent = "Please select whether you have an image/file.";
    hasUpload.focus();
    return;
  }

  const selectedColors = getSelectedColors();
  if (selectedColors.length === 0) {
    colorError.textContent = "Please select at least one color.";
    return;
  }

  if (agreeTerms.disabled || !agreeTerms.checked) {
    termsError.textContent =
      "Please scroll to the bottom and agree to the terms.";
    return;
  }

  const requiredIds = [
    "fullName",
    "email",
    "itemDesc",
    "quantity",
    "typedSignature"
  ];

  for (const id of requiredIds) {
    const el = $("#" + id);
    if (!el.checkValidity()) {
      statusEl.textContent =
        "Please fill out all required fields correctly.";
      el.focus();
      return;
    }
  }

  // ===============================
  // Build Formatted Email Body
  // ===============================
  const now = new Date();
  const localTime = now.toLocaleString();
  const isoTime = now.toISOString();

  const lines = [];

  lines.push("CUSTOM 3D ORDER REQUEST");
  lines.push("================================");
  lines.push(`Agreement Timestamp (Local): ${localTime}`);
  lines.push(`Agreement Timestamp (ISO):   ${isoTime}`);
  lines.push("");

  lines.push("CUSTOMER INFO");
  lines.push("--------------------------------");
  lines.push(`Full Name: ${$("#fullName").value}`);
  lines.push(`Email:     ${$("#email").value}`);
  lines.push(`Phone:     ${$("#phone").value || "N/A"}`);
  lines.push("");

  lines.push("ORDER DETAILS");
  lines.push("--------------------------------");
  lines.push("Item Description:");
  lines.push($("#itemDesc").value);
  lines.push("");
  lines.push(`Preferred Colors: ${selectedColors.join(", ")}`);
  lines.push(`Estimated Size:   ${$("#sizeEstimate").value || "N/A"}`);
  lines.push(`Quantity:         ${$("#quantity").value}`);
  lines.push(`Needed By:        ${$("#deadline").value || "N/A"}`);
  lines.push("");

  lines.push("Additional Details:");
  lines.push($("#details").value || "N/A");
  lines.push("");

  if (hasUpload.value === "Yes") {
    const linkVal = (fileLink?.value || "").trim();
    lines.push("FILE / IMAGE INSTRUCTIONS");
    lines.push("--------------------------------");
    lines.push("Accepted file types:");
    lines.push("STL, 3MF, OBJ, AMF, PNG, JPG/JPEG, PDF");
    lines.push("");
    lines.push("Please attach your file/image to this email before sending.");
    lines.push("If you cannot attach it, use a Google Drive or Dropbox link.");
    lines.push(`Share link provided: ${linkVal || "N/A"}`);
    lines.push("");
  }

  lines.push("TERMS AGREEMENT");
  lines.push("--------------------------------");
  lines.push("Customer agreed to Terms & Conditions.");
  lines.push(`Typed Signature: ${$("#typedSignature").value}`);
  lines.push("");
  lines.push("END OF REQUEST");

  // ===============================
  // CRLF Formatting Fix
  // ===============================
  const body = lines.join("\r\n");
  const safeBody = body.replace(/\n/g, "\r\n");

  const subject = "New Custom 3D Order Request";
  const mailto = `mailto:bc.3d.lair@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;

  statusEl.textContent = "Opening your email app...";
  window.location.href = mailto;
});
