document.getElementById("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const request = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    if (!request.ok) {
        alert(`Login failed! Status code ${request.status} (${request.statusText}), please try again.`)
        return;
    }

    const body = await request.json();

    // Set session token.
    sessionStorage.setItem("session", body.session);
    window.location.href = "/index.html";
});

