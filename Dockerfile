# Imagen runtime de modux. El jar se construye en el HOST:
#
#   mvn -f model-driven-generator/pom.xml package -DskipTests
#   docker build -t modux:dev .
#
# (install.sh --docker hace ambas cosas.)
FROM eclipse-temurin:21-jre
LABEL org.opencontainers.image.title="modux" \
      org.opencontainers.image.description="Model-driven editor & generator — la spec YAML que se convierte en código"
# git: los repositorios de tipo GIT se clonan dentro del contenedor
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data && useradd -r -u 1001 modux && chown -R modux /data
WORKDIR /app
COPY model-driven-generator/target/*-exec.jar /app/modux.jar
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown -R modux /app
USER modux
# /data persiste el home de modux (catálogo de repositorios, checkouts)
VOLUME /data
EXPOSE 8192
ENTRYPOINT ["/app/entrypoint.sh"]
