package io.mateu.modux.idea;

import com.google.gson.Gson;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.intellij.AppTopics;
import com.intellij.ide.IdeEventQueue;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.fileEditor.FileDocumentManagerListener;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.vcs.ProjectLevelVcsManager;
import com.intellij.openapi.vcs.VcsConfiguration;
import com.intellij.openapi.vcs.VcsShowConfirmationOption;
import com.intellij.openapi.vfs.VfsUtil;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.jcef.JBCefBrowser;
import com.intellij.ui.jcef.JBCefJSQuery;
import com.intellij.util.messages.Topic;
import org.cef.CefSettings;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.handler.CefDisplayHandlerAdapter;
import org.cef.handler.CefLoadHandlerAdapter;

import javax.swing.JComponent;
import javax.swing.SwingUtilities;
import java.awt.AWTEvent;
import java.awt.KeyboardFocusManager;
import java.awt.event.KeyEvent;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.function.Consumer;

/**
 * Hosts the editor web component and answers its file requests.
 *
 * <p>The protocol is deliberately just the file system: list, read, write, delete, exists. The
 * model's mutation logic lives in TypeScript with the editor (see {@code editor/src/store/}), so
 * nothing here knows what an aggregate is — it moves bytes. That is the invariant the whole
 * design rests on: TypeScript writes the model, Java only reads it, to generate.
 */
public final class EditorBridge implements Disposable {

    private static final Logger LOG = Logger.getInstance(EditorBridge.class);
    private static final Gson GSON = new Gson();

    /** One editor wrote the catalog; other editors on the SAME catalog reload so their view updates. */
    interface CatalogChangeListener {
        void catalogChanged(String catalogPath, Object source);
    }

    static final Topic<CatalogChangeListener> CATALOG_CHANGED =
            Topic.create("modux catalog changed", CatalogChangeListener.class);

    private final JBCefBrowser browser;
    private final JBCefJSQuery query;
    private final ModelFiles files;
    private final Project project;
    private final VirtualFile catalogRoot;
    private final VirtualFile viewFile;
    /** Told the editor's dirty state (from the webview's setModified op) — wired to the FileEditor. */
    private Consumer<Boolean> onModified;
    /** Latest dirty state, so the Ctrl+S hook only bothers the webview when there is work to save. */
    private volatile boolean modified;
    /** Whether a text field inside the webview holds focus — then the clipboard keys stay native. */
    private volatile boolean textFieldFocused;

    /**
     * Two roots, by §12: the catalog (`.modux/`) that owns the elements — where {@code list}/
     * {@code read}/{@code flush} go — and the view document the editor is opened on, read and
     * written on its own ({@code readView}/{@code writeView}). The catalog may be null when a view
     * resolves to none above it; catalog ops then fail with a clear message, but the document still
     * opens.
     */
    public EditorBridge(Project project, VirtualFile catalogRoot, VirtualFile viewFile) {
        this.project = project;
        this.catalogRoot = catalogRoot;
        this.viewFile = viewFile;
        this.files = catalogRoot != null ? new ModelFiles(project, catalogRoot) : null;
        this.browser = JBCefBrowser.createBuilder().setOffScreenRendering(false).build();
        this.query = JBCefJSQuery.create((com.intellij.ui.jcef.JBCefBrowserBase) browser);

        query.addHandler(this::handle);
        Disposer.register(this, browser);
        Disposer.register(this, query);
        instrument();
        installPinchZoom();

        // Native save: Ctrl+S (Save All) asks every editor to persist. The webview holds the unsaved
        // work in memory; here we route the request into it, which flushes and clears the dirty flag.
        ApplicationManager.getApplication().getMessageBus().connect(this).subscribe(
                AppTopics.FILE_DOCUMENT_SYNC,
                new FileDocumentManagerListener() {
                    @Override
                    public void beforeAllDocumentsSaving() {
                        if (modified) requestSave();
                    }
                });

        // Live cross-view sync: when ANOTHER editor on the same catalog writes, reload from disk so
        // this view reflects the change (a rename in one view shows in every open view of it).
        project.getMessageBus().connect(this).subscribe(CATALOG_CHANGED,
                (CatalogChangeListener) (path, source) -> {
                    if (source != this && catalogRoot != null && catalogRoot.getPath().equals(path)) {
                        browser.getCefBrowser().executeJavaScript(
                                "window.__moduxReload && window.__moduxReload();",
                                browser.getCefBrowser().getURL(), 0);
                    }
                });

        silenceGitAddPrompt();
        // On macOS IntelliJ's Undo (Cmd+Z) grabs the key before the webview ever sees it. Intercept
        // it at the event queue (which runs before action dispatch) while OUR editor holds focus, and
        // route it to the editor's own undo/redo history instead.
        IdeEventQueue.getInstance().addDispatcher(this::interceptUndoRedo, this);
        // Same for the clipboard keys (Cmd/Ctrl+C, Cmd/Ctrl+V): IntelliJ's $Copy/$Paste actions grab
        // them first, so the webview never sees them. Route to the canvas's own copy/paste — but only
        // when a text field is NOT focused, so native text copy/paste in inputs keeps working.
        IdeEventQueue.getInstance().addDispatcher(this::interceptCopyPaste, this);

        if (!EditorResources.isBundled()) {
            LOG.error("the modux editor bundle is missing from the plugin: build editor/ first");
        }
        // per-browser, so several open models never answer each other's requests
        browser.getJBCefClient().addRequestHandler(
                new EditorResources(page(), this), browser.getCefBrowser());
        browser.loadURL(EditorResources.INDEX);
    }

    /**
     * Send what happens inside the webview to the IDE log.
     *
     * <p>Without this a failure in the editor is an empty panel and nothing else: the browser
     * swallows its own console, and a bundle that fails to load looks exactly like a bundle that
     * loaded and drew nothing. Both are things this plugin can get wrong, so both have to be
     * visible in {@code idea.log}.
     */
    private void instrument() {
        browser.getJBCefClient().addDisplayHandler(new CefDisplayHandlerAdapter() {
            @Override
            public boolean onConsoleMessage(CefBrowser browser, CefSettings.LogSeverity level,
                                            String message, String source, int line) {
                var text = "modux editor: " + message + " (" + source + ":" + line + ")";
                if (level == CefSettings.LogSeverity.LOGSEVERITY_ERROR) LOG.warn(text);
                else LOG.info(text);
                return false;
            }
        }, browser.getCefBrowser());

        browser.getJBCefClient().addLoadHandler(new CefLoadHandlerAdapter() {
            @Override
            public void onLoadError(CefBrowser browser, CefFrame frame, ErrorCode errorCode,
                                    String errorText, String failedUrl) {
                LOG.warn("modux editor failed to load " + failedUrl + ": " + errorText + " (" + errorCode + ")");
            }

            @Override
            public void onLoadEnd(CefBrowser cef, CefFrame frame, int httpStatusCode) {
                // Lift the frame-rate cap. On macOS JBR routes even a "windowed" JCEF browser through
                // an offscreen surface it composites into Swing, so CEF's windowless frame rate still
                // governs it — and its default is 30fps, which makes panning/zooming a large canvas
                // feel choppy ("a tirones"). 60 is smooth and matches the usual display refresh.
                // Set on the main frame's load, once the browser is realized. Harmless if the mode
                // turns out to be truly windowed (the call is a no-op there).
                if (frame.isMain()) {
                    cef.setWindowlessFrameRate(60);
                }
                // Debugging the webview: with -Dmodux.devtools the JCEF DevTools open once the page
                // is loaded, so a render freeze can be paused and read (there is no right-click
                // «Open DevTools» here). Opened after load so the browser is realized.
                if (frame.isMain() && !devtoolsOpened && System.getProperty("modux.devtools") != null) {
                    devtoolsOpened = true;
                    javax.swing.SwingUtilities.invokeLater(browser::openDevtools);
                }
            }
        }, browser.getCefBrowser());
    }

    private boolean devtoolsOpened = false;
    private boolean magnifyLogged = false;

    public JComponent component() {
        return browser.getComponent();
    }

    /**
     * Two-finger pinch-to-zoom on the canvas (macOS).
     *
     * <p>JBR does not hand a trackpad pinch to the web view as a pinch — it reaches CEF as ordinary
     * wheel events, indistinguishable from a two-finger scroll (verified by capturing the events:
     * {@code ctrlKey} is never set). So we tap the gesture one layer lower, at Swing: macOS delivers
     * a magnification gesture to the browser's AWT component, and each step is forwarded into the
     * editor as a wheel event at the cursor, which the canvas's existing d3-zoom turns into a zoom
     * around that point.
     *
     * <p>The Apple gesture API ({@code com.apple.eawt.event}) is macOS-only and off the compile
     * classpath, so it is reached by reflection; on any other platform, or if the classes are
     * missing, this quietly does nothing and pinch falls back to scroll-zoom.
     */
    private void installPinchZoom() {
        JComponent component = browser.getComponent();
        try {
            var gestureUtilities = Class.forName("com.apple.eawt.event.GestureUtilities");
            var gestureListener = Class.forName("com.apple.eawt.event.GestureListener");
            var magnificationListener = Class.forName("com.apple.eawt.event.MagnificationListener");
            Object listener = java.lang.reflect.Proxy.newProxyInstance(
                    magnificationListener.getClassLoader(),
                    new Class<?>[]{magnificationListener},
                    (proxy, method, args) -> {
                        if ("magnify".equals(method.getName()) && args != null && args.length == 1) {
                            double m = (double) args[0].getClass().getMethod("getMagnification").invoke(args[0]);
                            onMagnify(component, m);
                        }
                        return null;
                    });
            gestureUtilities.getMethod("addGestureListenerTo", JComponent.class, gestureListener)
                    .invoke(null, component, listener);
            LOG.info("modux editor: pinch-to-zoom gesture listener attached");
        } catch (Throwable t) {
            LOG.info("modux editor: pinch-to-zoom unavailable (" + t.getClass().getSimpleName() + ": " + t.getMessage() + ")");
        }
    }

    /** How much a pinch zooms relative to the raw magnification macOS reports. */
    private static final double PINCH_GAIN = 3.0;

    /** Forward one magnification step to the canvas as a wheel-at-cursor zoom. */
    private void onMagnify(JComponent component, double magnification) {
        if (magnification == 0 || magnification <= -1) return;
        if (!magnifyLogged) {
            magnifyLogged = true;
            LOG.info("modux editor: magnify gesture received (m=" + magnification + ")");
        }
        // Cursor position in the browser viewport (component px == client px — the browser fills it).
        var p = component.getMousePosition();
        double x = p != null ? p.x : component.getWidth() / 2.0;
        double y = p != null ? p.y : component.getHeight() / 2.0;
        // The canvas maps a wheel event to scale 2^(-clamp(deltaY)·0.005). Invert so this
        // magnification step becomes a zoom of (1+m)^PINCH_GAIN: deltaY = -GAIN·log2(1+m)/0.005.
        // At 1:1 the trackpad's ~1% steps made a whole pinch barely reach ×1.5 ("extremadamente
        // lento"); native macOS canvases amplify the gesture the same way.
        double deltaY = -PINCH_GAIN * (Math.log1p(magnification) / Math.log(2)) / 0.005;
        String js = "(function(){"
                + "function f(r){for(const e of r.querySelectorAll('*')){"
                + "if(e.tagName==='MODUX-CANVAS')return e;"
                + "if(e.shadowRoot){const x=f(e.shadowRoot);if(x)return x;}}return null;}"
                + "var c=f(document);if(!c)return;var svg=c.renderRoot.querySelector('svg.main');if(!svg)return;"
                + "svg.dispatchEvent(new WheelEvent('wheel',{deltaY:" + deltaY
                + ",clientX:" + x + ",clientY:" + y + ",bubbles:true,cancelable:true}));})()";
        browser.getCefBrowser().executeJavaScript(js, browser.getCefBrowser().getURL(), 0);
    }

    /**
     * The editor writes many small files as its normal operation; IntelliJ's "add to Git?" prompt on
     * each is pure noise. Silence it — files stay unversioned until the user stages them, which
     * matches modux's explicit-save, decide-when-to-commit model. Best-effort: no VCS, no-op.
     */
    private void silenceGitAddPrompt() {
        try {
            var vcs = ProjectLevelVcsManager.getInstance(project);
            var confirm = vcs.getStandardConfirmation(VcsConfiguration.StandardConfirmation.ADD, null);
            if (confirm.getValue() == VcsShowConfirmationOption.Value.SHOW_CONFIRMATION) {
                confirm.setValue(VcsShowConfirmationOption.Value.DO_NOTHING_SILENTLY);
            }
        } catch (Exception e) {
            LOG.warn("could not silence the git add prompt", e);
        }
    }

    /** Wire the FileEditor so it learns the webview's dirty state (modified indicator, close prompt). */
    void onModified(Consumer<Boolean> callback) {
        this.onModified = callback;
    }

    /** The webview reports its dirty state; remember it and tell the FileEditor. */
    private com.google.gson.JsonElement setModified(JsonObject request) {
        this.modified = request.has("modified") && request.get("modified").getAsBoolean();
        if (onModified != null) onModified.accept(this.modified);
        return JsonNull.INSTANCE;
    }

    /**
     * Grab Cmd/Ctrl+Z (and Ctrl+Y / Cmd+Shift+Z) before IntelliJ's own Undo, but only while THIS
     * editor's webview has focus, and forward to the webview's undo/redo. Returns true to consume.
     */
    private boolean interceptUndoRedo(AWTEvent e) {
        if (!(e instanceof KeyEvent ke) || ke.getID() != KeyEvent.KEY_PRESSED) return false;
        int code = ke.getKeyCode();
        if (code != KeyEvent.VK_Z && code != KeyEvent.VK_Y) return false;
        if ((ke.getModifiersEx() & (KeyEvent.META_DOWN_MASK | KeyEvent.CTRL_DOWN_MASK)) == 0) return false;
        var focus = KeyboardFocusManager.getCurrentKeyboardFocusManager().getFocusOwner();
        if (focus == null || !SwingUtilities.isDescendingFrom(focus, browser.getComponent())) return false;
        boolean redo = code == KeyEvent.VK_Y || (ke.getModifiersEx() & KeyEvent.SHIFT_DOWN_MASK) != 0;
        browser.getCefBrowser().executeJavaScript(
                redo ? "window.__moduxRedo && window.__moduxRedo();" : "window.__moduxUndo && window.__moduxUndo();",
                browser.getCefBrowser().getURL(), 0);
        return true;
    }

    /**
     * Grab Cmd/Ctrl+C and Cmd/Ctrl+V before IntelliJ's own $Copy/$Paste, while THIS webview has
     * focus and no text field inside it does, and route to the canvas's copy/paste. When a text
     * field is focused we do NOT consume, so native copy/paste keeps working in the properties
     * panel and inline rename.
     */
    private boolean interceptCopyPaste(AWTEvent e) {
        if (!(e instanceof KeyEvent ke) || ke.getID() != KeyEvent.KEY_PRESSED) return false;
        int code = ke.getKeyCode();
        if (code != KeyEvent.VK_C && code != KeyEvent.VK_V) return false;
        // Only the plain accelerator (no Shift/Alt), so Cmd+Shift+C and the like are left alone.
        int mods = ke.getModifiersEx();
        if ((mods & (KeyEvent.META_DOWN_MASK | KeyEvent.CTRL_DOWN_MASK)) == 0) return false;
        if ((mods & (KeyEvent.SHIFT_DOWN_MASK | KeyEvent.ALT_DOWN_MASK)) != 0) return false;
        if (textFieldFocused) return false;   // let native text copy/paste through
        var focus = KeyboardFocusManager.getCurrentKeyboardFocusManager().getFocusOwner();
        if (focus == null || !SwingUtilities.isDescendingFrom(focus, browser.getComponent())) return false;
        browser.getCefBrowser().executeJavaScript(
                code == KeyEvent.VK_C ? "window.__moduxCopy && window.__moduxCopy();"
                        : "window.__moduxPaste && window.__moduxPaste();",
                browser.getCefBrowser().getURL(), 0);
        return true;
    }

    /** The webview reports whether a text field is focused, so the clipboard keys stay native there. */
    private com.google.gson.JsonElement setTextFocus(JsonObject request) {
        this.textFieldFocused = request.has("value") && request.get("value").getAsBoolean();
        return JsonNull.INSTANCE;
    }

    /** Ask the webview to flush its buffered edits to disk (native save routes here). */
    private void requestSave() {
        browser.getCefBrowser().executeJavaScript(
                "window.__moduxSave && window.__moduxSave();", browser.getCefBrowser().getURL(), 0);
    }

    /**
     * Safety net against lost work: flush when the tab loses focus or is about to close, while the
     * webview is still alive. Ctrl+S is still the explicit save; this only fires when there IS
     * unsaved work, so it never writes for nothing.
     */
    void saveIfDirty() {
        if (modified) requestSave();
    }

    /** Serve one request from the editor. Errors come back as data, never as a dead promise. */
    private JBCefJSQuery.Response handle(String raw) {
        try {
            var request = GSON.fromJson(raw, JsonObject.class);
            var op = request.get("op").getAsString();
            var files = filesFor(request);
            var result = switch (op) {
                case "list" -> GSON.toJsonTree(files.list(path(request)));
                case "listDirs" -> GSON.toJsonTree(files.listDirs(path(request)));
                case "read" -> GSON.toJsonTree(files.read(path(request)));
                case "exists" -> GSON.toJsonTree(files.exists(path(request)));
                case "flush" -> flush(request);
                case "readView" -> GSON.toJsonTree(readView());
                case "writeView" -> writeView(request);
                case "createView" -> createView(request);
                case "resolveProject" -> GSON.toJsonTree(resolveProject(request));
                case "setModified" -> setModified(request);
                case "setTextFocus" -> setTextFocus(request);
                default -> throw new IllegalArgumentException("unknown op: " + op);
            };
            var envelope = new JsonObject();
            envelope.add("ok", GSON.toJsonTree(true));
            envelope.add("value", result);
            return new JBCefJSQuery.Response(GSON.toJson(envelope));
        } catch (Exception e) {
            LOG.warn("modux bridge request failed", e);
            var envelope = new JsonObject();
            envelope.add("ok", GSON.toJsonTree(false));
            envelope.add("error", GSON.toJsonTree(String.valueOf(e.getMessage())));
            return new JBCefJSQuery.Response(GSON.toJson(envelope));
        }
    }

    /**
     * Which model a read is against.
     *
     * <p>Without a `root` it is the open one, which is every request but the ones that go looking
     * at ANOTHER project. Those carry the root {@code resolveProject} handed back, and are
     * read-only by construction: no write operation reads this, so nothing outside the open model
     * can be written whatever the editor asks.
     */
    private ModelFiles filesFor(JsonObject request) {
        var root = request.has("root") && !request.get("root").isJsonNull()
                ? request.get("root").getAsString() : null;
        if (root == null || root.isBlank()) {
            if (files == null) throw new IllegalStateException(
                    "no hay catálogo .modux/ por encima de este documento de vista");
            return files;
        }
        var other = com.intellij.openapi.vfs.LocalFileSystem.getInstance()
                .findFileByPath(root);
        if (other == null) throw new IllegalArgumentException("no such project root: " + root);
        return new ModelFiles(project, other);
    }

    /**
     * Where another project's model is on this machine, given the coordinate the model stores
     * (§4.7), or null when it cannot be found — which the editor reports rather than failing:
     * the reference's snapshot is what generation reads, and it is intact either way.
     */
    private String resolveProject(JsonObject request) {
        var located = ReferencedProjects.locate(catalogRoot,
                string(request, "gitUrl"), string(request, "path"));
        return located == null ? null : located.getPath();
    }

    /** The view document's text — the perspective the editor is opened on. */
    private String readView() throws IOException {
        return VfsUtil.loadText(viewFile);
    }

    /**
     * Overwrite the view document. Its own undo step, separate from a catalog edit: geometry and
     * lens are the document's data, and one drag should undo without touching the catalog.
     */
    private com.google.gson.JsonElement writeView(JsonObject request) throws IOException {
        var content = request.get("content").getAsString();
        WriteCommandAction.writeCommandAction(project)
                .withName("Modux View Edit")
                .<IOException>run(() -> viewFile.setBinaryContent(content.getBytes(StandardCharsets.UTF_8)));
        return GSON.toJsonTree(true);
    }

    /**
     * The "create view from selection" gesture in the editor (§12): its catalog entity is already
     * written, so this writes and opens the DOCUMENT — the same artifact New → Modux View creates,
     * so both doors converge. It lands in a {@code views/} folder beside the catalog; a document by
     * that name already there is opened rather than clobbered.
     */
    private com.google.gson.JsonElement createView(JsonObject request) throws IOException {
        var viewId = request.get("viewId").getAsString();
        var name = string(request, "name");
        var repoRoot = catalogRoot != null ? catalogRoot.getParent() : viewFile.getParent();
        if (repoRoot == null) throw new IOException("no hay dónde crear el documento de vista");
        // One unified canvas: the document carries no type, just the slug in `<slug>.modux-view.yaml`.
        var fileName = ModuxProject.viewFileName(
                ModuxActionSupport.slug(name != null && !name.isBlank() ? name : viewId));
        // A view is self-contained: name + members + geometry live in the doc (no `.modux/views/`).
        var members = new StringBuilder();
        if (request.has("memberIds") && request.get("memberIds").isJsonArray()) {
            for (var el : request.getAsJsonArray("memberIds")) members.append("  - ").append(el.getAsString()).append('\n');
        }
        var content = "viewId: " + viewId + "\n"
                + (name != null && !name.isBlank() ? "name: " + name + "\n" : "")
                + (members.length() > 0 ? "memberIds:\n" + members : "memberIds: []\n")
                + "geometry:\n  nodes: {}\n  edges: {}\n";
        var created = WriteCommandAction.writeCommandAction(project)
                .withName("New Modux View")
                .<VirtualFile, IOException>compute(() -> {
                    var dir = repoRoot.findChild("views");
                    if (dir == null) dir = repoRoot.createChildDirectory(this, "views");
                    var existing = dir.findChild(fileName);
                    if (existing != null) return existing;
                    var file = dir.createChildData(this, fileName);
                    file.setBinaryContent(content.getBytes(StandardCharsets.UTF_8));
                    return file;
                });
        com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater(() ->
                com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project).openFile(created, true));
        return GSON.toJsonTree(created.getPath());
    }

    private static String string(JsonObject request, String field) {
        return request.has(field) && !request.get(field).isJsonNull()
                ? request.get(field).getAsString() : null;
    }

    /**
     * Apply a whole batch of writes and deletes at once. Batching is not an optimization here:
     * it is what makes one editor gesture one undo step in the IDE.
     */
    private com.google.gson.JsonElement flush(JsonObject request) throws java.io.IOException {
        var writes = new ArrayList<ModelFiles.FileWrite>();
        var deletes = new ArrayList<String>();
        for (var element : request.getAsJsonArray("writes")) {
            var write = element.getAsJsonObject();
            writes.add(new ModelFiles.FileWrite(
                    write.get("path").getAsString(), write.get("content").getAsString()));
        }
        for (var element : request.getAsJsonArray("deletes")) {
            deletes.add(element.getAsString());
        }
        files.write(writes, deletes);
        // Tell every other editor on this catalog to reload, so open views of the same model update.
        if (catalogRoot != null) {
            project.getMessageBus().syncPublisher(CATALOG_CHANGED).catalogChanged(catalogRoot.getPath(), this);
        }
        return GSON.toJsonTree(writes.size() + deletes.size());
    }

    private static String path(JsonObject request) {
        return request.get("path").getAsString();
    }

    /**
     * The page that hosts the editor. `moduxBridge` is the single entry point the TypeScript
     * host talks to; everything else about the editor is the same bundle the web app serves.
     *
     * <p>The script is referenced relatively, so it and the chunks it imports resolve against
     * {@link EditorResources#ORIGIN} and are answered from the plugin jar.
     */
    private String page() {
        return """
                <!doctype html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      html, body { margin: 0; height: 100%%; overflow: hidden; }
                      #root { height: 100%%; }
                    </style>
                  </head>
                  <body>
                    <div id="root"><modux-archi-ide></modux-archi-ide></div>
                    <script>
                      window.moduxBridge = function (request) {
                        return new Promise(function (resolve, reject) {
                          %s
                        });
                      };
                      window.addEventListener('error', function (e) {
                        console.error('modux editor crashed: ' + (e.error ? e.error.stack : e.message));
                      });
                    </script>
                    <script type="module" src="./modux-editor.js"></script>
                  </body>
                </html>
                """.formatted(
                query.inject("JSON.stringify(request)",
                        "function(r){ var p = JSON.parse(r); p.ok ? resolve(p.value) : reject(new Error(p.error)); }",
                        "function(code, message){ reject(new Error(message)); }"));
    }

    @Override
    public void dispose() {
        // children registered with Disposer go with us
    }
}
