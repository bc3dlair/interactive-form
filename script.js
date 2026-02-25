const form = document.getElementById("orderForm");
const status = document.getElementById("formStatus");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  status.textContent = "Sending...";

  const formData = new FormData(form);

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    });

    if (response.ok) {
      status.textContent = "Request submitted successfully! Check your email soon.";
      form.reset();
    } else {
      status.textContent = "There was an error. Please try again.";
    }
  } catch (error) {
    status.textContent = "Network error. Please try again.";
  }
});
