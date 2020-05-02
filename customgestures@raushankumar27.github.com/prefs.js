const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('customgestures');
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

let schema = null;
const actions = [
    'Toggle Overview/App drawer/desktop',
    'Reverse of Toggle Overview/App drawer/desktop',
    'Switch Application',
    'Reverse Switch Application'
    ];

function init() {
    schema = Convenience.getSettings();
}

const customGesturesSettingsWidget = new GObject.Class({
    Name: 'customGestures.prefs.customGesturesSettingsWidget',
    GTypeName: 'customGesturesSettingsWidget',
    Extends: Gtk.VBox,

    _init: function (params) {
        this.parent (params);

        this._buildUI();
        this._initUI();
    },

    _buildUI: function() {
        // The swipe options grid setup
        this._swipeOptionsFrame = new Gtk.Frame();
        this._swipeOptionsFrame.set_label("    Swipe Options");
        this._swipeOptionsGrid = new Gtk.Grid({
            column_homogeneous: false,
            column_spacing: 20,
            row_homogeneous: true,
            row_spacing: 5,
            margin: 20
        });
        this._swipeOptionsFrame.add(this._swipeOptionsGrid);
        
        // The swipe options
        // Three finger horizontal
        this._leftThreeLabel = new Gtk.Label({label: "3 Finger Horizontal Gestures"});
        this._leftThreeSwitch = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        this._leftThreeCombo = new Gtk.ComboBoxText();
        this._swipeOptionsGrid.attach(this._leftThreeLabel, 0, 0, 1, 1);
        this._swipeOptionsGrid.attach(this._leftThreeSwitch, 1, 0, 1, 1);
        this._swipeOptionsGrid.attach(this._leftThreeCombo, 2, 0, 1, 1);

        // Three finger vertical
        this._upThreeLabel = new Gtk.Label({label: "3 Finger Vertical Gestures"});
        this._upThreeSwitch = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        this._upThreeCombo = new Gtk.ComboBoxText();
        this._swipeOptionsGrid.attach(this._upThreeLabel, 0, 1, 1, 1);
        this._swipeOptionsGrid.attach(this._upThreeSwitch, 1, 1, 1, 1);
        this._swipeOptionsGrid.attach(this._upThreeCombo, 2, 1, 1, 1);
        
        
        // The sensitivity options
        this._sensitivityOptionsFrame = new Gtk.Frame();
        this._sensitivityOptionsFrame.set_label("    Sensitivity Options");
        this._sensitivityOptionsGrid = new Gtk.Grid({
            column_homogeneous: false,
            column_spacing: 20,
            row_homogeneous: true,
            row_spacing: 5,
            margin:20
        });
        this._sensitivityOptionsFrame.add(this._sensitivityOptionsGrid);

        // Vertical sensitivity
        this._verticalSensitivityLabel = new Gtk.Label({label: "Vertical Sensitivity Adjustment"});
        this._verticalSensitivitySpinButton = Gtk.SpinButton.new_with_range(-50, 50, 1);
        this._sensitivityOptionsGrid.attach(this._verticalSensitivityLabel, 0, 0, 1, 1);
        this._sensitivityOptionsGrid.attach(this._verticalSensitivitySpinButton, 1, 0, 1, 1);

        // Horizontal sensitivity
        this._horizontalSensitivityLabel = new Gtk.Label({label: "Horizontal Sensitivity Adjustment"});
        this._horizontalSensitivitySpinButton = Gtk.SpinButton.new_with_range(-50, 50, 1);
        this._sensitivityOptionsGrid.attach(this._horizontalSensitivityLabel, 0, 1, 1, 1);
        this._sensitivityOptionsGrid.attach(this._horizontalSensitivitySpinButton, 1, 1, 1, 1);

        // Add everything to the main view
        this.add(this._swipeOptionsFrame);
        this.add(this._sensitivityOptionsFrame);
    },

    _initUI: function() {
        

        // Bind the three swipe toggles to their setting values
        schema.bind('left-three-swipes', this._leftThreeSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        schema.bind('up-three-swipes', this._upThreeSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        
        // Action set up
        this._leftThreeCombo.connect('changed', Lang.bind(this, this._leftThreeComboChanged));
        this._upThreeCombo.connect('changed', Lang.bind(this, this._upThreeComboChanged));
        for (let i = 0; i < actions.length; i++) {
            this._leftThreeCombo.append_text(actions[i]);
            this._upThreeCombo.append_text(actions[i]);
        }
        this._leftThreeCombo.set_active(schema.get_enum('left-three-action'));
        this._upThreeCombo.set_active(schema.get_enum('up-three-action'));
        
        // Sensitivity options setup
        schema.bind('vertical-sensitivity-adjustment', this._verticalSensitivitySpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);
        schema.bind('horizontal-sensitivity-adjustment', this._horizontalSensitivitySpinButton, 'value', Gio.SettingsBindFlags.DEFAULT);
    },

    _leftThreeComboChanged: function () {
        schema.set_enum('left-three-action',this._leftThreeCombo.get_active());
        schema.set_enum('right-three-action',this._leftThreeCombo.get_active()+actions.length);
    },  

    _upThreeComboChanged: function () {
        schema.set_enum('up-three-action',this._upThreeCombo.get_active());
        schema.set_enum('down-three-action',this._upThreeCombo.get_active()+actions.length);
    },
});

function buildPrefsWidget () {
    let settingsWidget = new customGesturesSettingsWidget ();
    settingsWidget.show_all ();
    return settingsWidget;
}
