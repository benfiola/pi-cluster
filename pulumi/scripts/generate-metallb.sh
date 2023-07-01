#!/bin/sh -e
url="https://raw.githubusercontent.com/metallb/metallb/v0.13.10/config/manifests/metallb-native.yaml"
name="metallb"
./scripts/generate.sh "${url}" "${name}"
