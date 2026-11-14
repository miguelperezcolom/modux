package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.util.FileSystemUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Two generated Spring beans of one service never share a name: Spring refuses to start
 * («ConflictingBeanDefinitionException»). The case that found it: an English model naming its
 * create use case {@code CreateConcierto} — the same class name as the aggregate's built-in
 * create, in another package. Generation only; the bean names are read off the sources the way
 * Spring derives them.
 */
@SpringBootTest
class BeanNamesTest {

    static final Path STORE = Path.of("src/test/resources/examples/entradas").toAbsolutePath();

    static {
        System.setProperty("modux.model-file", STORE.toString());
    }

    @Autowired
    GenerateCodeUseCase generateCodeUseCase;

    @Autowired
    CommonFileRepository repository;

    private static final Pattern STEREOTYPE = Pattern.compile(
            "@(Service|Component|RestController|Controller|Repository|Configuration)(\\(\\s*(value\\s*=\\s*)?\"([^\"]+)\"\\s*\\))?\\s");
    private static final Pattern CLASS = Pattern.compile("public\\s+(?:final\\s+)?(?:class|record|interface)\\s+(\\w+)");

    @Test
    void a_create_use_case_named_like_the_built_in_one_does_not_clash() throws Exception {
        var store = Files.createTempDirectory("modux-beans-store");
        FileSystemUtils.copyRecursively(STORE, store);
        var uc = store.resolve("useCases/uc-crearConcierto.yaml");
        Files.writeString(uc, Files.readString(uc).replace("name: \"CrearConcierto\"", "name: \"CreateConcierto\""));
        var uu = store.resolve("useCases/uc-actualizarConcierto.yaml");
        if (Files.exists(uu)) Files.writeString(uu, Files.readString(uu).replace("name: \"ActualizarConcierto\"", "name: \"UpdateConcierto\""));
        repository.loadFrom(store.toString());
        var out = Files.createTempDirectory("modux-beans");
        try {
            generateCodeUseCase.handle(new GenerateCodeCommand("entradas", out.toString(), null, true));
            assertTrue(Files.walk(out).anyMatch(p -> p.endsWith("CreateConciertoUseCase.java")
                    && p.toString().contains("createconcierto")), "the modelled use case is generated");
            var clashes = clashes(out);
            assertTrue(clashes.isEmpty(), String.join("\n", clashes));
        } finally {
            repository.loadFrom(STORE.toString());
        }
    }

    /** Bean names defined more than once inside one service's sources. */
    static List<String> clashes(Path generated) throws Exception {
        var clashes = new ArrayList<String>();
        try (Stream<Path> services = Files.list(generated)) {
            for (var service : services.filter(Files::isDirectory).toList()) {
                var names = new HashMap<String, Path>();
                try (Stream<Path> files = Files.walk(service)) {
                    for (var file : files.filter(p -> p.toString().endsWith(".java") && !p.toString().contains("/src/test/")).toList()) {
                        var src = Files.readString(file);
                        var stereotype = STEREOTYPE.matcher(src);
                        var type = CLASS.matcher(src);
                        if (!stereotype.find() || !type.find()) continue;
                        var simple = type.group(1);
                        var name = stereotype.group(4) != null ? stereotype.group(4)
                                : Character.toLowerCase(simple.charAt(0)) + simple.substring(1);
                        var previous = names.putIfAbsent(name, file);
                        if (previous != null) clashes.add(name + ": " + generated.relativize(previous) + " ⟷ " + generated.relativize(file));
                    }
                }
            }
        }
        return clashes;
    }
}
