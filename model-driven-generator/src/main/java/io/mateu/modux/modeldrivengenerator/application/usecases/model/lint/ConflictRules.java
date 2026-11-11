package io.mateu.modux.modeldrivengenerator.application.usecases.model.lint;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

/**
 * Declarations that each look fine alone but collide once generated: two elements that become the
 * same class, package, artifact or port, or a name Java cannot compile. Every finding here is an
 * ERROR — the generated code would not build, or two services would fight over a port — so
 * generation stops on it instead of leaving a compiler error to explain the model.
 */
public final class ConflictRules {

    private ConflictRules() {}

    public static List<LintRule> all() {
        return List.of(new TypeNameCollision(), new FieldNameConflict(), new ServiceCollision(),
                new ContextPackageCollision());
    }

    /** One named thing of the model, as far as these rules care. */
    record Named(String type, String id, String name) {}

    /** The Java type name the generator derives from a model name (mirrors GenerateCodeUseCase.toTypeName). */
    static String typeName(String name) {
        if (name == null || name.isBlank()) return "";
        var sb = new StringBuilder();
        boolean upperNext = true;
        for (var c : name.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                sb.append(upperNext ? Character.toUpperCase(c) : c);
                upperNext = false;
            } else {
                upperNext = true;
            }
        }
        return sb.toString();
    }

    /** The service slug that names its directory and artifact (mirrors GenerateCodeUseCase.serviceName). */
    static String serviceSlug(String name) {
        return name == null ? "" : name.toLowerCase().replaceAll("[\\s_]+", "-");
    }

    /** The package segment of a bounded context (mirrors GenerateCodeUseCase.boundedContextSlug). */
    static String contextSlug(String name) {
        return name == null ? "" : name.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    static final Set<String> JAVA_KEYWORDS = Set.of(
            "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
            "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
            "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
            "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
            "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void",
            "volatile", "while", "true", "false", "null", "_");

    /** Groups by key, keeping only the keys more than one element maps to. */
    static <T> Map<String, List<T>> clashes(Collection<T> items, Function<T, String> key) {
        var groups = new LinkedHashMap<String, List<T>>();
        for (var item : items) {
            var k = key.apply(item);
            if (k == null || k.isEmpty()) continue;
            groups.computeIfAbsent(k, x -> new ArrayList<>()).add(item);
        }
        groups.values().removeIf(g -> g.size() < 2);
        return groups;
    }

    static String describe(List<Named> group) {
        return String.join(", ", group.stream().map(n -> n.type() + " '" + n.name() + "'").toList());
    }

    private static <T> List<T> nn(List<T> list) {
        return list != null ? list : List.of();
    }

    private static <T> Map<String, T> byId(List<T> list, Function<T, String> id) {
        var map = new LinkedHashMap<String, T>();
        for (var t : nn(list)) map.putIfAbsent(id.apply(t), t);
        return map;
    }

    /**
     * Elements of one context whose classes share a package: their Java names must differ, case
     * aside (macOS and Windows file systems cannot hold Pedido.java next to PEDIDO.java).
     *
     * @param groups for each context, the families whose classes share a package
     */
    static List<LintFinding> typeNameClashes(String ruleId, String context, List<List<Named>> groups) {
        var findings = new ArrayList<LintFinding>();
        for (var family : groups) {
            clashes(family, n -> typeName(n.name()).toLowerCase()).forEach((k, group) -> findings.add(
                    new LintFinding(ruleId, LintSeverity.ERROR, group.get(0).type(), group.get(0).id(),
                            group.get(0).name(), "In context '" + context + "', " + describe(group)
                            + " would all generate the class " + typeName(group.get(0).name())
                            + " — rename one.")));
        }
        return findings;
    }

    static class TypeNameCollision implements LintRule {
        public String id() { return "type-name-collision"; }
        public String description() { return "Two elements of a context must not generate the same class"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var aggregates = byId(m.aggregates(), a -> a.id());
            var entities = byId(m.entities(), e -> e.id());
            var useCases = byId(m.useCases(), u -> u.id());
            var events = byId(m.domainEvents(), e -> e.id());
            var readModels = byId(m.readModels(), r -> r.id());
            var findings = new ArrayList<LintFinding>();
            for (var bc : nn(m.boundedContexts())) {
                var domain = new ArrayList<Named>();
                nn(bc.aggregateIds()).stream().map(aggregates::get).filter(Objects::nonNull)
                        .forEach(a -> domain.add(new Named("Aggregate", a.id(), a.name())));
                nn(bc.entityIds()).stream().map(entities::get).filter(Objects::nonNull)
                        .forEach(e -> domain.add(new Named("Entity", e.id(), e.name())));
                var ucs = nn(bc.useCaseIds()).stream().map(useCases::get).filter(Objects::nonNull)
                        .map(u -> new Named("UseCase", u.id(), u.name())).toList();
                var evs = nn(bc.domainEventIds()).stream().map(events::get).filter(Objects::nonNull)
                        .map(e -> new Named("DomainEvent", e.id(), e.name())).toList();
                var rms = nn(bc.readModelIds()).stream().map(readModels::get).filter(Objects::nonNull)
                        .map(r -> new Named("ReadModel", r.id(), r.name())).toList();
                findings.addAll(typeNameClashes(id(), bc.name(), List.of(domain, ucs, evs, rms)));
            }
            return findings;
        }
    }

    /** The fields of one model: names Java can compile, none repeated. */
    static List<LintFinding> fieldConflicts(String ruleId, String modelId, String modelName, List<String> fieldNames) {
        var findings = new ArrayList<LintFinding>();
        for (var name : fieldNames) {
            if (name != null && JAVA_KEYWORDS.contains(name)) {
                findings.add(new LintFinding(ruleId, LintSeverity.ERROR, "Model", modelId, modelName,
                        "Field '" + name + "' is a Java keyword — the generated record would not compile. Rename it."));
            }
        }
        clashes(fieldNames, n -> n == null ? null : n.toLowerCase()).forEach((k, group) ->
                findings.add(new LintFinding(ruleId, LintSeverity.ERROR, "Model", modelId, modelName,
                        "Field '" + group.get(0) + "' is declared " + group.size()
                                + " times (case aside) — a record cannot hold both.")));
        return findings;
    }

    static class FieldNameConflict implements LintRule {
        public String id() { return "field-name-conflict"; }
        public String description() { return "A model's fields must be distinct and not Java keywords"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var model : nn(m.models())) {
                var names = nn(model.fields()).stream().map(f -> f.name()).toList();
                findings.addAll(fieldConflicts(id(), model.id(), model.name(), names));
            }
            return findings;
        }
    }

    /** One service as far as collisions go: what names its artifact and where it listens. */
    record ServiceRef(String id, String name, Integer port) {}

    static List<LintFinding> serviceClashes(String ruleId, List<ServiceRef> services) {
        var findings = new ArrayList<LintFinding>();
        clashes(services, s -> serviceSlug(s.name())).forEach((slug, group) -> findings.add(
                new LintFinding(ruleId, LintSeverity.ERROR, "Service", group.get(0).id(), group.get(0).name(),
                        String.join(", ", group.stream().map(s -> "'" + s.name() + "'").toList())
                                + " would all generate the project '" + slug + "' — one overwrites the other.")));
        clashes(services, s -> s.port() == null ? null : String.valueOf(s.port())).forEach((port, group) ->
                findings.add(new LintFinding(ruleId, LintSeverity.ERROR, "Service", group.get(0).id(),
                        group.get(0).name(), String.join(", ", group.stream().map(s -> "'" + s.name() + "'").toList())
                                + " all listen on port " + port + " — run together (up.sh, the gateway's"
                                + " defaults) only one starts. Give each its own port.")));
        return findings;
    }

    static class ServiceCollision implements LintRule {
        public String id() { return "service-collision"; }
        public String description() { return "Services must have distinct names and ports"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return serviceClashes(id(), nn(m.services()).stream()
                    .map(s -> new ServiceRef(s.id(), s.name(), s.port())).toList());
        }
    }

    static List<LintFinding> contextClashes(String ruleId, List<Named> contexts) {
        var findings = new ArrayList<LintFinding>();
        clashes(contexts, c -> contextSlug(c.name())).forEach((slug, group) -> findings.add(
                new LintFinding(ruleId, LintSeverity.ERROR, "BoundedContext", group.get(0).id(), group.get(0).name(),
                        describe(group) + " would share the package '" + slug + "' — their classes would mix. Rename one.")));
        return findings;
    }

    static class ContextPackageCollision implements LintRule {
        public String id() { return "context-package-collision"; }
        public String description() { return "Bounded contexts must generate distinct packages"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return contextClashes(id(), nn(m.boundedContexts()).stream()
                    .map(c -> new Named("BoundedContext", c.id(), c.name())).toList());
        }
    }
}
