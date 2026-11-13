package ${project.packageName}.infra.in.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security configuration with role constants.
 * Generated from RoleEntity definitions<#if idp??> and the model's identity provider
 * («${idp.name}», ${idp.type})</#if>.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

<#if roles?has_content>
<#list roles as role>
    public static final String ROLE_${role.name?upper_case?replace("[^A-Z0-9]","_",'r')} = "ROLE_${role.name?upper_case?replace("[^A-Z0-9]","_",'r')}";
</#list>
<#else>
    // No roles defined
</#if>

<#if idp??>
    /** One login for the whole system (see ModuxAuthCookie): the identity provider's, at the shell or here. */
    private final ModuxAuthCookie authCookie;
    private final org.springframework.core.env.Environment env;

    public SecurityConfig(org.springframework.core.env.Environment env) {
        this.authCookie = ModuxAuthCookie.from(env);
        this.env = env;
    }

    /**
     * Machine/API border (Mateu sync, MCP): the system's cookie (a person who signed in) or the
     * IdP's JWT (agents, curl, sibling services). Unauthenticated callers get a 401 with a Bearer
     * challenge, never a redirect to a login page.
     */
    @Bean
    @org.springframework.core.annotation.Order(1)
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/mateu/**", "/*/mateu/**", "/mcp", "/mcp/**")
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .addFilterBefore(authCookie, org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter.class)
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(SecurityConfig::realmRoles)));
        return http.build();
    }

    /**
     * Browser border: whoever opens this service directly signs in at ${idp.name} and gets the
     * system's cookie. Through the shell they already have it.
     */
    @Bean
    @org.springframework.core.annotation.Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // service-to-service borders and the login dance itself
                .requestMatchers("/v1/**", "/error", "/login/**", "/oauth2/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(authCookie, org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter.class)
            // the REST API is a machine border too: a caller with the IdP's JWT (another service, an
            // agent, curl) is authenticated by it; without one, a person is sent to sign in
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(SecurityConfig::realmRoles)))
            .oauth2Login(login -> login
                .userInfoEndpoint(userInfo -> userInfo.oidcUserService(ModuxAuthCookie.withRealmRoles()))
                .successHandler(authCookie.loginSuccess("/")))
            .logout(logout -> logout.addLogoutHandler((request, response, authentication) -> ModuxAuthCookie.clear(response))
                .logoutSuccessUrl(ModuxAuthCookie.idpLogoutUrl(env, "${oidcClientId!service.name?lower_case?replace("[^a-z0-9]","-",'r')}",
                        "http://localhost:${(service.port!8080)?c}")));
        return http.build();
    }
<#elseif !roles?has_content>
    /**
     * The model declares no roles and no identity provider, so this service has no
     * authorization to enforce: every endpoint is open. (Without this chain Spring Security's
     * default would lock all of them behind a generated password.) Declare roles, or an
     * identity provider, in the model to secure it.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
<#else>
    /** One login for the whole system (see ModuxAuthCookie): the shell's, or any service's. */
    private final ModuxAuthCookie authCookie;

    public SecurityConfig(org.springframework.core.env.Environment env) {
        this.authCookie = ModuxAuthCookie.from(env);
    }

    /**
     * Machine/API border (Mateu sync, MCP): no HTML form here — unauthenticated callers
     * get a 401 with a basic challenge instead of a redirect to the login page, so
     * sibling services, agents and curl can authenticate programmatically. A browser
     * already logged in through the form below keeps working: both chains share the
     * session's security context.
     */
    @Bean
    @org.springframework.core.annotation.Order(1)
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/mateu/**", "/*/mateu/**", "/mcp", "/mcp/**")
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .addFilterBefore(authCookie, org.springframework.security.web.authentication.www.BasicAuthenticationFilter.class)
            .httpBasic(basic -> { })
            .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(basicChallenge()));
        return http.build();
    }

    /**
     * Browser border (pages, CRUDs, use-case pages): form login. Basic also answers
     * programmatic calls on these paths.
     */
    @Bean
    @org.springframework.core.annotation.Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF is disabled because the Mateu sync API is called via JSON (no CSRF token).
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Service-to-service borders (consumed by sibling gateways and external
                // ACLs): machine identity, not an interactive session. Tighten with real
                // credentials when the deployment needs it. /error stays open so a 401
                // sendError keeps its status through the error re-dispatch.
                .requestMatchers("/v1/**", "/error").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(authCookie, org.springframework.security.web.authentication.www.BasicAuthenticationFilter.class)
            // Browser: form login (it signs the user in for every service). Agents and APIs: HTTP Basic.
            .formLogin(login -> login.successHandler(authCookie.loginSuccess("/")))
            .httpBasic(basic -> { })
            .logout(logout -> logout.addLogoutHandler((request, response, authentication) -> ModuxAuthCookie.clear(response))
                    .logoutSuccessUrl("/login"));
        return http.build();
    }

    /**
     * The machine border's 401 carries a basic challenge (WWW-Authenticate), so agents and
     * sibling services discover programmatic auth instead of guessing.
     */
    private static org.springframework.security.web.authentication.www.BasicAuthenticationEntryPoint basicChallenge() {
        var entryPoint = new org.springframework.security.web.authentication.www.BasicAuthenticationEntryPoint();
        entryPoint.setRealmName("modux");
        return entryPoint;
    }
</#if>

<#if roles?has_content && !(idp??)>
    /**
     * Scaffold users, one per model role (username = password = the role's name in lower
     * case). They back the form login and HTTP Basic (no identity provider in the model).
     * Replace with a real identity provider before shipping.
     */
    @Bean
    public org.springframework.security.core.userdetails.UserDetailsService users(
            @org.springframework.beans.factory.annotation.Value("${r"${"}MODUX_SYSTEM_PASSWORD:${r"}"}") String systemPassword) {
        var users = new org.springframework.security.provisioning.InMemoryUserDetailsManager(
<#list roles as role>
            org.springframework.security.core.userdetails.User
                .withUsername("${role.name?lower_case?replace("[^a-z0-9]","",'r')}")
                .password("{noop}${role.name?lower_case?replace("[^a-z0-9]","",'r')}")
                .roles("${role.name?upper_case?replace("[^A-Z0-9]","_",'r')}")
                .build()<#sep>,</#sep>
</#list>
        );
        // The system identity, for the workflow engine's calls: only when its password is
        // configured (never a known default), and with no role but SISTEMA — a use case lets it in
        // by listing that role.
        if (systemPassword != null && !systemPassword.isBlank()) {
            users.createUser(org.springframework.security.core.userdetails.User
                    .withUsername("sistema").password("{noop}" + systemPassword).roles("SISTEMA").build());
        }
        return users;
    }
</#if>
<#if idp??>

    /** Keycloak carries the realm's roles in realm_access.roles: they are the ROLE_* the use cases check. */
    static org.springframework.security.authentication.AbstractAuthenticationToken realmRoles(org.springframework.security.oauth2.jwt.Jwt jwt) {
        var access = jwt.getClaimAsMap("realm_access");
        var authorities = new java.util.ArrayList<org.springframework.security.core.GrantedAuthority>();
        if (access != null && access.get("roles") instanceof java.util.Collection<?> roles) {
            roles.forEach(r -> authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + r)));
        }
        var name = jwt.getClaimAsString("preferred_username");
        return new org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken(
                jwt, authorities, name != null ? name : jwt.getSubject());
    }
</#if>
}
