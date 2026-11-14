package io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.gateway.vo.GatewayAuthType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayOperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.swagger.parser.OpenAPIParser;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenApiGatewayMapperTest {

    private static final String SPEC = """
            openapi: 3.0.0
            info:
              title: Pet Store
              version: 1.0.0
            servers:
              - url: https://api.petstore.example/v1
            paths:
              /pets:
                get:
                  operationId: listPets
                  responses:
                    '200':
                      content:
                        application/json:
                          schema:
                            type: array
                            items:
                              $ref: '#/components/schemas/Pet'
                post:
                  operationId: createPet
                  requestBody:
                    content:
                      application/json:
                        schema:
                          $ref: '#/components/schemas/Pet'
                  responses:
                    '201':
                      content:
                        application/json:
                          schema:
                            $ref: '#/components/schemas/Pet'
              /pets/{petId}:
                get:
                  operationId: getPet
                  parameters:
                    - name: petId
                      in: path
                      required: true
                      schema:
                        type: integer
                    - name: expand
                      in: query
                      required: false
                      schema:
                        type: string
                    - name: X-Trace-Id
                      in: header
                      required: false
                      schema:
                        type: string
                    - name: session
                      in: cookie
                      required: false
                      schema:
                        type: string
                  responses:
                    '200':
                      content:
                        application/json:
                          schema:
                            $ref: '#/components/schemas/Pet'
            components:
              securitySchemes:
                apiKey:
                  type: apiKey
                  in: header
                  name: X-API-Key
              schemas:
                Pet:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
                    birthDate:
                      type: string
                      format: date
                    owner:
                      $ref: '#/components/schemas/Owner'
                Owner:
                  type: object
                  properties:
                    email:
                      type: string
            """;

    private OpenApiGatewayMapper.Result map() {
        var openApi = new OpenAPIParser().readContents(SPEC, null, null).getOpenAPI();
        return OpenApiGatewayMapper.map(openApi);
    }

    @Test
    void builds_typed_models_from_schemas() {
        var result = map();

        assertEquals(2, result.models().size(), "expected a model per schema");
        var pet = model(result.models(), "Pet");
        var owner = model(result.models(), "Owner");

        assertEquals(FieldDataType.integer, field(pet, "id").type());
        assertEquals(FieldDataType.string, field(pet, "name").type());
        assertEquals(FieldDataType.date, field(pet, "birthDate").type());

        // a $ref property becomes a non-basic field pointing at the referenced model
        var ownerField = field(pet, "owner");
        assertFalse(ownerField.basicType());
        assertEquals(owner.id(), ownerField.modelId());
    }

    @Test
    void wires_operations_to_request_and_response_models() {
        var result = map();
        var pet = model(result.models(), "Pet");

        var createPet = op(result.operations(), "createPet");
        assertEquals("POST", createPet.httpMethod());
        assertEquals(pet.id(), createPet.inputModelId());
        assertEquals(pet.id(), createPet.outputModelId());

        // array-of-$ref response resolves to the element model
        var listPets = op(result.operations(), "listPets");
        assertEquals(pet.id(), listPets.outputModelId());
    }

    @Test
    void the_default_error_response_is_not_the_output_of_an_operation_that_declares_success() {
        var spec = """
                openapi: 3.0.0
                info: { title: Pets, version: 1.0.0 }
                paths:
                  /pets:
                    post:
                      operationId: createPets
                      responses:
                        '201':
                          description: Null response
                        default:
                          description: unexpected error
                          content:
                            application/json:
                              schema:
                                $ref: '#/components/schemas/Error'
                  /pets/{id}:
                    get:
                      operationId: anything
                      responses:
                        default:
                          description: whatever it answers
                          content:
                            application/json:
                              schema:
                                $ref: '#/components/schemas/Error'
                components:
                  schemas:
                    Error:
                      type: object
                      properties:
                        message: { type: string }
                """;
        var result = OpenApiGatewayMapper.map(new OpenAPIParser().readContents(spec, null, null).getOpenAPI());
        assertEquals(null, op(result.operations(), "createPets").outputModelId());
        // with no success code declared, `default` is all the contract says about the answer
        assertEquals(model(result.models(), "Error").id(), op(result.operations(), "anything").outputModelId());
    }

    @Test
    void captures_path_query_header_and_cookie_parameters() {
        var getPet = op(map().operations(), "getPet");
        assertEquals(4, getPet.parameters().size());
        var petId = getPet.parameters().stream().filter(p -> p.name().equals("petId")).findFirst().orElseThrow();
        assertEquals("path", petId.location());
        assertEquals("integer", petId.type());
        assertTrue(petId.required());
        var expand = getPet.parameters().stream().filter(p -> p.name().equals("expand")).findFirst().orElseThrow();
        assertEquals("query", expand.location());
        var trace = getPet.parameters().stream().filter(p -> p.name().equals("X-Trace-Id")).findFirst().orElseThrow();
        assertEquals("header", trace.location());
        var session = getPet.parameters().stream().filter(p -> p.name().equals("session")).findFirst().orElseThrow();
        assertEquals("cookie", session.location());
    }

    @Test
    void infers_auth_from_security_scheme() {
        var auth = map().auth();
        assertEquals(GatewayAuthType.ApiKey, auth.type());
        assertEquals("X-API-Key", auth.apiKeyHeaderName());
    }

    private static ModelEntity model(List<ModelEntity> models, String name) {
        return models.stream().filter(m -> m.name().equals(name)).findFirst().orElseThrow();
    }

    private static ModelFieldEntity field(ModelEntity model, String name) {
        var f = model.fields().stream().filter(x -> x.name().equals(name)).findFirst().orElse(null);
        assertNotNull(f, "field " + name + " missing in model " + model.name());
        return f;
    }

    private static GatewayOperationEntity op(List<GatewayOperationEntity> ops, String name) {
        var o = ops.stream().filter(x -> x.name().equals(name)).findFirst().orElse(null);
        assertTrue(o != null, "operation " + name + " missing");
        return o;
    }
}
