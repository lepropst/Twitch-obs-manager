import { Options } from 'tmi.js';
export declare type Config = {
    obs: {
        url: string;
        password?: string;
    };
    tmi: Options;
    PTZ?: {
        cameras: {
            label: string;
            hostname: string;
            username: string;
            password: string;
            version: number;
        }[];
    };
    commands: {
        name: string;
        chatOutput: string;
    }[];
    views: {
        name: string;
        alias: string[];
    }[];
    twitch_channel: string;
    action: () => void;
};
export declare function twitchObsManager(config: Config): Promise<void>;
