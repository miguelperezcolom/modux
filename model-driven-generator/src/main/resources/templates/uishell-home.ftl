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
import io.mateu.uidl.data.Anchor;
import io.mateu.uidl.data.Popover;
import io.mateu.uidl.data.VerticalLayout;
import io.mateu.uidl.fluent.Component;
import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.WidgetSupplier;
import java.util.ArrayList;
import java.util.List;

</#if>

@UI("")
@Title("${shell.title!shell.name}")
@PageTitle("${shell.title!shell.name}")
@FavIcon("/images/logo.svg")
@Logo("/images/logo.svg")
<#if idp??>
</#if>
public class ${shellClassName}Home<#if idp??> implements WidgetSupplier</#if> {

<#if resolvedServices?has_content>
<#list resolvedServices as svc>
<#if (svc.apps![])?size gt 1>
<#-- several apps in one service: one menu entry each, all through the service's gateway route -->
<#list svc.apps as app>
    @Menu
    RemoteMenu ${app.field} = new RemoteMenu("${app.route}").withLabel("${app.label?j_string}").withPath("${app.path}");

</#list>
<#else>
    @Menu
    RemoteMenu ${svc.name?lower_case?replace("[^a-z0-9]","_",'r')} = new RemoteMenu("${svc.route}").withLabel("${svc.name}").withPath("${svc.appPath}");

</#if>
</#list>
<#if tasks!false>
    /** The person's tasks of the workflows (EventConductor's worklist), through the gateway. */
    @Menu
    RemoteMenu tareas = new RemoteMenu("/_forms").withLabel("Tareas");

</#if>
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

    /** The user widget: who is logged in and a way out. */
    @Override
    public List<Component> widgets(HttpRequest httpRequest) {
        List<Component> widgets = new ArrayList<>();
        // who signed in at the identity provider: the system's own cookie carries it (ModuxAuthCookie)
        var who = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (who != null && who.isAuthenticated() && !"anonymousUser".equals(who.getPrincipal())) {
            widgets.add(Popover.builder()
                    .wrapped(Text.builder().text("Hola, " + who.getName())
                            .style("margin-right: 20px;")
                            .build())
                    .content(VerticalLayout.builder().content(List.of(
                                    new Text("Usuario: " + who.getName()),
                                    new Anchor("Salir", "/logout"))
                            ).spacing(true)
                            .padding(true)
                            .build())
                    .build());
        }
        return widgets;
    }
</#if>
}
