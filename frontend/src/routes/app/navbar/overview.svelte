<script lang="ts">
    import { goto } from "$app/navigation";
    import { API } from "../../../types/api";
    import { accessibleClickHandler } from "../misc/accessibility";
    import { openDmsStore } from "../app-global";
    import { makeAPIRequest, updateOpenDMs } from "../app-global-script";
    import CreateDMPage from "./create-dm.svelte";
    import ContextMenu from "../general/context-menu.svelte";
    import { page } from '$app/stores';

    export let currentPage: any;

    function handleOpenDMClick(dm: API.OpenDM) {
        goto(`/app/dms/${dm.id}`);
    }

    let contextDMEntryHook: MouseEvent;
    let contextDMEntry: API.OpenDM;
    async function handleDMEntryContextClick(type: "hide") {
        if (type === "hide") {
            const request = await makeAPIRequest("POST", `/api/dms/${contextDMEntry.id}/hide`);
            if (!request || !request.ok) return;

            updateOpenDMs();

            // If the current page is the DM that was hidden.
            if ($page.url.pathname.startsWith(`/app/dms/${contextDMEntry.id}`)) {
                goto("/app");
            }
        }
    }
</script>

<div class="container">
    <h4>Direct Messages 
        <i class="fa fa-plus" role="button" tabindex="0" on:click={() => currentPage = CreateDMPage} on:keypress={e => accessibleClickHandler(e)}></i>
    </h4>
    
    <div id="navbar-open-dms" class="navbar-dms">
        {#if !$openDmsStore || !$openDmsStore.length}
            <p>{!$openDmsStore ? "Loading..." : "None yet!"}</p>
        {:else}
            {#each $openDmsStore as dm}
                <div class="navbar-dms-entry" on:click={() => handleOpenDMClick(dm)} on:keypress={e => accessibleClickHandler(e)} on:contextmenu|preventDefault={e => { contextDMEntry = dm; contextDMEntryHook = e}} role="button" tabindex="0">
                    <img alt="dm avatar" loading="eager" src={dm.user.avatar_url}>
                    <span>{dm.user.username}</span>
                </div>
            {/each}
        {/if}
    </div>
</div>

<ContextMenu bind:triggerEventHook={contextDMEntryHook}>
    <div role="button" tabindex="0" on:keypress={accessibleClickHandler} on:click={() => handleDMEntryContextClick("hide")}>
        <span><i class="fa fa-eye-slash" aria-hidden="true"></i> Hide Conversation</span>
    </div>
</ContextMenu>

<style>
    .container {
        min-width: 163px;
    }

    p, span {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
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

    .page-navigation h4 i {
        cursor: pointer;
        transition: opacity 0.3s ease-in-out;
        opacity: 0.45;
        margin-left: 6px;
        font-size: 14px;
        color: rgb(223, 223, 223);
    }

    .page-navigation h4:hover i {
        opacity: 1;
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
        max-width: 165px;
        overflow: hidden;
    }

    .navbar-dms-entry:hover {
        border-radius: 10px;
        background-color: rgb(36, 36, 36);
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
</style>