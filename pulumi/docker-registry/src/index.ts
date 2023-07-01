import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export = async () => {
  const clusterRef = new pulumi.StackReference(`organization/pi-cluster/main`);
  const kubeconfig = clusterRef.getOutput("kubeconfig");
  const issuerName = clusterRef.getOutput("issuerName");
  const storageClassName = clusterRef.getOutput("storageClassName");
  const ingressClassName = clusterRef.getOutput("ingressClassName");

  const dnsName = new pulumi.Config("docker-registry").require("dnsName");

  const kubernetesProvider = new kubernetes.Provider("kubernetes-provider", {
    kubeconfig,
  });

  const namespace = new kubernetes.core.v1.Namespace(
    "docker-registry",
    {},
    { provider: kubernetesProvider }
  );

  const serviceAccount = new kubernetes.core.v1.ServiceAccount(
    "docker-registry",
    { metadata: { namespace: namespace.metadata.name } },
    { provider: kubernetesProvider }
  );

  const pvc = new kubernetes.core.v1.PersistentVolumeClaim(
    "docker-registry-data",
    {
      metadata: { namespace: namespace.metadata.name },
      spec: {
        accessModes: ["ReadWriteOnce"],
        volumeMode: "Filesystem",
        resources: { requests: { storage: "10Gi" } },
        storageClassName: storageClassName,
      },
    },
    { provider: kubernetesProvider }
  );

  const deployment = new kubernetes.apps.v1.Deployment(
    "docker-registry",
    {
      metadata: { namespace: namespace.metadata.name },
      spec: {
        selector: { matchLabels: { app: "docker-registry" } },
        template: {
          metadata: { labels: { app: "docker-registry" } },
          spec: {
            serviceAccountName: serviceAccount.metadata.name,
            containers: [
              {
                name: "docker-registry",
                image: "docker.io/registry:2.8.2",
                volumeMounts: [
                  {
                    mountPath: "/var/lib/registry",
                    name: "data",
                  },
                ],
                env: [{ name: "REGISTRY_LOG_LEVEL", value: "debug" }],
                ports: [
                  {
                    containerPort: 5000,
                  },
                ],
              },
            ],
            volumes: [
              {
                name: "data",
                persistentVolumeClaim: { claimName: pvc.metadata.name },
              },
            ],
          },
        },
      },
    },
    {
      provider: kubernetesProvider,
    }
  );

  const containerPort =
    deployment.spec.template.spec.containers[0].ports[0].containerPort;

  const service = new kubernetes.core.v1.Service(
    "docker-registry",
    {
      metadata: { namespace: namespace.metadata.name },
      spec: {
        selector: deployment.spec.template.metadata.labels,
        ports: [
          {
            port: 5000,
            protocol: "TCP",
            targetPort: containerPort,
          },
        ],
      },
    },
    { provider: kubernetesProvider }
  );

  new kubernetes.networking.v1.Ingress(
    "docker-registry",
    {
      metadata: {
        namespace: namespace.metadata.name,
        annotations: {
          "cert-manager.io/cluster-issuer": issuerName,
        },
      },
      spec: {
        ingressClassName: ingressClassName,
        tls: [{ hosts: [dnsName], secretName: "tls" }],
        rules: [
          {
            host: dnsName,
            http: {
              paths: [
                {
                  path: "/",
                  pathType: "Prefix",
                  backend: {
                    service: {
                      name: service.metadata.name,
                      port: { number: service.spec.ports[0].port },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { provider: kubernetesProvider }
  );

  return {
    url: `https://${dnsName}`,
  };
};
