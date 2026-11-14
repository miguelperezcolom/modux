package ${supplierPackage};

import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.Option;
import io.mateu.uidl.data.Page;
import io.mateu.uidl.data.Pageable;
import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.LookupOptionsSupplier;
import ${queryService};
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * The choices of a field that names a ${aggregateName} here (${fieldName}): the ${readModelName} this
 * context keeps of it, each shown by its ${labelAccessor}.
 */
@Service("${beanPrefix}IdOptionsSupplier")
@RequiredArgsConstructor
public class ${className}IdOptionsSupplier implements LookupOptionsSupplier {

    final ${queryServiceSimple} queryService;

    @Override
    public ListingData<Option> search(String fieldName, String searchText, Pageable pageable, HttpRequest httpRequest) {
        var text = searchText == null ? "" : searchText.trim().toLowerCase();
        var matching = queryService.findAll().stream()
                .map(row -> new Option(row.id(), ${className}IdLabelSupplier.labelOf(row.id(), row.${labelAccessor}())))
                .filter(option -> text.isEmpty() || String.valueOf(option.label()).toLowerCase().contains(text))
                .toList();
        var size = pageable != null && pageable.size() > 0 ? pageable.size() : matching.size();
        var from = Math.min(matching.size(), (pageable != null ? pageable.page() : 0) * size);
        var to = Math.min(matching.size(), from + size);
        return new ListingData<>(new Page<>(searchText, size, pageable != null ? pageable.page() : 0,
                matching.size(), matching.subList(from, to)));
    }
}
