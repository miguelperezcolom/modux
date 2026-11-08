package io.mateu.modux.figma;

import java.util.List;
import java.util.Map;

/**
 * A designed screen: one top-level Figma frame, mapped through the Mateu design contract.
 *
 * @param template the Mateu FormTemplate the screen fills ({@code ItemOverviewPage}…), or null
 *     for a free page
 */
public record Screen(String name, String route, String type, List<Node> content, String template) {

    public Screen(String name, String route, String type, List<Node> content) {
        this(name, route, type, content, null);
    }

    /** One recognized node: a Mateu component instance or a grouping layout. */
    public record Node(String kind, String title, String text, String label, String fieldId,
                       String stereotype, Map<String, String> params, List<Node> children) {

        public String param(String key) {
            return params == null ? null : params.get(key);
        }

        public boolean boolParam(String key) {
            return "true".equals(param(key));
        }
    }
}
