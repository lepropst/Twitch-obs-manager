"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBSView = void 0;
class OBSView {
    constructor(obs) {
        this.obs_windows = [];
        try {
            this.obs = obs;
            this.alias = [];
            this.obsWindows = [];
            this.obs
                .call('GetSceneItemList', { sceneName: 'Scene 1' })
                .then((e) => {
                this.obsWindows = Array.from(e.sceneItems.filter((value, index, arr) => value['inputKind'] &&
                    value['inputKind'] !== 'text_ft2_source_v2'));
                this.obs_windows = Array.from(e.sceneItems.filter((value, index, arr) => value['inputKind'] &&
                    value['inputKind'] !== 'text_ft2_source_v2'));
                console.log(this.obs_windows);
            })
                .catch((e) => {
                console.log(`unable to add current items\n${e}`);
            });
            this.current = this.obsWindows.length || -1;
        }
        catch (e) {
            throw new Error('unable too initialize ObsView');
        }
    }
    processChat(msg) {
        // const words_regex = /\b(\w+)\b/gm;
        // const letters_regex = /[a-z1-8]+/gm;
        console.log('processing chat -obsView');
        try {
            const window_regex = /[0-8]+/gm;
            const obsName_regex = /([A-Za-z1-8 ]+)/gm;
            const name_regex = /([A-Za-z])/gm;
            // extract word number combinations ass obsNames. I.e. cam1, cam2, cam3, cam4, etc.
            const obsName = msg.match(obsName_regex);
            const windowRegex = msg.match(window_regex);
            if (windowRegex !== null) {
                console.log(windowRegex[windowRegex.length]);
            }
            let tmpName = '';
            if (obsName !== null) {
                this.alias.forEach((alias) => {
                    alias.alias.forEach((innerAlias) => {
                        if (innerAlias === obsName[0]) {
                            tmpName = alias.name;
                        }
                    });
                });
                console.log(tmpName);
                this.setWindow(0, tmpName);
                // this.updateOBS();
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    addAlias(obsName, aliases = []) {
        this.alias.push({
            alias: aliases.map((e) => e.toLowerCase()),
            name: obsName,
        });
    }
    // swap window with name name with window at index
    setWindow(index, name) {
        this.obs
            .call('SetCurrentProgramScene', { sceneName: name })
            .then(() => console.log('program scene set to', name))
            .catch((e) => console.log(e));
    }
    updateOBS() {
        try {
            this.obsWindows.forEach((camera) => {
                this.obs
                    .call('SetSceneItemTransform', {
                    sceneName: 'Scene 1',
                    sceneItemTransform: {
                        ...camera.sceneItemTransform,
                        boundsWidth: 2,
                        boundsHeight: 2,
                    },
                    sceneItemId: camera.sceneItemId,
                })
                    .then((result) => {
                    console.log('success');
                    console.log(result);
                })
                    .catch((e) => console.log(e));
            });
        }
        catch (e) {
            console.log('error updatng obs');
            console.log(e);
        }
    }
}
exports.OBSView = OBSView;
exports.default = OBSView;
