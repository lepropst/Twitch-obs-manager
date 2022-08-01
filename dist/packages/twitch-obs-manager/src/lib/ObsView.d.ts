import OBSWebSocket from 'obs-websocket-js';
export declare class OBSView {
    obs: OBSWebSocket;
    obsWindows: {
        'scene-name'?: string;
        item: {
            name?: string;
            id?: number;
        };
        rotation?: number;
        visible?: boolean;
        locked?: boolean;
        position: {
            x?: number;
            y?: number;
            alignment?: number;
        };
        scale: {
            x?: number;
            y?: number;
            filter?: string;
        };
        crop: {
            top?: number;
            bottom?: number;
            left?: number;
            right?: number;
        };
        bounds: {
            type?: string;
            alignment?: number;
            x?: number;
            y?: number;
        };
    }[];
    alias: {
        alias: string;
        name: string;
    }[];
    current: number;
    constructor(obs: OBSWebSocket);
    processChat(msg: string): void;
    addView(obsName: string, aliases?: string): void;
    setWindow(index: number, name: string): null | void;
    updateOBS(): void;
}
export default OBSView;
