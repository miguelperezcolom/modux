package ${project.packageName}.infra.in.rest;

import ${project.packageName}.application.BusinessRuleException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Translates a rejected business rule to its HTTP answer, with the rule's message. */
@RestControllerAdvice
public class BusinessRuleExceptionHandler {

    @ExceptionHandler(BusinessRuleException.class)
    public ProblemDetail rejected(BusinessRuleException e) {
        var status = switch (e.kind()) {
            case INVALID -> HttpStatus.BAD_REQUEST;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
        };
        return ProblemDetail.forStatusAndDetail(status, e.getMessage());
    }
}
