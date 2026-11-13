-- One database per service. Mounted at /docker-entrypoint-initdb.d: the postgres image
-- runs it on FIRST boot only (an existing data volume is never re-initialized).
<#list project.services as s>
CREATE DATABASE ${s.name?lower_case?replace("[^a-z0-9]","_",'r')};
</#list>
<#if procesos??>
CREATE DATABASE procesos;
</#if>
