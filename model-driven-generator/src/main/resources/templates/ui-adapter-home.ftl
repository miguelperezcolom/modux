package ${project.packageName}.infra.in.ui;

import io.mateu.uidl.annotations.Menu;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.annotations.UI;
<#if idp??>
import io.mateu.uidl.annotations.KeycloakSecured;
import io.mateu.uidl.data.Anchor;
import io.mateu.uidl.data.Popover;
import io.mateu.uidl.data.Text;
import io.mateu.uidl.data.VerticalLayout;
import io.mateu.uidl.fluent.Component;
import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.WidgetSupplier;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import static io.mateu.core.infra.JsonSerializer.fromJson;
</#if>
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;
<#if homePage??>
import ${project.packageName}.${homePage.moduleSlug}.infra.in.ui.pages.${homePage.pageSlug}.${homePage.className};
</#if>
<#if menuPages?? && menuPages?has_content>
<#list menuPages as pg>
import ${project.packageName}.${pg.moduleSlug}.infra.in.ui.pages.${pg.pageSlug}.${pg.className};
</#list>
</#if>
<#if menuUseCases?? && menuUseCases?has_content>
<#list menuUseCases as pg>
import ${project.packageName}.${pg.moduleSlug}.infra.in.ui.pages.${pg.pageSlug}.${pg.className};
</#list>
</#if>
<#list menuCruds![] as crud>
import ${project.packageName}.${crud.moduleSlug}.infra.in.ui.pages.${crud.slug}.${crud.name}CrudOrchestrator;
</#list>
<#if adapter.menuItems?has_content>
<#list adapter.menuItems as item>
<#if item.route?has_content>
<#assign routeSlug = item.route?lower_case?replace("[^a-z0-9]","",'r')>
<#list service.modules as m>
<#list m.aggregates as agg>
<#assign aggSlug = agg.name?lower_case?replace("[^a-z0-9]","",'r')>
<#if aggSlug == routeSlug>
import ${project.packageName}.${m.slug}.infra.in.ui.pages.${aggSlug}.${agg.name}CrudOrchestrator;
</#if>
</#list>
</#list>
</#if>
</#list>
</#if>

/**
 * Home page generated from UIAdapter: ${adapter.name}
 * Path: ${adapter.path!''}
 */
@Service
@Scope("prototype")
<#if idp??>
<#-- keycloak.js login for this app: one public client per app (provisioned by up.sh),
     named after the app path (or the service when the app lives at root) -->
<#assign pathSlug = (adapter.path!'')?replace("^/","",'r')?replace("[^a-z0-9-]","",'r')>
<#assign appClientId = pathSlug?has_content?then(pathSlug, service.name?lower_case?replace("[^a-z0-9]","-",'r'))>
@KeycloakSecured(url = "${idp.url}", realm = "${idp.realm}", clientId = "${appClientId}")
</#if>
<#if ui??>
<#assign uiPath = (ui.path?has_content)?then(ui.path, (adapter.path)!'')>
@UI(<#if ui.indexHtmlPath?has_content || ui.frontendComponentPath?has_content>value = "${uiPath}"<#if ui.indexHtmlPath?has_content>, indexHtmlPath = "${ui.indexHtmlPath}"</#if><#if ui.frontendComponentPath?has_content>, frontendComponentPath = "${ui.frontendComponentPath}"</#if><#else>"${uiPath}"</#if>)
@Title("${adapter.title!ui.name}")
<#else>
@UI("${adapter.path!''}")
@Title("${adapter.title!service.name}")
</#if>
public class Home<#if homePage??> extends ${homePage.className}</#if><#if idp??> implements WidgetSupplier</#if> {

<#if menuPages?? && menuPages?has_content>
<#list menuPages as pg>
    @Menu
    ${pg.className} ${pg.field};

</#list>
</#if>
<#if menuUseCases?? && menuUseCases?has_content>
<#list menuUseCases as pg>
    @Menu
<#if pg.roles?has_content>
    @io.mateu.uidl.annotations.EyesOnly(roles = {<#list pg.roles as role>"${role}"<#sep>, </#sep></#list>})
</#if>
    ${pg.className} ${pg.field};

</#list>
</#if>
<#if adapter.menuItems?has_content>
<#list adapter.menuItems as item>
<#if item.route?has_content>
<#assign routeSlug = item.route?lower_case?replace("[^a-z0-9]","",'r')>
<#assign fieldName = item.label?lower_case?replace("[^a-z0-9]","_",'r')?replace("_+","_",'r')>
<#list service.modules as m>
<#list m.aggregates as agg>
<#assign aggSlug = agg.name?lower_case?replace("[^a-z0-9]","",'r')>
<#if aggSlug == routeSlug>
    @Menu
    ${agg.name}CrudOrchestrator ${fieldName};

</#if>
</#list>
</#list>
</#if>
</#list>
</#if>
<#list menuListings![] as listing>
    @Menu
    @io.mateu.uidl.annotations.Label("${listing.label}")
    ${project.packageName}.${listing.moduleSlug}.infra.in.ui.pages.${listing.slug}.${listing.className} ${listing.field};

</#list>
<#list menuCruds![] as crud>
    @Menu
<#if crud.label?has_content>
    @io.mateu.uidl.annotations.Label("${crud.label}")
</#if>
    ${crud.name}CrudOrchestrator ${crud.field};

</#list>
<#if !(menuPages?? && menuPages?has_content) && !(adapter.menuItems?has_content)>
    // TODO: add menu items
</#if>
<#assign welcomeLines = []>
<#list service.modules![] as m>
<#if m.description?? && m.description?has_content><#assign welcomeLines = welcomeLines + [m.description]></#if>
</#list>
<#if welcomeLines?has_content>

    /** Default home: what this part of the system is about (its bounded contexts). */
    Text welcome = new Text("${welcomeLines?join("\n\n")?j_string}");
</#if>
<#if idp??>

    /** The user widget: who is logged in (from the keycloak JWT) and a way out. */
    @Override
    public List<Component> widgets(HttpRequest httpRequest) {
        List<Component> widgets = new ArrayList<>();
        var authorization = httpRequest.getHeaderValue("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            var token = authorization.substring("Bearer ".length());
            var payload = new String(Base64.getDecoder().decode(token.split("\\.")[1]));
            var values = fromJson(payload);
            var nombre = values.get("name") != null ? values.get("name") : values.get("preferred_username");
            var detalle = values.get("email") != null ? "Email: " + values.get("email") : "Usuario: " + nombre;
            widgets.add(Popover.builder()
                    .wrapped(Text.builder().text("Hola, " + nombre)
                            .style("margin-right: 20px;")
                            .build())
                    .content(VerticalLayout.builder().content(List.of(
                                    new Text(detalle),
                                    new Anchor("Logout", "javascript: window.logout();"))
                            ).spacing(true)
                            .padding(true)
                            .build())
                    .build());
        }
        return widgets;
    }
</#if>
}
