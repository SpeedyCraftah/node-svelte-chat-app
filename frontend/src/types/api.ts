import { UITypes } from "./ui";

export namespace API {
    export enum UserType {
        USER = 1,
        BOT = 2
    };
    
    export interface User {
        id: string,
        type: UserType,
        username: string,
        first_name: string,
        avatar_url: string
    };

    export enum MessageType {
        TEXT = 1,
        IMAGE = 2
    };
    
    export interface IncomingDM {
        id: string,
        user_id: string,
        channel_id: string,
        type: MessageType,
        content: string,
        date: number,
        nonce?: number,

        pending_data?: {
            status: UITypes.UserMessageStatus,
            nonce?: number,
            timeout?: number
        }
    };

    export interface OutgoingDM {
        nonce: number,
        type: MessageType,
        content: string
    };

    export interface OutgoingDMResponse {
        id: string,
        date: number
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
};