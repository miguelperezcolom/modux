package io.mateu.modux.figma;

import java.util.ArrayList;
import java.util.List;

/**
 * Emits a Mateu Python view class from a designed {@link Screen}. Field markers ride in
 * Annotated[...]; components that are fluent-only in the Python port come out as TODOs pointing
 * at mateu_uidl.components.
 */
public class PythonEmitter {

    public String emit(Screen screen) {
        Names names = new Names();
        StringBuilder body = new StringBuilder();
        List<String> pendingSection = new ArrayList<>();
        for (Screen.Node node : screen.content()) emitNode(node, body, pendingSection, names);

        String className = Names.pascal(screen.name());
        StringBuilder out = new StringBuilder();
        out.append("\"\"\"Generated from the Figma frame \"").append(screen.name())
           .append("\" by figma-maven-plugin — review the TODOs before shipping.\"\"\"\n\n");
        out.append("from typing import Annotated\n");
        out.append("from mateu_uidl import (\n");
        out.append("    BulletedList, Label, Multiline, PlainText, Section, SeparatorBefore, title, ui,\n");
        out.append(")\n\n\n");
        out.append("@ui(\"").append(screen.route().replaceFirst("^/", "")).append("\")\n");
        out.append("@title(\"").append(Names.escape(screen.name())).append("\")\n");
        if (screen.template() != null) out.append("# TODO page template ").append(screen.template())
                .append(": compose it in component(); its slots are flattened below\n");
        if ("wizard".equals(screen.type())) out.append("# TODO wizard frame: extend Wizard and assign Step(n) markers\n");
        out.append("class ").append(className).append(":\n");
        out.append(body.length() > 0 ? body : "    pass\n");
        return out.toString();
    }

    private void emitNode(Screen.Node node, StringBuilder out, List<String> pending, Names names) {
        switch (node.kind()) {
            case "section" -> {
                StringBuilder section = new StringBuilder("Section(\"")
                        .append(Names.escape(node.title() == null ? "" : node.title())).append("\"");
                if (node.boolParam("propertyList")) section.append(", property_list=True");
                if (node.boolParam("frameless")) section.append(", frameless=True");
                if (node.param("zone") != null) section.append(", zone=\"").append(node.param("zone")).append("\"");
                section.append(")");
                pending.add(section.toString());
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names);
            }
            case "field" -> {
                String label = node.label() == null ? "campo" : node.label();
                String name = names.unique(node.fieldId() != null ? Names.snake(node.fieldId()) : Names.snake(label));
                List<String> markers = new ArrayList<>(pending);
                pending.clear();
                markers.add("Label(\"" + Names.escape(label) + "\")");
                if ("textarea".equals(node.stereotype())) markers.add("Multiline()");
                if ("plainText".equals(node.stereotype())) markers.add("PlainText()");
                out.append("    ").append(name).append(": Annotated[").append(pyType(node)).append(", ")
                   .append(String.join(", ", markers)).append("] = None\n\n");
            }
            case "bulletedList" -> {
                String name = names.unique(node.fieldId() != null ? Names.snake(node.fieldId()) : "items");
                List<String> markers = new ArrayList<>(pending);
                pending.clear();
                markers.add("BulletedList()");
                out.append("    ").append(name).append(": Annotated[list[str], ")
                   .append(String.join(", ", markers)).append("] = []  # TODO items\n\n");
            }
            case "separator" -> pending.add("SeparatorBefore()");
            case "button" -> {
                String label = node.label() == null ? "accion" : node.label();
                out.append("    # TODO @button method for \"").append(Names.escape(label)).append("\"\n\n");
            }
            case "verticalLayout", "horizontalLayout", "zones", "pageHeader", "wizard", "app" -> {
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names);
            }
            default -> {
                if (!node.children().isEmpty()) {
                    for (Screen.Node child : node.children()) emitNode(child, out, pending, names);
                    return;
                }
                out.append("    # TODO ").append(node.kind())
                    .append(": compose with mateu_uidl.components.").append(Names.pascal(node.kind()))
                    .append(node.text() != null ? " — text \"" + Names.escape(node.text()) + "\"" : "").append("\n\n");
            }
        }
    }

    private static String pyType(Screen.Node node) {
        String dataType = node.param("dataType");
        if (dataType == null) dataType = "string";
        return switch (dataType) {
            case "integer" -> "int | None";
            case "number", "money" -> "float | None";
            case "bool" -> "bool";
            case "date" -> "date | None";
            case "dateTime" -> "datetime | None";
            default -> "str | None";
        };
    }
}
