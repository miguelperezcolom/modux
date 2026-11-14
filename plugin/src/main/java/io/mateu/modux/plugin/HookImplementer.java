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
        // a hook written against an older model (the use case now hands it what a call answered,
        // say) no longer compiles: it is adapted too, keeping its logic
        var outdated = new LinkedHashMap<Path, String>();
        var before = run(settings.buildCommand(), service, null);
        if (before.exit() != 0) {
            for (var file : customFilesIn(before.output(), root)) {
                if (!pending.containsKey(file)) outdated.put(file, Files.readString(file));
            }
        }
        if (pending.isEmpty() && outdated.isEmpty()) {
            log.accept("Modux: " + service.getFileName() + " has no pending hooks.");
            return List.of();
        }
        log.accept("Modux: " + service.getFileName() + ": " + pending.size() + " pending hook(s)"
                + (outdated.isEmpty() ? "" : ", " + outdated.size() + " to adapt to the model") + ".");
        var originals = new LinkedHashMap<Path, String>(pending);
        originals.putAll(outdated);
        var contracts = contracts(service);
        var written = new ArrayList<Path>();
        String feedback = "";
        pending.putAll(outdated);
        var outdatedErrors = outdated.isEmpty() ? "" : errorsOf(before.output());
        for (var attempt = 1; attempt <= ATTEMPTS; attempt++) {
            var answer = ask(prompt(root, pending, outdated.keySet(), outdatedErrors, contracts, feedback));
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
                log.accept("Modux: " + service.getFileName() + " compiles (attempt " + attempt + ").");
                return written;
            }
            feedback = build.exit() != 0
                    ? "It does not compile:\n" + errorsOf(build.output())
                    : "Some files still say they are pending: implement them.";
            log.accept("Modux: attempt " + attempt + " failed in " + service.getFileName() + ".");
        }
        for (var file : written) {
            if (!originals.containsKey(file)) Files.deleteIfExists(file);
        }
        for (var original : originals.entrySet()) Files.writeString(original.getKey(), original.getValue());
        throw new IllegalStateException("Could not implement the hooks of " + service.getFileName()
                + " after " + ATTEMPTS + " attempts; they are left as they were.\n" + feedback);
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

    /** What a hook may use: the domain, the outbound ports, the read side and the use cases' contracts. */
    private Map<Path, String> contracts(Path service) throws IOException {
        var contracts = new LinkedHashMap<Path, String>();
        try (Stream<Path> files = Files.walk(service)) {
            for (var file : files.filter(HookImplementer::isContract).sorted().toList()) {
                contracts.put(service.relativize(file), Files.readString(file));
            }
        }
        return contracts;
    }

    static boolean isContract(Path file) {
        var path = file.toString().replace('\\', '/');
        if (!path.endsWith(".java") || !path.contains("/src/main/java/") || path.contains("-custom/")) return false;
        return path.contains("/domain/") || path.contains("/application/out/")
                // the read side the context keeps (read models fed by projections and their queries)
                || path.contains("/application/query/")
                // the use case itself: what it does before and after the hook
                || (path.contains("/application/usecases/") && path.endsWith("UseCase.java"))
                || path.endsWith("BusinessRuleException.java")
                || path.endsWith("Command.java") || path.endsWith("Result.java") || path.endsWith("Steps.java")
                || path.endsWith("EventSourcing.java");
    }

    /** The custom-zone sources a failed build points at. */
    static List<Path> customFilesIn(String buildOutput, Path root) {
        var files = new java.util.LinkedHashSet<Path>();
        var matcher = Pattern.compile("(/[^\\s:\\[\\]]+\\.java)").matcher(buildOutput);
        Path base;
        try {
            base = root.toRealPath();
        } catch (IOException e) {
            return List.of();
        }
        while (matcher.find()) {
            var file = Path.of(matcher.group(1));
            if (!Files.isRegularFile(file)) continue;
            try {
                // /tmp and /private/tmp are one place: compare where they really are, keep the root's spelling
                var real = file.toRealPath();
                if (real.startsWith(base)) files.add(root.resolve(base.relativize(real).toString()));
            } catch (IOException ignored) {
                // gone meanwhile
            }
        }
        return new ArrayList<>(files);
    }

    private String prompt(Path root, Map<Path, String> pending, java.util.Set<Path> outdated, String outdatedErrors,
                          Map<Path, String> contracts, String feedback) {
        var prompt = new StringBuilder("""
                You implement the business logic of a generated Java 21 Spring Boot service. The classes
                below are hooks: each states, in comments and exception messages, the behaviour the model
                intends. Replace every pending method with the real implementation.

                Rules:
                - Keep each class name, package and interface. Add the constructor-injected collaborators you
                  need (`final` fields with Lombok @RequiredArgsConstructor), using only the contracts listed.
                - Keep already implemented methods exactly as they are, except in the hooks marked OUTDATED:
                  they were written for an older model and no longer compile. Adapt them to the current
                  contract (the signature, the parameters it now receives) keeping their logic, and use what
                  the new parameters bring instead of simulating it.
                - Reject with BusinessRuleException.conflict/notFound/invalid and a message for the end user,
                  in the language of the intent. Never leave a TODO or an UnsupportedOperationException.
                - Types differ between layers: read the contracts and convert explicitly (for instance a
                  String id into the aggregate's id value object).
                - Change an aggregate only through its operations (an `XOperation` hook and the aggregate
                  method that runs it), and inside an operation only through its `context`. When the aggregate
                  has an operation for a change, do not make it with `update(...)`: that overwrites the whole
                  state and skips the rules the operation holds.
                - A use-case hook does only its own step. What the use case does after calling it (publishing
                  an event, saving an aggregate) is already written in the use case, listed among the
                  contracts: never do it again in the hook, or it happens twice.
                - Data another context owns is read from this context's read models (the query services
                  under application/query), not asked for elsewhere.
                - You may add a helper class only in the same package as the hooks.

                Answer with nothing but the complete files, each one exactly like this, with its path relative
                to the source root and no markdown fences:
                ===FILE: es/acme/custom/DefaultXSteps.java
                <file content>
                ===END

                """);
        contracts.forEach((path, source) -> prompt.append("--- contract ").append(path).append(" ---\n").append(source).append('\n'));
        pending.forEach((path, source) -> prompt.append(outdated.contains(path) ? "--- hook OUTDATED " : "--- hook ")
                .append(root.relativize(path)).append(" ---\n").append(source).append('\n'));
        if (!outdatedErrors.isBlank()) prompt.append("\nWhat the compiler says about the OUTDATED hooks:\n").append(outdatedErrors).append('\n');
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
                throw new IllegalStateException("Path outside the custom zone: " + matcher.group(1));
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
                throw new IllegalStateException("The AI command exited with " + result.exit() + ": " + result.output());
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
                throw new IllegalStateException("Timed out running " + command.get(0));
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
