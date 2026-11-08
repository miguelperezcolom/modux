---
title: E2E Tests with Playwright
description: How Modux generates end-to-end tests with Playwright for the aggregates a UI consumes
---

Modux generates a complete Playwright E2E test suite alongside the production code. For every module you get an abstract base class, and for every aggregate with CRUD pages (one a UI consumes) you get a concrete test class with canned scenarios for the full CRUD lifecycle.

## Generated files

```
src/test/java/{package}/{module}/
└── e2e/
    ├── BaseE2ETest.java          ← once per module
    ├── {Aggregate}E2ETest.java   ← once per aggregate
    └── ...
```

### `BaseE2ETest.java`

Manages the Playwright lifecycle shared by all E2E tests in the module:

```java
@Tag("e2e")
public abstract class BaseE2ETest {

    protected static Playwright playwright;
    protected static Browser browser;
    protected BrowserContext context;
    protected Page page;

    protected static final String BASE_URL =
            System.getProperty("e2e.base-url", "http://localhost:8080");

    @BeforeAll
    static void launchBrowser() {
        playwright = Playwright.create();
        browser = playwright.chromium().launch(
                new BrowserType.LaunchOptions()
                        .setHeadless(!Boolean.getBoolean("e2e.headed")));
    }

    @AfterAll static void closeBrowser()  { playwright.close(); }
    @BeforeEach void createContext()      { context = browser.newContext(...); page = context.newPage(); }
    @AfterEach  void closeContext()       { context.close(); }

    protected void navigateTo(String path) {
        page.navigate(path);
        page.waitForLoadState();
    }
}
```

### `{Aggregate}E2ETest.java`

One class per aggregate with five baseline tests plus one test per custom operation:

```java
@Tag("e2e")
class BookingE2ETest extends BaseE2ETest {

    // Route derived from the @Menu field name in Home.java
    private static final String LIST_URL = "/bookings";

    @Test void page_should_load()              { ... }
    @Test void should_show_booking_list()      { ... }
    @Test void should_open_create_form()       { ... }
    @Test void should_create_booking()         { ... }  // getByLabel stubs per field
    @Test void should_delete_booking()         { ... }

    // One additional test per custom operation defined in the spec:
    @Test void should_execute_confirm_operation() { ... }
}
```

Field stubs are generated as commented `getByLabel` calls — uncomment and adjust once you know the exact label rendered by the UI:

```java
// page.getByLabel("Reference").fill("BK-001");
// page.getByLabel("Start date").fill("2025-01-15");
// page.getByLabel("Price").fill("150.00");
```

## Running E2E tests

E2E tests are **excluded from the normal `mvn test` run** by default (via `excludedGroups=e2e` in Surefire). They only execute when explicitly targeted.

### 1. Start the application

```bash
cd {output-path}/{service-name}
mvn spring-boot:run
```

### 2. Run the E2E suite

In a separate terminal:

```bash
# All E2E tests against the default URL
mvn test -Dgroups=e2e

# Override the base URL
mvn test -Dgroups=e2e -De2e.base-url=http://localhost:9090

# Run only one aggregate's tests
mvn test -Dgroups=e2e -Dtest=BookingE2ETest

# Open browser window (useful while writing tests)
mvn test -Dgroups=e2e -De2e.headed=true
```

### Install Playwright browsers (first run)

Playwright downloads browser binaries separately. Run once after building:

```bash
mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI \
  -D exec.args="install chromium" \
  -D exec.classpathScope=test
```

Or install all browsers:

```bash
mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI \
  -D exec.args="install" \
  -D exec.classpathScope=test
```

## Completing the generated tests

The generated tests contain `// TODO` comments where selectors depend on the rendered UI. Open the browser in headed mode to discover the right locators:

```bash
mvn test -Dgroups=e2e -De2e.headed=true -De2e.base-url=http://localhost:8080
```

Use Playwright's [codegen](https://playwright.dev/java/docs/codegen) tool to record interactions and get selector suggestions:

```bash
mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI \
  -D exec.args="codegen http://localhost:8080" \
  -D exec.classpathScope=test
```

### Typical selectors for Mateu/Vaadin Lit components

| Action | Locator |
|---|---|
| Click "New" button | `page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("New"))` |
| Fill a text field | `page.getByLabel("Field name").fill("value")` |
| Select first row | `page.locator("vaadin-grid vaadin-grid-cell").first()` |
| Click action button | `page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Confirm"))` |
| Assert visible | `assertThat(page.locator("selector")).isVisible()` |
| Assert text | `assertThat(page.locator("selector")).hasText("expected")` |

## In CI/CD

E2E tests in CI need a running application. Use Spring Boot's Maven plugin to start and stop the app around the test phase:

```yaml
# GitHub Actions example
- name: Start application
  run: mvn spring-boot:start -pl {service}-app &

- name: Wait for startup
  run: |
    until curl -s http://localhost:8080/actuator/health | grep UP; do
      sleep 2
    done

- name: Run E2E tests
  run: mvn test -Dgroups=e2e -De2e.base-url=http://localhost:8080

- name: Stop application
  run: mvn spring-boot:stop -pl {service}-app
  if: always()
```

Or use Docker Compose to start the full stack:

```yaml
- name: Start stack
  run: docker compose up -d

- name: Run E2E tests
  run: mvn test -Dgroups=e2e -De2e.base-url=http://localhost:8080

- name: Stop stack
  run: docker compose down
  if: always()
```

## URL convention

The generated test URLs follow the convention Mateu uses for `@Menu` fields in `Home.java`:

```java
// Generated Home.java
@Menu
BookingCrudOrchestrator bookings;   // → route /bookings
```

If your Mateu version uses a different routing strategy, update `LIST_URL` in the generated test class accordingly.
