# pi-cluster

General repository for maintaining and configuring my Raspberry Pi kubernetes cluster.

This has primarily been used and tested against Raspberry PI machines imaged with a
 Raspbian Lite OS image.

## Dependencies

* `ansible`

## SD card setup

To prepare an SD card to be used in the cluster, run the [sd_card_setup](./sd_card_setup.sh) script:

```
./sd_card_setup.sh -d /dev/<path> -i <image file>.img -h <hostname>
```

This will write `image file` to device path `/dev/<path>` and after the write is complete, will configure the device to have the provided `hostname`.

## Create a system account

Because Raspbian ships with a default `pi` system account with a publicly known password,
 you can create a new system account by running the [create_system_account](./create_system_account.yaml) playbook:

```
ansible-playbook create_system_account.yaml
```

You will be prompted for a username and password for the new system user.

## Delete default `pi` user

Once you've created a new system account, the default `pi` user should be deleted.  This can be done by running the [delete_pi_account](./delete_pi_account.yaml) playbook:

```
ansible-playbook -u <user> delete_pi_account.yaml
```

`user` is the system account created via the [create_system_account.yaml](./create_system_account.yaml) playbook.

## Install community ansible modules

These ansible playbooks have dependencies on a few community ansible modules.  To install
 these, run:

```
ansible-galaxy collection install -r requirements.yaml
```


## Create the cluster

To create the cluster, run the [create_cluster](./create_cluster.yaml) playbook:

```
ansible-playbook -u <user> create_cluster.yaml
```

`user` is the system account created via the [create_system_account.yaml](./create_system_account.yaml) playbook.

This playbook has dependencies on community modules referenced in the `Install community ansible modules` section.

## Delete the cluster

To delete the cluster, run the [delete_cluster](./delete_cluster.yaml) playbook:

```
ansible-playbook -u <user> delete_cluster.yaml
```

`user` is the system account created via the [create_system_account.yaml](./create_system_account.yaml) playbook.

This playbook has dependencies on community modules referenced in the `Install community ansible modules` section.
