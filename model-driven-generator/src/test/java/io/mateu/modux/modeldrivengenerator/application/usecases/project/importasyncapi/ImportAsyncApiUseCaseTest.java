package io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi;

import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AllData;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SubscriptionActionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SubscriptionEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * What import-asyncapi writes is usable: owned by a bounded context (two-way references), under
 * deterministic ids (a re-import updates), with the payloads as models, and in the direction the
 * AsyncAPI spec means (2.x {@code publish} = the application receives).
 */
class ImportAsyncApiUseCaseTest {

    /** The shape of the Streetlights example: refs to messages, payload schemas and a shared schema. */
    static final String STREETLIGHTS = """
            asyncapi: '2.6.0'
            info: {title: Streetlights Kafka API, version: '1.0.0'}
            channels:
              smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured:
                description: The topic on which measured values may be produced and consumed.
                publish:
                  summary: Inform about environmental lighting conditions of a particular streetlight.
                  operationId: receiveLightMeasurement
                  message: {$ref: '#/components/messages/lightMeasured'}
              smartylighting.streetlights.1.0.action.{streetlightId}.turn.on:
                subscribe:
                  operationId: turnOn
                  message: {$ref: '#/components/messages/turnOnOff'}
              smartylighting.streetlights.1.0.action.{streetlightId}.dim:
                subscribe:
                  operationId: dimLight
                  message: {$ref: '#/components/messages/dimLight'}
            components:
              messages:
                lightMeasured:
                  name: lightMeasured
                  payload: {$ref: '#/components/schemas/lightMeasuredPayload'}
                turnOnOff:
                  name: turnOnOff
                  summary: Command a particular streetlight to turn the lights on or off.
                  payload: {$ref: '#/components/schemas/turnOnOffPayload'}
                dimLight:
                  name: dimLight
                  payload:
                    type: object
                    properties:
                      percentage: {type: integer}
                      sentAt: {$ref: '#/components/schemas/sentAt'}
              schemas:
                lightMeasuredPayload:
                  type: object
                  properties:
                    lumens: {type: integer, minimum: 0}
                    sentAt: {$ref: '#/components/schemas/sentAt'}
                turnOnOffPayload:
                  type: object
                  properties:
                    command: {type: string, enum: ['on', 'off']}
                    sentAt: {$ref: '#/components/schemas/sentAt'}
                sentAt: {type: string, format: date-time}
            """;

    private final FakeStore store = new FakeStore();
    private final ImportAsyncApiUseCase useCase = new ImportAsyncApiUseCase(store);

    private Path contract(Path dir, String yaml) throws Exception {
        var file = dir.resolve("contract.yml");
        Files.writeString(file, yaml);
        return file;
    }

    private void seedCatalog() {
        store.save(BoundedContextEntity.builder().id("bc-catalog").name("Catalog")
                .aggregateIds(List.of("agg-book")).projectId("library").build());
    }

    @Test
    void the_only_bounded_context_owns_what_is_imported(@TempDir Path tmp) throws Exception {
        seedCatalog();

        useCase.handle(new ImportAsyncApiCommand(null, contract(tmp, STREETLIGHTS).toString()));

        var bc = store.findById("bc-catalog", BoundedContextEntity.class).orElseThrow();
        assertEquals(List.of("ev-turn-on", "ev-dim-light"), bc.domainEventIds());
        assertEquals(List.of("sub-receive-light-measurement"), bc.subscriptionIds());
        assertEquals(List.of("agg-book"), bc.aggregateIds(), "the rest of the context is kept");

        // 2.x `subscribe`: the application sends → a domain event on the wire
        var turnOn = store.findById("ev-turn-on", DomainEventEntity.class).orElseThrow();
        assertEquals("TurnOn", turnOn.name());
        assertEquals("smartylighting.streetlights.1.0.action.{streetlightId}.turn.on", turnOn.topicName());
        assertTrue(turnOn.publishAsIntegrationEvent());
        assertEquals("model-aapi-turn-on-off-payload", turnOn.modelId());
        assertEquals("library", turnOn.projectId());
        assertEquals("Command a particular streetlight to turn the lights on or off.", turnOn.description());

        // 2.x `publish`: the application receives → a subscription
        var measured = store.findById("sub-receive-light-measurement", SubscriptionEntity.class).orElseThrow();
        assertEquals("ReceiveLightMeasurement", measured.name());
        assertEquals("LightMeasured", measured.eventName());
        assertEquals("model-aapi-light-measured-payload", measured.inputModelId());
        assertEquals("smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured", measured.topicName());
        assertTrue(measured.idempotencyEnabled());
        assertEquals("library", measured.projectId());

        // payloads as models: a $ref names the model, an inline payload is named after its message
        var lightMeasured = store.findById("model-aapi-light-measured-payload", ModelEntity.class).orElseThrow();
        assertEquals("LightMeasuredPayload", lightMeasured.name());
        assertEquals(List.of("lumens", "sentAt"), lightMeasured.fields().stream().map(f -> f.name()).toList());
        assertEquals(FieldDataType.integer, lightMeasured.fields().get(0).type());
        assertEquals(FieldDataType.dateTime, lightMeasured.fields().get(1).type(), "a $ref to a scalar schema");
        var dim = store.findById("model-aapi-dim-light-payload", ModelEntity.class).orElseThrow();
        assertEquals("DimLightPayload", dim.name());
        assertEquals("model-aapi-dim-light-payload", store.findById("ev-dim-light", DomainEventEntity.class)
                .orElseThrow().modelId());
    }

    @Test
    void re_importing_updates_in_place_and_keeps_what_was_wired(@TempDir Path tmp) throws Exception {
        seedCatalog();
        var file = contract(tmp, STREETLIGHTS).toString();
        useCase.handle(new ImportAsyncApiCommand(null, file));

        var sub = store.findById("sub-receive-light-measurement", SubscriptionEntity.class).orElseThrow();
        var action = new SubscriptionActionEntity("act-1", "record", null, "uc-record", null, null, null);
        store.save(new SubscriptionEntity(sub.id(), sub.name(), sub.eventName(), null, sub.inputModelId(),
                sub.topicName(), "lighting", null, null, List.of(action), null, null, null, null, null, null,
                true, null, sub.projectId(), sub.description()));

        useCase.handle(new ImportAsyncApiCommand(null, file));

        assertEquals(2, store.findAllOfType(DomainEventEntity.class).size());
        assertEquals(1, store.findAllOfType(SubscriptionEntity.class).size());
        var bc = store.findById("bc-catalog", BoundedContextEntity.class).orElseThrow();
        assertEquals(List.of("ev-turn-on", "ev-dim-light"), bc.domainEventIds());
        assertEquals(List.of("sub-receive-light-measurement"), bc.subscriptionIds());
        var again = store.findById("sub-receive-light-measurement", SubscriptionEntity.class).orElseThrow();
        assertEquals("lighting", again.consumerGroup());
        assertEquals(List.of(action), again.actions());
    }

    @Test
    void an_earlier_import_under_a_random_id_is_updated_and_attached_not_duplicated(@TempDir Path tmp) throws Exception {
        seedCatalog();
        store.save(new SubscriptionEntity("8deeb857-uuid", "receiveLightMeasurement",
                "smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured", null, null,
                "smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured", null, null, null, null,
                null, null, null, null, null, null, true, null, null));

        useCase.handle(new ImportAsyncApiCommand(null, contract(tmp, STREETLIGHTS).toString()));

        assertEquals(1, store.findAllOfType(SubscriptionEntity.class).size());
        var bc = store.findById("bc-catalog", BoundedContextEntity.class).orElseThrow();
        assertEquals(List.of("8deeb857-uuid"), bc.subscriptionIds());
        assertEquals("ReceiveLightMeasurement",
                store.findById("8deeb857-uuid", SubscriptionEntity.class).orElseThrow().name());
    }

    @Test
    void several_bounded_contexts_need_one_named_and_nothing_is_written_otherwise(@TempDir Path tmp) throws Exception {
        seedCatalog();
        store.save(BoundedContextEntity.builder().id("bc-lending").name("Lending").build());
        var file = contract(tmp, STREETLIGHTS).toString();

        var e = assertThrows(IllegalArgumentException.class,
                () -> useCase.handle(new ImportAsyncApiCommand(null, file)));
        assertTrue(e.getMessage().contains("bc-catalog, bc-lending"), e.getMessage());
        assertTrue(e.getMessage().contains("-Dmodux.boundedContextId"), e.getMessage());
        assertTrue(store.findAllOfType(DomainEventEntity.class).isEmpty());
        assertTrue(store.findAllOfType(ModelEntity.class).isEmpty());

        var unknown = assertThrows(IllegalArgumentException.class,
                () -> useCase.handle(new ImportAsyncApiCommand("bc-nope", file)));
        assertTrue(unknown.getMessage().contains("bc-nope"), unknown.getMessage());

        useCase.handle(new ImportAsyncApiCommand("bc-lending", file));
        assertEquals(List.of("ev-turn-on", "ev-dim-light"),
                store.findById("bc-lending", BoundedContextEntity.class).orElseThrow().domainEventIds());
        assertEquals(null, store.findById("bc-catalog", BoundedContextEntity.class).orElseThrow().domainEventIds());
    }

    @Test
    void asyncapi_3_operations_map_by_action(@TempDir Path tmp) throws Exception {
        seedCatalog();
        useCase.handle(new ImportAsyncApiCommand(null, contract(tmp, """
                asyncapi: 3.0.0
                info: {title: Orders, version: 1.0.0}
                channels:
                  orderPlaced:
                    address: orders.placed
                    messages:
                      orderPlaced: {$ref: '#/components/messages/OrderPlaced'}
                  paymentReceived:
                    address: payments.received
                    messages:
                      paymentReceived:
                        name: PaymentReceived
                        payload: {type: object, properties: {amount: {type: number}}}
                operations:
                  publishOrderPlaced:
                    action: send
                    channel: {$ref: '#/channels/orderPlaced'}
                    messages: [{$ref: '#/channels/orderPlaced/messages/orderPlaced'}]
                  onPaymentReceived:
                    action: receive
                    channel: {$ref: '#/channels/paymentReceived'}
                components:
                  messages:
                    OrderPlaced:
                      payload:
                        type: object
                        properties:
                          orderId: {type: string}
                """).toString()));

        var event = store.findById("ev-publish-order-placed", DomainEventEntity.class).orElseThrow();
        assertEquals("orders.placed", event.topicName());
        assertEquals("model-aapi-order-placed-payload", event.modelId());
        var sub = store.findById("sub-on-payment-received", SubscriptionEntity.class).orElseThrow();
        assertEquals("payments.received", sub.topicName());
        assertEquals("PaymentReceived", sub.eventName());
        assertEquals("model-aapi-payment-received-payload", sub.inputModelId());
    }

    private static final class FakeStore implements ModelStore {
        private final Map<Class<?>, Map<String, Object>> data = new LinkedHashMap<>();

        @Override
        @SuppressWarnings("unchecked")
        public <T> Optional<T> findById(String id, Class<T> type) {
            return Optional.ofNullable((T) data.getOrDefault(type, Map.of()).get(id));
        }

        @Override
        public void save(Identifiable element) {
            data.computeIfAbsent(element.getClass(), k -> new LinkedHashMap<>()).put(element.id(), element);
        }

        @Override
        public void putTransient(Identifiable element) {
            save(element);
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> List<T> findAllOfType(Class<T> type) {
            return new ArrayList<>((Collection<T>) data.getOrDefault(type, Map.of()).values());
        }

        @Override
        public <T> void deleteAllById(List<String> ids, Class<T> type) {
            var byId = data.get(type);
            if (byId != null) ids.forEach(byId::remove);
        }

        @Override
        public Collection<Object> allElements() {
            throw new UnsupportedOperationException();
        }

        @Override
        public AllData snapshot() {
            throw new UnsupportedOperationException();
        }

        @Override
        public void replaceWith(AllData data) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Path storePath() {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean startedFromScratch() {
            throw new UnsupportedOperationException();
        }

        @Override
        public void reload() {
            throw new UnsupportedOperationException();
        }
    }
}
