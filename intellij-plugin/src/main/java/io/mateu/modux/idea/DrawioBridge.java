package io.mateu.modux.idea;

import com.google.gson.Gson;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.intellij.AppTopics;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.fileEditor.FileDocumentManagerListener;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.vfs.VfsUtil;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.ui.jcef.JBCefBrowser;
import com.intellij.ui.jcef.JBCefJSQuery;
import org.cef.CefSettings;
import org.cef.browser.CefBrowser;
import org.cef.handler.CefDisplayHandlerAdapter;

import javax.swing.JComponent;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.function.Consumer;

/**
 * Hosts the draw.io editor surface for a view document, and answers its file requests.
 *
 * <p>The SECOND host over the same model (§ "one editor, two hosts"): the modux canvas lives in
 * {@link EditorBridge}; this one embeds the vendored draw.io instead. It speaks the exact same file
 * protocol — {@code list}/{@code read}/{@code flush}/{@code readView}/{@code writeView} — so the
 * TypeScript side reuses {@code ide-fs} unchanged and the model logic (mapping the strategic tier to
 * mxGraph and back) stays in TypeScript. Java only moves bytes.
 */
public final class DrawioBridge implements Disposable {

    private static final Logger LOG = Logger.getInstance(DrawioBridge.class);
    private static final Gson GSON = new Gson();

    private final JBCefBrowser browser;
    private final JBCefJSQuery query;
    private final ModelFiles files;
    private final Project project;
    private final VirtualFile viewFile;
    private Consumer<Boolean> onModified;
    private volatile boolean modified;

    public DrawioBridge(Project project, VirtualFile catalogRoot, VirtualFile viewFile) {
        this.project = project;
        this.viewFile = viewFile;
        this.files = catalogRoot != null ? new ModelFiles(project, catalogRoot) : null;
        this.browser = JBCefBrowser.createBuilder().setOffScreenRendering(false).build();
        this.query = JBCefJSQuery.create((com.intellij.ui.jcef.JBCefBrowserBase) browser);

        query.addHandler(this::handle);
        Disposer.register(this, browser);
        Disposer.register(this, query);
        instrument();

        // Native save (Ctrl+S / Save All): route into the webview, which flushes its buffer.
        ApplicationManager.getApplication().getMessageBus().connect(this).subscribe(
                AppTopics.FILE_DOCUMENT_SYNC,
                new FileDocumentManagerListener() {
                    @Override
                    public void beforeAllDocumentsSaving() {
                        if (modified) requestSave();
                    }
                });

        if (!DrawioResources.isBundled()) {
            LOG.error("the draw.io host is missing from the plugin: build editor/ and vendor drawio/");
        }
        browser.getJBCefClient().addRequestHandler(
                new DrawioResources(page(), this), browser.getCefBrowser());
        browser.loadURL(DrawioResources.INDEX);
    }

    /** Send webview console output to idea.log, so a blank panel has a trail. */
    private void instrument() {
        browser.getJBCefClient().addDisplayHandler(new CefDisplayHandlerAdapter() {
            @Override
            public boolean onConsoleMessage(CefBrowser browser, CefSettings.LogSeverity level,
                                            String message, String source, int line) {
                var text = "modux drawio: " + message + " (" + source + ":" + line + ")";
                if (level == CefSettings.LogSeverity.LOGSEVERITY_ERROR) LOG.warn(text);
                else LOG.info(text);
                return false;
            }
        }, browser.getCefBrowser());
    }

    public JComponent component() {
        return browser.getComponent();
    }

    void onModified(Consumer<Boolean> callback) {
        this.onModified = callback;
    }

    void saveIfDirty() {
        if (modified) requestSave();
    }

    private void requestSave() {
        browser.getCefBrowser().executeJavaScript(
                "window.__moduxSave && window.__moduxSave();", browser.getCefBrowser().getURL(), 0);
    }

    /** Serve one request from the host. Errors come back as data, never a dead promise. */
    private JBCefJSQuery.Response handle(String raw) {
        try {
            var request = GSON.fromJson(raw, JsonObject.class);
            var op = request.get("op").getAsString();
            if (files == null && !op.equals("setModified")) {
                throw new IllegalStateException("no hay catálogo .modux/ por encima de este documento");
            }
            var result = switch (op) {
                case "list" -> GSON.toJsonTree(files.list(path(request)));
                case "listDirs" -> GSON.toJsonTree(files.listDirs(path(request)));
                case "read" -> GSON.toJsonTree(files.read(path(request)));
                case "exists" -> GSON.toJsonTree(files.exists(path(request)));
                case "flush" -> flush(request);
                case "readView" -> GSON.toJsonTree(readView());
                case "writeView" -> writeView(request);
                case "setModified" -> setModified(request);
                default -> throw new IllegalArgumentException("unknown op: " + op);
            };
            var envelope = new JsonObject();
            envelope.add("ok", GSON.toJsonTree(true));
            envelope.add("value", result);
            return new JBCefJSQuery.Response(GSON.toJson(envelope));
        } catch (Exception e) {
            LOG.warn("modux drawio bridge request failed", e);
            var envelope = new JsonObject();
            envelope.add("ok", GSON.toJsonTree(false));
            envelope.add("error", GSON.toJsonTree(String.valueOf(e.getMessage())));
            return new JBCefJSQuery.Response(GSON.toJson(envelope));
        }
    }

    private com.google.gson.JsonElement setModified(JsonObject request) {
        this.modified = request.has("modified") && request.get("modified").getAsBoolean();
        if (onModified != null) onModified.accept(this.modified);
        return JsonNull.INSTANCE;
    }

    private String readView() throws IOException {
        return VfsUtil.loadText(viewFile);
    }

    private com.google.gson.JsonElement writeView(JsonObject request) throws IOException {
        var content = request.get("content").getAsString();
        WriteCommandAction.writeCommandAction(project)
                .withName("Modux View Edit (draw.io)")
                .<IOException>run(() -> viewFile.setBinaryContent(content.getBytes(StandardCharsets.UTF_8)));
        return GSON.toJsonTree(true);
    }

    /** Apply a batch of writes/deletes as one undo step — one gesture, one undo. */
    private com.google.gson.JsonElement flush(JsonObject request) throws IOException {
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
        return GSON.toJsonTree(writes.size() + deletes.size());
    }

    private static String path(JsonObject request) {
        return request.get("path").getAsString();
    }

    /**
     * The page that hosts draw.io. {@code moduxBridge} is the single entry point the TypeScript uses
     * to reach the file protocol; {@code drawio-host.js} builds the iframe and runs the bridge.
     */
    private String page() {
        return """
                <!doctype html>
                <html lang="%s">
                  <head>
                    <meta charset="utf-8">
                    <style> html, body { margin: 0; height: 100%%; overflow: hidden; } </style>
                  </head>
                  <body>
                    <script>
                      window.moduxBridge = function (request) {
                        return new Promise(function (resolve, reject) {
                          %s
                        });
                      };
                      window.addEventListener('error', function (e) {
                        console.error('modux drawio host crashed: ' + (e.error ? e.error.stack : e.message));
                      });
                    </script>
                    <script type="module" src="./drawio-host.js"></script>
                  </body>
                </html>
                """.formatted(
                EditorResources.uiLanguage(),
                query.inject("JSON.stringify(request)",
                        "function(r){ var p = JSON.parse(r); p.ok ? resolve(p.value) : reject(new Error(p.error)); }",
                        "function(code, message){ reject(new Error(message)); }"));
    }

    @Override
    public void dispose() {
        saveIfDirty();
    }
}
