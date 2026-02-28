const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const form = $("#orderForm");
const statusEl = $("#formStatus");

// ===============================
// Auto-format: UPPERCASE Names
// ===============================
const fullNameEl = $("#fullName");
const sigEl = $("#typedSignature");

function toUpperTrim(s) {
  return String(s || "").trim().toUpperCase();
}

function applyUppercase(el) {
  if (!el) return;
  el.value = toUpperTrim(el.value);
}

fullNameEl?.addEventListener("blur", () => applyUppercase(fullNameEl));
sigEl?.addEventListener("blur", () => applyUppercase(sigEl));

// ===============================
// Auto-format: Phone (XXX) XXX-XXXX
// ===============================
const phoneEl = $("#phone");

function formatPhoneUS(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  const len = digits.length;

  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

phoneEl?.addEventListener("input", () => {
  const start = phoneEl.selectionStart || 0;
  const before = phoneEl.value;
  phoneEl.value = formatPhoneUS(phoneEl.value);

  // Best-effort caret handling
  const delta = phoneEl.value.length - before.length;
  phoneEl.setSelectionRange(start + delta, start + delta);
});

// ===============================
// Upload dropdown (instructions)
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
// Color dropdown (max 4)
// ===============================
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

// ===============================
// Terms scroll-to-enable
// ===============================
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

// ===============================
// PDF Helpers (jsPDF)
// ===============================
function ymd(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function safeFileName(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

function addSection(doc, title, bodyLines, startY) {
  const left = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - left * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, left, startY);

  let y = startY + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  for (const line of bodyLines) {
    const wrapped = doc.splitTextToSize(String(line), usableWidth);
    for (const w of wrapped) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(w, left, y);
      y += 6;
    }
  }
  return y + 4;
}

// ===============================
// Submit: Generate PDF Preview
// ===============================
form?.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!statusEl) return;
  statusEl.textContent = "";
  if (colorError) colorError.textContent = "";
  if (termsError) termsError.textContent = "";

  // Apply uppercase on submit too (in case they didn't blur)
  applyUppercase(fullNameEl);
  applyUppercase(sigEl);

  // Validate hasUpload selection
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

  // Required fields validity
  const requiredIds = ["fullName", "email", "itemDesc", "quantity", "typedSignature"];
  for (const id of requiredIds) {
    const el = $("#" + id);
    if (el && !el.checkValidity()) {
      statusEl.textContent = "Please fill out all required fields correctly.";
      el.focus();
      return;
    }
  }

  const now = new Date();
  const localTime = now.toLocaleString();
  const isoTime = now.toISOString();

  const customerName = $("#fullName")?.value || "UNKNOWN";
  const subjectLine = `CUSTOM 3D ORDER REQUEST - ${customerName}`;

  // Build PDF content
  const customerInfo = [
    `Full Name: ${customerName}`,
    `Email: ${$("#email")?.value || ""}`,
    `Phone: ${$("#phone")?.value || "N/A"}`
  ];

  const orderDetails = [
    `Item Description:`,
    `${$("#itemDesc")?.value || ""}`,
    ``,
    `Preferred Colors: ${selectedColors.join(", ")}`,
    `Estimated Size: ${$("#sizeEstimate")?.value || "N/A"}`,
    `Quantity: ${$("#quantity")?.value || ""}`,
    `Needed By: ${$("#deadline")?.value || "N/A"}`,
    ``,
    `Additional Details:`,
    `${$("#details")?.value || "N/A"}`
  ];

  const uploadSection = [];
  if (hasUpload.value === "Yes") {
    uploadSection.push("Customer indicated they have an image/file to include.");
    uploadSection.push("Accepted types: STL, 3MF, OBJ, AMF, PNG, JPG/JPEG, PDF");
    uploadSection.push("Customer should attach file(s) when emailing this PDF.");
    uploadSection.push(`Share link provided: ${(fileLink?.value || "").trim() || "N/A"}`);
  } else {
    uploadSection.push("Customer indicated they do NOT have an image/file to include.");
  }

  const termsSig = [
    `Agreement Timestamp (Local): ${localTime}`,
    `Agreement Timestamp (ISO): ${isoTime}`,
    `Agreed to Terms & Conditions: YES`,
    `Typed Signature: ${$("#typedSignature")?.value || ""}`
  ];

  // Create PDF (jsPDF)
  if (!window.jspdf || !window.jspdf.jsPDF) {
    statusEl.textContent = "PDF library failed to load. Check your internet connection and refresh.";
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });

  // Title (includes customer name)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(subjectLine, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Generated: ${localTime}`, 14, 26);

  let y = 36;
  y = addSection(doc, "CUSTOMER INFO", customerInfo, y);
  y = addSection(doc, "ORDER DETAILS", orderDetails, y);
  y = addSection(doc, "FILE / IMAGE", uploadSection, y);
  y = addSection(doc, "TERMS & SIGNATURE", termsSig, y);

  // Footer instruction
  if (y > 270) doc.addPage();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text("Next step: Email this PDF to bc.3d.lair@gmail.com (attach your files too if applicable).", 14, 285);

  // Filename includes customer name
  const fileName = `Custom3DOrder_${safeFileName(customerName) || "Customer"}_${ymd(now)}.pdf`;

  // Open preview in new tab + also download
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  doc.save(fileName);

  statusEl.textContent = "PDF opened in a new tab and downloaded. Please email it to bc.3d.lair@gmail.com.";
});
