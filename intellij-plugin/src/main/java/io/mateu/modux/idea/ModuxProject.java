package io.mateu.modux.idea;

import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.Nullable;

/**
 * Finds the catalog a file belongs to, and tells a view document from anything else.
 *
 * <p>A modux model is a catalog — the elements — in a directory at the repo root (§12.3): the
 * {@code modux/} the Maven plugin, the docs and the authoring skill name, or the {@code .modux/}
 * this plugin creates. Resolution walks up to the nearest ancestor holding one, the same "nearest
 * marker" idea as before, with the directory as the marker. Where both are there, {@code modux/}
 * wins, as it does for the Maven plugin ({@code ModuxModel.locate}). See
 * {@code docs/design/catalog-and-views.md} §12 and {@code docs/design/ide-plugin.md} §4.6.
 */
public final class ModuxProject {

    /**
     * The catalog directory this plugin creates: the single, canonical home of the elements, at
     * the repo root. Hidden on purpose — the navigable surface is the views, and the catalog is
     * plumbing you rarely open by hand.
     */
    public static final String CATALOG_DIR = ".modux";

    /**
     * The model directory by convention ({@code modux/}): the Maven plugin's default, and what the
     * docs and the authoring skill write. Read first, as the Maven plugin does.
     */
    public static final String MODEL_DIR = "modux";

    /**
     * The bucket every model has: a repository is one project, and the project element lives in
     * {@code projects/}. A {@code modux/} directory needs it to count as a catalog — unlike
     * {@code .modux}, that name is common enough (a checkout of modux itself, say) to be no marker
     * on its own.
     */
    static final String PROJECTS_DIR = "projects";

    /**
     * The suffix of a view document: a saved perspective ({@code viewId} + lens + geometry) that
     * references a catalog view (§12.2). It ends in {@code .yaml} so editors and schema tooling
     * treat it as YAML; {@code modux-view} makes it unambiguous and greppable. This is what the
     * graphical editor opens on — not the catalog, which is data.
     */
    public static final String VIEW_SUFFIX = ".modux-view.yaml";

    /**
     * The filename for a view document: {@code <slug>.modux-view.yaml}. Views no longer have a type
     * — there is a single unified canvas — so nothing is encoded in the name beyond the slug. A
     * legacy {@code <slug>.<type>.modux-view.yaml} still opens (the suffix is what {@link
     * #isViewDocument} matches); its type segment is ignored.
     */
    public static String viewFileName(String slug) {
        return slug + VIEW_SUFFIX;
    }

    private ModuxProject() {}

    /**
     * Whether a directory is a catalog: named {@code .modux} (§12.3), where the name alone is the
     * marker; or named {@code modux} and holding a model (its {@code projects/}).
     */
    public static boolean isCatalog(@Nullable VirtualFile dir) {
        if (dir == null || !dir.isDirectory()) return false;
        if (CATALOG_DIR.equals(dir.getName())) return true;
        if (!MODEL_DIR.equals(dir.getName())) return false;
        var projects = dir.findChild(PROJECTS_DIR);
        return projects != null && projects.isDirectory();
    }

    /**
     * The catalog {@code dir} holds, if any: its {@code modux/} when that is one, else its
     * {@code .modux/} — the Maven plugin's precedence.
     */
    public static @Nullable VirtualFile catalogIn(@Nullable VirtualFile dir) {
        if (dir == null || !dir.isDirectory()) return null;
        var model = dir.findChild(MODEL_DIR);
        if (isCatalog(model)) return model;
        var catalog = dir.findChild(CATALOG_DIR);
        return isCatalog(catalog) ? catalog : null;
    }

    /**
     * The catalog owning {@code file}: walking up, the first ancestor that <em>holds</em> one. Like
     * finding {@code .git} — the catalog sits at the repo root, and a view document lives off to
     * the side (in {@code docs/}, next to code…), so a walk that only matched an ancestor
     * <em>named</em> like a catalog would never reach it. What binds a view to a model is not its
     * path but the catalog it resolves to.
     */
    public static @Nullable VirtualFile catalogRootFor(@Nullable VirtualFile file) {
        for (var candidate = directoryOf(file); candidate != null; candidate = candidate.getParent()) {
            var catalog = catalogIn(candidate);
            if (catalog != null) return catalog;
        }
        return null;
    }

    /** Whether this file is a view document — what the graphical editor opens on. */
    public static boolean isViewDocument(@Nullable VirtualFile file) {
        return file != null && !file.isDirectory() && file.getName().endsWith(VIEW_SUFFIX);
    }

    private static @Nullable VirtualFile directoryOf(@Nullable VirtualFile file) {
        if (file == null) return null;
        return file.isDirectory() ? file : file.getParent();
    }
}
