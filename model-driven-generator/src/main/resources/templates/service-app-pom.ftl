<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>${project.packageName}</groupId>
        <artifactId>${service.name?replace(" ","-")?lower_case}-parent</artifactId>
        <version>${project.version!'0.0.1-SNAPSHOT'}</version>
    </parent>
    <artifactId>${service.name?replace(" ","-")?lower_case}-app</artifactId>
    <name>${service.name} App</name>
    <properties>
        <java.version>21</java.version>
    </properties>
    <dependencies>
<#list service.modules as module>
        <dependency>
            <groupId>${project.packageName}</groupId>
            <artifactId>${module.name?lower_case?replace("[^a-z0-9]","",'r')}</artifactId>
            <version>${project.version!'0.0.1-SNAPSHOT'}</version>
        </dependency>
</#list>
        <!-- developer-owned implementations of generated hooks (never overwritten) -->
        <dependency>
            <groupId>${project.packageName}</groupId>
            <artifactId>${service.name?replace(" ","-")?lower_case}-custom</artifactId>
            <version>${project.version!'0.0.1-SNAPSHOT'}</version>
        </dependency>
        <dependency>
            <groupId>io.mateu</groupId>
            <artifactId>mateu-annotation-processor-mvc</artifactId>
            <version>3.0-beta.64</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <!-- API-only: the generated pages annotate required fields; Mateu renders the
             indicator from them. No provider needed. -->
        <dependency>
            <groupId>jakarta.validation</groupId>
            <artifactId>jakarta.validation-api</artifactId>
        </dependency>
<#if idp??>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-client</artifactId>
        </dependency>
        <!-- The apiFilterChain validates the shell's keycloak JWTs on the machine paths -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
        </dependency>
</#if>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-stream-kafka</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
<#if (project.dbMigrationTool!'Flyway') != 'None'>
        <!-- Database schema evolution: Flyway owns the schema; Hibernate only validates it -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-flyway</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
</#if>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </path>
                        <path>
                            <groupId>io.mateu</groupId>
                            <artifactId>mateu-annotation-processor-mvc</artifactId>
                            <version>3.0-beta.64</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
