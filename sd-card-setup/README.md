# SD card setup

General utilities designed to aid in provisioning SD cards for use within an RPi cluster.

## Dependencies
* Linux host (helper scripts rely upon Linux - and Ubuntu - standards)
* [Ubuntu 20.04.3 LTS ARM64 Server Image](https://cdimage.ubuntu.com/releases/20.04/release/ubuntu-20.04.3-preinstalled-server-arm64+raspi.img.xz)

[Parent](..)

## Usage

This project utilizes a base Ubuntu 20.04.3 server image, and customizes it
 via `cloud-init`.  This is all done within a [shell script](./run.sh).

```
./sd_card_setup.sh -d /dev/<path> -i <image file>.img -h <hostname>
```

Once complete, insert the SD card into the RPi and start it.
