---
title: CI/CD Integration
description: Automate code generation with a spec-as-code repository and your CI/CD pipeline
---

The model is source code already — a directory of YAML files in a repository. One way to run Modux in a team is a dedicated **spec repository** holding only the model, with CI/CD generating and pushing the code automatically on every merge. (The simpler alternative, the one the [Quick Start](/getting-started/quick-start/) follows, keeps the model and the generated system in the same repository.)

## The spec-as-code concept

```
┌─────────────────────────────┐
│   spec repository           │  ← your team edits YAML here
│   my-system-spec/           │
│   ├── pom.xml               │
│   └── modux/                │
│       ├── projects/…        │
│       └── aggregates/…      │
└────────────┬────────────────┘
             │ PR merged → CI runs mvn modux:generate
             ▼
┌────────────────────────────────────────────────────┐
│  Generated code pushed to target repositories      │
│  ├── github.com/myorg/booking-service   (Service A)│
│  ├── github.com/myorg/payment-service   (Service B)│
│  └── github.com/myorg/booking-shell    (UI Shell)  │
└────────────────────────────────────────────────────┘
```

The spec repo is the single source of truth. Developers never edit generated repositories directly — they edit the YAML, open a PR, and the pipeline does the rest.

---

## The spec project

Create a plain Maven project with no Java sources — just a `pom.xml` and the model directory.

### Directory structure

```
my-system-spec/
├── pom.xml
├── modux/                         # the model: one YAML file per element
│   ├── model-driven-store-schema.json
│   ├── projects/my-system.yaml
│   └── …
└── .github/
    └── workflows/
        └── generate.yml
```

### pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.myorg</groupId>
    <artifactId>my-system-spec</artifactId>
    <version>1.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <build>
        <plugins>
            <plugin>
                <groupId>io.mateu.modux</groupId>
                <artifactId>modux-maven-plugin</artifactId>
                <version>0.6.5</version>
                <configuration>
                    <!-- overrides the project's own outputPath -->
                    <outputPath>${project.basedir}/generated</outputPath>
                </configuration>
                <executions>
                    <execution>
                        <goals><goal>generate</goal></goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

The project, its package and its output path are facts of the model (`modux/projects/{id}.yaml`); the configuration only overrides them. The execution binds `generate` to `generate-sources`, so a plain `mvn package` regenerates too.

:::tip
Add `generated/` to `.gitignore` in the spec repo — generated code lives in the target repositories, not here.
:::

---

## GitHub Actions

### `.github/workflows/generate.yml`

```yaml
name: Generate and push code

on:
  push:
    branches: [main]
    paths:
      - 'modux/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Validate the model        # gate: fails on any error
        run: mvn modux:validate --no-transfer-progress

      - name: Generate code
        run: mvn modux:generate --no-transfer-progress

      - name: Configure git
        run: |
          git config --global user.name  "Modux Generator"
          git config --global user.email "ci@myorg.com"

      - name: Push booking-service
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          SPEC_SHA=$(git rev-parse --short HEAD)
          cd generated/booking-service
          git init
          git add .
          git commit -m "chore: regenerate from spec ${SPEC_SHA}"
          git remote add origin \
            https://x-access-token:${GH_TOKEN}@github.com/myorg/booking-service.git
          git push --force origin HEAD:main

      - name: Push payment-service
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          SPEC_SHA=$(git rev-parse --short HEAD)
          cd generated/payment-service
          git init
          git add .
          git commit -m "chore: regenerate from spec ${SPEC_SHA}"
          git remote add origin \
            https://x-access-token:${GH_TOKEN}@github.com/myorg/payment-service.git
          git push --force origin HEAD:main
```

**Required secret:** `GH_TOKEN` — a GitHub personal access token (or a GitHub App token) with `contents: write` permission on the target repositories.

:::note
The workflow is triggered only when the model changes (`paths` filter), avoiding unnecessary runs on documentation or config-only commits.
:::

### Validation gate

`mvn modux:validate` checks the model — dangling references, duplicate ids, declarations
that collide once generated, and the ERROR rules of the lint catalog (lifecycle coherence,
idempotency, DLQ, PII, tenancy…) — and fails the build on any error; warnings are printed
and the build goes on. `mvn modux:generate` runs the same checks first and generates nothing
while one remains. Run `validate` in the PR workflow so an inconsistent model never reaches
`main`; it is the same check authors run locally after every edit, so what CI enforces is
exactly what they see. See the [Maven plugin reference](/reference/maven-plugin/#goal-validate).

### Push to a PR instead of directly to main

If you prefer the generated code to go through review in the target repos:

```yaml
      - name: Push booking-service (PR branch)
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: |
          SPEC_SHA=$(git rev-parse --short HEAD)
          BRANCH="generated/${SPEC_SHA}"
          cd generated/booking-service
          git init
          git add .
          git commit -m "chore: regenerate from spec ${SPEC_SHA}"
          git remote add origin \
            https://x-access-token:${GH_TOKEN}@github.com/myorg/booking-service.git
          git push --force origin HEAD:${BRANCH}
          gh pr create \
            --repo myorg/booking-service \
            --head ${BRANCH} \
            --base main \
            --title "Generated from spec ${SPEC_SHA}" \
            --body "Auto-generated by Modux. Source commit: myorg/my-system-spec@${SPEC_SHA}"
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

---

## GitLab CI

### `.gitlab-ci.yml`

```yaml
stages:
  - generate
  - push

generate:
  stage: generate
  image: maven:3.9-eclipse-temurin-21
  script:
    - mvn modulo:generate --no-transfer-progress
  artifacts:
    paths:
      - generated/
    expire_in: 1 hour
  only:
    changes:
      - modux/**/*
    refs:
      - main

push-booking-service:
  stage: push
  image: alpine/git
  needs: [generate]
  script:
    - SPEC_SHA=$(git rev-parse --short HEAD)
    - cd generated/booking-service
    - git init
    - git config user.name  "Modux Generator"
    - git config user.email "ci@myorg.com"
    - git add .
    - git commit -m "chore: regenerate from spec ${SPEC_SHA}"
    - git remote add origin
        https://oauth2:${GL_TOKEN}@gitlab.com/myorg/booking-service.git
    - git push --force origin HEAD:main
  only:
    refs:
      - main
```

**Required variable:** `GL_TOKEN` — a GitLab project access token or personal access token with `write_repository` scope, added in *Settings → CI/CD → Variables*.

---

## Jenkins (declarative pipeline)

### `Jenkinsfile`

```groovy
pipeline {
    agent { label 'java21' }

    triggers {
        // run only when the model changes
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Generate') {
            when {
                changeset 'modux/**'
            }
            steps {
                sh 'mvn modux:generate --no-transfer-progress'
            }
        }

        stage('Push services') {
            when {
                changeset 'modux/**'
            }
            parallel {
                stage('booking-service') {
                    steps {
                        withCredentials([string(credentialsId: 'gh-token',
                                               variable: 'GH_TOKEN')]) {
                            sh '''
                                SPEC_SHA=$(git rev-parse --short HEAD)
                                cd generated/booking-service
                                git init
                                git config user.name  "Modux Generator"
                                git config user.email "ci@myorg.com"
                                git add .
                                git commit -m "chore: regenerate from spec ${SPEC_SHA}"
                                git remote add origin \
                                  https://x-access-token:${GH_TOKEN}@github.com/myorg/booking-service.git
                                git push --force origin HEAD:main
                            '''
                        }
                    }
                }
                stage('payment-service') {
                    steps {
                        withCredentials([string(credentialsId: 'gh-token',
                                               variable: 'GH_TOKEN')]) {
                            sh '''
                                SPEC_SHA=$(git rev-parse --short HEAD)
                                cd generated/payment-service
                                git init
                                git config user.name  "Modux Generator"
                                git config user.email "ci@myorg.com"
                                git add .
                                git commit -m "chore: regenerate from spec ${SPEC_SHA}"
                                git remote add origin \
                                  https://x-access-token:${GH_TOKEN}@github.com/myorg/booking-service.git
                                git push --force origin HEAD:main
                            '''
                        }
                    }
                }
            }
        }
    }
}
```

---

## Recommended repository strategy

| Approach | When to use |
|---|---|
| **Force-push to `main`** | Generated code is pure boilerplate; no manual edits ever happen in the target repo |
| **PR per generation** | Team wants to review and approve generated changes before they land |
| **Branch per spec version** | Multiple spec versions must coexist (e.g. v1 and v2 of an API) |

:::caution
Never manually edit files in target repositories if you use force-push. Any manual change will be overwritten on the next generation. Use `sourceOnly: true` to skip infrastructure files, or keep hand-written code in a separate Maven module that depends on the generated one.
:::

## Useful plugin parameters for CI

| Parameter | Recommended CI value |
|---|---|
| `modelPath` | Only when the model is not in `modux/` (or `.modux/`) next to the pom |
| `outputPath` | `${project.basedir}/generated` — easy to reference in push scripts |
| `sourceOnly` | `true` if the target repos already have their own `docker-compose.yml` and POMs |
| `packageName` | Normally the project's own; must match the target repos' package structure |

## Local dry-run before pushing a PR

Test generation locally before opening a PR:

```bash
mvn modux:validate
mvn modux:generate
ls generated/
```

Inspect the diff against the last known-good state, then push the spec change with confidence.
