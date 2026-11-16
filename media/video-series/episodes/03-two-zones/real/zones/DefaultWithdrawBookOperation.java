package com.example.library.custom;

import com.example.library.catalog.domain.aggregates.book.WithdrawBookOperation;
import com.example.library.catalog.domain.aggregates.book.BookOperationContext;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@code withdraw} operation of Book. Scaffolded once by
 * Modux and never overwritten.
 */
@Component
public class DefaultWithdrawBookOperation implements WithdrawBookOperation {

  /**
   * Intent (from the model): An AVAILABLE book becomes WITHDRAWN and its copies drop to 0. A book
   * that is already WITHDRAWN is rejected with «The book is already withdrawn».
   */
  @Override
  public void execute(BookOperationContext context) {
    // Intended behaviour: An AVAILABLE book becomes WITHDRAWN and its copies drop to 0. A book that
    // is already WITHDRAWN is rejected with «The book is already withdrawn».
    // Tip: `mvn modux:ai-complete` implements this hook from the model.
    throw new UnsupportedOperationException(
        "Operation «withdraw» of Book is not implemented yet: An AVAILABLE book becomes WITHDRAWN and its copies drop to 0. A book that is already WITHDRAWN is rejected with «The book is already withdrawn».");
  }
}
