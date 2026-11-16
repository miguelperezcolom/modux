#!/usr/bin/env bash
# Episode 5, captured for real from the Tickets app (media/promo-video/app): `mvn modux:generate`,
# then the generated files the episode shows, copied into real/gen/ (the generated system is not
# versioned, the episode renders from these copies). The model files are shown from the app itself.
# STAGE=copy, with the system running (after the `concert` live shot): the concert as Sales keeps it,
# asked to Sales' own database.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
app="$(cd "$here/../../../promo-video/app" && pwd)"
out="$here/real"
mkdir -p "$out/gen"
modux_lines() { grep -E '^\[(INFO|WARNING|ERROR)\] (Modux|BUILD|Total time)' | sed -E "s#$app/?##g" || true; }

if [ "${STAGE:-generate}" = generate ]; then
  (cd "$app" && mvn modux:generate 2>&1) | modux_lines > "$out/generate.txt"
  s="$app/system"
  cp "$s/sales/sales-app/src/main/resources/application.yaml" "$out/gen/sales-application.yaml"
  cp "$s/payments/payments/src/main/java/io/tickets/payments/infra/in/async/PaymentsPurchasePlacedSubscription.java" "$out/gen/"
  cp "$s/sales/sales-app/src/main/java/io/tickets/infra/out/outbox/Outbox.java" "$out/gen/"
  cp "$s/sales/sales-app/src/main/resources/db/migration/V1__baseline.sql" "$out/gen/sales-V1__baseline.sql"
  cp "$s/sales/sales/src/main/java/io/tickets/sales/application/out/remote/LookupPriceClient.java" "$out/gen/"
  cp "$s/sales/sales/src/main/java/io/tickets/sales/application/usecases/buy/BuyUseCase.java" "$out/gen/"
  cp "$s/sales/sales/src/main/java/io/tickets/sales/infra/in/projection/ConcertsProjection.java" "$out/gen/"
  cp "$s/sales/sales/src/main/java/io/tickets/sales/infra/in/ui/pages/buy/BuyPage.java" "$out/gen/"
  cat "$out/generate.txt"
else
  docker exec tickets-postgres-1 psql -U user_app -d sales \
    -c "select artist, venue, date, price, status from concert_view_read_model_entity" > "$out/copy.txt"
  cat "$out/copy.txt"
fi
