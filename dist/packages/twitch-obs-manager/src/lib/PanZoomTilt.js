"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PTZ = void 0;
const tslib_1 = require("tslib");
const onvif_1 = tslib_1.__importDefault(require("onvif"));
const Cam = onvif_1.default.Cam;
const pan_regex = /\b(p|pan|right|left|r|l) ?(\+|-)? ?([0-9]{1,3})/gm;
const tilt_regex = /\b(t|tilt|down|up|d|u) ?(\+|-)? ?([0-9]{1,3})/gm;
const zoom_regex = /\b(z|zoom|in|out|i|o) ?(\+|-)? ?([0-9]{1,3})/gm;
const shortcuts_regex = /\b(\w+)\b/gm;
class PTZ {
    constructor(options) {
        this.label = options.label;
        this.version = options.version || 1;
        this.cam = new Cam({
            hostname: options.hostname,
            username: options.username,
            password: options.password,
        }, (err) => {
            if (err) {
                console.log(err);
                console.log('Failed to conntect to camera: ' + this.label);
            }
            else {
                console.log('Conntected to camera: ' + this.label);
                //this.move(this.data.coords)
            }
        });
        this.data = {
            coords: {
                pan: 240,
                tilt: 20,
                zoom: 50,
            },
            shortcuts: {},
        };
    }
    getShortcutList() {
        let shortcuts = '';
        Object.keys(this.data.shortcuts).forEach((item) => {
            shortcuts = shortcuts + item + ' ';
        });
        return shortcuts;
    }
    move(coords) {
        this.cam.absoluteMove({
            x: this.calcPan(coords.pan),
            y: this.calcTilt(coords.tilt),
            zoom: this.calcZoom(coords.zoom),
        });
    }
    calcPan(pan) {
        let v = Number(pan);
        if (v < 0)
            v = 0;
        if (v > 360)
            v = 360;
        // process user set limits
        this.data.coords.pan = v;
        if (this.version == 2) {
            if (v <= 180) {
                return Number((v * 0.0055555).toFixed(2));
            }
            else {
                v = v - 180;
                return Number((v * 0.0055555 - 1).toFixed(2));
            }
        }
        else {
            return Number((v * 0.0055555 - 1).toFixed(2));
        }
    }
    calcTilt(tilt) {
        let v = Number(tilt);
        if (v < 0)
            v = 0;
        if (v > 90)
            v = 90;
        // process user set limits
        this.data.coords.tilt = v;
        if (this.version == 2) {
            return Number(((v * 0.0222222 - 1) * -1).toFixed(2));
        }
        else {
            return Number((v * 0.0222222 - 1).toFixed(2));
        }
    }
    calcZoom(zoom) {
        let v = Number(zoom);
        if (v < 0)
            v = 0;
        if (v > 100)
            v = 100;
        // process user set limits
        this.data.coords.zoom = v;
        return Number((v * 0.01).toFixed(2));
    }
    status() {
        this.cam.getStatus({}, (err, res) => {
            console.log(JSON.stringify(res, null, 2));
        });
    }
    command(txt) {
        // lowercase command to be compared
        const str_lower = txt.toLowerCase();
        // shortcuts
        let matches = str_lower.match(shortcuts_regex);
        if (matches == null)
            matches = [];
        // record if first match encountered
        let first = true;
        matches.forEach((match) => {
            if (!first && this.data.shortcuts[match]) {
                this.move(this.data.shortcuts[match]);
                return;
            }
            first = false;
        });
        // manual control
        const coords = this.data.coords;
        let have_move = false;
        let p = [];
        let t = [];
        let z = [];
        const tmpP = pan_regex.exec(str_lower);
        const tmpT = str_lower.match(tilt_regex);
        const tmpZ = str_lower.match(zoom_regex);
        if (str_lower.match(pan_regex) != null && tmpP !== null) {
            p = [...tmpP];
        }
        if (tmpT != null && tmpT !== null) {
            t = [...tmpT];
        }
        if (tmpZ != null && tmpZ !== null) {
            z = [...tmpZ];
        }
        if (p.length != 0) {
            coords.pan = this.getVal(p, coords.pan);
            have_move = true;
        }
        if (t.length != 0) {
            coords.tilt = this.getVal(t, coords.tilt);
            have_move = true;
        }
        if (z.length != 0) {
            coords.zoom = this.getVal(z, coords.zoom);
            have_move = true;
        }
        if (have_move)
            this.move(coords);
    }
    getVal(matches, current) {
        let abs = true;
        let is_pos = true;
        let val = 0;
        let pos = Number(current);
        matches.forEach((match) => {
            if (typeof match === 'number') {
                val = match;
            }
            switch (match) {
                case '-':
                case 'l':
                case 'left':
                case 'u':
                case 'up':
                case 'o':
                case 'out':
                    abs = false;
                    is_pos = false;
                    break;
                case '+':
                case 'r':
                case 'right':
                case 'd':
                case 'down':
                case 'i':
                case 'in':
                    abs = false;
                    is_pos = true;
                    break;
            }
        });
        if (abs) {
            pos = val;
        }
        else {
            if (is_pos) {
                pos += Number(val);
            }
            else {
                pos -= Number(val);
            }
        }
        return pos;
    }
}
exports.PTZ = PTZ;
exports.default = PTZ;
