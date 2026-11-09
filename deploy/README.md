# Ejecutar y desplegar modux

Modux corre en dos mundos con el mismo binario:

- **Local, contra tu disco** — el home (`~/.modux`) cataloga repositorios LOCAL/GIT.
- **Servidor, contra una base de datos** — un repositorio DATABASE (PostgreSQL) y el
  catálogo se siembra solo en el primer arranque.

## Local (instalador)

```bash
./install.sh            # construye el jar y deja el launcher `modux` en ~/.local/bin
modux                   # → http://localhost:8192   (MODUX_PORT / MODUX_HOME para variar)

./install.sh --docker   # variante contenedor: monta ~/.modux como home
```

## Imagen Docker

El jar se construye en el host:

```bash
mvn -f model-driven-generator/pom.xml package -DskipTests
docker build -t modux:dev .

# filesystem:
docker run -p 8192:8192 -v ~/.modux:/data/modux-home modux:dev
# contra BD:
docker run -p 8192:8192 \
  -e MODUX_BOOTSTRAP_DB='jdbc:postgresql://host:5432/modux' \
  -e MODUX_DB_USER=modux -e MODUX_DB_PASSWORD=… modux:dev
```

## Kubernetes (Helm): modux + PostgreSQL juntos

```bash
cd deploy/chart/modux
helm dependency update
helm install modux . --namespace modux --create-namespace
# BD externa: --set postgresql.enabled=false --set externalDatabase.jdbcUrl=jdbc:postgresql://…
```

La imagen debe ser visible para el cluster (push a tu registry y `--set image.repository=…`;
en k3s local también vale `docker save modux:dev | sudo k3s ctr images import -`).
