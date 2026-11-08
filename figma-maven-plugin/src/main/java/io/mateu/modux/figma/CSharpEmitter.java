package io.mateu.modux.figma;

import java.util.ArrayList;
import java.util.List;

/**
 * Emits a Mateu.NET view class from a designed {@link Screen}. The C# surface mirrors the Java
 * one where attributes exist ([Section], [BulletedList], [SeparatorBefore]…); components that are
 * fluent-only in Mateu.NET (Notice, Text with size…) come out as IComponentTreeSupplier TODOs.
 */
public class CSharpEmitter {

    public String emit(Screen screen, String baseNamespace) {
        Names names = new Names();
        StringBuilder body = new StringBuilder();
        List<String> pending = new ArrayList<>();
        for (Screen.Node node : screen.content()) emitNode(node, body, pending, names);

        String className = Names.pascal(screen.name());
        StringBuilder out = new StringBuilder();
        out.append("using Mateu.Uidl;\n\n");
        out.append("namespace ").append(baseNamespace).append(";\n\n");
        out.append("/// <summary>Generated from the Figma frame \"").append(screen.name())
           .append("\" by figma-maven-plugin — review the TODOs before shipping.</summary>\n");
        out.append("[UI(\"").append(screen.route().replaceFirst("^/", "")).append("\"), Title(\"")
           .append(Names.escape(screen.name())).append("\")]\n");
        if (screen.template() != null) out.append("// TODO page template ").append(screen.template())
                .append(": compose it in IComponentTreeSupplier.Component(); its slots are flattened below\n");
        if ("wizard".equals(screen.type())) out.append("// TODO wizard frame: extend Wizard and assign [Step(n)] to the properties\n");
        out.append("public class ").append(className).append("\n{\n");
        out.append(body);
        out.append("}\n");
        return out.toString();
    }

    private void emitNode(Screen.Node node, StringBuilder out, List<String> pending, Names names) {
        switch (node.kind()) {
            case "section" -> {
                StringBuilder section = new StringBuilder("    [Section(\"")
                        .append(Names.escape(node.title() == null ? "" : node.title())).append("\"");
                if (node.boolParam("propertyList")) section.append(", PropertyList = true");
                if (node.boolParam("frameless")) section.append(", Frameless = true");
                if (node.param("zone") != null) section.append(", Zone = \"").append(node.param("zone")).append("\"");
                section.append(")]");
                pending.add(section.toString());
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names);
            }
            case "field" -> {
                flush(pending, out);
                String label = node.label() == null ? "Campo" : node.label();
                String name = names.unique(Names.pascal(node.fieldId() != null ? node.fieldId() : label));
                if ("textarea".equals(node.stereotype())) out.append("    [Multiline]\n");
                if ("plainText".equals(node.stereotype())) out.append("    [PlainText]\n");
                out.append("    public ").append(csType(node)).append(" ").append(name).append(" { get; set; }\n\n");
            }
            case "bulletedList" -> {
                flush(pending, out);
                String name = names.unique(Names.pascal(node.fieldId() != null ? node.fieldId() : "Items"));
                out.append("    [BulletedList]\n    public List<string> ").append(name).append(" { get; set; } = []; // TODO items\n\n");
            }
            case "separator" -> pending.add("    [SeparatorBefore]");
            case "button" -> {
                flush(pending, out);
                String label = node.label() == null ? "Acción" : node.label();
                out.append("    [Button] public Message ").append(names.unique(Names.pascal(label)))
                   .append("() => new(\"TODO\"); // ").append(Names.escape(label)).append("\n\n");
            }
            case "verticalLayout", "horizontalLayout", "zones", "pageHeader", "wizard", "app" -> {
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names);
            }
            default -> {
                if (!node.children().isEmpty()) {
                    for (Screen.Node child : node.children()) emitNode(child, out, pending, names);
                    return;
                }
                flush(pending, out);
                out.append("    // TODO ").append(node.kind()).append(": fluent-only in Mateu.NET — compose it from\n");
                out.append("    // IComponentTreeSupplier.Component(), e.g. new ").append(Names.pascal(node.kind()))
                   .append("(...)").append(node.text() != null ? " with text \"" + Names.escape(node.text()) + "\"" : "").append("\n\n");
            }
        }
    }

    private static String csType(Screen.Node node) {
        String dataType = node.param("dataType");
        if (dataType == null) dataType = "string";
        return switch (dataType) {
            case "integer" -> "int";
            case "number", "money" -> "double";
            case "bool" -> "bool";
            case "date" -> "DateOnly?";
            case "dateTime" -> "DateTime?";
            default -> "string?";
        };
    }

    private static void flush(List<String> pending, StringBuilder out) {
        for (String annotation : pending) out.append(annotation).append("\n");
        pending.clear();
    }
}
