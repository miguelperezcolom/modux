<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.0.4</version>
        <relativePath/>
    </parent>
    <groupId>${project.packageName}</groupId>
    <artifactId>${shell.name?lower_case?replace("[^a-z0-9]","-",'r')}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${shell.name}</name>
    <description>${shell.title!'UI Shell for ${shell.name}'}</description>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>
        <!-- SecurityConfig is generated with or without an IdP: the shell always needs Security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
<#if idp??>
        <!-- people sign in at the model's identity provider (OIDC login) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-client</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
        </dependency>
</#if>

        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc-test</artifactId>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>io.mateu</groupId>
            <artifactId>annotation-processor-mvc</artifactId>
            <version>3.0-beta.53</version>
        </dependency>
        <dependency>
            <groupId>io.mateu</groupId>
            <artifactId>mvc-core</artifactId>
            <version>3.0-beta.53</version>
        </dependency>
        <dependency>
            <groupId>io.mateu</groupId>
            <artifactId>vaadin-lit</artifactId>
            <version>3.0-beta.53</version>
        </dependency>
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
                            <artifactId>annotation-processor-mvc</artifactId>
                            <version>3.0-beta.53</version>
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
