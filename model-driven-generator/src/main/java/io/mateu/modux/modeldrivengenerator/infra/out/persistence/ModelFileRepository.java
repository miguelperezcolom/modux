package io.mateu.modux.modeldrivengenerator.infra.out.persistence;

import io.mateu.modux.modeldrivengenerator.application.out.repositories.ModelRepository;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.Model;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelField;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelFieldValidation;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelId;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelValidation;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldValidationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelValidationEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ModelFileRepository implements ModelRepository {

    final ModelStore repository;

    @Override
    public Optional<Model> findById(ModelId id) {
        return repository.findById(id.id(), ModelEntity.class)
                .map(entity -> Model.load(entity.id(), entity.name(),
                        entity.fields() == null ? List.of() :
                                entity.fields().stream()
                                        .map(f -> new ModelField(f.id(), f.name(), f.basicType(), f.type(), f.modelId(),
                                                f.isEnum(), f.enumId(), toFieldValidations(f.validations())))
                                        .toList(),
                        toValidations(entity.validations())));
    }

    @Override
    public Model save(Model entity) {
        // Carry over per-field PII settings (not yet modeled in the domain Model) from the stored
        // entity, matching by field id, so a UI save never wipes what was authored in the YAML store.
        var existingFields = repository.findById(entity.getId().id(), ModelEntity.class)
                .map(ModelEntity::fields)
                .orElse(List.of());
        var fieldEntities = entity.getFields() == null ? List.<ModelFieldEntity>of() :
                entity.getFields().stream()
                        .map(f -> {
                            var previous = existingFields.stream()
                                    .filter(e -> e.id() != null && e.id().equals(f.id()))
                                    .findFirst().orElse(null);
                            return new ModelFieldEntity(f.id(), f.name(), f.basicType(), f.type(), f.modelId(),
                                    f.isEnum(), f.enumId(), toFieldValidationEntities(f.validations()),
                                    previous != null ? previous.piiClassification() : null,
                                    previous != null ? previous.anonymizationStrategy() : null)
                                    // the domain does not model the stereotype yet: carried over
                                    .withStereotype(previous != null ? previous.stereotype() : null)
                                    .withReadOnly(previous != null ? previous.readOnly() : null)
                                    .withSystemValue(previous != null ? previous.systemValue() : null);
                        })
                        .toList();
        var validationEntities = toValidationEntities(entity.getValidations());
        repository.save(new ModelEntity(
                entity.getId().id(),
                entity.getName().name(),
                fieldEntities, validationEntities, null));
        return entity;
    }

    @Override
    public void deleteAllById(List<ModelId> selectedIds) {
        repository.deleteAllById(selectedIds.stream().map(ModelId::id).toList(), ModelEntity.class);
    }

    private List<ModelFieldValidation> toFieldValidations(List<ModelFieldValidationEntity> validations) {
        if (validations == null) return List.of();
        return validations.stream()
                .map(v -> new ModelFieldValidation(v.id(), v.type(), v.params()))
                .toList();
    }

    private List<ModelFieldValidationEntity> toFieldValidationEntities(List<ModelFieldValidation> validations) {
        if (validations == null) return List.of();
        return validations.stream()
                .map(v -> new ModelFieldValidationEntity(v.id(), v.type(), v.params()))
                .toList();
    }

    private List<ModelValidation> toValidations(List<ModelValidationEntity> validations) {
        if (validations == null) return List.of();
        return validations.stream()
                .map(v -> new ModelValidation(v.id(), v.condition(), v.fieldIds(), v.message()))
                .toList();
    }

    private List<ModelValidationEntity> toValidationEntities(List<ModelValidation> validations) {
        if (validations == null) return List.of();
        return validations.stream()
                .map(v -> new ModelValidationEntity(v.id(), v.condition(), v.fieldIds(), v.message()))
                .toList();
    }
}
