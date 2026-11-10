package ${project.packageName}.application;

import org.aopalliance.intercept.MethodInvocation;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.authorization.method.MethodAuthorizationDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * What a user without the role sees: the screens show a UserFacingException as it is, while
 * Spring's AccessDeniedException reached them as "An unexpected error occurred". The REST API
 * answers 403 (BusinessRuleExceptionHandler).
 */
@Component
public class Forbidden implements MethodAuthorizationDeniedHandler {

    @Override
    public Object handleDeniedInvocation(MethodInvocation invocation, AuthorizationResult result) {
        throw BusinessRuleException.forbidden("No tienes permiso para hacer esto.");
    }
}
