<script lang="ts">
    export let disabled = false;
</script>

<button disabled={disabled} class="button-style">
    <slot />
</button>

<style>
    .button-style {
        background-color: rgb(0, 47, 255);
        color: white;

        margin: 0;
        padding: 7px;
        border: none;
        border-radius: 4px;
        text-wrap: nowrap;

        font-family: "Roboto", sans-serif;
        font-size: 16px;

        transition: all 0.07s ease-in-out;
    }

    .button-style:hover {
        cursor: pointer;
        transform: scale(1.05);
        filter: brightness(90%);
    }

    .button-style:disabled {
        cursor: not-allowed;
        filter: brightness(75%);
    }
</style>