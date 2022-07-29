"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.example = void 0;
const tslib_1 = require("tslib");
const twitch_obs_manager_1 = require("./lib/twitch-obs-manager");
tslib_1.__exportStar(require("./lib/twitch-obs-manager"), exports);
// obs: {
//     address: string;
//     password: string;
//   };
//   tmi: Options;
//   PTZ?: {
//     cameras: {
//       label: string;
//       hostname: string;
//       username: string;
//       password: string;
//       version: number;
//     }[];
//   };
//   views: { name: string }[];
//   twitch_channel: string;
//   action: () => void;
const example = () => {
    const config = {
        obs: {
            address: '192.168.1.26',
            password: 'fooFakePassword',
        },
        tmi: {
            options: {
                debug: process.env['NODE_ENV'] === 'PRODUCTION' ? false : true,
            },
            identity: {
                username: 'my_bot_name',
                password: 'oauth:my_bot_token',
            },
            channels: ['HalbertFarms'],
        },
        views: [
            { name: 'cam1' },
            { name: 'cam2' },
            { name: 'cam3' },
            { name: 'cam4' },
            { name: 'cam5' },
            { name: 'cam6' },
        ],
        twitch_channel: 'HalbertFarms',
        action: function () {
            console.log('Executing subscriber free event');
        },
    };
    (0, twitch_obs_manager_1.twitchObsManager)(config);
};
exports.example = example;
(0, exports.example)();
