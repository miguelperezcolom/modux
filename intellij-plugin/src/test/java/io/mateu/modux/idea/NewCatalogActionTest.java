package io.mateu.modux.idea;

import junit.framework.TestCase;

/**
 * A new catalog is born with its project: without one nothing can be generated, and no gesture in
 * the editor creates it later.
 */
public class NewCatalogActionTest extends TestCase {

    public void testTheSeededProjectIsGeneratable() {
        var yaml = NewCatalogAction.projectYaml("mi-biblioteca", "Mi Biblioteca");

        assertTrue(yaml.contains("id: mi-biblioteca\n"));
        assertTrue(yaml.contains("name: \"Mi Biblioteca\"\n"));
        // a valid Java package, which the generator requires
        assertTrue(yaml.contains("packageName: com.example.mibiblioteca\n"));
        assertTrue(yaml.contains("outputPath: generated\n"));
    }
}
