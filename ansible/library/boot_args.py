#!/usr/bin/python
from __future__ import (absolute_import, division, print_function)
import os
from ansible.module_utils.basic import AnsibleModule

__metaclass__ = type

DOCUMENTATION = r'''
'''

RETURN = r'''
'''



def run_module():
    # define params
    module_args = dict(
        name=dict(type='str', required=True),
        value=dict(type='list', required=False),
        state=dict(type='str', required=False, default="present"),
        path=dict(type='str', required=True)
    )

    # create result object
    result = dict(
        changed=False,
        old="",
        new=""
    )

    # create module
    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )
    
    # obtain data from args
    param_path = module.params["path"]
    param_name = module.params["name"]
    param_value = module.params["value"]
    param_state = module.params["state"]

    # obtain boot arg string
    boot_arg_str = ""
    if os.path.exists(param_path):
        with open(param_path, "r") as f:
            boot_arg_str = f.read()
    
    # process boot arg text
    # store a mapping of key, list[value] pairs
    # and the order keys were encountered
    # to reassemble boot args in correct order
    boot_arg_data = {}
    boot_arg_key_order = []
    for curr_arg in boot_arg_str.split():
        parts  = curr_arg.split("=")

        curr_arg, curr_value = parts[0], None
        if len(parts) > 1:
            # parse value if string contains '='
            curr_value = "=".join(parts[1:])
        
        boot_arg_key_order.append(curr_arg)
        boot_arg_data.setdefault(curr_arg, []).append(curr_value)

    # make specified changes
    if param_state == "present":
        # if more values being added than parsed
        # add the difference as keys to the end
        # of the key list
        boot_arg_data.setdefault(param_name, [])
        size_difference = len(param_value) - len(boot_arg_data[param_name])
        while size_difference > 0:
            boot_arg_key_order.append(param_name)
            size_difference -= 1
        boot_arg_data[param_name] = param_value
    elif param_state == "absent":
        boot_arg_data.pop(param_name)
    else:
        module.fail_json(msg='Unrecognized state: ' + param_state, **result)

    # save original boot arg string
    result["old"] = boot_arg_str

    # reassemble boot arg string
    boot_arg_str = []
    for curr_key in boot_arg_key_order:
        # iterate over keys in parse order
        curr_values = boot_arg_data[curr_key]
        if not curr_values:
            # if no values left, skip
            continue
        curr_value = curr_values.pop(0)
        if curr_value is None:
            # has no value - append key
            boot_arg_str.append(curr_key)
        else:
            # has value - append key=value
            boot_arg_str.append("{}={}".format(curr_key, curr_value))
    
    boot_arg_str = " ".join(boot_arg_str) + "\n"

    # store new and changed states
    result["new"] = boot_arg_str
    result["changed"] = (result["new"] != result["old"])

    # if checking, don't write boot args - exit
    if module.check_mode:
        module.exit_json(**result)
    
    # write boot arguments
    with open(param_path, "w") as f:
        f.write(boot_arg_str)
    
    # exit
    module.exit_json(**result)


def main():
    run_module()


if __name__ == '__main__':
    main()
