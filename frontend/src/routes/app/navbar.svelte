<script lang="ts">
    import { goto } from "$app/navigation";
    import { API } from "../../types/api";

    export let currentUser: API.User | undefined;
    export let openDMs: API.OpenDMs = [];
    export let toggleNavbar: boolean;

    function handleOpenDMClick(dm: API.OpenDM) {
        goto(`/app/dms/${dm.id}`);
    }

    function accessibleClickHandler(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.target?.dispatchEvent(new Event("click"));
        }
    }
</script>

<div id="navigation-bar" class="page-navigation" style="display: {toggleNavbar ? "flex" : "none"};">
    <div>
        <h4>Direct Messages</h4>
        <div id="navbar-open-dms" class="navbar-dms">
            {#if !openDMs.length}
                <p>None yet!</p>
            {:else}
                {#each openDMs as dm}
                    <div class="navbar-dms-entry" on:click={() => handleOpenDMClick(dm)} on:keypress={e => accessibleClickHandler(e)} role="button" tabindex="0">
                        <img alt="dm avatar" loading="eager" src={dm.user.avatar_url}>
                        <span>{dm.user.username}</span>
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <div class="navbar-account">
        <img alt="user avatar" id="navbar-avatar" class="chat-message-avatar" src={currentUser?.avatar_url} />
        <span id="navbar-username">{currentUser?.username || "Loading profile..."}</span>
    </div>
</div>

<style>
    p, span {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    .page-navigation {
        padding: 10px;
        min-width: 150px;
        max-width: 200px;
        background-color: #1c1c1f;
        border: solid;
        flex-direction: column;
        justify-content: space-between;
        border-color: #1c1c1f;
        border-radius: 12px;
        word-wrap: break-word;
        margin-right: 5px;
    }

    .page-navigation h4 {
        font-family: "Roboto", sans-serif;
        color: rgb(156, 156, 156);
        margin-top: 10px;
        border-bottom: solid;
        border-bottom-color: #555454;
        border-bottom-width: 1px;
        padding-bottom: 5px;
        padding-left: 3px;
        margin-bottom: 14px;
    }

    .chat-message-avatar {
        width: 50px;
        height: 50px;
        border-radius: 100%;
    }

    .navbar-dms {
        display: flex;
        flex-direction: column;
    }

    .navbar-dms-entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 2px;
        padding-left: 5px;
        cursor: pointer;
        margin-bottom: 2px;
        overflow: hidden;
    }

    .navbar-dms-entry:hover {
        border-radius: 10px;
        background-color: rgb(36, 36, 36)
    }

    .navbar-dms-entry img {
        width: 25px;
        height: 25px;
        border-radius: 100%;
    }

    .navbar-dms-entry span {
        color: #c7c7c7;
        margin-left: 10px;
    }

    .navbar-account {
        border-top: solid;
        border-top-color: #555454;
        border-top-width: 1px;
        padding-top: 10px;
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

