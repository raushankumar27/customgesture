const Clutter = imports.gi.Clutter;
const Config = imports.misc.config;
const Lang = imports.lang;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Signals = imports.signals;
const Utils = imports.misc.extensionUtils;

const Gettext = imports.gettext.domain('customgestures');
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

// Our custom gesture handler instance
let gestureHandler = null;

// Our settings
let schema = null;
let lastTime = null;
let previousWindowIndex = null;
let currentTime = null;

// Compatability settings
let versionSmaller330 = Utils.versionCheck(["3.26", "3.28"], Config.PACKAGE_VERSION);

let focusWindow = global.display.focus_window;
let nextWindow;
let windows;

function init() {
    schema = Convenience.getSettings();
}

const TouchpadGestureAction = new Lang.Class({
    Name: 'TouchpadGestureAction',

    _init: function(actor) {
        this._dx = 0;
        this._dy = 0;

        this._updateSettings();

        this._gestureCallbackID = actor.connect('captured-event', Lang.bind(this, this._handleEvent));
        this._actionCallbackID = this.connect('activated', Lang.bind (this, this._doAction));
        this._updateSettingsCallbackID = schema.connect('changed', Lang.bind(this, this._updateSettings));
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

        if (event.get_touchpad_gesture_finger_count() != 3)
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

        if (fingerCount == 3) {
            switch (dir) {
                case Meta.MotionDirection.LEFT:
                    action = this._leftThreeAction;
                    break;
                case Meta.MotionDirection.RIGHT:
                    action = this._rightThreeAction;
                    break;
                case Meta.MotionDirection.UP:
                    action = this._upThreeAction;
                    break;
                case Meta.MotionDirection.DOWN:
                    action = this._downThreeAction;
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
                //overview->apps->desktop
                showOverview();
                break;
            case 1:
                //apps->overview->desktop
                showOverviewReverse();
                break;
            case 2:
                activateNextWindowIndex(1);
                break;
            case 3:
                activateNextWindowIndex(-1);
                break;
            case 4:
                showOverviewReverse();
                break;
            case 5:
                showOverview();
                break;
            case 6:
                activateNextWindowIndex(-1);
                break;
            case 7:
                activateNextWindowIndex(1);
                break;
            default:
                break;
        }
    },

    _checkSwipeValid: function (dir, fingerCount, motion) {
        const MOTION_THRESHOLD = 50;

        if (fingerCount == 3) {
            switch (dir) {
                case Meta.MotionDirection.LEFT:
                    return this._leftThreeEnabled && (motion > (50 - this._horizontalSensitivityAdjustment));
                case Meta.MotionDirection.RIGHT:
                    return this._leftThreeEnabled && (motion > (50 - this._horizontalSensitivityAdjustment));
                case Meta.MotionDirection.UP:
                    return this._upThreeEnabled && (motion > (50 - this._verticalSensitivityAdjustment));
                case Meta.MotionDirection.DOWN:
                    return this._upThreeEnabled && (motion > (50 - this._verticalSensitivityAdjustment));
                default:
                    break;
            }
        }

        return false;
    },

    _updateSettings: function () {
        this._leftThreeEnabled = schema.get_boolean('left-three-swipes');
        this._leftThreeAction = schema.get_enum('left-three-action');
        this._rightThreeEnabled = schema.get_boolean('left-three-swipes');
        this._rightThreeAction = schema.get_enum('right-three-action');
        this._upThreeEnabled = schema.get_boolean('up-three-swipes');
        this._upThreeAction = schema.get_enum('up-three-action');
        this._downThreeEnabled = schema.get_boolean('up-three-swipes');
        this._downThreeAction = schema.get_enum('down-three-action');
        this._verticalSensitivityAdjustment = schema.get_int('vertical-sensitivity-adjustment');
        this._horizontalSensitivityAdjustment = schema.get_int('horizontal-sensitivity-adjustment');
    },

    _cleanup: function() {
        global.stage.disconnect(this._gestureCallbackID);
        this.disconnect(this._actionCallbackID);
        schema.disconnect(this._updateSettingsCallbackID);
    }
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

function activateNextWindowIndex(change){
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
                Main.activateWindow(nextWindow);
                return;
            }
        }
    }
}

function showOverview(){
    //if apps pagr is open close overview
    if(Main.overview.viewSelector._showAppsButton.checked){
        Main.overview.hide();
    }
    //if overview is open show apps page
    else if (Main.overview._shown){
        Main.overview.viewSelector.showApps();
    }
    //open overview
    else{
        Main.overview.show();
    }
}
function showOverviewReverse(){
    //if on apps page switch to overview
    if(Main.overview.viewSelector._showAppsButton.checked){
        Main.overview.viewSelector._toggleAppsPage();
    }
    //if on overview close it
    else if(Main.overview._shown){
        Main.overview.toggle();
    }
    //if on desktop swich to app page
    else {
        Main.overview.viewSelector.showApps();
    }
}