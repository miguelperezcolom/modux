package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatehla;

import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.ModelSnapshot;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Generates the project's design document (HLA) from the loaded model — the human deliverable for
 * the dev team / architecture review, guaranteed in sync with the spec because it is derived from it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GenerateHlaUseCase {

    final ModelStore repository;

    /**
     * Renders the document for the loaded model.
     *
     * <p>It used to close with a «Qué cambia respecto al sistema» section, computed by diffing a
     * solution branch against the system. That is git's job now that the model lives in the
     * repository — {@code git diff} over one file per element reads better than a rendering of it,
     * and it does not need modux to be running. See {@code docs/design/ide-plugin.md} §4.8.
     */
    public String render() {
        return HlaDocumentRenderer.render(ModelSnapshot.from(repository));
    }

    /** Renders and writes the document to the given path (e.g. next to the generated code). */
    @SneakyThrows
    public Path writeTo(Path target) {
        var markdown = render();
        Files.createDirectories(target.toAbsolutePath().getParent());
        Files.writeString(target, markdown);
        // the caller says where it went (the Maven goal logs it once, in its own words)
        log.debug("HLA document written to {}", target.toAbsolutePath());
        return target;
    }
}
