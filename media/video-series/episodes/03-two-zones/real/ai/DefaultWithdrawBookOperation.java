package com.example.library.custom;

import com.example.library.application.BusinessRuleException;
import com.example.library.catalog.domain.aggregates.book.BookOperationContext;
import com.example.library.catalog.domain.aggregates.book.WithdrawBookOperation;
import com.example.library.catalog.domain.aggregates.book.vo.Status;
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
    if (context.status() == Status.WITHDRAWN) {
      throw BusinessRuleException.conflict("The book is already withdrawn");
    }
    context.status(Status.WITHDRAWN);
    context.copies(0);
  }
}