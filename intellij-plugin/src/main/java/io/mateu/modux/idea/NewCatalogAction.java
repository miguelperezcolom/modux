package io.mateu.modux.idea;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Initialise a modux catalog: create {@code .modux/} with its marker at the chosen directory
 * (§12.3). The catalog is the single, canonical home of the elements; views come next, as their
 * own documents.
 */
public final class NewCatalogAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent event) {
        var project = event.getProject();
        var dir = ModuxActionSupport.targetDir(event);
        if (project == null || dir == null) return;

        var existing = ModuxProject.catalogIn(dir);
        if (existing != null || dir.findChild(ModuxProject.CATALOG_DIR) != null) {
            Messages.showInfoMessage(project, "Ya hay un "
                    + (existing != null ? existing.getName() : ModuxProject.CATALOG_DIR)
                    + "/ en " + dir.getPath() + ".", "Modux");
            return;
        }
        try {
            // The directory's name is the marker and the buckets appear as elements are added
            // (§12.3). The one element seeded is the project: a repository is one project, and
            // without it nothing can be generated — nor is there any gesture to create it later.
            var slug = ModuxActionSupport.slug(dir.getName());
            var catalog = WriteCommandAction.writeCommandAction(project)
                    .withName("Init Modux Catalog")
                    .<VirtualFile, IOException>compute(() -> {
                        var root = dir.createChildDirectory(this, ModuxProject.CATALOG_DIR);
                        var file = root.createChildDirectory(this, "projects").createChildData(this, slug + ".yaml");
                        file.setBinaryContent(projectYaml(slug, dir.getName()).getBytes(StandardCharsets.UTF_8));
                        return root;
                    });
            Messages.showInfoMessage(project, "Catálogo creado en " + catalog.getPath()
                    + " (proyecto «" + slug + "», revisa su paquete en projects/" + slug + ".yaml)."
                    + "\nCrea una vista con New → Modux View.", "Modux");
        } catch (IOException e) {
            Messages.showErrorDialog(project, "No se pudo crear el catálogo: " + e.getMessage(), "Modux");
        }
    }

    /** The seeded project element: identity and where generation goes, all of it editable. */
    static String projectYaml(String slug, String name) {
        var pkg = "com.example." + slug.replace("-", "");
        return "id: " + slug + "\n"
                + "name: \"" + name.replace("\"", "") + "\"\n"
                + "packageName: " + pkg + "\n"
                + "outputPath: generated\n";
    }
}
