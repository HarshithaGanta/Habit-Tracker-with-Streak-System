const signupForm = document.getElementById("signupForm");
const signupMessageBox = document.getElementById("messageBox");

function setSignupMessage(message, type) {
    signupMessageBox.textContent = message;
    signupMessageBox.className = `flash-message ${type}`;
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value,
        confirmPassword: document.getElementById("confirmPassword").value
    };

    const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        setSignupMessage(data.error || "Unable to create account.", "error");
        return;
    }

    setSignupMessage("Account created. Redirecting...", "success");
    window.location.href = "/app";
});
