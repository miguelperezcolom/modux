package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.LintFinding;
import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.LintSeverity;
import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.ModelLintService;
import org.apache.maven.plugin.logging.Log;
import org.springframework.context.ApplicationContext;

import java.util.List;
import java.util.Set;

/**
 * The model's coherence check, run before anything is generated: the generator's lint catalog —
 * dangling references, duplicate ids, declarations that collide once generated (two elements
 * becoming one class, two services on one port, a field named {@code class}) and the semantic
 * rules (a saga without compensation, a workflow that can loop forever…). ERROR findings stop the
 * build; warnings are printed and the build goes on; the informational ones only with {@code -X}.
 */
final class ModelGate {

    private ModelGate() {}

    /** @return the ERROR findings, already logged; empty when the model may be generated */
    static List<LintFinding> check(ApplicationContext ctx, Log log, Set<String> skipRules) {
        var findings = ctx.getBean(ModelLintService.class).lint().stream()
                .filter(f -> !skipRules.contains(f.ruleId()))
                .toList();
        for (var f : findings) {
            var line = "Modux: [" + f.ruleId() + "] " + f.elementType() + " '" + f.elementName() + "': " + f.message();
            switch (f.severity()) {
                case ERROR -> log.error(line);
                case WARNING -> log.warn(line);
                default -> log.debug(line);
            }
        }
        var errors = findings.stream().filter(f -> f.severity() == LintSeverity.ERROR).toList();
        var warnings = findings.stream().filter(f -> f.severity() == LintSeverity.WARNING).count();
        log.info("Modux: modelo revisado — " + errors.size() + " error(es), " + warnings + " aviso(s)");
        return errors;
    }

    static String summary(List<LintFinding> errors) {
        return errors.size() + " error(es) en el modelo: corrígelos antes de generar"
                + " (o -Dmodux.skipChecks=true para generar igualmente)";
    }
}
