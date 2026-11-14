package io.mateu.modux.idea;

import com.intellij.DynamicBundle;
import com.intellij.openapi.Disposable;
import com.intellij.ui.jcef.utils.JBCefStreamResourceHandler;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.handler.CefRequestHandlerAdapter;
import org.cef.handler.CefResourceHandler;
import org.cef.handler.CefResourceRequestHandler;
import org.cef.handler.CefResourceRequestHandlerAdapter;
import org.cef.misc.BoolRef;
import org.cef.network.CefRequest;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Serves the editor bundle to the webview from inside the plugin jar.
 *
 * <p>The bundle cannot simply be pointed at: {@code getResource} on a packaged plugin yields a
 * {@code jar:file:…!/…} URL, and the browser has no such scheme — the page would load and the
 * script would silently never arrive. So the plugin answers for an origin of its own and streams
 * each file out of the classpath as it is asked for.
 *
 * <p>Resolving on demand rather than from a registered list is what lets the bundle stay whatever
 * {@code editor/} happened to build: the code-split chunk carries a content hash in its name, and
 * the page asks for it by that name at run time.
 */
final class EditorResources extends CefRequestHandlerAdapter {

    /** Where the bundle lives inside the plugin jar. */
    private static final String BUNDLE = "/modux-editor";

    /**
     * The origin the editor is served from. It is never resolved over the network — every request
     * to it is answered here — but it has to be a real-looking origin so the browser treats the
     * page as same-origin with its own module imports.
     */
    static final String ORIGIN = "http://modux-editor.localhost";

    static final String INDEX = ORIGIN + "/index.html";

    /**
     * The IDE's UI language as a BCP 47 tag, for the page's {@code <html lang>}: the editor picks
     * its own language from it (Spanish for {@code es*}, English otherwise).
     */
    static String uiLanguage() {
        String tag = DynamicBundle.getLocale().toLanguageTag();
        // a language tag is letters, digits and dashes; anything else would break the markup
        return tag.matches("[A-Za-z0-9-]+") ? tag : "en";
    }

    private final String page;
    private final Disposable parent;

    EditorResources(String page, Disposable parent) {
        this.page = page;
        this.parent = parent;
    }

    @Override
    public CefResourceRequestHandler getResourceRequestHandler(
            CefBrowser browser, CefFrame frame, CefRequest request, boolean isNavigation,
            boolean isDownload, String requestInitiator, BoolRef disableDefaultHandling) {
        if (!request.getURL().startsWith(ORIGIN + "/")) return null;
        disableDefaultHandling.set(true);
        return new CefResourceRequestHandlerAdapter() {
            @Override
            public CefResourceHandler getResourceHandler(CefBrowser b, CefFrame f, CefRequest r) {
                return serve(r.getURL());
            }
        };
    }

    /** The file behind a URL, or null — which the browser reports as a failed request. */
    private CefResourceHandler serve(String url) {
        var resource = resolve(URI.create(url).getPath());
        return resource == null ? null
                : new JBCefStreamResourceHandler(resource.stream(), resource.mimeType(), parent, Map.of());
    }

    /**
     * What is served for a path under the editor's origin, or null when nothing is.
     *
     * <p>Separate from {@link #serve} so it can be exercised without a browser: this is the part
     * that decides whether the bundle is reachable at all.
     */
    Resource resolve(String path) {
        if (path == null || path.contains("..")) return null;
        if (path.equals("/index.html")) {
            return new Resource(new ByteArrayInputStream(page.getBytes(StandardCharsets.UTF_8)), "text/html");
        }
        var stream = EditorResources.class.getResourceAsStream(BUNDLE + path);
        return stream == null ? null : new Resource(stream, mimeTypeOf(path));
    }

    /** One file of the bundle, ready to stream. */
    record Resource(InputStream stream, String mimeType) {}

    private static String mimeTypeOf(String path) {
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json") || path.endsWith(".map")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    /** Whether the editor bundle was packaged at all — a build mistake, not a run-time one. */
    static boolean isBundled() {
        return EditorResources.class.getResource(BUNDLE + "/modux-editor.js") != null;
    }
}
