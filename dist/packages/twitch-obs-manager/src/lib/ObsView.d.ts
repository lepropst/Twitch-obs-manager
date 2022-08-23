import OBSWebSocket from 'obs-websocket-js';
export declare class OBSView {
    obs: OBSWebSocket;
    obsWindows: any[];
    obs_windows: any[];
    alias: {
        alias: string[];
        name: string;
    }[];
    current: number;
    constructor(obs: OBSWebSocket);
    processChat(msg: string): void;
    addAlias(obsName: string, aliases?: string[]): void;
    setWindow(index: number, name: string): null | void;
    updateOBS(): any;
}
export default OBSView;
