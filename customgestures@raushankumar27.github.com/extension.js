const Clutter = imports.gi.Clutter;
const Config = imports.misc.config;
const Lang = imports.lang;
const Main = imports.ui.main;
const Overview = imports.ui.overview;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const Utils = imports.misc.extensionUtils;

const Gettext = imports.gettext.domain('customgestures');
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Extension.imports.settings;

// Our custom gesture handler instance
let gestureHandler = null;

// Our settings
let schema = null;
let lastTime = null;
let previousWindowIndex = null;
let currentTime = null;

let focusWindow = global.display.focus_window;
let nextWindow;
let windows;
let config;

function init() {
    schema= Settings.get_local_gsettings(Settings.SCHEMA_PATH);
    config = new Settings.Prefs();
}

const TouchpadGestureAction = new Lang.Class({
    Name: 'TouchpadGestureAction',

    _init: function(actor) {
        this._dx = 0;
        this._dy = 0;

        this._updateSettings();

        this._gestureCallbackID = actor.connect('captured-event::touchpad', Lang.bind(this, this._handleEvent));
        this._actionCallbackID = this.connect('activated', Lang.bind (this, this._doAction));
        this._updateSettingsCallbackID = schema.connect('changed', Lang.bind(this, this._updateSettings));
        let seat = Clutter.get_default_backend().get_default_seat();
        this._virtualDevice = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
    },

    _checkActivated: function(fingerCount) {
        const DIRECTION_LOOKUP = {
            0: Meta.MotionDirection.RIGHT,
            1: Meta.MotionDirection.UP,
            2: Meta.MotionDirection.LEFT,
            3: Meta.MotionDirection.DOWN
        };

        let magnitude = Math.sqrt(Math.pow(this._dy, 2) + Math.pow(this._dx, 2));

        let allowedModes = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW;

        if ((allowedModes & Main.actionMode) == 0)
            return;

        let rounded_direction = Math.round(Math.atan2(this._dy, this._dx) / Math.PI * 2);
        if (rounded_direction == -1) {
            rounded_direction = 3;
        } else if (rounded_direction == -2) {
            rounded_direction = 2;
        }
        let dir = DIRECTION_LOOKUP[rounded_direction]

        if (!this._checkSwipeValid(dir, fingerCount, magnitude))
            return;

        this.emit('activated', dir, fingerCount);
    },

    _handleEvent: function(actor, event) {
        
        if (event.type() != Clutter.EventType.TOUCHPAD_SWIPE)
            return Clutter.EVENT_PROPAGATE;
        
        if (event.get_touchpad_gesture_finger_count() != 4)
            return Clutter.EVENT_PROPAGATE;

        if (event.get_gesture_phase() == Clutter.TouchpadGesturePhase.UPDATE) {
            let [dx, dy] = event.get_gesture_motion_delta();

            this._dx += dx;
            this._dy += dy;
        } else {
            if (event.get_gesture_phase() == Clutter.TouchpadGesturePhase.END)
                this._checkActivated(event.get_touchpad_gesture_finger_count());

            this._dx = 0;
            this._dy = 0;
        }

        return Clutter.EVENT_STOP;
    },

    _doAction: function (sender, dir, fingerCount) {
        let action = null;
        if (fingerCount == 4) {
            switch (dir) {
                case Meta.MotionDirection.LEFT:
                    action = this._horizontalFourAction;
                    break;
                case Meta.MotionDirection.RIGHT:
                    action = this._horizontalFourAction;
                    break;
                case Meta.MotionDirection.UP:
                    action = this._verticalFourAction;
                    break;
                case Meta.MotionDirection.DOWN:
                    action = this._verticalFourAction;
                    break;
                default:
                    break;
            }
        }
        if (action == null) {
            return;
        }
        switch (action) {
            case 0:
                if(dir == Meta.MotionDirection.LEFT || dir == Meta.MotionDirection.UP ){
                    activateNextWindowIndex(1,true);
                }
                if(dir == Meta.MotionDirection.RIGHT || dir == Meta.MotionDirection.DOWN ){
                    activateNextWindowIndex(-1,true);
                }
                break;
            case 1:
                //send to another workspace
                if(dir == Meta.MotionDirection.LEFT || dir == Meta.MotionDirection.UP){
                    changeWorkspace(Meta.MotionDirection.LEFT)
                }
                if(dir == Meta.MotionDirection.RIGHT || dir == Meta.MotionDirection.DOWN){
                    changeWorkspace(Meta.MotionDirection.RIGHT)
                }
                break;                                                                                                   
            default:
                break;
        }
    },

    _checkSwipeValid: function (dir, fingerCount, motion) {
        const MOTION_THRESHOLD = 50;

        if (fingerCount == 4) {
            switch (dir) {
                case Meta.MotionDirection.LEFT:
                    return  (motion > (50 - this._horizontalSensitivityAdjustment));
                case Meta.MotionDirection.RIGHT:
                    return  (motion > (50 - this._horizontalSensitivityAdjustment));
                case Meta.MotionDirection.UP:
                    return  (motion > (50 - this._verticalSensitivityAdjustment));
                case Meta.MotionDirection.DOWN:
                    return (motion > (50 - this._verticalSensitivityAdjustment));
                default:
                    break;
            }
        }

        return false;
    },

    _updateSettings: function () {
        this._horizontalFourAction=config.HORIZONTAL_FOUR_ACTION.get();
        this._verticalFourAction=config.VERTICAL_FOUR_ACTION.get();
        this._verticalSensitivityAdjustment = 0;
        this._horizontalSensitivityAdjustment = 0;
    },

    _cleanup: function() {
        global.stage.disconnect(this._gestureCallbackID);
        this.disconnect(this._actionCallbackID);
        // schema.disconnect(this._updateSettingsCallbackID);
    },

    _sendKeyEvent: function (...keys) {
        let currentTime = Clutter.get_current_event_time();
        keys.forEach(key => this._virtualDevice.notify_keyval(currentTime, key, Clutter.KeyState.PRESSED));
        keys.forEach(key => this._virtualDevice.notify_keyval(currentTime, key, Clutter.KeyState.RELEASED));
    },
});

function enable() {
    Signals.addSignalMethods(TouchpadGestureAction.prototype);
    gestureHandler = new TouchpadGestureAction(global.stage);
}

function disable() {
    gestureHandler._cleanup();
    Main.wm._workspaceTracker._workspaces.forEach( ws => {
        delete ws.stashedWindows;
    });
}

function activateNextWindowIndex(change,switchTabs){
    //get windows list
    windows = global.get_window_actors().filter(actor => {
        let win = actor.metaWindow;
        let workspaceManager = global.workspace_manager;
        let activeWorkspace = workspaceManager.get_active_workspace();
        return !win.is_override_redirect() &&
                win.located_on_workspace(activeWorkspace); 
    }).sort((w1, w2) => {
        return w1.metaWindow.get_stable_sequence() -
                w2.metaWindow.get_stable_sequence();
    });
    if (windows.length == 0)
        return;
    if(windows.length ==1 && switchTabs){
        nextTab(change);
        return;
    }
    focusWindow = global.display.focus_window;

    if (focusWindow == null) {
        nextWindow = windows[0].metaWindow;
    } else {
        for (let i = 0; i < windows.length; i++){
            if(focusWindow == windows[i].metaWindow){
                if(focusWindow.get_transient_for() != null && change<0) change = change-1;
                let index = i + change;
                if(index >= windows.length){ 
                    index = 0;
                }else if(index < 0){
                    index=windows.length -1 ;
                }
                nextWindow = windows[index].metaWindow;
                break;
            }
        }
    }
    Main.activateWindow(nextWindow);
    return;
}

function nextTab(change){
    if(change<0)
        gestureHandler._sendKeyEvent(Clutter.KEY_Control_L, Clutter.KEY_Page_Up);
    else
        gestureHandler._sendKeyEvent(Clutter.KEY_Control_L, Clutter.KEY_Page_Down);
}

function changeWorkspace(dir2){
    if((Shell.ActionMode.NORMAL & Main.actionMode)==0){
        return;
    }
    focusWindow = global.display.focus_window;
    let workspace = focusWindow.get_workspace();
    focusWindow.change_workspace(workspace.get_neighbor(dir2));
} 