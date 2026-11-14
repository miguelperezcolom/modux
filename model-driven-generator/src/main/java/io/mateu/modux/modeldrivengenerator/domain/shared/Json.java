package io.mateu.modux.modeldrivengenerator.domain.shared;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.introspect.AnnotatedField;
import com.fasterxml.jackson.databind.introspect.VisibilityChecker;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;
import java.util.Map;

/**
 * The JSON shape modux persists nested structures in.
 *
 * <p>A handful of aggregates keep their nested collections as a JSON string in one column
 * ({@code fieldsJson}, {@code valuesJson}, …) rather than as separate files. This is what reads and
 * writes those strings.
 *
 * <p>The mapper's configuration is NOT incidental — it decides the bytes on disk, so every setting
 * here is part of the storage format and changing one rewrites files. It is carried over verbatim
 * from {@code io.mateu.core.infra.JsonSerializer}, which is where these strings were written with
 * until modux stopped depending on mateu.
 */
public final class Json {

    private static final ObjectMapper mapper = new ObjectMapper();

    static {
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
        mapper.setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.NON_PRIVATE);
        // final and transient fields stay out: the first are derived, the second deliberately
        // not persisted, and either one on disk would be a lie the next read would believe
        mapper.setVisibility(
                new VisibilityChecker.Std(JsonAutoDetect.Visibility.NON_PRIVATE) {
                    @Override
                    public boolean isFieldVisible(Field f) {
                        if (Modifier.isFinal(f.getModifiers()) || Modifier.isTransient(f.getModifiers())) {
                            return false;
                        }
                        return super.isFieldVisible(f);
                    }

                    @Override
                    public boolean isFieldVisible(AnnotatedField f) {
                        if (Modifier.isFinal(f.getModifiers()) || Modifier.isTransient(f.getModifiers())) {
                            return false;
                        }
                        return super.isFieldVisible(f);
                    }
                });
    }

    private Json() {}

    public static String toJson(Object object) {
        try {
            return mapper.writeValueAsString(object);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize " + object, e);
        }
    }

    /**
     * As a plain map, which is how generation hands an element to a Freemarker template: the
     * template walks names, not types, so {@code fromJson(toJson(x))} is the round trip that turns
     * a record into something a template can read.
     */
    public static Map<String, Object> fromJson(String json) {
        try {
            return mapper.readValue(json == null || json.isEmpty() ? "{}" : json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Could not read the JSON as a map", e);
        }
    }

    /** An absent or empty string reads as an empty list, which is what a missing collection means. */
    public static <T> List<T> listFromJson(String json, Class<T> type) {
        try {
            return mapper.readerForListOf(type).readValue(json == null || json.isEmpty() ? "[]" : json);
        } catch (Exception e) {
            throw new IllegalStateException("Could not read a list of " + type.getSimpleName(), e);
        }
    }
}
