export async function onLoginSubmit() {
    const username = (document.getElementById("username") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;

    const request = await fetch("http://127.0.0.1:8000/api/login", {
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

    const body: { session: string } = await request.json();

    // Set session token.
    sessionStorage.setItem("session", body.session);
    window.location.href = "/app";
}