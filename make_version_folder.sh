#!/usr/bin/env bash

# get version from package.json
version=$(grep -o '"version": "[^"]*' package.json | grep -o '[^"]*$')

src=dist/latest
dest=dist/$version

if [[ -d $dest ]]; then
    echo -n "Warning: About to overwrite version folder: $dest (y/n)? "
    read -d'' -s -n1 key
    [[ $key != "y" ]] && echo '' && echo 'Aborted' && exit 1
fi

echo
rm -rf $dest
cp -R $src $dest
echo "Copied $src -> $dest"