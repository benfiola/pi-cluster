// *** WARNING: this file was generated by crd2pulumi. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as utilities from "../../utilities";

// Export members:
export { AddressPoolArgs } from "./addressPool";
export type AddressPool = import("./addressPool").AddressPool;
export const AddressPool: typeof import("./addressPool").AddressPool = null as any;
utilities.lazyLoad(exports, ["AddressPool"], () => require("./addressPool"));


const _module = {
    version: utilities.getVersion(),
    construct: (name: string, type: string, urn: string): pulumi.Resource => {
        switch (type) {
            case "kubernetes:metallb.io/v1alpha1:AddressPool":
                return new AddressPool(name, <any>undefined, { urn })
            default:
                throw new Error(`unknown resource type ${type}`);
        }
    },
};
pulumi.runtime.registerResourceModule("crds", "metallb.io/v1alpha1", _module)
