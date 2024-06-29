import { API } from "../../types/api";
import { currentUserStore, openDmsStore } from "./app-global";

export let ws: WebSocket;
export const users: {[key: string]: API.User} = {};
export let currentUser: API.User;
let session: string;
let appReady = false;

type AppReadyCallback = (() => void);
type WSHookedEventCallback = ((event: API.WS.Event) => void);
let appReadyQueue: AppReadyCallback[] = [];
let appWSEventsHooks: WSHookedEventCallback[] = [];
export function hookAppWS(callback: WSHookedEventCallback) {
    appWSEventsHooks.push(callback);
}

export function onAppReady(callback: AppReadyCallback) {
    if (appReady) callback();
    else appReadyQueue.push(callback);
}

export async function makeAPIRequest(method: string, path: string, body?: any, contentType?: string, controllerAbort?: AbortController) {
    const headers: ({ "X-Session": string, "Content-Type"?: string }) = { "X-Session": session };

    if (contentType !== undefined) {
        if (contentType) headers["Content-Type"] = contentType;
    } else if (typeof body === "object") {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(body);
    }

    const request = await fetch(`http://${window.location.hostname}:8000${path}`, {
        method, headers, body, signal: controllerAbort ? controllerAbort.signal : undefined
    }).catch((e) => console.error("Request failed!", e));
    if (!request) return null;

    return request;
}

function sendWSSignal(data: API.WSOutgoing.Event) {
    ws.send(JSON.stringify(data));
}

export function sendTypingSignal(channelType: API.ChannelType, channelID: string) {
    const data: API.WSOutgoing.EventTypingStart = {
        op: "TYPING_START",
        data: {
            channel_type: channelType,
            channel_id: channelID
        }
    };

    sendWSSignal(data);
}

export async function updateOpenDMs() {
    const request = await makeAPIRequest("GET", `/api/dms`);
    if (!request || !request.ok) {
        console.error(request);
        return;
    }

    const openDms: API.OpenDMs = await request.json();
    openDmsStore.set(openDms);
}

export async function doNavigationCleanup() {
    console.log("before navigate!");
    appWSEventsHooks = [];
}

export async function initApp() {
    let sessionStore = sessionStorage.getItem("session");
    if (!sessionStore) {
        alert("Not logged in!");
        window.location.href = "/login";
        return;
    }

    session = sessionStore;
    ws = new WebSocket(`ws://${window.location.hostname}:8000/api/gateway?token=${encodeURIComponent(session)}`);
    
    ws.addEventListener("open", () => {
        console.log("WS open!");
    });

    ws.addEventListener("close", event => {
        console.log("WS closed! Code", event.code);
        alert("Chat websocket disconnected!");

        if (event.code === 1008) {
            sessionStorage.clear();
            return window.location.replace("/login");
        }
    });

    ws.addEventListener("error", err => {
        console.error("WS error!", err);
    });

    ws.addEventListener("message", event => {
        const rawData: API.WS.Event = JSON.parse(event.data);
        switch (rawData.op) {
            case "READY": {
                const event: API.WS.EventReady = rawData;
                currentUser = event.data.user;
                users[currentUser.id] = currentUser;
                currentUserStore.set(currentUser);

                console.log("Logged in as user:", currentUser);

                appReady = true;
                for (const callback of appReadyQueue) callback();
                appReadyQueue = [];

                // Populate open DMs.
                updateOpenDMs();

                break;
            }

            default: {
                for (const cb of appWSEventsHooks) cb(rawData);
            }
        };
    });
}