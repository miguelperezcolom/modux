<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>
<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false>
<#list safeFields as field><#if field.type == "Wrapper"><#if field.primitiveType == "date"><#assign hasDate = true></#if><#if field.primitiveType == "time"><#assign hasTime = true></#if><#if field.primitiveType == "datetime"><#assign hasDateTime = true></#if><#if field.primitiveType == "decimal"><#assign hasBigDecimal = true></#if></#if></#list>
package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case};

<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>import io.mateu.workflow.ddd.AggregateRoot;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
<#list safeFields as field><#if field.type == "ValueObject">import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${field.name?cap_first};
</#if></#list>import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class ${aggregate.name} extends AggregateRoot {

${aggregate.name}Id id;

<#list safeFields as field>
    <#if field.type == "ValueObject">
        ${field.name?cap_first} ${field.name};
    <#elseif field.type == "Entity">
        String ${field.name}Id;
    <#else>
        <#if field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json">
            String ${field.name};
        <#elseif field.primitiveType == "integer">
            Integer ${field.name};
        <#elseif field.primitiveType == "decimal">
            BigDecimal ${field.name};
        <#elseif field.primitiveType == "bool">
            Boolean ${field.name};
        <#elseif field.primitiveType == "date">
            LocalDate ${field.name};
        <#elseif field.primitiveType == "time">
            LocalTime ${field.name};
        <#elseif field.primitiveType == "datetime">
            LocalDateTime ${field.name};
        <#else>
            String ${field.name};
        </#if>
    </#if>
</#list>

public static ${aggregate.name} of(
<#list safeFields as field>
    <#if field.type == "ValueObject">
        ${field.name?cap_first} ${field.name}<#sep>,</#sep>
    <#elseif field.type == "Entity">
        String ${field.name}Id<#sep>,</#sep>
    <#else>
        <#if field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json">
            String ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "integer">
            Integer ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "decimal">
            BigDecimal ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "bool">
            Boolean ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "date">
            LocalDate ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "time">
            LocalTime ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "datetime">
            LocalDateTime ${field.name}<#sep>,</#sep>
        <#else>
            String ${field.name}<#sep>,</#sep>
        </#if>
    </#if>
</#list>
) {
${aggregate.name} p = new ${aggregate.name}();
<#list safeFields as field>
    p.${field.name}<#if field.type == "Entity">Id</#if> = ${field.name}<#if field.type == "Entity">Id</#if>;
</#list>
p.checkInvariants();
return p;
}

<#if !(aggregate.behavioural!false)>
public void update(
<#list safeFields as field>
    <#if field.type == "ValueObject">
        ${field.name?cap_first} ${field.name}<#sep>,</#sep>
    <#elseif field.type == "Entity">
        String ${field.name}Id<#sep>,</#sep>
    <#else>
        <#if field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json">
            String ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "integer">
            Integer ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "decimal">
            BigDecimal ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "bool">
            Boolean ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "date">
            LocalDate ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "time">
            LocalTime ${field.name}<#sep>,</#sep>
        <#elseif field.primitiveType == "datetime">
            LocalDateTime ${field.name}<#sep>,</#sep>
        <#else>
            String ${field.name}<#sep>,</#sep>
        </#if>
    </#if>
</#list>
) {
<#list safeFields as field>
    this.${field.name}<#if field.type == "Entity">Id</#if> = ${field.name}<#if field.type == "Entity">Id</#if>;
</#list>
checkInvariants();
}
</#if>

<#list aggregate.operations as operation>
    <#assign operationName = operation.name?uncap_first>
    <#assign operationNameCap = operation.name?cap_first>

    <#if operation.type == "CUSTOM">
        <#assign withInput = (operation.hasInput!false)>
        public void ${operationName}(${operationNameCap}${aggregate.name}Operation operation<#if withInput>, ${operationNameCap}${aggregate.name}Operation.Input input</#if>) {
        check${operationNameCap}Preconditions();

        operation.execute(new Default${aggregate.name}OperationContext()<#if withInput>, input</#if>);

        checkInvariants();
        }

    <#else>
        public void ${operationName}() {
        check${operationNameCap}Preconditions();

        <#list operation.sets as setting>
            this.${setting.fieldName} = ${setting.value};
        </#list>

        checkInvariants();
        }

    </#if>
    private void check${operationNameCap}Preconditions() {
    <#list operation.preconditions as precondition>
        // TODO precondition: ${precondition}
    </#list>
    }

</#list>
private void checkInvariants() {
<#if aggregate.invariants?has_content>
    // Business invariants are enforced via the ${aggregate.name}Invariants hook (custom module).
</#if>
}

<#if aggregate.operations?has_content>
private class Default${aggregate.name}OperationContext implements ${aggregate.name}OperationContext {

@Override
public ${aggregate.name}Id id() {
return ${aggregate.name}.this.id;
}

@Override
public void id(${aggregate.name}Id id) {
${aggregate.name}.this.id = id;
}

<#list safeFields as field>
    <#if field.type == "ValueObject">
        @Override
        public ${field.name?cap_first} ${field.name}() {
        return ${aggregate.name}.this.${field.name};
        }

        @Override
        public void ${field.name}(${field.name?cap_first} ${field.name}) {
        ${aggregate.name}.this.${field.name} = ${field.name};
        }

    <#elseif field.type == "Entity">
        @Override
        public String ${field.name}Id() {
        return ${aggregate.name}.this.${field.name}Id;
        }

        @Override
        public void ${field.name}Id(String ${field.name}Id) {
        ${aggregate.name}.this.${field.name}Id = ${field.name}Id;
        }

    <#else>
        <#if field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json">
            @Override
            public String ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(String ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#elseif field.primitiveType == "integer">
            @Override
            public Integer ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(Integer ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#elseif field.primitiveType == "decimal">
            @Override
            public BigDecimal ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(BigDecimal ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#elseif field.primitiveType == "bool">
            @Override
            public Boolean ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(Boolean ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#elseif field.primitiveType == "date">
            @Override
            public LocalDate ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(LocalDate ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#elseif field.primitiveType == "time">
            @Override
            public LocalTime ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(LocalTime ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#elseif field.primitiveType == "datetime">
            @Override
            public LocalDateTime ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(LocalDateTime ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        <#else>
            @Override
            public String ${field.name}() {
            return ${aggregate.name}.this.${field.name};
            }

            @Override
            public void ${field.name}(String ${field.name}) {
            ${aggregate.name}.this.${field.name} = ${field.name};
            }

        </#if>
    </#if>
</#list>
}

</#if>
}
