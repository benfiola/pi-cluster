#!/usr/bin/python
from __future__ import (absolute_import, division, print_function)
import os
from ansible.module_utils.basic import AnsibleModule
import json
import yaml

__metaclass__ = type

DOCUMENTATION = r'''
'''

RETURN = r'''
'''


def run_module():
    # define params
    module_args = dict(
        user=dict(type='str', required=True),
        hostname=dict(type='str', required=True),
        cluster=dict(type='str', required=False),
        context=dict(type='str', required=False),
        kubeconfig_path=dict(type='str', required=False)
    )

    # create result object
    result = dict(
        changed=False,
        result=""
    )

    # create module
    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )
    
    # obtain data from args
    param_user = module.params['user']
    param_hostname = module.params['hostname']
    param_cluster = module.params['cluster'] or param_hostname
    param_context = module.params.get("context") or "{}-{}".format(param_cluster, param_user)
    param_kubeconfig_path = module.params.get("kubeconfig_path") or "/etc/rancher/k3s/k3s.yaml"

    # read kubeconfig
    with open(param_kubeconfig_path, "r") as f:
        data = yaml.load(f, Loader=yaml.Loader)
    
    # use json.dumps to get new serialized data (for 'changed' calculation)
    old = json.dumps(data, sort_keys=True)

    # change default cluster name
    for item in data.get("clusters", []):
        if not "cluster" in item:
            # ignore non-clusters
            continue
        
        name = item.get("name", None)
        if name != "default":
            # ignore non-default
            continue
        cluster = item["cluster"]

        # replace server hostname
        cluster["server"] = cluster["server"].replace("127.0.0.1", param_hostname)

        item["name"] = param_cluster
    
    # change default user name
    for item in data.get("users"):
        if not "user" in item:
            # ignore non-users
            continue
        
        name = item.get("name", None)
        if name != "default":
            # ignore non-default
            continue
        
        item["name"] = param_user

    # change context references to default user/cluster
    # change default context name
    for item in data.get("contexts", []):
        if not "context" in item:
            # ignore non-contexts
            continue
        
        context = item["context"]

        if context.get("user") == "default":
            # if context contains default, use new user
            context["user"] = param_user

        if context.get("cluster") == "default":
            # if context contains default, use new cluster
            context["cluster"] = param_cluster
        
        name = item.get("name", None)
        if name != "default":
            # ignore non-default
            continue
        
        item["name"] = param_context
    
    # change current-context if using default
    if data.get("current-context") == "default":
        data["current-context"] = param_context
    
    # use json.dumps to get new serialized data (for 'changed' calculation)
    new = json.dumps(data, sort_keys=True)

    # set results
    result["result"] = data
    result["changed"] = (old != new)

    # exit
    module.exit_json(**result)


def main():
    run_module()


if __name__ == '__main__':
    main()
