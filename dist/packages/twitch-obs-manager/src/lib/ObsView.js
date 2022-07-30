"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSView = void 0;
class OBSView {
    constructor(obs) {
        this.obs = obs;
        this.obsWindows = [
            {
                'scene-name': '',
                item: { name: 'one', id: 1 },
                position: { alignment: 5, x: 0, y: 169 },
                scale: { x: 0.942187488079071, y: 0.9417344331741333 },
                visible: true,
                crop: {},
                bounds: {},
            },
            // {
            //   'scene-name': 'four',
            //   item: { name: 'four', id: 3 },
            //   position: { alignment: 5, x: 0, y: 472 },
            //   scale: { x: 0.528124988079071, y: 0.5243902206420898 },
            //   visible: true,
            //   crop: {},
            //   bounds: {},
            // },
            {
                'scene-name': 'two',
                item: { name: 'two', id: 2 },
                position: { alignment: 5, x: 1241, y: 46 },
                scale: { x: 0.528124988079071, y: 0.5284552574157715 },
                visible: true,
                crop: {},
                bounds: {},
            },
            {
                'scene-name': 'three',
                item: { name: 'three', id: 3 },
                position: { alignment: 5, x: 1241, y: 472 },
                scale: { x: 0.528124988079071, y: 0.5243902206420898 },
                visible: true,
                crop: {},
                bounds: {},
            },
        ];
        this.current = -1;
    }
    processChat(msg) {
        const window_regex = /[0-2]+/gm;
        const obsName_regex = /([A-Za-z]+[1-6])/gm;
        let swapIndex = 0;
        const cameraPlacement = msg.match(window_regex);
        // finds last number in command to use as index of where too swap.
        if (cameraPlacement) {
            swapIndex = Number(cameraPlacement[cameraPlacement.length - 1]);
        }
        if (swapIndex > 2) {
            console.log('invalid camera view index');
        }
        // extract word number combinations ass obsNames. I.e. cam1, cam2, cam3, cam4, etc.
        const obsName = msg.match(obsName_regex);
        if (obsName !== null) {
            if (obsName[0].startsWith('cam')) {
                this.setWindow(swapIndex, obsName[0]);
                this.updateOBS();
            }
            else {
                console.log('invalid camera id');
            }
        }
    }
    addView(obsName) {
        this.current++;
        if (this.current > this.obsWindows.length - 1) {
            this.obsWindows[this.current] = {
                ['scene-name']: obsName,
                item: { name: obsName, id: 0 },
                visible: false,
                position: {},
                crop: {},
                scale: {},
                bounds: {},
            };
        }
    }
    // swap window with name name with window at index
    setWindow(index, name) {
        let current_index;
        // get index of where the view is currently
        for (let x = 0; x < this.obsWindows.length; x++) {
            if (this.obsWindows[x]['scene-name'] == name) {
                current_index = x;
            }
        }
        const old_name = this.obsWindows[index]['scene-name'];
        if (!current_index) {
            return null;
        }
        // make swap
        this.obsWindows[index]['scene-name'] = name;
        this.obsWindows[current_index]['scene-name'] = old_name;
    }
    updateOBS() {
        this.obsWindows.forEach((camera) => {
            this.obs.send('SetSceneItemProperties', camera);
        });
    }
}
exports.OBSView = OBSView;
exports.default = OBSView;
