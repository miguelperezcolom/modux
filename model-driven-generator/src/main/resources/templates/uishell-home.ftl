package ${shellPackage}.infra.in.ui;

import io.mateu.uidl.annotations.FavIcon;
import io.mateu.uidl.annotations.Logo;
import io.mateu.uidl.annotations.Menu;
import io.mateu.uidl.annotations.PageTitle;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.annotations.UI;
import io.mateu.uidl.data.RemoteMenu;
<#if idp?? || (project.objective?? && project.objective?has_content)>
import io.mateu.uidl.data.Text;
</#if>
<#if idp??>
import io.mateu.uidl.annotations.KeycloakSecured;
import io.mateu.uidl.data.Anchor;
import io.mateu.uidl.data.Popover;
import io.mateu.uidl.data.VerticalLayout;
import io.mateu.uidl.fluent.Component;
import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.WidgetSupplier;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import static io.mateu.core.infra.JsonSerializer.fromJson;
</#if>

@UI("")
@Title("${shell.title!shell.name}")
@PageTitle("${shell.title!shell.name}")
@FavIcon("/images/logo.svg")
@Logo("/images/logo.svg")
<#if idp??>
@KeycloakSecured(url = "${idp.url}", realm = "${idp.realm}", clientId = "shell")
</#if>
public class ${shellClassName}Home<#if idp??> implements WidgetSupplier</#if> {

<#if resolvedServices?has_content>
<#list resolvedServices as svc>
    @Menu
    RemoteMenu ${svc.name?lower_case?replace("[^a-z0-9]","_",'r')} = new RemoteMenu("/_${svc.name?lower_case?replace("[^a-z0-9]","-",'r')}").withLabel("${svc.name}").withPath("${svc.appPath}");

</#list>
<#else>
    // TODO: add RemoteMenu fields for each service
    // @Menu
    // RemoteMenu myService = new RemoteMenu("/_my-service").withLabel("My Service");
</#if>
<#if project.objective?? && project.objective?has_content>

    /** Default home: what this system is about (the model's project objective). */
    Text welcome = new Text("${project.objective?j_string}");
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
