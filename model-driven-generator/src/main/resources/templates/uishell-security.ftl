package ${shellPackage}.infra.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
<#if idp??>
            // people sign in at the identity provider (${idp.name}), once, for every app the shell
            // federates: the login leaves the system's own cookie (ModuxAuthCookie)
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.requestMatchers("/login/**", "/oauth2/**", "/error").permitAll().anyRequest().authenticated())
            .addFilterBefore(authCookie, org.springframework.security.oauth2.client.web.OAuth2LoginAuthenticationFilter.class)
            .oauth2Login(login -> login
                    .userInfoEndpoint(userInfo -> userInfo.oidcUserService(ModuxAuthCookie.withRealmRoles()))
                    .successHandler(authCookie.loginSuccess("/")))
            .logout(logout -> logout.addLogoutHandler((request, response, authentication) -> ModuxAuthCookie.clear(response))
                    .logoutSuccessUrl(ModuxAuthCookie.idpLogoutUrl(env, "shell", "http://localhost:8088")));
<#elseif (roles![])?has_content>
            // the model has roles and no identity provider: the shell is where people sign in,
            // once, for every app it federates (ModuxAuthCookie)
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.requestMatchers("/login", "/error").permitAll().anyRequest().authenticated())
            .addFilterBefore(authCookie, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)
            .formLogin(login -> login.successHandler(authCookie.loginSuccess("/")))
            .logout(logout -> logout.addLogoutHandler((request, response, authentication) -> ModuxAuthCookie.clear(response))
                    .logoutSuccessUrl("/login"));
<#else>
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
</#if>
        return http.build();
    }
<#if idp?? || (roles![])?has_content>

    private final ModuxAuthCookie authCookie;
    private final org.springframework.core.env.Environment env;

    public SecurityConfig(org.springframework.core.env.Environment env) {
        this.authCookie = ModuxAuthCookie.from(env);
        this.env = env;
    }
</#if>
<#if !(idp??) && (roles![])?has_content>

    /** The model's roles as scaffold users (username = password = the role's name in lower case). */
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
