#!/bin/bash
set -e

usage() {
    echo "$0 [-d <device_path>] [-i <image_path>] [-h <hostname>]"
}

# parse arguments
unset option device image hostname
while getopts "d:i:h:" option; do
    case $option in
        d)
            device="$OPTARG"
            ;;
        i)
            image="$OPTARG"
            ;;
        h)
            hostname="$OPTARG"
            ;;
        *)
            2>&1 echo "error: unknown argument"
            usage
            exit 1
            ;;
    esac
done

# validate arguments
if [ "$device" = "" ] || [ ! -e "$device" ]; then
    2>&1 echo "error: -d argument must point to valid device path"
    usage
    exit 1
fi
if [ "$image" = "" ] || [ ! -f "$image" ]; then
    2>&1 echo "error: -i argument must point to valid image path"
    usage
    exit 1
fi
if [ "$hostname" = "" ]; then
    2>&1 echo "error: -h argument must be a valid string"
    usage
    exit 1
fi

# re-run with sudo as needed.
if [ ! "$(id -u)" = "0" ]; then
    echo "re-running as root"
    echo ""
    exec sudo /bin/bash "$0" "$@"
    exit $?
fi

# confirm options
echo "device: $device"
echo "image: $image"
echo "hostname: $hostname"
echo ""
read -r -p "confirm (y/n): " response
if [ ! "$response" = "y" ]; then
    2>&1 echo "error: user aborted workflow"
    exit 1
fi

unmount_all() {
    _device="$1"

    echo "unmounting all disks"
    if [ ! -f "/proc/mounts" ]; then
        2>&1 echo "error: not found: /proc/mounts"
    fi
    for _sub_device in "$_device"?*; do
        set +e
        cat /proc/mounts | grep -q "$_sub_device"
        MOUNTED="$?"
        set -e
        if [ "$MOUNTED" = "0" ]; then
            echo "unmounting: $_sub_device"
            umount -l "$_sub_device"
        fi
    done
}

# handle cleanup of temporary paths
cleanup() {
    echo "cleaning up"

    # unmount  disks (in case a temporary path is a mount point)
    unmount_all "$device"

    # clean up all temporary paths
    for dir in "$temp_mount_path"; do
        if [ ! "$dir" = "" ] && [ -e "$dir" ]; then
            echo "deleting: $dir"
            rm -rf "$dir"
        fi
    done
}
unset temp_mount_path
trap cleanup EXIT 

# set script directory
script_directory="$(dirname "${BASH_SOURCE[0]}")"

# unmount all disks prior to imaging
unmount_all "$device"

# write the image to the device
echo "imaging $device with $image"
dd if="$image" of="$device" bs=4M conv=fsync
sync

# wait for devices to re-appear
time_out=60
time_waiting=0
boot_device="${device}1"
root_device="${device}2"
while [ ! -b "$boot_device" ] || [ ! -b "$root_device" ]; do
    if [ "$time_waiting" -gt "$time_out" ]; then
        2>&1 echo "error: timed out while waiting for $boot_device and $root_device"
        exit 1
    fi
    sleep 1
    time_waiting="$((time_waiting + 1))"
done
for _device in "$boot_device" "$root_device"; do
    if [ ! -b "$_device" ]; then
        2>&1 echo "error: device not found: $_device"
        exit 1
    fi
done

# sleep (to ensure that devices have time to fully mount)
sleep 5

# create a temporary mount path
temp_mount_path="$(mktemp -d)"

# modify the boot device
# mount the boot device
echo "mounting disk: $boot_device -> $temp_mount_path"
mount "$boot_device" "$temp_mount_path"

# install cloud-init user-data
src="$script_directory/user-data.yaml"
dst="$temp_mount_path/user-data"
echo "installing: $src -> $dst"
sudo cp "$src" "$dst"
sed -i "s/{{hostname}}/$hostname/g" "$dst"

# unmount the boot device
echo "unmounting: $temp_mount_path"
umount -l "$temp_mount_path"
