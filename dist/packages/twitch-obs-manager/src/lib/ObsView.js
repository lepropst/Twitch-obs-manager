"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSView = void 0;
class OBSView {
    constructor(obs) {
        try {
            this.obs = obs;
            this.alias = [];
            this.obsWindows = [
                {
                    'scene-name': 'Cam 1',
                    item: { name: 'Cam 1', id: 1 },
                    position: { alignment: 5, x: 0, y: 169 },
                    scale: { x: 0.666666, y: 0.666666 },
                    visible: true,
                    crop: {},
                    bounds: {},
                },
                {
                    'scene-name': 'Cam 2',
                    item: { name: 'Cam 2', id: 2 },
                    position: { alignment: 5, x: 1241, y: 46 },
                    scale: { x: 0.3333333, y: 0.3333333 },
                    visible: true,
                    crop: {},
                    bounds: {},
                },
                {
                    'scene-name': 'Cam 3',
                    item: { name: 'Cam 3', id: 3 },
                    position: { alignment: 5, x: 1241, y: 472 },
                    scale: { x: 0.33, y: 0.33 },
                    visible: true,
                    crop: {},
                    bounds: {},
                },
                {
                    'scene-name': 'Cam 3',
                    item: { name: 'Cam 3', id: 3 },
                    position: { alignment: 5, x: 1241, y: 898 },
                    scale: { x: 0.33, y: 0.33 },
                    visible: true,
                    crop: {},
                    bounds: {},
                },
            ];
        }
        catch (e) {
            console.log(e);
            throw new Error('unable too initialize ObsView');
        }
        this.current = -1;
    }
    processChat(msg) {
        const words_regex = /\b(\w+)\b/gm;
        const letters_regex = /[a-z1-8]+/gm;
        try {
            const window_regex = /[0-2]+/gm;
            const obsName_regex = /([A-Za-z]+[1-6])/gm;
            // let swapIndex = 0;
            // const cameraPlacement = msg.match(window_regex);
            // // finds last number in command to use as index of where too swap.
            // if (cameraPlacement) {
            //   swapIndex = Number(cameraPlacement[cameraPlacement.length - 1]);
            // }
            // if (swapIndex > this.obsWindows.length - 1) {
            //   console.log('invalid camera view index');
            // }
            // extract word number combinations ass obsNames. I.e. cam1, cam2, cam3, cam4, etc.
            const obsName = msg.match(obsName_regex);
            let tmpName = '';
            if (obsName !== null) {
                this.alias.forEach((alias) => {
                    console.log(alias);
                    if (alias.alias == obsName[0]) {
                        tmpName = alias.name;
                    }
                });
                console.log(tmpName);
                this.setWindow(0, tmpName);
                this.updateOBS();
            }
            // figure out what our window index is
            // let window_index = 0;
            // const window_index_match = msg.match(window_regex);
            // if (window_index_match != null) {
            //   window_index = Number(
            //     window_index_match[window_index_match.length - 1]
            //   );
            // }
            // // check for matching alias
            // const matches = msg.toLowerCase().match(words_regex);
            // if (matches == null) return;
            // let hasChanges = false;
            // let obsName = '';
            // matches.forEach((match) => {
            //   const keyword = match.match(letters_regex);
            //   if (keyword != null) {
            //     this.alias.forEach((alias) => {
            //       console.log(alias);
            //       if (alias.alias == keyword[0]) {
            //         obsName = alias.name;
            //         console.log(obsName);
            //         hasChanges = true;
            //       }
            //     });
            //   }
            // });
            // if (hasChanges) {
            //   console.log('updating windows');
            //   this.setWindow(window_index, obsName);
            //   this.updateOBS();
            // }
        }
        catch (e) {
            console.log(e);
        }
    }
    addView(obsName, aliases = '') {
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
            this.alias.push({ alias: aliases.toLowerCase(), name: obsName });
        }
    }
    // swap window with name name with window at index
    setWindow(index, name) {
        let current_index = 0;
        const old_name = this.obsWindows[index]['scene-name'];
        // get index of where the view is currently
        for (let x = 0; x < this.obsWindows.length; x++) {
            console.log('matchinng');
            if (this.obsWindows[x].item.name === name) {
                console.log(this.obsWindows[x]['scene-name']);
                current_index = x;
            }
        }
        console.log(`current index of view to be set: ${current_index}`);
        if (!current_index) {
            return null;
        }
        console.log(name);
        this.obsWindows[index]['scene-name'] = name;
        this.obsWindows[current_index]['scene-name'] = old_name;
    }
    updateOBS() {
        try {
            this.obsWindows.forEach((camera) => {
                this.obs.sendCallback('SetSceneItemProperties', camera, () => console.log(`${camera['scene-name']} updated`));
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.OBSView = OBSView;
exports.default = OBSView;
