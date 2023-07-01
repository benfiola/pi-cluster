import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

export = async () => {
  const clusterRef = new pulumi.StackReference(`organization/pi-cluster/main`);
  const kubeconfig = clusterRef.getOutput("kubeconfig");

  const image = new pulumi.Config("bot").require("image");
  const discordApiToken = new pulumi.Config("bot").requireSecret(
    "discordApiToken"
  );

  const kubernetesProvider = new kubernetes.Provider("kubernetes-provider", {
    kubeconfig,
  });
  const randomProvider = new random.Provider("random-provider");

  const namespace = new kubernetes.core.v1.Namespace(
    "bot",
    {},
    { provider: kubernetesProvider }
  );

  const serviceAccount = new kubernetes.core.v1.ServiceAccount(
    "bot",
    { metadata: { namespace: namespace.metadata.name } },
    { provider: kubernetesProvider }
  );

  const lavalinkPassword = new random.RandomString(
    "lavalink-password",
    { length: 16 },
    { provider: randomProvider }
  );

  const lavalinkSecret = new kubernetes.core.v1.Secret(
    "lavalink",
    {
      metadata: { namespace: namespace.metadata.name },
      stringData: {
        LAVALINK_SERVER_PASSWORD: lavalinkPassword.result,
      },
    },
    { provider: kubernetesProvider }
  );

  const lavalinkDeployment = new kubernetes.apps.v1.Deployment(
    "lavalink",
    {
      metadata: { namespace: namespace.metadata.name },
      spec: {
        selector: { matchLabels: { app: "lavalink" } },
        template: {
          metadata: { labels: { app: "lavalink" } },
          spec: {
            serviceAccountName: serviceAccount.metadata.name,
            containers: [
              {
                name: "lavalink",
                image: "fredboat/lavalink:latest",
                imagePullPolicy: "Always",
                envFrom: [
                  { secretRef: { name: lavalinkSecret.metadata.name } },
                ],
                env: [{ name: "SERVER_PORT", value: "2333" }],
                ports: [{ containerPort: 2333 }],
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

  const lavalinkContainerPort =
    lavalinkDeployment.spec.template.spec.containers[0].ports[0].containerPort;

  const lavalinkService = new kubernetes.core.v1.Service(
    "lavalink",
    {
      metadata: { namespace: namespace.metadata.name },
      spec: {
        selector: lavalinkDeployment.spec.template.metadata.labels,
        ports: [
          {
            port: 2333,
            protocol: "TCP",
            targetPort: lavalinkContainerPort,
          },
        ],
      },
    },
    { provider: kubernetesProvider }
  );

  const lavalinkUrl = pulumi
    .all([
      lavalinkService.metadata.name,
      lavalinkPassword.result,
      lavalinkService.spec.ports[0].port,
    ])
    .apply(([host, pw, port]) => `http://:${pw}@${host}:${port}`);

  const botSecret = new kubernetes.core.v1.Secret(
    "bot",
    {
      metadata: { namespace: namespace.metadata.name },
      stringData: {
        BOT_DISCORD_API_TOKEN: discordApiToken,
        BOT_LAVALINK_URL: lavalinkUrl,
      },
    },
    { provider: kubernetesProvider }
  );

  new kubernetes.apps.v1.Deployment(
    "bot",
    {
      metadata: { namespace: namespace.metadata.name },
      spec: {
        selector: { matchLabels: { app: "bot" } },
        template: {
          metadata: { labels: { app: "bot" } },
          spec: {
            serviceAccountName: serviceAccount.metadata.name,
            containers: [
              {
                name: "bot",
                image: image,
                imagePullPolicy: "Always",
                envFrom: [{ secretRef: { name: botSecret.metadata.name } }],
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

  return {};
};
