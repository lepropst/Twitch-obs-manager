import { Options } from 'tmi.js';
export declare type Config = {
    obs: {
        address: string;
        password: string;
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
    views: {
        name: string;
    }[];
    twitch_channel: string;
    action: () => void;
};
export declare function twitchObsManager(config: Config): Promise<void>;
