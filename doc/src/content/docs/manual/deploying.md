---
title: Deploying
description: From the model to a running system — local Docker, a local cluster, or a managed one like Cloudfleet — with its DNS
---

One command deploys the generated system to an environment of the model:

```bash
mvn modux:generate
mvn modux:deploy -Dmodux.env=local   # the compose on your Docker
mvn modux:deploy -Dmodux.env=dev     # an environment of the model, on its Kubernetes context
```

## Environments

They live in the project's deployment (`deployments/deployment-<project>.yaml`), one per
`DEV`, `STAGING` or `PROD`:

```yaml
id: deployment-tienda
dockerRegistry: docker.io/miguelperezcolom
environments:
  - environment: DEV
    deployTarget: KUBERNETES
    kubernetesContext: kind-lab            # a kind cluster: images are loaded, not pushed
  - environment: PROD
    deployTarget: KUBERNETES
    kubernetesContext: cloudfleet-hetzner  # any other context: images are pushed
    kubernetesNamespace: tienda            # default: <project>-<env>
    ingressDomain: ec1.mateu.io
    ingressClassName: nginx                # default
    ingressTlsEnabled: true                # default
    certIssuer: letsencrypt                # cert-manager ClusterIssuer
    dnsProvider: NETLIFY                   # NETLIFY, CLOUDFLARE, HETZNER or GODADDY
```

`local` always exists: it is the generated `docker-compose.yml` (Postgres, Kafka, the
services, and the API gateway and shell when there is one), entered at `http://localhost:8088`.
An environment with `deployTarget: DOCKER` deploys the same way.

## What a Kubernetes deploy does

Generation writes `deploy/k8s/<env>.yaml` and `deploy/targets.json`; the deploy:

1. Builds every generated project (`mvn install`; `-Dmodux.skipBuild` skips it).
2. Builds one image per runnable — each service, the API gateway, each shell — tagged with
   the moment of the deploy (`-Dmodux.tag` to choose it). On a `kind-*` context it loads them
   into the cluster; on any other it pushes them to `imageRegistry` (or the deployment's
   `dockerRegistry`), built for `linux/amd64` (`-Dmodux.platform`). Docker Hub and ghcr.io both
   work with your `docker login`.
3. Creates the namespace and, the first time, the `<project>-db` Secret with a random database
   password — it is never written to a file.
4. Applies the manifest: Postgres (one database per service, on a volume) and a single-node
   Kafka in the namespace; each runnable with its probes, waiting for the infrastructure before
   starting; an Ingress with TLS for the environment's hosts.
5. Waits for every rollout, then points the DNS of each host at the ingress.

## URLs and DNS

The hosts of an environment are:

- the shell's (entered through the API gateway): its `url` when it lives in `ingressDomain`,
  otherwise `<shell>.<ingressDomain>`;
- the `urls/` of each service that belong to the environment: those naming it
  (`environment: PROD`), and those naming none whose host lives in `ingressDomain`;
- without a shell, `<service>.<ingressDomain>` for a service with no URL of its own.

For each host the deploy reads the ingress' public address. A host that already resolves there
(a wildcard record, say) is left alone; otherwise the environment's `dnsProvider` gets an A
record (AAAA for IPv6, CNAME for a host name) in the zone that serves it, found by suffix. The
credentials come from the environment, never from the model:

| `dnsProvider` | Variables |
|---|---|
| `NETLIFY` | `NETLIFY_AUTH_TOKEN` |
| `CLOUDFLARE` | `CLOUDFLARE_API_TOKEN` (Zone · DNS · Edit); records are not proxied |
| `HETZNER` | `HCLOUD_TOKEN` (the Cloud API, which now hosts Hetzner DNS) |
| `GODADDY` | `GODADDY_API_KEY`, `GODADDY_API_SECRET` |

An environment without `ingressDomain` publishes nothing: the deploy prints the
`kubectl port-forward` that reaches it.

## Prerequisites

- **docker** (with `buildx` for pushed images) logged in to the registry.
- **kubectl** with the environment's context; **kind** for kind clusters.
- On the cluster, an ingress controller and, for TLS, cert-manager with the issuer you name.

## Identity: the model's IdP becomes the login

Declare an **IdP** element with its **issuer** and connect it to the apps: the shell signs people
in there (OIDC login, a public client with PKCE) and every service accepts the system's cookie or
the IdP's JWT — see [what an IdP generates](/manual/identity/#what-an-idp-generates).

- **Locally**, an issuer on `localhost` brings its Keycloak: the compose file (and `up.sh`) start
  it with the generated realm — the model's roles, one user per role, the clients.
- **On Kubernetes**, the manifests tell the shell where people enter (`MODUX_PUBLIC_URL`, from the
  environment's host). The IdP is yours: create the realm roles and the public clients (`shell`,
  redirect `https://<host>/*`). There are no client secrets to deploy.

## Troubleshooting

- **`No hay un entorno «…» en el modelo`** — the message lists the ones there are; run
  `mvn modux:generate` after adding one.
- **Pods `Pending`** — the cluster has no room: each runnable asks for 448 MiB.
- **Pod `Pending` with `disk-pressure`** — the pipeline worked; the NODE is out of
  disk. Kubernetes untaints it a few minutes after you free space past its eviction
  threshold (10% by default).
- **The generated `.java` files come out unformatted** — the JVM running Modux lacks
  the `--add-exports jdk.compiler/...` options google-java-format needs. Modux warns
  once with the exact list; `mvn spring-boot:run` already includes them, IDE run
  configurations usually don't.
