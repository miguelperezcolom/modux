package io.mateu.modux.figma;

import java.util.ArrayList;
import java.util.List;

/**
 * Emits a Mateu Java view class from a designed {@link Screen}: fields with their labels and
 * sections exactly as composed in Figma. Display components with rich payloads (status lists,
 * entity headers…) are emitted as {@code Callable<Component>} skeletons for the developer to
 * finish; wizard/crud frames come out as annotated skeletons too.
 */
public class JavaEmitter {

    public String emit(Screen screen, String basePackage) {
        Names names = new Names();
        StringBuilder body = new StringBuilder();
        List<String> pending = new ArrayList<>(); // annotations waiting for the next field
        for (Screen.Node node : screen.content()) emitNode(node, body, pending, names, 1);

        String className = Names.pascal(screen.name());
        boolean wizard = "wizard".equals(screen.type());
        StringBuilder out = new StringBuilder();
        out.append("package ").append(basePackage).append(";\n\n");
        out.append("import io.mateu.uidl.annotations.*;\n");
        out.append("import io.mateu.uidl.data.*;\n");
        out.append("import io.mateu.uidl.fluent.Component;\n");
        out.append("import java.util.List;\n");
        out.append("import java.util.concurrent.Callable;\n\n");
        out.append("/** Generated from the Figma frame \"").append(screen.name())
           .append("\" by figma-maven-plugin — review the TODOs before shipping. */\n");
        out.append("@UI(\"").append(screen.route()).append("\")\n");
        out.append("@Title(\"").append(Names.escape(screen.name())).append("\")\n");
        if (screen.template() != null) {
            out.append("// Page template ").append(screen.template()).append(": in YAML declare `template: {type: ")
               .append(screen.template()).append("}` on the Form; in Java compose the matching archetype.\n");
            out.append("// Its slots are flattened below (fields, texts and actions only).\n");
        }
        if (wizard) {
            out.append("// TODO wizard frame: extend io.mateu.core...orchestrators.wizard.Wizard,\n");
            out.append("// declare one field per WizardStep and move the sections below into the steps\n");
        }
        out.append("public class ").append(className).append(" {\n\n");
        out.append(body);
        out.append("}\n");
        return out.toString();
    }

    private void emitNode(Screen.Node node, StringBuilder out, List<String> pending, Names names, int depth) {
        switch (node.kind()) {
            case "section" -> {
                StringBuilder section = new StringBuilder("  @Section(value = \"")
                        .append(Names.escape(node.title() == null ? "" : node.title())).append("\"");
                if (node.boolParam("propertyList")) section.append(", propertyList = true");
                if (node.boolParam("frameless")) section.append(", frameless = true");
                if (node.boolParam("sticky")) section.append(", sticky = true");
                if (node.param("zone") != null) section.append(", zone = \"").append(node.param("zone")).append("\"");
                section.append(")");
                pending.add(section.toString());
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names, depth + 1);
            }
            case "field" -> {
                flush(pending, out);
                String label = node.label() == null ? "campo" : node.label();
                String name = names.unique(node.fieldId() != null ? node.fieldId() : Names.camel(label));
                out.append("  @Label(\"").append(Names.escape(label)).append("\")\n");
                appendStereotypeAnnotations(node.stereotype(), out);
                out.append("  ").append(javaType(node)).append(" ").append(name).append(";\n\n");
            }
            case "notice" -> {
                flush(pending, out);
                String name = names.unique(node.fieldId() != null ? node.fieldId() : Names.camel(node.text() == null ? "aviso" : node.text()));
                out.append("  @Notice(theme = \"").append(orDefault(node.param("theme"), "info")).append("\"");
                if (node.boolParam("slim")) out.append(", slim = true");
                if (node.boolParam("fullWidth")) out.append(", fullWidth = true");
                if (node.param("actionId") != null) out.append(", actionId = \"").append(node.param("actionId")).append("\", actionLabel = \"").append(Names.escape(orDefault(node.param("actionLabel"), "Action"))).append("\"");
                out.append(")\n");
                out.append("  String ").append(name).append(" = \"").append(Names.escape(orDefault(node.text(), ""))).append("\";\n\n");
            }
            case "text" -> {
                flush(pending, out);
                String name = names.unique(Names.camel(orDefault(node.text(), "texto")));
                out.append("  @Text(container = TextContainer.p");
                if (node.param("size") != null && !"m".equals(node.param("size"))) out.append(", size = TextSize.").append(node.param("size"));
                if (node.boolParam("noMargins")) out.append(", noMargins = true");
                out.append(")\n");
                out.append("  String ").append(name).append(" = \"").append(Names.escape(orDefault(node.text(), ""))).append("\";\n\n");
            }
            case "bulletedList" -> {
                flush(pending, out);
                String name = names.unique(node.fieldId() != null ? node.fieldId() : "items");
                out.append("  @BulletedList\n  List<String> ").append(name).append(" = List.of(); // TODO items\n\n");
            }
            case "separator" -> pending.add("  @SeparatorBefore");
            case "button" -> {
                flush(pending, out);
                String label = orDefault(node.label(), "Acción");
                String method = names.unique(node.param("actionId") != null ? node.param("actionId") : Names.camel(label));
                out.append("  @Toolbar\n  @Label(\"").append(Names.escape(label)).append("\")\n");
                out.append("  void ").append(method).append("() {\n    // TODO action\n  }\n\n");
            }
            case "crud" -> {
                flush(pending, out);
                out.append("  // TODO crud listing \"").append(Names.escape(orDefault(node.title(), ""))).append("\": extract into its own class\n");
                out.append("  //   @UI(\"").append("/").append(FigmaScreenReader.kebab(orDefault(node.title(), "listado"))).append("\") class … extends AutoCrud<Row> { … }\n\n");
            }
            case "wizard", "pageHeader", "app" -> {
                // structural markers handled at class level (title/route); nothing to emit inline
                if (node.title() != null && "pageHeader".equals(node.kind())) {
                    // page header title already drives @Title; subtitle if present:
                    if (node.param("subtitle") != null) {
                        flush(pending, out);
                        out.append("  // @Subtitle(\"").append(Names.escape(node.param("subtitle"))).append("\") on the class\n\n");
                    }
                }
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names, depth);
            }
            case "verticalLayout", "horizontalLayout", "zones" -> {
                for (Screen.Node child : node.children()) emitNode(child, out, pending, names, depth);
            }
            default -> {
                if (!node.children().isEmpty()) {
                    // a container the emitter has no annotation for (page template, slot, tabs…):
                    // its content still comes out
                    for (Screen.Node child : node.children()) emitNode(child, out, pending, names, depth);
                    return;
                }
                flush(pending, out);
                String name = names.unique(Names.camel(orDefault(node.title(), node.kind())));
                out.append("  @Label(\"\")\n");
                out.append("  Callable<Component> ").append(name).append(" = () ->\n");
                out.append("      ").append(Names.pascal(node.kind())).append(".builder()");
                if (node.title() != null) out.append(".title(\"").append(Names.escape(node.title())).append("\")");
                if (node.text() != null) out.append(".text(\"").append(Names.escape(node.text())).append("\")");
                out.append(".build(); // TODO complete the ").append(node.kind()).append(" payload\n\n");
            }
        }
    }

    private static void appendStereotypeAnnotations(String stereotype, StringBuilder out) {
        if (stereotype == null) return;
        switch (stereotype) {
            case "textarea" -> out.append("  @Multiline\n");
            case "plainText" -> out.append("  @PlainText\n");
            case "radio" -> out.append("  @UseRadioButtons\n");
            case "uploadableImage" -> out.append("  @UploadableImage\n");
            case "signature" -> out.append("  @Signature\n");
            case "camera" -> out.append("  @PhotoCapture\n");
            case "treeSelect" -> out.append("  @TreeSelect\n");
            default -> { /* select/combobox/etc. derive from the field type */ }
        }
    }

    private static String javaType(Screen.Node node) {
        String dataType = node.param("dataType");
        if (dataType == null) dataType = "string";
        return switch (dataType) {
            case "integer" -> "Integer";
            case "number", "money" -> "Double";
            case "bool" -> "boolean";
            case "date" -> "java.time.LocalDate";
            case "dateTime" -> "java.time.LocalDateTime";
            case "time" -> "java.time.LocalTime";
            default -> "String";
        };
    }

    private static void flush(List<String> pending, StringBuilder out) {
        for (String annotation : pending) out.append(annotation).append("\n");
        pending.clear();
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
