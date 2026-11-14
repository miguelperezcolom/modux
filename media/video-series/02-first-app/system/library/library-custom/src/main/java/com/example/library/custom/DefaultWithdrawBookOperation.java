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

  @Override
  public void execute(BookOperationContext context) {
    if (context.status() == Status.WITHDRAWN) {
      throw BusinessRuleException.invalid("The book is already withdrawn");
    }
    context.status(Status.WITHDRAWN);
    context.copies(0);
  }
}
