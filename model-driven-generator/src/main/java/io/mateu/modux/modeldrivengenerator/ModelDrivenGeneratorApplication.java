package io.mateu.modux.modeldrivengenerator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ModelDrivenGeneratorApplication {

    public static void main(String[] args) {
        // convenience: accept the store path as a CLI arg too (it is read as a system property)
        for (var arg : args) {
            if (arg.startsWith("--modux.model-file=")) {
                System.setProperty("modux.model-file", arg.substring("--modux.model-file=".length()));
            }
        }
        SpringApplication.run(ModelDrivenGeneratorApplication.class, args);
    }

}
