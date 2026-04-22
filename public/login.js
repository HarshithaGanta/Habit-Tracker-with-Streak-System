const loginForm = document.getElementById("loginForm");
const messageBox = document.getElementById("messageBox");

function setMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `flash-message ${type}`;
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value
    };

    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        setMessage(data.error || "Unable to login.", "error");
        return;
    }

    setMessage("Login successful. Redirecting...", "success");
    window.location.href = "/app";
});
