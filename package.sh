#!/bin/sh

if [ -f ./customgestures@raushankumar27.github.com.zip ]; then
    rm -rf ./customgestures@raushankumar27.github.com.zip
fi

cd customgestures@raushankumar27.github.com/
zip -r ../customgestures@raushankumar27.github.com.zip *
