<#assign uiEs = ((project.defaultLocale!"")?has_content?then(project.defaultLocale!"", (project.locales![])?has_content?then((project.locales![""])[0], "")))?lower_case?starts_with("es")>
package e2e;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;

/**
 * Base of the generated e2e suite: one Chromium for the whole run (installed on
 * first use), plus the form-login helper with the model's scaffold credentials
 * (the generated in-memory users are roleId/roleId).
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class BaseE2eTest {

    protected static Playwright playwright;
    protected static Browser browser;

    @BeforeAll
    static void launchBrowser() throws Exception {
        // Install Chromium in a SEPARATE JVM (Playwright's CLI calls System.exit;
        // the classpath of the forked test run already holds the playwright jar).
        var install = new ProcessBuilder("java", "-cp", System.getProperty("java.class.path"),
                "com.microsoft.playwright.CLI", "install", "chromium")
                .inheritIO()
                .start();
        if (install.waitFor() != 0) {
            throw new IllegalStateException("<#if uiEs>playwright install chromium falló — revísalo a mano<#else>playwright install chromium failed — check it by hand</#if>");
        }
        playwright = Playwright.create();
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
    }

    @AfterAll
    static void closeBrowser() {
        if (browser != null) browser.close();
        if (playwright != null) playwright.close();
    }

    protected Page newPage() {
        return browser.newPage();
    }

    /**
     * Spring's form login, only if the login page shows (apps may boot open in dev).
     * After submitting, waits for the app to render something back.
     */
    protected void loginIfNeeded(Page page, String username, String password) {
        var user = page.locator("input[name='username']");
        if (user.count() > 0 && user.first().isVisible()) {
            user.first().fill(username);
            page.locator("input[name='password']").first().fill(password);
            page.locator("button[type='submit'], button:has-text('Sign in')").first().click();
            page.waitForLoadState();
        }
    }

    /** Clicks a menu entry by its visible label, tolerating surrounding whitespace. */
    protected void openMenuEntry(Page page, String label) {
        page.locator("text=" + label).first().click();
        page.waitForLoadState();
    }

    /**
     * Waits until a selector is visible (SPA syncs are async) and returns it —
     * the assertion primitive for every generated test: it pierces shadow DOM
     * and tolerates the Mateu render roundtrip.
     */
    protected com.microsoft.playwright.ElementHandle waitVisible(Page page, String selector) {
        return page.waitForSelector(selector,
                new com.microsoft.playwright.Page.WaitForSelectorOptions().setTimeout(15000));
    }

    /**
     * Navigates to the app and logs in, landing BACK on the app path.
<#if idp??>
     * The model authenticates against ${idp.name}: the Mateu frontend (keycloak.js)
     * redirects to the IdP — this waits for that redirect, logs in with the dev
     * keycloak's admin/admin and comes back to the app.
<#else>
     * Spring's form login when it shows; the login success redirect goes to "/", where
     * the Mateu SPA cannot sync (its mateu endpoint lives under the app path), so we
     * navigate back to the app afterwards.
</#if>
     */
    protected void loginAndOpen(Page page, String appUrl, String username, String password) {
        page.navigate(appUrl);
<#if idp??>
        for (int i = 0; i < 15 && !page.url().contains("/realms/"); i++) {
            page.waitForTimeout(1000);
        }
        if (page.url().contains("/realms/")) {
            page.locator("input[name='username'], #username").first().fill("admin");
            page.locator("input[name='password'], #password").first().fill("admin");
            page.locator("button[type='submit'], input[type='submit'], #kc-login").first().click();
            for (int i = 0; i < 15 && !page.url().startsWith(appUrl); i++) {
                page.waitForTimeout(1000);
            }
        }
<#else>
        loginIfNeeded(page, username, password);
        page.navigate(appUrl);
</#if>
        page.waitForLoadState();
    }
}
