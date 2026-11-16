package io.tickets.sales.infra.in.ui.pages.buy;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tickets.sales.application.usecases.buy.BuyCommand;
import io.tickets.sales.application.usecases.buy.BuyResult;
import io.tickets.sales.application.usecases.buy.BuyUseCase;
import io.mateu.uidl.StyleConstants;
import io.mateu.uidl.annotations.Button;
import io.mateu.uidl.annotations.InlineEditing;
import io.mateu.uidl.annotations.Label;
import io.mateu.uidl.annotations.Notice;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import io.mateu.uidl.annotations.Stereotype;
import io.mateu.uidl.annotations.Style;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.data.ButtonStyle;
import io.mateu.uidl.data.FieldStereotype;
import io.mateu.uidl.data.Message;
import io.mateu.uidl.data.State;
import lombok.SneakyThrows;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

/**
 * UI page of the Buy use case (exposedAsUi): the fields are its command, the primary action
 * executes it. View model only — the behaviour lives in the use case.
 */
@Service
@Scope("prototype")
@RequiredArgsConstructor
@Title("Buy tickets")
@Style(StyleConstants.CONTAINER)
public class BuyPage {

  @NotEmpty
  @Label("Concert")
  @io.mateu.uidl.annotations.Lookup(
      search = io.tickets.sales.infra.in.ui.suppliers.ConcertViewReadModelIdOptionsSupplier.class,
      label = io.tickets.sales.infra.in.ui.suppliers.ConcertViewReadModelIdLabelSupplier.class)
  String concertId;

  @NotEmpty
  @Label("Customer")
  String customer;

  @NotNull
  @Label("Tickets")
  Integer tickets;

  @NotEmpty
  @Label("Card")
  String card;

  @Notice(theme = "success", fullWidth = true)
  String resultado = "";

  /** receipt: shown rendered (html), not as text in the notice. */
  @io.mateu.uidl.annotations.ReadOnly
  @Label("Receipt")
  @Stereotype(FieldStereotype.html)
  String receiptResultado = "";

  @io.mateu.uidl.annotations.ReadOnly
  @Label("Venue zones")
  @Stereotype(FieldStereotype.grid)
  List<ZoneFila> zonesResultado = new ArrayList<>();

  private final BuyUseCase useCase;
  private final ObjectMapper objectMapper;

  @Button(buttonStyle = ButtonStyle.primary)
  @SneakyThrows
  public Object buy() {
    // Model-declared validations (NotNull / NotBlank / NotEmpty) — fail legibly before
    // touching the use case.
    var missing = new java.util.ArrayList<String>();
    if (concertId == null || concertId.isBlank()) missing.add("Concert");
    if (customer == null || customer.isBlank()) missing.add("Customer");
    if (tickets == null) missing.add("Tickets");
    if (card == null || card.isBlank()) missing.add("Card");
    if (!missing.isEmpty()) {
      throw new IllegalArgumentException("Missing required fields: " + String.join(", ", missing));
    }
    BuyResult result = useCase.handle(new BuyCommand(concertId, customer, tickets, card));
    zonesResultado =
        result.zones() == null || result.zones().isBlank()
            ? new ArrayList<>()
            : objectMapper.readValue(
                result.zones(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, ZoneFila.class));
    receiptResultado = result.receipt() != null ? result.receipt() : "";
    resultado =
        "Purchase: "
            + result.purchaseId()
            + " · "
            + "Amount: "
            + java.util.Optional.ofNullable(result.amount())
                .map(v -> v.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString())
                .orElse("");
    return List.of(new Message("Buy tickets: done"), new State(this));
  }
}
