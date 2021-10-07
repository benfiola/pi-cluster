# pi-cluster

## Dependencies

* `ansible`
* 

## SD card setup

To prepare an SD card to be used in the cluster, run the [sd_card_setup](./sd_card_setup.sh) script:

```
./sd_card_setup.sh -d /dev/<path> -i <image file>.img -h <hostname>
```

This will write `image file` to device path `/dev/<path>` and after the write is complete, will configure the device to have the provided `hostname`.
