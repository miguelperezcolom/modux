# syntax=docker/dockerfile:1
# Runtime image for the ${title}. The jar is built outside the image (`mvn package`),
# which is what `mvn modux:deploy` does before building it.
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY ${jar} /app/app.jar
USER app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
