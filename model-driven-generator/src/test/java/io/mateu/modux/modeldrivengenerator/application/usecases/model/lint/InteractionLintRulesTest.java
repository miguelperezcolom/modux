package io.mateu.modux.modeldrivengenerator.application.usecases.model.lint;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.interaction.vo.InteractionMessageKind;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.interaction.vo.InteractionTriggerKind;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionMessageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.RoleEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiAdapterEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseStepEntity;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The two interaction coherence rules: dangling refs are flagged once per (interaction, ref)
 * — trigger included, with EVENT triggers resolving by event NAME — and unbacked messages are
 * flagged with their position, except when an endpoint dangles (the dangling warning wins).
 */
class InteractionLintRulesTest {

    private final LintRules.InteractionDanglingParticipant dangling =
            new LintRules.InteractionDanglingParticipant();
    private final LintRules.InteractionMessageWithoutBacking withoutBacking =
            new LintRules.InteractionMessageWithoutBacking();

    // ---- interaction-dangling-participant --------------------------------------------------

    @Test
    void dangling_nothing_when_every_ref_resolves() {
        var snapshot = snapshot(
                List.of(interaction("i1", InteractionTriggerKind.ACTOR, "huesped",
                        message("m1", "huesped", "pagina-checkin"))),
                List.of(huesped()), null,
                List.of(PageEntity.builder().id("pagina-checkin").name("Check-in").build()),
                null, null, null, null);

        assertTrue(dangling.apply(snapshot).isEmpty());
    }

    @Test
    void flags_the_trigger_and_each_dangling_ref_once() {
        var snapshot = snapshot(
                List.of(interaction("i1", InteractionTriggerKind.ACTOR, "fantasma",
                        message("m1", "huesped", "fantasma"),
                        message("m2", "fantasma", "pagina-checkin"))),
                List.of(huesped()), null,
                List.of(PageEntity.builder().id("pagina-checkin").name("Check-in").build()),
                null, null, null, null);

        var findings = dangling.apply(snapshot);

        // 'fantasma' appears as trigger AND in two messages: one finding per usage group
        assertEquals(2, findings.size(), () -> "findings: " + findings);
        assertTrue(findings.stream().anyMatch(f -> f.message().contains("Trigger 'fantasma'")));
        assertTrue(findings.stream().anyMatch(f -> f.message().contains("'fantasma'")
                && f.message().contains("message 1 (target)")
                && f.message().contains("message 2 (source)")), () -> "findings: " + findings);
        assertTrue(findings.stream().allMatch(f -> f.severity() == LintSeverity.WARNING
                && f.ruleId().equals("interaction-dangling-participant")
                && f.elementId().equals("i1")));
    }

    @Test
    void event_trigger_resolves_by_event_name() {
        var interaction = interaction("i1", InteractionTriggerKind.EVENT, "CheckinRealizado",
                message("m1", "huesped", "pagina-checkin"));
        var withEvent = snapshot(List.of(interaction), List.of(huesped()), null,
                List.of(PageEntity.builder().id("pagina-checkin").name("Check-in").build()),
                null, null,
                List.of(new DomainEventEntity("ev-1", "CheckinRealizado", null, false, null, null,
                        null, null, null, null, false, null, null, null, null, false, null)),
                null);
        assertTrue(dangling.apply(withEvent).isEmpty());

        var withoutEvent = snapshot(List.of(interaction), List.of(huesped()), null,
                List.of(PageEntity.builder().id("pagina-checkin").name("Check-in").build()),
                null, null, null, null);
        var findings = dangling.apply(withoutEvent);
        assertEquals(1, findings.size());
        assertTrue(findings.get(0).message().contains("no event has that name"));
    }

    @Test
    void a_null_trigger_is_allowed() {
        var snapshot = snapshot(
                List.of(interaction("i1", null, null, message("m1", "huesped", "pagina-checkin"))),
                List.of(huesped()), null,
                List.of(PageEntity.builder().id("pagina-checkin").name("Check-in").build()),
                null, null, null, null);

        assertTrue(dangling.apply(snapshot).isEmpty());
    }

    // ---- interaction-message-without-backing ------------------------------------------------

    @Test
    void backed_messages_pass() {
        var snapshot = snapshot(
                List.of(interaction("i1", InteractionTriggerKind.ACTOR, "huesped",
                        message("m1", "huesped", "uc-checkin"))),
                List.of(RoleEntity.builder().id("huesped").name("Huésped")
                        .allowedUseCaseIds(List.of("uc-checkin")).build()),
                null, null, List.of(useCase("uc-checkin")), null, null, null);

        assertTrue(withoutBacking.apply(snapshot).isEmpty());
    }

    @Test
    void flags_unbacked_messages_with_position_and_pair() {
        var snapshot = snapshot(
                List.of(interaction("i1", null, null,
                        message("m1", "huesped", "uc-checkin"),
                        message("m2", "huesped", "uc-cancelar"))),
                List.of(RoleEntity.builder().id("huesped").name("Huésped")
                        .allowedUseCaseIds(List.of("uc-checkin")).build()),
                null, null,
                List.of(useCase("uc-checkin"), useCase("uc-cancelar")), null, null, null);

        var findings = withoutBacking.apply(snapshot);

        assertEquals(1, findings.size(), () -> "findings: " + findings);
        var finding = findings.get(0);
        assertEquals("interaction-message-without-backing", finding.ruleId());
        assertEquals(LintSeverity.WARNING, finding.severity());
        assertEquals("i1", finding.elementId());
        assertTrue(finding.message().contains("Message 2")
                && finding.message().contains("huesped → uc-cancelar")
                && finding.message().contains("COMMAND"), finding.message());
    }

    @Test
    void messages_touching_a_dangling_ref_are_left_to_the_dangling_rule() {
        var snapshot = snapshot(
                List.of(interaction("i1", null, null,
                        message("m1", "huesped", "fantasma"))),
                List.of(huesped()), null, null, null, null, null, null);

        // no double warning: backing is not even evaluated against a missing element
        assertTrue(withoutBacking.apply(snapshot).isEmpty());
        // …and the dangling rule does name it
        assertEquals(1, dangling.apply(snapshot).size());
    }

    // ---- fixtures ----------------------------------------------------------------------------

    private static InteractionEntity interaction(String id, InteractionTriggerKind triggerKind,
                                                 String triggerRef, InteractionMessageEntity... messages) {
        return InteractionEntity.builder()
                .id(id).name(id)
                .triggerKind(triggerKind).triggerRef(triggerRef)
                .messages(List.of(messages))
                .build();
    }

    private static InteractionMessageEntity message(String id, String fromRef, String toRef) {
        return new InteractionMessageEntity(id, fromRef, toRef, InteractionMessageKind.COMMAND, null, null);
    }

    private static RoleEntity huesped() {
        return RoleEntity.builder().id("huesped").name("Huésped").build();
    }

    private static UseCaseEntity useCase(String id, UseCaseStepEntity... steps) {
        return new UseCaseEntity(id, id, false, false, false, false, false, null, null,
                List.of(steps), null, null, null, null, null, null, null, null, null, null, null,
                false, null, null, null, false, null, false, null, null, null, List.of(), false, null);
    }

    /** Snapshot with only the slices the interaction rules read; everything else empty. */
    private static ModelSnapshot snapshot(
            List<InteractionEntity> interactions,
            List<RoleEntity> roles,
            List<UiAdapterEntity> uiAdapters,
            List<PageEntity> pages,
            List<UseCaseEntity> useCases,
            List<AggregateEntity> aggregates,
            List<DomainEventEntity> domainEvents,
            List<FlowEntity> flows) {
        return new ModelSnapshot(null, null, null, aggregates, null, useCases, domainEvents, null,
                null, null, null, null, flows, null, null, pages, null, null, null, null, null,
                null, null, null, null, roles, uiAdapters, null, null, interactions, null, null, null);
    }
}
