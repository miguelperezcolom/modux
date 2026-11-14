package io.mateu.modux.idea;

import com.intellij.openapi.application.WriteAction;
import com.intellij.testFramework.fixtures.BasePlatformTestCase;

/**
 * The catalog is a `.modux/` directory, or a `modux/` one holding a model (§12.3), and a view document
 * resolves to the nearest one walking up — no "current project" state anywhere.
 */
public class ModuxProjectTest extends BasePlatformTestCase {

    public void testAModuxDirIsACatalog() throws Exception {
        var catalog = myFixture.getTempDirFixture().findOrCreateDir(".modux");

        assertTrue(ModuxProject.isCatalog(catalog));
    }

    /**
     * `.modux` is a marker by its name; `modux` is too common a name for that (a checkout of modux
     * itself), so an empty one is not a catalog.
     */
    public void testAnEmptyModuxDirIsNotACatalog() throws Exception {
        var other = myFixture.getTempDirFixture().findOrCreateDir("modux");

        assertFalse(ModuxProject.isCatalog(other));
        assertFalse(ModuxProject.isCatalog(myFixture.getTempDirFixture().findOrCreateDir("model")));
    }

    /** The `modux/` the Maven plugin, the docs and the skill use is a catalog when it holds a model. */
    public void testAModuxDirWithAProjectIsACatalog() throws Exception {
        var catalog = myFixture.getTempDirFixture().findOrCreateDir("modux");
        myFixture.getTempDirFixture().createFile("modux/projects/library.yaml", "id: library\n");

        assertTrue(ModuxProject.isCatalog(catalog));
    }

    public void testAViewResolvesToAModuxDirCatalog() throws Exception {
        myFixture.getTempDirFixture().createFile("modux/projects/library.yaml", "id: library\n");
        var catalog = myFixture.getTempDirFixture().findOrCreateDir("modux");
        var view = myFixture.getTempDirFixture().createFile("docs/mapa.modux-view.yaml", "");

        assertEquals(catalog, ModuxProject.catalogRootFor(view));
    }

    /** Both there: `modux/` wins, as it does for the Maven plugin (ModuxModel.locate). */
    public void testModuxDirWinsOverTheHiddenCatalog() throws Exception {
        myFixture.getTempDirFixture().findOrCreateDir(".modux");
        myFixture.getTempDirFixture().createFile("modux/projects/library.yaml", "id: library\n");
        var model = myFixture.getTempDirFixture().findOrCreateDir("modux");
        var view = myFixture.getTempDirFixture().createFile("docs/mapa.modux-view.yaml", "");

        assertEquals(model, ModuxProject.catalogRootFor(view));
        assertEquals(model, ModuxProject.catalogIn(model.getParent()));
    }

    /** …unless that `modux/` holds no model: then the hidden catalog is the one. */
    public void testAnEmptyModuxDirDoesNotHideTheCatalog() throws Exception {
        var catalog = myFixture.getTempDirFixture().findOrCreateDir(".modux");
        myFixture.getTempDirFixture().findOrCreateDir("modux");

        assertEquals(catalog, ModuxProject.catalogIn(catalog.getParent()));
    }

    /** A view document, wherever it lives, resolves to the nearest catalog walking up. */
    public void testAViewResolvesToTheNearestCatalog() throws Exception {
        var catalog = myFixture.getTempDirFixture().findOrCreateDir(".modux");
        var repoRoot = catalog.getParent();
        var view = WriteAction.computeAndWait(() ->
                repoRoot.createChildDirectory(this, "docs").createChildData(this, "reservas.modux-view.yaml"));

        assertEquals(catalog, ModuxProject.catalogRootFor(view));
    }

    /** The catalog sits beside the view, not above it: the walk finds the ancestor that HOLDS it. */
    public void testAViewDeepInDocsStillFindsTheCatalog() throws Exception {
        var catalog = myFixture.getTempDirFixture().findOrCreateDir(".modux");
        var repoRoot = catalog.getParent();
        var view = WriteAction.computeAndWait(() -> repoRoot
                .createChildDirectory(this, "docs").createChildDirectory(this, "arch")
                .createChildData(this, "mapa.modux-view.yaml"));

        assertEquals(catalog, ModuxProject.catalogRootFor(view));
    }

    public void testAFileWithNoCatalogAboveResolvesToNothing() throws Exception {
        var stray = myFixture.getTempDirFixture().createFile("elsewhere/notes.modux-view.yaml", "");

        assertNull(ModuxProject.catalogRootFor(stray));
    }

    public void testAViewDocumentIsRecognisedBySuffix() throws Exception {
        var dir = myFixture.getTempDirFixture().findOrCreateDir("docs");
        var view = WriteAction.computeAndWait(() -> dir.createChildData(this, "reservas.modux-view.yaml"));
        var plain = WriteAction.computeAndWait(() -> dir.createChildData(this, "reservas.yaml"));

        assertTrue(ModuxProject.isViewDocument(view));
        assertFalse(ModuxProject.isViewDocument(plain));
    }
}
