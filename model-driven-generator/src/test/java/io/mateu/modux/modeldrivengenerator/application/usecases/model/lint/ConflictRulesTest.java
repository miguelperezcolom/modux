package io.mateu.modux.modeldrivengenerator.application.usecases.model.lint;

import static org.assertj.core.api.Assertions.assertThat;

import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.ConflictRules.Named;
import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.ConflictRules.ServiceRef;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Declarations that collide once generated stop generation, before a compiler has to explain them. */
class ConflictRulesTest {

    @Test
    void twoAggregatesThatBecomeTheSameClassClash() {
        var findings = ConflictRules.typeNameClashes("r", "Tienda", List.of(List.of(
                new Named("Aggregate", "agg-1", "línea pedido"),
                new Named("Entity", "ent-1", "LineaPedido"),
                new Named("Aggregate", "agg-2", "Línea-Pedido"))));

        assertThat(findings).hasSize(1);
        assertThat(findings.get(0).severity()).isEqualTo(LintSeverity.ERROR);
        assertThat(findings.get(0).message()).contains("Línea-Pedido").contains("línea pedido");
    }

    @Test
    void casingAloneIsAClashBecauseFileSystemsIgnoreIt() {
        var findings = ConflictRules.typeNameClashes("r", "Tienda", List.of(List.of(
                new Named("Aggregate", "a", "Pedido"), new Named("Aggregate", "b", "PEDIDO"))));

        assertThat(findings).hasSize(1);
    }

    @Test
    void theSameNameInDifferentFamiliesIsFine() {
        var findings = ConflictRules.typeNameClashes("r", "Tienda", List.of(
                List.of(new Named("Aggregate", "a", "Pedido")),
                List.of(new Named("ReadModel", "r", "Pedido"))));

        assertThat(findings).isEmpty();
    }

    @Test
    void aFieldNamedAfterAJavaKeywordCannotCompile() {
        var findings = ConflictRules.fieldConflicts("r", "m", "Producto", List.of("nombre", "default", "class"));

        assertThat(findings).hasSize(2);
        assertThat(findings).allMatch(f -> f.message().contains("Java keyword"));
    }

    @Test
    void aRepeatedFieldIsAConflict() {
        var findings = ConflictRules.fieldConflicts("r", "m", "Producto", List.of("precio", "Precio", "nombre"));

        assertThat(findings).singleElement().satisfies(f -> assertThat(f.message()).contains("2 times"));
    }

    @Test
    void servicesMustNotShareAProjectOrAPort() {
        var findings = ConflictRules.serviceClashes("r", List.of(
                new ServiceRef("s1", "Pedidos", 8081),
                new ServiceRef("s2", "pedidos", 8082),
                new ServiceRef("s3", "Cobros", 8081),
                new ServiceRef("s4", "Almacén", null)));

        assertThat(findings).hasSize(2);
        assertThat(findings).anyMatch(f -> f.message().contains("project 'pedidos'"));
        assertThat(findings).anyMatch(f -> f.message().contains("port 8081"));
    }

    @Test
    void contextsThatBecomeTheSamePackageClash() {
        var findings = ConflictRules.contextClashes("r", List.of(
                new Named("BoundedContext", "bc-1", "Ventas Online"),
                new Named("BoundedContext", "bc-2", "ventas-online"),
                new Named("BoundedContext", "bc-3", "Almacén")));

        assertThat(findings).singleElement().satisfies(f -> assertThat(f.message()).contains("'ventasonline'"));
    }

    @Test
    void theRulesAreInTheCatalog() {
        var ids = LintRules.all().stream().map(LintRule::id).toList();

        assertThat(ids).contains("type-name-collision", "field-name-conflict", "service-collision",
                "context-package-collision");
    }
}
