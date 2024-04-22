import type { API } from "./api";

export namespace UITypes {
    export interface DMBundle {
        user: API.User,
        messages: API.IncomingDM[]
    };

    export enum UserMessageStatus {
        WAITING_FOR_ACK = 1,
        SENT = 2,
        FAILED = 3,
        ACK_TIMEOUT = 4
    };

    export interface UserTyping {
        user: API.User,
        timeout: number
    }
};

export const MessageTypeColour = {
    [UITypes.UserMessageStatus.ACK_TIMEOUT]: "rgb(195 131 84)",
    [UITypes.UserMessageStatus.FAILED]: "#d56666",
    [UITypes.UserMessageStatus.SENT]: "",
    [UITypes.UserMessageStatus.WAITING_FOR_ACK]: "#757575"
};