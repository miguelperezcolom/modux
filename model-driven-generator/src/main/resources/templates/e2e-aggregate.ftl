package ${project.packageName}.${module.slug}.e2e;
<#assign formFields = aggregate.fields?filter(f -> f.name != "id")>
<#function isLookup f><#return lookups?? && lookups[f.name]??></#function>
<#function isText f><#return !f.isEnum && !isLookup(f) && (f.type == "ValueObject" || ["string", "email", "password", "url"]?seq_contains(f.primitiveType!"string"))></#function>
<#function isChoice f><#return f.isEnum></#function>
<#function labelOf f><#return (f.label?has_content)?then(f.label, f.name?replace("([a-z])([A-Z])", "$1 $2", "r")?cap_first)></#function>
<#-- Create-and-find needs a field to carry the marker, and values for every required field that
     do not depend on other records existing already. -->
<#assign drivable = formFields?filter(isText)?has_content>
<#list formFields as f><#if isLookup(f) || (f.mandatory && !isText(f) && !isChoice(f))><#assign drivable = false></#if></#list>

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

@Tag("e2e")
class ${aggregate.name}E2ETest extends BaseE2ETest {

    // Mateu derives the route from the @Menu field name.
    private static final String LIST_URL = "${e2eListUrl}";

    @Test
    void should_show_${aggregate.name?lower_case}_list() {
        navigateTo(LIST_URL);
        assertThat(page.locator("vaadin-grid")).isVisible();
    }

    @Test
    void should_open_create_form() {
        navigateTo(LIST_URL);
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("New")).click();
        assertThat(saveButton()).isVisible();
    }
<#if drivable>

    @Test
    void should_create_find_and_delete_${aggregate.name?lower_case}() {
        var marker = "e2e-" + System.currentTimeMillis();
        navigateTo(LIST_URL + "/new");
<#list formFields as f>
<#if isText(f)>
        page.getByLabel("${labelOf(f)}").first().fill(marker);
<#elseif isChoice(f)>
        chooseFirstOption("${labelOf(f)}");
</#if>
</#list>
        saveButton().click();
        page.waitForURL(url -> !url.endsWith("/new"));

        navigateTo(LIST_URL + "?searchText=" + marker);
        assertThat(cellWith(marker).first()).isVisible();

        page.locator("vaadin-grid-cell-content vaadin-checkbox").nth(1).click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Delete")).first().click();
        page.getByRole(AriaRole.ALERTDIALOG)
                .getByRole(AriaRole.BUTTON, new com.microsoft.playwright.Locator.GetByRoleOptions().setName("Delete"))
                .click();

        navigateTo(LIST_URL + "?searchText=" + marker);
        assertThat(page.locator("vaadin-grid")).isVisible();
        assertThat(cellWith(marker)).hasCount(0);
    }
</#if>
}
