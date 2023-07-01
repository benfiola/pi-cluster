#!/bin/sh -e
url="https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml"
name="certManager"
./scripts/generate.sh "${url}" "${name}"
