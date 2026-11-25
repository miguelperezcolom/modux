package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;

/**
 * Any ArchiMate element modux has no concept of its own for — a node, a database (system
 * software), a topic (artifact), a business process, a data object, a location… Pure
 * architectural documentation: it is drawn, related to anything through
 * {@link ArchimateRelationEntity}, and generates no code. With it any system can be described,
 * not only the parts modux builds.
 */
@lombok.Builder(toBuilder = true)
public record ArchimateElementEntity(
        String id,
        String name,
        /**
         * The ArchiMate 3 concept, in Archi's spelling: BusinessActor, BusinessRole,
         * BusinessProcess, BusinessFunction, BusinessEvent, BusinessService, BusinessObject,
         * ApplicationComponent, ApplicationInterface, ApplicationFunction, ApplicationProcess,
         * ApplicationEvent, ApplicationService, DataObject, Node, Device, SystemSoftware,
         * TechnologyService, TechnologyInterface, Artifact, CommunicationNetwork, Stakeholder,
         * Driver, Goal, Requirement, Principle, Capability, ValueStream, Resource, WorkPackage,
         * Deliverable, Plateau, Location…
         */
        String concept,
        /** What it is, in the language of the domain. */
        String description,
        /** The project this element belongs to (selection scoping; null = legacy, claimed on open). */
        String projectId
) implements Identifiable {
}
