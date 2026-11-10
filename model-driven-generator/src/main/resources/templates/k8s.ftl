<#assign slug = service.name?lower_case?replace("[^a-z0-9]","-",'r')>
<#assign port = (service.port!8080)?c>
<#if service.dockerImageRegistry?? && service.dockerImageRegistry?has_content>
<#assign image = service.dockerImageRegistry + "/" + (service.dockerImageName!slug)>
<#else>
<#assign image = (service.dockerImageName!slug)>
</#if>
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${slug}
  labels:
    app: ${slug}
spec:
  replicas: ${(service.kubernetesReplicas!1)?c}
  selector:
    matchLabels:
      app: ${slug}
  template:
    metadata:
      labels:
        app: ${slug}
    spec:
      # Created by the modux deploy pipeline from the local docker login when the
      # registry is private; a missing secret is harmless for public images.
      imagePullSecrets:
        - name: modux-regcred
      containers:
        - name: ${slug}
          image: ${image}:latest
          # a locally loaded image (kind load) is used as is; a registry one is pulled when missing
          imagePullPolicy: IfNotPresent
<#assign profiles = []>
<#if !(service.database?? && service.database?has_content)><#assign profiles = profiles + ["local"]></#if>
<#if (profiles?size > 0)>
          # local: no database declared, the app runs self-contained (in-memory H2).
          # With an IdP the pods validate its JWTs (public JWKs) — no client
          # credentials needed in the deployment.
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: ${profiles?join(",")}
</#if>
          ports:
            - containerPort: ${port}
          resources:
            requests:
              cpu: "${service.kubernetesCpuRequest!'250m'}"
              memory: "${service.kubernetesMemoryRequest!'512Mi'}"
            limits:
              cpu: "${service.kubernetesCpuLimit!'1'}"
              memory: "${service.kubernetesMemoryLimit!'1Gi'}"
<#if service.readinessProbe?? && service.readinessProbe?has_content>
          readinessProbe:
            httpGet:
              path: ${service.readinessProbe}
              port: ${port}
</#if>
<#if service.livenessProbe?? && service.livenessProbe?has_content>
          livenessProbe:
            httpGet:
              path: ${service.livenessProbe}
              port: ${port}
</#if>
---
apiVersion: v1
kind: Service
metadata:
  name: ${slug}
spec:
  selector:
    app: ${slug}
  ports:
    - port: ${port}
      targetPort: ${port}
<#if (service.kubernetesHpaEnabled)!false>
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${slug}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${slug}
  minReplicas: ${(service.kubernetesHpaMinReplicas!1)?c}
  maxReplicas: ${(service.kubernetesHpaMaxReplicas!5)?c}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${(service.kubernetesHpaCpuThreshold!70)?c}
</#if>
<#if ingressUrls?? && ingressUrls?has_content>
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${slug}
spec:
  rules:
<#list ingressUrls as u>
    - host: ${u.host}
      http:
        paths:
          - path: ${u.path}
            pathType: Prefix
            backend:
              service:
                name: ${slug}
                port:
                  number: ${port}
</#list>
</#if>
