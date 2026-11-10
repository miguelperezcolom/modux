Feature: ${aggregate.name} management

  Scenario: Create a new ${aggregate.name}
    Given no ${aggregate.name} exists
    When I create a new ${aggregate.name}
    Then a ${aggregate.name} should be saved successfully

<#if !(aggregate.behavioural!false)>
  Scenario: Update an existing ${aggregate.name}
    Given a ${aggregate.name} exists with id "test-id"
    When I update the ${aggregate.name} with id "test-id"
    Then the ${aggregate.name} with id "test-id" should be updated
</#if>

  Scenario: Delete an existing ${aggregate.name}
    Given a ${aggregate.name} exists with id "test-id"
    When I delete the ${aggregate.name} with id "test-id"
    Then the ${aggregate.name} with id "test-id" should no longer exist

<#list aggregate.operations as operation>
  Scenario: Execute ${operation.name} on ${aggregate.name}
    Given a ${aggregate.name} exists with id "test-id"
    When I execute ${operation.name} on the ${aggregate.name} with id "test-id"
    Then the ${aggregate.name} with id "test-id" should reflect the ${operation.name} operation

</#list>
