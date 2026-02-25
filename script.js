const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const form = $("#orderForm");
const statusEl = $("#formStatus");

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

// ===== File validation =====
const fileInput = $("#uploadFile");
const allowedExt = new Set(["stl", "3mf", "obj", "amf", "png", "jpg", "jpeg", "pdf"]);

fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  const ext = f.name.split(".").pop().toLowerCase();
  if (!allowedExt.has(ext)) {
    alert("Invalid file type. Allowed: STL, 3MF, OBJ, AMF, PNG, JPEG, PDF.");
    fileInput.value = "";
  }
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

// ===== Signature canvas (optional) =====
const sigCanvas = $("#sigCanvas");
const sigClear = $("#sigClear");
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

function endDraw() { drawing = false; }

function clearSignature() {
  const ctx = sigCanvas.getContext("2d");
  ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasInk = false;
}

sigCanvas.addEventListener("mousedown", startDraw);
sigCanvas.addEventListener("mousemove", draw);
sigCanvas.addEventListener("mouseup", endDraw);
sigCanvas.addEventListener("mouseleave", endDraw);

sigCanvas.addEventListener("touchstart", startDraw, { passive: false });
sigCanvas.addEventListener("touchmove", draw, { passive: false });
sigCanvas.addEventListener("touchend", endDraw);

sigClear.addEventListener("click", clearSignature);

// ===== Human verification =====
const hpField = $("#website");                 // honeypot
const formLoadedAt = $("#formLoadedAt");       // timestamp at load
const notRobotCheck = $("#notRobotCheck");     // checkbox
const humanQuestion = $("#humanQuestion");     // text
const humanAnswer = $("#humanAnswer");         // input
const humanError = $("#humanError");           // error

let expectedHumanAnswer = null;

function initHumanCheck() {
  formLoadedAt.value = new Date().toISOString();
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  expectedHumanAnswer = a + b;
  humanQuestion.textContent = `${a} + ${b} = ?`;
}
initHumanCheck();

// ===== Mailto submit =====
const typedSignature = $("#typedSignature");
const fileAvailable = $("#fileAvailable");
const fileLink = $("#fileLink");
const fileLinkError = $("#fileLinkError");

function needsFileLink() {
  const hasFileSelected = fileInput.files && fileInput.files.length > 0;
  const saysHasFile = fileAvailable.value !== "No file - need design help";
  return hasFileSelected || saysHasFile;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  statusEl.textContent = "";
  fileLinkError.textContent = "";
  termsError.textContent = "";
  humanError.textContent = "";

  // Robot checks
  if (hpField.value.trim() !== "") {
    statusEl.textContent = "Submission blocked.";
    return;
  }

  const loaded = new Date(formLoadedAt.value).getTime();
  if (Date.now() - loaded < 5000) {
    humanError.textContent = "Please wait a few seconds and try again.";
    return;
  }

  if (!notRobotCheck.checked) {
    humanError.textContent = "Please check “I’m not a robot”.";
    return;
  }

  const ans = Number(String(humanAnswer.value || "").trim());
  if (!Number.isFinite(ans) || ans !== expectedHumanAnswer) {
    humanError.textContent = "Incorrect answer. Please try again.";
    initHumanCheck();
    humanAnswer.value = "";
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

  // Validate required fields
  const requiredIds = ["fullName", "email", "itemDesc", "quantity", "typedSignature"];
  for (const id of requiredIds) {
    const el = $("#" + id);
    if (!el.checkValidity()) {
      statusEl.textContent = "Please fill out all required fields correctly.";
      el.focus();
      return;
    }
  }

  // Typed signature
  if (!typedSignature.value.trim()) {
    statusEl.textContent = "Please type your digital signature (full name).";
    typedSignature.focus();
    return;
  }

  // File link requirement when file is involved
  if (needsFileLink() && !fileLink.value.trim()) {
    fileLinkError.textContent = "Please paste a Google Drive/Dropbox share link for your file.";
    fileLink.focus();
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
  lines.push(`Drawn Signature: ${hasInk ? "YES" : "No"}`);
  lines.push("");

  const file = fileInput.files?.[0];
  if (file) {
    lines.push(`Local File Selected (not attached): ${file.name}`);
    lines.push("");
  }

  const fd = new FormData(form);
  fd.forEach((value, key) => {
    if (key === "Color") return;
    if (key === "website") return; // honeypot
    if (key === "Form Loaded At (ISO)") return;
    if (value instanceof File) return;
    if (String(value).trim() === "") return;
    lines.push(`${key}: ${value}`);
    lines.push("");
  });

  lines.push("NOTE: Your email app opened with this message. Please click SEND to complete your request.");
  lines.push("If you have files, attach them manually OR include a share link above.");

  const subject = "New Custom 3D Order Request";
  const body = lines.join("\n");

  // mailto length limits vary; keep it text-only
  const mailto = `mailto:bc.3d.lair@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  statusEl.textContent = "Opening your email app...";
  window.location.href = mailto;
});
