<script lang="ts">
    import Navbar from "./navbar/navbar.svelte";
    import { pageNameStore, currentUserStore, openDmsStore, fullscreenImageStore } from "./app-global";
    import { onMount } from "svelte";
    import { doNavigationCleanup, initApp } from "./app-global-script";
    import { beforeNavigate } from "$app/navigation";
    import { accessibleClickHandler } from "./misc/accessibility";

    import "./css/icons/menu.css";

    let toggleNavbar: boolean = true;

    onMount(() => {
        console.log("layout hello");
        initApp();
    });

    beforeNavigate(() => {
        doNavigationCleanup();
    });
</script>

<svelte:head>
    <title>{$pageNameStore}</title>
</svelte:head>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div id="image-fullscreen" class="image-fullscreen" style="display: {$fullscreenImageStore.active ? "flex" : "none"};" on:click={() => $fullscreenImageStore.active = false}>
    <img src="{$fullscreenImageStore.src}" alt="fullscreen">
</div>

<div class="html-container">
    <div class="page-header">
        <div id="menu-button" style="padding: 20px;" on:click={() => toggleNavbar = !toggleNavbar} on:keypress={(e) => accessibleClickHandler(e)} role="button" tabindex=0>
            <i class="gg-menu"></i>
        </div>

        <h1 id="page-title">{$pageNameStore}</h1>

        <div style="width: 70px;"></div>
    </div>

    <div class="page-container">
        <Navbar bind:toggleNavbar={toggleNavbar} currentUser={$currentUserStore} />
        <slot />
    </div>
</div>

<style>

    h1 {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
    }

    .html-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        margin: 8px;
    }

    .page-container {
        height: 100%;
        margin-top: 5px;
        margin-bottom: 5px;
        overflow-x: hidden;
        display: flex;
        flex-direction: row;
    }

    .page-header {
        display: flex;
        height: 60px;
        justify-content: flex-start;
        align-items: center;
        background-color: #1c1c1f;
        border: solid;
        border-color: #1c1c1f;
        border-radius: 12px;
    }

    .page-header i {
        margin-left: 10px;
        color: white;
        --ggs: 1.1;
    }

    .page-header h1 {
        margin: 12px;
        margin-left: auto;
        margin-right: auto;

        font-weight: 500;
        font-size: 1.9em;
        color: rgb(194, 193, 193);

        overflow: auto;
    }

    ::-webkit-scrollbar {
        width: 12px; /* Width of the scrollbar */
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

    .image-fullscreen {
        background-color: rgba(0, 0, 0, 0.7);
        display: none;
        z-index: 1;
        position: fixed;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
    }

    .image-fullscreen img {
        max-width: 85%;
        max-height: 80%;
        object-fit: cover;
    }
</style>