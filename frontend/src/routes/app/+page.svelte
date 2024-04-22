<script lang="ts">
    import { onMount } from "svelte";
    import { pageNameStore } from "./app-global";

    onMount(() => {
        $pageNameStore = "Main Page";
    });
</script>