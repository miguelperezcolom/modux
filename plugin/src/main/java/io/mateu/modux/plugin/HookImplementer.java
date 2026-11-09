package io.mateu.modux.plugin;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Implements a service's pending custom-zone hooks with a local AI command line.
 *
 * <p>The command only ever produces text: it runs in an empty directory and its answer is parsed
 * here, so what lands on disk is decided by this class, and only inside the custom zone. A hook is
 * pending while it still says so ({@link #PENDING}); anything a person or a previous run wrote is
 * left alone, which makes running this twice harmless.
 */
final class HookImplementer {

    static final Pattern PENDING = Pattern.compile("Pendiente de implementar|// TODO: ");
    private static final Pattern FILE_BLOCK =
            Pattern.compile("===FILE: *(\\S+) *\\R(.*?)\\R===END", Pattern.DOTALL);
    private static final String CUSTOM_ROOT = "src/main/java";
    private static final int ATTEMPTS = 3;

    /** How to ask: the command, and how to build the code it has written. */
    record Settings(List<String> aiCommand, List<String> buildCommand, long timeoutMinutes) {}

    private final Settings settings;
    private final Consumer<String> log;

    HookImplementer(Settings settings, Consumer<String> log) {
        this.settings = settings;
        this.log = log;
    }

    /** Implements what is pending in every service under {@code output}; returns the files written. */
    List<Path> implementAll(Path output) throws IOException, InterruptedException {
        var written = new ArrayList<Path>();
        for (var custom : customZones(output)) {
            written.addAll(implement(custom.getParent(), custom));
        }
        return written;
    }

    private List<Path> customZones(Path output) throws IOException {
        var zones = new ArrayList<Path>();
        if (!Files.isDirectory(output)) return zones;
        try (Stream<Path> services = Files.list(output)) {
            for (var service : services.filter(Files::isDirectory).sorted().toList()) {
                var custom = service.resolve(service.getFileName() + "-custom");
                if (Files.isDirectory(custom.resolve(CUSTOM_ROOT))) zones.add(custom);
            }
        }
        return zones;
    }

    private List<Path> implement(Path service, Path custom) throws IOException, InterruptedException {
        var root = custom.resolve(CUSTOM_ROOT);
        var pending = pendingHooks(root);
        if (pending.isEmpty()) {
            log.accept("Modux: " + service.getFileName() + " no tiene ganchos pendientes.");
            return List.of();
        }
        log.accept("Modux: " + service.getFileName() + ": " + pending.size() + " gancho(s) pendiente(s).");
        var originals = new LinkedHashMap<Path, String>(pending);
        var contracts = contracts(service);
        var written = new ArrayList<Path>();
        String feedback = "";
        for (var attempt = 1; attempt <= ATTEMPTS; attempt++) {
            var answer = ask(prompt(root, pending, contracts, feedback));
            var files = parse(answer, root);
            if (files.isEmpty()) {
                feedback = "Your answer contained no ===FILE: blocks.";
                continue;
            }
            for (var file : files.entrySet()) {
                Files.createDirectories(file.getKey().getParent());
                Files.writeString(file.getKey(), file.getValue());
                if (!written.contains(file.getKey())) written.add(file.getKey());
                if (pending.containsKey(file.getKey())) pending.put(file.getKey(), file.getValue());
            }
            var build = run(settings.buildCommand(), service, null);
            if (build.exit() == 0 && pendingHooks(root).isEmpty()) {
                log.accept("Modux: " + service.getFileName() + " compila (intento " + attempt + ").");
                return written;
            }
            feedback = build.exit() != 0
                    ? "It does not compile:\n" + errorsOf(build.output())
                    : "Some files still say they are pending: implement them.";
            log.accept("Modux: intento " + attempt + " fallido en " + service.getFileName() + ".");
        }
        for (var file : written) {
            if (!originals.containsKey(file)) Files.deleteIfExists(file);
        }
        for (var original : originals.entrySet()) Files.writeString(original.getKey(), original.getValue());
        throw new IllegalStateException("No se pudieron implementar los ganchos de " + service.getFileName()
                + " tras " + ATTEMPTS + " intentos; quedan como estaban.\n" + feedback);
    }

    private Map<Path, String> pendingHooks(Path root) throws IOException {
        var pending = new LinkedHashMap<Path, String>();
        try (Stream<Path> files = Files.walk(root)) {
            for (var file : files.filter(f -> f.toString().endsWith(".java")).sorted().toList()) {
                var source = Files.readString(file);
                if (PENDING.matcher(source).find()) pending.put(file, source);
            }
        }
        return pending;
    }

    /** What a hook may use: the domain, the outbound ports and the use cases' contracts. */
    private Map<Path, String> contracts(Path service) throws IOException {
        var contracts = new LinkedHashMap<Path, String>();
        try (Stream<Path> files = Files.walk(service)) {
            for (var file : files.filter(HookImplementer::isContract).sorted().toList()) {
                contracts.put(service.relativize(file), Files.readString(file));
            }
        }
        return contracts;
    }

    private static boolean isContract(Path file) {
        var path = file.toString().replace('\\', '/');
        if (!path.endsWith(".java") || !path.contains("/src/main/java/") || path.contains("-custom/")) return false;
        return path.contains("/domain/") || path.contains("/application/out/")
                || path.endsWith("BusinessRuleException.java")
                || path.endsWith("Command.java") || path.endsWith("Result.java") || path.endsWith("Steps.java")
                || path.endsWith("EventSourcing.java");
    }

    private String prompt(Path root, Map<Path, String> pending, Map<Path, String> contracts, String feedback) {
        var prompt = new StringBuilder("""
                You implement the business logic of a generated Java 21 Spring Boot service. The classes
                below are hooks: each states, in comments and exception messages, the behaviour the model
                intends. Replace every pending method with the real implementation.

                Rules:
                - Keep each class name, package and interface. Add the constructor-injected collaborators you
                  need (`final` fields with Lombok @RequiredArgsConstructor), using only the contracts listed.
                - Keep already implemented methods exactly as they are.
                - Reject with BusinessRuleException.conflict/notFound/invalid and a message for the end user,
                  in the language of the intent. Never leave a TODO or an UnsupportedOperationException.
                - Types differ between layers: read the contracts and convert explicitly (for instance a
                  String id into the aggregate's id value object).
                - You may add a helper class only in the same package as the hooks.

                Answer with nothing but the complete files, each one exactly like this, with its path relative
                to the source root and no markdown fences:
                ===FILE: es/acme/custom/DefaultXSteps.java
                <file content>
                ===END

                """);
        contracts.forEach((path, source) -> prompt.append("--- contract ").append(path).append(" ---\n").append(source).append('\n'));
        pending.forEach((path, source) -> prompt.append("--- hook ").append(root.relativize(path)).append(" ---\n").append(source).append('\n'));
        if (!feedback.isBlank()) prompt.append("\nYour previous answer was rejected. ").append(feedback).append('\n');
        return prompt.toString();
    }

    /** Parses the answer, refusing any path outside the custom zone's source root. */
    static Map<Path, String> parse(String answer, Path root) {
        var files = new LinkedHashMap<Path, String>();
        var matcher = FILE_BLOCK.matcher(answer);
        var normalizedRoot = root.toAbsolutePath().normalize();
        while (matcher.find()) {
            var target = normalizedRoot.resolve(matcher.group(1)).normalize();
            if (!target.startsWith(normalizedRoot) || !target.toString().endsWith(".java")) {
                throw new IllegalStateException("Ruta fuera de la zona custom: " + matcher.group(1));
            }
            files.put(root.resolve(normalizedRoot.relativize(target)), matcher.group(2).replaceAll("(?m)^```.*\\R?", ""));
        }
        return files;
    }

    private String ask(String prompt) throws IOException, InterruptedException {
        var scratch = Files.createTempDirectory("modux-ai");
        try {
            var result = run(settings.aiCommand(), scratch, prompt);
            if (result.exit() != 0) {
                throw new IllegalStateException("El comando de IA terminó con " + result.exit() + ": " + result.output());
            }
            return result.output();
        } finally {
            Files.deleteIfExists(scratch);
        }
    }

    private record Result(int exit, String output) {}

    private Result run(List<String> command, Path directory, String stdin) throws IOException, InterruptedException {
        var output = Files.createTempFile("modux-ai", ".out");
        try {
            var process = new ProcessBuilder(command).directory(directory.toFile())
                    .redirectErrorStream(true).redirectOutput(output.toFile()).start();
            try (var in = process.getOutputStream()) {
                if (stdin != null) in.write(stdin.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            if (!process.waitFor(settings.timeoutMinutes(), TimeUnit.MINUTES)) {
                process.destroyForcibly();
                throw new IllegalStateException("Tiempo agotado ejecutando " + command.get(0));
            }
            return new Result(process.exitValue(), Files.readString(output));
        } finally {
            Files.deleteIfExists(output);
        }
    }

    private static String errorsOf(String buildOutput) {
        return buildOutput.lines().filter(l -> l.contains("ERROR") || l.contains("symbol:") || l.contains("location:"))
                .limit(60).reduce("", (a, b) -> a + b + "\n");
    }
}
