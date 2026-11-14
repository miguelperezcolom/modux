package ${supplierPackage};

import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.LookupLabelSupplier;
import ${queryService};
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** How a ${aggregateName} named by ${fieldName} reads: its ${labelAccessor}, from the ${readModelName} this context keeps. */
@Service("${beanPrefix}IdLabelSupplier")
@RequiredArgsConstructor
public class ${className}IdLabelSupplier implements LookupLabelSupplier {

    final ${queryServiceSimple} queryService;

    @Override
    public String label(String fieldName, Object id, HttpRequest httpRequest) {
        if (id == null) return null;
        return queryService.getById(String.valueOf(id))
                .map(row -> labelOf(row.id(), row.${labelAccessor}()))
                // not projected here (yet): the id is all there is to show
                .orElse(String.valueOf(id));
    }

    static String labelOf(String id, Object label) {
        return label == null || String.valueOf(label).isBlank() ? id : String.valueOf(label);
    }
}
