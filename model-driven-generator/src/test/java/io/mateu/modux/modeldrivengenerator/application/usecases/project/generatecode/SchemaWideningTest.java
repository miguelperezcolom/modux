package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** A column change that keeps every stored value is applied by the migration; any other one is left for review. */
class SchemaWideningTest {

    @Test
    void varchar_to_text_or_to_a_longer_varchar_only_widens() {
        assertTrue(GenerateCodeUseCase.widens("varchar(255)", "text"));
        assertTrue(GenerateCodeUseCase.widens("varchar(50)", "varchar(255)"));
    }

    @Test
    void narrowing_or_changing_the_kind_of_value_is_left_for_review() {
        assertFalse(GenerateCodeUseCase.widens("text", "varchar(255)"));
        assertFalse(GenerateCodeUseCase.widens("varchar(255)", "varchar(50)"));
        assertFalse(GenerateCodeUseCase.widens("varchar(255)", "integer"));
        assertFalse(GenerateCodeUseCase.widens("varchar(255)", "varchar(255)"));
    }
}
