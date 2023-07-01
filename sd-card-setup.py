#!/usr/bin/env python3
import json
from argparse import ArgumentParser
from contextlib import contextmanager
from pathlib import Path
from shlex import join as shlex_join
from subprocess import PIPE, CalledProcessError, CompletedProcess
from subprocess import run as sp_run
from sys import exit
from tempfile import NamedTemporaryFile, TemporaryDirectory
from time import sleep
from typing import Generator, Optional


def run(cmd: str) -> CompletedProcess[bytes]:
    """
    Runs a command.  Logs the command prior to running it.  Output is streamed to the console.
    """
    print(f"cmd: {cmd}")
    return sp_run(cmd, check=True, shell=True, stderr=PIPE)


def unmount(path: Path, all_targets: Optional[bool] = None):
    """
    Unmounts the given path.  Will detect 'not mounted' errors and suppress them
    """
    all_targets = all_targets if all_targets is not None else False

    command = ["sudo", "umount"]
    if all_targets:
        command.extend(["--all-targets"])
    command.append(f"{path}")
    command_str = shlex_join(command)

    try:
        run(command_str)
    except CalledProcessError as e:
        if not e.stderr:
            raise e
        stderr = e.stderr.decode("utf-8")
        if not "not mounted" in stderr.lower():
            raise e


@contextmanager
def temporary_file(**kwargs) -> Generator[Path, None, None]:
    with NamedTemporaryFile(**kwargs) as temp_file:
        yield Path(temp_file.name)


@contextmanager
def temporary_directory(**kwargs) -> Generator[Path, None, None]:
    with TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@contextmanager
def mount(device: Path) -> Generator[Path, None, None]:
    """
    Context manager that mounts the provided device to a temporary path
    """
    if not device.is_block_device():
        raise RuntimeError(f"not a block device: {device}")
    with temporary_directory() as temp_dir:
        try:
            print(f"mounting: {device} -> {temp_dir}")
            run(f"sudo mount {device} {temp_dir}")
            yield temp_dir
        finally:
            print(f"unmounting: {device} ({temp_dir})")
            unmount(temp_dir)


def confirm():
    """
    Blocks on user input for yes/no confirmation
    """
    while True:
        value = input("Confirm [yes/no]? ").lower().strip()
        if value not in ["yes", "no"]:
            print(f"Invalid response, please try again")
            continue
        if value in ["yes"]:
            break
        if value in ["no"]:
            raise RuntimeError("User aborted worklow")


def sd_card_setup(*, device: Path, hostname: str, image: Path):
    """
    Images `image` onto a device located at `device` path.

    Assumes that the image is some derivative of Ubuntu, and utilizes cloud-init to pre-configure the imaged device.

    NOTE: https://cloudinit.readthedocs.io/
    """
    hostname = hostname.strip()

    if not device.exists():
        raise FileNotFoundError(device)
    if not image.exists():
        raise FileNotFoundError(image)
    if not hostname:
        raise RuntimeError(f"hostname is empty")
    if not device.is_block_device():
        raise RuntimeError(f"not a block device: {device}")
    if not image.is_file():
        raise RuntimeError(f"not a file: {image}")

    print(f"device: {device}")
    print(f"hostname: {hostname}")
    print(f"image: {image}")
    confirm()

    print(f"writing image to disk")
    run(f"sudo dd bs=4M if={image} of={device} conv=fsync && sync")

    boot_device = Path(f"{device}1")
    root_device = Path(f"{device}2")
    devices = [boot_device, root_device]

    print(f"waiting for devices to reappear")
    missing_devices = list(devices)
    while missing_devices:
        device = missing_devices.pop()
        if not device.exists():
            missing_devices.append(device)
            continue
        print(f"{device} found")
    sleep(5)

    print(f"unmounting devices")
    for device in devices:
        unmount(device, all_targets=True)

    print(f"writing cloud data")
    cloud_data = {
        "hostname": hostname,
        "chpasswd": {"expire": False, "list": ["ubuntu:ubuntu"]},
        "packages": ["avahi-daemon"],
        "ssh_pwauth": True,
    }
    with mount(boot_device) as boot_path:
        cloud_init_file = boot_path.joinpath("user-data")
        with temporary_file() as temp_cloud_init_file:
            cloud_init_content = f"#cloud-config\n{json.dumps(cloud_data)}"
            temp_cloud_init_file.write_text(cloud_init_content)
            run(
                f"sudo cp {temp_cloud_init_file} {cloud_init_file} && sudo chmod 0755 {cloud_init_file}"
            )


def get_parser() -> ArgumentParser:
    """
    Gets a command line parser to read in required function arguments
    """
    parser = ArgumentParser()
    parser.add_argument("--hostname", type=str, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--device", type=Path, required=True)
    parser.set_defaults(func=sd_card_setup)
    return parser


if __name__ == "__main__":
    parser = get_parser()

    args = vars(parser.parse_args())
    func = args.pop("func", None)
    if not func:
        parser.print_usage()
        exit(1)

    func(**args)
