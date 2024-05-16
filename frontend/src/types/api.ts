import { UITypes } from "./ui";

export namespace API {
    export enum UserType {
        USER = 1,
        BOT = 2
    };

    export enum ChannelType {
        DM = 1
    };
    
    export interface User {
        id: string,
        type: UserType,
        username: string,
        first_name: string,
        avatar_url: string
    };

    export interface IncomingAttachment {
        id: string,
        size_bytes: number,
        name: string,
        mime_type: string,
        url: string
    };

    export interface IncomingDM {
        id: string,
        user_id: string,
        channel_id: string,
        content: string,
        date: number,
        nonce?: number,
        attachments?: IncomingAttachment[],

        pending_data?: {
            status: UITypes.UserMessageStatus,
            nonce?: number,
            timeout?: number
        }
    };

    export interface OutgoingAttachment {
        name: string,
        size_bytes: number
    };

    export interface OutgoingDM {
        nonce: number,
        content: string,
        attachments?: OutgoingAttachment[]
    };

    export interface DMChannel {
        id: string,
        user: User
    };

    export type GenericChannel = DMChannel;

    export interface OpenDM {
        id: string,
        user: User
    };

    export type OpenDMs = OpenDM[];

    export namespace WS {
        export interface Event {
            op: string,
            data: any
        };

        export interface EventReady extends Event {
            data: {
                user: User
            }
        };
        
        export interface EventNewDM extends Event {
            data: IncomingDM
        };

        export interface EventTypingStart extends Event {
            data: {
                channel_id: string,
                user_id: string
            }
        }
    };

    export namespace WSOutgoing {
        export interface Event {
            op: string,
            data: any
        };

        export interface EventTypingStart extends Event {
            data: {
                channel_type: API.ChannelType,
                channel_id: string
            }
        }
    };
};