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
services, and the API gateway and shell when there is one). The deploy prints where to enter it:
`http://localhost:8088` when there is a shell (the API gateway is its front door); otherwise each
service on its own port, at the path of each app it serves (`http://localhost:8091/library`), or
at its root when it serves none. An environment with `deployTarget: DOCKER` deploys the same way.

## The Compose project name

Docker Compose groups containers and volumes into a *project*, named after the folder unless the
file says otherwise. Every system generated with `outputPath: system` would then be the project
`system`: deploying one would recreate another's containers and reuse its volumes, its database
included. So the generated `docker-compose.yml` names its own project after the project id
(`name: library`), sanitized to Compose's rules (lowercase letters, digits, `-` and `_`, starting
with a letter or a digit). A plain `docker compose up` in the folder uses it too.

A system deployed **before** it had that name lives in the folder's project, with its data in
that project's volumes (`system_postgres_data`). Moving it silently would bring it up on empty
volumes, so `mvn modux:deploy` decides, once:

| What Docker holds | The project the deploy uses |
|---|---|
| Nothing under either name | the new one |
| Containers or volumes of the new one | the new one |
| Containers (running or stopped) of the folder's project, from **this** folder | the folder's — the system keeps its data |
| Containers of the folder's project from **another** folder | the new one: that stack is another system's |
| Only volumes of the folder's project, no container to say whose | none: the deploy stops and asks |

When it keeps the folder's name it says so in one line and pins it in the folder's `.env`
(`COMPOSE_PROJECT_NAME=system`; the rest of the file is left alone), which Compose reads
too: `docker compose ps`, `logs` or `down` in the folder address the same stack. To choose
explicitly — say, to answer the last case — pass `-Dmodux.composeProject=<name>`; choosing the new
name removes the pin. Do not commit that `.env` line: it describes this machine's Docker.

`up.sh` and `down.sh` do not use Compose: they run named containers (`<project>-postgres`,
`<project>-kafka`) with no volumes, and are not affected.

### Moving a stack to its new name

The data is in the folder project's volumes; copy it to the new project's, then drop the pin:

```bash
docker compose -p system down                     # stops it; volumes stay
docker compose -p library create postgres         # the new project's (empty) volume
docker run --rm -v system_postgres_data:/from -v library_postgres_data:/to \
  alpine sh -c 'cp -a /from/. /to/'
sed -i.bak '/COMPOSE_PROJECT_NAME/d' .env          # drop the pin (or edit .env by hand)
mvn modux:deploy -Dmodux.env=local                # finds the new project's volume: uses it
```

Check the system answers with its data before removing the old volumes
(`docker volume rm system_postgres_data`). Kafka holds no volume: its topics start empty either
way.

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
