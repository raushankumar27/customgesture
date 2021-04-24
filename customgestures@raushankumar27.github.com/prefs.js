const Gtk = imports.gi.Gtk;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Extension.imports.settings;
const Config = imports.misc.config;

let horizontalfourComboBox = null;
let verticalfourComboBox = null;


let actions=["Switch Windows/tabs","Send to previous/next workspace","None"]

function init() { }

function buildPrefsWidget() {
    let config = new Settings.Prefs();

    let frame;
    frame = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        margin_top: 20,
        margin_bottom: 20,
        margin_start: 20,
        margin_end: 20,
        spacing: 20
    });


    horizontalfourComboBox = addComboBox(frame, "Horizontal 4 finger", config.HORIZONTAL_FOUR_ACTION,actions);
    verticalfourComboBox = addComboBox(frame, "Vertical 4 finger", config.VERTICAL_FOUR_ACTION,actions);

    return frame;
}

function addSlider(frame, labelText, prefConfig, lower, upper, decimalDigits) {
    let scale = new Gtk.Scale({
        digits: decimalDigits,
        adjustment: new Gtk.Adjustment({ lower: lower, upper: upper }),
        value_pos: Gtk.PositionType.RIGHT,
        hexpand: true,
        halign: Gtk.Align.END
    });
    scale.set_value(prefConfig.get());
    scale.connect('value-changed', function (sw) {
        var newval = sw.get_value();
        if (newval != prefConfig.get()) {
            prefConfig.set(newval);
        }
    });
    scale.set_size_request(400, 15);

    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 20 });

    hbox.append(new Gtk.Label({ label: labelText, use_markup: true }));
    hbox.append(scale);

    frame.append(hbox);


    return scale;
}

function addComboBox(frame, labelText, prefConfig,items) {
    let gtkComboBoxText = new Gtk.ComboBoxText({ hexpand: true, halign: Gtk.Align.END });

    let activeValue = prefConfig.get();
    let values = items;

    for (let i = 0; i < values.length; i++) {
        gtkComboBoxText.append_text(values[i]);
    }

    gtkComboBoxText.set_active(activeValue);
    gtkComboBoxText.connect('changed', function (sw) {
    prefConfig.set(sw.get_active());
    });

    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 20 });
    hbox.append(new Gtk.Label({ label: labelText, use_markup: true }));
    hbox.append(gtkComboBoxText);

    frame.append(hbox);


    return gtkComboBoxText;
}

function addBooleanSwitch(frame, labelText, prefConfig) {
    let gtkSwitch = new Gtk.Switch({ hexpand: true, halign: Gtk.Align.END });
    gtkSwitch.set_active(prefConfig.get());
    gtkSwitch.connect('state-set', function (sw) {
        var newval = sw.get_active();
        if (newval != prefConfig.get()) {
            prefConfig.set(newval);
        }
    });

    let hbox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 20 });
    hbox.append(new Gtk.Label({ label: labelText, use_markup: true }));
    hbox.append(gtkSwitch);

    frame.append(hbox);


    return gtkSwitch;
}