package io.mateu.modux.idea;

import com.intellij.openapi.application.WriteAction;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.testFramework.fixtures.BasePlatformTestCase;

/**
 * Finding another project's model on this machine.
 *
 * <p>This is the I/O half of referencing a project. It lives here, and not in the applier, because
 * the applier does no I/O — and that purity is what lets every other command be tested without
 * files. See {@code docs/design/ide-plugin.md} §4.7.
 */
public class ReferencedProjectsTest extends BasePlatformTestCase {

    /** A repository with its catalog (`.modux/`) in it, beside the others. */
    private VirtualFile repository(String name) throws Exception {
        return WriteAction.computeAndWait(() -> myFixture.getTempDirFixture()
                .findOrCreateDir("checkouts/" + name)
                .createChildDirectory(this, ModuxProject.CATALOG_DIR));
    }

    /**
     * The point of keeping the git URL as the canonical form: while you work on two projects at
     * once they sit side by side, so the URL alone resolves — no network, and nothing
     * machine-specific written into the versioned model.
     */
    public void testFindsASiblingCheckoutFromTheGitUrlAlone() throws Exception {
        var here = repository("booking");
        var there = repository("checkin");

        assertEquals(there,
                ReferencedProjects.locate(here, "git@github.com:acme/checkin.git", null));
    }

    /** A sibling whose model is in `modux/` (the Maven plugin's convention) resolves too. */
    public void testFindsASiblingWhoseModelIsInModuxDir() throws Exception {
        var here = repository("booking");
        myFixture.getTempDirFixture().createFile("checkouts/library/modux/projects/library.yaml", "id: library\n");
        var there = myFixture.getTempDirFixture().findOrCreateDir("checkouts/library/modux");

        assertEquals(there,
                ReferencedProjects.locate(here, "https://github.com/acme/library.git", null));
    }

    /** An explicit path can point straight at the catalog directory. */
    public void testAnExplicitPathWins() throws Exception {
        var here = repository("booking");
        var there = repository("elsewhere");

        assertEquals(there, ReferencedProjects.locate(here,
                "git@github.com:acme/checkin.git", "../../elsewhere/.modux"));
    }

    /** Not finding it is an ANSWER: the reference's snapshot is intact, only refreshing is lost. */
    public void testAnsweringNothingWhenThereIsNoCheckout() throws Exception {
        var here = repository("booking");

        assertNull(ReferencedProjects.locate(here, "git@github.com:acme/ausente.git", null));
        assertNull(ReferencedProjects.locate(here, null, "../../ausente/.modux"));
        assertNull(ReferencedProjects.locate(here, null, null));
    }

    /** A repository without a catalog is not an answer either. */
    public void testARepositoryWithoutACatalogIsNotAProject() throws Exception {
        var here = repository("booking");
        WriteAction.runAndWait(() ->
                myFixture.getTempDirFixture().findOrCreateDir("checkouts/checkin/src"));

        assertNull(ReferencedProjects.locate(here, "git@github.com:acme/checkin.git", null));
    }

    public void testReadsTheRepositoryNameOutOfEveryUrlShape() {
        assertEquals("checkin", ReferencedProjects.repositoryName("git@github.com:acme/checkin.git"));
        assertEquals("checkin", ReferencedProjects.repositoryName("https://github.com/acme/checkin"));
        assertEquals("checkin", ReferencedProjects.repositoryName("https://github.com/acme/checkin/"));
        assertEquals("checkin", ReferencedProjects.repositoryName("ssh://git@host:2222/acme/checkin.git"));
        assertNull(ReferencedProjects.repositoryName("  "));
        assertNull(ReferencedProjects.repositoryName(null));
    }
}
