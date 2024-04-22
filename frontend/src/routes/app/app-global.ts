import { Writable, writable } from "svelte/store";
import { API } from "../../types/api";
import { UITypes } from "../../types/ui";

export let pageNameStore: Writable<string> = writable("Loading...");
export let currentUserStore: Writable<API.User> = writable();
export let openDmsStore: Writable<API.OpenDMs> = writable();
export let fullscreenImageStore: Writable<{ active: boolean, src: string }> = writable({ active: false, src: "" });

export enum PageType {
    GENERIC = 1,
    DM_CHANNEL = 2
}