const form = document.getElementById("orderForm");
const status = document.getElementById("formStatus");

const dropdownBtn = document.querySelector(".dropdown-btn");
const dropdownContent = document.querySelector(".dropdown-content");
const colorCheckboxes = document.querySelectorAll('input[name="Color"]');
const colorError = document.getElementById("colorError");


// Toggle dropdown
dropdownBtn.addEventListener("click", () => {
  dropdownContent.style.display =
    dropdownContent.style.display === "block" ? "none" : "block";
});

// Close dropdown if clicking outside
document.addEventListener("click", function (e) {
  if (!e.target.closest(".dropdown")) {
    dropdownContent.style.display = "none";
  }
});

// Limit to 4 selections
colorCheckboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    const checked = document.querySelectorAll('input[name="Color"]:checked');

    if (checked.length > 4) {
      cb.checked = false;
      colorError.textContent = "You can select up to 4 colors only.";
      return;
    }

    colorError.textContent = "";

    // Update button text
    const selected = Array.from(checked).map(c => c.value);
    dropdownBtn.textContent = selected.length
      ? selected.join(", ")
      : "Select Colors";
  });
});

// Form submission
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const selectedColors = document.querySelectorAll('input[name="Color"]:checked');

  if (selectedColors.length === 0) {
    colorError.textContent = "Please select at least one color.";
    return;
  }

  status.textContent = "Sending...";

  const formData = new FormData(form);

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    });

    if (response.ok) {
      status.textContent = "Request submitted successfully!";
      form.reset();
      dropdownBtn.textContent = "Select Colors";
    } else {
      status.textContent = "There was an error. Please try again.";
    }
  } catch (error) {
    status.textContent = "Network error. Please try again.";
  }
});
