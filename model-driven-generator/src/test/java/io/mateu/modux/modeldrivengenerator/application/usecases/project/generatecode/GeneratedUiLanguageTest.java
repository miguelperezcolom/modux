package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The words the generated UI adds on its own follow the project's language: English unless it says Spanish. */
class GeneratedUiLanguageTest {

    @Test
    void a_project_that_declares_no_language_gets_english() {
        assertFalse(GenerateCodeUseCase.speaksSpanish(ProjectEntity.builder().id("p").name("P").build()));
    }

    @Test
    void the_default_locale_decides() {
        assertTrue(GenerateCodeUseCase.speaksSpanish(ProjectEntity.builder().id("p").name("P").defaultLocale("es-ES").build()));
        assertFalse(GenerateCodeUseCase.speaksSpanish(ProjectEntity.builder().id("p").name("P").defaultLocale("en").locales(List.of("es", "en")).build()));
    }

    @Test
    void without_a_default_the_first_locale_decides() {
        assertTrue(GenerateCodeUseCase.speaksSpanish(ProjectEntity.builder().id("p").name("P").locales(List.of("es", "en")).build()));
    }
}
