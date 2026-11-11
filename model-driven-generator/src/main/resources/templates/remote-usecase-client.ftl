package ${project.packageName}.${module.slug}.application.out.remote;

/**
 * The ${remote.className} use case of the ${remote.service} service, as this context calls it: over
 * HTTP, with its own copy of the request and the response — the two services share no code.
 */
public interface ${remote.className}Client {

    record Request(<#list remote.request as f>${f.javaType} ${f.name}<#sep>, </#sep></#list>) {}

<#if remote.hasResponse>
    record Response(<#list remote.response as f>${f.javaType} ${f.name}<#sep>, </#sep></#list>) {}

    Response call(Request request);
<#else>
    void call(Request request);
</#if>
}
