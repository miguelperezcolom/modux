package io.mateu.modux.idea;

import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.Nullable;

import java.nio.file.Path;

/**
 * Finds another project's model on this machine.
 *
 * <p>A reference to another modux project is a coordinate stored in the model and versioned with
 * it (§4.7): a git URL, which is the identity everyone shares, and optionally a path, for a
 * checkout that is not where it would be guessed. Resolving one is I/O and machine-specific, which
 * is exactly why it lives here and not in the applier.
 *
 * <p>Everything reached through this is READ-ONLY, and that is structural rather than a promise:
 * the bridge has no write operation that takes a root, so nothing outside the open model can be
 * written no matter what the editor asks for.
 */
final class ReferencedProjects {

    private ReferencedProjects() {}

    /**
     * Where the referenced model is, or null when it cannot be found.
     *
     * <p>An explicit path wins. Otherwise the checkout is guessed from the repository's name, next
     * to this one — which is where it is while you work on both at once, and which is why the git
     * URL alone is usually enough. Guessing is a derivation: nothing stored, nothing configured,
     * and nothing reaching the network.
     */
    static @Nullable VirtualFile locate(VirtualFile modelRoot, @Nullable String gitUrl,
                                        @Nullable String path) {
        if (modelRoot == null) return null;
        if (isSet(path)) {
            return modelOf(resolve(modelRoot, path.trim()));
        }
        var name = repositoryName(gitUrl);
        if (name == null) return null;
        // The catalog is <repo>/modux or <repo>/.modux (§12.3); modelRoot is that catalog, so its grandparent is
        // where sibling checkouts sit.
        var siblings = modelRoot.getParent() == null ? null : modelRoot.getParent().getParent();
        if (siblings == null) return null;
        var repo = siblings.findChild(name);
        return repo == null ? null : modelOf(repo);
    }

    /** The catalog, given a repository root that holds one, or a directory that is one. */
    private static @Nullable VirtualFile modelOf(@Nullable VirtualFile candidate) {
        if (candidate == null || !candidate.isDirectory()) return null;
        if (ModuxProject.isCatalog(candidate)) return candidate;
        return ModuxProject.catalogIn(candidate);
    }

    /**
     * A relative path is resolved through the VFS, from the model root — so it works on whatever
     * file system the model happens to be on, not only the local disk. Only an absolute path (or a
     * `~` one, which is absolute once expanded) has to go to the local disk, because that is the
     * only thing it can mean.
     */
    private static @Nullable VirtualFile resolve(VirtualFile modelRoot, String path) {
        if (path.startsWith("~")) {
            return LocalFileSystem.getInstance().findFileByNioFile(
                    Path.of(System.getProperty("user.home") + path.substring(1)).normalize());
        }
        var candidate = Path.of(path);
        if (candidate.isAbsolute()) {
            return LocalFileSystem.getInstance().findFileByNioFile(candidate.normalize());
        }
        return modelRoot.findFileByRelativePath(path);
    }

    /**
     * The repository's name as a directory would be called — {@code .../acme/checkin.git} is
     * {@code checkin}. Mirrors {@code ReferencedProjectEntity.repositoryName}.
     */
    static @Nullable String repositoryName(@Nullable String gitUrl) {
        if (!isSet(gitUrl)) return null;
        var trimmed = gitUrl.trim();
        while (trimmed.endsWith("/")) trimmed = trimmed.substring(0, trimmed.length() - 1);
        if (trimmed.endsWith(".git")) trimmed = trimmed.substring(0, trimmed.length() - 4);
        var separator = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf(':'));
        var name = separator < 0 ? trimmed : trimmed.substring(separator + 1);
        return name.isBlank() ? null : name;
    }

    private static boolean isSet(@Nullable String value) {
        return value != null && !value.isBlank();
    }
}
