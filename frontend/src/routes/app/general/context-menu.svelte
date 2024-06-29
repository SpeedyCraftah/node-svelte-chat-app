<script lang="ts">
    import { tick } from 'svelte';

    let visible = false;
    let position = { x: 0, y: 0 };
    let dimensions = { width: 250, height: 0 };
    export let onRightClickEvent: MouseEvent;

    function onPageClick() {
        visible = false;
    }

    async function onContextMenuTrigger(event: MouseEvent) {
        if (!event) return;

        // Our context menu will be rendered before hookContextMenuDimensions has a chance to run.
        // tick waits for the component to render first, calls hookContextMenuDimensions, then continues.
        visible = true;
        await tick();

        const newPosition = { x: event.clientX, y: event.clientY };
        if (window.innerHeight - newPosition.y < dimensions.height) newPosition.y = newPosition.y - dimensions.height;
        if (window.innerWidth - newPosition.x < dimensions.width) newPosition.x = newPosition.x - dimensions.width;

        position = newPosition;
    }

    $: onRightClickEvent, onContextMenuTrigger(onRightClickEvent);

    function hookContextMenuDimensions(element: HTMLDivElement) {
        dimensions = { width: element.offsetWidth, height: element.offsetHeight };
    }
</script>

{#if visible}
<div use:hookContextMenuDimensions class="context-menu" style="top: {position.y}px; left: {position.x}px;">
    <div class="context-menu-container">
        <slot />
    </div>
</div>
{/if}

<svelte:window on:resize={() => visible = false} on:contextmenu|capture={() => visible = false} on:click={onPageClick} />

<style>
    .context-menu {
        position: absolute;
        display: block;
        background-color: rgb(53, 53, 53);
        width: 250px;
        border-radius: 5px;
    }

    .context-menu-container {
        display: flex;
        flex-direction: column;
        row-gap: 10px;
        padding: 10px;
    }

    .context-menu-container > :global(div span) {
        font-family: "Roboto", sans-serif;
        color: rgb(235, 235, 235);
        pointer-events: none;
        user-select: none;
    }

    .context-menu-container > :global(div span i) {
        font-size: 16px;
        margin-right: 8px;
    }

    .context-menu-container > :global(div) {
        padding: 7px;
        border-radius: 2px;
    }

    .context-menu-container > :global(hr) {
        padding: 0;
        margin: 0;
        border-color: rgba(124, 124, 124, 0.534);
        border-top: 1px;
        border-radius: 2px;
    }

    .context-menu-container > :global(div:hover) {
        background-color: rgb(87, 87, 87);
    }
</style>