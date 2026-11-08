package io.mateu.modux.plugin;

import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Set;

/**
 * Checks the model's referential integrity before anything is generated from it.
 *
 * <p>The JSON schema guards shape — that a field exists and has the right type. It cannot
 * express "this id must name an element that exists", which is exactly what a hand edit or an
 * agent gets wrong. This goal closes that gap, and is the second half of the loop the modux
 * skill tells agents to run: <code>mvn modux:validate</code> then <code>mvn modux:generate</code>.
 */
@Mojo(name = "validate", defaultPhase = LifecyclePhase.VALIDATE, threadSafe = true)
public class ValidateMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    /**
     * Reference fields that legitimately point outside the model — a referenced repository, a
     * provider key. Matched on the field name, with or without its owning type.
     */
    @Parameter(property = "modux.ignoredReferences")
    private List<String> ignoredReferences = new ArrayList<>();

    /** Report problems without failing the build. */
    @Parameter(property = "modux.validateOnly", defaultValue = "false")
    private boolean reportOnly;

    @Override
    public void execute() throws MojoFailureException {
        try {
            var model = ModuxModel.read(ModuxModel.locate(modelPath));
            var known = collectIds(model);
            var problems = new ArrayList<String>();

            for (var element : model.elements()) {
                var ownerId = idOf(element.value());
                walk(element.value(), element.type(), ownerId, known, problems, new IdentityHashMap<>());
            }
            report(problems);
        } catch (MojoFailureException e) {
            throw e;
        } catch (Exception e) {
            throw new MojoFailureException("No se pudo leer el modelo: " + e.getMessage(), e);
        }
    }

    private void report(List<String> problems) throws MojoFailureException {
        if (problems.isEmpty()) {
            getLog().info("Modux: modelo íntegro, sin referencias colgantes.");
            return;
        }
        problems.forEach(p -> getLog().error("Modux: " + p));
        var summary = problems.size() + " referencia(s) colgante(s) en el modelo";
        if (reportOnly) {
            getLog().warn("Modux: " + summary + " (modux.validateOnly=true, no se falla el build)");
            return;
        }
        throw new MojoFailureException(summary);
    }

    /** Every id the model defines, at any depth — nested items are referenceable too. */
    private Set<String> collectIds(ModuxModel model) {
        var ids = new HashSet<String>();
        for (var element : model.elements()) {
            collectIds(element.value(), ids, new IdentityHashMap<>());
        }
        return ids;
    }

    private void collectIds(Object value, Set<String> ids, IdentityHashMap<Object, Boolean> seen) {
        if (!visit(value, seen)) return;
        for (var component : value.getClass().getRecordComponents()) {
            var child = read(value, component);
            if (child == null) continue;
            if (component.getName().equals("id") && child instanceof String id) ids.add(id);
            for (var nested : records(child)) collectIds(nested, ids, seen);
        }
    }

    private void walk(Object value, String type, String ownerId, Set<String> known,
                      List<String> problems, IdentityHashMap<Object, Boolean> seen) {
        if (!visit(value, seen)) return;
        for (var component : value.getClass().getRecordComponents()) {
            var name = component.getName();
            var child = read(value, component);
            if (child == null) continue;

            if (isReference(name) && !ignored(type, name)) {
                for (var referenced : strings(child)) {
                    if (!referenced.isBlank() && !known.contains(referenced)) {
                        problems.add(type + "/" + ownerId + "." + name
                                + " apunta a '" + referenced + "', que no existe en el modelo");
                    }
                }
            }
            for (var nested : records(child)) walk(nested, type, ownerId, known, problems, seen);
        }
    }

    /** Fields that name other elements, by the convention the metamodel already follows. */
    private static boolean isReference(String field) {
        return !field.equals("id") && (field.endsWith("Id") || field.endsWith("Ids"));
    }

    private boolean ignored(String type, String field) {
        return ignoredReferences.contains(field) || ignoredReferences.contains(type + "." + field);
    }

    private static Object read(Object owner, java.lang.reflect.RecordComponent component) {
        try {
            return component.getAccessor().invoke(owner);
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    /** Guard against cycles and non-records in one place. */
    private static boolean visit(Object value, IdentityHashMap<Object, Boolean> seen) {
        return value != null && value.getClass().isRecord() && seen.put(value, true) == null;
    }

    private static List<Object> records(Object value) {
        if (value instanceof Collection<?> collection) {
            return collection.stream().filter(v -> v != null && v.getClass().isRecord())
                    .map(v -> (Object) v).toList();
        }
        return value.getClass().isRecord() ? List.of(value) : List.of();
    }

    private static List<String> strings(Object value) {
        if (value instanceof String s) return List.of(s);
        if (value instanceof Collection<?> collection) {
            return collection.stream().filter(String.class::isInstance).map(String.class::cast).toList();
        }
        return List.of();
    }

    private static String idOf(Object element) {
        try {
            var value = element.getClass().getMethod("id").invoke(element);
            return value == null ? "?" : value.toString();
        } catch (ReflectiveOperationException e) {
            return "?";
        }
    }
}
