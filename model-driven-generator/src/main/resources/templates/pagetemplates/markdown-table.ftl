<#-- A list's columns, as the Java pairs {name, label} its Markdown table is drawn with. -->
<#function columnsOf rowModel>
<#local out = []>
<#list (rowModel.fields)![] as c><#local out = out + ['new String[] {"' + c.name + '", "' + ((c.label?? && c.label?has_content)?then(c.label, c.name?cap_first))?j_string + '"}']></#list>
<#return "List.of(" + out?join(", ") + ")">
</#function>
<#-- A static helper that draws rows (JSON) as a Markdown table with those columns. -->
<#macro markdownTableHelper>
    /** Rows (a JSON array) as a Markdown table, one column per {name, label}. */
    @lombok.SneakyThrows
    static String tableOf(ObjectMapper objectMapper, String json, List<String[]> columns) {
        if (json == null || json.isBlank()) return "_—_";
        List<Map<String, Object>> rows = objectMapper.readValue(json,
                objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
        if (rows.isEmpty()) return "_—_";
        var out = new StringBuilder("|");
        columns.forEach(c -> out.append(" ").append(c[1]).append(" |"));
        out.append("\n|");
        columns.forEach(c -> out.append("---|"));
        out.append("\n");
        for (var row : rows) {
            out.append("|");
            for (var c : columns) {
                var value = row.get(c[0]);
                var text = value == null ? "" : value instanceof Boolean b ? (b ? "✓" : "") : String.valueOf(value);
                out.append(" ").append(text.replace("|", "\\|").replace("\n", " ")).append(" |");
            }
            out.append("\n");
        }
        return out.toString();
    }
</#macro>
