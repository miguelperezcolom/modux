package ${project.packageName}.${module.slug}.infra.in.projection;

import ${project.packageName}.${module.slug}.infra.out.persistence.${readModel.entityClassName};
import ${project.packageName}.${module.slug}.infra.out.persistence.${readModel.className}EntityRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * The ${readModel.name} read model mirrors <#if poll.kind == "api">what ${poll.system}'s ${poll.source} answers (GET ${poll.path} at
 * {@code ${poll.urlProperty}})<#else>the ${poll.source} table of ${poll.system} (JDBC at {@code ${poll.jdbcProperty}})</#if>:
 * every {@code modux.poll.interval} (one minute by default) it reads all the rows, upserts them by
 * their {@code id} and drops the ones that are gone. Columns match the read model's fields by name,
 * ignoring case and underscores ({@code precio_unitario} is {@code precioUnitario}).
 */
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class ${className} {

    private static final Logger log = LoggerFactory.getLogger(${className}.class);

    final ${readModel.className}EntityRepository repository;

    /** When the source last answered (null until it does): what «data as of» shows. */
    private volatile java.time.LocalDateTime lastSuccess;
    /** Why the last attempt failed, or null when it did not. */
    private volatile String lastError;

    public java.time.LocalDateTime lastSuccess() {
        return lastSuccess;
    }

    public String lastError() {
        return lastError;
    }

<#if poll.kind == "api">
    @Value("${r"${"}${poll.urlProperty}:${poll.defaultUrl}${r"}"}")
    String baseUrl;
<#else>
    @Value("${r"${"}${poll.jdbcProperty}:${r"}"}")
    String jdbcUrl;

    @Value("${r"${"}${poll.userProperty}:${r"}"}")
    String jdbcUser;

    @Value("${r"${"}${poll.passwordProperty}:${r"}"}")
    String jdbcPassword;
</#if>

    @Scheduled(initialDelayString = "${r"${modux.poll.initial-delay:PT5S}"}", fixedDelayString = "${r"${modux.poll.interval:PT60S}"}")
    public void poll() {
        List<Map<String, Object>> rows;
        try {
            rows = fetch();
        } catch (Exception e) {
            // the source is down: keep what we have, try again next time
            log.warn("${className}: could not read the source: {}", e.toString());
            lastError = e.toString();
            return;
        }
        var seen = new HashSet<String>();
        for (var row : rows) {
            var id = value(row, "id");
            if (id == null) continue;
            seen.add(String.valueOf(id));
            var entity = repository.findById(String.valueOf(id)).orElseGet(${readModel.entityClassName}::new);
            entity.setId(String.valueOf(id));
<#list fields as f>
<#if f.name != "id">
<#if !f.basicType>
            entity.set${f.name?cap_first}Id(text(value(row, "${f.name}")));
<#elseif f.type == "integer">
            entity.set${f.name?cap_first}(value(row, "${f.name}") == null ? null : Integer.valueOf(text(value(row, "${f.name}")).replaceAll("\\.0+$", "")));
<#elseif f.type == "number" || f.type == "money">
            entity.set${f.name?cap_first}(value(row, "${f.name}") == null ? null : new java.math.BigDecimal(text(value(row, "${f.name}"))));
<#elseif f.type == "bool">
            entity.set${f.name?cap_first}(value(row, "${f.name}") == null ? null : Boolean.valueOf(text(value(row, "${f.name}"))));
<#elseif f.type == "date">
            entity.set${f.name?cap_first}(value(row, "${f.name}") == null ? null : java.time.LocalDate.parse(text(value(row, "${f.name}")).substring(0, 10)));
<#elseif f.type == "dateTime">
            entity.set${f.name?cap_first}(value(row, "${f.name}") instanceof java.sql.Timestamp t ? t.toLocalDateTime()
                    : value(row, "${f.name}") == null ? null : java.time.LocalDateTime.parse(text(value(row, "${f.name}")).replace(' ', 'T')));
<#elseif f.type == "time">
            entity.set${f.name?cap_first}(value(row, "${f.name}") == null ? null : java.time.LocalTime.parse(text(value(row, "${f.name}"))));
<#else>
            entity.set${f.name?cap_first}(text(value(row, "${f.name}")));
</#if>
</#if>
</#list>
            repository.save(entity);
        }
        var gone = repository.findAll().stream().filter(e -> !seen.contains(e.getId())).toList();
        repository.deleteAll(gone);
        lastSuccess = java.time.LocalDateTime.now();
        lastError = null;
        log.debug("${className}: {} rows, {} gone", rows.size(), gone.size());
    }

<#if poll.kind == "api">
    /** The rows the source answers: a JSON array, or an object carrying it as items/content/data. */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetch() {
        var body = org.springframework.web.client.RestClient.create(baseUrl).get().uri("${poll.path}").retrieve().body(Object.class);
        Object list = body;
        if (body instanceof Map<?, ?> map) {
            list = map.containsKey("items") ? map.get("items") : map.containsKey("content") ? map.get("content") : map.get("data");
        }
        var rows = new ArrayList<Map<String, Object>>();
        if (list instanceof List<?> items) {
            for (var item : items) if (item instanceof Map<?, ?> m) rows.add((Map<String, Object>) m);
        }
        return rows;
    }
<#else>
    /** Every row of the table, column by column. */
    private List<Map<String, Object>> fetch() throws java.sql.SQLException {
        if (jdbcUrl == null || jdbcUrl.isBlank()) throw new IllegalStateException("${poll.jdbcProperty} is not set");
        var rows = new ArrayList<Map<String, Object>>();
        try (var connection = java.sql.DriverManager.getConnection(jdbcUrl, jdbcUser, jdbcPassword);
             var statement = connection.createStatement();
             var result = statement.executeQuery("SELECT * FROM ${poll.source}")) {
            var meta = result.getMetaData();
            while (result.next()) {
                var row = new LinkedHashMap<String, Object>();
                for (int i = 1; i <= meta.getColumnCount(); i++) row.put(meta.getColumnLabel(i), result.getObject(i));
                rows.add(row);
            }
        }
        return rows;
    }
</#if>

    /** The row's value for a field: same name ignoring case and underscores. */
    private static Object value(Map<String, Object> row, String field) {
        var wanted = field.replace("_", "").toLowerCase();
        for (var e : row.entrySet()) {
            if (e.getKey() != null && e.getKey().replace("_", "").toLowerCase().equals(wanted)) return e.getValue();
        }
        return null;
    }

    private static String text(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
