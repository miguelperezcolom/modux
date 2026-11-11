package ${project.packageName}.infra.in.ui;

import io.mateu.uidl.annotations.Menu;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.annotations.UI;
<#if idp??>
import io.mateu.uidl.data.Anchor;
import io.mateu.uidl.data.Popover;
import io.mateu.uidl.data.Text;
import io.mateu.uidl.data.VerticalLayout;
import io.mateu.uidl.fluent.Component;
import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.WidgetSupplier;
import java.util.ArrayList;
import java.util.List;

</#if>
<#list menuModules as m>
import ${project.packageName}.${m.slug}.infra.in.ui.menu.${m.className};
</#list>
<#if uiPages?? && uiPages?has_content>
<#list uiPages as pg>
import ${project.packageName}.${pg.moduleSlug}.infra.in.ui.pages.${pg.pageSlug}.${pg.className};
</#list>
</#if>

<#if idp??>
</#if>
<#if ui??>
<#assign uiPath = (ui.path?has_content)?then(ui.path, '')>
@UI(<#if ui.indexHtmlPath?has_content || ui.frontendComponentPath?has_content>value = "${uiPath}"<#if ui.indexHtmlPath?has_content>, indexHtmlPath = "${ui.indexHtmlPath}"</#if><#if ui.frontendComponentPath?has_content>, frontendComponentPath = "${ui.frontendComponentPath}"</#if><#else>"${uiPath}"</#if>)
@Title("${ui.name}")
<#else>
@UI("")
@Title("${service.name}")
</#if>
public class Home<#if idp??> implements WidgetSupplier</#if> {

<#list menuModules as m>
    @Menu
    ${m.className} ${m.field};
</#list>
<#if uiPages?? && uiPages?has_content>
<#list uiPages as pg>
    @Menu
    ${pg.className} ${pg.field};
</#list>
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
