package io.mateu.modux.idea;

import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.ui.Messages;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Create a view document ({@code *.modux-view.yaml}) and open it (§12.2). The document references a
 * catalog view by id and carries geometry; there is a single unified canvas now, so no type is
 * chosen. It lives wherever the user runs the action, and needs a catalog above it to resolve
 * against — if there is none, it is still created, and opening it is what reports the missing one.
 */
public final class NewViewAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent event) {
        var project = event.getProject();
        var dir = ModuxActionSupport.targetDir(event);
        if (project == null || dir == null) return;

        var name = Messages.showInputDialog(project, "Nombre de la vista:", "Nueva vista Modux", null);
        if (name == null || name.isBlank()) return;
        var slug = ModuxActionSupport.slug(name);
        var fileName = ModuxProject.viewFileName(slug);

        if (dir.findChild(fileName) != null) {
            Messages.showErrorDialog(project, "Ya existe " + fileName + " en " + dir.getPath() + ".", "Modux");
            return;
        }
        if (ModuxProject.catalogRootFor(dir) == null) {
            Messages.showWarningDialog(project, "No hay un catálogo " + ModuxProject.MODEL_DIR
                    + "/ (ni " + ModuxProject.CATALOG_DIR + "/) por encima. La vista se crea, pero no abrirá hasta que exista uno.", "Modux");
        }
        // A curated view seeded empty: geometry fills in as you draw on the unified canvas.
        var content = "viewId: " + slug + "\ngeometry:\n  nodes: {}\n  edges: {}\n";
        try {
            var view = WriteCommandAction.writeCommandAction(project)
                    .withName("New Modux View")
                    .<com.intellij.openapi.vfs.VirtualFile, IOException>compute(() -> {
                        var file = dir.createChildData(this, fileName);
                        file.setBinaryContent(content.getBytes(StandardCharsets.UTF_8));
                        return file;
                    });
            FileEditorManager.getInstance(project).openFile(view, true);
        } catch (IOException e) {
            Messages.showErrorDialog(project, "No se pudo crear la vista: " + e.getMessage(), "Modux");
        }
    }
}
