import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as common from "../../common";

export = async () => {
  const kubeconfig = new pulumi.Config("pi-cluster").requireSecret(
    "kubeconfig"
  );
  const ipAddressPool = new pulumi.Config("pi-cluster").require(
    "ipAddressPool"
  );
  const piholeServer = new pulumi.Config("pi-cluster").require("piholeServer");

  const kubernetesProvider = new kubernetes.Provider("kubernetes-provider", {
    kubeconfig,
  });

  new kubernetes.yaml.ConfigFile(
    "cert-manager",
    { file: common.certManagerManifest },
    { provider: kubernetesProvider }
  );

  const caIssuer = new common.certManager.v1.ClusterIssuer(
    "ca-issuer",
    {
      metadata: { namespace: "cert-manager" },
      spec: { selfSigned: {} },
    },
    { provider: kubernetesProvider }
  );

  const caCertificate = new common.certManager.v1.Certificate(
    "ca",
    {
      metadata: { namespace: "cert-manager" },
      spec: {
        isCA: true,
        commonName: "ca",
        secretName: "ca-secret",
        privateKey: { algorithm: "ECDSA", size: 256 },
        issuerRef: {
          name: pulumi.output(caIssuer.metadata.name),
          kind: caIssuer.kind,
          group: "cert-manager.io",
        },
      },
    },
    { provider: kubernetesProvider }
  );

  const issuer = new common.certManager.v1.ClusterIssuer(
    "issuer",
    {
      metadata: { namespace: "cert-manager" },
      spec: {
        ca: { secretName: pulumi.output(caCertificate.spec.secretName) },
      },
    },
    { provider: kubernetesProvider }
  );

  new kubernetes.yaml.ConfigFile(
    "metallb",
    { file: common.metallbManifest },
    { provider: kubernetesProvider }
  );

  const mlbAddressPool = new common.metallb.v1beta1.IPAddressPool(
    "ip-address-pool",
    {
      metadata: { namespace: "metallb-system" },
      spec: { addresses: [ipAddressPool] },
    },
    {
      provider: kubernetesProvider,
    }
  );

  new common.metallb.v1beta1.L2Advertisement(
    "l2-advertisement",
    {
      metadata: { namespace: "metallb-system" },
      spec: { ipAddressPools: [pulumi.output(mlbAddressPool.metadata.name)] },
    },
    { provider: kubernetesProvider }
  );

  new kubernetes.yaml.ConfigFile(
    "longhorn",
    { file: common.longhornManifest },
    { provider: kubernetesProvider }
  );

  const dnsNamespace = new kubernetes.core.v1.Namespace(
    "external-dns",
    {},
    {
      provider: kubernetesProvider,
    }
  );

  const dnsServiceAccount = new kubernetes.core.v1.ServiceAccount(
    "external-dns",
    {
      metadata: { namespace: dnsNamespace.metadata.name },
    },
    { provider: kubernetesProvider }
  );

  const dnsClusterRole = new kubernetes.rbac.v1.ClusterRole(
    "external-dns",
    {
      rules: [
        {
          apiGroups: [""],
          resources: ["services", "endpoints", "pods"],
          verbs: ["get", "watch", "list"],
        },
        {
          apiGroups: ["extensions", "networking.k8s.io"],
          resources: ["ingresses"],
          verbs: ["get", "watch", "list"],
        },
        {
          apiGroups: [""],
          resources: ["nodes"],
          verbs: ["watch", "list"],
        },
      ],
    },
    { provider: kubernetesProvider }
  );

  const dnsClusterRoleBinding = new kubernetes.rbac.v1.ClusterRoleBinding(
    "external-dns",
    {
      roleRef: {
        apiGroup: "rbac.authorization.k8s.io",
        kind: dnsClusterRole.kind,
        name: dnsClusterRole.metadata.name,
      },
      subjects: [
        {
          kind: dnsServiceAccount.kind,
          name: dnsServiceAccount.metadata.name,
          namespace: dnsServiceAccount.metadata.namespace,
        },
      ],
    },
    { provider: kubernetesProvider }
  );

  new kubernetes.apps.v1.Deployment(
    "external-dns",
    {
      metadata: { namespace: dnsNamespace.metadata.name },
      spec: {
        strategy: { type: "Recreate" },
        selector: { matchLabels: { app: "external-dns" } },
        template: {
          metadata: { labels: { app: "external-dns" } },
          spec: {
            serviceAccountName: dnsServiceAccount.metadata.name,
            containers: [
              {
                name: "external-dns",
                image: "registry.k8s.io/external-dns/external-dns:v0.13.5",
                args: [
                  "--source=service",
                  "--source=ingress",
                  "--registry=noop",
                  "--policy=sync",
                  "--provider=pihole",
                  `--pihole-server=${piholeServer}`,
                  // NOTE: --pihole-password needs to have a value even if the server is unsecured
                  '--pihole-password="unset"',
                ],
              },
            ],
          },
        },
      },
    },
    { provider: kubernetesProvider, dependsOn: [dnsClusterRoleBinding] }
  );

  return {
    kubeconfig,
    issuerName: issuer.metadata.name,
    ingressClassNmame: "traefik",
    storageClassName: "longhorn",
  };
};
