declare const Cam: any;
export declare type Options = {
    label: string;
    hostname: string;
    username: string;
    password: string;
    version?: number;
};
export declare class PTZ {
    version: number;
    label: string;
    cam: typeof Cam;
    data: {
        coords: {
            pan: number;
            tilt: number;
            zoom: number;
        };
        shortcuts: Record<string, {
            pan: number;
            tilt: number;
            zoom: number;
        }>;
    };
    constructor(options: Options);
    getShortcutList(): string;
    move(coords: {
        pan: number;
        tilt: number;
        zoom: number;
    }): void;
    calcPan(pan: number): number;
    calcTilt(tilt: number): number;
    calcZoom(zoom: number): number;
    status(): void;
    command(txt: string): void;
    getVal(matches: (string | number)[], current: number): number;
}
export default PTZ;
