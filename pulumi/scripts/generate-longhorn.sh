#!/bin/sh -e
url="https://raw.githubusercontent.com/longhorn/longhorn/cdc6447b88fd0da1bb923c58d732d252ea4c627b/deploy/longhorn.yaml"
name="longhorn"
./scripts/generate.sh "${url}" "${name}"
