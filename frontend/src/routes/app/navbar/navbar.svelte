<script lang="ts">
    import { API } from "../../../types/api";
    import OverviewPage from "./overview.svelte";

    export let currentUser: API.User | undefined;
    export let toggleNavbar: boolean;

    import "../css/font-awesome.css";
    
    let currentPage = OverviewPage;
</script>

<div id="navigation-bar" class="page-navigation" style="display: {toggleNavbar ? "flex" : "none"};">
    <svelte:component this={currentPage} bind:currentPage={currentPage} />

    <div class="navbar-account">
        <img alt="user avatar" id="navbar-avatar" class="chat-message-avatar" src={currentUser?.avatar_url} />
        <span id="navbar-username">{currentUser?.username || "Loading profile..."}</span>
    </div>
</div>

<style>
    span {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    .page-navigation {
        padding: 10px;
        padding-bottom: 3px;
        background-color: #1c1c1f;
        border: solid;
        flex-direction: column;
        justify-content: space-between;
        border-color: #1c1c1f;
        border-radius: 12px;
        word-wrap: break-word;
        margin-right: 5px;
    }

    .chat-message-avatar {
        width: 50px;
        height: 50px;
        border-radius: 100%;
    }

    .navbar-account {
        margin-top: 5px;
        border-top: solid;
        border-top-color: #555454;
        border-top-width: 1px;
        padding-top: 5px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }

    .navbar-account span {
        font-size: 17px;
        margin-left: 12px;
        color: rgb(211, 209, 209);
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .navbar-account img {
        width: 40px;
        height: 40px;
    }
</style>

