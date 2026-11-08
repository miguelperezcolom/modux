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
    /**
     * The model authenticates against ${idp.name} (${idp.type}) — one mode everywhere:
     * every Mateu/MCP call must carry a keycloak JWT. The Mateu frontend logs the user in
     * via keycloak.js and sends it on every request; a shell propagates it on its
     * remote-menu fetches; agents and curl ask the IdP for a token (password or
     * client-credentials grant) and call with it. Pages and static assets stay open so
     * the SPA can boot and start the login dance; the /v1 borders and /error are covered
     * by the permitAll too. Unauthenticated calls get a 401 with a Bearer challenge —
     * never a redirect to an HTML login page.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/mateu/**", "/*/mateu/**", "/mcp", "/mcp/**").authenticated()
                .anyRequest().permitAll())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
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
            // Browser: form login. Agents and APIs (MCP included): HTTP Basic.
            .formLogin(login -> login.defaultSuccessUrl("/", true))
            .httpBasic(basic -> { })
            .logout(logout -> logout.logoutSuccessUrl("/login"));
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
    public org.springframework.security.core.userdetails.UserDetailsService users() {
        return new org.springframework.security.provisioning.InMemoryUserDetailsManager(
<#list roles as role>
            org.springframework.security.core.userdetails.User
                .withUsername("${role.name?lower_case?replace("[^a-z0-9]","",'r')}")
                .password("{noop}${role.name?lower_case?replace("[^a-z0-9]","",'r')}")
                .roles("${role.name?upper_case?replace("[^A-Z0-9]","_",'r')}")
                .build()<#sep>,</#sep>
</#list>
        );
    }
</#if>

}
