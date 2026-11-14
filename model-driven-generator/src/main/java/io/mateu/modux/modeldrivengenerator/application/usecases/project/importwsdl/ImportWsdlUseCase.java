package io.mateu.modux.modeldrivengenerator.application.usecases.project.importwsdl;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.ImportOpenApiExternalUseCase;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemUseCaseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * WSDL import, both directions: the SOAP operations of a legacy partner land as
 * {@link ExternalSystemUseCaseEntity} on the external system (callable/pollable surface),
 * or — when the contract is something WE must implement — as use-case stubs attached to a
 * bounded context. Deterministic ids make re-imports update instead of duplicate.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportWsdlUseCase {

    final ModelStore repository;

    public void handle(ImportWsdlCommand command) {
        var hasExternal = command.externalSystemId() != null && !command.externalSystemId().isBlank();
        var hasBoundedContext = command.boundedContextId() != null && !command.boundedContextId().isBlank();
        if (hasExternal == hasBoundedContext) {
            throw new IllegalArgumentException(
                    "Choose ONE target: an external system or a bounded context");
        }
        var operations = WsdlParser.parse(Path.of(command.filePath()));
        if (hasExternal) {
            importIntoExternal(command.externalSystemId(), operations);
        } else {
            importIntoBoundedContext(command.boundedContextId(), operations);
        }
    }

    private void importIntoExternal(String externalSystemId,
                                    List<WsdlParser.WsdlOperation> operations) {
        var external = repository.findAllOfType(ExternalSystemEntity.class).stream()
                .filter(x -> x.id().equals(externalSystemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown external system: " + externalSystemId));
        var merged = new ArrayList<>(external.useCases());
        for (var op : operations) {
            var operation = new ExternalSystemUseCaseEntity(
                    ImportOpenApiExternalUseCase.operationId(externalSystemId, op.name()),
                    op.name(), description(op));
            var existing = merged.stream()
                    .filter(u -> u.id().equals(operation.id())).findFirst();
            if (existing.isPresent()) {
                merged.set(merged.indexOf(existing.get()), operation);
            } else {
                merged.add(operation);
            }
        }
        repository.findById(externalSystemId, ExternalSystemEntity.class)
                .map(x -> ImportOpenApiExternalUseCase.withUseCases(x, List.copyOf(merged)))
                .ifPresent(repository::save);
        log.info("Imported {} SOAP operations into external system '{}'",
                operations.size(), externalSystemId);
    }

    private void importIntoBoundedContext(String boundedContextId, List<WsdlParser.WsdlOperation> operations) {
        var boundedContext = repository.findById(boundedContextId, BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + boundedContextId));
        var useCaseIds = new ArrayList<String>();
        for (var op : operations) {
            var id = useCaseId(op.name(), boundedContext);
            useCaseIds.add(id);
            repository.save(new UseCaseEntity(
                    id, op.name(),
                    false, false, false, false, false,   // exposure is the developer's call (SOAP shim, REST…)
                    null, null,
                    List.of(),                            // no steps: custom implementation stub
                    List.of(), List.of(),
                    null,
                    description(op),                      // the WSDL intent travels as mcpDescription prose
                    null, null,
                    null, null, null, null, null,
                    false, null, null,
                    null, false, null,
                    false, null,
                    null, null));
        }
        var merged = new ArrayList<>(boundedContext.useCaseIds() != null ? boundedContext.useCaseIds() : List.<String>of());
        useCaseIds.stream().filter(id -> !merged.contains(id)).forEach(merged::add);
        repository.save(boundedContext.toBuilder().useCaseIds(merged).build());
        log.info("Imported {} SOAP operations as use-case stubs into boundedContext '{}'",
                operations.size(), boundedContextId);
    }

    /** Deterministic id, never hijacking one owned by another boundedContext (same rule as OpenAPI inbound). */
    private String useCaseId(String operationName, BoundedContextEntity boundedContext) {
        var plain = "uc-" + operationName;
        var existing = repository.findById(plain, UseCaseEntity.class);
        var ownedHere = boundedContext.useCaseIds() != null && boundedContext.useCaseIds().contains(plain);
        if (existing.isEmpty() || ownedHere) return plain;
        return "uc-" + boundedContext.name().toLowerCase().replaceAll("[^a-z0-9]+", "")
                + "-" + operationName;
    }

    private static String description(WsdlParser.WsdlOperation op) {
        var base = "SOAP " + op.portType() + "." + op.name();
        return op.documentation() == null || op.documentation().isBlank()
                ? base : base + " — " + op.documentation();
    }

}
