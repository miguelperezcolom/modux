package io.mateu.modux.modeldrivengenerator.application.usecases.project.importwsdl;

import lombok.SneakyThrows;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilderFactory;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Minimal, namespace-agnostic WSDL reader: the portTypes and their operations (with the
 * optional documentation) — which is all the meta-model needs to declare a SOAP surface.
 * Bindings, encodings and types stay in the contract file; pure function, DOM only.
 */
public final class WsdlParser {

    public record WsdlOperation(String portType, String name, String documentation) {}

    private WsdlParser() {}

    @SneakyThrows
    public static List<WsdlOperation> parse(Path wsdl) {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        var document = factory.newDocumentBuilder().parse(wsdl.toFile());

        var operations = new ArrayList<WsdlOperation>();
        var portTypes = document.getElementsByTagNameNS("*", "portType");
        for (var i = 0; i < portTypes.getLength(); i++) {
            var portType = (Element) portTypes.item(i);
            var portTypeName = portType.getAttribute("name");
            var children = portType.getElementsByTagNameNS("*", "operation");
            for (var j = 0; j < children.getLength(); j++) {
                var operation = (Element) children.item(j);
                operations.add(new WsdlOperation(portTypeName, operation.getAttribute("name"),
                        documentationOf(operation)));
            }
        }
        if (operations.isEmpty()) {
            throw new IllegalArgumentException(
                    "The WSDL declares no operations (is it a WSDL 1.1 with a portType?): " + wsdl);
        }
        return List.copyOf(operations);
    }

    private static String documentationOf(Element operation) {
        var docs = operation.getElementsByTagNameNS("*", "documentation");
        return docs.getLength() > 0 ? docs.item(0).getTextContent().trim() : null;
    }
}
