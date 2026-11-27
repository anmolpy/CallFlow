package com.callflow.exception;

public class InvalidStateTransitionException extends BusinessRuleViolationException {

    public InvalidStateTransitionException(String message) {
        super(message);
    }
}
