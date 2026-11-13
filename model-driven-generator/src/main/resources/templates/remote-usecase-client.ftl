package ${project.packageName}.${module.slug}.application.out.remote;

/**
 * The ${remote.className} use case of the ${remote.service} <#if remote.external!false>external system<#else>service</#if>, as this context calls it: over
 * HTTP, with its own copy of the request and the response — the two share no code.
 */
public interface ${remote.className}Client {

    record Request(<#list remote.request as f>${f.javaType} ${f.name}<#sep>, </#sep></#list>) {}

<#if remote.hasResponse>
    /**
     * What it answers.
<#list remote.response as f><#if (f.shape!"")?has_content>
     * <p>{@code ${f.name}}: ${f.shape}.
</#if></#list>
     */
    record Response(<#list remote.response as f>${f.javaType} ${f.name}<#sep>, </#sep></#list>) {}

    Response call(Request request);
<#else>
    void call(Request request);
</#if>
}
