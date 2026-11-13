package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The «Entradas» model with an identity provider on this machine (a keycloak at localhost):
 * the realm comes generated — the model's roles, one user per role, the clients the Homes name —
 * and runs in the compose file; the services read the realm's roles as theirs.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class LocalIdentityProviderTest {

    @Autowired
    GenerateCodeUseCase generateCodeUseCase;

    @Autowired
    CommonFileRepository repository;

    Path out;

    @BeforeAll
    void generate() throws Exception {
        var store = Files.createTempDirectory("modux-idp-store");
        var source = HighLevelPatternsTest.STORE;
        try (Stream<Path> files = Files.walk(source)) {
            for (var f : files.toList()) {
                var target = store.resolve(source.relativize(f).toString());
                if (Files.isDirectory(f)) Files.createDirectories(target);
                else Files.copy(f, target);
            }
        }
        Files.createDirectories(store.resolve("identityProviders"));
        Files.writeString(store.resolve("identityProviders/idp-entradas.yaml"), """
                ---
                id: "idp-entradas"
                name: "Entradas"
                type: "B2C"
                issuer: "http://localhost:8080/realms/entradas"
                projectId: "entradas"
                """);
        try (Stream<Path> adapters = Files.list(store.resolve("uiAdapters"))) {
            for (var a : adapters.toList()) {
                Files.writeString(a, Files.readString(a).replace("appType:", "identityProviderId: \"idp-entradas\"\nappType:"));
            }
        }
        repository.loadFrom(store.toString());
        out = Files.createTempDirectory("modux-idp");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", out.toString(), null, false));
        // leave the shared repository as the other tests expect it
        repository.loadFrom(HighLevelPatternsTest.STORE.toString());
    }

    @Test
    void the_realm_is_generated_with_the_roles_their_users_and_the_clients() throws Exception {
        var realm = Files.readString(out.resolve("keycloak/entradas-realm.json"));
        assertTrue(realm.contains("\"realm\": \"entradas\""), realm);
        assertTrue(realm.contains("{ \"name\": \"PROMOTORA\" }"), realm);
        assertTrue(realm.contains("\"username\": \"cliente\""), realm);
        assertTrue(realm.contains("\"realmRoles\": [\"CLIENTE\"]"), realm);
        assertTrue(realm.contains("\"clientId\": \"shell\""), realm);
        assertTrue(realm.contains("\"clientId\": \"ventas\""), "one client per app, as its Home names it: " + realm);
    }

    @Test
    void the_compose_runs_keycloak_and_the_services_fetch_its_keys_inside_the_network() throws Exception {
        var compose = Files.readString(out.resolve("docker-compose.yml"));
        assertTrue(compose.contains("command: start-dev --import-realm"), compose);
        assertTrue(compose.contains("KC_HOSTNAME: http://localhost:8080"), compose);
        assertTrue(compose.contains("MODUX_IDP_BACKCHANNEL: http://keycloak:8080/realms/entradas"), compose);
        assertTrue(Files.readString(out.resolve("up.sh")).contains("--import-realm"));
    }

    @Test
    void people_sign_in_at_the_idp_and_the_systems_cookie_carries_them_with_their_realm_roles() throws Exception {
        var shell = Files.readString(out.resolve("entradas/src/main/java/es/entradas/entradas/infra/config/SecurityConfig.java"))
                .replaceAll("\\s+", " ").replace("( ", "(").replace(" )", ")").replace(". ", ".").replace(" .", ".");
        assertTrue(shell.contains(".oauth2Login("), shell);
        assertTrue(shell.contains("oidcUserService(ModuxAuthCookie.withRealmRoles())"), shell);
        assertTrue(shell.contains(".successHandler(authCookie.loginSuccess(\"/\"))"), "the login leaves the system's cookie: " + shell);
        var cookie = Files.readString(out.resolve("entradas/src/main/java/es/entradas/entradas/infra/config/ModuxAuthCookie.java"));
        assertTrue(cookie.contains("getJSONObjectClaim(\"realm_access\")"), cookie);
        var shellYaml = Files.readString(out.resolve("entradas/src/main/resources/application.yaml"));
        assertTrue(shellYaml.contains("client-authentication-method: none"), "a public client, with PKCE: " + shellYaml);
        assertTrue(shellYaml.contains("token-uri: ${MODUX_IDP_BACKCHANNEL:http://localhost:8080/realms/entradas}/protocol/openid-connect/token"), shellYaml);
        assertFalse(shellYaml.contains("issuer-uri"), "no discovery at startup: " + shellYaml);
        // a service takes the cookie, or the IdP's JWT with the realm roles as its roles
        // google-java-format wraps where it likes: compare on single spaces
        var service = Files.readString(out.resolve("ventas/ventas-app/src/main/java/es/entradas/infra/in/security/SecurityConfig.java"))
                .replaceAll("\\s+", " ").replace("( ", "(").replace(" )", ")").replace(". ", ".").replace(" .", ".");
        assertTrue(service.contains("addFilterBefore(authCookie, org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter.class)"), service);
        assertTrue(service.contains("jwtAuthenticationConverter(SecurityConfig::realmRoles)"), service);
        assertTrue(service.contains("\"ROLE_\" + r"), service);
        // and its REST API too: both borders (sync and browser/REST) take the IdP's JWT
        assertTrue(service.split("oauth2ResourceServer\\(").length - 1 >= 2, "the REST API takes the JWT: " + service);
    }

    @Test
    void no_home_carries_the_annotation_mateu_removed() throws Exception {
        try (Stream<Path> files = Files.walk(out)) {
            for (var f : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                assertFalse(Files.readString(f).contains("KeycloakSecured"), f.toString());
            }
        }
    }
}
