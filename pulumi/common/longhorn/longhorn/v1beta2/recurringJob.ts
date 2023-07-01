// *** WARNING: this file was generated by crd2pulumi. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "../../types/input";
import * as outputs from "../../types/output";
import * as utilities from "../../utilities";

import {ObjectMeta} from "../../meta/v1";

/**
 * RecurringJob is where Longhorn stores recurring job object.
 */
export class RecurringJob extends pulumi.CustomResource {
    /**
     * Get an existing RecurringJob resource's state with the given name, ID, and optional extra
     * properties used to qualify the lookup.
     *
     * @param name The _unique_ name of the resulting resource.
     * @param id The _unique_ provider ID of the resource to lookup.
     * @param opts Optional settings to control the behavior of the CustomResource.
     */
    public static get(name: string, id: pulumi.Input<pulumi.ID>, opts?: pulumi.CustomResourceOptions): RecurringJob {
        return new RecurringJob(name, undefined as any, { ...opts, id: id });
    }

    /** @internal */
    public static readonly __pulumiType = 'kubernetes:longhorn.io/v1beta2:RecurringJob';

    /**
     * Returns true if the given object is an instance of RecurringJob.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is RecurringJob {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === RecurringJob.__pulumiType;
    }

    public readonly apiVersion!: pulumi.Output<"longhorn.io/v1beta2" | undefined>;
    public readonly kind!: pulumi.Output<"RecurringJob" | undefined>;
    public readonly metadata!: pulumi.Output<ObjectMeta | undefined>;
    /**
     * RecurringJobSpec defines the desired state of the Longhorn recurring job
     */
    public readonly spec!: pulumi.Output<outputs.longhorn.v1beta2.RecurringJobSpec | undefined>;
    /**
     * RecurringJobStatus defines the observed state of the Longhorn recurring job
     */
    public readonly status!: pulumi.Output<outputs.longhorn.v1beta2.RecurringJobStatus | undefined>;

    /**
     * Create a RecurringJob resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: RecurringJobArgs, opts?: pulumi.CustomResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["apiVersion"] = "longhorn.io/v1beta2";
            resourceInputs["kind"] = "RecurringJob";
            resourceInputs["metadata"] = args ? args.metadata : undefined;
            resourceInputs["spec"] = args ? args.spec : undefined;
            resourceInputs["status"] = args ? args.status : undefined;
        } else {
            resourceInputs["apiVersion"] = undefined /*out*/;
            resourceInputs["kind"] = undefined /*out*/;
            resourceInputs["metadata"] = undefined /*out*/;
            resourceInputs["spec"] = undefined /*out*/;
            resourceInputs["status"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(RecurringJob.__pulumiType, name, resourceInputs, opts);
    }
}

/**
 * The set of arguments for constructing a RecurringJob resource.
 */
export interface RecurringJobArgs {
    apiVersion?: pulumi.Input<"longhorn.io/v1beta2">;
    kind?: pulumi.Input<"RecurringJob">;
    metadata?: pulumi.Input<ObjectMeta>;
    /**
     * RecurringJobSpec defines the desired state of the Longhorn recurring job
     */
    spec?: pulumi.Input<inputs.longhorn.v1beta2.RecurringJobSpecArgs>;
    /**
     * RecurringJobStatus defines the observed state of the Longhorn recurring job
     */
    status?: pulumi.Input<inputs.longhorn.v1beta2.RecurringJobStatusArgs>;
}
