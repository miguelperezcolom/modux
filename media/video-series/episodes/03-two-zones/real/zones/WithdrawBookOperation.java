package com.example.library.catalog.domain.aggregates.book;

/**
 * An AVAILABLE book becomes WITHDRAWN and its copies drop to 0. A book that is already WITHDRAWN is
 * rejected with «The book is already withdrawn».
 */
@FunctionalInterface
public interface WithdrawBookOperation {

  /**
   * Changes the aggregate through {@code context}, the only door to its state: the aggregate has no
   * setters, so a rule implemented anywhere else cannot leave it half-changed.
   */
  void execute(BookOperationContext context);
}
