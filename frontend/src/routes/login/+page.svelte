<script>
  import { onLoginSubmit } from "./script";

</script>

<div class="container">
    <div class="login-form">
        <h1>Login to Chat</h1>
        
        <form id="login-form" on:submit|preventDefault={() => onLoginSubmit()}>
            <label for="username">Username:</label><br/>
            <input required type="text" id="username" name="username">
            <br/><br/>
            <label for="password">Password:</label><br />
            <input required type="password" id="password" name="password">
            <br/><br/><br/>
            <div class="form-footer">
                <button type="submit">Authenticate</button>
            </div>
        </form>
    </div>
</div>

<style>
    h1, p, span, label {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    .container {
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .login-form {
        width: 290px;
        padding: 10px;
        display: flex;
        background-color: #1c1c1f;
        border: solid;
        align-items: center;
        flex-direction: column;
        border-color: #1c1c1f;
        border-radius: 10px;
    }

    .login-form form {
        margin-top: 10px;
        margin-bottom: 10px;
    }

    .login-form label {
        font-size: 17px;
        color: rgb(186, 192, 192);
        font-weight: 400;
    }

    .login-form input[type=text], input[type=password] {
        background-color: #38383d;
        border: solid;
        border-color: #38383d;
        border-radius: 5px;
        outline: none;
        color: rgb(202, 202, 202);
        font-size: 14px;
    }

    .login-form button[type=submit] {
        width: 150px;
        height: 40px;
        background-color: rgb(55, 82, 76);
        color: rgb(214, 214, 214);
        font-family: "Roboto", sans-serif;
        font-size: 15px;
        border: solid;
        border-color: rgb(55, 82, 76);
        border-radius: 8px;
        cursor:pointer;
    }

    .login-form button[type=submit]:hover {
        background-color: rgb(63, 100, 92);
        border-color: rgb(63, 100, 92);
    }

    .form-footer {
        display: flex;
        justify-content: center;
    }
</style>