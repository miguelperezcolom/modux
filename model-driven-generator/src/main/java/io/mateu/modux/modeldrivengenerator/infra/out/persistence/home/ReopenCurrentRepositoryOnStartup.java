package io.mateu.modux.modeldrivengenerator.infra.out.persistence.home;

import io.mateu.modux.modeldrivengenerator.application.usecases.repository.open.OpenRepositoryUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * On start, reopen the project that was open last time (~/.modux/current.yaml).
 * -Dmodux.model-file keeps working as the fallback when nothing was opened yet
 * or the repository disappeared.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReopenCurrentRepositoryOnStartup {

    final ModuxHomeStore home;
    final OpenRepositoryUseCase openUseCase;

    @EventListener(ApplicationReadyEvent.class)
    public void reopen() {
        home.loadCurrentRepositoryId().ifPresent(repositoryId -> {
            try {
                openUseCase.handle(repositoryId);
            } catch (RuntimeException e) {
                log.warn("could not reopen repository {} ({}); continuing with the default store",
                        repositoryId, e.getMessage());
            }
        });
    }
}
