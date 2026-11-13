package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.AnonymizationStrategy;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.PiiClassification;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldStereotype;

import java.util.List;

public record ModelFieldEntity(
        String id,
        String name,
        boolean basicType,
        FieldDataType type,
        String modelId,
        @JsonProperty("enum") boolean isEnum,
        String enumId,
        List<ModelFieldValidationEntity> validations,
        /** Privacy classification; null/NONE when the field carries no personal data. */
        PiiClassification piiClassification,
        /** How the field is anonymized on erasure requests; meaningful when piiClassification != NONE. */
        AnonymizationStrategy anonymizationStrategy,
        /** Optional human label for UIs; falls back to the humanized field name. */
        String label,
        /** Column priority for compact listings (1 = most important); null = no preference. */
        Integer priority,
        /** Marks the field as the row title in compact/master-detail listings. */
        Boolean identifier,
        /**
         * When set, the field is typed by a VALUE OBJECT (a domain type WITH invariants), as
         * opposed to {@code modelId} (a pure Model), {@code enumId} (an enum) or a basic type.
         */
        String valueObjectId,
        /** When set, the field is typed by a child ENTITY (has identity), by its id. */
        String entityId,
        /** Multiplicity: true = a COLLECTION of the type (List/Set), false/null = a single value. */
        Boolean collection,
        /**
         * How it is shown, in Mateu's words (richText, html, markdown, textarea…): a text with
         * formatting is edited with an editor and shown rendered, and stored without a length limit.
         */
        FieldStereotype stereotype
) {

    /** Backward-compatible constructor (pre-stereotype callers and stores). */
    public ModelFieldEntity(String id, String name, boolean basicType, FieldDataType type,
                            String modelId, boolean isEnum, String enumId,
                            List<ModelFieldValidationEntity> validations,
                            PiiClassification piiClassification, AnonymizationStrategy anonymizationStrategy,
                            String label, Integer priority, Boolean identifier, String valueObjectId,
                            String entityId, Boolean collection) {
        this(id, name, basicType, type, modelId, isEnum, enumId, validations, piiClassification,
                anonymizationStrategy, label, priority, identifier, valueObjectId, entityId, collection, null);
    }

    /** The same field with that stereotype (what a save that does not model it carries over). */
    public ModelFieldEntity withStereotype(FieldStereotype stereotype) {
        return new ModelFieldEntity(id, name, basicType, type, modelId, isEnum, enumId, validations,
                piiClassification, anonymizationStrategy, label, priority, identifier, valueObjectId,
                entityId, collection, stereotype);
    }

    /** Whether it holds a long text (formatted or not): stored as text, never varchar(255). */
    public boolean longText() {
        return stereotype != null && java.util.Set.of(FieldStereotype.richText, FieldStereotype.html,
                FieldStereotype.markdown, FieldStereotype.textarea).contains(stereotype);
    }

    /** Backward-compatible constructor (pre-entity/collection callers). */
    public ModelFieldEntity(String id, String name, boolean basicType, FieldDataType type,
                            String modelId, boolean isEnum, String enumId,
                            List<ModelFieldValidationEntity> validations,
                            PiiClassification piiClassification, AnonymizationStrategy anonymizationStrategy,
                            String label, Integer priority, Boolean identifier, String valueObjectId) {
        this(id, name, basicType, type, modelId, isEnum, enumId, validations, piiClassification,
                anonymizationStrategy, label, priority, identifier, valueObjectId, null, null);
    }

    /** Backward-compatible constructor (pre-valueObject callers and stores). */
    public ModelFieldEntity(String id, String name, boolean basicType, FieldDataType type,
                            String modelId, boolean isEnum, String enumId,
                            List<ModelFieldValidationEntity> validations,
                            PiiClassification piiClassification, AnonymizationStrategy anonymizationStrategy,
                            String label, Integer priority, Boolean identifier) {
        this(id, name, basicType, type, modelId, isEnum, enumId, validations, piiClassification,
                anonymizationStrategy, label, priority, identifier, null, null, null);
    }

    /** Backward-compatible constructor (pre-PII callers and stores). */
    public ModelFieldEntity(String id, String name, boolean basicType, FieldDataType type,
                            String modelId, boolean isEnum, String enumId,
                            List<ModelFieldValidationEntity> validations) {
        this(id, name, basicType, type, modelId, isEnum, enumId, validations, null, null,
                null, null, null, null);
    }

    /** Backward-compatible constructor (pre-label/priority callers). */
    public ModelFieldEntity(String id, String name, boolean basicType, FieldDataType type,
                            String modelId, boolean isEnum, String enumId,
                            List<ModelFieldValidationEntity> validations,
                            PiiClassification piiClassification,
                            AnonymizationStrategy anonymizationStrategy) {
        this(id, name, basicType, type, modelId, isEnum, enumId, validations,
                piiClassification, anonymizationStrategy, null, null, null);
    }
}
