package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.application.usecases.model.check.CheckModelUseCase.Violation;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.ModelYaml;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * The referential-integrity check (§5.3), extended to the canvas layer (P-lienzo-1 of
 * {@code catalog-and-views.md}).
 *
 * <p>A view document ({@code *.modux-view.yaml}) lives in the repository, outside the catalog, and
 * references a catalog view by id (§12.2).
 * {@link io.mateu.modux.modeldrivengenerator.application.usecases.model.check.CheckModelUseCase
 * CheckModelUseCase} sees only the catalog, so it cannot know a document's {@code viewId} has gone
 * dangling — a view renamed or deleted leaves the document pointing at nothing. This walks the
 * repository, finds every document, and reports the ones whose {@code viewId} the catalog does not
 * have.
 */
public final class ViewDocumentChecker {

    /** The suffix that marks a view document. Mirrors the plugin's {@code ModuxProject.VIEW_SUFFIX}. */
    public static final String SUFFIX = ".modux-view.yaml";

    /** Directories never worth walking: version control, dependencies, build output. */
    private static final Set<String> SKIP = Set.of("node_modules", "target", "build", "dist", "out");

    private ViewDocumentChecker() {}

    /** Just the field this check reads; every other field of the document is ignored. */
    public record ViewDoc(String viewId) {}

    /**
     * Every view document under {@code repoRoot} whose {@code viewId} is not among the catalog's
     * view ids — plus any that cannot be read. Empty when they all resolve.
     */
    public static List<Violation> check(Path repoRoot, Set<String> catalogViewIds) throws IOException {
        if (repoRoot == null || !Files.isDirectory(repoRoot)) return List.of();
        var reader = ModelYaml.reader();
        var violations = new ArrayList<Violation>();

        Files.walkFileTree(repoRoot, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                var name = dir.getFileName() == null ? "" : dir.getFileName().toString();
                // prune hidden trees (.git, .idea, and the .modux catalog itself) and build output
                return !dir.equals(repoRoot) && (name.startsWith(".") || SKIP.contains(name))
                        ? FileVisitResult.SKIP_SUBTREE : FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                if (!file.getFileName().toString().endsWith(SUFFIX)) return FileVisitResult.CONTINUE;
                var where = repoRoot.relativize(file).toString();
                String viewId;
                try {
                    viewId = reader.readValue(file.toFile(), ViewDoc.class).viewId();
                } catch (IOException e) {
                    violations.add(new Violation("ViewDocument", where, "(file)", "illegible: " + e.getMessage()));
                    return FileVisitResult.CONTINUE;
                }
                if (viewId == null || viewId.isBlank()) {
                    violations.add(new Violation("ViewDocument", where, "viewId", "(sin viewId)"));
                } else if (!catalogViewIds.contains(viewId)) {
                    violations.add(new Violation("ViewDocument", where, "viewId", viewId));
                }
                return FileVisitResult.CONTINUE;
            }
        });
        return violations;
    }
}
