cd customgestures@raushankumar27.github.com
glib-compile-schemas schemas
cd ..
if [ ! -d ~/.local/share/gnome-shell/extensions ]; then
    mkdir ~/.local/share/gnome-shell/extensions
fi
rm -r ~/.local/share/gnome-shell/extensions/customgestures@raushankumar27.github.com
cp -r customgestures@raushankumar27.github.com ~/.local/share/gnome-shell/extensions
