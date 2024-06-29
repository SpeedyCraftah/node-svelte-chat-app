<script lang="ts">
    import { onMount } from "svelte";
    import { API } from "../../../types/api";
    import { makeAPIRequest, onAppReady } from "../app-global-script";
    import { accessibleClickHandler } from "../misc/accessibility";
    import OverviewPage from "./overview.svelte";
    import { goto } from "$app/navigation";

    export let currentPage: any;

    let usernameSearchText = "";
    let searchedUsers: API.User[] = [];
    let defaultSearchedUsers: API.User[] = [];
    async function doUsernameSearch(username?: string) {
        const query: any = {};
        if (username) query["username"] = username;

        const request = await makeAPIRequest("POST", "/api/users/search", query);
        if (!request || !request.ok) return;

        return await request.json();
    }
    
    let searchTimeout: number;
    let searching = false;

    function onSearchUpdate() {
        if (searching || !usernameSearchText || usernameSearchText.length < 2) {
            searchedUsers = defaultSearchedUsers;
            return;
        }

        if (searchTimeout) {
            clearTimeout(searchTimeout);
            searchTimeout = 0;
        }

        searchTimeout = setTimeout(async () => {
            searching = true;
            searchTimeout = 0;

            searchedUsers = await doUsernameSearch(usernameSearchText);

            searching = false;
        }, 500);
    }

    $: usernameSearchText, onSearchUpdate();

    onMount(() => {
        onAppReady(async () => {
            // Generate a list of generic default users.
            defaultSearchedUsers = await doUsernameSearch();
            searchedUsers = defaultSearchedUsers;
        });
    });

    async function openRequestedDM(user: API.User) {
        const request = await makeAPIRequest("POST", `/api/users/${user.id}/dms/create`);
        if (!request || !request.ok) return;
        
        const dmData: { id: string, user: API.User } = await request.json();
        goto(`/app/dms/${dmData.id}`);
        currentPage = OverviewPage;
    }
</script>

<div>
    <h4>
        <i class="fa fa-chevron-left" on:click={() => currentPage = OverviewPage} role="button" on:keypress={(e) => accessibleClickHandler(e)} tabindex="0"></i>
        Create New DM
    </h4>
    
    <input bind:value={usernameSearchText} type="text" placeholder="Search by Username" />
</div>

<div class="user-container-container">
    <div class="user-container">
        {#each searchedUsers as user}
            <div class="user-entry" on:keypress={e => accessibleClickHandler(e)} on:click={() => openRequestedDM(user)} role="button" tabindex="0">
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
        border-radius: 3px;
        height: 20px;
        width: 180px;
    }

    input[type=text]:focus {
        outline: none;
    }

    .user-container-container {
        margin-top: 10px;
        flex-grow: 1;
        flex-shrink: 1;
        overflow-y: auto;
    }

    .user-container {
        display: flex;
        flex-direction: column;
    }

    .user-entry {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 2px;
        padding-left: 2px;
        cursor: pointer;
        margin-bottom: 2px;
        margin-right: 8px;
        max-width: 170px;
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
        white-space: nowrap;
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

    ::-webkit-scrollbar {
        width: 9px; /* Width of the scrollbar */
    }

    ::-webkit-scrollbar-track {
        background: #292828; /* Color of the track */
        border-radius: 17px;
        margin-top: 3px;
        margin-bottom: 3px;
    }

    ::-webkit-scrollbar-thumb {
        background: #535252; /* Color of the scroll thumb */
        border-radius: 5px;
    }
</style>