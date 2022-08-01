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
            address: 'localhost:4444',
            password: '143Jdaniel!',
        },
        tmi: {
            options: {
                debug: process.env['NODE_ENV'] === 'PRODUCTION' ? false : true,
            },
            identity: {
                username: 'kunekunepigs',
                password: 'oauth:u2nlsooae7x2yvmqz3wlndyh2wqvj6',
            },
            channels: ['HalbertFarm'],
        },
        views: [
            { name: 'Cam 1', alias: 'cam1' },
            { name: 'Cam 2', alias: 'cam2' },
            // { name: 'Cam 3' },
            // { name: 'Cam 4' },
            // { name: 'Cam 5' },
            // { name: 'Cam 6' },
            // { name: 'Cam 7' },
            // { name: 'Cam 8' },
        ],
        twitch_channel: '#halbertfarm',
        action: function () {
            console.log('Executing subscriber free event');
        },
    };
    (0, twitch_obs_manager_1.twitchObsManager)(config);
};
exports.example = example;
(0, exports.example)();
