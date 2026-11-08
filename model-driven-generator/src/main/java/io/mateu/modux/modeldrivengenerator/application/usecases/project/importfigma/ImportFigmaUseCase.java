package io.mateu.modux.modeldrivengenerator.application.usecases.project.importfigma;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Figma → modux: downloads a Figma file (REST {@code GET /v1/files/:key}, token in the
 * {@code X-Figma-Token} header) whose screens were composed with the Mateu component library, maps
 * every top-level frame to a {@link PageEntity} through the Mateu design contract (see
 * {@link FigmaToModel}) and saves the pages into the model store — from where modux's generators
 * emit the Java/C#/Python implementation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportFigmaUseCase {

    final ModelStore repository;

    @SneakyThrows
    public List<PageEntity> handle(ImportFigmaCommand command) {
        JsonNode figmaFile = fetch(command);
        FigmaContract contract = FigmaContract.load(command.contractPath());
        FigmaToModel mapper = new FigmaToModel(contract);
        List<PageEntity> pages = mapper.map(figmaFile);
        mapper.warnings().forEach(warning -> log.warn("Figma import: {}", warning));
        for (PageEntity page : pages) {
            repository.save(page);
            log.info("Imported Figma frame as page '{}' ({} content nodes)", page.name(),
                    page.content() != null ? page.content().size() : 0);
        }
        return pages;
    }

    @SneakyThrows
    private JsonNode fetch(ImportFigmaCommand command) {
        if (command.localPath() != null) {
            return new ObjectMapper().readTree(Files.readString(Path.of(command.localPath())));
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.figma.com/v1/files/" + command.fileKey()))
                .header("X-Figma-Token", command.token())
                .GET()
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Figma API returned " + response.statusCode());
        }
        return new ObjectMapper().readTree(response.body());
    }
}
