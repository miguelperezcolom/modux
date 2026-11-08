package ${project.packageName}.application;

/**
 * A business rule said no. Throw it from the custom zone (invariants, use-case steps): the service
 * answers with the matching HTTP status and this message, and the transaction rolls back.
 */
public class BusinessRuleException extends RuntimeException {

    public enum Kind { INVALID, NOT_FOUND, CONFLICT }

    private final Kind kind;

    private BusinessRuleException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    /** The request itself is wrong (400). */
    public static BusinessRuleException invalid(String message) {
        return new BusinessRuleException(Kind.INVALID, message);
    }

    /** What it refers to does not exist (404). */
    public static BusinessRuleException notFound(String message) {
        return new BusinessRuleException(Kind.NOT_FOUND, message);
    }

    /** The current state does not allow it (409). */
    public static BusinessRuleException conflict(String message) {
        return new BusinessRuleException(Kind.CONFLICT, message);
    }

    public Kind kind() {
        return kind;
    }
}
