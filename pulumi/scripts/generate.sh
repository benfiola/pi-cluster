#!/bin/sh -e
url="$1"
name="$2"

if [ "${url}" = "" ] || [ "${name}" = "" ]; then
    1>82 echo "$0 <url> <name>"
    exit 1
fi

if [ ! -d "./common" ]; then
    1>&2 echo "must be run from <project>/pulumi  folder"
    exit 1
fi

if ! command -v crd2pulumi > /dev/null; then
    1>&2 echo "crd2pulumi must be installed"
    exit 1
fi

yaml_path="./common/${name}.yaml"
pkg_path="./common/${name}"

echo "downloading manifest (${url})"
curl -fsSL -o "${yaml_path}" "${url}"

echo "deleting package path (${pkg_path})"
rm -rf "${pkg_path}"

echo "generating package (${yaml_path}, ${pkg_path})"
crd2pulumi "${yaml_path}" --nodejsPath "${pkg_path}" > /dev/null
