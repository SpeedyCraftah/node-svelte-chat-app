<script lang="ts">
    import { API } from "../../../types/api";
    import { makeAPIRequest } from "../app-global-script";
    import { accessibleClickHandler } from "../misc/accessibility";
    import OverviewPage from "./overview.svelte";

    export let currentPage: any;

    let usernameSearchText = "";
    let searchedUsers: API.User[] = [];
    async function doUsernameSearch() {
        const request = await makeAPIRequest("POST", "/api/users/search", {
            username: usernameSearchText
        }).catch(console.error);
        if (!request || !request.ok) return;

        searchedUsers = await request.json();
    }
    
    let searchTimeout: number;
    let searching = false;

    function onSearchUpdate() {
        if (searching || !usernameSearchText || usernameSearchText.length < 2) {
            searchedUsers = [];
            return;
        }

        if (searchTimeout) {
            clearTimeout(searchTimeout);
            searchTimeout = 0;
        }

        searchTimeout = setTimeout(async () => {
            searching = true;
            searchTimeout = 0;

            await doUsernameSearch();

            searching = false;
        }, 500);
    }

    $: usernameSearchText, onSearchUpdate();

</script>

<div>
    <h4>
        <i class="fa fa-chevron-left" on:click={() => currentPage = OverviewPage} role="button" on:keypress={(e) => accessibleClickHandler(e)} tabindex="0"></i>
        Create New DM
    </h4>

    <input bind:value={usernameSearchText} type="text" placeholder="Search by Username" />

    <div class="user-container">
        {#each searchedUsers as user}
            <div class="user-entry" on:keypress={e => accessibleClickHandler(e)} role="button" tabindex="0">
                <img alt="user avatar" loading="lazy" src={user.avatar_url}>
                <span>{user.username}</span>
            </div>
        {/each}
    </div>
</div>

<style>
    span {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    input[type=text] {
        padding: 4px;
        background-color: #494949;
        color: rgb(201, 201, 201);
        font-size: 14px;
        border: none;
        border-radius: 2px;
        height: 20px;
    }

    input[type=text]:focus {
        outline: none;
    }

    .user-container {
        margin-top: 15px;
        display: flex;
        flex-direction: column;
    }

    .user-entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 2px;
        padding-left: 5px;
        cursor: pointer;
        margin-bottom: 2px;
        overflow: hidden;
    }

    .user-entry:hover {
        border-radius: 10px;
        background-color: rgb(36, 36, 36);
    }

    .user-entry img {
        width: 25px;
        height: 25px;
        border-radius: 100%;
    }

    .user-entry span {
        color: #c7c7c7;
        margin-left: 10px;
    }

    h4 {
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

    h4 i {
        color: rgb(218, 218, 218);
        margin-right: 8px;
        margin-left: 5px;
    }

    h4 i:hover {
        cursor: pointer;
    }
</style>