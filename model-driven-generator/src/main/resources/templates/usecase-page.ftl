<#macro lookup field><#if lookups?? && lookups[field.name]??><#assign sup = lookups[field.name].suppliers>@io.mateu.uidl.annotations.Lookup(search = ${sup}IdOptionsSupplier.class, label = ${sup}IdLabelSupplier.class)</#if></#macro>
<#assign ucSlug = usecase.name?lower_case?replace("[^a-z0-9]","",'r')>
<#assign ucClass = usecase.className>
<#function isGrid field><#return !(field.basicType?? && field.basicType) && (field.type!"") == "array" && field.modelId?? && gridClasses?? && gridClasses[field.modelId]??></#function>
<#assign hasGrids = false>
<#if inputModel?? && inputModel.fields?has_content>
<#list inputModel.fields as field><#if isGrid(field)><#assign hasGrids = true></#if></#list>
</#if>
<#assign outputGrids = []>
<#assign outputRendered = []>
<#if outputModel?? && outputModel.fields?has_content>
<#list outputModel.fields as field><#if (field.stereotype!"") == "html" || (field.stereotype!"") == "richText" || (field.stereotype!"") == "markdown"><#assign outputRendered = outputRendered + [field]></#if></#list>
</#if>
<#if outputModel?? && outputModel.fields?has_content>
<#list outputModel.fields as field><#if isGrid(field)><#assign hasGrids = true><#assign outputGrids = outputGrids + [field]></#if></#list>
</#if>
package ${project.packageName}.${module.slug}.infra.in.ui.pages.${ucSlug};

<#if hasGrids>
import com.fasterxml.jackson.databind.ObjectMapper;
</#if>
import ${project.packageName}.${module.slug}.application.usecases.${ucSlug}.${ucClass}Command;
<#if outputModel??>
import ${project.packageName}.${module.slug}.application.usecases.${ucSlug}.${ucClass}Result;
</#if>
import ${project.packageName}.${module.slug}.application.usecases.${ucSlug}.${ucClass}UseCase;
import io.mateu.uidl.StyleConstants;
import io.mateu.uidl.annotations.Button;
<#if hasGrids>
import io.mateu.uidl.annotations.InlineEditing;
</#if>
import io.mateu.uidl.annotations.Label;
import io.mateu.uidl.annotations.Notice;
<#assign hayReq = false>
<#if inputModel?? && inputModel.fields?has_content>
<#list inputModel.fields as field>
<#if field.validations?? && field.validations?has_content><#assign hayReq = true></#if>
</#list>
</#if>
<#if hayReq>
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
</#if>
import io.mateu.uidl.annotations.Stereotype;
import io.mateu.uidl.annotations.Style;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.data.ButtonStyle;
import io.mateu.uidl.data.FieldStereotype;
import io.mateu.uidl.data.Message;
import io.mateu.uidl.data.State;
<#if hasGrids>
import lombok.SneakyThrows;
</#if>
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;
<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false>
<#if inputModel?? && inputModel.fields?has_content>
<#list inputModel.fields as field>
<#if field.basicType?? && field.basicType>
<#if field.type == "date"><#assign hasDate = true></#if>
<#if field.type == "time"><#assign hasTime = true></#if>
<#if field.type == "dateTime"><#assign hasDateTime = true></#if>
<#if field.type == "number" || field.type == "money"><#assign hasBigDecimal = true></#if>
</#if>
</#list>
</#if>
<#if hasDate>
import java.time.LocalDate;
</#if>
<#if hasTime>
import java.time.LocalTime;
</#if>
<#if hasDateTime>
import java.time.LocalDateTime;
</#if>
<#if hasBigDecimal>
import java.math.BigDecimal;
</#if>
<#if hasGrids>
import java.util.ArrayList;
</#if>
import java.util.List;

/**
 * UI page of the ${usecase.name} use case (exposedAsUi): the fields are its command, the
 * primary action executes it. View model only — the behaviour lives in the use case.
 */
@Service
@Scope("prototype")
@RequiredArgsConstructor
@Title("${usecase.title!usecase.className}")
@Style(StyleConstants.CONTAINER)
public class ${ucClass}Page {

<#if inputModel?? && inputModel.fields?has_content>
<#list inputModel.fields as field>
<#assign lbl = (field.label?? && field.label?has_content)?then('@Label("' + field.label + '")\n    ', '')>
<#-- required indicator: the model's validations become jakarta annotations Mateu reads
     (NotNull/NotEmpty → FormFieldDto.required → the vaadin required marker) -->
<#assign req = ''>
<#if field.validations?? && field.validations?has_content>
<#list field.validations as v>
<#if v.type == "NotNull"><#assign req = req + '    @NotNull\n'></#if>
<#if v.type == "NotEmpty" || v.type == "NotBlank"><#assign req = req + '    @NotEmpty\n'></#if>
</#list>
</#if>
<#if field.basicType?? && field.basicType>
    <#if field.type == "integer">
${req}    ${lbl}Integer ${field.name};
    <#elseif field.type == "number" || field.type == "money">
${req}    ${lbl}BigDecimal ${field.name};
    <#elseif field.type == "bool">
${req}    ${lbl}Boolean ${field.name};
    <#elseif field.type == "date">
${req}    ${lbl}LocalDate ${field.name};
    <#elseif field.type == "time">
${req}    ${lbl}LocalTime ${field.name};
    <#elseif field.type == "dateTime">
${req}    ${lbl}LocalDateTime ${field.name};
    <#elseif field.type == "array" || field.type == "json">
${req}    ${lbl}@Stereotype(FieldStereotype.textarea)
    String ${field.name};
    <#elseif field.stereotype?? && field.stereotype?has_content>
${req}    ${lbl}@Stereotype(FieldStereotype.${field.stereotype})
    String ${field.name};
    <#else>
${req}    ${lbl}<@lookup field/><#if lookups?? && lookups[field.name]??>

    </#if>String ${field.name};
    </#if>
<#elseif enumOptions?? && enumOptions[field.name]??>
${req}    ${lbl}${field.name?cap_first}Option ${field.name};
<#elseif isGrid(field)>
${req}    ${lbl}@InlineEditing
    @Stereotype(FieldStereotype.grid)
    List<${gridClasses[field.modelId]}> ${field.name} = new ArrayList<>();
<#else>
${req}    ${lbl}String ${field.name}Id;
</#if>
</#list>
<#else>
    Long id;
</#if>

<#if inputModel?? && inputModel.fields?has_content>
<#list inputModel.fields as field>
<#if enumOptions?? && enumOptions[field.name]??>
    public enum ${field.name?cap_first}Option { <#list enumOptions[field.name] as constant>${constant}<#sep>, </#sep></#list> }

</#if>
</#list>
</#if>
    @Notice(theme = "success", fullWidth = true)
    String resultado = "";
<#list outputRendered as field>

    /** ${field.name}: shown rendered (${field.stereotype}), not as text in the notice. */
    @io.mateu.uidl.annotations.ReadOnly
    @Label("${((field.label?? && field.label?has_content)?then(field.label, field.name?cap_first))?j_string}")
    @Stereotype(FieldStereotype.${(field.stereotype == "richText")?then("html", field.stereotype)})
    String ${field.name}Resultado = "";
</#list>
<#list outputGrids as field>

    @io.mateu.uidl.annotations.ReadOnly
    @Label("${((field.label?? && field.label?has_content)?then(field.label, field.name?cap_first))?j_string}")
    @Stereotype(FieldStereotype.grid)
    List<${gridClasses[field.modelId]}> ${field.name}Resultado = new ArrayList<>();
</#list>

    private final ${ucClass}UseCase useCase;
<#if hasGrids>
    private final ObjectMapper objectMapper;
</#if>

    @Button(buttonStyle = ButtonStyle.primary)
<#if hasGrids>
    @SneakyThrows
</#if>
    public Object ${usecase.className?uncap_first}() {
<#if inputModel?? && inputModel.fields?has_content>
<#assign hayValidaciones = false>
<#list inputModel.fields as field>
<#if field.basicType?? && field.basicType && field.validations?? && field.validations?has_content>
<#assign hayValidaciones = true>
</#if>
</#list>
<#if hayValidaciones>
        // Model-declared validations (NotNull / NotBlank / NotEmpty) — fail legibly before
        // touching the use case.
        var faltan = new java.util.ArrayList<String>();
<#list inputModel.fields as field>
<#if field.basicType?? && field.basicType && field.validations?? && field.validations?has_content>
<#list field.validations as v>
<#assign lbl = ((field.label?? && field.label?has_content)?then(field.label, field.name))?j_string>
<#if v.type == "NotNull">
        if (${field.name} == null) faltan.add("${lbl}");
<#elseif v.type == "NotBlank" || v.type == "NotEmpty">
<#if !(field.type?? && (field.type == "integer" || field.type == "number" || field.type == "money" || field.type == "bool" || field.type == "date" || field.type == "time" || field.type == "dateTime"))>
        if (${field.name} == null || ${field.name}.isBlank()) faltan.add("${lbl}");
</#if>
</#if>
</#list>
</#if>
</#list>
        if (!faltan.isEmpty()) {
            throw new IllegalArgumentException("Faltan datos obligatorios: " + String.join(", ", faltan));
        }
</#if>
</#if>
<#assign args><#if inputModel?? && inputModel.fields?has_content><#list inputModel.fields as field><#if field.basicType?? && field.basicType>${field.name}<#elseif enumOptions?? && enumOptions[field.name]??>${field.name} != null ? ${field.name}.name() : null<#elseif isGrid(field)>objectMapper.writeValueAsString(${field.name})<#else>${field.name}Id</#if><#sep>, </#sep></#list><#else>id</#if></#assign>
<#if outputModel??>
        ${ucClass}Result result = useCase.handle(new ${ucClass}Command(${args}));
<#list outputGrids as f>
        ${f.name}Resultado = result.${f.name}() == null || result.${f.name}().isBlank() ? new ArrayList<>()
                : objectMapper.readValue(result.${f.name}(), objectMapper.getTypeFactory().constructCollectionType(List.class, ${gridClasses[f.modelId]}.class));
</#list>
<#list outputRendered as f>
        ${f.name}Resultado = result.${f.name}() != null ? result.${f.name}() : "";
</#list>
<#assign renderedNames = outputRendered?map(f -> f.name)>
<#assign scalarOut = (outputModel.fields![])?filter(f -> !isGrid(f) && !renderedNames?seq_contains(f.name))>
        resultado = <#if (outputGrids?has_content || outputRendered?has_content) && !scalarOut?has_content && !outputGrids?has_content>"${usecase.title!usecase.className}"<#elseif outputGrids?has_content && !scalarOut?has_content><#list outputGrids as f>"${((f.label?? && f.label?has_content)?then(f.label, f.name?cap_first))?j_string}: " + ${f.name}Resultado.size()<#sep> + " · " + </#sep></#list><#else><#list scalarOut as f>"${(f.label?? && f.label?has_content)?then(f.label, f.name?cap_first)}: " + result.${f.name}<#if !(f.basicType?? && f.basicType) && (f.type!"") != "array" && !(f.enumId?has_content)>Id</#if>()<#sep> + " · " + </#sep></#list><#if !(outputModel.fields?? && outputModel.fields?has_content)>String.valueOf(result)</#if></#if>;
<#else>
        useCase.handle(new ${ucClass}Command(${args}));
        resultado = "${usecase.name} ejecutado";
</#if>
        return List.of(new Message("${usecase.title!usecase.className}: hecho"), new State(this));
    }

}
