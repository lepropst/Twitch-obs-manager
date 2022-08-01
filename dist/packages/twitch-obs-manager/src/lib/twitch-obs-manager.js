"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twitchObsManager = void 0;
const tslib_1 = require("tslib");
const tmi_js_1 = require("tmi.js");
const obs_websocket_js_1 = tslib_1.__importDefault(require("obs-websocket-js"));
const ObsView_1 = tslib_1.__importDefault(require("./ObsView"));
const words_regex = /!([A-Za-z]+)/gm;
async function twitchObsManager(config) {
    let userList;
    let obs;
    let obs_view;
    const chat = new tmi_js_1.client(config.tmi);
    try {
        // Initiating and connnecting OBS websocket
        userList = [];
        obs = new obs_websocket_js_1.default();
        obs.on('AuthenticationSuccess', () => console.log('obs authenticated'));
        obs.on('SwitchScenes', (data) => {
            console.log(`New Active Scene: ${data.sceneName}`);
        });
        // initialize OBS view
        obs_view = new ObsView_1.default(obs);
        // initialize twitch IRC
        // add views to OBS View
        config.views.map((e) => obs_view.addView(e.name, e.alias));
        // assign chat functions
        chat.on('chat', onChatHandler);
        chat.on('connected', onConnectedHandler);
        chat.on('disconnected', onDisconnectedHandler);
        obs
            .connect(config.obs)
            .then(() => console.log('connected'))
            .catch((e) => console.log(e));
        await chat.connect();
        console.log('created twitch connecton');
        const data = await obs.send('GetSceneList');
        console.log(data.length);
        console.log('created obs connecton');
    }
    catch (e) {
        console.log(e);
        console.log('error connecting to OBS or Twitch');
        process.exit(1);
    }
    /** functions to handle
     ***chat - passes message to bot
     * connected - prints connected
     * disconnected - prints disconnected
     * */
    function onChatHandler(channel, tags, message, self) {
        console.log(channel);
        if (self)
            return;
        if (message.startsWith('!')) {
            chatBot(channel, tags, message, self);
        }
    }
    // Called every time the bot connects to Twitch chat:
    function onConnectedHandler(addr, port) {
        console.log(`* Connected to ${addr}:${port}`);
    }
    // Called every time the bot disconnects from Twitch:
    function onDisconnectedHandler(reason) {
        console.log(`Disconnected: ${reason}`);
        process.exit(1);
    }
    /**
     *
     * functions to handle library concerns of PTZ and handling dispatching config command
     *
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    // handle PTZ command, parse arguments, call appropriate functions
    // function handlePtzCommand(cmd: string, rest: string[]) {
    //   controlledCameras[rest.at(0)].command(str);
    //   return;
    // }
    // Finally update userbase and call passed config action
    function handleFeedCommand(cmd, rest) {
        // set Window 0 to the camera labeled 'three'
        obs_view.setWindow(0, 'cam3');
        // call action set in config
        config.action();
    }
    /**
     *
     * Database of users for day. Should reset every 24 hours, otherwise stores dates with username and compares to the beginning of current day
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    // functions to record and find username, can be modified to a database if necessary
    function findUser(username) {
        let found = false;
        const length = userList.length;
        for (let i = 0; i < length; i++) {
            if (userList[i].username === username) {
                found = userList[i];
            }
        }
        return found;
    }
    function addUser(username, time) {
        if (userList) {
            userList.push({ username, date: time });
        }
    }
    function updateUser(username, date) {
        const user = findUser(username);
        if (!user) {
            return;
        }
        userList[userList.indexOf({ username, date })] = {
            username,
            date: new Date(),
        };
    }
    /**
     *
     * Chat bot functions
     *
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    // Chatbot called from onChatHandler
    async function chatBot(channel, tags, str, context) {
        try {
            // array of words from message
            const matches = str.toLowerCase().match(words_regex);
            if ((context.username && !checkTimeout(context.username)) ||
                matches === null) {
                return;
            }
            matches.forEach((match) => {
                if (context.mod) {
                    // command comes from mood
                    console.log('comes from a mod');
                    parseModCommand(match);
                }
                else if (context.subscriber) {
                    // command comes from subsriber
                    console.log('parsing subscriber command');
                    parseSubscriberCommand(str, match, matches);
                }
                else {
                    // not a subscriber
                    console.log('parsing non-subscriber command');
                    // sayForSubs(
                    //   channel,
                    //   context.username || context['display-name'] || context
                    // );
                    parseSubscriberCommand(str, match, matches);
                }
            });
        }
        catch (e) {
            console.log(e);
        }
    }
    // passes raw message, command found and rest of the seperated words
    function parseSubscriberCommand(raw, match, matches) {
        switch (match) {
            // SUBSCRIBER COMMANDS commands to control camera for subscribers
            case '!cam':
            case '!camera':
                obs_view.processChat(raw);
                return;
            case '!ptz':
                // handlePtzCommand(
                //   match,
                //   matches.splice(matches.indexOf(match), matches.length)
                // );
                console.log('NOT IMPLEMENTED');
                break;
            case '!feed':
                handleFeedCommand(match, matches.splice(matches.indexOf(match), matches.length));
                break;
        }
    }
    function parseModCommand(cmd) {
        console.log('parsing mod command');
        switch (cmd) {
            // MOD COMMANDS Mods should only be owners of farm
            case '!mute':
                obs.send('SetMute', { source: 'Audio', mute: true });
                return;
            case '!unmute':
                obs.send('SetMute', { source: 'Audio', mute: false });
                return;
            case '!stop':
                chat.say(config.twitch_channel, 'Stopping');
                obs.send('StopStreaming');
                return;
            case '!start':
                chat.say(config.twitch_channel, 'Starting');
                obs.send('StartStreaming', {});
                return;
            case '!restart':
                logRestart();
                return;
        }
    }
    // Checks if user is recorded and if their date is before or after the beginninig of today.
    function checkTimeout(username) {
        // if (context.username && obs_view.cameraTimeout(context.username)) {
        //   return;
        // }
        const user = findUser(username);
        if (user === false) {
            // user not found
            addUser(username, new Date());
            return true;
        }
        else {
            const beginningOfToday = new Date(0, 0, 0, 0);
            // last stored user time is before beginnning of today
            if (user.date.getTime() < beginningOfToday.getTime()) {
                updateUser(username, user.date);
                return true;
            }
            else {
                // user is found but their date is after the beginning of today
                return false;
            }
        }
    }
    /**
     * Logging functions
     *
     *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    // log prevent non-subscribers from PTZ and feed
    async function sayForSubs(channel, user) {
        console.log('say for subs executing...');
        chat.say(channel, `This command is reserved for Subscribers user ${user}. Apologies, but you can subscribe below!`);
    }
    // log restart proocess
    const logRestart = () => {
        chat.say(config.twitch_channel, 'Stopping');
        obs.send('StopStreaming');
        setTimeout(function () {
            chat.say(config.twitch_channel, ':Z Five');
        }, 5000);
        setTimeout(function () {
            chat.say(config.twitch_channel, ':\\ Four');
        }, 6000);
        setTimeout(function () {
            chat.say(config.twitch_channel, ';p Three');
        }, 7000);
        setTimeout(function () {
            chat.say(config.twitch_channel, ':) Two');
        }, 8000);
        setTimeout(function () {
            chat.say(config.twitch_channel, ':D One');
        }, 9000);
        setTimeout(function () {
            chat.say(config.twitch_channel, 'Starting');
            obs.send('StartStreaming', {});
        }, 10000);
    };
}
exports.twitchObsManager = twitchObsManager;
