package io.mateu.modux.idea;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VfsUtil;
import com.intellij.openapi.vfs.VirtualFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * The model's file operations, done through the IDE's virtual file system.
 *
 * <p>Going through the VFS rather than {@code java.nio} is what makes edits behave like edits:
 * they land in the IDE's undo stack, the editor refreshes, and version control notices. Writes
 * are wrapped in a write command so a whole gesture undoes as one step.
 *
 * <p>This is the Java half of the file-system contract the TypeScript side declares; the applier
 * decides <em>what</em> to write, this only writes it.
 */
public final class ModelFiles {

    private final Project project;
    private final VirtualFile root;

    /** Set once the catalog has been re-read from disk for this editor session. */
    private volatile boolean fresh;

    public ModelFiles(Project project, VirtualFile root) {
        this.project = project;
        this.root = root;
    }

    /**
     * The VFS is a cache: a file changed outside the IDE (a git pull, an agent, another editor) may
     * not be in it yet. Loading from that stale copy would be bad enough; the next save would then
     * write it over the newer file. So the first access of a session syncs the catalog with disk.
     */
    private void ensureFresh() {
        if (fresh) return;
        fresh = true;
        VfsUtil.markDirtyAndRefresh(false, true, true, root);
    }

    /** File names directly inside a directory relative to the model root. */
    public List<String> list(String dir) {
        ensureFresh();
        var directory = resolve(dir);
        if (directory == null || !directory.isDirectory()) return List.of();
        return Arrays.stream(directory.getChildren())
                .filter(child -> !child.isDirectory())
                .map(VirtualFile::getName)
                .toList();
    }

    /** Subdirectory names directly inside a directory — the element buckets (§12.3). */
    public List<String> listDirs(String dir) {
        ensureFresh();
        var directory = resolve(dir);
        if (directory == null || !directory.isDirectory()) return List.of();
        return Arrays.stream(directory.getChildren())
                .filter(VirtualFile::isDirectory)
                .map(VirtualFile::getName)
                .toList();
    }

    public String read(String path) throws IOException {
        ensureFresh();
        var file = resolve(path);
        if (file == null) throw new IOException("no such file: " + path);
        return VfsUtil.loadText(file);
    }

    public boolean exists(String path) {
        ensureFresh();
        return resolve(path) != null;
    }

    /**
     * Write a batch as one undoable step. Directories are created on demand, which is how a
     * brand-new element type gets its bucket.
     */
    public void write(List<FileWrite> writes, List<String> deletes) throws IOException {
        if (writes.isEmpty() && deletes.isEmpty()) return;
        WriteCommandAction.writeCommandAction(project)
                .withName("Modux Model Edit")
                .<IOException>run(() -> {
                    for (var write : writes) writeOne(write.path(), write.content());
                    for (var path : deletes) deleteOne(path);
                });
    }

    private void writeOne(String path, String content) throws IOException {
        var separator = path.lastIndexOf('/');
        var directory = separator < 0 ? root : mkdirs(path.substring(0, separator));
        var name = separator < 0 ? path : path.substring(separator + 1);
        var file = directory.findChild(name);
        if (file == null) file = directory.createChildData(this, name);
        file.setBinaryContent(content.getBytes(StandardCharsets.UTF_8));
    }

    private void deleteOne(String path) throws IOException {
        var file = resolve(path);
        if (file != null) file.delete(this);
    }

    private VirtualFile mkdirs(String relative) throws IOException {
        var current = root;
        for (var segment : relative.split("/")) {
            if (segment.isEmpty()) continue;
            var child = current.findChild(segment);
            current = child != null ? child : current.createChildDirectory(this, segment);
        }
        return current;
    }

    private VirtualFile resolve(String path) {
        return ApplicationManager.getApplication().runReadAction(
                (com.intellij.openapi.util.Computable<VirtualFile>) () -> {
                    var current = root;
                    for (var segment : path.split("/")) {
                        if (segment.isEmpty()) continue;
                        current = current.findChild(segment);
                        if (current == null) return null;
                    }
                    return current;
                });
    }

    /** One file to write: path relative to the model root, and its whole content. */
    public record FileWrite(String path, String content) {}

    /** Collect writes and deletes as the bridge decodes them. */
    public static final class Batch {
        public final List<FileWrite> writes = new ArrayList<>();
        public final List<String> deletes = new ArrayList<>();
    }
}
